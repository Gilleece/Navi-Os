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
   GLOBAL depth (see chaosFor) — 1..30 across the three cycles —
   so each pass over "the same" ten floors is visibly more ruined
   than the last, and the final descent is fully chaotic. The
   dissolving cyber wall around the exit ring is untouched by any
   of this: it is always its own pattern.

   THE SHELL HAS HOLES NOW: perimeter walls (the only walls whose
   far side is guaranteed void) can open into a neon-trimmed
   VISTA WINDOW — a glazed viewport onto the world vista.js builds
   outside the maze (skyline, synthwave sun, the eye). Interior
   detail: every wall now carries a cornice as well as a baseboard
   (all trim merged into ONE mesh, so a level of neon costs one
   draw call), a few walls hang vertical neon signage, and cable
   runs sag across the corridors at ceiling height.
   ============================================================ */
import { cellCenter } from "./generator.js";
import { rng } from "./palette.js";
import { FINAL_DEPTH, depthInCycle } from "./state.js";
import { graffitiPool } from "./story.js";
import { brickTexture, panelTexture, glyphTexture, crackedTexture, graffitiTexture,
         floorTexture, ceilingTexture, cyberTexture, signTexture,
         cellWallTexture, cellBackTexture } from "./textures.js";

/* concatenate simple indexed BufferGeometries (position/normal/uv) into
   one — the neon trim and the cable runs each collapse to a single mesh
   instead of a few hundred draw calls. Sources are disposed. */
function mergeGeos(three, geos){
  const pos = [], norm = [], uv = [], idx = [];
  let base = 0;
  for (const src of geos){
    const p = src.attributes.position;
    pos.push(...p.array);
    norm.push(...src.attributes.normal.array);
    uv.push(...src.attributes.uv.array);
    const ix = src.index;
    for (let i = 0; i < ix.count; i++) idx.push(ix.getX(i) + base);
    base += p.count;
    src.dispose();
  }
  const geo = new three.BufferGeometry();
  geo.setAttribute("position", new three.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal",   new three.Float32BufferAttribute(norm, 3));
  geo.setAttribute("uv",       new three.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  return geo;
}

/* merge a list of {w,h,d,x,y,z} axis-aligned boxes into one geometry */
const mergeBoxGeos = (three, boxes) => mergeGeos(three, boxes.map(b => {
  const g = new three.BoxGeometry(b.w, b.h, b.d);
  g.translate(b.x, b.y, b.z);
  return g;
}));

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
   1 at the final depth — the last level of cycle 3, when the Protocol
   is coming apart. Depth here is GLOBAL (1..30), so decay accumulates
   across the cycles: each pass over "the same" floors is more ruined. */
export function chaosFor(depth){
  return Math.max(0, Math.min(1, ((depth ?? 1) - 1) / (FINAL_DEPTH - 1)));
}

/* builds the static environment into `scene` from the given maze
   `cells`. Walls bordering `goalCell` get the dissolving "cyber"
   material; walls whose key is in `windows` are built with a window
   opening instead — and a window also in `darkWindows` gets black
   glass (a freed tenant's frame: nobody home, no light behind it).
   Every character window backs onto a sealed holding cell (addCell),
   so the tenants read as HELD — never loose in front of the vista.
   `owners` maps a window's wall key to its character id, so each cell
   is dressed with that tenant's own things (wall art + furniture).
   Returns { walls, cyberMat, paneMat, trimMat, ambient } — `walls`
   are axis-aligned collision boxes, the materials are exposed so the
   loop can pulse / recolour them. */
export function buildEnvironment(three, scene, cfg, cells, goalCell, windows = new Set(), darkWindows = new Set(), owners = new Map()){
  const { N, CELL, WALL_H, WALL_T, theme, depth } = cfg;
  const size = N * CELL;

  // heavier fog than the original (2..26): corridors dissolve into the
  // dark a room sooner, Silent Hill style — the drifting data motes
  // (props.js) live inside this band and give it a digital grain
  scene.fog = new three.Fog(theme.sceneFog, 2.2, 20);
  const ambient = new three.AmbientLight(theme.ambient, 1.45);
  scene.add(ambient);

  // floor + ceiling. Lambert lighting is per-vertex (r128), so both planes
  // are subdivided — otherwise a 36m quad has only corner vertices and the
  // point lights (player lamp, the props.js ceiling grid) can't pool on it.
  const SEG = N * 4;
  const fTex = floorTexture(three, theme); fTex.repeat.set(N, N);
  const floor = new three.Mesh(
    new three.PlaneGeometry(size, size, SEG, SEG),
    new three.MeshLambertMaterial({map:fTex}));
  floor.rotation.x = -Math.PI/2;
  floor.position.set(size/2, 0, size/2);
  scene.add(floor);
  const cTex = ceilingTexture(three, theme); cTex.repeat.set(N, N);
  const ceil = new three.Mesh(
    new three.PlaneGeometry(size, size, SEG, SEG),
    new three.MeshLambertMaterial({map:cTex}));
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
  // a freed tenant's pane: black glass, unlit, slightly more solid — the
  // "dark window" of Scally's rule three. Deliberately NOT on the palette
  // animation, so it stays dead while everything else breathes.
  const darkPaneMat = new three.MeshBasicMaterial({color:0x04060a, transparent:true, opacity:0.6, side:three.DoubleSide, fog:false});
  // tenant cell lining (the sealed chamber behind a character window):
  // dim grid-ruled surfaces, unlit + unfogged like the vista so they read
  // through the glass. The dark variant is the same lining with the power
  // cut — a freed tenant's cell, empty and unlit behind the black glass.
  const cellWallMat = new three.MeshBasicMaterial({map: cellWallTexture(three, theme), fog:false});
  const cellDarkMat = new three.MeshBasicMaterial({map: cellWallTexture(three, theme), color:0x2e3138, fog:false});
  // the cells' OUTSIDE skin and their furniture: flat dark surfaces, unlit
  // and unfogged like the rest of the cell so silhouettes read cleanly
  const cellShellMat = new three.MeshBasicMaterial({color:0x141821, fog:false});
  const cellPropMat  = new three.MeshBasicMaterial({color:0x2a3140, fog:false});
  const cellPropBoxes = [];   // every cell's furniture, merged into ONE mesh at the end
  // vista viewport glazing: near-clear, a breath of cold tint — the view
  // does the work. Unfogged so the glass never greys out the skyline.
  // At the bottom of the cycle (depth 10: the abyss, vista.js) the glass
  // is heavier and sea-green — water pressing against the other side.
  const drowned = depthInCycle(depth ?? 1) === 10;
  const vistaPaneMat = new three.MeshBasicMaterial({
    color: drowned ? 0x2e8ea8 : 0x9fd8ff, transparent: true, opacity: drowned ? 0.22 : 0.08,
    side: three.DoubleSide, fog: false, depthWrite: false});
  // viewport mullions: dark steel bars crossing the glass
  const mullionMat = new three.MeshLambertMaterial({color:0x11141c});
  // neon trim: baseboard + cornice on every wall and the glowing frames of
  // the vista viewports. All of it accumulates in trimBoxes and is merged
  // into ONE mesh on trimMat at the end of the build.
  const trimMat = new three.MeshBasicMaterial({color:theme.neon});
  const TRIM_H = 0.09;
  const trimBoxes = [];
  const geoH = new three.BoxGeometry(CELL + WALL_T, WALL_H, WALL_T); // runs along X
  const geoV = new three.BoxGeometry(WALL_T, WALL_H, CELL + WALL_T); // runs along Z

  const scrawlable = [];   // solid, non-window, non-goal walls: graffiti candidates

  function collide(x, z, alongX){
    const hx = alongX ? (CELL + WALL_T)/2 : WALL_T/2;
    const hz = alongX ? WALL_T/2 : (CELL + WALL_T)/2;
    walls.push({minX:x-hx, maxX:x+hx, minZ:z-hz, maxZ:z+hz});
  }
  function addTrim(x, z, alongX){
    const w = alongX ? CELL + WALL_T : WALL_T + 0.04;
    const d = alongX ? WALL_T + 0.04 : CELL + WALL_T;
    trimBoxes.push({ w, h: TRIM_H, d, x, y: TRIM_H/2, z },        // baseboard
                   { w, h: 0.06,   d, x, y: WALL_H - 0.03, z });  // cornice
  }
  function addWall(geo, x, z, alongX, cyber){
    const m = new three.Mesh(geo, cyber ? cyberMat : pickMat(x, z, alongX));
    m.position.set(x, WALL_H/2, z);
    scene.add(m);
    if (!cyber){ addTrim(x, z, alongX); scrawlable.push({ x, z, alongX }); }
    collide(x, z, alongX);
  }
  // the tenant's cell: a sealed grid-lined chamber jutting into the void
  // behind a character window, so the figure reads as HELD — walled in a
  // digital holding cell — rather than loose in front of the vista's open
  // city. Occupied cells get glowing containment bars across the opening,
  // a ceiling light strip and the TENANT'S OWN dressing: their wall art
  // (textures.cellBackTexture, keyed by `owner`) plus their furniture —
  // dark boxes pooled in cellPropBoxes, glowing accents on the trim
  // material so they ride the palette animation. Every plane also gets an
  // outward-facing twin on the shell material: from outside (a vista
  // window beside the cell) the box reads solid, never an open dollhouse.
  // A freed tenant's cell keeps the box, loses the bars and the power.
  function addCell(x, z, alongX, dark, ow, oh, cy, owner){
    const T = WALL_T, H = WALL_H;
    const CW = 3.4, CD = 2.0;              // interior: the figure stands 0.7 back
    const o = alongX ? (z <= 0.01 ? -1 : 1) : (x <= 0.01 ? -1 : 1);   // outward side
    const r = rng(wallSeed(depth ?? 1, x, z, alongX) ^ 0x7E11);
    const wallM = dark ? cellDarkMat : cellWallMat;
    const backM = dark ? cellDarkMat : new three.MeshBasicMaterial({
      map: cellBackTexture(three, theme, owner, r), fog: false });
    const plane = (w, h, mat, px, py, pz, ry, rx = 0) => {
      const m = new three.Mesh(new three.PlaneGeometry(w, h), mat);
      m.position.set(px, py, pz);
      m.rotation.set(rx, ry, 0);
      scene.add(m);
      // outward twin: rotating π about local Y flips the normal exactly
      // (coplanar, opposite winding — one face culled from each side)
      const s = new three.Mesh(new three.PlaneGeometry(w, h), cellShellMat);
      s.position.set(px, py, pz);
      s.rotation.set(rx, ry + Math.PI, 0);
      scene.add(s);
    };
    if (alongX){
      const zc = z + o * (T/2 + CD/2), zb = z + o * (T/2 + CD);
      plane(CW, H, backM, x, H/2, zb, o > 0 ? Math.PI : 0);
      plane(CD, H, wallM, x - CW/2, H/2, zc, Math.PI/2);
      plane(CD, H, wallM, x + CW/2, H/2, zc, -Math.PI/2);
      plane(CW, CD, wallM, x, 0.02, zc, 0, -Math.PI/2);
      plane(CW, CD, wallM, x, H - 0.02, zc, 0, Math.PI/2);
    } else {
      const xc = x + o * (T/2 + CD/2), xb = x + o * (T/2 + CD);
      plane(CW, H, backM, xb, H/2, z, o > 0 ? -Math.PI/2 : Math.PI/2);
      plane(CD, H, wallM, xc, H/2, z - CW/2, 0);
      plane(CD, H, wallM, xc, H/2, z + CW/2, Math.PI);
      plane(CD, CW, wallM, xc, 0.02, z, 0, -Math.PI/2);
      plane(CD, CW, wallM, xc, H - 0.02, z, 0, Math.PI/2);
    }
    if (dark) return;                      // released: no bars, no light, bare box
    // containment bars just behind the glass, and the cell's light strip
    const bo = o * (T/2 + 0.06);
    const bars = [];
    for (let yb = cy - oh/2 + 0.25; yb < cy + oh/2 - 0.1; yb += 0.4)
      bars.push([0, yb, false]);
    bars.push([-0.55, cy, true], [0.55, cy, true]);
    for (const [ba, by, vert] of bars){
      const bw = vert ? 0.03 : ow, bh = vert ? oh : 0.03;
      if (alongX) trimBoxes.push({ w: bw, h: bh, d: 0.03, x: x + ba, y: by, z: z + bo });
      else        trimBoxes.push({ w: 0.03, h: bh, d: bw, x: x + bo, y: by, z: z + ba });
    }
    if (alongX) trimBoxes.push({ w: 0.7, h: 0.04, d: 0.7, x, y: H - 0.06, z: z + o * (T/2 + CD/2) });
    else        trimBoxes.push({ w: 0.7, h: 0.04, d: 0.7, x: x + o * (T/2 + CD/2), y: H - 0.06, z });

    // ---- the tenant's furniture ----
    // u = along the wall from the window centre (mirrored per cell by
    // `flip`), v = depth into the cell from the wall's inner face — one
    // layout serves all four wall orientations. The window sill sits at
    // ~0.72m, so each set's hero piece stands tall enough to be seen
    // through the glass; the low pieces reward looking in at an angle.
    const flip = r() < 0.5 ? 1 : -1;
    const propBox = (list, w, h, d, u, y, v) => {
      u *= flip;
      if (alongX) list.push({ w, h, d, x: x + u, y, z: z + o * (T/2 + v) });
      else        list.push({ w: d, h, d: w, x: x + o * (T/2 + v), y, z: z + u });
    };
    const dk = (w, h, d, u, y, v) => propBox(cellPropBoxes, w, h, d, u, y, v);
    const gl = (w, h, d, u, y, v) => propBox(trimBoxes, w, h, d, u, y, v);
    switch (owner){
      case "scally":     // the stall: stocked shelves, crates still coming in
        dk(0.62, 0.05, 0.36,  1.22, 0.78, 1.25);
        dk(0.62, 0.05, 0.36,  1.22, 1.24, 1.25);
        gl(0.10, 0.12, 0.10,  1.06, 0.87, 1.22);
        gl(0.08, 0.15, 0.08,  1.32, 0.89, 1.28);
        gl(0.09, 0.09, 0.09,  1.20, 1.32, 1.20);
        dk(0.46, 0.46, 0.46, -1.20, 0.50, 1.05);
        dk(0.34, 0.34, 0.34, -1.14, 0.90, 0.98);
        break;
      case "homiss":     // the session corner: amp up on its road case, humming
        dk(0.44, 0.50, 0.36,  1.22, 0.25, 1.15);
        dk(0.52, 0.62, 0.38,  1.22, 0.81, 1.15);
        gl(0.38, 0.09, 0.03,  1.22, 0.80, 0.945);
        gl(0.05, 0.05, 0.03,  1.40, 1.02, 0.945);
        dk(0.34, 0.05, 0.34, -1.25, 0.47, 0.85);
        dk(0.07, 0.45, 0.07, -1.25, 0.225, 0.85);
        break;
      case "littlebee":  // the lab bench: samples lit, field notes stacked
        dk(0.72, 0.06, 0.42, -1.20, 0.86, 1.10);
        dk(0.56, 0.80, 0.32, -1.20, 0.43, 1.15);
        gl(0.06, 0.16, 0.06, -1.02, 0.97, 1.02);
        gl(0.06, 0.12, 0.06, -1.38, 0.95, 1.10);
        gl(0.05, 0.10, 0.05, -1.20, 0.94, 0.98);
        dk(0.32, 0.07, 0.24,  1.25, 0.035, 0.80);
        dk(0.28, 0.07, 0.22,  1.28, 0.105, 0.84);
        dk(0.24, 0.06, 0.20,  1.22, 0.17, 0.78);
        break;
      case "sian":       // the workshop: bench, the half-built wedge, toolbox
        dk(0.84, 0.06, 0.44,  1.20, 0.80, 1.15);
        dk(0.66, 0.74, 0.36,  1.20, 0.40, 1.20);
        dk(0.30, 0.13, 0.22,  1.10, 0.90, 1.05);
        gl(0.20, 0.05, 0.05,  1.10, 0.90, 0.91);
        gl(0.07, 0.07, 0.07,  1.44, 0.87, 1.15);
        dk(0.40, 0.22, 0.28, -1.25, 0.11, 0.75);
        gl(0.10, 0.04, 0.03, -1.25, 0.235, 0.60);
        break;
      case "dalypso":    // the den: armchair aimed at a telly that never sleeps
        dk(0.50, 0.70, 0.34,  1.22, 0.35, 1.05);
        dk(0.58, 0.46, 0.36,  1.22, 0.93, 1.05);
        gl(0.46, 0.34, 0.02,  1.22, 0.93, 0.855);
        dk(0.52, 0.32, 0.46, -1.22, 0.16, 0.95);
        dk(0.52, 0.70, 0.14, -1.22, 0.51, 1.21);
        dk(0.12, 0.42, 0.46, -0.98, 0.21, 0.95);
        dk(0.12, 0.42, 0.46, -1.46, 0.21, 0.95);
        break;
    }
  }

  // a solid wall with a central window: built from a frame of four
  // brick segments around an opening, plus a translucent pane
  // (black glass instead when the tenant has been freed).
  function addWindowWall(x, z, alongX, dark, owner){
    const L = CELL + WALL_T, T = WALL_T;
    const ow = L * 0.5, oh = WALL_H * 0.46, cy = 1.5;   // opening size + centre height
    const botH = cy - oh/2, topH = WALL_H - (cy + oh/2), sideW = (L - ow)/2;
    const glass = dark ? darkPaneMat : paneMat;
    const seg = (w, h, d, px, py, pz) => {
      const m = new three.Mesh(new three.BoxGeometry(w, h, d), brickMat);
      m.position.set(px, py, pz); scene.add(m);
    };
    if (alongX){
      seg(L, botH, T, x, botH/2, z);
      seg(L, topH, T, x, WALL_H - topH/2, z);
      seg(sideW, oh, T, x - (ow + sideW)/2, cy, z);
      seg(sideW, oh, T, x + (ow + sideW)/2, cy, z);
      const pane = new three.Mesh(new three.PlaneGeometry(ow, oh), glass);
      pane.position.set(x, cy, z); scene.add(pane);
    } else {
      seg(T, botH, L, x, botH/2, z);
      seg(T, topH, L, x, WALL_H - topH/2, z);
      seg(T, oh, sideW, x, cy, z - (ow + sideW)/2);
      seg(T, oh, sideW, x, cy, z + (ow + sideW)/2);
      const pane = new three.Mesh(new three.PlaneGeometry(ow, oh), glass);
      pane.rotation.y = Math.PI/2; pane.position.set(x, cy, z); scene.add(pane);
    }
    addCell(x, z, alongX, dark, ow, oh, cy, owner);   // the holding cell behind the glass
    addTrim(x, z, alongX);
    collide(x, z, alongX);   // still blocks the player
  }

  // a vista viewport: a wide neon-framed opening in a perimeter wall,
  // glazed near-clear, looking out onto the world vista.js builds in the
  // void. Dark mullions cross the glass; the opening's edges ride the
  // trim's neon (and its palette animation). Still a solid collider.
  function addVistaWindow(x, z, alongX){
    const L = CELL + WALL_T, T = WALL_T;
    const ow = 2.6, oh = 1.7, cy = 1.55;   // a broad viewport at eye height
    const botH = cy - oh/2, topH = WALL_H - (cy + oh/2), sideW = (L - ow)/2;
    const mat = pickMat(x, z, alongX);     // frame keeps the wall's own skin
    const seg = (w, h, d, px, py, pz, m = mat) => {
      const mesh = new three.Mesh(new three.BoxGeometry(w, h, d), m);
      mesh.position.set(px, py, pz); scene.add(mesh);
    };
    if (alongX){
      seg(L, botH, T, x, botH/2, z);
      seg(L, topH, T, x, WALL_H - topH/2, z);
      seg(sideW, oh, T, x - (ow + sideW)/2, cy, z);
      seg(sideW, oh, T, x + (ow + sideW)/2, cy, z);
      seg(ow, 0.05, T*0.5, x, cy, z, mullionMat);          // mullion cross
      seg(0.05, oh, T*0.5, x, cy, z, mullionMat);
      const pane = new three.Mesh(new three.PlaneGeometry(ow, oh), vistaPaneMat);
      pane.position.set(x, cy, z); scene.add(pane);
      trimBoxes.push(                                       // the glowing frame
        { w: ow + 0.12, h: 0.06, d: T + 0.06, x, y: cy + oh/2, z },
        { w: ow + 0.12, h: 0.06, d: T + 0.06, x, y: cy - oh/2, z },
        { w: 0.06, h: oh + 0.12, d: T + 0.06, x: x - ow/2, y: cy, z },
        { w: 0.06, h: oh + 0.12, d: T + 0.06, x: x + ow/2, y: cy, z });
    } else {
      seg(T, botH, L, x, botH/2, z);
      seg(T, topH, L, x, WALL_H - topH/2, z);
      seg(T, oh, sideW, x, cy, z - (ow + sideW)/2);
      seg(T, oh, sideW, x, cy, z + (ow + sideW)/2);
      seg(T*0.5, 0.05, ow, x, cy, z, mullionMat);
      seg(T*0.5, oh, 0.05, x, cy, z, mullionMat);
      const pane = new three.Mesh(new three.PlaneGeometry(ow, oh), vistaPaneMat);
      pane.rotation.y = Math.PI/2; pane.position.set(x, cy, z); scene.add(pane);
      trimBoxes.push(
        { w: T + 0.06, h: 0.06, d: ow + 0.12, x, y: cy + oh/2, z },
        { w: T + 0.06, h: 0.06, d: ow + 0.12, x, y: cy - oh/2, z },
        { w: T + 0.06, h: oh + 0.12, d: 0.06, x, y: cy, z: z - ow/2 },
        { w: T + 0.06, h: oh + 0.12, d: 0.06, x, y: cy, z: z + ow/2 });
    }
    addTrim(x, z, alongX);
    collide(x, z, alongX);   // still blocks the player
  }

  // perimeter walls (their far side is guaranteed void) roll a seeded
  // chance to open into a vista viewport; deeper floors have shed more of
  // their shell. Character windows and the goal's cyber wall always win.
  const vistaChance = 0.30 + 0.15 * chaos;
  function place(geo, x, z, alongX, cyber, boundary){
    const key = wallKey(x, z, alongX);
    if (windows.has(key)) addWindowWall(x, z, alongX, darkWindows.has(key), owners.get(key));
    else if (!cyber && boundary && rng(wallSeed(depth ?? 1, x, z, alongX) ^ 0x51E77)() < vistaChance)
      addVistaWindow(x, z, alongX);
    else addWall(geo, x, z, alongX, cyber);
  }
  const gx = goalCell.x, gy = goalCell.y;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++){
      const c = cells[y][x];
      if (y === 0 && c.N) place(geoH, cellCenter(x, CELL), 0, true, x === gx && gy === 0, true);
      if (c.S)            place(geoH, cellCenter(x, CELL), (y+1)*CELL, true, x === gx && (y === gy || y+1 === gy), y === N - 1);
      if (x === 0 && c.W) place(geoV, 0, cellCenter(y, CELL), false, y === gy && gx === 0, true);
      if (c.E)            place(geoV, (x+1)*CELL, cellCenter(y, CELL), false, y === gy && (x === gx || x+1 === gx), x === N - 1);
    }

  // the level's every strip of neon trim, as a single mesh + draw call
  if (trimBoxes.length) scene.add(new three.Mesh(mergeBoxGeos(three, trimBoxes), trimMat));
  // every tenant's furniture likewise: one dark mesh for the whole level
  if (cellPropBoxes.length) scene.add(new three.Mesh(mergeBoxGeos(three, cellPropBoxes), cellPropMat));

  addSigns(three, scene, cfg, scrawlable, size);          // before graffiti: signs claim their walls
  addCables(three, scene, cfg, cells, trimMat);
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

/* vertical neon sign boards on a few interior walls — the Protocol still
   advertising to corridors nobody shops in. Accents are drawn from the
   level's own colour set plus one warm amber, so the multi-colour signage
   stays in-palette. Unlit, so the bloom pass catches them. Signs claim
   their wall (splice) so graffiti never scrawls over them. */
function addSigns(three, scene, cfg, candidates, size){
  const { WALL_T, theme, depth } = cfg;
  const chaos = chaosFor(depth);
  const r = rng(((depth ?? 1) * 0xB0A4D5) >>> 0);
  const toHex = t => (Math.min(255, Math.round(t[0])) << 16)
                   | (Math.min(255, Math.round(t[1])) << 8)
                   |  Math.min(255, Math.round(t[2]));
  const accents = [theme.near, theme.mid, theme.far, [255, 179, 107]];
  const count = Math.min(candidates.length, 2 + Math.round(chaos * 4 + r() * 2));
  for (let i = 0; i < count && candidates.length; i++){
    const wall = candidates.splice(Math.floor(r() * candidates.length), 1)[0];
    let side = r() < 0.5 ? 1 : -1;
    if (wall.alongX){ if (wall.z <= 0.01) side = 1; else if (wall.z >= size - 0.01) side = -1; }
    else            { if (wall.x <= 0.01) side = 1; else if (wall.x >= size - 0.01) side = -1; }
    const mesh = new three.Mesh(
      new three.PlaneGeometry(0.6, 2.2),
      new three.MeshBasicMaterial({ map: signTexture(three, r), transparent: true,
                                    color: toHex(accents[Math.floor(r() * accents.length)]),
                                    depthWrite: false }));
    const along = r() * 1.6 - 0.8;
    const off = WALL_T/2 + 0.03;
    if (wall.alongX){
      mesh.position.set(wall.x + along, 1.85, wall.z + side * off);
      mesh.rotation.y = side > 0 ? 0 : Math.PI;
    } else {
      mesh.position.set(wall.x + side * off, 1.85, wall.z + along);
      mesh.rotation.y = side > 0 ? Math.PI/2 : -Math.PI/2;
    }
    scene.add(mesh);
  }
}

/* cable runs strung wall-to-wall across the corridors at ceiling height,
   sagging like they were hung in a hurry and never inspected since. Most
   are dead black rubber; the odd one is live and rides the trim's neon
   (and therefore the palette animation). Dead runs merge into one mesh,
   live runs into another — the whole harness is two draw calls. */
function addCables(three, scene, cfg, cells, trimMat){
  const { N, CELL, WALL_H, WALL_T, theme, depth } = cfg;
  const chaos = chaosFor(depth);
  const r = rng(((depth ?? 1) * 0xCAB1E5) >>> 0);
  const spots = [];
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++){
      const c = cells[y][x];
      if (c.N && c.S) spots.push({ x, y, axis: "z" });   // corridor runs E-W: cable spans N-S
      if (c.E && c.W) spots.push({ x, y, axis: "x" });   // corridor runs N-S: cable spans E-W
    }
  const darkGeos = [], liveGeos = [];
  const count = Math.min(spots.length, Math.round(4 + chaos * 7 + r() * 2));
  for (let i = 0; i < count && spots.length; i++){
    const s = spots.splice(Math.floor(r() * spots.length), 1)[0];
    const cx = cellCenter(s.x, CELL), cz = cellCenter(s.y, CELL);
    const off = r() * 2.4 - 1.2;                          // where along the corridor it hangs
    const yA = WALL_H - 0.08 - r() * 0.2;
    const sag = 0.3 + r() * 0.45;
    const half = CELL/2 - WALL_T/2;
    const a = s.axis === "z" ? new three.Vector3(cx + off, yA, cz - half)
                             : new three.Vector3(cx - half, yA, cz + off);
    const b = s.axis === "z" ? new three.Vector3(cx + off, yA - r() * 0.12, cz + half)
                             : new three.Vector3(cx + half, yA - r() * 0.12, cz + off);
    const mid = a.clone().lerp(b, 0.5);
    mid.y -= sag * 2;                                     // quadratic control: 2× dip ≈ true sag
    const live = r() < 0.25;
    const geo = new three.TubeGeometry(
      new three.QuadraticBezierCurve3(a, mid, b), 9, live ? 0.014 : 0.024, 5, false);
    (live ? liveGeos : darkGeos).push(geo);
  }
  const t3 = theme.texRgb;
  if (darkGeos.length){
    const dark = ((t3[0]*0.07|0) << 16) | ((t3[1]*0.07|0) << 8) | (t3[2]*0.07|0);
    scene.add(new three.Mesh(mergeGeos(three, darkGeos),
                             new three.MeshLambertMaterial({ color: dark })));
  }
  if (liveGeos.length)
    scene.add(new three.Mesh(mergeGeos(three, liveGeos), trimMat));
}
