/* ============================================================
   NAVI-OS — MERITS.SYS: passive achievement tracking
   Watches window opens, the maze, the shell, the filesystem and
   the kernel for milestones, and surfaces them as a taskbar
   counter + overlay panel. Everything here is observational —
   it listens to DOM/state changes other apps already make and
   never reaches into their logic.
   ============================================================ */
import { $$ } from "./utils.js";
import { store } from "./store.js";
import { notify } from "./notify.js";
import { beep } from "./apps/_fx.js";
import { APPS } from "./windows.js";

/* the merit roster — id, short name, full description (shown once
   unlocked) and a vague hint (shown while locked). */
const MERITS = [
  { id:"jack_in",             name:"jacked in",               desc:"opened a session in the wired for the first time.",     hint:"close the loop. begin." },
  { id:"full_clearance",      name:"full clearance",          desc:"opened every system program at least once.",            hint:"there are more doors than you've tried." },
  { id:"arcade_rat",          name:"arcade rat",              desc:"opened every game in the arcade.",                      hint:"the games wing has more rooms." },
  { id:"deeper_in",           name:"deeper in",               desc:"entered the maze.",                                     hint:"somewhere below the desktop, a maze waits." },
  { id:"matrix_call",         name:"the matrix has you",      desc:"ran matrix in the shell.",                              hint:"some commands aren't in any manual." },
  { id:"ring_zero",           name:"ring 0",                  desc:"triggered a kernel panic.",                             hint:"vital processes resent being killed." },
  { id:"layer_under_layer",   name:"the layer under the layer", desc:"read the hidden .secret file.",                       hint:"some files are hidden, not gone." },
  { id:"old_code",            name:"old code",                desc:"entered the konami code.",                             hint:"a thirty-year-old cheat still works somewhere." },
  { id:"graveyard_shift",     name:"graveyard shift",         desc:"visited between 02:00 and 04:59, local.",              hint:"the wired feels different at this hour." },
  { id:"transmission_sent",   name:"transmission sent",       desc:"posted a message to the BBS.",                          hint:"the board is listening. say something." },
];
const BY_ID = {};
for (const m of MERITS) BY_ID[m.id] = m;

/* ---------- state -------------------------------------------- */
function loadState(){
  const s = store.get("merits", null);
  if (s && s.unlocked && s.seen) return s;
  return { unlocked:{}, seen:{} };
}
const state = loadState();
function persist(){ store.set("merits", state); }

let btn = null, panel = null, list = null;

function unlock(id){
  if (!BY_ID[id] || state.unlocked[id]) return;
  state.unlocked[id] = new Date().toISOString();
  persist();
  notify("MERITS.SYS", "merit unlocked — " + BY_ID[id].name);
  beep(880, .07, "square", .16);
  setTimeout(() => beep(1320, .09, "square", .14), 90);
  paintButton();
  paintPanel();
}

function markSeen(appName){
  if (state.seen[appName]) return;
  state.seen[appName] = true;
  persist();
}

/* group-completion merits derive their required set from APPS at
   check time rather than a hardcoded id list. */
function checkGroupComplete(group, id){
  if (state.unlocked[id]) return;
  const required = Object.entries(APPS).filter(([, a]) => a.group === group).map(([name]) => name);
  if (required.length && required.every(name => state.seen[name])) unlock(id);
}
function checkGroups(){
  checkGroupComplete("system", "full_clearance");
  checkGroupComplete("games", "arcade_rat");
}

/* ---------- taskbar button + panel ---------------------------- */
function paintButton(){
  if (!btn) return;
  const n = Object.keys(state.unlocked).length;
  btn.textContent = `MRT ${n}/${MERITS.length}`;
}

function paintPanel(){
  if (!list) return;
  list.textContent = "";
  for (const m of MERITS){
    const ts = state.unlocked[m.id];
    const row = document.createElement("div");
    row.className = "mrt-item" + (ts ? " unlocked" : " locked");
    const name = document.createElement("div");
    name.className = "mrt-name"; name.textContent = ts ? m.name : "???";
    const desc = document.createElement("div");
    desc.className = "mrt-desc"; desc.textContent = ts ? m.desc : m.hint;
    row.append(name, desc);
    if (ts){
      const date = document.createElement("div");
      date.className = "mrt-date"; date.textContent = new Date(ts).toLocaleString();
      row.append(date);
    }
    list.appendChild(row);
  }
}

function buildUI(){
  const taskbar = document.getElementById("taskbar");
  const mute = document.getElementById("tb-mute");
  if (!taskbar || !mute) return;

  btn = document.createElement("button");
  btn.id = "tb-merits";
  btn.setAttribute("aria-label", "Achievements");
  btn.setAttribute("aria-haspopup", "true");
  btn.setAttribute("aria-expanded", "false");
  mute.before(btn);
  paintButton();

  panel = document.createElement("div");
  panel.id = "merits-panel";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Achievements");
  const title = document.createElement("div");
  title.className = "mrt-title"; title.textContent = "MERITS.SYS";
  list = document.createElement("div");
  list.className = "mrt-list";
  panel.append(title, list);
  document.body.appendChild(panel);
  paintPanel();

  function openPanel(){ paintPanel(); panel.hidden = false; btn.setAttribute("aria-expanded", "true"); }
  function closePanel(){ panel.hidden = true; btn.setAttribute("aria-expanded", "false"); }
  btn.addEventListener("click", () => panel.hidden ? openPanel() : closePanel());
  addEventListener("keydown", e => { if (e.key === "Escape" && !panel.hidden) closePanel(); });
  addEventListener("pointerdown", e => {
    if (!panel.hidden && !e.target.closest("#merits-panel") && !e.target.closest("#tb-merits")) closePanel();
  });
}

/* ---------- detection hooks ------------------------------------ */

/* (a) every window's "open" class, mapped back to its APPS name */
function watchWindows(){
  const nameById = {};
  for (const [name, app] of Object.entries(APPS)) nameById[app.id] = name;
  $$(".window").forEach(w => {
    const appName = nameById[w.id];
    if (!appName) return;
    const obs = new MutationObserver(() => {
      if (!w.classList.contains("open")) return;
      markSeen(appName);
      checkGroups();
    });
    obs.observe(w, { attributes:true, attributeFilter:["class"] });
  });
}

/* (b) the maze overlay's "on" class */
function watchMaze(){
  const layer = document.getElementById("maze-layer");
  if (!layer) return;
  const obs = new MutationObserver(() => {
    if (layer.classList.contains("on")) unlock("deeper_in");
  });
  obs.observe(layer, { attributes:true, attributeFilter:["class"] });
}

/* (c) the shell's matrix command */
function watchMatrix(){
  addEventListener("navi-matrix", () => unlock("matrix_call"));
}

/* (d) konami code, inert during boot or while typing */
function watchKonami(){
  const seq = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
  let idx = 0;
  addEventListener("keydown", e => {
    if (document.getElementById("boot")) return;
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === seq[idx]){
      idx += 1;
      if (idx === seq.length){ unlock("old_code"); idx = 0; }
    } else {
      idx = key === seq[0] ? 1 : 0;
    }
  });
}

/* (e) night-owl visit, checked once at init */
function checkNightVisit(){
  const h = new Date().getHours();
  if (h >= 2 && h < 5) unlock("graveyard_shift");
}

/* (f) BBS post — capture-phase listeners on document so the check
   runs before BBS.SYS's own handlers clear the textarea */
function watchBBS(){
  document.addEventListener("click", e => {
    if (!e.target.closest || !e.target.closest("#bbs-post")) return;
    const msg = document.getElementById("bbs-msg");
    if (msg && msg.value.trim()) unlock("transmission_sent");
  }, true);
  document.addEventListener("keydown", e => {
    if (e.key !== "Enter" || !(e.ctrlKey || e.metaKey)) return;
    const msg = e.target.closest && e.target.closest("#bbs-msg");
    if (msg && msg.value.trim()) unlock("transmission_sent");
  }, true);
}

/* (g) kernel panic — js/system.js dispatches "navi-panic" */
function watchPanic(){
  addEventListener("navi-panic", () => unlock("ring_zero"));
}

/* (h) the hidden .secret file — js/fs.js dispatches "navi-secret-read" */
function watchSecret(){
  addEventListener("navi-secret-read", () => unlock("layer_under_layer"));
}

/* jack in — the boot screen (#boot) is removed once, on first entry */
function watchJackIn(){
  if (!document.getElementById("boot")){ unlock("jack_in"); return; }
  const obs = new MutationObserver(() => {
    if (!document.getElementById("boot")){ unlock("jack_in"); obs.disconnect(); }
  });
  obs.observe(document.body, { childList:true });
}

export function initAchievements(){
  buildUI();
  watchJackIn();
  watchWindows();
  watchMaze();
  watchMatrix();
  watchKonami();
  watchBBS();
  watchPanic();
  watchSecret();
  checkNightVisit();
  checkGroups();   // covers a returning operator whose prior sessions already satisfied a group
}
