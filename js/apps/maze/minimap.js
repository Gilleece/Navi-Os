/* ============================================================
   MAZE.EXE — minimap
   A fog-of-war overview: only corridors the player has actually
   seen are drawn (standing in a cell reveals it plus everything
   in a straight line down its open passages). The player is an
   arrow, characters appear as the first letter of their name
   (S = Scally, H = Homiss, …) once their window has been seen,
   and the exit ring shows once its cell is found — dim while the
   narrative gate holds it flat, bright orange when the way down
   is open.

   Drawn in the level's neon so it recolours with the palette.
   Two displays share the one canvas: a DOM element pinned
   top-right for desktop/touch, and — since the DOM isn't
   composited into immersive-vr — the same pixels textured onto
   a little "watch" worn on the left wrist in VR (initWristMap).
   ============================================================ */
import { $ } from "../../utils.js";
import { depthInCycle } from "./state.js";

const SIZE = 176;    // css pixels, square
const DPR  = 2;      // supersample for crisp lines

let canvas = null, g = null;
let cells = null, N = 0, CELL = 4, seen = null, goal = null;

function ensureCanvas(){
  if (canvas) return;
  canvas = document.createElement("canvas");
  canvas.id = "maze-map";
  canvas.width = SIZE * DPR; canvas.height = SIZE * DPR;
  g = canvas.getContext("2d");
  $("#maze-layer").appendChild(canvas);
}

export function buildMinimap(M, mazeCells, goalCell){
  ensureCanvas();
  cells = mazeCells;
  N = cells.length;
  CELL = M.CELL;
  goal = goalCell;
  seen = Array.from({ length: N }, () => Array(N).fill(false));   // fresh fog per level
}

/* no map for the sanctum: one open room needs no fog of war. updateMinimap
   no-ops until the next buildMinimap. */
export function clearMinimap(){
  seen = null;
  if (canvas) canvas.style.display = "none";
  if (watch) watch.group.visible = false;
}

/* reveal the player's cell plus everything visible in a straight line
   down each open passage (corridors are one cell wide, so this is what
   the player can actually see from where they stand) */
function reveal(cx, cz){
  seen[cz][cx] = true;
  for (const [d, dx, dz] of [["N",0,-1],["S",0,1],["E",1,0],["W",-1,0]]){
    let x = cx, z = cz;
    while (!cells[z][x][d]){
      x += dx; z += dz;
      if (x < 0 || z < 0 || x >= N || z >= N) break;
      seen[z][x] = true;
    }
  }
}

const clampCell = v => Math.max(0, Math.min(N - 1, v | 0));

/* --- VR wrist watch -------------------------------------------
   The map canvas doubles as a texture on a small square face worn
   like a watch on the left wrist. Grip-space axes (matching the
   hand model in hands.js): fingers -Z, wrist +Z, back of hand +Y,
   left thumb +X — so the watch sits just behind the palm at +Z,
   raised to +Y, facing out of the back of the hand, with the map's
   top toward the pinky side (-X): upright in the natural
   glance-at-your-watch pose, arm across the chest. */
const WATCH_FACE = 0.075;      // metres, square map face
let watch = null;              // { group, tex } once initWristMap has run

export function initWristMap(three, M){
  ensureCanvas();
  const tex = new three.CanvasTexture(canvas);
  const group = new three.Group();

  const plate = new three.Mesh(
    new three.BoxGeometry(WATCH_FACE + 0.012, 0.008, WATCH_FACE + 0.012),
    new three.MeshBasicMaterial({ color: 0x10181c, fog: false }));
  group.add(plate);

  const face = new three.Mesh(
    new three.PlaneGeometry(WATCH_FACE, WATCH_FACE),
    new three.MeshBasicMaterial({ map: tex, transparent: true, fog: false }));
  face.rotation.set(-Math.PI / 2, 0, Math.PI / 2);  // normal +Y, map top toward -X
  face.position.y = 0.005;                          // clear of the plate's top surface
  group.add(face);

  group.position.set(0, 0.03, 0.09);   // back of the wrist, just behind the palm
  group.visible = false;
  watch = { group, tex };
  M.dolly.add(group);                  // parked here until a left grip is known
}

/* show the watch on the left grip while a left controller is live;
   handedness only lands on the controller at its "connected" event,
   so (re)parenting is checked every frame */
function updateWatch(M){
  if (!watch) return;
  const session = M.inVR && M.renderer.xr.getSession && M.renderer.xr.getSession();
  const hasLeft = session && [...session.inputSources].some(s => s.handedness === "left");
  const i = hasLeft ? (M.controllers || []).findIndex(c => c.userData.handedness === "left") : -1;
  if (i < 0){ watch.group.visible = false; return; }
  if (watch.group.parent !== M.grips[i]) M.grips[i].add(watch.group);
  watch.group.visible = true;
  watch.tex.needsUpdate = true;        // push this frame's redraw to the GPU
}

/* --- signal decay -------------------------------------------------------
   The minimap is a Protocol instrument, and the Protocol fails toward the
   bottom of every cycle. Keyed on the SHOWN depth (depthInCycle, 1..10) so
   it resets when the Protocol recycles: clean through depth 05, static
   creeping in over 06-08, and dead ("MINIMAP OFFLINE") at 09-10. Shown
   depth 10 is always the sanctum, so the base depth reads offline too. */
function mapStatic(depth){
  const shown = depthInCycle(depth);
  if (shown >= 9) return "offline";
  if (shown >= 6) return 0.3 + (shown - 6) * 0.25;   // 0.30 / 0.55 / 0.80
  return 0;
}

/* TV-snow overlaid on whatever's already drawn. Re-randomised each frame,
   so it flickers. `intensity` 0..1 scales the speck count and brightness. */
function drawStatic(intensity){
  const px = SIZE * DPR;
  const specks = Math.floor(intensity * 900);
  for (let i = 0; i < specks; i++){
    const a = 0.05 + Math.random() * 0.5 * intensity;
    g.fillStyle = Math.random() < 0.5 ? `rgba(255,255,255,${a})` : `rgba(70,255,142,${a})`;
    g.fillRect(Math.random() * px, Math.random() * px, DPR * 0.9, DPR * 0.9);
  }
  const tears = Math.floor(intensity * 4 + Math.random() * 2);   // horizontal roll tears
  for (let i = 0; i < tears; i++){
    g.fillStyle = `rgba(190,225,205,${0.05 + Math.random() * 0.12 * intensity})`;
    g.fillRect(0, Math.random() * px, px, (Math.random() * 2 + 1) * DPR);
  }
}

/* the dead readout shown at shown-depth 09/10: heavy snow + a blinking
   "MINIMAP OFFLINE" warning. Redraws from scratch (ignores fog/goal). */
function drawOffline(){
  const px = SIZE * DPR;
  g.clearRect(0, 0, px, px);
  g.fillStyle = "rgba(4,8,10,0.92)"; g.fillRect(0, 0, px, px);
  drawStatic(0.9);
  g.strokeStyle = "rgba(255,90,60,0.5)"; g.lineWidth = 2 * DPR;
  g.strokeRect(3 * DPR, 3 * DPR, px - 6 * DPR, px - 6 * DPR);
  const blink = 0.55 + 0.45 * Math.sin(performance.now() * 0.006);
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = `rgba(255,90,60,${blink})`;
  g.font = `bold ${15 * DPR}px 'Share Tech Mono', monospace`;
  g.fillText("MINIMAP", px / 2, px / 2 - 11 * DPR);
  g.fillText("OFFLINE", px / 2, px / 2 + 11 * DPR);
  g.textAlign = "left"; g.textBaseline = "alphabetic";
}

/* call once per frame; redraws in the level neon. Desktop/touch reads
   the DOM canvas top-right; in VR the DOM layer isn't composited, so
   the same pixels show on the wrist watch instead */
export function updateMinimap(M){
  if (!canvas) return;
  canvas.style.display = M.inVR ? "none" : "block";

  const decay = mapStatic(M.depth);
  if (decay === "offline"){          // depth 09/10 (incl. the sanctum): dead instrument
    drawOffline();
    updateWatch(M);
    return;
  }
  if (!seen) return;                 // non-offline with no fog map (shouldn't happen: sanctum is shown 10)

  const px = M.dolly.position.x, pz = M.dolly.position.z;
  reveal(clampCell(px / CELL), clampCell(pz / CELL));

  const s = (SIZE * DPR) / (N * CELL);            // world units -> canvas px
  const neon = M.theme.neon;
  const nr = (neon >> 16) & 255, ng = (neon >> 8) & 255, nb = neon & 255;

  g.clearRect(0, 0, SIZE * DPR, SIZE * DPR);
  g.fillStyle = "rgba(4,8,10,0.8)";
  g.fillRect(0, 0, SIZE * DPR, SIZE * DPR);

  // revealed floor, then the walls of every revealed cell (shared walls
  // simply draw twice — cheaper than deduping and invisible on screen)
  g.fillStyle = `rgba(${nr},${ng},${nb},0.08)`;
  for (let z = 0; z < N; z++)
    for (let x = 0; x < N; x++)
      if (seen[z][x]) g.fillRect(x * CELL * s, z * CELL * s, CELL * s, CELL * s);

  g.strokeStyle = `rgba(${nr},${ng},${nb},0.85)`;
  g.lineWidth = 2; g.lineCap = "square";
  g.beginPath();
  for (let z = 0; z < N; z++)
    for (let x = 0; x < N; x++){
      if (!seen[z][x]) continue;
      const c = cells[z][x];
      const x0 = x * CELL * s, z0 = z * CELL * s, x1 = (x + 1) * CELL * s, z1 = (z + 1) * CELL * s;
      if (c.N){ g.moveTo(x0, z0); g.lineTo(x1, z0); }
      if (c.S){ g.moveTo(x0, z1); g.lineTo(x1, z1); }
      if (c.W){ g.moveTo(x0, z0); g.lineTo(x0, z1); }
      if (c.E){ g.moveTo(x1, z0); g.lineTo(x1, z1); }
    }
  g.stroke();

  // the exit ring, once its cell has been seen: dim while the narrative
  // gate holds it flat; pulsing once the way down is open, to draw the eye.
  // If it's open but its cell is still unexplored, a chevron pinned to the
  // map's edge gives the bearing without giving away the layout — the fog
  // of war stays honest, and a locked gate hints nothing at all.
  const gateOpen = !(M.gatePending && M.gatePending.length > 0);
  if (goal && seen[goal.y][goal.x]){
    const pulse = gateOpen ? 0.5 + 0.5 * Math.sin(performance.now() * 0.005) : 0;
    g.strokeStyle = gateOpen ? `rgba(255,122,26,${0.6 + 0.4 * pulse})` : "rgba(255,122,26,0.35)";
    g.lineWidth = 3;
    g.beginPath();
    g.arc((goal.x + 0.5) * CELL * s, (goal.y + 0.5) * CELL * s,
          CELL * s * (0.28 + 0.08 * pulse), 0, Math.PI * 2);
    g.stroke();
  } else if (goal && gateOpen){
    // bearing tick: walk the player->gate ray to the canvas border (inset a
    // hair so the chevron stays fully on the map) and point it outward
    const pxc = px * s, pzc = pz * s;
    let bx = (goal.x + 0.5) * CELL * s - pxc, bz = (goal.y + 0.5) * CELL * s - pzc;
    const bl = Math.hypot(bx, bz);
    if (bl > 1){
      bx /= bl; bz /= bl;
      const B = SIZE * DPR, inset = 7 * DPR;
      let t = Infinity;
      if (bx >  1e-6) t = Math.min(t, (B - inset - pxc) / bx);
      if (bx < -1e-6) t = Math.min(t, (inset - pxc) / bx);
      if (bz >  1e-6) t = Math.min(t, (B - inset - pzc) / bz);
      if (bz < -1e-6) t = Math.min(t, (inset - pzc) / bz);
      if (isFinite(t) && t >= 0){
        const ex = pxc + bx * t, ez = pzc + bz * t, r = 5 * DPR;
        const blink = 0.55 + 0.45 * Math.sin(performance.now() * 0.005);
        g.fillStyle = `rgba(255,122,26,${blink})`;
        g.beginPath();
        g.moveTo(ex + bx * r, ez + bz * r);
        g.lineTo(ex - bx * r * 0.7 - bz * r * 0.8, ez - bz * r * 0.7 + bx * r * 0.8);
        g.lineTo(ex - bx * r * 0.7 + bz * r * 0.8, ez - bz * r * 0.7 - bx * r * 0.8);
        g.closePath();
        g.fill();
      }
    }
  }

  // characters: first letter of the name, at their window, once seen
  g.font = `bold ${11 * DPR}px 'Share Tech Mono', monospace`;
  g.textAlign = "center"; g.textBaseline = "middle";
  for (const npc of M.npcs || []){
    if (!npc.cell || !seen[npc.cell.y][npc.cell.x]) continue;
    // nudge the letter off the window wall, into the cell it faces
    const lx = (npc.x * 0.6 + (npc.cell.x + 0.5) * CELL * 0.4) * s;
    const lz = (npc.z * 0.6 + (npc.cell.y + 0.5) * CELL * 0.4) * s;
    const letter = npc.character.letter ?? npc.character.name[0];
    g.fillStyle = "rgba(0,0,0,0.75)";
    g.fillRect(lx - 7 * DPR / 2, lz - 7 * DPR / 2, 7 * DPR, 7 * DPR);
    g.fillStyle = "#fff";
    g.fillText(letter, lx, lz + DPR);
  }

  // the player: an arrow at their position, pointing where they face.
  // Desktop facing is (-sin yaw, -cos yaw) — see player.js; in VR the
  // head does the turning on top of snap yaw, so read the headset pose
  // (matrixWorld columns: 8..10 is local Z, forward is its negation)
  let dx, dz;
  if (M.inVR){
    const e = M.renderer.xr.getCamera(M.camera).matrixWorld.elements;
    dx = -e[8]; dz = -e[10];
    const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
  } else {
    dx = -Math.sin(M.yaw); dz = -Math.cos(M.yaw);
  }
  const cx = px * s, cz = pz * s, r = 6 * DPR;
  g.fillStyle = "#fff";
  g.beginPath();
  g.moveTo(cx + dx * r, cz + dz * r);
  g.lineTo(cx - dx * r * 0.6 - dz * r * 0.55, cz - dz * r * 0.6 + dx * r * 0.55);
  g.lineTo(cx - dx * r * 0.6 + dz * r * 0.55, cz - dz * r * 0.6 - dx * r * 0.55);
  g.closePath();
  g.fill();

  // instrument decay: static creeps in over shown-depths 06-08 of each cycle
  if (decay) drawStatic(decay);

  updateWatch(M);
}
