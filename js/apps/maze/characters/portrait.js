/* ============================================================
   MAZE.EXE — shared portrait ink
   Every character file drew with the same four module-globals
   (LINE / FILL / GLOW0 / GLOW1) and the same applyInk() that
   overwrites them from the level's palette. That scaffolding lived,
   copy-pasted, in all six files; it lives here now.

   These are exported as `let`, so importers get LIVE bindings:
   applyInk() (called at the top of every character's draw) mutates
   them here, and each character file — which only ever READS them —
   sees the update. Draws are synchronous and always re-apply the ink
   first, so one shared state is safe. characterInk (palette.js) is
   passed to every draw, so the defaults below are only ever the
   pre-first-draw placeholder.
   ============================================================ */
export let LINE = "#46ff8e", FILL = "#0c2b1a";
export let GLOW0 = "rgba(70,255,142,.20)", GLOW1 = "rgba(70,255,142,0)";

export function applyInk(ink){
  if (!ink) return;
  LINE = ink.line; FILL = ink.fill; GLOW0 = ink.glow0; GLOW1 = ink.glow1;
}
