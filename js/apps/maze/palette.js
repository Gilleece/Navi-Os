/* ============================================================
   MAZE.EXE - level palette
   The maze is themed a single neon colour per level. Level 1 is the
   original green; each descent picks the next colour, wrapping after
   ten so level 11 is green again, level 21 green, and so on.

   Only the bright "neon" is chosen by hand. The darker shades the world
   needs (wall base, fog, ambient, ceiling) are scaled down from it, so
   every level stays a consistent family and level 1 lands on the same
   greens the maze always used.
   ============================================================ */

/* ten neons around the wheel, green first. No pure black or white. */
const NEONS = [
  0x46ff8e,  // 1  green   (original)
  0x2bffd1,  // 2  aqua
  0x26c9ff,  // 3  cyan
  0x5b8cff,  // 4  blue
  0x9d6bff,  // 5  violet
  0xff5ad8,  // 6  magenta
  0xff5f8d,  // 7  rose
  0xff5a3c,  // 8  coral
  0xff9e2c,  // 9  amber
  0xf4d13a,  // 10 gold
];

export const THEME_COUNT = NEONS.length;

const rgbOf = h => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const scale = ([r, g, b], f) => [Math.round(r * f), Math.round(g * f), Math.round(b * f)];
const hexOf = ([r, g, b]) => (r << 16) | (g << 8) | b;

/* hex int -> "#rrggbb" for the canvas texture code */
export const cssHex = h => "#" + (h >>> 0).toString(16).padStart(6, "0").slice(-6);

/* theme for a maze depth (1-based). Returns three.js hex ints plus the
   neon's rgb triple, handy for building rgba() strings in textures. */
export function themeFor(depth){
  const i = ((depth - 1) % THEME_COUNT + THEME_COUNT) % THEME_COUNT;
  const neon = NEONS[i];
  const rgb = rgbOf(neon);
  return {
    neon, rgb,
    base:    hexOf(scale(rgb, 0.085)),   // wall brick fill
    fog:     hexOf(scale(rgb, 0.027)),   // fog / floor void
    ambient: hexOf(scale(rgb, 0.33)),    // ambient fill light
    ceil:    hexOf(scale(rgb, 0.06)),    // ceiling
  };
}
