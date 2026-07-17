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
import { store } from "../store.js";

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
const when = ts => { const s = (Date.now() - ts) / 1000;
  return s < 60 ? "just now" : s < HR/1000 ? Math.floor(s/60) + "m ago" : s < 86400 ? Math.floor(s/3600) + "h ago" : Math.floor(s/86400) + "d ago"; };

/* ---------- profanity filter --------------------------------
   Same LDNOOBW list the worker uses, fetched from GitHub and
   cached in localStorage for a week. Censoring runs at render
   time, so even a post that reached the backend raw is masked
   ("****") before it hits the screen.                          */
const WORDLIST_URL = "https://raw.githubusercontent.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/master/en";
const WORDLIST_MAX_AGE = 7 * 86400e3;
let wordRe = null;

function buildRe(text){
  const words = text.split("\n")
    .map(w => w.trim())
    .filter(w => w && !w.startsWith("#"))
    .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return words.length ? new RegExp(`\\b(?:${words.join("|")})\\b`, "gi") : null;
}
const censor = s => wordRe ? String(s).replace(wordRe, m => "*".repeat(m.length)) : String(s);

async function initFilter(onReady){
  const cached = store.get("badwords");
  let text = cached && Date.now() - cached.ts < WORDLIST_MAX_AGE ? cached.text : null;
  if (!text){
    try{
      const r = await fetch(WORDLIST_URL);
      if (!r.ok) throw new Error(r.status);
      text = await r.text();
      store.set("badwords", { ts: Date.now(), text });
    }catch(e){ text = cached ? cached.text : null; }   // a stale list beats none
  }
  if (text){ wordRe = buildRe(text); onReady(); }
}

export function initBBS(){
  const win = $("#win-bbs"), list = $("#bbs-posts"), handle = $("#bbs-handle"),
        msg = $("#bbs-msg"), btn = $("#bbs-post"), status = $("#bbs-status"),
        form = win && win.querySelector(".bbs-form");
  if (!win || !list) return;
  let posts = load();

  /* handle persists across visits ------------------------------- */
  handle.value = store.get("bbs-handle") || "operator";
  handle.addEventListener("input", () => store.set("bbs-handle", handle.value));

  const linkStatus = (txt, cls) => {
    if (!status) return;
    status.textContent = txt;
    status.className = "bbs-status" + (cls ? " " + cls : "");
  };

  /* live char counter, tucked under the POST button ------------- */
  const counter = document.createElement("span");
  counter.className = "bbs-counter";
  counter.style.cssText = "grid-column:2;grid-row:3;justify-self:end;font-size:11px;color:var(--green-dim);padding-top:2px";
  if (form) form.appendChild(counter);
  function updateCounter(){
    const n = msg.value.length;
    counter.textContent = n + "/280";
    counter.style.color = n > 240 ? "var(--orange)" : "var(--green-dim)";
  }
  msg.addEventListener("input", updateCounter);

  function quoteReply(p){
    const body = censor(p.body || "").replace(/\s+/g, " ").trim();
    const snippet = body.length > 60 ? body.slice(0, 60) + "…" : body;
    const quote = `> ${censor(p.handle || "anon")}: ${snippet}\n\n`;
    const draft = msg.value;
    msg.value = draft ? draft.replace(/\n?$/, "\n") + quote : quote;
    msg.focus();
    msg.setSelectionRange(msg.value.length, msg.value.length);
    updateCounter();
  }

  function render(){
    const scrollTop = list.scrollTop;
    list.innerHTML = "";
    if (!posts.length){
      const e = document.createElement("div"); e.className = "bbs-empty"; e.textContent = "no transmissions yet. be the first.";
      list.appendChild(e);
    } else {
      for (const p of posts){
        const d = document.createElement("div"); d.className = "bbs-post";
        const meta = document.createElement("div"); meta.className = "bbs-meta";
        const nameEl = document.createElement("b"); nameEl.textContent = censor(p.handle || "anon");
        const right = document.createElement("span"); right.style.cssText = "display:flex;align-items:baseline;gap:6px";
        const timeEl = document.createElement("span"); timeEl.className = "bbs-time"; timeEl.textContent = when(p.ts);
        const replyBtn = document.createElement("button");
        replyBtn.type = "button"; replyBtn.title = "reply"; replyBtn.textContent = "[>]";
        replyBtn.style.cssText = "background:none;border:none;padding:0;margin:0;color:var(--green-dim);font-family:inherit;font-size:11px;cursor:pointer;line-height:1";
        replyBtn.addEventListener("mouseenter", () => replyBtn.style.color = "var(--orange)");
        replyBtn.addEventListener("mouseleave", () => replyBtn.style.color = "var(--green-dim)");
        replyBtn.addEventListener("click", () => quoteReply(p));
        right.append(timeEl, replyBtn);
        meta.append(nameEl, right);
        const body = document.createElement("div"); body.className = "bbs-text"; body.textContent = censor(p.body);
        d.append(meta, body); list.appendChild(d);
      }
    }
    list.scrollTop = scrollTop;
  }

  function refreshTimestamps(){
    list.querySelectorAll(".bbs-time").forEach((el, i) => { if (posts[i]) el.textContent = when(posts[i].ts); });
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
    updateCounter();
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

  /* live clock + auto-refresh, only while the window is open ---- */
  let tsTimer = null, syncTimer = null;
  function stopTimers(){
    if (tsTimer) clearInterval(tsTimer); tsTimer = null;
    if (syncTimer) clearInterval(syncTimer); syncTimer = null;
  }
  function startTimers(){
    stopTimers();
    tsTimer = setInterval(refreshTimestamps, 30000);
    if (API) syncTimer = setInterval(() => {
      if (win.classList.contains("open") && document.visibilityState === "visible") syncRemote();
    }, 60000);
  }
  let wasOpen = win.classList.contains("open");
  new MutationObserver(() => {
    const isOpen = win.classList.contains("open");
    if (isOpen === wasOpen) return;
    wasOpen = isOpen;
    if (isOpen) startTimers(); else stopTimers();
  }).observe(win, { attributes:true, attributeFilter:["class"] });

  render();
  updateCounter();
  initFilter(render);   // re-render once the word list is ready
  if (API){ linkStatus("LINK: DIALING…"); syncRemote(); }
  else linkStatus("NODE: LOCAL — transmissions stay on this machine");
  if (win.classList.contains("open")) startTimers();
}
