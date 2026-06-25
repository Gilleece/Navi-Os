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
