/* ============================================================
   NAVI-OS — TRACKER.EXE
   A tiny WebAudio step sequencer: eight pentatonic voices over a
   kick / snare / hat drum kit, 16 steps. Square-wave bleeps, a
   look-ahead scheduler for tight timing. Playback halts when the
   window closes. Patterns live in session memory only.
   Patterns can be shared as #tracker=<code> links and bounced
   to a 16-bit WAV rendered offline through the same voice code.
   ============================================================ */
import { $ } from "../utils.js";
import { actx, bus } from "./_fx.js";
import { store } from "../store.js";
import { openWindow } from "../windows.js";
import { notify } from "../notify.js";

const STEPS = 16;
const ROWS = [
  { name:"E5", type:"tone", f:659.25 },
  { name:"D5", type:"tone", f:587.33 },
  { name:"C5", type:"tone", f:523.25 },
  { name:"A4", type:"tone", f:440.00 },
  { name:"G4", type:"tone", f:392.00 },
  { name:"E4", type:"tone", f:329.63 },
  { name:"D4", type:"tone", f:293.66 },
  { name:"C4", type:"tone", f:261.63 },
  { name:"HAT", type:"hat",   drum:true },
  { name:"SNR", type:"snare", drum:true },
  { name:"KCK", type:"kick",  drum:true },
];
const TONE_ROWS = ROWS.filter(r => !r.drum).length;   // 8

const grid = ROWS.map(() => new Array(STEPS).fill(false));
let bpm = 120;

/* selectable notes: chromatic scale, C3 .. B5 --------------------- */
const NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const NOTES = [];
for (let m = 48; m <= 83; m++)   // MIDI note numbers
  NOTES.push({ name: NOTE_NAMES[m % 12] + (Math.floor(m / 12) - 1), f: 440 * Math.pow(2, (m - 69) / 12) });

/* audio — rides the shared OS bus so the taskbar mute applies --- */
let ac = null, master = null, noiseBuf = null;
function makeNoise(c){
  const n = c.sampleRate * 0.5, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
function audio(){
  if (!ac){
    ac = actx();
    master = ac.createGain(); master.gain.value = .26; master.connect(bus());
    noiseBuf = makeNoise(ac);
  }
  return ac;
}
/* voices take an explicit (context, destination, …, time) so the live
   scheduler and the offline WAV render share one code path */
function tone(c, dest, f, t){
  const o = c.createOscillator(), g = c.createGain();
  o.type = "square"; o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.5, t + .006);
  g.gain.exponentialRampToValueAtTime(.001, t + .28);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + .3);
}
function kick(c, dest, t){
  const o = c.createOscillator(), g = c.createGain();
  o.type = "sine"; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(50, t + .12);
  g.gain.setValueAtTime(.9, t); g.gain.exponentialRampToValueAtTime(.001, t + .16);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + .18);
}
function noise(c, dest, buf, t, dur, hp, vol){
  const s = c.createBufferSource(); s.buffer = buf;
  const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp;
  const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  s.connect(f); f.connect(g); g.connect(dest); s.start(t); s.stop(t + dur + .02);
}
function snare(c, dest, buf, t){
  noise(c, dest, buf, t, .18, 1400, .5);
  const o = c.createOscillator(), g = c.createGain();
  o.type = "triangle"; o.frequency.setValueAtTime(180, t);
  g.gain.setValueAtTime(.3, t); g.gain.exponentialRampToValueAtTime(.001, t + .14);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + .16);
}
function trigger(c, dest, buf, row, t){
  const r = ROWS[row];
  if (r.type === "tone") tone(c, dest, r.f, t);
  else if (r.type === "kick") kick(c, dest, t);
  else if (r.type === "snare") snare(c, dest, buf, t);
  else if (r.type === "hat") noise(c, dest, buf, t, .04, 7000, .6);
}

/* ---------- shareable pattern links -------------------------------
   Format: a leading version char + base64url of a byte blob.
   'A' layout (31 bytes): [0] bpm, [1..8] the 8 tone-row note indices,
   [9..30] the 11x16 grid bit-packed (row-major, LSB-first).           */
const SHARE_VER = "A";
const SHARE_BYTES = 1 + TONE_ROWS + Math.ceil((ROWS.length * STEPS) / 8);   // 1 + 8 + 22 = 31

function b64urlEnc(bytes){
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDec(str){
  let s = str.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function decodePattern(code){
  try{
    if (!code || code[0] !== SHARE_VER) return null;
    const rest = code.slice(1);
    if (rest.length > 4096) return null;              // oversized — bail, don't churn
    const bytes = b64urlDec(rest);
    if (bytes.length < SHARE_BYTES) return null;      // malformed / truncated
    const bpmv = bytes[0], notes = [];
    for (let ri = 0; ri < TONE_ROWS; ri++){ const n = bytes[1 + ri]; notes[ri] = (n < NOTES.length) ? n : null; }
    const g = ROWS.map(() => new Array(STEPS).fill(false));
    const base = 1 + TONE_ROWS; let bit = 0;
    for (let r = 0; r < ROWS.length; r++)
      for (let s = 0; s < STEPS; s++){ g[r][s] = !!(bytes[base + (bit >> 3)] & (1 << (bit & 7))); bit++; }
    return { bpm: (bpmv >= 60 && bpmv <= 200) ? bpmv : 120, grid: g, notes };
  }catch(e){ return null; }
}

/* ---------- WAV helpers (pure) ------------------------------------ */
function bufferToWav(buffer){
  const nc = buffer.numberOfChannels, sr = buffer.sampleRate, frames = buffer.length;
  const blockAlign = nc * 2, dataSize = frames * blockAlign;
  const ab = new ArrayBuffer(44 + dataSize), view = new DataView(ab);
  let p = 0;
  const str = s => { for (let i = 0; i < s.length; i++) view.setUint8(p++, s.charCodeAt(i)); };
  const u32 = v => { view.setUint32(p, v, true); p += 4; };
  const u16 = v => { view.setUint16(p, v, true); p += 2; };
  str("RIFF"); u32(36 + dataSize); str("WAVE");
  str("fmt "); u32(16); u16(1); u16(nc); u32(sr); u32(sr * blockAlign); u16(blockAlign); u16(16);
  str("data"); u32(dataSize);
  const chans = [];
  for (let ch = 0; ch < nc; ch++) chans.push(buffer.getChannelData(ch));
  for (let i = 0; i < frames; i++)
    for (let ch = 0; ch < nc; ch++){
      let x = Math.max(-1, Math.min(1, chans[ch][i]));
      view.setInt16(p, x < 0 ? x * 0x8000 : x * 0x7fff, true); p += 2;
    }
  return new Blob([ab], { type: "audio/wav" });
}
function downloadBlob(blob, name){
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- clipboard (with execCommand fallback) ----------------- */
function copyText(text){
  const ok = () => notify("TRACKER.EXE", "share link copied — paste it anywhere");
  const fallback = () => {
    try{
      const ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", "");
      ta.style.position = "fixed"; ta.style.left = "-9999px";
      document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); ta.remove(); ok();
    }catch(e){ notify("TRACKER.EXE", "couldn't copy — link is in the address bar"); }
  };
  try{
    if (navigator.clipboard && navigator.clipboard.writeText)
      navigator.clipboard.writeText(text).then(ok, fallback);
    else fallback();
  }catch(e){ fallback(); }
}

/* ---------- wait for the desktop before opening a window ---------- */
function whenDesktopReady(cb){
  const desk = document.getElementById("desktop");
  const ready = () => desk && !desk.hidden && !document.getElementById("boot");
  if (ready()){ cb(); return; }
  const obs = new MutationObserver(() => { if (ready()){ obs.disconnect(); cb(); } });
  obs.observe(desk || document.body, { attributes: true, attributeFilter: ["hidden"] });
}

export function initTracker(){
  const win = $("#win-tracker"), host = $("#tracker-grid");
  if (!win || !host) return;

  /* build the grid --------------------------------------------- */
  const cells = ROWS.map(() => new Array(STEPS));
  const sels = {};                       // ri -> note <select> (tone rows)
  host.innerHTML = "";
  ROWS.forEach((r, ri) => {
    const row = document.createElement("div");
    row.className = "trk-row" + (r.drum ? " drum" : "");
    let lab;
    if (r.drum){
      lab = document.createElement("span"); lab.className = "trk-lab"; lab.textContent = r.name;
    } else {
      // tone rows get a note picker so the user can choose the pitch
      lab = document.createElement("select"); lab.className = "trk-lab trk-note"; lab.title = "Choose note";
      NOTES.forEach((n, i) => {
        const o = document.createElement("option"); o.value = i; o.textContent = n.name; lab.appendChild(o);
      });
      lab.value = Math.max(0, NOTES.findIndex(n => n.name === r.name));
      lab.addEventListener("change", () => { const n = NOTES[+lab.value]; r.f = n.f; r.name = n.name; savePattern(); });
      sels[ri] = lab;
    }
    row.appendChild(lab);
    for (let s = 0; s < STEPS; s++){
      const b = document.createElement("button");
      b.className = "trk-cell"; b.dataset.r = ri; b.dataset.s = s;
      cells[ri][s] = b; row.appendChild(b);
    }
    host.appendChild(row);
  });

  function paint(){ ROWS.forEach((_, ri) => { for (let s = 0; s < STEPS; s++) cells[ri][s].classList.toggle("on", grid[ri][s]); }); }

  /* the pattern survives reloads */
  function savePattern(){
    store.set("tracker", {
      bpm,
      grid: grid.map(r => r.map(v => v ? 1 : 0)),
      notes: ROWS.map((r, ri) => r.drum ? null : +sels[ri].value),
    });
  }

  /* apply a decoded pattern (shared link or saved store) into the UI.
     Never persists — a shared link only sticks once the user edits. */
  function applyPattern(p){
    if (Array.isArray(p.grid))
      p.grid.forEach((r, ri) => { if (grid[ri] && Array.isArray(r)) r.forEach((v, s) => { if (s < STEPS) grid[ri][s] = !!v; }); });
    (p.notes || []).forEach((n, ri) => {
      if (n === null || n === undefined || !sels[ri] || !NOTES[n]) return;
      sels[ri].value = n; ROWS[ri].f = NOTES[n].f; ROWS[ri].name = NOTES[n].name;
    });
    if (p.bpm) bpm = p.bpm;
  }

  /* serialise the current state into a share code */
  function encodePattern(){
    const bytes = new Uint8Array(SHARE_BYTES);
    bytes[0] = Math.max(0, Math.min(255, bpm | 0));
    for (let ri = 0; ri < TONE_ROWS; ri++) bytes[1 + ri] = sels[ri] ? (+sels[ri].value & 0xff) : 0;
    const base = 1 + TONE_ROWS; let bit = 0;
    for (let r = 0; r < ROWS.length; r++)
      for (let s = 0; s < STEPS; s++){ if (grid[r][s]) bytes[base + (bit >> 3)] |= (1 << (bit & 7)); bit++; }
    return SHARE_VER + b64urlEnc(bytes);
  }

  // toggle + drag-paint
  let painting = false, paintVal = true;
  host.addEventListener("pointerdown", e => {
    const b = e.target.closest(".trk-cell"); if (!b) return;
    e.preventDefault();
    const ri = +b.dataset.r, s = +b.dataset.s;
    paintVal = !grid[ri][s]; grid[ri][s] = paintVal; b.classList.toggle("on", paintVal);
    painting = true;
  });
  host.addEventListener("pointerover", e => {
    if (!painting) return;
    const b = e.target.closest(".trk-cell"); if (!b) return;
    const ri = +b.dataset.r, s = +b.dataset.s;
    if (grid[ri][s] !== paintVal){ grid[ri][s] = paintVal; b.classList.toggle("on", paintVal); }
  });
  window.addEventListener("pointerup", () => { if (painting){ painting = false; savePattern(); } });

  /* scheduler --------------------------------------------------- */
  let playing = false, curStep = 0, nextTime = 0, lookTimer = 0, playhead = -1;
  const drawQ = [];
  const stepDur = () => (60 / bpm) / 4;   // sixteenth notes

  function schedule(){
    while (nextTime < ac.currentTime + 0.12){
      for (let r = 0; r < ROWS.length; r++) if (grid[r][curStep]) trigger(ac, master, noiseBuf, r, nextTime);
      drawQ.push({ step: curStep, time: nextTime });
      nextTime += stepDur();
      curStep = (curStep + 1) % STEPS;
    }
    lookTimer = setTimeout(schedule, 25);
  }
  function setHead(s){
    if (s === playhead) return;
    if (playhead >= 0) for (let r = 0; r < ROWS.length; r++) cells[r][playhead].classList.remove("play");
    playhead = s;
    if (s >= 0) for (let r = 0; r < ROWS.length; r++) cells[r][s].classList.add("play");
  }
  function vis(){
    if (!playing) return;
    let s = -1;
    while (drawQ.length && drawQ[0].time <= ac.currentTime) s = drawQ.shift().step;
    if (s >= 0) setHead(s);
    requestAnimationFrame(vis);
  }

  const btn = $("#trk-play");
  function play(){
    audio(); if (ac.state === "suspended") ac.resume();
    playing = true; curStep = 0; nextTime = ac.currentTime + .06; drawQ.length = 0;
    schedule(); requestAnimationFrame(vis);
    btn.textContent = "[ STOP ]"; btn.classList.add("on");
  }
  function stop(){
    playing = false; clearTimeout(lookTimer); drawQ.length = 0; setHead(-1);
    btn.textContent = "[ PLAY ]"; btn.classList.remove("on");
  }
  btn.addEventListener("click", () => playing ? stop() : play());

  $("#trk-clear").addEventListener("click", () => { grid.forEach(r => r.fill(false)); paint(); savePattern(); });
  $("#trk-rand").addEventListener("click", () => {
    grid.forEach((r, ri) => {
      const t = ROWS[ri].type;
      for (let s = 0; s < STEPS; s++){
        if (t === "kick")  r[s] = (s % 8 === 0) || Math.random() < .12;
        else if (t === "snare") r[s] = (s % 8 === 4);
        else if (t === "hat")   r[s] = (s % 2 === 0);
        else r[s] = Math.random() < .13;
      }
    });
    paint(); savePattern();
  });

  const bpmOut = $("#trk-bpm-val");
  function setBpm(v){ bpm = Math.max(60, Math.min(200, v)); bpmOut.textContent = bpm; }
  $("#trk-bpm-dn").addEventListener("click", () => { setBpm(bpm - 5); savePattern(); });
  $("#trk-bpm-up").addEventListener("click", () => { setBpm(bpm + 5); savePattern(); });

  /* share + WAV buttons — injected so they inherit toolbar styling -- */
  const toolbar = win.querySelector(".trk-toolbar");
  const bpmSpan = toolbar ? toolbar.querySelector(".trk-bpm") : null;
  const mkBtn = (id, label) => { const b = document.createElement("button"); b.id = id; b.textContent = label; return b; };

  const shareBtn = mkBtn("trk-share", "SHARE");
  shareBtn.addEventListener("click", () => {
    const url = location.origin + location.pathname + "#tracker=" + encodePattern();
    copyText(url);
  });

  const wavBtn = mkBtn("trk-wav", "WAV");
  function renderWav(){
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const sr = 44100, dur = stepDur(), totalSteps = STEPS * 2, tail = 0.35;
    const frames = Math.max(1, Math.ceil((totalSteps * dur + tail) * sr));
    const off = new OAC(1, frames, sr);
    const m = off.createGain(); m.gain.value = .26; m.connect(off.destination);   // same master level as live
    const buf = makeNoise(off);
    for (let step = 0; step < totalSteps; step++){
      const t = step * dur, gs = step % STEPS;
      for (let r = 0; r < ROWS.length; r++) if (grid[r][gs]) trigger(off, m, buf, r, t);
    }
    return off.startRendering();
  }
  wavBtn.addEventListener("click", async () => {
    if (wavBtn.disabled) return;
    wavBtn.disabled = true;
    try{
      const rendered = await renderWav();
      downloadBlob(bufferToWav(rendered), "navi-pattern.wav");
      notify("TRACKER.EXE", "bounced navi-pattern.wav — 2 loops");
    }catch(e){ notify("TRACKER.EXE", "wav export failed"); }
    finally{ wavBtn.disabled = false; }
  });

  if (toolbar){
    if (bpmSpan){ toolbar.insertBefore(shareBtn, bpmSpan); toolbar.insertBefore(wavBtn, bpmSpan); }
    else { toolbar.appendChild(shareBtn); toolbar.appendChild(wavBtn); }
  }

  /* pattern source: a shared link beats the local save, but the save
     is only overwritten once the visitor edits something themselves */
  const shared = location.hash.indexOf("#tracker=") === 0
    ? decodePattern(location.hash.slice("#tracker=".length))
    : null;

  if (shared){
    applyPattern(shared);
  } else {
    // restore the saved pattern, or lay down a starter groove
    const saved = store.get("tracker");
    if (saved && Array.isArray(saved.grid)){
      applyPattern(saved);
    } else {
      const beat = { KCK:[0,8], SNR:[4,12], HAT:[0,2,4,6,8,10,12,14], G4:[2,10], C5:[6], E5:[14] };
      ROWS.forEach((r, ri) => (beat[r.name] || []).forEach(s => grid[ri][s] = true));
    }
  }
  paint(); setBpm(bpm);

  const sync = () => { if (!win.classList.contains("open") && playing) stop(); };
  new MutationObserver(sync).observe(win, { attributes:true, attributeFilter:["class"] });

  /* a shared link opens the tracker once the desktop is up, then
     normalises the hash to "#tracker" for the window-manager router */
  if (shared){
    whenDesktopReady(() => {
      openWindow("win-tracker");
      history.replaceState(null, "", location.pathname + location.search + "#tracker");
    });
  }
}
