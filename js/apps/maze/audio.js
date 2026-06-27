/* ============================================================
   MAZE.EXE — procedural sound
   A tiny Web Audio synth for retro blips. No audio files: every sound
   is assembled from oscillators + a gain envelope at play time, so it
   costs nothing to ship and can be nudged a little on each play. Those
   nudges (base pitch, per-note detune, timing, level) are small enough
   that it reads as "the same effect" while never being bit-identical
   twice in a row.

   initAudio() should be called from a user gesture (the launch click)
   so the browser lets the context start; playPickup() is then safe to
   call any time, including inside a WebXR session.
   ============================================================ */

let ctx = null;

export function initAudio(){
  if (!ctx){
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

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
  out.gain.value = rand(0.7, 0.9);          // subtle overall-level variation
  out.connect(c.destination);

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
