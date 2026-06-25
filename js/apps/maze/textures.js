/* ============================================================
   MAZE.EXE — procedural textures
   Canvas-generated wall + floor maps, returned as three textures.
   ============================================================ */

export function brickTexture(three){
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#06150c"; g.fillRect(0,0,256,256);
  const bw = 64, bh = 32;
  for (let y = 0; y < 256/bh; y++){
    const off = (y % 2) * bw/2;
    for (let x = -1; x < 256/bw + 1; x++){
      const shade = 8 + Math.random()*14 | 0;
      g.fillStyle = `rgb(${shade},${30+Math.random()*26|0},${shade+6})`;
      g.fillRect(x*bw + off + 2, y*bh + 2, bw - 4, bh - 4);
    }
  }
  g.strokeStyle = "rgba(70,255,142,.16)";
  for (let y = 0; y <= 256; y += bh){ g.beginPath(); g.moveTo(0,y); g.lineTo(256,y); g.stroke(); }
  const t = new three.CanvasTexture(c);
  t.wrapS = t.wrapT = three.RepeatWrapping;
  return t;
}

/* a wall that is "breaking down into cyberspace": intact dark
   brick at the base dissolving upward into glowing data fragments
   and transparent gaps. Use on a transparent MeshBasicMaterial. */
export function cyberTexture(three){
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
        const s = 6 + Math.random()*10 | 0;
        g.fillStyle = `rgb(${s},${22 + Math.random()*22|0},${s + 8})`;
        g.fillRect(x, y, grid - 1, grid - 1);
      } else if (r < solid * 0.85 + 0.22){
        // data fragment peeling off into the wired
        const a = 0.5 + Math.random()*0.5;
        g.fillStyle = Math.random() < 0.5 ? `rgba(70,255,180,${a})` : `rgba(120,255,230,${a})`;
        g.fillRect(x, y, grid - 1, grid - 1);
      }
      // else: transparent gap — wall has broken away
    }
  }
  // vertical data-rain streaks
  g.fillStyle = "rgba(70,255,180,.5)";
  for (let i = 0; i < 4; i++)
    g.fillRect((Math.random()*16|0)*grid, Math.random()*120, grid - 1, 40 + Math.random()*120);
  const t = new three.CanvasTexture(c);
  t.wrapS = t.wrapT = three.RepeatWrapping;
  return t;
}

export function floorTexture(three){
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#020604"; g.fillRect(0,0,256,256);
  g.strokeStyle = "rgba(70,255,142,.25)"; g.lineWidth = 2;
  g.strokeRect(4,4,248,248);
  g.strokeStyle = "rgba(70,255,142,.08)";
  g.beginPath(); g.moveTo(128,0); g.lineTo(128,256); g.moveTo(0,128); g.lineTo(256,128); g.stroke();
  const t = new three.CanvasTexture(c);
  t.wrapS = t.wrapT = three.RepeatWrapping;
  return t;
}
