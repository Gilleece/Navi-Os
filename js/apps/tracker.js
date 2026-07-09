/* ============================================================
   NAVI-OS — TRACKER.EXE
   A tiny WebAudio step sequencer: eight pentatonic voices over a
   kick / snare / hat drum kit, 16 steps. Square-wave bleeps, a
   look-ahead scheduler for tight timing. Playback halts when the
   window closes. Patterns live in session memory only.
   ============================================================ */
import { $ } from "../utils.js";
import { actx, bus } from "./_fx.js";
import { store } from "../store.js";

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

const grid = ROWS.map(() => new Array(STEPS).fill(false));
let bpm = 120;

/* selectable notes: chromatic scale, C3 .. B5 --------------------- */
const NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const NOTES = [];
for (let m = 48; m <= 83; m++)   // MIDI note numbers
  NOTES.push({ name: NOTE_NAMES[m % 12] + (Math.floor(m / 12) - 1), f: 440 * Math.pow(2, (m - 69) / 12) });

/* audio — rides the shared OS bus so the taskbar mute applies --- */
let ac = null, master = null, noiseBuf = null;
function audio(){
  if (!ac){
    ac = actx();
    master = ac.createGain(); master.gain.value = .26; master.connect(bus());
    const n = ac.sampleRate * 0.5, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    noiseBuf = b;
  }
  return ac;
}
function tone(f, t){
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = "square"; o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.5, t + .006);
  g.gain.exponentialRampToValueAtTime(.001, t + .28);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + .3);
}
function kick(t){
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = "sine"; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(50, t + .12);
  g.gain.setValueAtTime(.9, t); g.gain.exponentialRampToValueAtTime(.001, t + .16);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + .18);
}
function noise(t, dur, hp, vol){
  const s = ac.createBufferSource(); s.buffer = noiseBuf;
  const f = ac.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp;
  const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + .02);
}
function snare(t){
  noise(t, .18, 1400, .5);
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = "triangle"; o.frequency.setValueAtTime(180, t);
  g.gain.setValueAtTime(.3, t); g.gain.exponentialRampToValueAtTime(.001, t + .14);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + .16);
}
function trigger(row, t){
  const r = ROWS[row];
  if (r.type === "tone") tone(r.f, t);
  else if (r.type === "kick") kick(t);
  else if (r.type === "snare") snare(t);
  else if (r.type === "hat") noise(t, .04, 7000, .6);
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
      for (let r = 0; r < ROWS.length; r++) if (grid[r][curStep]) trigger(r, nextTime);
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

  // restore the saved pattern, or lay down a starter groove
  const saved = store.get("tracker");
  if (saved && Array.isArray(saved.grid)){
    saved.grid.forEach((r, ri) => { if (grid[ri]) r.forEach((v, s) => { if (s < STEPS) grid[ri][s] = !!v; }); });
    (saved.notes || []).forEach((n, ri) => {
      if (n === null || n === undefined || !sels[ri] || !NOTES[n]) return;
      sels[ri].value = n; ROWS[ri].f = NOTES[n].f; ROWS[ri].name = NOTES[n].name;
    });
    if (saved.bpm) bpm = saved.bpm;
  } else {
    const beat = { KCK:[0,8], SNR:[4,12], HAT:[0,2,4,6,8,10,12,14], G4:[2,10], C5:[6], E5:[14] };
    ROWS.forEach((r, ri) => (beat[r.name] || []).forEach(s => grid[ri][s] = true));
  }
  paint(); setBpm(bpm);

  const sync = () => { if (!win.classList.contains("open") && playing) stop(); };
  new MutationObserver(sync).observe(win, { attributes:true, attributeFilter:["class"] });
}
