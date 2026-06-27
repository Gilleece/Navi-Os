/* ============================================================
   MAZE.EXE — environment
   The level shell: fog, ambient light, floor, ceiling, walls.
   Returns the wall collision boxes the player tests against.
   ============================================================ */
import { cellCenter } from "./generator.js";
import { brickTexture, floorTexture, cyberTexture } from "./textures.js";

/* stable id for a wall at a world position — lets callers (e.g.
   character spawns) ask for a window there regardless of which
   cell iteration ends up rendering that shared wall. */
export const wallKey = (x, z, alongX) => `${alongX ? "H" : "V"}|${x.toFixed(2)}|${z.toFixed(2)}`;

/* builds the static environment into `scene` from the given maze
   `cells`. Walls bordering `goalCell` get the dissolving "cyber"
   material; walls whose key is in `windows` are built with a window
   opening instead. Returns { walls, cyberMat } — `walls` are
   axis-aligned collision boxes, `cyberMat` is exposed so the loop
   can pulse it. */
export function buildEnvironment(three, scene, cfg, cells, goalCell, windows = new Set()){
  const { N, CELL, WALL_H, WALL_T, theme } = cfg;
  const size = N * CELL;

  scene.fog = new three.Fog(theme.sceneFog, 2, 26);
  const ambient = new three.AmbientLight(theme.ambient, 1.15);
  scene.add(ambient);

  // floor + ceiling
  const fTex = floorTexture(three, theme); fTex.repeat.set(N, N);
  const floor = new three.Mesh(
    new three.PlaneGeometry(size, size),
    new three.MeshLambertMaterial({map:fTex}));
  floor.rotation.x = -Math.PI/2;
  floor.position.set(size/2, 0, size/2);
  scene.add(floor);
  const ceil = new three.Mesh(
    new three.PlaneGeometry(size, size),
    new three.MeshLambertMaterial({color:theme.ceil}));
  ceil.rotation.x = Math.PI/2;
  ceil.position.set(size/2, WALL_H, size/2);
  scene.add(ceil);

  // walls
  const walls = [];
  const bTex = brickTexture(three, theme); bTex.repeat.set(1.4, 1);
  const wallMat = new three.MeshLambertMaterial({map:bTex});
  // dissolving wall around the goal: unlit & transparent so the
  // glowing fragments read as a beacon through the fog. On neutral
  // (non-solid) levels the map is grey, so tint it via .color.
  const cyberMat = new three.MeshBasicMaterial({
    map:cyberTexture(three, theme), transparent:true, fog:false,
    color: theme.neutral ? theme.neon : 0xffffff,
  });
  // glowing translucent window pane - characters stand behind it
  const paneMat = new three.MeshBasicMaterial({color:theme.neon, transparent:true, opacity:0.16, side:three.DoubleSide, fog:false});
  const geoH = new three.BoxGeometry(CELL + WALL_T, WALL_H, WALL_T); // runs along X
  const geoV = new three.BoxGeometry(WALL_T, WALL_H, CELL + WALL_T); // runs along Z

  function collide(x, z, alongX){
    const hx = alongX ? (CELL + WALL_T)/2 : WALL_T/2;
    const hz = alongX ? WALL_T/2 : (CELL + WALL_T)/2;
    walls.push({minX:x-hx, maxX:x+hx, minZ:z-hz, maxZ:z+hz});
  }
  function addWall(geo, x, z, alongX, cyber){
    const m = new three.Mesh(geo, cyber ? cyberMat : wallMat);
    m.position.set(x, WALL_H/2, z);
    scene.add(m);
    collide(x, z, alongX);
  }
  // a solid wall with a central window: built from a frame of four
  // brick segments around an opening, plus a translucent pane.
  function addWindowWall(x, z, alongX){
    const L = CELL + WALL_T, T = WALL_T;
    const ow = L * 0.5, oh = WALL_H * 0.46, cy = 1.5;   // opening size + centre height
    const botH = cy - oh/2, topH = WALL_H - (cy + oh/2), sideW = (L - ow)/2;
    const seg = (w, h, d, px, py, pz) => {
      const m = new three.Mesh(new three.BoxGeometry(w, h, d), wallMat);
      m.position.set(px, py, pz); scene.add(m);
    };
    if (alongX){
      seg(L, botH, T, x, botH/2, z);
      seg(L, topH, T, x, WALL_H - topH/2, z);
      seg(sideW, oh, T, x - (ow + sideW)/2, cy, z);
      seg(sideW, oh, T, x + (ow + sideW)/2, cy, z);
      const pane = new three.Mesh(new three.PlaneGeometry(ow, oh), paneMat);
      pane.position.set(x, cy, z); scene.add(pane);
    } else {
      seg(T, botH, L, x, botH/2, z);
      seg(T, topH, L, x, WALL_H - topH/2, z);
      seg(T, oh, sideW, x, cy, z - (ow + sideW)/2);
      seg(T, oh, sideW, x, cy, z + (ow + sideW)/2);
      const pane = new three.Mesh(new three.PlaneGeometry(ow, oh), paneMat);
      pane.rotation.y = Math.PI/2; pane.position.set(x, cy, z); scene.add(pane);
    }
    collide(x, z, alongX);   // still blocks the player
  }

  function place(geo, x, z, alongX, cyber){
    if (windows.has(wallKey(x, z, alongX))) addWindowWall(x, z, alongX);
    else addWall(geo, x, z, alongX, cyber);
  }
  const gx = goalCell.x, gy = goalCell.y;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++){
      const c = cells[y][x];
      if (y === 0 && c.N) place(geoH, cellCenter(x, CELL), 0, true, x === gx && gy === 0);
      if (c.S)            place(geoH, cellCenter(x, CELL), (y+1)*CELL, true, x === gx && (y === gy || y+1 === gy));
      if (x === 0 && c.W) place(geoV, 0, cellCenter(y, CELL), false, y === gy && gx === 0);
      if (c.E)            place(geoV, (x+1)*CELL, cellCenter(y, CELL), false, y === gy && (x === gx || x+1 === gx));
    }

  return { walls, cyberMat, paneMat, ambient };
}
