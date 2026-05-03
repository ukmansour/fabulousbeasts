/**
 * Cloudflare Worker: Wiki Backend (D1 + R2)
 * GET  /api/wiki/:title    - D1 문서 조회 (캐시 우선)
 * POST /api/wiki           - D1 문서 저장/수정 (UPSERT)
 * POST /api/upload         - R2 이미지 업로드 → 퍼블릭 URL 반환
 * GET  /api/recent         - 최근 수정 문서 목록
 * GET  /api/setup-db       - D1 테이블 자동 생성
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const cache = caches.default;

    console.log(`[Worker] Request: ${request.method} ${path}`);

    // CORS Headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };

    // 0. OPTIONS: CORS Preflight (맨 위에서 처리)
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // === R2 이미지 업로드 ===
    // POST /upload : FormData로 파일을 받아 R2에 저장하고 퍼블릭 URL 반환
    if (request.method === "POST" && path === "/api/upload") {
      try {
        if (!env.BUCKET) {
          return new Response(JSON.stringify({ error: "R2 버킷이 Worker에 바인딩되지 않았습니다. wrangler.jsonc를 확인해 주세요." }), { status: 500, headers: corsHeaders });
        }

        const formData = await request.formData();
        const file = formData.get("file");
        const folder = formData.get("folder") || "characters";

        if (!file) {
          return new Response(JSON.stringify({ error: "업로드할 파일이 없습니다." }), { status: 400, headers: corsHeaders });
        }

        const ext = file.name.split(".").pop().toLowerCase() || "jpg";
        const safeName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

        await env.BUCKET.put(safeName, file.stream(), {
          httpMetadata: { contentType: file.type || "image/jpeg" }
        });

        // R2 퍼블릭 URL (media.fabulousbeasts.kr 도메인이 R2 버킷에 연결되어 있어야 합니다)
        const publicUrl = `https://media.fabulousbeasts.kr/${safeName}`;

        return new Response(JSON.stringify({ success: true, url: publicUrl }), { headers: corsHeaders });
      } catch (err) {
        console.error("[Worker] R2 Upload Error:", err);
        return new Response(JSON.stringify({ error: `이미지 업로드 실패: ${err.message}` }), { status: 500, headers: corsHeaders });
      }
    }

    // 1. GET: 특정 제목의 문서 불러오기
    if (request.method === "GET" && path.startsWith("/api/wiki/")) {
      const title = decodeURIComponent(path.split("/").pop());
      
      // 캐시 확인 (환경에 따라 없을 수 있음)
      let response = null;
      if (cache) {
        try { response = await cache.match(request); } catch(e) { console.warn("Cache match failed:", e); }
      }
      if (response) return response;

      try {
        const result = await env.DB.prepare(
          "SELECT * FROM wiki_pages WHERE title = ?"
        ).bind(title).first();

        if (!result) {
          return new Response(JSON.stringify({ error: "Not Found" }), { 
            status: 404, 
            headers: corsHeaders 
          });
        }

        response = new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Cache-Control": "public, max-age=60" }
        });

        ctx.waitUntil(cache.put(request, response.clone()));
        return response;
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { 
          status: 500, 
          headers: corsHeaders 
        });
      }
    }

    // 2. GET: 최근 변경된 문서 목록
    if (request.method === "GET" && path === "/api/recent") {
      try {
        const { results } = await env.DB.prepare(
          "SELECT title, author, category, updated_at FROM wiki_pages ORDER BY updated_at DESC LIMIT 8"
        ).all();

        return new Response(JSON.stringify(results), { headers: corsHeaders });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // 2.5. GET: 데이터베이스 자동 초기화 (사용자 편의 기능)
    if (request.method === "GET" && path === "/api/setup-db") {
      try {
        const setupQueries = [
          `CREATE TABLE IF NOT EXISTS wiki_pages (
            title TEXT PRIMARY KEY,
            content TEXT NOT NULL,
            author TEXT,
            category TEXT,
            species TEXT,
            nation TEXT,
            alias TEXT,
            birthday TEXT,
            image TEXT,
            gallery TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );`,
          `CREATE TABLE IF NOT EXISTS wiki_revisions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT,
            author TEXT,
            edited_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );`,
          `CREATE TABLE IF NOT EXISTS users (
            uid TEXT PRIMARY KEY,
            role TEXT DEFAULT 'member',
            nickname TEXT,
            email TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );`
        ];

        for (const query of setupQueries) {
          await env.DB.prepare(query).run();
        }

        return new Response("데이터베이스 테이블 생성 및 초기화가 성공적으로 완료되었습니다. 이제 문서를 저장할 수 있습니다.", { status: 200, headers: corsHeaders });
      } catch (err) {
        return new Response(`데이터베이스 초기화 실패: ${err.message}`, { status: 500, headers: corsHeaders });
      }
    }

    // 3. POST: 문서 저장/수정

    if (request.method === "POST" && path === "/api/wiki") {
      try {
        const data = await request.json();
        console.log("[Worker] Save request received:", JSON.stringify(data));
        const { title, content, author, category, species, nation, alias, birthday, image, gallery } = data;

        if (!title || title.trim() === "") {
          return new Response(JSON.stringify({ error: "문서 제목이 없습니다." }), { status: 400, headers: corsHeaders });
        }
        if (!content || content.trim() === "") {
          return new Response(JSON.stringify({ error: "본문 내용이 비어 있습니다." }), { status: 400, headers: corsHeaders });
        }

        try {
          // 1. 위키 본문 저장 (UPSERT)
          await env.DB.prepare(`
            INSERT INTO wiki_pages (title, content, author, category, species, nation, alias, birthday, image, gallery, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(title) DO UPDATE SET
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
            title, content, author || "Anonymous", category || "기타",
            species || "", nation || "", alias || "", birthday || "", image || "",
            gallery ? (typeof gallery === 'string' ? gallery : JSON.stringify(gallery)) : "[]"
          ).run();

          // 2. 수정 기록 (History) 저장
          // 테이블이 존재할 때만 에러 없이 넘어가도록 try-catch 처리 (혹시나 setup-db를 안 한 경우 대비)
          try {
              await env.DB.prepare(`
                  INSERT INTO wiki_revisions (title, content, author, edited_at)
                  VALUES (?, ?, ?, CURRENT_TIMESTAMP)
              `).bind(title, content, author || "Anonymous").run();
          } catch (revisionErr) {
              console.warn("[Worker] Failed to save revision history (maybe table missing):", revisionErr.message);
          }

          return new Response(JSON.stringify({ success: true, message: "저장 완료" }), {
            headers: corsHeaders
          });
        } catch (d1Err) {
          console.error("[Worker] D1 Save Error:", d1Err.message, d1Err.stack);
          return new Response(JSON.stringify({ error: `데이터베이스 저장 오류: ${d1Err.message}` }), { status: 500, headers: corsHeaders });
        }

        const cacheUrl = new URL(request.url);
        cacheUrl.pathname = `/api/wiki/${encodeURIComponent(title)}`;
        if (cache) {
          ctx.waitUntil(cache.delete(new Request(cacheUrl.toString(), { method: "GET" })).catch(e => console.warn("Cache delete failed:", e)));
        }

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      } catch (err) {
        console.error("[Worker] General Save Error:", err);
        return new Response(JSON.stringify({ error: `서버 내부 오류: ${err.message}` }), { status: 500, headers: corsHeaders });
      }
    }

    // 4. GET: 사용자 권한 확인
    if (request.method === "GET" && path.startsWith("/api/user/")) {
      const uid = path.split("/").pop();
      try {
        const result = await env.DB.prepare("SELECT role FROM users WHERE uid = ?").bind(uid).first();
        return new Response(JSON.stringify(result || { role: "member" }), { headers: corsHeaders });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // 5. POST: 사용자 권한 수정
    if (request.method === "POST" && path === "/api/user/role") {
      try {
        const { uid, role, nickname, email, secret } = await request.json();
        if (secret !== "9889") return new Response("Unauthorized", { status: 401 });

        await env.DB.prepare(`
          INSERT INTO users (uid, role, nickname, email, updated_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(uid) DO UPDATE SET role = excluded.role, nickname = excluded.nickname, email = excluded.email, updated_at = CURRENT_TIMESTAMP
        `).bind(uid, role, nickname || "", email || "").run();

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // 6. OPTIONS: CORS Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 7. 정적 자산(Static Assets) 처리 (위의 API 경로에 해당하지 않는 모든 요청)
    // Wrangler Assets 설정이 활성화되어 있으면 env.ASSETS를 통해 파일을 서빙합니다.
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response(JSON.stringify({ error: "Not Found" }), { status: 404, headers: corsHeaders });
  }
};
