# BBS.SYS backend

A tiny Cloudflare Worker + KV store that makes the bulletin board a real
shared feed — every visitor reads and writes the same posts. The free tier
covers this comfortably.

## Deploy (one time, ~5 minutes)

1. Sign up / log in at [dash.cloudflare.com](https://dash.cloudflare.com) (free).
2. From this `backend/` directory:

   ```sh
   npx wrangler login
   npx wrangler kv namespace create BBS
   ```

   Copy the `id` it prints into `wrangler.toml` (replacing
   `PASTE_KV_NAMESPACE_ID_HERE`), then:

   ```sh
   npx wrangler deploy
   ```

3. Wrangler prints your worker URL, e.g.
   `https://navi-bbs.<your-subdomain>.workers.dev`.
   Put that URL in the `API` constant at the top of
   [`js/apps/bbs.js`](../js/apps/bbs.js) and redeploy the site.

That's it. The board now shows `LINK: WIRED` and posts are shared. If the
worker is ever unreachable, the board falls back to local-only posting.

## Behaviour / guards

- `GET /posts` — newest-first JSON array.
- `POST /posts` — `{ handle, body }`; 24/280-char caps, control characters
  stripped, empty posts rejected.
- One post per IP per 30 seconds (KV TTL rate limit).
- The board keeps the latest 100 posts.

## Moderation

Posts live in the single KV key `posts`. To remove something, edit that key
in the Cloudflare dashboard (Workers → KV → your namespace), or wipe the
board with:

```sh
npx wrangler kv key put posts "[]" --binding BBS --remote
```
