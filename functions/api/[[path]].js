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
            const { results } = await env.DB.prepare("SELECT title, author, category, updated_at FROM wiki_pages ORDER BY updated_at DESC LIMIT 8").all();
            return new Response(JSON.stringify(results), { headers: corsHeaders });
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
        }
    }

    // 3. POST: 문서 저장
    if (request.method === "POST" && apiPath === "/wiki") {
        try {
            const data = await request.json();
            const { title, name, content, author, category, species, nation, alias, birthday, image, gallery } = data;

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
                title, name || title, content, author || "Anonymous", category || "기타",
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
    if (request.method === "GET" && apiPath.startsWith("/user/")) {
        const uid = apiPath.split("/").pop();
        const result = await env.DB.prepare("SELECT role FROM users WHERE uid = ?").bind(uid).first();
        return new Response(JSON.stringify(result || { role: "member" }), { headers: corsHeaders });
    }

    if (request.method === "POST" && apiPath === "/user/role") {
        const { uid, role, nickname, email, secret } = await request.json();
        if (secret !== "9889") return new Response("Unauthorized", { status: 401 });
        await env.DB.prepare(`
            INSERT INTO users (uid, role, nickname, email, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(uid) DO UPDATE SET role = excluded.role, nickname = excluded.nickname, email = excluded.email, updated_at = CURRENT_TIMESTAMP
        `).bind(uid, role, nickname || "", email || "").run();
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: `Not Found: ${path}` }), { status: 404, headers: corsHeaders });
}
