/* ============================================================
   MAZE.EXE - level palette
   The maze is themed a single neon colour per level. Level 1 is the
   original green; each descent picks the next colour, wrapping after
   ten so level 11 is green again, level 21 green, and so on.

   Only the bright "neon" is chosen by hand. The darker shades the world
   needs (wall base, fog, ambient, ceiling) are scaled down from it, so
   every level stays a consistent family. Each chosen neon is first run
   through a brightness lift (see BRIGHTEN) that pulls dim hues up toward the
   bright ones, so blue/pink/coral levels aren't too dark to see; the already
   bright greens are barely touched.
   ============================================================ */

/* ten neons around the wheel, green first. No pure black or white. */
const NEONS = [
  0x46ff8e,  // 1  green   (original)
  0x95B8FC,  // 2  blue
  0xd61fff,  // 3  pink
  0xff5a3c,  // 4  coral
  0xf4d13a,  // 5  gold
];

export const THEME_COUNT = NEONS.length;

const rgbOf = h => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const scale = ([r, g, b], f) => [Math.round(r * f), Math.round(g * f), Math.round(b * f)];
const hexOf = ([r, g, b]) => (r << 16) | (g << 8) | b;

/* hex int -> "#rrggbb" for the canvas texture code */
export const cssHex = h => "#" + (h >>> 0).toString(16).padStart(6, "0").slice(-6);

/* perceived luminance of an rgb triple, 0..1 (Rec.709 weights) */
const lumaOf = ([r, g, b]) => (0.2126*r + 0.7152*g + 0.0722*b) / 255;

/* Brightness lift. Dark hues (blue, pink, coral) read far dimmer than the
   bright greens/golds at the same nominal value — the whole level is tinted
   from this colour, so a dim hue makes a dim, hard-to-see maze. This applies a
   per-channel gamma whose strength scales with how dim the colour is: bright
   hues are left almost untouched, dim ones get pulled up. Raise BRIGHTEN for a
   stronger lift, set it to 0 to disable. */
const BRIGHTEN = 0.55;
function lift(rgb){
  const gamma = 1 + BRIGHTEN * (1 - lumaOf(rgb));      // dimmer colour -> stronger gamma
  const f = c => Math.round(255 * Math.pow(c / 255, 1 / gamma));
  return [f(rgb[0]), f(rgb[1]), f(rgb[2])];
}

/* theme for a maze depth (1-based). Returns three.js hex ints plus the
   neon's rgb triple, handy for building rgba() strings in textures. */
export function themeFor(depth){
  const i = ((depth - 1) % THEME_COUNT + THEME_COUNT) % THEME_COUNT;
  const rgb = lift(rgbOf(NEONS[i]));   // brighten dim hues so every level stays readable
  const neon = hexOf(rgb);
  return {
    neon, rgb,
    base:    hexOf(scale(rgb, 0.085)),   // wall brick fill
    fog:     hexOf(scale(rgb, 0.027)),   // fog / floor void
    ambient: hexOf(scale(rgb, 0.33)),    // ambient fill light
    ceil:    hexOf(scale(rgb, 0.06)),    // ceiling
  };
}

/* Character ink for a level's theme. Every character is drawn in the level's
   single neon — bright lines, a dark fill of the same hue, and a faint
   matching glow — so the whole scene reads in one colour, like an old
   single-phosphor monitor. The character art is handed this each draw. */
export function characterInk(theme){
  const [r, g, b] = theme.rgb;
  return {
    line:  cssHex(theme.neon),
    fill:  cssHex(hexOf(scale(theme.rgb, 0.15))),
    glow0: `rgba(${r},${g},${b},0.20)`,
    glow1: `rgba(${r},${g},${b},0)`,
  };
}
