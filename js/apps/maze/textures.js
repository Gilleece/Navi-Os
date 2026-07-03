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
  return canvasTexture(three, g => paintBricks(g, theme));
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

export function floorTexture(three, theme){
  const [nr, ng, nb] = theme.texRgb;
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = cssHex(theme.texFog); g.fillRect(0,0,256,256);
  g.strokeStyle = `rgba(${nr},${ng},${nb},.25)`; g.lineWidth = 2;
  g.strokeRect(4,4,248,248);
  g.strokeStyle = `rgba(${nr},${ng},${nb},.08)`;
  g.beginPath(); g.moveTo(128,0); g.lineTo(128,256); g.moveTo(0,128); g.lineTo(256,128); g.stroke();
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
