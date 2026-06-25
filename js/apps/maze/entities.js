/* ============================================================
   MAZE.EXE — entities
   Dynamic props that live in the maze: the goal gate and the
   floating relics (the old screensaver's spinning shapes).
   Returns the goal and the list of spinners the loop animates.
   ============================================================ */
import { cellCenter } from "./generator.js";

/* builds the maze's props into `scene`, returns
   { goal, spinners } */
export function buildEntities(three, scene, cfg){
  const { N, CELL } = cfg;
  const spinners = [];

  // goal gate — far corner
  const gate = new three.Mesh(
    new three.TorusGeometry(1.1, 0.12, 10, 32),
    new three.MeshBasicMaterial({color:0xff7a1a}));
  gate.position.set(cellCenter(N-1, CELL), 1.5, cellCenter(N-1, CELL));
  scene.add(gate);
  const gateLight = new three.PointLight(0xff7a1a, 1.4, 9);
  gateLight.position.copy(gate.position);
  scene.add(gateLight);
  spinners.push(gate);

  // floating relics
  for (let i = 0; i < 3; i++){
    const s = new three.Mesh(
      new three.IcosahedronGeometry(0.55),
      new three.MeshBasicMaterial({color:0x46ff8e, wireframe:true}));
    s.position.set(cellCenter(1 + Math.random()*(N-2)|0, CELL), 1.6, cellCenter(1 + Math.random()*(N-2)|0, CELL));
    scene.add(s);
    spinners.push(s);
  }

  return { goal: gate, spinners };
}
