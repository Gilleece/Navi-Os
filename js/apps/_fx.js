/* ============================================================
   NAVI-OS — shared arcade helpers
   A themed palette cache (re-reads only when the theme changes)
   and a one-shot WebAudio bleep, used by the games and toys.
   ============================================================ */
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

let ac = null;
export function actx(){
  if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
  if (ac.state === "suspended") ac.resume();
  return ac;
}
export function beep(freq, dur = .08, type = "square", vol = .18){
  try{
    const c = actx(), o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + .02);
  }catch(e){}
}
