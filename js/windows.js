/* ============================================================
   NAVI-OS — window manager
   open / close / focus / drag / resize / maximise / taskbar,
   plus the program registry and #hash deep links (#projects
   opens PROJECTS, and the address bar follows the focused
   window so any view can be shared as a URL).
   ============================================================ */
import { $, $$, isMobile } from "./utils.js";
import { renderCal } from "./apps/calendar.js";
import { store } from "./store.js";

/* program registry — the one place that knows every window.
   Used by the taskbar, TERM.EXE, the start menu and hash links. */
export const APPS = {
  about:    { id:"win-about",    label:"ABOUT.SYS",   group:"system" },
  projects: { id:"win-projects", label:"PROJECTS",    group:"system" },
  calendar: { id:"win-calendar", label:"CALENDAR",    group:"system" },
  notepad:  { id:"win-notepad",  label:"NOTEPAD",     group:"system" },
  files:    { id:"win-files",    label:"FILES.SYS",   group:"system" },
  calc:     { id:"win-calc",     label:"CALC.EXE",    group:"system" },
  term:     { id:"win-term",     label:"TERM.EXE",    group:"system" },
  sysmon:   { id:"win-sysmon",   label:"SYSMON",      group:"system" },
  settings: { id:"win-settings", label:"CONFIG.SYS",  group:"system" },
  tracker:  { id:"win-tracker",  label:"TRACKER.EXE", group:"system" },
  draw:     { id:"win-draw",     label:"DRAW.EXE",    group:"system" },
  bbs:      { id:"win-bbs",      label:"BBS.SYS",     group:"system" },
  life:     { id:"win-life",     label:"LIFE.EXE",    group:"system" },
  games:    { id:"win-games",    label:"GAMES",       group:"system" },
  flappy:   { id:"win-flappy",   label:"FLAPPY.EXE",  group:"games" },
  worm:     { id:"win-worm",     label:"WORM.EXE",    group:"games" },
  defrag:   { id:"win-defrag",   label:"DEFRAG.EXE",  group:"games" },
  scan:     { id:"win-scan",     label:"SCAN.EXE",    group:"games" },
  vector:   { id:"win-vector",   label:"VECTOR.EXE",  group:"games" },
  oracle:   { id:"win-oracle",   label:"ORACLE.EXE",  group:"games" },
  maze:     { id:"win-maze",     label:"MAZE.EXE",    group:"maze" },
};
const NAME_BY_ID = {};
for (const [name, app] of Object.entries(APPS)) NAME_BY_ID[app.id] = name;

let zTop = 10;
const tasks = $("#tb-tasks");

/* deep link captured at import time, before syncHash rewrites the address bar */
const initialDeepLink = APPS[(location.hash || "").slice(1).toLowerCase()];

/* overlay elements + switcher / snap / session-restore state */
let ghostEl = null, swEl = null;
let swOpen = false, swWins = [], swIndex = 0;
let restoring = false, saveTimer = null;

/* keep the address bar pointing at the focused window */
function syncHash(){
  const open = $$(".window.open");
  if (!open.length){
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
    return;
  }
  const top = open.reduce((a, b) => (+a.style.zIndex || 0) >= (+b.style.zIndex || 0) ? a : b);
  const name = NAME_BY_ID[top.id];
  if (name && location.hash !== "#" + name) history.replaceState(null, "", "#" + name);
}

const taskBtn = id => tasks.querySelector(`[data-win="${id}"]`);

function paintTasks(){
  $$(".tb-task").forEach(b => {
    const w = document.getElementById(b.dataset.win);
    const active = w.classList.contains("open") && w.classList.contains("focused");
    b.classList.toggle("active", active);
    b.setAttribute("aria-pressed", String(active));
  });
}

export function focusWindow(w){
  zTop += 1; w.style.zIndex = zTop;
  $$(".window.focused").forEach(o => { if (o !== w) o.classList.remove("focused"); });
  w.classList.add("focused");
  paintTasks();
  syncHash();
  scheduleSave();
}

/* nudge a freshly opened window off any open window occupying the
   same spot, so repeated opens cascade instead of stacking */
function autoPlace(w){
  if (isMobile() || w.classList.contains("maxed")) return;
  const others = $$(".window.open").filter(o => o !== w);
  let guard = 0;
  while (guard++ < 12){
    const r = w.getBoundingClientRect();
    const clash = others.some(o => {
      const or = o.getBoundingClientRect();
      return Math.abs(or.left - r.left) < 24 && Math.abs(or.top - r.top) < 24;
    });
    if (!clash) return;
    w.style.left = Math.min(innerWidth - 140, r.left + 28) + "px";
    w.style.top  = Math.min(innerHeight - 140, r.top + 28) + "px";
    w.style.right = "auto"; w.style.bottom = "auto";
  }
}

/* ---------- lazy apps --------------------------------------
   The maze (its whole subsystem + three.js) and the six arcade games
   are heavy and most visitors never open them, so each is imported the
   first time its window opens rather than at boot. CRITICAL: the module's
   init must finish BEFORE the window gains the "open" class — several
   games start themselves via a MutationObserver on that class flip and
   would miss it if the class flipped before init attached the observer. */
const LAZY = {
  "win-maze":   { load: () => import("./apps/maze/maze.js"), then: m => m.initMaze(),   done:false, promise:null },
  "win-flappy": { load: () => import("./apps/flappy.js"),    then: m => m.initFlappy(), done:false, promise:null },
  "win-worm":   { load: () => import("./apps/worm.js"),      then: m => m.initWorm(),   done:false, promise:null },
  "win-defrag": { load: () => import("./apps/defrag.js"),    then: m => m.initDefrag(), done:false, promise:null },
  "win-scan":   { load: () => import("./apps/scan.js"),      then: m => m.initScan(),   done:false, promise:null },
  "win-vector": { load: () => import("./apps/vector.js"),    then: m => m.initVector(), done:false, promise:null },
  "win-oracle": { load: () => import("./apps/oracle.js"),    then: m => m.initOracle(), done:false, promise:null },
};

/* resolves once the app for `id` is imported + initialised; returns null when
   there's nothing to load (already done, or never lazy) so the caller opens
   synchronously. Idempotent: concurrent opens await the one in-flight import. */
function ensureApp(id){
  const e = LAZY[id];
  if (!e || e.done) return null;
  if (!e.promise){
    e.promise = e.load()
      .then(m => { e.then(m); e.done = true; })
      .catch(err => { e.promise = null; throw err; });   // let a later open retry
  }
  return e.promise;
}

/* body cursor hint while a lazy import is in flight (css: body[data-loading]) */
let loadingN = 0;
function loadStart(){ loadingN++; document.body.dataset.loading = "1"; }
function loadEnd(){ if (--loadingN <= 0){ loadingN = 0; delete document.body.dataset.loading; } }

/* callers don't await openWindow, so lazy apps open async but look sync from
   the outside: ensure the module is loaded + initialised, THEN open the window */
export function openWindow(id){
  const pending = ensureApp(id);
  if (!pending){ doOpenWindow(id); return; }   // nothing to load — open immediately
  loadStart();
  pending.then(() => doOpenWindow(id), () => {}).finally(loadEnd);
}

function doOpenWindow(id){
  const w = document.getElementById(id);
  if (!w) return;
  const wasOpen = w.classList.contains("open");
  w.classList.add("open");
  if (!wasOpen) autoPlace(w);
  if (!taskBtn(id)){
    const b = document.createElement("button");
    b.className = "tb-task"; b.dataset.win = id;
    b.textContent = w.dataset.title;
    b.addEventListener("click", () => {
      if (w.classList.contains("open") && w.classList.contains("focused")) minimize(w);
      else { w.classList.add("open"); focusWindow(w); }
    });
    tasks.appendChild(b);
  }
  focusWindow(w);
  if (!wasOpen) w.focus({ preventScroll: true });   // move keyboard focus into the dialog
  if (id === "win-calendar") renderCal();
}

export function closeWindow(w){
  w.classList.remove("open", "focused");
  const b = taskBtn(w.id);
  if (b) b.remove();
  paintTasks(); syncHash(); scheduleSave();
}

function minimize(w){
  w.classList.remove("open", "focused");
  paintTasks(); syncHash(); scheduleSave();
}

export function hideAllWindows(){
  $$(".window.open").forEach(minimize);
}

function toggleMax(w){
  if (w.classList.contains("maxed")){
    w.classList.remove("maxed");
    const p = JSON.parse(w.dataset.premax || "{}");
    for (const k of ["left","top","right","bottom","width","height"]) w.style[k] = p[k] || "";
  } else {
    const s = w.style;
    w.dataset.premax = JSON.stringify({ left:s.left, top:s.top, right:s.right, bottom:s.bottom, width:s.width, height:s.height });
    w.classList.add("maxed");
  }
  focusWindow(w);
}

function topWindow(){
  const open = $$(".window.open");
  if (!open.length) return null;
  return open.reduce((a, b) => (+a.style.zIndex || 0) >= (+b.style.zIndex || 0) ? a : b);
}

const safeParse = str => { try { return JSON.parse(str); } catch(e){ return null; } };

/* ---------- edge snapping (desktop only) ------------------- */
/* height of the workspace above the taskbar */
function workspaceH(){
  const tb = document.getElementById("taskbar");
  return innerHeight - (tb && !tb.hidden ? tb.offsetHeight : 0);
}
/* which snap zone (if any) the pointer is hovering */
function edgeZone(ev){
  const T = 12;
  if (ev.clientY <= T) return "top";       // top edge previews a maximise
  if (ev.clientX <= T) return "left";
  if (ev.clientX >= innerWidth - T) return "right";
  return null;
}
function showGhost(zone){
  if (!ghostEl) return;
  if (!zone){ hideGhost(); return; }
  const h = workspaceH(), half = Math.round(innerWidth / 2), g = ghostEl.style;
  g.top = "0px"; g.height = h + "px";
  if (zone === "left"){ g.left = "0px"; g.width = half + "px"; }
  else if (zone === "right"){ g.left = half + "px"; g.width = (innerWidth - half) + "px"; }
  else { g.left = "0px"; g.width = innerWidth + "px"; }   // top => full-width maximise
  ghostEl.classList.add("show");
}
function hideGhost(){ if (ghostEl) ghostEl.classList.remove("show"); }
/* restore a maxed/snapped window's floating size (position set by caller) */
function unsnap(w){
  if (w.classList.contains("maxed")){
    w.classList.remove("maxed");
    const p = safeParse(w.dataset.premax) || {};
    w.style.width = p.width || ""; w.style.height = p.height || "";
  } else if (w.classList.contains("snapped")){
    w.classList.remove("snapped");
    const p = safeParse(w.dataset.presnap) || {};
    w.style.width = p.width || ""; w.style.height = p.height || "";
  }
}
function applySnap(w, zone){
  if (zone === "top"){                       // top edge maximises via the usual path
    if (!w.classList.contains("maxed")) toggleMax(w);
    return;
  }
  const half = Math.round(innerWidth / 2), h = workspaceH();
  if (!w.classList.contains("snapped")){     // remember size before the first snap
    const s = w.style;
    w.dataset.presnap = JSON.stringify({ width:s.width, height:s.height });
  }
  w.classList.remove("maxed");
  w.style.left   = (zone === "right" ? half : 0) + "px";
  w.style.top    = "0px";
  w.style.width  = (zone === "right" ? innerWidth - half : half) + "px";
  w.style.height = h + "px";
  w.style.right  = "auto"; w.style.bottom = "auto";
  w.classList.add("snapped");
  focusWindow(w);
}

/* ---------- window switcher (Alt+`) ------------------------- */
function isTypingTarget(){
  const t = document.activeElement, tag = t && t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t && t.isContentEditable);
}
/* every window with a taskbar entry (open or minimised), highest z first */
function switcherWindows(){
  return $$(".tb-task")
    .map(b => document.getElementById(b.dataset.win))
    .filter(Boolean)
    .sort((a, b) => (+b.style.zIndex || 0) - (+a.style.zIndex || 0));
}
function renderSwitcher(){
  swEl.innerHTML = "";
  const title = document.createElement("div");
  title.className = "sw-title"; title.textContent = "WINDOWS";
  swEl.appendChild(title);
  swWins.forEach((w, i) => {
    const item = document.createElement("div");
    const min = !w.classList.contains("open");
    item.className = "sw-item" + (i === swIndex ? " sel" : "") + (min ? " min" : "");
    item.textContent = (min ? "_ " : "") + (w.dataset.title || w.id);
    swEl.appendChild(item);
  });
}
function openSwitcher(reverse){
  if (!swEl) return;
  if (!swOpen){
    swWins = switcherWindows();
    if (!swWins.length) return;              // nothing open — do nothing
    swIndex = swWins.length > 1 ? 1 : 0;     // alt-tab feel: pre-select the next window
    swOpen = true;
    swEl.classList.add("show");
  } else {
    const n = swWins.length;
    swIndex = (swIndex + (reverse ? -1 : 1) + n) % n;
  }
  renderSwitcher();
}
function closeSwitcher(){
  swOpen = false;
  if (swEl) swEl.classList.remove("show");
}
function commitSwitcher(){
  const w = swWins[swIndex];
  closeSwitcher();
  if (w) openWindow(w.id);                    // opens / un-minimises + focuses on top
}

/* ---------- session restore -------------------------------- */
/* keep a window's titlebar reachable on the current viewport */
function clampWindow(w){
  const r = w.getBoundingClientRect();
  if (r.left > innerWidth  - 80) w.style.left = Math.max(0, innerWidth  - 120) + "px";
  if (r.top  > innerHeight - 80) w.style.top  = Math.max(0, innerHeight - 120) + "px";
  if (r.left < 0) w.style.left = "0px";
  if (r.top  < 0) w.style.top  = "0px";
}
function scheduleSave(){
  if (restoring || isMobile()) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveSession, 300);
}
function saveSession(){
  if (isMobile()) return;
  const wins = $$(".tb-task").map(b => {
    const w = document.getElementById(b.dataset.win);
    if (!w) return null;
    const s = w.style;
    return {
      id: w.id,
      z: +s.zIndex || 0,
      min: !w.classList.contains("open"),
      maxed: w.classList.contains("maxed"),
      premax: w.dataset.premax ? safeParse(w.dataset.premax) : null,
      geom: { left:s.left, top:s.top, width:s.width, height:s.height },
    };
  }).filter(Boolean);
  const f = $(".window.focused");
  store.set("session", { wins, focused: f ? f.id : null });
}
function applyGeom(w, g){
  if (!g) return;
  for (const k of ["left","top","width","height"]) if (g[k]) w.style[k] = g[k];
  w.style.right = "auto"; w.style.bottom = "auto";
  clampWindow(w);
}
function applyRestore(saved){
  /* reopen in stacking order (lowest z first) so z-order is reproduced */
  const list = saved.wins.slice().sort((a, b) => (a.z || 0) - (b.z || 0));
  for (const s of list){
    const w = document.getElementById(s.id);
    if (!w) continue;
    openWindow(s.id);                          // creates taskbar entry, focuses, bumps z
    if (s.maxed){
      if (s.premax) w.dataset.premax = JSON.stringify(s.premax);
      w.classList.add("maxed");
    } else {
      w.classList.remove("maxed");
      applyGeom(w, s.geom);                     // overrides any autoPlace nudge
    }
    if (s.min) minimize(w);                     // keep the taskbar entry, drop "open"
  }
  if (saved.focused){
    const fw = document.getElementById(saved.focused);
    if (fw && fw.classList.contains("open")) focusWindow(fw);
  }
}
async function restoreSession(){
  if (isMobile()) return;                        // skip restore entirely on mobile
  const saved = store.get("session");            // snapshot before we start mutating
  restoring = true;                              // freeze saves while we rebuild
  try {
    /* pre-load any lazy windows this restore will reopen, so the openWindow
       calls below run synchronously — applyRestore's post-open geom / maxed /
       minimize steps assume the window is already open by the next line */
    const ids = new Set();
    if (initialDeepLink) ids.add(initialDeepLink.id);
    if (saved && Array.isArray(saved.wins)) for (const s of saved.wins) ids.add(s.id);
    await Promise.all([...ids].map(ensureApp).filter(Boolean));

    const hasSaved = saved && Array.isArray(saved.wins) && saved.wins.length;
    if (initialDeepLink){
      if (hasSaved) applyRestore(saved);
      openWindow(initialDeepLink.id);            // deep link ends up open + on top
    } else if (hasSaved){
      const aboutInSaved = saved.wins.some(x => x.id === "win-about");
      applyRestore(saved);
      if (!aboutInSaved){                        // quietly drop the win-about boot opened
        const about = document.getElementById("win-about");
        if (about && about.classList.contains("open")) closeWindow(about);
      }
    }
    // no saved session and no deep link -> leave boot's default (win-about) as is
  } finally {
    restoring = false;
    scheduleSave();                              // persist the reconstructed workspace
  }
}

export function initWindows(){
  /* overlays the manager owns: snap ghost + Alt+` switcher */
  ghostEl = document.createElement("div");
  ghostEl.id = "snap-ghost"; ghostEl.setAttribute("aria-hidden", "true");
  document.body.appendChild(ghostEl);
  swEl = document.createElement("div");
  swEl.id = "win-switcher"; swEl.setAttribute("aria-hidden", "true");
  document.body.appendChild(swEl);

  $$("[data-open]").forEach(btn => btn.addEventListener("click", () => openWindow(btn.dataset.open)));

  $$(".window").forEach(w => {
    w.setAttribute("tabindex", "-1");
    w.addEventListener("pointerdown", () => focusWindow(w));
    w.querySelector(".close").addEventListener("click", () => closeWindow(w));
    w.querySelector(".min").addEventListener("click", () => minimize(w));

    /* maximise button, injected so the markup stays lean */
    const mx = document.createElement("button");
    mx.className = "tb-btn max"; mx.textContent = "□";
    mx.setAttribute("aria-label", "Maximise");
    mx.addEventListener("click", () => toggleMax(w));
    w.querySelector(".close").before(mx);

    /* drag (desktop only) */
    const bar = w.querySelector(".titlebar");
    bar.addEventListener("dblclick", e => { if (!isMobile() && !e.target.closest(".tb-btn")) toggleMax(w); });
    bar.addEventListener("pointerdown", e => {
      if (isMobile() || e.target.closest(".tb-btn")) return;
      bar.setPointerCapture(e.pointerId);
      const startX = e.clientX, startY = e.clientY;
      let dragging = false, ox = 0, oy = 0, zone = null;

      const begin = ev => {
        /* a maxed/snapped window restores to a floating size first, re-centred
           under the cursor so the drag tracks naturally (standard OS feel) */
        if (w.classList.contains("maxed") || w.classList.contains("snapped")){
          const old = w.getBoundingClientRect();
          const fx = old.width ? (ev.clientX - old.left) / old.width : 0.5;
          unsnap(w);
          const nr = w.getBoundingClientRect();
          ox = Math.max(0, Math.min(nr.width, nr.width * fx));
          oy = 14;
        } else {
          const r = w.getBoundingClientRect();
          ox = ev.clientX - r.left; oy = ev.clientY - r.top;
        }
        dragging = true;
      };
      const move = ev => {
        if (!dragging){                       // a small threshold keeps clicks from restoring
          if (Math.abs(ev.clientX - startX) < 4 && Math.abs(ev.clientY - startY) < 4) return;
          begin(ev);
        }
        w.style.left = Math.max(0, Math.min(innerWidth - 80, ev.clientX - ox)) + "px";
        w.style.top  = Math.max(0, Math.min(innerHeight - 80, ev.clientY - oy)) + "px";
        w.style.right = "auto"; w.style.bottom = "auto";
        zone = edgeZone(ev);
        showGhost(zone);
      };
      const up = () => {
        bar.removeEventListener("pointermove", move); bar.removeEventListener("pointerup", up);
        hideGhost();
        if (dragging){ if (zone) applySnap(w, zone); scheduleSave(); }
      };
      bar.addEventListener("pointermove", move);
      bar.addEventListener("pointerup", up);
    });

    /* resize handle (desktop only) */
    const rh = document.createElement("div");
    rh.className = "win-resize"; rh.setAttribute("aria-hidden", "true");
    w.appendChild(rh);
    rh.addEventListener("pointerdown", e => {
      if (isMobile() || w.classList.contains("maxed")) return;
      e.preventDefault(); e.stopPropagation();
      focusWindow(w);
      w.classList.remove("snapped");           // a manual resize breaks the half-snap
      const r = w.getBoundingClientRect(), sx = e.clientX, sy = e.clientY, sw = r.width, sh = r.height;
      w.style.left = r.left + "px"; w.style.top = r.top + "px";
      w.style.right = "auto"; w.style.bottom = "auto";
      rh.setPointerCapture(e.pointerId);
      const move = ev => {
        w.style.width  = Math.max(260, Math.min(innerWidth  - r.left - 4, sw + ev.clientX - sx)) + "px";
        w.style.height = Math.max(160, Math.min(innerHeight - r.top  - 4, sh + ev.clientY - sy)) + "px";
      };
      const up = () => { rh.removeEventListener("pointermove", move); rh.removeEventListener("pointerup", up); scheduleSave(); };
      rh.addEventListener("pointermove", move);
      rh.addEventListener("pointerup", up);
    });
  });

  /* ESC closes the focused window (unless the maze or menu owns it) */
  addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (swOpen){ closeSwitcher(); return; }   // Escape cancels the switcher first
    if (document.getElementById("boot")) return;
    if (document.getElementById("maze-layer")?.classList.contains("on")) return;
    const menu = document.getElementById("start-menu");
    if (menu && !menu.hidden) return;      // the start menu handles its own ESC
    const top = topWindow();
    if (top) closeWindow(top);
  });

  /* keep dragged windows reachable when the browser resizes */
  addEventListener("resize", () => {
    if (isMobile()) return;
    $$(".window.open").forEach(w => {
      if (!w.style.left && !w.style.top) return;
      clampWindow(w);
    });
  });

  /* #hash deep links — typing or navigating a hash opens the window */
  addEventListener("hashchange", () => {
    const app = APPS[location.hash.slice(1).toLowerCase()];
    if (app) openWindow(app.id);
  });

  /* Alt+` window switcher — cycle open (incl. minimised) windows */
  addEventListener("keydown", e => {
    if (e.altKey && e.code === "Backquote"){
      if (document.getElementById("boot")) return;
      if (document.getElementById("maze-layer")?.classList.contains("on")) return;
      if (!swOpen && isTypingTarget()) return;
      e.preventDefault();
      openSwitcher(e.shiftKey);               // Shift reverses the direction
      return;
    }
    if (swOpen && e.key === "Enter"){ e.preventDefault(); commitSwitcher(); }
  });
  addEventListener("keyup", e => {
    if (swOpen && !e.altKey) commitSwitcher();  // releasing Alt commits the selection
  });

  /* session restore — boot keeps #desktop hidden until it finishes, so wait
     for the reveal, then rebuild the saved workspace exactly once */
  const desktop = document.getElementById("desktop");
  if (desktop && desktop.hidden){
    const obs = new MutationObserver(() => {
      if (!desktop.hidden){ obs.disconnect(); restoreSession(); }
    });
    obs.observe(desktop, { attributes:true, attributeFilter:["hidden"] });
  } else {
    restoreSession();
  }
}
