/* ============================================================
   NAVI-OS — CONFIG.SYS
   Persistent operator preferences: theme, CRT effects level,
   reduce motion, master volume, clock format, ambient
   transmissions, and a factory reset. Everything applies to the
   live OS the moment it changes, and every setting is re-applied
   on boot independent of whether this window is ever opened.
   ============================================================ */
import { $, $$ } from "../utils.js";
import { store } from "../store.js";
import { setTheme, THEMES } from "../theme.js";
import { setVolume, getVolume } from "./_fx.js";

const CRT_LEVELS = ["off", "low", "full"];
const crtLevel = () => { const v = store.get("crt", "full"); return CRT_LEVELS.includes(v) ? v : "full"; };
const reduceMotionOn = () => store.get("reduce-motion", false) === true;
const clock24On = () => store.get("clock24", true) !== false;
const ambientOn = () => store.get("ambient", true) !== false;

function applyCrt(level){
  document.body.classList.remove("crt-off", "crt-low");
  if (level === "off") document.body.classList.add("crt-off");
  else if (level === "low") document.body.classList.add("crt-low");
}
function applyReduceMotion(on){
  document.body.classList.toggle("reduce-motion", !!on);
}

/* highlight the button in a data-v group matching the current value */
function paintOpts(wrapId, current){
  $$(`#${wrapId} button`).forEach(b => b.classList.toggle("on", b.dataset.v === current));
}

export function initSettings(){
  /* ---- apply persisted state immediately, regardless of the window ---- */
  applyCrt(crtLevel());
  applyReduceMotion(reduceMotionOn());

  const win = document.getElementById("win-settings");
  if (!win) return;

  /* ---- DISPLAY: theme picker (one button per theme) ---- */
  const themeWrap = $("#set-theme");
  if (themeWrap){
    for (const name of Object.keys(THEMES)){
      const b = document.createElement("button");
      b.type = "button"; b.dataset.v = name; b.textContent = name.toUpperCase();
      b.addEventListener("click", () => { setTheme(name); paintTheme(); });
      themeWrap.appendChild(b);
    }
  }
  const paintTheme = () => paintOpts("set-theme", document.documentElement.dataset.theme || "atlas");

  /* ---- DISPLAY: CRT effects level ---- */
  const paintCrt = () => paintOpts("set-crt", crtLevel());
  $("#set-crt")?.addEventListener("click", e => {
    const b = e.target.closest("button[data-v]");
    if (!b) return;
    store.set("crt", b.dataset.v);
    applyCrt(b.dataset.v);
    paintCrt();
  });

  /* ---- MOTION: reduce motion toggle ---- */
  const paintMotion = () => paintOpts("set-motion", reduceMotionOn() ? "on" : "off");
  $("#set-motion")?.addEventListener("click", e => {
    const b = e.target.closest("button[data-v]");
    if (!b) return;
    const on = b.dataset.v === "on";
    store.set("reduce-motion", on);
    applyReduceMotion(on);
    paintMotion();
  });

  /* ---- SOUND: master volume ---- */
  const vol = $("#set-vol"), volVal = $("#set-vol-val");
  const paintVol = () => {
    const v = getVolume();
    if (vol) vol.value = v;
    if (volVal) volVal.textContent = v;
  };
  vol?.addEventListener("input", () => {
    setVolume(+vol.value);
    if (volVal) volVal.textContent = vol.value;
  });

  /* ---- CLOCK: 24h / 12h ---- */
  const paintClock = () => paintOpts("set-clock", clock24On() ? "24" : "12");
  $("#set-clock")?.addEventListener("click", e => {
    const b = e.target.closest("button[data-v]");
    if (!b) return;
    store.set("clock24", b.dataset.v === "24");
    paintClock();
  });

  /* ---- AMBIENT: transmissions toggle ---- */
  const paintAmbient = () => paintOpts("set-ambient", ambientOn() ? "on" : "off");
  $("#set-ambient")?.addEventListener("click", e => {
    const b = e.target.closest("button[data-v]");
    if (!b) return;
    store.set("ambient", b.dataset.v === "on");
    paintAmbient();
  });

  /* ---- DANGER: factory reset ---- */
  $("#set-reset")?.addEventListener("click", () => {
    if (!confirm("erase all local NAVI-OS data and reload? this cannot be undone.")) return;
    for (const k of Object.keys(localStorage)) if (k.startsWith("navi-")) localStorage.removeItem(k);
    location.reload();
  });

  /* first paint + repaint whenever the window opens, so changes made
     elsewhere (e.g. `theme` in TERM.EXE, the start menu swatches) show */
  const paintAll = () => { paintTheme(); paintCrt(); paintMotion(); paintVol(); paintClock(); paintAmbient(); };
  paintAll();
  new MutationObserver(() => { if (win.classList.contains("open")) paintAll(); })
    .observe(win, { attributes: true, attributeFilter: ["class"] });
}
