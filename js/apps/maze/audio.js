/* ============================================================
   MAZE.EXE — procedural sound
   A tiny Web Audio synth for retro blips. No audio files: every sound
   is assembled from oscillators + a gain envelope at play time, so it
   costs nothing to ship and can be nudged a little on each play. Those
   nudges (base pitch, per-note detune, timing, level) are small enough
   that it reads as "the same effect" while never being bit-identical
   twice in a row.

   Everything routes through one `master` gain so a single mute toggle
   can silence the whole game. Alongside the coin pickup there are
   footsteps, a dialogue blip and a grand sting when the exit gate unlocks.

   initAudio() should be called from a user gesture (the launch click)
   so the browser lets the context start; the play* helpers are then
   safe to call any time, including inside a WebXR session.
   ============================================================ */

let ctx = null;
let master = null;              // everything connects here; mute drops it to 0
let musicBus = null;            // reserved for a future music source (its own volume slider)
let sfxBus = null;              // every play* helper -> master (its own volume slider)

/* device preferences (not part of a save): each its own localStorage key.
   Mute is a hard kill on `master` (silences music + SFX together); the three
   volumes are levels on their buses, persisted so they survive a reload. */
const MUTE_KEY = "maze-muted";
const VOL_MASTER_KEY = "maze-vol-master", VOL_MUSIC_KEY = "maze-vol-music", VOL_SFX_KEY = "maze-vol-sfx";
function readMuted(){ try { return globalThis.localStorage?.getItem(MUTE_KEY) === "1"; } catch { return false; } }
function readVol(key, dflt){
  try { const v = parseFloat(globalThis.localStorage?.getItem(key)); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : dflt; }
  catch { return dflt; }
}
function writePref(key, v){ try { globalThis.localStorage?.setItem(key, String(v)); } catch {} }
let muted     = readMuted();
let masterVol = readVol(VOL_MASTER_KEY, 1);
let musicVol  = readVol(VOL_MUSIC_KEY, 0.5);
let sfxVol    = readVol(VOL_SFX_KEY, 1);

/* master carries the mute AND the master-volume slider together */
function applyMasterGain(){ if (master) master.gain.value = muted ? 0 : masterVol; }

export function initAudio(){
  if (!ctx){
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : masterVol;
    master.connect(ctx.destination);
    // two buses under master: SFX (all the blips) and music (reserved). The
    // master mute still kills both; each has an independent volume slider.
    sfxBus = ctx.createGain();   sfxBus.gain.value = sfxVol;     sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = musicVol; musicBus.connect(master);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

/* --- mute toggle (M key + HUD icon; wired in maze.js) --- */
export function isMuted(){ return muted; }
export function toggleMute(){
  muted = !muted;
  writePref(MUTE_KEY, muted ? "1" : "0");
  applyMasterGain();
  return muted;
}

/* --- volume sliders (settings panel; persisted as device prefs) --- */
export function getMasterVolume(){ return masterVol; }
export function setMasterVolume(v){ masterVol = Math.max(0, Math.min(1, v)); writePref(VOL_MASTER_KEY, masterVol); applyMasterGain(); }
export function getMusicVolume(){ return musicVol; }
export function setMusicVolume(v){ musicVol = Math.max(0, Math.min(1, v)); writePref(VOL_MUSIC_KEY, musicVol); if (musicBus) musicBus.gain.value = musicVol; }
export function getSfxVolume(){ return sfxVol; }
export function setSfxVolume(v){ sfxVol = Math.max(0, Math.min(1, v)); writePref(VOL_SFX_KEY, sfxVol); if (sfxBus) sfxBus.gain.value = sfxVol; }

const rand  = (a, b) => a + Math.random() * (b - a);
const ratio = semitones => Math.pow(2, semitones / 12);

/* one enveloped oscillator note, scheduled relative to `t0`. */
function note(dest, t0, { freq, type = "square", start = 0, dur = 0.12,
                          gain = 0.2, attack = 0.005, glide = 0 }){
  const osc = ctx.createOscillator();
  const g   = ctx.createGain();
  const t   = t0 + start;
  osc.type  = type;
  osc.frequency.setValueAtTime(freq, t);
  if (glide) osc.frequency.exponentialRampToValueAtTime(freq * glide, t + dur);
  // tiny attack + exponential decay -> a clean chiptune "blip" with no clicks
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(dest);
  osc.start(t);
  osc.stop(t + dur + 0.03);
}

/* bright major-ish steps for the rising arpeggio (semitone offsets) */
const STEPS = [0, 4, 7, 12, 16];

/* coin-style pickup. Bigger denominations get a taller, longer, brighter
   arpeggio (with a little sparkle on the 5 LT). `value` is 1 / 3 / 5. */
export function playPickup(value = 1){
  const c = initAudio();
  if (!c) return;
  const t0 = c.currentTime;

  const out = c.createGain();
  out.gain.value = rand(0.28, 0.38);        // deliberately low; subtle level variation
  out.connect(sfxBus);

  const count = value >= 5 ? 4 : value >= 3 ? 3 : 2;
  const root  = (value >= 5 ? 660 : value >= 3 ? 550 : 440) * rand(0.985, 1.015); // pitch wobble
  const wave  = value >= 5 ? "square" : value >= 3 ? "square" : "triangle";
  const gap   = rand(0.045, 0.062);         // time between notes, jittered

  for (let i = 0; i < count; i++){
    note(out, t0, {
      freq:  root * ratio(STEPS[i]) * rand(0.997, 1.003),   // per-note detune
      type:  wave,
      start: i * gap + rand(-0.004, 0.004),                 // loose timing
      dur:   rand(0.09, 0.13),
      gain:  rand(0.16, 0.22),
      glide: i === count - 1 ? rand(1.0, 1.02) : 0,         // last note bends up a hair
    });
  }

  if (value >= 5){                          // an extra high sparkle for the gold crystal
    note(out, t0, { freq: root * ratio(19) * rand(0.99, 1.01), type: "square",
                    start: count * gap, dur: 0.16, gain: 0.12, glide: 1.03 });
  }
}

/* --- footsteps -----------------------------------------------------------
   A short filtered noise burst. The noise buffer is built once; each step
   varies playbackRate / cutoff / level so it never repeats exactly. */
let noiseBuf = null;
function noiseBuffer(c){
  if (noiseBuf) return noiseBuf;
  const len = Math.floor(c.sampleRate * 0.2);
  noiseBuf = c.createBuffer(1, len, c.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

export function playFootstep(){
  const c = initAudio();
  if (!c) return;
  const t = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  src.playbackRate.value = rand(0.8, 1.2);
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = rand(650, 1100);
  const g = c.createGain();
  const dur = rand(0.06, 0.10);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(rand(0.09, 0.16), t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(lp).connect(g).connect(sfxBus);
  src.start(t);
  src.stop(t + dur + 0.02);
}

/* --- dialogue blip: one short note per line/choice shown ---
   A low, lowpass-filtered synth blip that bends slightly DOWN — warm,
   quiet and consistent, with a little filter resonance and a detuned
   second layer for a cyberpunk edge. (Replaces the old bright ~600 Hz
   square chirp, which sat too high and jittered over a wide range.) */
export function playDialogueBlip(){
  const c = initAudio();
  if (!c) return;
  const t = c.currentTime;
  const out = c.createGain();
  out.gain.value = 0.45;                 // quieter than the old 0.7
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 850;              // tame the harsh top end
  lp.Q.value = 5;                        // a touch of resonance = synthy
  lp.connect(out);
  out.connect(sfxBus);

  const base = 220 * rand(0.99, 1.01);   // low, and barely any pitch variation
  note(lp, t, { freq: base,          type: "square",   dur: 0.07, gain: 0.032, glide: 0.88 });
  note(lp, t, { freq: base * 1.015,  type: "sawtooth", dur: 0.06, gain: 0.02,  glide: 0.88 });
}

/* --- gate unlock: a longer rising arpeggio, grander than a 5 LT pickup,
   with a low swell underneath. The game's biggest moment. --- */
export function playGateUnlock(){
  const c = initAudio();
  if (!c) return;
  const t0 = c.currentTime;
  const out = c.createGain();
  out.gain.value = 0.9;
  out.connect(sfxBus);

  const root = 330 * rand(0.99, 1.01);
  const steps = [0, 4, 7, 12, 16, 19, 24];
  steps.forEach((s, i) => {
    note(out, t0, {
      freq: root * ratio(s) * rand(0.998, 1.002),
      type: i % 2 ? "square" : "triangle",
      start: i * 0.095 + rand(-0.005, 0.005),
      dur: 0.5, gain: 0.13, attack: 0.012,
      glide: i === steps.length - 1 ? 1.01 : 0,
    });
  });
  note(out, t0, { freq: 110, type: "sawtooth", start: 0, dur: 1.5, gain: 0.09, attack: 0.06 });
}

/* ---------- music bus (reserved) ----------------------------------------
   The procedural drone that used to live here was removed. The `music`
   GainNode + its volume slider (setMusicVolume) are kept in place: to add
   music later, route your source (an <audio> element via
   createMediaElementSource, a decoded buffer, or oscillators) into
   `musicBus`, and the master mute + the SETTINGS "MUSIC VOLUME" slider will
   control it for free. Nothing feeds `musicBus` for now. */

