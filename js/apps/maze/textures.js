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
