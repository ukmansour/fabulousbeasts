/**
 * Cloudflare Pages Function: Wiki Backend (D1 + R2)
 * Handles all requests under /api/*
 * (Triggering fresh deploy to apply DB bindings)
 */

export async function onRequest(context) {
    const { request, env, params } = context;
    const url = new URL(request.url);
    const path = url.pathname;
    
    // API 경로 보정: /api/wiki -> /wiki (기존 worker.js 로직 재사용을 위해)
    const apiPath = path.replace(/^\/api/, '');

    console.log(`[Pages Function] Request: ${request.method} ${path} (apiPath: ${apiPath})`);

    // CORS Headers
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json"
    };

    // OPTIONS: CORS Preflight
    if (request.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    // === R2 이미지 업로드 ===
    if (request.method === "POST" && apiPath === "/upload") {
        try {
            if (!env.BUCKET) return new Response(JSON.stringify({ error: "R2 BUCKET not bound" }), { status: 500, headers: corsHeaders });

            const formData = await request.formData();
            const file = formData.get("file");
            const folder = formData.get("folder") || "characters";

            if (!file) return new Response(JSON.stringify({ error: "No file" }), { status: 400, headers: corsHeaders });

            const ext = file.name.split(".").pop().toLowerCase() || "jpg";
            const safeName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

            await env.BUCKET.put(safeName, file.stream(), {
                httpMetadata: { contentType: file.type || "image/jpeg" }
            });

            // Worker를 통해 이미지 서빙 (Custom Domain 대신)
            const publicUrl = `https://wiki.fabulousbeasts.kr/api/r2/${encodeURIComponent(safeName)}`;
            
            console.log('R2 Upload successful:', safeName);
            
            return new Response(JSON.stringify({ success: true, url: publicUrl }), { headers: corsHeaders });
        } catch (err) {
            console.error('R2 Upload error:', err);
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
        }
    }

    // === R2 이미지 조회 (신규 형식: /api/r2/...) ===
    if (request.method === "GET" && apiPath.startsWith("/r2/")) {
        try {
            if (!env.BUCKET) return new Response("R2 BUCKET not bound", { status: 500 });

            const filename = decodeURIComponent(apiPath.replace("/r2/", ""));
            console.log('R2 GET request:', filename);
            const object = await env.BUCKET.get(filename);

            if (!object) {
                console.error('R2 object not found:', filename);
                return new Response("Image not found", { status: 404 });
            }

            const headers = new Headers();
            object.writeHttpMetadata(headers);
            headers.set("Cache-Control", "public, max-age=31536000"); // 1년 캐시
            headers.set("Access-Control-Allow-Origin", "*");

            return new Response(object.body, { headers });
        } catch (err) {
            console.error('R2 Get error:', err);
            return new Response("Error loading image: " + err.message, { status: 500 });
        }
    }

    // === 레거시 이미지 URL 리다이렉트 (media.fabulousbeasts.kr 대체) ===
    // 기존에 media.fabulousbeasts.kr로 저장된 이미지 URL을 처리
    if (request.method === "GET" && url.hostname === "media.fabulousbeasts.kr") {
        try {
            if (!env.BUCKET) return new Response("R2 BUCKET not bound", { status: 500 });

            const filename = url.pathname.substring(1); // Remove leading /
            console.log('Legacy media URL redirect:', filename);
            const object = await env.BUCKET.get(filename);

            if (!object) {
                console.error('Legacy R2 object not found:', filename);
                return new Response("Image not found", { status: 404 });
            }

            const headers = new Headers();
            object.writeHttpMetadata(headers);
            headers.set("Cache-Control", "public, max-age=31536000");
            headers.set("Access-Control-Allow-Origin", "*");

            return new Response(object.body, { headers });
        } catch (err) {
            console.error('Legacy R2 Get error:', err);
            return new Response("Error loading image: " + err.message, { status: 500 });
        }
    }

    // 1-1. GET: 특정 문서의 리비전 목록
    if (request.method === "GET" && apiPath.startsWith("/wiki/") && apiPath.endsWith("/revisions")) {
        const title = decodeURIComponent(apiPath.replace("/wiki/", "").replace("/revisions", ""));
        try {
            // [수정] 최대 4개까지만 조회하도록 LIMIT 추가
            const { results } = await env.DB.prepare("SELECT id, author, strftime('%Y-%m-%dT%H:%M:%SZ', edited_at) as edited_at FROM wiki_revisions WHERE title = ? ORDER BY edited_at DESC LIMIT 4").bind(title).all();
            return new Response(JSON.stringify(results), { headers: corsHeaders });
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
        }
    }

    // 1-2. GET: 특정 리비전 내용 조회
    if (request.method === "GET" && apiPath.startsWith("/revision/")) {
        const id = apiPath.split("/").pop();
        try {
            const result = await env.DB.prepare("SELECT * FROM wiki_revisions WHERE id = ?").bind(id).first();
            if (!result) return new Response(JSON.stringify({ error: "Not Found" }), { status: 404, headers: corsHeaders });
            return new Response(JSON.stringify(result), { headers: corsHeaders });
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
        }
    }

    // 1. GET: 특정 문서 조회
    if (request.method === "GET" && apiPath.startsWith("/wiki/")) {
        const title = decodeURIComponent(apiPath.split("/").pop());
        try {
            const result = await env.DB.prepare("SELECT * FROM wiki_pages WHERE title = ?").bind(title).first();
            if (!result) return new Response(JSON.stringify({ error: "Not Found" }), { status: 404, headers: corsHeaders });
            
            // [수정] 레거시 media URL 변환
            if (result.image && result.image.includes('media.fabulousbeasts.kr')) {
                const filename = result.image.replace(/https?:\/\/media\.fabulousbeasts\.kr\//, '');
                result.image = `https://wiki.fabulousbeasts.kr/api/r2/${encodeURIComponent(filename)}`;
            }
            
            // [수정] 갤러리 이미지들도 변환
            if (result.gallery) {
                try {
                    const gallery = typeof result.gallery === 'string' ? JSON.parse(result.gallery) : result.gallery;
                    if (Array.isArray(gallery)) {
                        result.gallery = JSON.stringify(gallery.map(url => {
                            if (url && url.includes('media.fabulousbeasts.kr')) {
                                const filename = url.replace(/https?:\/\/media\.fabulousbeasts\.kr\//, '');
                                return `https://wiki.fabulousbeasts.kr/api/r2/${encodeURIComponent(filename)}`;
                            }
                            return url;
                        }));
                    }
                } catch (e) {
                    console.error('Gallery parsing error:', e);
                }
            }
            
            return new Response(JSON.stringify(result), { headers: corsHeaders });
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
        }
    }

    // 2. GET: 최근 변경 목록
    if (request.method === "GET" && apiPath === "/recent") {
        try {
            // [수정] 날짜 형식을 ISO와 유사하게 변환하여 브라우저 호환성 확보
            const { results } = await env.DB.prepare("SELECT title, author, category, strftime('%Y-%m-%dT%H:%M:%SZ', updated_at) as updated_at FROM wiki_pages ORDER BY updated_at DESC LIMIT 8").all();
            return new Response(JSON.stringify(results), { headers: corsHeaders });
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
        }
    }

    // 2-2. GET: 사이트 설정 (공지/소식)
    if (request.method === "GET" && apiPath === "/settings") {
        try {
            // [추가] 테이블이 없을 경우를 대비해 생성 시도
            await env.DB.prepare("CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY, value TEXT)").run();
            
            const { results } = await env.DB.prepare("SELECT * FROM site_settings").all();
            const settings = {};
            results.forEach(r => settings[r.key] = r.value);
            return new Response(JSON.stringify(settings), { headers: corsHeaders });
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
        }
    }

    // 2-1. GET: 모든 문서의 이미지/이름 목록 (홈페이지 동기화용)
    if (request.method === "GET" && apiPath === "/images") {
        try {
            const { results } = await env.DB.prepare("SELECT title, name, image, category, birthday FROM wiki_pages").all();
            
            // [수정] 레거시 media.fabulousbeasts.kr URL을 새로운 Worker 경로로 자동 변환
            const convertedResults = results.map(item => {
                if (item.image && item.image.includes('media.fabulousbeasts.kr')) {
                    // media.fabulousbeasts.kr/filename.jpg -> /api/r2/filename.jpg
                    const filename = item.image.replace(/https?:\/\/media\.fabulousbeasts\.kr\//, '');
                    item.image = `https://wiki.fabulousbeasts.kr/api/r2/${encodeURIComponent(filename)}`;
                }
                return item;
            });
            
            return new Response(JSON.stringify(convertedResults), { headers: corsHeaders });
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
        }
    }

    // 3. POST: 문서 저장
    if (request.method === "POST" && apiPath === "/wiki") {
        try {
            const data = await request.json();
            const { title, oldTitle, name, content, author, category, species, nation, alias, birthday, image, gallery, custom_info } = data;

            // [추가] 제목(ID) 변경 로직: oldTitle이 있고 title과 다를 경우 D1의 PK를 업데이트합니다.
            if (oldTitle && oldTitle !== title) {
                // 1. 새로운 제목이 이미 존재하는지 확인 (덮어쓰기 방지)
                const existing = await env.DB.prepare("SELECT title FROM wiki_pages WHERE title = ?").bind(title).first();
                if (existing) {
                    return new Response(JSON.stringify({ error: "이미 존재하는 제목입니다. 다른 이름을 사용해 주세요." }), { status: 400, headers: corsHeaders });
                }
                
                // 2. PK 업데이트
                await env.DB.prepare("UPDATE wiki_pages SET title = ? WHERE title = ?").bind(title, oldTitle).run();
                
                // 3. 관련 리비전 제목도 함께 업데이트
                try {
                    await env.DB.prepare("UPDATE wiki_revisions SET title = ? WHERE title = ?").bind(title, oldTitle).run();
                } catch (e) {
                    console.error("Revision title update failed:", e);
                }
            }

            await env.DB.prepare(`
                INSERT INTO wiki_pages (title, name, content, author, category, species, nation, alias, birthday, image, gallery, custom_info, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(title) DO UPDATE SET
                  name = excluded.name,
                  content = excluded.content,
                  author = excluded.author,
                  category = excluded.category,
                  species = excluded.species,
                  nation = excluded.nation,
                  alias = excluded.alias,
                  birthday = excluded.birthday,
                  image = excluded.image,
                  gallery = excluded.gallery,
                  custom_info = excluded.custom_info,
                  updated_at = CURRENT_TIMESTAMP
            `).bind(
                title, name || "", content, author || "Anonymous", category || "기타",
                species || "", nation || "", alias || "", birthday || "", image || "",
                gallery ? (typeof gallery === 'string' ? gallery : JSON.stringify(gallery)) : "[]",
                custom_info ? (typeof custom_info === 'string' ? custom_info : JSON.stringify(custom_info)) : "[]"
            ).run();

            // Revision 저장 (선택 사항)
            try {
                await env.DB.prepare("INSERT INTO wiki_revisions (title, content, author) VALUES (?, ?, ?)").bind(title, content, author || "Anonymous").run();
            } catch (e) {}

            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
        }
    }

    // 4. User Role 관련
    if (request.method === "GET" && apiPath === "/users") {
        try {
            // avatar 컬럼 추가 (없는 경우에만)
            try {
                await env.DB.prepare(`ALTER TABLE users ADD COLUMN avatar TEXT`).run();
            } catch (e) {
                // 이미 존재하면 무시
            }
            
            const { results } = await env.DB.prepare("SELECT * FROM users ORDER BY updated_at DESC").all();
            return new Response(JSON.stringify(results), { headers: corsHeaders });
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
        }
    }

    if (request.method === "GET" && apiPath.startsWith("/user/")) {
        const uid = apiPath.split("/").pop();
        const result = await env.DB.prepare("SELECT role FROM users WHERE uid = ?").bind(uid).first();
        return new Response(JSON.stringify(result || { role: "member" }), { headers: corsHeaders });
    }

    if (request.method === "POST" && apiPath === "/user/role") {
        try {
            const { uid, role, name, nickname, email, isBanned, avatar, secret } = await request.json();
            
            // 보안 코드(9889)가 있는 경우에만 권한(role), 차단 여부, 아바타를 수정할 수 있습니다.
            if (secret === "9889") {
                await env.DB.prepare(`
                    INSERT INTO users (uid, role, name, nickname, email, is_banned, avatar, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(uid) DO UPDATE SET 
                        role = excluded.role, 
                        name = excluded.name,
                        nickname = excluded.nickname, 
                        email = excluded.email, 
                        is_banned = excluded.is_banned,
                        avatar = excluded.avatar,
                        updated_at = CURRENT_TIMESTAMP
                `).bind(uid, role || "member", name || nickname || "", nickname || "", email || "", isBanned ? 1 : 0, avatar || null).run();
            } else {
                // 보안 코드가 없는 경우 (단순 가입/동기화), 기존 권한을 유지하며 정보만 업데이트합니다.
                await env.DB.prepare(`
                    INSERT INTO users (uid, role, name, nickname, email, is_banned, updated_at)
                    VALUES (?, 'member', ?, ?, ?, 0, CURRENT_TIMESTAMP)
                    ON CONFLICT(uid) DO UPDATE SET 
                        name = excluded.name,
                        nickname = excluded.nickname, 
                        email = excluded.email, 
                        updated_at = CURRENT_TIMESTAMP
                `).bind(uid, name || nickname || "", nickname || "", email || "").run();
            }
            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
        }
    }

    // 6. POST: 사이트 설정 저장
    if (request.method === "POST" && apiPath === "/settings") {
        try {
            const { notice, news, secret } = await request.json();
            if (secret !== "9889") return new Response("Unauthorized", { status: 401 });

            // [추가] 테이블 생성 보장
            await env.DB.prepare("CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY, value TEXT)").run();

            if (notice !== undefined) {
                await env.DB.prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES ('notice', ?)").bind(notice).run();
            }
            if (news !== undefined) {
                await env.DB.prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES ('news', ?)").bind(news).run();
            }

            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
        }
    }

    // 7. GET: 댓글 목록 조회
    if (request.method === "GET" && apiPath === "/comments") {
        const episode = url.searchParams.get("episode");
        if (!episode) return new Response(JSON.stringify({ error: "Missing episode parameter" }), { status: 400, headers: corsHeaders });
        try {
            await env.DB.prepare(`
                CREATE TABLE IF NOT EXISTS video_comments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    episode_num INTEGER NOT NULL,
                    uid TEXT NOT NULL,
                    author TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `).run();

            // 댓글과 사용자 아바타를 JOIN하여 조회
            const { results } = await env.DB.prepare(`
                SELECT 
                    c.id, 
                    c.episode_num, 
                    c.uid, 
                    c.author, 
                    c.content, 
                    strftime('%Y-%m-%dT%H:%M:%SZ', c.created_at) as created_at,
                    u.avatar
                FROM video_comments c
                LEFT JOIN users u ON c.uid = u.uid
                WHERE c.episode_num = ? 
                ORDER BY c.created_at DESC
            `).bind(episode).all();
            
            console.log('[댓글 조회]', episode, '댓글 수:', results.length);
            results.forEach(r => {
                console.log(`  - ${r.author} (uid: ${r.uid}), avatar: ${r.avatar}`);
            });
            
            return new Response(JSON.stringify(results), { headers: corsHeaders });
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
        }
    }

    // 8. POST: 댓글 작성
    if (request.method === "POST" && apiPath === "/comments") {
        try {
            await env.DB.prepare(`
                CREATE TABLE IF NOT EXISTS video_comments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    episode_num INTEGER NOT NULL,
                    uid TEXT NOT NULL,
                    author TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `).run();

            const data = await request.json();
            const { episode_num, content, author, uid } = data;
            if (!episode_num || !content || !author || !uid) {
                return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: corsHeaders });
            }

            await env.DB.prepare("INSERT INTO video_comments (episode_num, uid, author, content) VALUES (?, ?, ?, ?)").bind(episode_num, uid, author, content).run();
            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
        }
    }

    // 9. POST: 댓글 삭제
    if (request.method === "POST" && apiPath === "/comments/delete") {
        try {
            const data = await request.json();
            const { id, uid, role } = data;
            if (!id || !uid) {
                return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: corsHeaders });
            }

            // 댓글 작성자이거나 관리자(admin)인지 확인
            const comment = await env.DB.prepare("SELECT uid FROM video_comments WHERE id = ?").bind(id).first();
            if (!comment) {
                return new Response(JSON.stringify({ error: "Comment not found" }), { status: 404, headers: corsHeaders });
            }

            if (comment.uid !== uid && role !== 'admin') {
                return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403, headers: corsHeaders });
            }

            await env.DB.prepare("DELETE FROM video_comments WHERE id = ?").bind(id).run();
            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
        }
    }

    // 10. GET: 좋아요 정보 조회
    if (request.method === "GET" && apiPath === "/likes") {
        const episode = url.searchParams.get("episode");
        const uid = url.searchParams.get("uid");
        if (!episode) return new Response(JSON.stringify({ error: "Missing episode parameter" }), { status: 400, headers: corsHeaders });
        try {
            await env.DB.prepare(`
                CREATE TABLE IF NOT EXISTS video_likes (
                    episode_num INTEGER NOT NULL,
                    uid TEXT NOT NULL,
                    PRIMARY KEY (episode_num, uid)
                )
            `).run();

            // 총 좋아요 개수
            const countResult = await env.DB.prepare("SELECT COUNT(*) as count FROM video_likes WHERE episode_num = ?").bind(episode).first();
            const totalLikes = countResult ? countResult.count : 0;

            // 내가 좋아요를 눌렀는지 여부
            let userLiked = false;
            if (uid) {
                const likedResult = await env.DB.prepare("SELECT 1 FROM video_likes WHERE episode_num = ? AND uid = ?").bind(episode, uid).first();
                userLiked = !!likedResult;
            }

            return new Response(JSON.stringify({ count: totalLikes, liked: userLiked }), { headers: corsHeaders });
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
        }
    }

    // 11. POST: 좋아요 토글
    if (request.method === "POST" && apiPath === "/likes") {
        try {
            await env.DB.prepare(`
                CREATE TABLE IF NOT EXISTS video_likes (
                    episode_num INTEGER NOT NULL,
                    uid TEXT NOT NULL,
                    PRIMARY KEY (episode_num, uid)
                )
            `).run();

            const data = await request.json();
            const { episode_num, uid } = data;
            if (!episode_num || !uid) {
                return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: corsHeaders });
            }

            // 기 등록 여부 확인
            const existing = await env.DB.prepare("SELECT 1 FROM video_likes WHERE episode_num = ? AND uid = ?").bind(episode_num, uid).first();
            if (existing) {
                // 이미 존재하면 삭제 (좋아요 취소)
                await env.DB.prepare("DELETE FROM video_likes WHERE episode_num = ? AND uid = ?").bind(episode_num, uid).run();
                return new Response(JSON.stringify({ success: true, liked: false }), { headers: corsHeaders });
            } else {
                // 없으면 추가
                await env.DB.prepare("INSERT INTO video_likes (episode_num, uid) VALUES (?, ?)").bind(episode_num, uid).run();
                return new Response(JSON.stringify({ success: true, liked: true }), { headers: corsHeaders });
            }
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
        }
    }

    // 12. GET: 커뮤니티 게시글 목록 조회
    if (request.method === "GET" && apiPath === "/community/posts") {
        try {
            console.log('[API] Loading community posts...');
            
            // users 테이블 생성 및 avatar 컬럼 확인
            await env.DB.prepare(`
                CREATE TABLE IF NOT EXISTS users (
                    uid TEXT PRIMARY KEY,
                    role TEXT DEFAULT 'member',
                    name TEXT,
                    nickname TEXT,
                    email TEXT,
                    is_banned INTEGER DEFAULT 0,
                    avatar TEXT,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `).run();
            
            // avatar 컬럼 추가 (없는 경우에만)
            try {
                await env.DB.prepare(`ALTER TABLE users ADD COLUMN avatar TEXT`).run();
            } catch (e) {
                // 이미 존재하면 무시
            }
            
            // 기존 테이블 생성
            await env.DB.prepare(`
                CREATE TABLE IF NOT EXISTS community_posts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    uid TEXT NOT NULL,
                    author TEXT NOT NULL,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    image TEXT,
                    images TEXT,
                    videos TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `).run();
            
            console.log('[API] Tables created');
            
            // images와 videos 컬럼 추가 (없는 경우에만)
            try {
                await env.DB.prepare(`ALTER TABLE community_posts ADD COLUMN images TEXT`).run();
            } catch (e) {
                // 이미 존재하면 무시
            }
            try {
                await env.DB.prepare(`ALTER TABLE community_posts ADD COLUMN videos TEXT`).run();
            } catch (e) {
                // 이미 존재하면 무시
            }
            
            await env.DB.prepare(`
                CREATE TABLE IF NOT EXISTS community_comments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    post_id INTEGER NOT NULL,
                    uid TEXT NOT NULL,
                    author TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `).run();

            console.log('[API] Fetching posts...');
            
            // 게시글 조회 (먼저)
            const { results: posts } = await env.DB.prepare(`
                SELECT 
                    p.id, 
                    p.uid, 
                    p.author, 
                    p.title, 
                    p.content, 
                    p.image, 
                    p.images, 
                    p.videos, 
                    strftime('%Y-%m-%dT%H:%M:%SZ', p.created_at) as created_at,
                    u.avatar
                FROM community_posts p
                LEFT JOIN users u ON p.uid = u.uid
                ORDER BY p.created_at DESC
            `).all();
            
            console.log(`[API] Found ${posts.length} posts`);
            
            // 각 게시글의 댓글 수를 따로 조회
            for (const post of posts) {
                const commentResult = await env.DB.prepare(
                    "SELECT COUNT(*) as count FROM community_comments WHERE post_id = ?"
                ).bind(post.id).first();
                post.comment_count = commentResult ? commentResult.count : 0;
            }
            
            console.log('[API] Comment counts added, returning results');
            
            return new Response(JSON.stringify(posts), { headers: corsHeaders });
        } catch (err) {
            console.error('[API ERROR]', err);
            return new Response(JSON.stringify({ error: err.message, stack: err.stack }), { status: 500, headers: corsHeaders });
        }
    }

    // 13. POST: 커뮤니티 게시글 작성
    if (request.method === "POST" && apiPath === "/community/posts") {
        try {
            await env.DB.prepare(`
                CREATE TABLE IF NOT EXISTS community_posts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    uid TEXT NOT NULL,
                    author TEXT NOT NULL,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    image TEXT,
                    images TEXT,
                    videos TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `).run();
            
            // images와 videos 컬럼 추가 (없는 경우에만)
            try {
                await env.DB.prepare(`ALTER TABLE community_posts ADD COLUMN images TEXT`).run();
            } catch (e) {
                // 이미 존재하면 무시
            }
            try {
                await env.DB.prepare(`ALTER TABLE community_posts ADD COLUMN videos TEXT`).run();
            } catch (e) {
                // 이미 존재하면 무시
            }

            const data = await request.json();
            const { uid, author, title, content, image, images, videos } = data;
            if (!uid || !author || !title || !content) {
                return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: corsHeaders });
            }

            await env.DB.prepare("INSERT INTO community_posts (uid, author, title, content, image, images, videos) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(uid, author, title, content, image || null, images || null, videos || null).run();
            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
        }
    }

    // 14. POST: 커뮤니티 게시글 삭제
    if (request.method === "POST" && apiPath === "/community/posts/delete") {
        try {
            const data = await request.json();
            const { id, uid, role } = data;
            if (!id || !uid) {
                return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: corsHeaders });
            }

            const post = await env.DB.prepare("SELECT uid FROM community_posts WHERE id = ?").bind(id).first();
            if (!post) {
                return new Response(JSON.stringify({ error: "Post not found" }), { status: 404, headers: corsHeaders });
            }

            if (post.uid !== uid && role !== 'admin') {
                return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403, headers: corsHeaders });
            }

            await env.DB.prepare("DELETE FROM community_comments WHERE post_id = ?").bind(id).run();
            await env.DB.prepare("DELETE FROM community_posts WHERE id = ?").bind(id).run();
            
            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
        }
    }

    // 15. GET: 특정 게시글 댓글 조회
    if (request.method === "GET" && apiPath === "/community/comments") {
        const postId = url.searchParams.get("post_id");
        if (!postId) return new Response(JSON.stringify({ error: "Missing post_id parameter" }), { status: 400, headers: corsHeaders });
        try {
            await env.DB.prepare(`
                CREATE TABLE IF NOT EXISTS community_comments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    post_id INTEGER NOT NULL,
                    uid TEXT NOT NULL,
                    author TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `).run();

            // 댓글과 사용자 아바타를 JOIN하여 조회
            const { results } = await env.DB.prepare(`
                SELECT 
                    c.id, 
                    c.post_id, 
                    c.uid, 
                    c.author, 
                    c.content, 
                    strftime('%Y-%m-%dT%H:%M:%SZ', c.created_at) as created_at,
                    u.avatar
                FROM community_comments c
                LEFT JOIN users u ON c.uid = u.uid
                WHERE c.post_id = ? 
                ORDER BY c.created_at ASC
            `).bind(postId).all();
            
            return new Response(JSON.stringify(results), { headers: corsHeaders });
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
        }
    }

    // 16. POST: 특정 게시글 댓글 작성
    if (request.method === "POST" && apiPath === "/community/comments") {
        try {
            await env.DB.prepare(`
                CREATE TABLE IF NOT EXISTS community_comments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    post_id INTEGER NOT NULL,
                    uid TEXT NOT NULL,
                    author TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `).run();

            const data = await request.json();
            const { post_id, uid, author, content } = data;
            if (!post_id || !uid || !author || !content) {
                return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: corsHeaders });
            }

            await env.DB.prepare("INSERT INTO community_comments (post_id, uid, author, content) VALUES (?, ?, ?, ?)").bind(post_id, uid, author, content).run();
            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
        }
    }

    // 17. POST: 특정 게시글 댓글 삭제
    if (request.method === "POST" && apiPath === "/community/comments/delete") {
        try {
            const data = await request.json();
            const { id, uid, role } = data;
            if (!id || !uid) {
                return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: corsHeaders });
            }

            const comment = await env.DB.prepare("SELECT uid FROM community_comments WHERE id = ?").bind(id).first();
            if (!comment) {
                return new Response(JSON.stringify({ error: "Comment not found" }), { status: 404, headers: corsHeaders });
            }

            if (comment.uid !== uid && role !== 'admin') {
                return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403, headers: corsHeaders });
            }

            await env.DB.prepare("DELETE FROM community_comments WHERE id = ?").bind(id).run();
            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
        }
    }

    return new Response(JSON.stringify({ error: `Not Found: ${path}` }), { status: 404, headers: corsHeaders });
}
