/* ============================================================
   NAVI-OS — shared arcade helpers
   A themed palette cache (re-reads only when the theme changes),
   a one-shot WebAudio bleep, and the OS master audio bus: every
   program's sound routes through bus() so the taskbar SND toggle
   mutes the whole machine. Mute state persists across visits.
   ============================================================ */
import { store } from "../store.js";

let _t = "", _p = {};
export function pal(){
  const t = document.documentElement.dataset.theme || "atlas";
  if (t !== _t){
    const cs = getComputedStyle(document.documentElement), g = k => cs.getPropertyValue(k).trim();
    _p = { green:g("--green")||"#46ff8e", dim:g("--green-dim")||"#1f7a4a",
           ink:g("--green-ink")||"#0c2b1a", orange:g("--orange")||"#ff7a1a",
           red:g("--red")||"#ff3b3b", bg:g("--bg")||"#04080a", panel:g("--panel")||"#08120f" };
    _t = t;
  }
  return _p;
}

/* ---------- master audio bus -------------------------------- */
let ac = null, master = null;
let muted = store.get("muted", false) === true;
let vol = clampVol(store.get("vol", 100));

function clampVol(v){
  v = Number(v);
  return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 100;
}
/* mute and volume are separate multipliers on the one gain node —
   muting never clobbers the saved volume, and vice versa */
function applyGain(){
  if (master) master.gain.value = muted ? 0 : vol / 100;
}

export function actx(){
  if (!ac){
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain();
    applyGain();
    master.connect(ac.destination);
  }
  if (ac.state === "suspended") ac.resume();
  return ac;
}
/* the shared output node — connect here instead of ac.destination */
export function bus(){ actx(); return master; }

export function isMuted(){ return muted; }
export function setMuted(m){
  muted = !!m;
  store.set("muted", muted);
  applyGain();
}

export function getVolume(){ return vol; }
export function setVolume(v){
  vol = clampVol(v);
  store.set("vol", vol);
  applyGain();
}

export function beep(freq, dur = .08, type = "square", vol = .18){
  try{
    const c = actx(), o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .02);
  }catch(e){}
}
