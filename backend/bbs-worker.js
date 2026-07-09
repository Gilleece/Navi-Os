/* ============================================================
   NAVI-OS — BBS.SYS backend
   A Cloudflare Worker + KV store that turns the bulletin board
   into a real shared feed. Free tier is plenty.

   Endpoints
     GET  /posts   -> JSON array of posts, newest first
     POST /posts   -> { handle, body }  -> updated JSON array

   Guards: 280-char body cap, 24-char handle cap, control chars
   stripped, 60s per-IP rate limit, board capped at 100 posts,
   profanity censored at ingestion (see below).

   Optional: emails the operator on every new post via Resend —
   set the RESEND_API_KEY secret and NOTIFY_EMAIL var to enable
   (see backend/README.md). Unconfigured, posting works as-is.
   ============================================================ */
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type",
};
const MAX_POSTS = 100;

/* ---------- profanity filter --------------------------------
   The word list is the community-maintained LDNOOBW list,
   fetched from GitHub and cached in KV for a week — nothing is
   hardcoded here. Matches are masked entirely ("****"). If the
   list is unreachable the post passes through unfiltered; the
   site censors again at render time as the second layer.       */
const WORDLIST_URL = "https://raw.githubusercontent.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/master/en";
let wordRe;   // module-cached compiled regex (survives between requests)

function buildRe(text){
  const words = text.split("\n")
    .map(w => w.trim())
    .filter(w => w && !w.startsWith("#"))
    .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return words.length ? new RegExp(`\\b(?:${words.join("|")})\\b`, "gi") : null;
}
const censor = (s, re) => re ? s.replace(re, m => "*".repeat(m.length)) : s;

/* ---------- email notification ------------------------------
   Best-effort: runs after the response via ctx.waitUntil, and
   any failure is swallowed — mail trouble must never block or
   slow down a post. Sends the censored text, i.e. what the
   board actually shows.                                        */
async function notifyEmail(env, post){
  try{
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: env.NOTIFY_FROM || "NAVI-OS BBS <onboarding@resend.dev>",
        to: env.NOTIFY_EMAIL,
        subject: `BBS.SYS — new transmission from ${post.handle}`,
        text: `${post.handle} @ ${new Date(post.ts).toUTCString()}\n\n${post.body}\n\n— navi-bbs, the wired`,
      }),
    });
  }catch(e){ /* best-effort only */ }
}

async function profanityRe(env){
  if (wordRe !== undefined) return wordRe;
  let text = await env.BBS.get("wordlist");
  if (!text){
    try{
      const r = await fetch(WORDLIST_URL);
      if (!r.ok) throw new Error(r.status);
      text = await r.text();
      await env.BBS.put("wordlist", text, { expirationTtl: 604800 });  // re-fetch weekly
    }catch(e){ return null; }   // wordRe stays undefined so the next post retries
  }
  wordRe = buildRe(text);
  return wordRe;
}

export default {
  async fetch(req, env, ctx){
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
      let handle = clean(data.handle || "anon").slice(0, 24) || "anon";
      let body = clean(data.body || "").slice(0, 280);
      if (!body) return new Response("empty transmission", { status: 400, headers: CORS });

      const re = await profanityRe(env);
      handle = censor(handle, re);
      body = censor(body, re);

      const posts = JSON.parse(await env.BBS.get("posts") || "[]");
      const post = { handle, body, ts: Date.now() };
      posts.unshift(post);
      await env.BBS.put("posts", JSON.stringify(posts.slice(0, MAX_POSTS)));
      await env.BBS.put("rl:" + ip, "1", { expirationTtl: 60 });   // KV minimum TTL is 60s
      if (env.RESEND_API_KEY && env.NOTIFY_EMAIL) ctx.waitUntil(notifyEmail(env, post));
      return Response.json(posts.slice(0, MAX_POSTS), { headers: CORS });
    }

    return new Response("method not allowed", { status: 405, headers: CORS });
  },
};
