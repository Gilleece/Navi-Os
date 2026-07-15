/* ============================================================
   MAZE.EXE — pause menu + settings
   A desktop/touch modal that freezes the world (maze.js reads
   M.pauseOpen, exactly like M.dialogueOpen / M.journalOpen) while
   the player takes a breath. Two views:
     MAIN     — RESUME · SETTINGS · EXIT PROTOCOL
     SETTINGS — look sensitivity, master/music/SFX volume, render
                quality; everything persisted as device prefs.
   ESC toggles it (player.js), and a ⏸ button in #maze-ui gives
   touch players the same door. VR is untouched: it has snap-turn
   and its own trigger flows, so the menu is `!M.inVR`-gated at
   every entry point and never opens in immersive-vr.
   ============================================================ */
import { $ } from "../../utils.js";
import { getMasterVolume, setMasterVolume, getMusicVolume, setMusicVolume,
         getSfxVolume, setSfxVolume } from "./audio.js";

/* device prefs (not part of a save), following audio.js's MUTE_KEY pattern */
const SENS_KEY = "maze-sens", QUALITY_KEY = "maze-quality";
function readPref(key, dflt){ try { return globalThis.localStorage?.getItem(key) ?? dflt; } catch { return dflt; } }
function writePref(key, v){ try { globalThis.localStorage?.setItem(key, String(v)); } catch {} }
function readNum(key, dflt){ const v = parseFloat(readPref(key, "")); return Number.isFinite(v) ? v : dflt; }

let M = null;
let onExit = null;
let root = null, mainView = null, settingsView = null;

/* render-quality select -> setPixelRatio. "device" tracks the display (capped
   at 2), the two below trade sharpness for frame rate. antialias is fixed at
   context creation, so this is the only live quality knob (see maze.js). */
function pixelRatioFor(q){
  if (q === "low") return 0.75;
  if (q === "med") return 1;
  return Math.min(devicePixelRatio || 1, 2);
}
export function applyQuality(q){
  if (!M || !M.renderer) return;
  M.renderer.setPixelRatio(pixelRatioFor(q));
  if (typeof innerWidth === "number") M.renderer.setSize(innerWidth, innerHeight);
}

/* ---------- build (once) ---------- */
export function buildPause(state, opts = {}){
  M = state;
  onExit = opts.onExit || null;

  // apply stored prefs before the first level builds (buildPause is called in
  // the launchMaze init block, ahead of startRun)
  M.sens = readNum(SENS_KEY, 1);
  applyQuality(readPref(QUALITY_KEY, "device"));

  ensureDOM();
}

function ensureDOM(){
  if (root) return;
  const layer = $("#maze-layer");
  root = document.createElement("div");
  root.id = "maze-pause";

  // --- MAIN view ---
  mainView = document.createElement("div");
  mainView.className = "pause-panel";
  mainView.innerHTML = `<div class="pause-title">PAUSED</div>`;
  const resume = mkButton("RESUME", closePause);
  const settings = mkButton("SETTINGS", () => showView("settings"));
  const exit = mkButton("EXIT PROTOCOL", () => { closePause(); if (onExit) onExit(); });
  exit.classList.add("danger");
  mainView.append(resume, settings, exit);

  // --- SETTINGS view ---
  settingsView = document.createElement("div");
  settingsView.className = "pause-panel";
  settingsView.hidden = true;
  settingsView.innerHTML = `<div class="pause-title">SETTINGS</div>`;

  settingsView.appendChild(mkSlider("LOOK SENSITIVITY", 0.2, 3, 0.1,
    () => M.sens ?? 1,
    v => { M.sens = v; writePref(SENS_KEY, v); },
    v => `${v.toFixed(1)}×`));
  settingsView.appendChild(mkSlider("MASTER VOLUME", 0, 1, 0.01,
    getMasterVolume, setMasterVolume, pct));
  settingsView.appendChild(mkSlider("MUSIC VOLUME", 0, 1, 0.01,
    getMusicVolume, setMusicVolume, pct));
  settingsView.appendChild(mkSlider("SFX VOLUME", 0, 1, 0.01,
    getSfxVolume, setSfxVolume, pct));
  settingsView.appendChild(mkQuality());
  settingsView.appendChild(mkButton("BACK", () => showView("main")));

  root.append(mainView, settingsView);
  layer.appendChild(root);
}

const pct = v => `${Math.round(v * 100)}%`;

function mkButton(label, onClick){
  const b = document.createElement("button");
  b.className = "pause-btn";
  b.textContent = label;
  b.addEventListener("click", onClick);
  return b;
}

function mkSlider(label, min, max, step, get, set, fmt){
  const row = document.createElement("label");
  row.className = "pause-row";
  const name = document.createElement("span"); name.className = "pause-label"; name.textContent = label;
  const val = document.createElement("span"); val.className = "pause-val";
  const input = document.createElement("input");
  input.type = "range"; input.min = min; input.max = max; input.step = step;
  const sync = () => { const v = parseFloat(input.value); val.textContent = fmt(v); };
  input.addEventListener("input", () => { const v = parseFloat(input.value); set(v); val.textContent = fmt(v); });
  row._refresh = () => { input.value = get(); sync(); };
  row.append(name, input, val);
  return row;
}

function mkQuality(){
  const row = document.createElement("label");
  row.className = "pause-row";
  const name = document.createElement("span"); name.className = "pause-label"; name.textContent = "RENDER QUALITY";
  const sel = document.createElement("select");
  sel.className = "pause-select";
  for (const [v, t] of [["low", "0.75×"], ["med", "1×"], ["device", "DEVICE"]]){
    const o = document.createElement("option"); o.value = v; o.textContent = t; sel.appendChild(o);
  }
  sel.addEventListener("change", () => { writePref(QUALITY_KEY, sel.value); applyQuality(sel.value); });
  row._refresh = () => { sel.value = readPref(QUALITY_KEY, "device"); };
  const spacer = document.createElement("span"); spacer.className = "pause-val";
  row.append(name, sel, spacer);
  return row;
}

function showView(which){
  mainView.hidden = which !== "main";
  settingsView.hidden = which !== "settings";
  if (which === "settings")
    for (const row of settingsView.querySelectorAll(".pause-row")) row._refresh && row._refresh();
}

/* ---------- open / close ---------- */
export function isPauseOpen(){ return !!(M && M.pauseOpen); }
export function togglePause(){ M && M.pauseOpen ? closePause() : openPause(); }

export function openPause(){
  if (!M || M.inVR || M.dialogueOpen || M.journalOpen) return;
  ensureDOM();
  M.pauseOpen = true;
  M.keys = {};                      // drop held movement keys
  try { document.exitPointerLock && document.exitPointerLock(); } catch {}
  showView("main");
  root.classList.add("on");
}

export function closePause(){
  if (!M) return;
  M.pauseOpen = false;
  if (root) root.classList.remove("on");
}
