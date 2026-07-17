/* ============================================================
   MAZE.EXE — the sanctum (the base depth)
   The room at the bottom of every cycle. Where the maze is low,
   tight and endless, the sanctum is one wide open hall under a
   roof four storeys up — deliberately the opposite of everywhere
   the player has been — with the Custodian's tower in the middle
   of it: a monolithic supercomputer, ringed by slow orbits, a
   light-beam anchoring it to the ceiling.

   Built by maze.js instead of a maze whenever the player descends
   from a base depth (10 / 20 / 30). Reuses the engine wholesale:
   the Custodian is a normal npc record (talked to like any
   character, no figure — the tower IS the figure), the exit ring
   is the normal narrative gate (flat on the floor until the
   audience is heard, then it rises), and the returned materials
   plug into the same slots the maze fills (paneMat / trimMat /
   cyberMat / ambient) so the palette's animated bands — including
   depth 30's dying flicker — play the room like they play the
   maze.
   ============================================================ */
import { floorTexture, ceilingTexture, panelTexture, glyphTexture } from "./textures.js";
import { characterById } from "./characters/characters.js";
import { eyeTexture } from "./vista.js";

export const ROOM   = 40;    // metres square — ~10 maze cells of open floor
export const ROOF_H = 14;    // vs the maze's 3.4: the first tall room in the game
const WALL_T = 0.6;

/* axis-aligned collision box helper (same shape player.js tests against) */
const box = (x, z, hx, hz) => ({ minX: x - hx, maxX: x + hx, minZ: z - hz, maxZ: z + hz });

export function buildSanctum(three, scene, M){
  const theme = M.theme;
  const C = ROOM / 2;                       // room centre; the tower stands here
  const walls = [];
  const spinners = [];

  // air: the fog pulls right back so the height and width actually read
  scene.fog = new three.Fog(theme.sceneFog, 4, 62);
  const ambient = new three.AmbientLight(theme.ambient, 1.6);
  scene.add(ambient);

  // floor + ceiling (subdivided so the point lights can pool — see environment.js)
  const SEG = 40;
  const fTex = floorTexture(three, theme); fTex.repeat.set(10, 10);
  const floor = new three.Mesh(
    new three.PlaneGeometry(ROOM, ROOM, SEG, SEG),
    new three.MeshLambertMaterial({ map: fTex }));
  floor.rotation.x = -Math.PI/2;
  floor.position.set(C, 0, C);
  scene.add(floor);
  const cTex = ceilingTexture(three, theme); cTex.repeat.set(10, 10);
  const ceil = new three.Mesh(
    new three.PlaneGeometry(ROOM, ROOM, SEG, SEG),
    new three.MeshLambertMaterial({ map: cTex }));
  ceil.rotation.x = Math.PI/2;
  ceil.position.set(C, ROOF_H, C);
  scene.add(ceil);

  // perimeter: four sheer panelled walls, four corner buttresses
  const pTex = panelTexture(three, theme); pTex.repeat.set(10, 4);
  const wallMat = new three.MeshLambertMaterial({ map: pTex });
  const mkWall = (x, z, alongX) => {
    const g = alongX
      ? new three.BoxGeometry(ROOM + WALL_T, ROOF_H, WALL_T)
      : new three.BoxGeometry(WALL_T, ROOF_H, ROOM + WALL_T);
    const m = new three.Mesh(g, wallMat);
    m.position.set(x, ROOF_H/2, z);
    scene.add(m);
    walls.push(alongX ? box(x, z, (ROOM + WALL_T)/2, WALL_T/2)
                      : box(x, z, WALL_T/2, (ROOM + WALL_T)/2));
  };
  mkWall(C, 0, true); mkWall(C, ROOM, true);
  mkWall(0, C, false); mkWall(ROOM, C, false);
  for (const [bx, bz] of [[1.2, 1.2], [ROOM-1.2, 1.2], [1.2, ROOM-1.2], [ROOM-1.2, ROOM-1.2]]){
    const m = new three.Mesh(new three.BoxGeometry(1.6, ROOF_H, 1.6), wallMat);
    m.position.set(bx, ROOF_H/2, bz);
    scene.add(m);
    walls.push(box(bx, bz, 0.8 + 0.1, 0.8 + 0.1));
  }

  // glowing materials, wired into the engine's live-recolour slots:
  //   paneMat/trimMat -> the tower's light bands + eye  (breathe with the palette)
  //   cyberMat        -> the beam to the ceiling        (pulses like the goal walls)
  const paneMat  = new three.MeshBasicMaterial({ color: theme.neon, fog: false });
  const trimMat  = paneMat;
  const cyberMat = new three.MeshBasicMaterial({ color: theme.neon, transparent: true,
                                                 opacity: 0.7, fog: false, side: three.DoubleSide,
                                                 depthWrite: false });   // the Eye draws through the beam

  /* ---------- the tower ---------- */
  const gTex = glyphTexture(three, theme); gTex.repeat.set(2, 6);
  const towerMat = new three.MeshLambertMaterial({ map: gTex });

  // plinth, column, crown
  const plinth = new three.Mesh(new three.BoxGeometry(5, 0.6, 5), wallMat);
  plinth.position.set(C, 0.3, C); scene.add(plinth);
  const column = new three.Mesh(new three.BoxGeometry(2.6, 11, 2.6), towerMat);
  column.position.set(C, 0.6 + 5.5, C); scene.add(column);
  const crown = new three.Mesh(new three.BoxGeometry(3.4, 0.8, 3.4), wallMat);
  crown.position.set(C, 12, C); scene.add(crown);
  walls.push(box(C, C, 2.6, 2.6));          // one collider covers plinth + column

  // light bands ringing the column every couple of metres
  for (let y = 2; y <= 10.5; y += 2.1){
    const band = new three.Mesh(new three.BoxGeometry(2.72, 0.12, 2.72), paneMat);
    band.position.set(C, y, C); scene.add(band);
  }
  // the reading eye: one bright slit on the face the player walks up to
  const eye = new three.Mesh(new three.BoxGeometry(1.8, 0.16, 0.08), paneMat);
  eye.position.set(C, 9.6, C + 1.34); scene.add(eye);
  // status column beneath it
  for (let i = 0; i < 5; i++){
    const led = new three.Mesh(new three.BoxGeometry(0.16, 0.1, 0.06), paneMat);
    led.position.set(C, 8.6 - i * 0.5, C + 1.32); scene.add(led);
  }

  // the beam: the tower holding onto the roof
  const beam = new three.Mesh(new three.CylinderGeometry(0.42, 0.58, ROOF_H - 12.4, 10, 1, true), cyberMat);
  beam.position.set(C, 12.4 + (ROOF_H - 12.4)/2, C);
  scene.add(beam);

  /* THE EYE — the watcher from every vista window (vista.js), finally home:
     perched at the tower's crown, tracking the player, blinking the same
     slow blink it blinks outside the glass. It hovers just off the crown's
     rim on the PLAYER'S side — sliding around as they circle the tower, so
     the crown can never hide it and it is always, always facing you. */
  const EYE_S = 1.8, EYE_R = 2.0, EYE_Y = 13.05, BLINK = 7.5;
  const theEye = new three.Mesh(
    new three.PlaneGeometry(1, 1),
    new three.MeshBasicMaterial({ map: eyeTexture(three, theme.near, theme.mid),
                                  transparent: true, depthWrite: false, fog: false }));
  theEye.position.set(C, EYE_Y, C + EYE_R);
  theEye.scale.set(EYE_S, EYE_S, 1);
  theEye.renderOrder = 1;                    // after the beam, so it reads through the light
  scene.add(theEye);
  const eyeLook = new three.Vector3();
  let eyeT = 1;                              // skip the t=0 blink on entry
  const eyeUpdate = dt => {
    eyeT += dt;
    if (M.camera){
      M.camera.getWorldPosition(eyeLook);
      const dx = eyeLook.x - C, dz = eyeLook.z - C;
      const h = Math.hypot(dx, dz) || 1;
      theEye.position.set(C + (dx / h) * EYE_R, EYE_Y, C + (dz / h) * EYE_R);
      theEye.lookAt(eyeLook);
    }
    const bt = eyeT % BLINK;
    const shut = bt < 0.28 ? Math.sin((bt / 0.28) * Math.PI) : 0;
    theEye.scale.set(EYE_S * (1 + 0.03 * Math.sin(eyeT * 0.8)),
                     EYE_S * Math.max(0.06, 1 - shut), 1);
  };

  // two slow orbits (driven by the main loop's spinner rotation)
  for (const [y, r] of [[4.6, 3.2], [8.4, 2.4]]){
    const ring = new three.Mesh(
      new three.TorusGeometry(r, 0.06, 8, 40),
      new three.MeshBasicMaterial({ color: theme.neon, fog: false, transparent: true, opacity: 0.8 }));
    ring.position.set(C, y, C);
    ring.rotation.x = Math.PI/2 + 0.18;
    spinners.push(ring);
    scene.add(ring);
  }

  // lighting: the tower's own halo, a shaft over the gate, a dim door-side fill
  const halo = new three.PointLight(theme.neon, 1.6, 26);
  halo.position.set(C, 10.5, C); scene.add(halo);
  const fill = new three.PointLight(0xffffff, 0.35, 30);
  fill.position.set(C, 3, ROOM - 6); scene.add(fill);

  /* ---------- the way onward: the normal narrative gate ---------- */
  const goal = new three.Mesh(
    new three.TorusGeometry(1.1, 0.12, 10, 32),
    new three.MeshBasicMaterial({ color: 0xff7a1a }));
  goal.position.set(C, 1.5, 6);             // behind the tower, opposite the door
  scene.add(goal);
  const goalLight = new three.PointLight(0xff7a1a, 1.4, 9);
  goalLight.position.set(C, 1.5, 6);
  scene.add(goalLight);

  /* ---------- the Custodian, as a normal npc ----------
     No cutout figure — the tower is the figure (updateCharacters skips
     records without one). The anchor point sits at the foot of the face
     with the eye, so the talk prompt fires as the player walks up. */
  const ch = characterById("custodian");
  const npcs = ch ? [{
    character: ch, x: C, z: C + 2.2,
    cell: null, figure: null, fx: C, fz: C + 1.4, baseY: 1.3,
    restYaw: 0, yaw: 0, anim: null,
  }] : [];

  return {
    walls, npcs, goal, goalLight, spinners,
    ambient, paneMat, trimMat, cyberMat,
    eye: { update: eyeUpdate },   // plugs into the M.vista per-frame slot
    // enter at the south wall, facing down the hall at the tower
    playerStart: { x: C, z: ROOM - 3.5, yaw: 0 },
  };
}
