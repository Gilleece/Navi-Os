/* ============================================================
   NAVI-OS — BBS.SYS
   A dial-up bulletin board. Out of the box it is a local node:
   posts persist to localStorage on this machine only. Deploy
   backend/bbs-worker.js (Cloudflare Worker + KV, free tier) and
   set API below to its URL, and the board joins the wired —
   every visitor reads and writes the same feed. If the link
   drops, posting falls back to the local node.
   ============================================================ */
import { $ } from "../utils.js";

/* ← set to your deployed worker URL to make the board shared,
     e.g. "https://navi-bbs.example.workers.dev"                 */
const API = "https://navi-bbs.navi-bbs.workers.dev";

const KEY = "navi-bbs-v1";
const HR = 1000 * 60 * 60;
const SEED = [
  { handle:"knight",    body:"present day. present time.",                         ts: Date.now() - HR*1.5 },
  { handle:"dead_node", body:"if you can read this you are already im on layer 07.",           ts: Date.now() - HR*13 },
  { handle:"phantoma",  body:"the protocol is still active. stay clear!",     ts: Date.now() - HR*40 },
  { handle:"lain",      body:"no matter where you go, everyone is connected. leave a mark.", ts: Date.now() - HR*72 },
];

const load = () => { try { const r = localStorage.getItem(KEY); if (r) return JSON.parse(r); } catch(e){} return SEED.slice(); };
const save = p => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch(e){} };
const esc = s => String(s).replace(/[<>&]/g, c => ({ "<":"&lt;", ">":"&gt;", "&":"&amp;" }[c]));
const when = ts => { const s = (Date.now() - ts) / 1000;
  return s < 60 ? "just now" : s < HR/1000 ? Math.floor(s/60) + "m ago" : s < 86400 ? Math.floor(s/3600) + "h ago" : Math.floor(s/86400) + "d ago"; };

export function initBBS(){
  const win = $("#win-bbs"), list = $("#bbs-posts"), handle = $("#bbs-handle"),
        msg = $("#bbs-msg"), btn = $("#bbs-post"), status = $("#bbs-status");
  if (!win || !list) return;
  let posts = load();

  const linkStatus = (txt, cls) => {
    if (!status) return;
    status.textContent = txt;
    status.className = "bbs-status" + (cls ? " " + cls : "");
  };

  function render(){
    list.innerHTML = "";
    if (!posts.length){ const e = document.createElement("div"); e.className = "bbs-empty"; e.textContent = "no transmissions yet. be the first."; list.appendChild(e); return; }
    for (const p of posts){
      const d = document.createElement("div"); d.className = "bbs-post";
      const meta = document.createElement("div"); meta.className = "bbs-meta";
      meta.innerHTML = `<b>${esc(p.handle || "anon")}</b><span>${when(p.ts)}</span>`;
      const body = document.createElement("div"); body.className = "bbs-text"; body.textContent = p.body;
      d.append(meta, body); list.appendChild(d);
    }
  }

  async function syncRemote(){
    try{
      const r = await fetch(API + "/posts");
      if (!r.ok) throw new Error(r.status);
      posts = await r.json(); render();
      linkStatus("LINK: WIRED — shared board", "ok");
    }catch(e){
      linkStatus("LINK: DOWN — posting to this node only", "err");
    }
  }

  function localPost(entry){
    posts.unshift(entry);
    if (posts.length > 60) posts = posts.slice(0, 60);
    save(posts); render();
  }

  async function post(){
    const body = msg.value.trim(); if (!body) return;
    const entry = { handle: (handle.value.trim() || "operator").slice(0, 24), body: body.slice(0, 280), ts: Date.now() };
    msg.value = "";
    if (API){
      btn.disabled = true;
      try{
        const r = await fetch(API + "/posts", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ handle: entry.handle, body: entry.body }),
        });
        if (!r.ok) throw new Error(r.status);
        posts = await r.json(); render();
        linkStatus("LINK: WIRED — shared board", "ok");
      }catch(e){
        localPost(entry);
        linkStatus("LINK: DOWN — posted to this node only", "err");
      }
      btn.disabled = false;
    } else {
      localPost(entry);
    }
    msg.focus();
  }

  btn.addEventListener("click", post);
  msg.addEventListener("keydown", e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) post(); });

  render();
  if (API) syncRemote();
  else linkStatus("NODE: LOCAL — transmissions stay on this machine");
}
