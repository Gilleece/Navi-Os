/* ============================================================
   MAZE.EXE — environment
   The level shell: fog, ambient light, floor, ceiling, walls.
   Returns the wall collision boxes the player tests against.
   ============================================================ */
import { genMaze, cellCenter } from "./generator.js";
import { brickTexture, floorTexture } from "./textures.js";

/* builds the static environment into `scene`, returns
   { walls } — an array of axis-aligned boxes for collision */
export function buildEnvironment(three, scene, cfg){
  const { N, CELL, WALL_H, WALL_T } = cfg;
  const size = N * CELL;
  const cells = genMaze(N);

  scene.fog = new three.Fog(0x020604, 2, 26);
  scene.add(new three.AmbientLight(0x1a4d30, 0.9));

  // floor + ceiling
  const fTex = floorTexture(three); fTex.repeat.set(N, N);
  const floor = new three.Mesh(
    new three.PlaneGeometry(size, size),
    new three.MeshLambertMaterial({map:fTex}));
  floor.rotation.x = -Math.PI/2;
  floor.position.set(size/2, 0, size/2);
  scene.add(floor);
  const ceil = new three.Mesh(
    new three.PlaneGeometry(size, size),
    new three.MeshLambertMaterial({color:0x03130a}));
  ceil.rotation.x = Math.PI/2;
  ceil.position.set(size/2, WALL_H, size/2);
  scene.add(ceil);

  // walls
  const walls = [];
  const bTex = brickTexture(three); bTex.repeat.set(1.4, 1);
  const wallMat = new three.MeshLambertMaterial({map:bTex});
  const geoH = new three.BoxGeometry(CELL + WALL_T, WALL_H, WALL_T); // runs along X
  const geoV = new three.BoxGeometry(WALL_T, WALL_H, CELL + WALL_T); // runs along Z
  function addWall(geo, x, z, alongX){
    const m = new three.Mesh(geo, wallMat);
    m.position.set(x, WALL_H/2, z);
    scene.add(m);
    const hx = alongX ? (CELL + WALL_T)/2 : WALL_T/2;
    const hz = alongX ? WALL_T/2 : (CELL + WALL_T)/2;
    walls.push({minX:x-hx, maxX:x+hx, minZ:z-hz, maxZ:z+hz});
  }
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++){
      const c = cells[y][x];
      if (y === 0 && c.N) addWall(geoH, cellCenter(x, CELL), 0, true);
      if (c.S)            addWall(geoH, cellCenter(x, CELL), (y+1)*CELL, true);
      if (x === 0 && c.W) addWall(geoV, 0, cellCenter(y, CELL), false);
      if (c.E)            addWall(geoV, (x+1)*CELL, cellCenter(y, CELL), false);
    }

  return { walls, cells };
}
