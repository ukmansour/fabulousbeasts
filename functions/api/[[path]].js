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

            const publicUrl = `https://media.fabulousbeasts.kr/${safeName}`;
            return new Response(JSON.stringify({ success: true, url: publicUrl }), { headers: corsHeaders });
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
            const { results } = await env.DB.prepare("SELECT title, name, image, category FROM wiki_pages").all();
            return new Response(JSON.stringify(results), { headers: corsHeaders });
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
        }
    }

    // 3. POST: 문서 저장
    if (request.method === "POST" && apiPath === "/wiki") {
        try {
            const data = await request.json();
            const { title, oldTitle, name, content, author, category, species, nation, alias, birthday, image, gallery } = data;

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
                INSERT INTO wiki_pages (title, name, content, author, category, species, nation, alias, birthday, image, gallery, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
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
                  updated_at = CURRENT_TIMESTAMP
            `).bind(
                title, name || "", content, author || "Anonymous", category || "기타",
                species || "", nation || "", alias || "", birthday || "", image || "",
                gallery ? (typeof gallery === 'string' ? gallery : JSON.stringify(gallery)) : "[]"
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
            const { uid, role, nickname, email, secret } = await request.json();
            
            // 보안 코드(9889)가 있는 경우에만 권한(role)을 수정할 수 있습니다.
            if (secret === "9889") {
                await env.DB.prepare(`
                    INSERT INTO users (uid, role, nickname, email, updated_at)
                    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(uid) DO UPDATE SET 
                        role = excluded.role, 
                        nickname = excluded.nickname, 
                        email = excluded.email, 
                        updated_at = CURRENT_TIMESTAMP
                `).bind(uid, role || "member", nickname || "", email || "").run();
            } else {
                // 보안 코드가 없는 경우 (단순 동기화), 기존 권한을 유지하며 정보만 업데이트합니다.
                await env.DB.prepare(`
                    INSERT INTO users (uid, role, nickname, email, updated_at)
                    VALUES (?, 'member', ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(uid) DO UPDATE SET 
                        nickname = excluded.nickname, 
                        email = excluded.email, 
                        updated_at = CURRENT_TIMESTAMP
                `).bind(uid, nickname || "", email || "").run();
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

    return new Response(JSON.stringify({ error: `Not Found: ${path}` }), { status: 404, headers: corsHeaders });
}
