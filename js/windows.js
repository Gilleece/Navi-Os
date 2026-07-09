/* ============================================================
   NAVI-OS — window manager
   open / close / focus / drag / resize / maximise / taskbar,
   plus the program registry and #hash deep links (#projects
   opens PROJECTS, and the address bar follows the focused
   window so any view can be shared as a URL).
   ============================================================ */
import { $, $$, isMobile } from "./utils.js";
import { renderCal } from "./apps/calendar.js";

/* program registry — the one place that knows every window.
   Used by the taskbar, TERM.EXE, the start menu and hash links. */
export const APPS = {
  about:    { id:"win-about",    label:"ABOUT.SYS",   group:"system" },
  projects: { id:"win-projects", label:"PROJECTS",    group:"system" },
  calendar: { id:"win-calendar", label:"CALENDAR",    group:"system" },
  notepad:  { id:"win-notepad",  label:"NOTEPAD",     group:"system" },
  calc:     { id:"win-calc",     label:"CALC.EXE",    group:"system" },
  term:     { id:"win-term",     label:"TERM.EXE",    group:"system" },
  sysmon:   { id:"win-sysmon",   label:"SYSMON",      group:"system" },
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

export function openWindow(id){
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
  paintTasks(); syncHash();
}

function minimize(w){
  w.classList.remove("open", "focused");
  paintTasks(); syncHash();
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

export function initWindows(){
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
      if (isMobile() || w.classList.contains("maxed") || e.target.closest(".tb-btn")) return;
      const r = w.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top;
      bar.setPointerCapture(e.pointerId);
      const move = ev => {
        w.style.left = Math.max(0, Math.min(innerWidth - 80, ev.clientX - ox)) + "px";
        w.style.top  = Math.max(0, Math.min(innerHeight - 80, ev.clientY - oy)) + "px";
        w.style.right = "auto"; w.style.bottom = "auto";
      };
      const up = () => { bar.removeEventListener("pointermove", move); bar.removeEventListener("pointerup", up); };
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
      const r = w.getBoundingClientRect(), sx = e.clientX, sy = e.clientY, sw = r.width, sh = r.height;
      w.style.left = r.left + "px"; w.style.top = r.top + "px";
      w.style.right = "auto"; w.style.bottom = "auto";
      rh.setPointerCapture(e.pointerId);
      const move = ev => {
        w.style.width  = Math.max(260, Math.min(innerWidth  - r.left - 4, sw + ev.clientX - sx)) + "px";
        w.style.height = Math.max(160, Math.min(innerHeight - r.top  - 4, sh + ev.clientY - sy)) + "px";
      };
      const up = () => { rh.removeEventListener("pointermove", move); rh.removeEventListener("pointerup", up); };
      rh.addEventListener("pointermove", move);
      rh.addEventListener("pointerup", up);
    });
  });

  /* ESC closes the focused window (unless the maze or menu owns it) */
  addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
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
      const r = w.getBoundingClientRect();
      if (r.left > innerWidth - 80)  w.style.left = Math.max(0, innerWidth - 120) + "px";
      if (r.top  > innerHeight - 80) w.style.top  = Math.max(0, innerHeight - 120) + "px";
    });
  });

  /* #hash deep links — typing or navigating a hash opens the window */
  addEventListener("hashchange", () => {
    const app = APPS[location.hash.slice(1).toLowerCase()];
    if (app) openWindow(app.id);
  });
}
