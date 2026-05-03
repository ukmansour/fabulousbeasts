/**
 * Cloudflare Worker: Wiki Backend (Firestore to D1)
 * handles GET (Select with Cache) and POST (Update/Insert)
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

    // 1. GET: 특정 제목의 문서 불러오기
    if (request.method === "GET" && path.startsWith("/wiki/")) {
      const title = decodeURIComponent(path.split("/").pop());
      
      let response = await cache.match(request);
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

    // 2. GET: 최근 변경된 문서 목록 (Select Recent)
    if (request.method === "GET" && path === "/recent") {
      try {
        const { results } = await env.DB.prepare(
          "SELECT title, author, category, updated_at FROM wiki_pages ORDER BY updated_at DESC LIMIT 8"
        ).all();

        return new Response(JSON.stringify(results), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    // 3. POST: 문서 저장/수정 (Update/Insert)
    if (request.method === "POST" && path === "/wiki") {
      try {
        const data = await request.json();
        const { title, content, author, category, species, nation, alias, birthday, image, gallery } = data;

        if (!title || !content) {
          return new Response("Title and Content are required", { status: 400 });
        }

        // D1 Query: UPSERT
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
          title, 
          content, 
          author || "Anonymous", 
          category || "General",
          species || "",
          nation || "",
          alias || "",
          birthday || "",
          image || "",
          gallery ? (typeof gallery === 'string' ? gallery : JSON.stringify(gallery)) : "[]"
        ).run();

        // 캐시 무효화
        const cacheUrl = new URL(request.url);
        cacheUrl.pathname = `/wiki/${encodeURIComponent(title)}`;
        const cacheRequest = new Request(cacheUrl.toString(), { method: "GET" });
        ctx.waitUntil(cache.delete(cacheRequest));

        return new Response(JSON.stringify({ success: true }), {
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*" 
          }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { 
          status: 500,
          headers: { "Access-Control-Allow-Origin": "*" }
        });
      }
    }

    // 4. GET: 사용자 권한 확인 (User Role)
    if (request.method === "GET" && path.startsWith("/user/")) {
      const uid = path.split("/").pop();
      try {
        const result = await env.DB.prepare(
          "SELECT role FROM users WHERE uid = ?"
        ).bind(uid).first();

        return new Response(JSON.stringify(result || { role: "member" }), {
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    // 5. POST: 사용자 권한 수정 (Admin only check should be in frontend or via secret)
    if (request.method === "POST" && path === "/user/role") {
      try {
        const { uid, role, nickname, email, secret } = await request.json();
        
        // 간단한 보안 확인 (실제 운영 시 더 강력한 인증 필요)
        if (secret !== "9889") {
          return new Response("Unauthorized", { status: 401 });
        }

        await env.DB.prepare(`
          INSERT INTO users (uid, role, nickname, email, updated_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(uid) DO UPDATE SET
            role = excluded.role,
            nickname = excluded.nickname,
            email = excluded.email,
            updated_at = CURRENT_TIMESTAMP
        `).bind(uid, role, nickname || "", email || "").run();

        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    // CORS Preflight 처리
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        }
      });
    }

    return new Response("Not Found", { status: 404 });
  }
};
