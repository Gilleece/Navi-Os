/* ============================================================
   MAZE.EXE - procedural textures
   Canvas-generated wall + floor maps, returned as three textures.
   Each reads the level's *texture* colour (theme.texRgb / texBase /
   texFog — see palette.js): on solid levels these are the neon itself,
   on every other band they are neutral grey so the colour is supplied
   later by the lights/fog/materials and can ramp or animate.

   Walls come in four variants (environment.js picks one per wall,
   seeded, so a level always looks the same descent to descent):
     brickTexture    the original mortar-and-brick
     panelTexture    riveted plates with neon circuit traces
     glyphTexture    vent slats below a column of dead glyphs
     crackedTexture  brick that is losing the fight — cracks and
                     missing blocks with the wired glowing through
   plus graffitiTexture: the scrawls previous users left behind
   (transparent decal, content picked by story.graffitiPool).
   ============================================================ */
import { cssHex } from "./palette.js";

/* age + depth pass, laid over every wall variant: a fake ambient-
   occlusion gradient at the floor and ceiling junctions plus a dusting
   of grime speckle. Cheap, but it stops the walls reading as flat
   wallpaper — corners feel like corners. Walls repeat vertically
   exactly once, so the gradient always lands at the real junctions. */
function agedOverlay(g){
  const ao = g.createLinearGradient(0, 0, 0, 256);
  ao.addColorStop(0.00, "rgba(0,0,0,.38)");
  ao.addColorStop(0.16, "rgba(0,0,0,0)");
  ao.addColorStop(0.82, "rgba(0,0,0,0)");
  ao.addColorStop(1.00, "rgba(0,0,0,.45)");
  g.fillStyle = ao; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 70; i++){
    const s = 1 + Math.random() * 3;
    g.fillStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.12})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, s, s);
  }
}

/* the brick pattern, shared by brickTexture and crackedTexture */
function paintBricks(g, theme){
  const [nr, ng, nb] = theme.texRgb;
  g.fillStyle = cssHex(theme.texBase); g.fillRect(0,0,256,256);
  const bw = 64, bh = 32;
  for (let y = 0; y < 256/bh; y++){
    const off = (y % 2) * bw/2;
    for (let x = -1; x < 256/bw + 1; x++){
      const f = 0.09 + Math.random()*0.06;            // dark tint of the neon, jittered per brick
      g.fillStyle = `rgb(${nr*f|0},${ng*f|0},${nb*f|0})`;
      g.fillRect(x*bw + off + 2, y*bh + 2, bw - 4, bh - 4);
    }
  }
  g.strokeStyle = `rgba(${nr},${ng},${nb},.16)`;        // glowing grout lines
  for (let y = 0; y <= 256; y += bh){ g.beginPath(); g.moveTo(0,y); g.lineTo(256,y); g.stroke(); }
}

function canvasTexture(three, paint){
  const c = document.createElement("canvas"); c.width = c.height = 256;
  paint(c.getContext("2d"));
  const t = new three.CanvasTexture(c);
  t.wrapS = t.wrapT = three.RepeatWrapping;
  return t;
}

export function brickTexture(three, theme){
  return canvasTexture(three, g => { paintBricks(g, theme); agedOverlay(g); });
}

/* riveted panel plates with a couple of live circuit traces */
export function panelTexture(three, theme){
  const [nr, ng, nb] = theme.texRgb;
  return canvasTexture(three, g => {
    g.fillStyle = cssHex(theme.texBase); g.fillRect(0,0,256,256);
    const P = 128;                                     // plate size (2×2 plates)
    for (let py = 0; py < 256; py += P)
      for (let px = 0; px < 256; px += P){
        const f = 0.07 + Math.random()*0.04;           // plate face, slightly uneven
        g.fillStyle = `rgb(${nr*f|0},${ng*f|0},${nb*f|0})`;
        g.fillRect(px + 3, py + 3, P - 6, P - 6);
        g.strokeStyle = `rgba(${nr},${ng},${nb},.18)`; g.lineWidth = 2;  // seam
        g.strokeRect(px + 3, py + 3, P - 6, P - 6);
        g.fillStyle = `rgba(${nr},${ng},${nb},.3)`;    // corner rivets
        for (const [rx, ry] of [[12,12],[P-12,12],[12,P-12],[P-12,P-12]]){
          g.beginPath(); g.arc(px + rx, py + ry, 3, 0, Math.PI*2); g.fill();
        }
      }
    // circuit traces: right-angled runs ending in a chip and an LED
    g.lineWidth = 3; g.lineCap = "square";
    for (let i = 0; i < 3; i++){
      let x = 20 + Math.random()*60, y = 30 + Math.random()*196;
      g.strokeStyle = `rgba(${nr},${ng},${nb},.45)`;
      g.beginPath(); g.moveTo(x, y);
      for (let s = 0; s < 3; s++){
        if (Math.random() < 0.5) x += 40 + Math.random()*60;
        else y += (Math.random() < 0.5 ? -1 : 1) * (25 + Math.random()*40);
        x = Math.min(244, x); y = Math.max(12, Math.min(244, y));
        g.lineTo(x, y);
      }
      g.stroke();
      g.fillStyle = `rgba(${nr},${ng},${nb},.5)`;      // the chip it feeds
      g.fillRect(x - 5, y - 5, 10, 10);
      g.fillStyle = `rgba(${nr},${ng},${nb},.95)`;     // live LED
      g.fillRect(x - 1.5, y - 1.5, 3, 3);
    }
    agedOverlay(g);
  });
}

/* vent slats below a column of glyphs nobody reads any more */
export function glyphTexture(three, theme){
  const [nr, ng, nb] = theme.texRgb;
  return canvasTexture(three, g => {
    g.fillStyle = cssHex(theme.texBase); g.fillRect(0,0,256,256);
    const f = 0.07;
    g.fillStyle = `rgb(${nr*f|0},${ng*f|0},${nb*f|0})`;
    g.fillRect(4, 4, 248, 248);
    // vent slats across the lower half
    for (let y = 150; y < 244; y += 14){
      g.fillStyle = "rgba(0,0,0,.55)";
      g.fillRect(16, y, 224, 8);
      g.fillStyle = `rgba(${nr},${ng},${nb},.14)`;     // catching the light on top
      g.fillRect(16, y, 224, 2);
    }
    // two columns of blocky dead glyphs above
    for (const cx of [64, 176]){
      for (let y = 20; y < 130; y += 30){
        g.strokeStyle = `rgba(${nr},${ng},${nb},${0.2 + Math.random()*0.2})`;
        g.lineWidth = 3; g.lineCap = "square";
        const strokes = 2 + (Math.random()*3 | 0);     // each glyph: a few hard strokes
        g.beginPath();
        for (let s = 0; s < strokes; s++){
          const x1 = cx - 12 + Math.random()*24, y1 = y + Math.random()*20;
          g.moveTo(x1, y1);
          g.lineTo(Math.random() < 0.5 ? x1 + 8 + Math.random()*12 : x1,
                   Math.random() < 0.5 ? y1 : y1 + 6 + Math.random()*12);
        }
        g.stroke();
      }
    }
    agedOverlay(g);
  });
}

/* brick that is breaking down: cracks, missing blocks, the wired showing */
export function crackedTexture(three, theme){
  const [nr, ng, nb] = theme.texRgb;
  return canvasTexture(three, g => {
    paintBricks(g, theme);
    // missing bricks: knocked back to near-black with a neon speckle inside
    const bw = 64, bh = 32;
    for (let i = 0; i < 5; i++){
      const y = (Math.random()*8 | 0), x = (Math.random()*4 | 0);
      const off = (y % 2) * bw/2;
      g.fillStyle = "rgba(0,0,0,.8)";
      g.fillRect(x*bw + off + 2, y*bh + 2, bw - 4, bh - 4);
      g.fillStyle = `rgba(${nr},${ng},${nb},${0.4 + Math.random()*0.4})`;
      for (let s = 0; s < 3; s++)
        g.fillRect(x*bw + off + 6 + Math.random()*(bw-16), y*bh + 6 + Math.random()*(bh-14), 3, 3);
    }
    // cracks: jagged walks from the top, dark gouge with a glowing hairline
    for (let i = 0; i < 2; i++){
      let x = 40 + Math.random()*176, y = 0;
      const pts = [[x, y]];
      while (y < 200 + Math.random()*56){
        x += (Math.random()*2 - 1) * 26; y += 18 + Math.random()*22;
        pts.push([Math.max(8, Math.min(248, x)), Math.min(256, y)]);
      }
      g.lineCap = "round"; g.lineJoin = "round";
      g.strokeStyle = "rgba(0,0,0,.75)"; g.lineWidth = 4;
      g.beginPath(); pts.forEach(([px, py], k) => k ? g.lineTo(px, py) : g.moveTo(px, py)); g.stroke();
      g.strokeStyle = `rgba(${nr},${ng},${nb},.5)`; g.lineWidth = 1.4;
      g.stroke();                                      // the wired, glowing in the gap
    }
    agedOverlay(g);
  });
}

export function cyberTexture(three, theme){
  const [nr, ng, nb] = theme.texRgb;
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d");
  g.clearRect(0,0,256,256);
  const grid = 16;
  for (let y = 0; y < 256; y += grid){
    const solid = y / 256;                 // 0 at top (broken) -> 1 at base (intact)
    for (let x = 0; x < 256; x += grid){
      const r = Math.random();
      if (r < solid * 0.85 + 0.05){
        // surviving wall block
        const f = 0.08 + Math.random()*0.06;
        g.fillStyle = `rgb(${nr*f|0},${ng*f|0},${nb*f|0})`;
        g.fillRect(x, y, grid - 1, grid - 1);
      } else if (r < solid * 0.85 + 0.22){
        // data fragment peeling off into the wired (neon, or a brighter sibling)
        const a = 0.5 + Math.random()*0.5;
        g.fillStyle = Math.random() < 0.5
          ? `rgba(${nr},${ng},${nb},${a})`
          : `rgba(${Math.min(nr+60,255)},${Math.min(ng+60,255)},${Math.min(nb+60,255)},${a})`;
        g.fillRect(x, y, grid - 1, grid - 1);
      }
      // else: transparent gap - wall has broken away
    }
  }
  // vertical data-rain streaks
  g.fillStyle = `rgba(${nr},${ng},${nb},.5)`;
  for (let i = 0; i < 4; i++)
    g.fillRect((Math.random()*16|0)*grid, Math.random()*120, grid - 1, 40 + Math.random()*120);
  const t = new three.CanvasTexture(c);
  t.wrapS = t.wrapT = three.RepeatWrapping;
  return t;
}

/* one floor cell: deck plating in four quadrant panels, seams, corner
   bolts, a dashed glowing conduit down the middle, scuffs and edge AO —
   the old texture was a bare frame; this reads as a walked-on deck */
export function floorTexture(three, theme){
  const [nr, ng, nb] = theme.texRgb;
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = cssHex(theme.texFog); g.fillRect(0,0,256,256);
  // quadrant deck panels, each a slightly different shade
  for (const [px, py] of [[0,0],[128,0],[0,128],[128,128]]){
    const f = 0.02 + Math.random()*0.025;
    g.fillStyle = `rgb(${nr*f|0},${ng*f|0},${nb*f|0})`;
    g.fillRect(px + 3, py + 3, 122, 122);
  }
  g.strokeStyle = `rgba(${nr},${ng},${nb},.25)`; g.lineWidth = 2;    // cell frame
  g.strokeRect(4,4,248,248);
  g.strokeStyle = `rgba(${nr},${ng},${nb},.1)`;                      // panel seams
  g.beginPath(); g.moveTo(128,0); g.lineTo(128,256); g.moveTo(0,128); g.lineTo(256,128); g.stroke();
  g.fillStyle = `rgba(${nr},${ng},${nb},.22)`;                       // seam bolts
  for (const [bx, by] of [[128,128],[128,16],[128,240],[16,128],[240,128]]){
    g.beginPath(); g.arc(bx, by, 3, 0, Math.PI*2); g.fill();
  }
  // a dashed conduit strip crossing the cell — a live line under the deck
  const vert = Math.random() < 0.5;
  g.strokeStyle = `rgba(${nr},${ng},${nb},.3)`; g.lineWidth = 3;
  g.setLineDash([14, 10]);
  g.beginPath();
  if (vert){ g.moveTo(64 + Math.random()*128, 8); g.lineTo(64 + Math.random()*128, 248); }
  else     { g.moveTo(8, 64 + Math.random()*128); g.lineTo(248, 64 + Math.random()*128); }
  g.stroke();
  g.setLineDash([]);
  // scuffs: the drag marks of everything that was hauled through here
  for (let i = 0; i < 7; i++){
    g.strokeStyle = `rgba(0,0,0,${0.1 + Math.random()*0.15})`;
    g.lineWidth = 2 + Math.random()*3;
    const x = Math.random()*256, y = Math.random()*256;
    g.beginPath(); g.moveTo(x, y);
    g.lineTo(x + (Math.random()*2 - 1)*60, y + (Math.random()*2 - 1)*60);
    g.stroke();
  }
  // edge AO so each cell pools a little shadow at its border
  for (const rot of [0, 1]){
    for (const flip of [0, 1]){
      const grad = rot
        ? g.createLinearGradient(flip ? 256 : 0, 0, flip ? 236 : 20, 0)
        : g.createLinearGradient(0, flip ? 256 : 0, 0, flip ? 236 : 20);
      grad.addColorStop(0, "rgba(0,0,0,.3)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, 256, 256);
    }
  }
  const t = new three.CanvasTexture(c);
  t.wrapS = t.wrapT = three.RepeatWrapping;
  return t;
}

/* a ceiling tile: plain plates, seams, a rare vent — one tile per cell */
export function ceilingTexture(three, theme){
  const [nr, ng, nb] = theme.texRgb;
  return canvasTexture(three, g => {
    g.fillStyle = cssHex(theme.texBase); g.fillRect(0,0,256,256);
    const P = 128;                                     // 2×2 plates per cell
    for (let py = 0; py < 256; py += P)
      for (let px = 0; px < 256; px += P){
        const f = 0.05 + Math.random()*0.03;           // dimmer than the walls
        g.fillStyle = `rgb(${nr*f|0},${ng*f|0},${nb*f|0})`;
        g.fillRect(px + 2, py + 2, P - 4, P - 4);
        g.strokeStyle = `rgba(${nr},${ng},${nb},.12)`; g.lineWidth = 2;
        g.strokeRect(px + 2, py + 2, P - 4, P - 4);
        g.fillStyle = `rgba(${nr},${ng},${nb},.2)`;    // corner rivets
        for (const [rx, ry] of [[10,10],[P-10,10],[10,P-10],[P-10,P-10]]){
          g.beginPath(); g.arc(px + rx, py + ry, 2.5, 0, Math.PI*2); g.fill();
        }
        if (Math.random() < 0.2){                      // the odd extraction vent
          for (let y = py + 44; y < py + 88; y += 11){
            g.fillStyle = "rgba(0,0,0,.5)";
            g.fillRect(px + 34, y, 60, 6);
            g.fillStyle = `rgba(${nr},${ng},${nb},.1)`;
            g.fillRect(px + 34, y, 60, 2);
          }
        }
      }
    // a hairline conduit crossing the tile
    g.strokeStyle = `rgba(${nr},${ng},${nb},.16)`; g.lineWidth = 3;
    const y = 40 + Math.random()*176;
    g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke();
  });
}

/* ---------- props (props.js set dressing) --------------------------------
   crateTexture follows the wall rules (texRgb/texBase — coloured on solid
   bands, grey on the rest, tinted by the lights). screenTexture and
   ledTexture are drawn in greyscale on black: props.js puts them on
   MeshBasicMaterial whose .color carries the level neon (and is recoloured
   per-frame on animated bands), so the glow always matches the theme. */

/* a shipping crate face: panel fill, rim, cross brace, corner plates */
export function crateTexture(three, theme, rand = Math.random){
  const [nr, ng, nb] = theme.texRgb;
  return canvasTexture(three, g => {
    g.fillStyle = cssHex(theme.texBase); g.fillRect(0, 0, 256, 256);
    const f = 0.09 + rand()*0.04;                    // face, slightly uneven
    g.fillStyle = `rgb(${nr*f|0},${ng*f|0},${nb*f|0})`;
    g.fillRect(6, 6, 244, 244);
    g.strokeStyle = `rgba(${nr},${ng},${nb},.22)`;   // rim
    g.lineWidth = 6; g.strokeRect(10, 10, 236, 236);
    g.lineWidth = 4;                                  // cross brace
    g.beginPath(); g.moveTo(14, 14); g.lineTo(242, 242);
    g.moveTo(242, 14); g.lineTo(14, 242); g.stroke();
    g.fillStyle = `rgba(${nr},${ng},${nb},.28)`;      // corner plates
    for (const [px, py] of [[10,10],[206,10],[10,206],[206,206]])
      g.fillRect(px, py, 40, 40);
    // stencil: a short serial nobody will ever look up
    g.fillStyle = `rgba(${nr},${ng},${nb},.4)`;
    g.font = "28px 'VT323', monospace"; g.textAlign = "center";
    g.fillText(`LP-${100 + (rand()*900|0)}`, 128, 140);
  });
}

/* a dead terminal screen: scanlines, a few lines of glyph blocks, cursor */
export function screenTexture(three, rand = Math.random){
  return canvasTexture(three, g => {
    g.fillStyle = "#000"; g.fillRect(0, 0, 256, 256);
    g.fillStyle = "rgba(255,255,255,.05)";            // faint phosphor field
    g.fillRect(8, 8, 240, 240);
    for (let y = 8; y < 248; y += 6){                 // scanlines
      g.fillStyle = "rgba(255,255,255,.04)";
      g.fillRect(8, y, 240, 2);
    }
    // lines of dead output: runs of glyph blocks, ragged right edge
    for (let y = 28, line = 0; y < 200 && line < 8; y += 24, line++){
      let x = 20;
      const end = 60 + rand()*160;
      while (x < end){
        const w = 8 + rand()*22;
        g.fillStyle = `rgba(255,255,255,${0.25 + rand()*0.4})`;
        g.fillRect(x, y, w, 12);
        x += w + 6 + rand()*10;
      }
    }
    g.fillStyle = "rgba(255,255,255,.9)";             // cursor, forever mid-thought
    g.fillRect(20, 214, 14, 16);
  });
}

/* rows of rack LEDs: mostly dim, a few bright, a couple dead */
export function ledTexture(three, rand = Math.random){
  return canvasTexture(three, g => {
    g.fillStyle = "#000"; g.fillRect(0, 0, 256, 256);
    for (let y = 14; y < 248; y += 22){               // unit seams
      g.fillStyle = "rgba(255,255,255,.08)";
      g.fillRect(6, y + 16, 244, 2);
      for (let x = 16; x < 120; x += 18){             // the LED block, left half
        const r = rand();
        const a = r < 0.12 ? 0 : r < 0.7 ? 0.18 + rand()*0.2 : 0.75 + rand()*0.25;
        g.fillStyle = `rgba(255,255,255,${a})`;
        g.fillRect(x, y, 8, 8);
      }
      g.fillStyle = `rgba(255,255,255,${0.1 + rand()*0.15})`;  // vent slots, right half
      for (let x = 140; x < 240; x += 12) g.fillRect(x, y - 2, 6, 14);
    }
  });
}

/* ---------- the tenant cells --------------------------------------------
   The chamber behind a character's window is a sealed digital holding
   cell, not a balcony on the city. cellWallTexture lines the sides /
   floor / ceiling: a dark surface ruled into a fine glowing grid, like
   the inside of a wireframe. cellBackTexture is the rear wall the figure
   stands against — same lining plus falling data-rain columns and the
   TENANT'S OWN dressing (CELL_DRESSING, keyed by character id): the
   things they've hung, pinned and stacked against the wall of the box
   they live in. No text anywhere — the cell tells you whose it is by
   what's in it. All of it draws in the level's representative neon
   (theme.rgb), kept dim so the glowing tenant stays the brightest thing
   in the box.

   Geometry note for the painters: the 256px canvas maps the 3.4m back
   wall, y=0 at the ceiling. The window shows roughly canvas y 84..202,
   and the figure covers x 56..200 — so the art lives in the side
   columns (x 4..56 and 200..252) and the band over their head. */
function paintCellGrid(g, nr, ng, nb){
  g.fillStyle = `rgb(${nr*0.045|0},${ng*0.045|0},${nb*0.045|0})`;
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = `rgba(${nr},${ng},${nb},.14)`; g.lineWidth = 1;
  for (let k = 0; k <= 256; k += 32){
    g.beginPath();
    g.moveTo(0, k + 0.5); g.lineTo(256, k + 0.5);
    g.moveTo(k + 0.5, 0); g.lineTo(k + 0.5, 256);
    g.stroke();
  }
  g.strokeStyle = `rgba(${nr},${ng},${nb},.3)`; g.lineWidth = 2;   // major seams
  g.beginPath();
  g.moveTo(0, 128); g.lineTo(256, 128);
  g.moveTo(128, 0); g.lineTo(128, 256);
  g.stroke();
  // corner brackets, like a targeting overlay that never went away
  g.strokeStyle = `rgba(${nr},${ng},${nb},.5)`; g.lineWidth = 3;
  for (const [cx, cy, sx, sy] of [[8,8,1,1],[248,8,-1,1],[8,248,1,-1],[248,248,-1,-1]]){
    g.beginPath();
    g.moveTo(cx + sx*22, cy); g.lineTo(cx, cy); g.lineTo(cx, cy + sy*22);
    g.stroke();
  }
}

export function cellWallTexture(three, theme){
  const [nr, ng, nb] = theme.rgb.map(Math.round);
  return canvasTexture(three, g => paintCellGrid(g, nr, ng, nb));
}

/* Scally's stall: a striped awning over everything, shelves of stock on
   one side, the loud coat on its hook on the other. Open for business. */
function dressScally(g, ink, rand){
  for (let x = 12, i = 0; x < 244; x += 29, i++){       // the awning
    g.fillStyle = ink(i % 2 ? 0.34 : 0.12);
    g.fillRect(x, 82, 29, 14);
    g.beginPath(); g.arc(x + 14.5, 96, 14.5, 0, Math.PI); g.fill();
  }
  g.strokeStyle = ink(0.5); g.lineWidth = 3;            // shelves of goods
  for (const sy of [134, 166, 198]){
    g.beginPath(); g.moveTo(6, sy); g.lineTo(54, sy); g.stroke();
    for (let bx = 9; bx < 44; bx += 12 + rand() * 5){
      const bh = 10 + rand() * 14, bw = 7 + rand() * 4;
      g.fillStyle = ink(0.2 + rand() * 0.3);
      g.fillRect(bx, sy - bh, bw, bh);
    }
  }
  g.strokeStyle = ink(0.55); g.lineWidth = 2.5;         // the coat, hung ready
  g.beginPath(); g.arc(224, 116, 4, 0, Math.PI * 2); g.stroke();
  g.fillStyle = ink(0.3);
  g.beginPath();
  g.moveTo(224, 120); g.lineTo(206, 134); g.lineTo(202, 192);
  g.lineTo(246, 192); g.lineTo(242, 134); g.closePath(); g.fill();
  g.strokeStyle = ink(0.5); g.lineWidth = 2;            // lapels
  g.beginPath();
  g.moveTo(224, 122); g.lineTo(215, 152);
  g.moveTo(224, 122); g.lineTo(233, 152);
  g.stroke();
}

/* Homiss's session corner: a staff of parked notes over his head, the
   spare bass on the wall, compositions pinned on napkins. None legible.
   He'd agree that's for the best. */
function dressHomiss(g, ink, rand){
  g.strokeStyle = ink(0.28); g.lineWidth = 1.5;         // the staff
  for (let i = 0; i < 5; i++){
    g.beginPath(); g.moveTo(24, 86 + i * 5); g.lineTo(232, 86 + i * 5); g.stroke();
  }
  g.fillStyle = ink(0.55);
  for (const [nx, ny] of [[60, 97], [95, 91], [130, 101], [168, 96], [204, 89]]){
    g.beginPath(); g.ellipse(nx, ny, 4.5, 3.5, -0.3, 0, Math.PI * 2); g.fill();
    g.strokeStyle = ink(0.55); g.lineWidth = 2;
    g.beginPath(); g.moveTo(nx + 4, ny); g.lineTo(nx + 4, ny - 14); g.stroke();
  }
  g.strokeStyle = ink(0.5); g.lineWidth = 3;            // the spare bass
  g.beginPath(); g.moveTo(30, 108); g.lineTo(30, 168); g.stroke();
  g.lineWidth = 1.5;
  for (const py of [112, 118, 124, 130]){
    g.beginPath(); g.moveTo(23, py); g.lineTo(30, py); g.stroke();   // tuning pegs
  }
  g.fillStyle = ink(0.28);
  g.beginPath(); g.ellipse(30, 186, 17, 22, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = ink(0.5); g.lineWidth = 1.5;          // strings, floor to peghead
  g.beginPath();
  g.moveTo(28, 108); g.lineTo(28, 200);
  g.moveTo(32, 108); g.lineTo(32, 200);
  g.stroke();
  for (const [px, py, tilt] of [[222, 128, -0.12], [218, 168, 0.1], [230, 200, -0.06]]){
    g.save(); g.translate(px, py); g.rotate(tilt);      // pinned napkins
    g.fillStyle = ink(0.16); g.fillRect(-14, -14, 28, 28);
    g.strokeStyle = ink(0.45); g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(-9, -5);
    for (let sx = -6; sx <= 9; sx += 3) g.lineTo(sx, -5 + Math.sin(sx) * 3 + rand() * 5);
    g.stroke();
    g.fillStyle = ink(0.6);
    g.beginPath(); g.arc(0, -12, 2, 0, Math.PI * 2); g.fill();
    g.restore();
  }
}

/* Little Bee's ward: an EEG trace running the width of the cell, a chart
   still climbing, tally groups, and a horse drawn the way you draw the
   thing you miss. A rosette she won under it. */
function dressLittlebee(g, ink, rand){
  g.strokeStyle = ink(0.45); g.lineWidth = 1.5;         // the EEG trace
  g.beginPath(); g.moveTo(8, 95);
  for (let x = 12; x <= 248; x += 4)
    g.lineTo(x, 95 + (rand() < 0.12 ? (rand() - 0.5) * 26 : (rand() - 0.5) * 6));
  g.stroke();
  g.strokeStyle = ink(0.5); g.lineWidth = 2;            // the chart
  g.strokeRect(8, 116, 48, 56);
  g.beginPath();
  g.moveTo(14, 164); g.lineTo(14, 122);
  g.moveTo(14, 164); g.lineTo(50, 164);
  g.stroke();
  g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(14, 158);
  for (const [dx, dy] of [[8, -8], [16, -14], [24, -16], [30, -26], [34, -30]])
    g.lineTo(14 + dx, 158 + dy);
  g.stroke();
  g.lineWidth = 1.5;                                    // the audit tallies
  for (let group = 0; group < 3; group++){
    const tx = 10 + group * 17;
    for (let i = 0; i < 4; i++){
      g.beginPath(); g.moveTo(tx + i * 3, 182); g.lineTo(tx + i * 3, 194); g.stroke();
    }
    g.beginPath(); g.moveTo(tx - 2, 194); g.lineTo(tx + 11, 182); g.stroke();
  }
  g.fillStyle = ink(0.32);                              // the horse
  g.beginPath(); g.ellipse(220, 148, 16, 9, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = ink(0.4); g.lineWidth = 2.5;
  for (const dx of [-11, -5, 6, 12]){
    g.beginPath(); g.moveTo(220 + dx, 153); g.lineTo(220 + dx + (dx > 0 ? 2 : -1), 171); g.stroke();
  }
  g.beginPath(); g.moveTo(232, 142); g.lineTo(241, 128); g.stroke();   // neck
  g.fillStyle = ink(0.36);
  g.beginPath(); g.ellipse(243, 126, 6.5, 4, 0.5, 0, Math.PI * 2); g.fill();
  g.strokeStyle = ink(0.4); g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(240, 121); g.lineTo(238, 116); g.stroke();   // an ear
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(204, 146); g.quadraticCurveTo(196, 152, 199, 162); g.stroke();  // tail
  g.fillStyle = ink(0.5);                               // the rosette
  g.beginPath(); g.arc(220, 190, 7, 0, Math.PI * 2); g.fill();
  g.fillStyle = ink(0.18);
  g.beginPath(); g.arc(220, 190, 3, 0, Math.PI * 2); g.fill();
  g.strokeStyle = ink(0.45); g.lineWidth = 2;
  g.beginPath();
  g.moveTo(217, 196); g.lineTo(214, 208);
  g.moveTo(223, 196); g.lineTo(226, 208);
  g.stroke();
}

/* Sian's workshop: a cable run with a controller hung off it, a pegboard
   of tools, and the blueprint for the next bot — dimensioned, in no
   units, with the spinner circled twice. */
function dressSian(g, ink, rand){
  g.strokeStyle = ink(0.4); g.lineWidth = 2;            // the cable run
  g.beginPath();
  g.moveTo(8, 84); g.quadraticCurveTo(70, 96, 128, 90); g.quadraticCurveTo(190, 84, 248, 94);
  g.stroke();
  g.beginPath(); g.moveTo(150, 88); g.lineTo(150, 104); g.stroke();
  g.fillStyle = ink(0.35);                              // the hanging controller
  g.fillRect(138, 104, 24, 10);
  g.fillRect(136, 112, 8, 9); g.fillRect(158, 112, 8, 9);
  g.fillStyle = ink(0.2);                               // pegboard
  for (let px = 12; px <= 52; px += 10)
    for (let py = 118; py <= 198; py += 10){
      g.beginPath(); g.arc(px, py, 1.2, 0, Math.PI * 2); g.fill();
    }
  g.strokeStyle = ink(0.5); g.lineWidth = 3;            // wrench + driver
  g.beginPath(); g.moveTo(21, 132); g.lineTo(34, 160); g.stroke();
  g.lineWidth = 2.5;
  g.beginPath(); g.arc(19, 128, 5, 0.6, Math.PI * 2 - 0.6); g.stroke();
  g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(44, 126); g.lineTo(44, 152); g.stroke();
  g.fillStyle = ink(0.4); g.fillRect(41, 152, 7, 13);
  g.strokeStyle = ink(0.5); g.lineWidth = 2;            // the blueprint
  g.strokeRect(200, 116, 50, 62);
  g.beginPath();
  g.moveTo(208, 162); g.lineTo(244, 162); g.lineTo(244, 138); g.closePath();
  g.stroke();
  g.beginPath(); g.arc(238, 152, 6, 0, Math.PI * 2); g.stroke();       // the spinner
  g.lineWidth = 1;
  g.beginPath(); g.arc(238, 152, 9, 0, Math.PI * 2); g.stroke();       // circled twice
  g.lineWidth = 1.5;                                    // dimension line
  g.beginPath();
  g.moveTo(208, 170); g.lineTo(244, 170);
  g.moveTo(208, 166); g.lineTo(208, 174);
  g.moveTo(244, 166); g.lineTo(244, 174);
  g.stroke();
  g.lineWidth = 2;                                      // hex bolts, escaped
  for (const bx of [208, 224, 240]){
    g.beginPath();
    for (let i = 0; i <= 6; i++){
      const a = i / 6 * Math.PI * 2 + 0.26;
      const px = bx + Math.cos(a) * 6, py = 194 + Math.sin(a) * 6;
      i ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.stroke();
  }
}

/* Dalypso's den: the aerial he keeps re-rigging, a stack of old tellies
   (one still getting something), and the football wall — ball and
   pennant. Every channel there ever was. */
function dressDalypso(g, ink, rand){
  g.strokeStyle = ink(0.45); g.lineWidth = 2;           // the aerial
  g.beginPath(); g.moveTo(128, 112); g.lineTo(128, 86); g.stroke();
  g.beginPath();
  g.moveTo(106, 82); g.lineTo(150, 94);
  g.moveTo(106, 94) ; g.lineTo(150, 82);
  g.stroke();
  g.lineWidth = 1.5;                                    // the signal, allegedly
  g.beginPath();
  g.moveTo(140, 78); g.lineTo(146, 84); g.lineTo(141, 86); g.lineTo(147, 92);
  g.stroke();
  for (const [ty, on] of [[118, true], [158, false]]){  // the telly stack
    g.strokeStyle = ink(0.5); g.lineWidth = 2.5;
    g.strokeRect(8, ty, 46, 34);
    g.fillStyle = ink(on ? 0.28 : 0.1);
    g.fillRect(13, ty + 4, 30, 26);
    g.fillStyle = ink(on ? 0.55 : 0.22);                // static
    for (let i = 0; i < (on ? 26 : 10); i++)
      g.fillRect(13 + rand() * 28, ty + 4 + rand() * 24, 2, 2);
    g.fillStyle = ink(0.5);                             // knobs
    g.beginPath(); g.arc(49, ty + 10, 2, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(49, ty + 20, 2, 0, Math.PI * 2); g.fill();
  }
  g.strokeStyle = ink(0.55); g.lineWidth = 2.5;         // the ball
  g.beginPath(); g.arc(222, 136, 15, 0, Math.PI * 2); g.stroke();
  g.fillStyle = ink(0.45);
  g.beginPath();
  for (let i = 0; i <= 5; i++){
    const a = i / 5 * Math.PI * 2 - Math.PI / 2;
    const px = 222 + Math.cos(a) * 6, py = 136 + Math.sin(a) * 6;
    i ? g.lineTo(px, py) : g.moveTo(px, py);
  }
  g.closePath(); g.fill();
  g.strokeStyle = ink(0.35); g.lineWidth = 1.5;
  for (let i = 0; i < 5; i++){
    const a = i / 5 * Math.PI * 2 - Math.PI / 2;
    g.beginPath();
    g.moveTo(222 + Math.cos(a) * 6, 136 + Math.sin(a) * 6);
    g.lineTo(222 + Math.cos(a) * 13, 136 + Math.sin(a) * 13);
    g.stroke();
  }
  g.strokeStyle = ink(0.5); g.lineWidth = 2;            // the pennant
  g.beginPath(); g.moveTo(206, 158); g.lineTo(206, 200); g.stroke();
  g.fillStyle = ink(0.3);
  g.beginPath();
  g.moveTo(208, 160); g.lineTo(246, 170); g.lineTo(208, 180); g.closePath();
  g.fill();
}

const CELL_DRESSING = {
  scally: dressScally, homiss: dressHomiss, littlebee: dressLittlebee,
  sian: dressSian, dalypso: dressDalypso,
};

export function cellBackTexture(three, theme, tenant, rand = Math.random){
  const [nr, ng, nb] = theme.rgb.map(Math.round);
  return canvasTexture(three, g => {
    paintCellGrid(g, nr, ng, nb);
    // data rain: thin columns of process noise sliding down the wall
    // (kept clear of the side columns, where the tenant's things hang)
    for (let i = 0; i < 2; i++){
      const x = 70 + rand() * 116;
      let y = rand() * 60;
      while (y < 250){
        const h = 4 + rand() * 14;
        g.fillStyle = `rgba(${nr},${ng},${nb},${0.1 + rand() * 0.35})`;
        g.fillRect(x, y, 5, h);
        y += h + 4 + rand() * 26;
      }
    }
    const dress = CELL_DRESSING[tenant];
    if (dress) dress(g, a => `rgba(${nr},${ng},${nb},${a})`, rand);
  });
}

/* ---------- neon signage ------------------------------------------------
   A vertical sign board (environment.js hangs these on interior walls):
   framed column of bold dead glyphs over a small logo block, drawn in
   white — the material's .color supplies the neon, so one texture works
   for every accent the level hands out. `rand` is the level's seeded rng. */
export function signTexture(three, rand = Math.random){
  const c = document.createElement("canvas"); c.width = 128; c.height = 512;
  const g = c.getContext("2d");
  g.clearRect(0, 0, 128, 512);
  const ink = a => `rgba(255,255,255,${a})`;
  g.strokeStyle = ink(0.9); g.lineWidth = 5;
  g.strokeRect(8, 8, 112, 496);                       // the tube frame
  g.strokeStyle = ink(0.22); g.lineWidth = 2;
  g.strokeRect(18, 18, 92, 476);                      // inner accent line
  g.lineCap = "square"; g.lineJoin = "miter";
  // a column of blocky glyphs, like signage in a script nobody reads
  let y = 44;
  while (y < 420){
    g.strokeStyle = ink(0.65 + rand() * 0.35);
    g.lineWidth = 7;
    const strokes = 2 + (rand() * 3 | 0);
    g.beginPath();
    for (let s = 0; s < strokes; s++){
      const x1 = 40 + rand() * 44, y1 = y + rand() * 36;
      g.moveTo(x1, y1);
      g.lineTo(rand() < 0.5 ? x1 + 14 + rand() * 24 : x1,
               rand() < 0.5 ? y1 : y1 + 12 + rand() * 22);
      if (rand() < 0.5){                              // the odd second bend
        g.lineTo(rand() < 0.5 ? x1 + 30 : x1 - 10, y1 + 20 + rand() * 16);
      }
    }
    g.stroke();
    g.strokeStyle = ink(0.25); g.lineWidth = 2;       // separator dash
    g.beginPath(); g.moveTo(44, y + 54); g.lineTo(84, y + 54); g.stroke();
    y += 62;
  }
  g.fillStyle = ink(0.85);                            // the logo block at the foot
  g.fillRect(48, 448, 32, 32);
  g.clearRect(56, 456, 16, 16);
  return new three.CanvasTexture(c);
}

/* ---------- graffiti ----------------------------------------------------
   A transparent 256² decal of one scrawl (entry comes from
   story.graffitiPool: { kind: "text"|"tally"|"arrow"|"spiral", text? }).
   Drawn in the level's texture colour so it follows the same rules as
   the walls; `rand` is the caller's seeded rng so a level's graffiti is
   stable descent to descent. Deliberately shaky — these were written by
   hand, in the dark, by people who were not okay. */
export function graffitiTexture(three, theme, entry, rand = Math.random){
  const [nr, ng, nb] = theme.texRgb;
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d");
  const ink = a => `rgba(${nr},${ng},${nb},${a})`;
  const j = (v, r = 3) => v + (rand()*2 - 1) * r;     // a shaky hand

  g.clearRect(0, 0, 256, 256);
  g.translate(128, 128);
  g.rotate((rand()*2 - 1) * 0.14);
  g.translate(-128, -128);
  g.strokeStyle = ink(0.8); g.fillStyle = ink(0.8);
  g.lineCap = "round"; g.lineJoin = "round";

  if (entry.kind === "tally"){
    g.lineWidth = 5;
    let y = 60 + rand()*40;
    for (let group = 0; group < 2 + (rand()*2 | 0); group++){
      const x0 = 40 + rand()*30, gap = 22;
      for (let i = 0; i < 4; i++){
        g.beginPath(); g.moveTo(j(x0 + i*gap), j(y)); g.lineTo(j(x0 + i*gap - 4), j(y + 56)); g.stroke();
      }
      g.beginPath(); g.moveTo(j(x0 - 12), j(y + 44)); g.lineTo(j(x0 + 3.4*gap + 10), j(y + 10)); g.stroke();
      y += 80;
    }
  } else if (entry.kind === "arrow"){
    g.lineWidth = 7;
    const y = 100 + rand()*40, x0 = 40, x1 = 200;
    g.beginPath(); g.moveTo(j(x0), j(y)); g.lineTo(j(x1), j(y)); g.stroke();
    g.beginPath(); g.moveTo(j(x1 - 34), j(y - 28)); g.lineTo(j(x1), j(y)); g.lineTo(j(x1 - 34), j(y + 28)); g.stroke();
    g.font = "44px 'VT323', monospace"; g.textAlign = "center";
    g.fillText("OUT?", 128, y + 70);
  } else if (entry.kind === "spiral"){
    g.lineWidth = 5;
    g.beginPath();
    let r = 6;
    for (let a = 0; a < Math.PI * 7; a += 0.25){
      const x = 128 + Math.cos(a) * r, y = 128 + Math.sin(a) * r;
      a === 0 ? g.moveTo(x, y) : g.lineTo(j(x, 1.6), j(y, 1.6));
      r += 1.35;
    }
    g.stroke();
  } else {                                             // text
    const lines = String(entry.text ?? "").split("\n");
    g.textAlign = "center"; g.textBaseline = "middle";
    const size = lines.length > 2 ? 40 : 46;
    g.font = `${size}px 'VT323', monospace`;
    const y0 = 128 - ((lines.length - 1) * size * 0.6);
    lines.forEach((line, i) => {
      // double-struck with a slight offset: gone over it more than once
      g.fillText(line, j(128, 4), j(y0 + i * size * 1.2, 3));
      g.fillStyle = ink(0.35);
      g.fillText(line, j(129, 4), j(y0 + i * size * 1.2 + 1, 3));
      g.fillStyle = ink(0.8);
    });
  }
  return new three.CanvasTexture(c);
}
