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
- One post per IP per 60 seconds (KV TTL rate limit — 60s is KV's minimum TTL).
- The board keeps the latest 100 posts.
- Profanity is censored at ingestion (`****` per character) using the
  community-maintained [LDNOOBW word list](https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words),
  fetched from GitHub and cached in the KV key `wordlist` for a week — no word
  list lives in this repo. The site applies the same filter again at render
  time, so even a post that reached KV raw is masked on screen.

## Email notifications (optional)

The worker can email you every time someone posts, via
[Resend](https://resend.com) (free tier — no domain setup needed):

1. Sign up at resend.com **using the address you want notified**. On the free
   tier without a verified domain, Resend only delivers to your own account
   address (sent from `onboarding@resend.dev`) — exactly right for
   self-notifications.
2. Create an API key (dashboard → API Keys), then store it as a secret:

   ```sh
   npx wrangler secret put RESEND_API_KEY
   ```

3. Set `NOTIFY_EMAIL = "you@example.com"` under `[vars]` in `wrangler.toml`
   and redeploy.

Emails are sent best-effort after the response (`ctx.waitUntil`), so a mail
outage can never block or slow down posting. The email contains the censored
text — what the board actually displays. If you later verify your own domain
with Resend, set a `NOTIFY_FROM` var to send from your own address.

## Moderation

Posts live in the single KV key `posts`. To remove something, edit that key
in the Cloudflare dashboard (Workers → KV → your namespace), or wipe the
board with:

```sh
npx wrangler kv key put posts "[]" --binding BBS --remote
```
