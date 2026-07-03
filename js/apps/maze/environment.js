/* ============================================================
   MAZE.EXE — environment
   The level shell: fog, ambient light, floor, ceiling, walls.
   Returns the wall collision boxes the player tests against.

   Walls are no longer one repeating brick: each wall draws a
   variant (brick / panel / glyph vents / cracked — textures.js)
   picked by a seeded rng from the depth + wall position, so a
   level always looks the same descent to descent. Every wall
   carries a thin glowing baseboard trim in the level's neon, and
   some walls carry graffiti left by the users who came before
   (story.graffitiPool — some scrawls only appear once the story
   has caught up with them).

   DECAY: how varied and scrawled-on the walls are ramps with
   depth (see chaosFor). Depth 1 is the original plain brick and
   clean walls; by depth 30 — the last level before the deep zone
   starts re-running old looks — the mix of patterns and the
   graffiti density are fully chaotic, and they stay that way
   below. The dissolving cyber wall around the exit ring is
   untouched by any of this: it is always its own pattern.
   ============================================================ */
import { cellCenter } from "./generator.js";
import { rng } from "./palette.js";
import { graffitiPool, LOOP_DEPTH } from "./story.js";
import { brickTexture, panelTexture, glyphTexture, crackedTexture,
         graffitiTexture, floorTexture, cyberTexture } from "./textures.js";

/* stable id for a wall at a world position — lets callers (e.g.
   character spawns) ask for a window there regardless of which
   cell iteration ends up rendering that shared wall. */
export const wallKey = (x, z, alongX) => `${alongX ? "H" : "V"}|${x.toFixed(2)}|${z.toFixed(2)}`;

/* deterministic seed for a wall: same depth + position = same look */
function wallSeed(depth, x, z, alongX){
  return ((depth * 73856093)
        ^ (Math.round(x * 4) * 19349663)
        ^ (Math.round(z * 4) * 83492791)
        ^ (alongX ? 0x9E3779B9 : 0)) >>> 0;
}

/* the decay curve: 0 at depth 1 (pristine, plain brick, no graffiti),
   1 at depth 30 (the last level before the loop zone) and beyond */
export function chaosFor(depth){
  return Math.max(0, Math.min(1, ((depth ?? 1) - 1) / (LOOP_DEPTH - 2)));
}

/* builds the static environment into `scene` from the given maze
   `cells`. Walls bordering `goalCell` get the dissolving "cyber"
   material; walls whose key is in `windows` are built with a window
   opening instead. Returns { walls, cyberMat, paneMat, trimMat,
   ambient } — `walls` are axis-aligned collision boxes, the materials
   are exposed so the loop can pulse / recolour them. */
export function buildEnvironment(three, scene, cfg, cells, goalCell, windows = new Set()){
  const { N, CELL, WALL_H, WALL_T, theme, depth } = cfg;
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

  // wall variants: brick, seasoned with panels / vents / decay. How much
  // seasoning grows with depth (chaosFor): depth 1 is all-brick original,
  // depth 30 is a full chaotic mix. One texture + material per variant
  // per level; picked per wall below.
  const chaos = chaosFor(depth);
  const nonBrick = 0.75 * chaos;             // everything that isn't plain brick
  const VARIANTS = [
    { make: brickTexture,   rep: [1.4, 1], w: 1 - nonBrick },
    { make: panelTexture,   rep: [1,   1], w: nonBrick * 0.35 },
    { make: glyphTexture,   rep: [1,   1], w: nonBrick * 0.30 },
    { make: crackedTexture, rep: [1.4, 1], w: nonBrick * 0.35 },
  ];
  let acc = 0;
  const cum = VARIANTS.map(v => acc += v.w);
  const wallMats = VARIANTS.map(v => {
    const t = v.make(three, theme); t.repeat.set(v.rep[0], v.rep[1]);
    return new three.MeshLambertMaterial({map: t});
  });
  const brickMat = wallMats[0];              // window frames stay brick
  const pickMat = (x, z, alongX) => {
    const r = rng(wallSeed(depth ?? 1, x, z, alongX))() * acc;
    return wallMats[cum.findIndex(c => r < c)] ?? brickMat;
  };

  const walls = [];
  // dissolving wall around the goal: unlit & transparent so the
  // glowing fragments read as a beacon through the fog. On neutral
  // (non-solid) levels the map is grey, so tint it via .color.
  const cyberMat = new three.MeshBasicMaterial({
    map:cyberTexture(three, theme), transparent:true, fog:false,
    color: theme.neutral ? theme.neon : 0xffffff,
  });
  // glowing translucent window pane - characters stand behind it
  const paneMat = new three.MeshBasicMaterial({color:theme.neon, transparent:true, opacity:0.16, side:three.DoubleSide, fog:false});
  // baseboard trim: a thin strip of the level's neon along every wall
  const trimMat = new three.MeshBasicMaterial({color:theme.neon});
  const TRIM_H = 0.09;
  const geoH = new three.BoxGeometry(CELL + WALL_T, WALL_H, WALL_T); // runs along X
  const geoV = new three.BoxGeometry(WALL_T, WALL_H, CELL + WALL_T); // runs along Z
  const trimH = new three.BoxGeometry(CELL + WALL_T, TRIM_H, WALL_T + 0.04);
  const trimV = new three.BoxGeometry(WALL_T + 0.04, TRIM_H, CELL + WALL_T);

  const scrawlable = [];   // solid, non-window, non-goal walls: graffiti candidates

  function collide(x, z, alongX){
    const hx = alongX ? (CELL + WALL_T)/2 : WALL_T/2;
    const hz = alongX ? WALL_T/2 : (CELL + WALL_T)/2;
    walls.push({minX:x-hx, maxX:x+hx, minZ:z-hz, maxZ:z+hz});
  }
  function addTrim(x, z, alongX){
    const m = new three.Mesh(alongX ? trimH : trimV, trimMat);
    m.position.set(x, TRIM_H/2, z);
    scene.add(m);
  }
  function addWall(geo, x, z, alongX, cyber){
    const m = new three.Mesh(geo, cyber ? cyberMat : pickMat(x, z, alongX));
    m.position.set(x, WALL_H/2, z);
    scene.add(m);
    if (!cyber){ addTrim(x, z, alongX); scrawlable.push({ x, z, alongX }); }
    collide(x, z, alongX);
  }
  // a solid wall with a central window: built from a frame of four
  // brick segments around an opening, plus a translucent pane.
  function addWindowWall(x, z, alongX){
    const L = CELL + WALL_T, T = WALL_T;
    const ow = L * 0.5, oh = WALL_H * 0.46, cy = 1.5;   // opening size + centre height
    const botH = cy - oh/2, topH = WALL_H - (cy + oh/2), sideW = (L - ow)/2;
    const seg = (w, h, d, px, py, pz) => {
      const m = new three.Mesh(new three.BoxGeometry(w, h, d), brickMat);
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
    addTrim(x, z, alongX);
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

  addGraffiti(three, scene, cfg, scrawlable, size);

  return { walls, cyberMat, paneMat, trimMat, ambient };
}

/* scrawls from the users who came before, on seeded walls. None on depth 1;
   the deeper you go the more the walls have been written on (chaosFor), up
   to a dense 8-11 by depth 30. Boundary walls only take graffiti on their
   inward face (the outside is void). */
function addGraffiti(three, scene, cfg, candidates, size){
  const { WALL_T, theme, depth } = cfg;
  const chaos = chaosFor(depth);
  const r = rng(((depth ?? 1) * 0x51ED2701) >>> 0);
  const pool = graffitiPool(depth ?? 1);
  const count = Math.floor(chaos * 8 + r() * (1 + 3 * chaos));
  for (let i = 0; i < count && candidates.length; i++){
    const wall  = candidates.splice(Math.floor(r() * candidates.length), 1)[0];
    const entry = pool[Math.floor(r() * pool.length)];
    let side = r() < 0.5 ? 1 : -1;
    if (wall.alongX){ if (wall.z <= 0.01) side = 1; else if (wall.z >= size - 0.01) side = -1; }
    else            { if (wall.x <= 0.01) side = 1; else if (wall.x >= size - 0.01) side = -1; }

    const mesh = new three.Mesh(
      new three.PlaneGeometry(1.5, 1.5),
      // Lambert so the scrawl is lit like the wall it's on (and greyscale
      // scrawls take the level's colour from the lights on neutral bands)
      new three.MeshLambertMaterial({ map: graffitiTexture(three, theme, entry, r),
                                      transparent: true, depthWrite: false }));
    const along = r() * 1.6 - 0.8;                     // off-centre, like a person stood there
    const y = 1.35 + r() * 0.6;
    const off = WALL_T/2 + 0.02;
    if (wall.alongX){
      mesh.position.set(wall.x + along, y, wall.z + side * off);
      mesh.rotation.y = side > 0 ? 0 : Math.PI;
    } else {
      mesh.position.set(wall.x + side * off, y, wall.z + along);
      mesh.rotation.y = side > 0 ? Math.PI/2 : -Math.PI/2;
    }
    scene.add(mesh);
  }
}
