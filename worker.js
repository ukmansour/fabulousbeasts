/**
 * Cloudflare Worker: Wiki Backend (Firestore to D1)
 * handles GET (Select with Cache) and POST (Update/Insert)
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const cache = caches.default;

    // 1. GET: 특정 제목의 문서 불러오기 (Select with Cache)
    if (request.method === "GET" && path.startsWith("/wiki/")) {
      const title = decodeURIComponent(path.split("/").pop());

      // 캐시 확인 (브라우저/CDN 캐시 활용)
      let response = await cache.match(request);
      if (response) {
        console.log(`Cache Hit: ${title}`);
        return response;
      }

      console.log(`Cache Miss: ${title}. Fetching from D1...`);
      
      try {
        const result = await env.DB.prepare(
          "SELECT * FROM wiki_pages WHERE title = ?"
        ).bind(title).first();

        if (!result) {
          return new Response(JSON.stringify({ error: "Not Found" }), { 
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }

        // 응답 생성 및 캐시 설정 (60초간 캐싱)
        response = new Response(JSON.stringify(result), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=60",
            "Access-Control-Allow-Origin": "*" // CORS 허용
          }
        });

        // 캐시 저장 (ctx.waitUntil을 사용하여 응답 후 비동기로 저장)
        ctx.waitUntil(cache.put(request, response.clone()));
        
        return response;
      } catch (err) {
        return new Response(err.message, { status: 500 });
      }
    }

    // 2. POST: 문서 저장/수정 (Update/Insert)
    if (request.method === "POST" && path === "/wiki") {
      try {
        const data = await request.json();
        const { title, content, author, category, species, nation, alias, birthday, image, gallery } = data;

        if (!title || !content) {
          return new Response("Title and Content are required", { status: 400 });
        }

        // D1 Query: UPSERT (Insert or Update on Conflict)
        // updated_at은 CURRENT_TIMESTAMP로 자동 갱신
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
          gallery ? JSON.stringify(gallery) : "[]"
        ).run();

        // [중요] 수정 시 기존 캐시 무효화 (해당 타이틀의 GET 요청 캐시 삭제)
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
        return new Response(err.message, { status: 500 });
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
