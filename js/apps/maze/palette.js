/* ============================================================
   MAZE.EXE - level palette
   The maze is themed by depth. The look changes in bands as you
   descend:

     depth 1       : green only (the original)
     depth 1-5     : solid single neon, one per level
     depth 6-10    : depth gradient of 2 colours (near -> fog)
     depth 11-15   : depth gradient of 3 colours (near -> mid -> fog)
     depth 16-20   : SHIFT - eases between 2 colours, 5s each way
     depth 21-25   : TRANSITION - cycles through 3 colours
     depth 26-30   : FLICKER - stutters from one colour to the next,
                     like a bulb igniting
     depth 31+     : random - re-runs one of the first 30 looks

   The "solid" and "gradient" bands are static and baked at build
   time; the "shift / transition / flicker" bands are animated by the
   render loop (see animate() + liveScene()).

   How colour reaches the scene differs by band so each look is faithful:
   - Solid levels bake the neon straight into the wall/floor textures
     (double-tinted by the matching coloured light) exactly as before.
   - Every other band bakes its textures in neutral grey (texRgb white)
     so the colour comes entirely from the lights/fog/materials. That
     lets a single lamp+ambient+fog set paint a near->far gradient, and
     lets the animated bands recolour the whole maze each frame by just
     moving a handful of light/material colours.

   Dim hues (blue/pink/coral) are run through a brightness lift (see
   BRIGHTEN) so no level is too dark to read; the bright greens/golds
   are barely touched.
   ============================================================ */

/* colour wheel to draw level palettes from. The first five are the
   original solids in order, so depth 1 is still green, 2 blue, etc.
   The rest add variety for the gradient / animated bands. */
const WHEEL = [
  0x46ff8e,  // green   (original, depth 1)
  0x95B8FC,  // blue
  0xd61fff,  // pink
  0xff5a3c,  // coral
  0xf4d13a,  // gold
  0x2bf5d0,  // teal
  0xff7ad9,  // rose
  0x9d6bff,  // violet
  0xff9f1c,  // amber
  0x6bff4d,  // lime
];

const rgbOf = h => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const scale = ([r, g, b], f) => [r * f, g * f, b * f];
const mix   = (a, b, t) => [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t];
const clamp = ([r, g, b]) => [
  Math.max(0, Math.min(255, Math.round(r))),
  Math.max(0, Math.min(255, Math.round(g))),
  Math.max(0, Math.min(255, Math.round(b))),
];
const hexOf = ([r, g, b]) => (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);

/* hex int -> "#rrggbb" for the canvas texture code */
export const cssHex = h => "#" + (h >>> 0).toString(16).padStart(6, "0").slice(-6);

/* perceived luminance of an rgb triple, 0..1 (Rec.709 weights) */
const lumaOf = ([r, g, b]) => (0.2126*r + 0.7152*g + 0.0722*b) / 255;

/* Brightness lift. Dark hues (blue, pink, coral) read far dimmer than the
   bright greens/golds at the same nominal value. Applies a per-channel gamma
   whose strength scales with how dim the colour is: bright hues are left
   almost untouched, dim ones get pulled up. Raise BRIGHTEN for a stronger
   lift, set it to 0 to disable. */
const BRIGHTEN = 0.9;
function lift(rgb){
  const gamma = 1 + BRIGHTEN * (1 - lumaOf(rgb));      // dimmer colour -> stronger gamma
  const f = c => Math.round(255 * Math.pow(c / 255, 1 / gamma));
  return [f(rgb[0]), f(rgb[1]), f(rgb[2])];
}

/* push a colour away from its own grey, so pale neons (e.g. the blue) stay
   readable when they only reach the scene as light/fog rather than as a
   baked-in albedo. Used for the lights on the non-solid bands. */
function saturate(rgb, s = 1.5){
  const L = lumaOf(rgb) * 255;
  return [L + (rgb[0]-L)*s, L + (rgb[1]-L)*s, L + (rgb[2]-L)*s];
}

/* the wheel, brightened once up front */
const LIFTED = WHEEL.map(h => lift(rgbOf(h)));

export const THEME_COUNT = LIFTED.length;

/* tiny seeded PRNG (mulberry32). A level's palette is seeded from its
   depth, so a given depth always looks the same descent to descent.
   (Exported: environment.js seeds wall variants + graffiti the same way.) */
export function rng(seed){
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* n distinct wheel colours, chosen deterministically for this depth */
function pick(depth, n){
  const r = rng((depth * 0x9E3779B1) >>> 0);
  const avail = LIFTED.map((_, i) => i);
  const out = [];
  while (out.length < n && avail.length){
    const k = Math.floor(r() * avail.length);
    out.push(LIFTED[avail.splice(k, 1)[0]]);
  }
  return out;
}

/* the style + colour palette for a depth. Depth 31+ re-runs the look of
   one of the first 30 levels (chosen deterministically), so deep levels
   are "one of the previous variations". */
function styleFor(depth){
  if (depth >= 31){
    const src = 1 + Math.floor(rng((depth * 0x85EBCA77) >>> 0)() * 30);
    return styleFor(src);
  }
  if (depth <= 5)  return { kind: "solid",      colors: [LIFTED[(depth - 1) % LIFTED.length]] };
  if (depth <= 10) return { kind: "gradient2",  colors: pick(depth, 2) };
  if (depth <= 15) return { kind: "gradient3",  colors: pick(depth, 3) };
  if (depth <= 20) return { kind: "shift",      colors: pick(depth, 2) };
  if (depth <= 25) return { kind: "transition", colors: pick(depth, 3) };
  return                  { kind: "flicker",    colors: pick(depth, 2) };   // 26-30
}

const ANIMATED = new Set(["shift", "transition", "flicker"]);

/* theme for a maze depth (1-based). Returns three.js hex ints for the
   static build (textures, lights, fog) plus, on animated bands, an `anim`
   descriptor the render loop feeds to animate(). `rgb`/`neon` carry the
   level's representative colour (used for character ink). */
export function themeFor(depth){
  const st = styleFor(depth);
  const c  = st.colors;
  const near = c[0];
  const far  = c[c.length - 1];
  const mid  = c[(c.length - 1) >> 1];
  const neutral = st.kind !== "solid";          // non-solid bands bake grey textures

  // textures: coloured for solids (double-tinted, as before), grey otherwise
  const texRgb = neutral ? [255, 255, 255] : near;

  // On neutral levels the colour reaches the walls only through the lights, so
  // the lamp paints the near "pool" and the ambient is the room fill. For a
  // 2-colour gradient the fill is the second colour; for 3-colour it's the
  // middle one (the third shows as the dark, distant fog).
  let fill = near;
  if (st.kind === "gradient2") fill = far;
  else if (st.kind === "gradient3") fill = mid;

  // Distance stays dark (near-black) on every band, as before; only the
  // 3-colour gradient tints the far fog toward its last colour.
  const fogBase = st.kind === "gradient3" ? far : near;
  const fogF    = st.kind === "gradient3" ? 0.05 : 0.027;

  return {
    kind: st.kind,
    neutral,
    anim: ANIMATED.has(st.kind) ? { kind: st.kind, colors: c } : null,

    near, mid, far,
    rgb:  near,                 // representative colour (character ink etc.)
    neon: hexOf(near),          // lamp + window pane

    // texture maps (read by textures.js)
    texRgb,
    texBase: hexOf(scale(texRgb, 0.085)),   // wall brick fill
    texFog:  hexOf(scale(texRgb, 0.027)),   // floor base

    // scene lights / fog
    ambient:  hexOf(clamp(scale(neutral ? saturate(fill) : near, neutral ? 0.30 : 0.33))),
    sceneFog: hexOf(scale(fogBase, fogF)),
  };
}

/* ---- per-frame animation (shift / transition / flicker) -------------- */

const smooth = x => x * x * (3 - 2 * x);
const frac   = x => x - Math.floor(x);
/* stepped value noise, ~0..1, holds for short intervals for a blinky feel */
const noise  = x => frac(Math.sin(Math.floor(x) * 127.1) * 43758.5453);

/* a bulb that mostly sits steady on one colour, then every few seconds gives
   a short burst of a couple of flicks as it catches the next colour — like a
   tube re-striking. Deliberately calm: brief, low-frequency, and never to full
   black, to stay easy on photosensitive viewers. Returns { rgb, bright }. */
function flicker(cols, t){
  const hold  = 4.5;                     // steady seconds between bursts
  const burst = 0.4;                     // length of the flicker burst
  const n     = cols.length;
  const idx   = Math.floor(t / hold);
  const local = t - idx * hold;          // 0..hold within this stretch
  const cur   = cols[idx % n];           // colour for this stretch
  const prev  = cols[(idx - 1 + n) % n]; // the one we're leaving

  if (local > burst) return { rgb: cur, bright: 1 };   // steady the vast majority of the time

  // ignition: a couple of slow blinks between the old and new colour, then it
  // catches and holds on the new one.
  const f    = local / burst;            // 0..1 through the burst
  const gate = noise(t * 8);             // ~3 steps across the burst -> a couple of flicks
  const on   = gate < (0.3 + 0.7 * f);   // increasingly likely to settle "on" the new colour
  return {
    rgb:    on ? cur : prev,
    bright: on ? 0.85 + 0.4 * noise(t*8 + 2) : 0.3 + 0.25 * noise(t*8 + 5),
  };
}

/* current colour for an animated theme at time `t` seconds. Returns
   { rgb, bright }; bright is 1 except during flicker. */
export function animate(theme, t){
  const { kind, colors } = theme.anim;
  if (kind === "shift"){
    const u = 0.5 - 0.5 * Math.cos(2 * Math.PI * ((t % 10) / 10));  // 5s each way, eased
    return { rgb: mix(colors[0], colors[1], u), bright: 1 };
  }
  if (kind === "transition"){
    const x = (t % 15) / 5;                       // 3 segments, 5s each
    const i = Math.floor(x) % 3;
    return { rgb: mix(colors[i], colors[(i + 1) % 3], smooth(frac(x))), bright: 1 };
  }
  return flicker(colors, t);                      // flicker
}

/* map an animated { rgb, bright } onto the scene's live colours. The maze
   loop sets these on the lamp / ambient / fog / pane / cyber each frame. */
export function liveScene(rgb, bright){
  const c = clamp(rgb);
  const lit = Math.min(bright, 1);
  return {
    lamp:      hexOf(c),
    intensity: 1.5 * bright,
    ambient:   hexOf(clamp(scale(saturate(c), 0.30 * bright))),  // dim fill, dark distance
    fog:       hexOf(scale(c, 0.03)),                            // near-black, faintly tinted
    pane:      hexOf(scale(c, lit)),
    cyber:     hexOf(scale(c, lit)),
  };
}

/* Character ink for a level's theme. Every character is drawn in the level's
   representative neon — bright lines, a dark fill of the same hue, and a faint
   matching glow — so the whole scene reads in one colour, like an old
   single-phosphor monitor. The character art is handed this each draw. */
export function characterInk(theme){
  const [r, g, b] = clamp(theme.rgb);
  return {
    line:  cssHex(theme.neon),
    fill:  cssHex(hexOf(scale(theme.rgb, 0.15))),
    glow0: `rgba(${r},${g},${b},0.20)`,
    glow1: `rgba(${r},${g},${b},0)`,
  };
}
