/* ============================================================
   NAVI-OS — BBS.SYS backend
   A Cloudflare Worker + KV store that turns the bulletin board
   into a real shared feed. Free tier is plenty.

   Endpoints
     GET  /posts   -> JSON array of posts, newest first
     POST /posts   -> { handle, body }  -> updated JSON array

   Guards: 280-char body cap, 24-char handle cap, control chars
   stripped, 30s per-IP rate limit, board capped at 100 posts.
   See backend/README.md for deploy steps.
   ============================================================ */
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type",
};
const MAX_POSTS = 100;

export default {
  async fetch(req, env){
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
    const url = new URL(req.url);
    if (url.pathname !== "/posts")
      return new Response("not found", { status: 404, headers: CORS });

    if (req.method === "GET"){
      const posts = JSON.parse(await env.BBS.get("posts") || "[]");
      return Response.json(posts, { headers: CORS });
    }

    if (req.method === "POST"){
      const ip = req.headers.get("cf-connecting-ip") || "unknown";
      if (await env.BBS.get("rl:" + ip))
        return new Response("slow down, operator", { status: 429, headers: CORS });

      let data;
      try{ data = await req.json(); }
      catch(e){ return new Response("bad json", { status: 400, headers: CORS }); }

      const clean = s => String(s).replace(/[\x00-\x08\x0b-\x1f\x7f]/g, "").trim();
      const handle = clean(data.handle || "anon").slice(0, 24) || "anon";
      const body = clean(data.body || "").slice(0, 280);
      if (!body) return new Response("empty transmission", { status: 400, headers: CORS });

      const posts = JSON.parse(await env.BBS.get("posts") || "[]");
      posts.unshift({ handle, body, ts: Date.now() });
      await env.BBS.put("posts", JSON.stringify(posts.slice(0, MAX_POSTS)));
      await env.BBS.put("rl:" + ip, "1", { expirationTtl: 30 });
      return Response.json(posts.slice(0, MAX_POSTS), { headers: CORS });
    }

    return new Response("method not allowed", { status: 405, headers: CORS });
  },
};
