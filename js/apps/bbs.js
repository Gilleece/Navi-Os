/* ============================================================
   NAVI-OS — BBS.SYS
   A dial-up bulletin board. Cryptic transmissions from other
   operators, seeded on first run; anything you post persists to
   localStorage, so the board remembers between visits.
   ============================================================ */
import { $ } from "../utils.js";

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
  const win = $("#win-bbs"), list = $("#bbs-posts"), handle = $("#bbs-handle"), msg = $("#bbs-msg"), btn = $("#bbs-post");
  if (!win || !list) return;
  let posts = load();

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
  function post(){
    const body = msg.value.trim(); if (!body) return;
    posts.unshift({ handle: (handle.value.trim() || "operator").slice(0, 24), body: body.slice(0, 280), ts: Date.now() });
    if (posts.length > 60) posts = posts.slice(0, 60);
    save(posts); msg.value = ""; render(); msg.focus();
  }
  btn.addEventListener("click", post);
  msg.addEventListener("keydown", e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) post(); });

  render();
}
