/* ============================================================
   MAZE.EXE - entities
   Dynamic props that live in the maze: the goal gate and the
   floating Labyrinth Tokens (LT) the player collects for currency.
   The old screensaver's spinning shapes are now those tokens.

   Tokens come in three denominations, told apart by shape and size:
     1 LT - small tetrahedron (bronze)
     3 LT - mid octahedron    (steel)
     5 LT - large icosahedron (gold), the original floating shape
   Walk into one and it spins up, shrinks away and bursts into
   particles while the LT lands in your balance.
   ============================================================ */
import { cellCenter } from "./generator.js";
import { $ } from "../../utils.js";
import { player, addTokens } from "./state.js";

const PICKUP_R    = 0.9;   // how close the player must get to collect
const COLLECT_TIME = 0.55; // seconds of spin-and-shrink before it's gone
const BURST_TIME   = 0.7;  // particle lifetime

/* the three denominations: value -> geometry maker, radius, colour.
   radius grows with value so the 5 LT reads as the fattest crystal. */
const KINDS = [
  { value: 1, color: 0xd98a3c, r: 0.26, geo: three => new three.TetrahedronGeometry(0.26) },
  { value: 3, color: 0x9fc6d8, r: 0.40, geo: three => new three.OctahedronGeometry(0.40) },
  { value: 5, color: 0xffd24a, r: 0.55, geo: three => new three.IcosahedronGeometry(0.55) },
];
/* what spawns each level: a handful of small ones, fewer big ones */
const SPAWN = [1, 1, 1, 3, 3, 5];   // 12 LT on the floor per level

/* builds the maze's props into `scene`, returns
   { goal, spinners, tokens }. The gate sits in `goalCell` - the dead-end
   where the walls are breaking down into cyberspace. */
export function buildEntities(three, scene, cfg, goalCell){
  const { N, CELL } = cfg;
  const spinners = [];
  cfg.bursts = [];                 // reset any particle bursts from the previous level

  // goal gate - at the dead-end goal cell
  const gate = new three.Mesh(
    new three.TorusGeometry(1.1, 0.12, 10, 32),
    new three.MeshBasicMaterial({color:0xff7a1a}));
  gate.position.set(cellCenter(goalCell.x, CELL), 1.5, cellCenter(goalCell.y, CELL));
  scene.add(gate);
  const gateLight = new three.PointLight(0xff7a1a, 1.4, 9);
  gateLight.position.copy(gate.position);
  scene.add(gateLight);
  spinners.push(gate);

  // floating Labyrinth Tokens, scattered across interior cells
  const tokens = [];
  for (const value of SPAWN){
    const kind = KINDS.find(k => k.value === value);
    const mesh = new three.Mesh(kind.geo(three),
      new three.MeshBasicMaterial({ color: kind.color, wireframe: true }));
    const cx = 1 + (Math.random()*(N-2) | 0), cz = 1 + (Math.random()*(N-2) | 0);
    const baseY = 1.6;
    mesh.position.set(cellCenter(cx, CELL), baseY, cellCenter(cz, CELL));
    mesh.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, 0);
    scene.add(mesh);
    tokens.push({ mesh, value, color: kind.color, baseY,
                  phase: Math.random()*Math.PI*2, spin: 1.0 + Math.random()*0.4,
                  collecting: false, t: 0 });
  }

  refreshTokenHud();
  return { goal: gate, spinners, tokens };
}

/* per-frame: float + spin the tokens, collect any the player walks into,
   and run the pickup + particle animations. Call from the main loop
   (skip while a conversation is open, like the rest of the world). */
export function updateTokens(three, scene, cfg, dt){
  const tokens = cfg.tokens || [];
  const px = cfg.dolly.position.x, pz = cfg.dolly.position.z;
  const now = performance.now() * 0.001;

  for (let i = tokens.length - 1; i >= 0; i--){
    const tk = tokens[i], m = tk.mesh;
    m.rotation.y += dt * tk.spin;
    m.rotation.x += dt * tk.spin * 0.5;

    if (!tk.collecting){
      m.position.y = tk.baseY + Math.sin(now * 1.6 + tk.phase) * 0.12;   // idle bob
      if (Math.hypot(px - m.position.x, pz - m.position.z) < PICKUP_R){
        tk.collecting = true; tk.t = 0;
        addTokens(tk.value); refreshTokenHud();
        toast(`+${tk.value} LT`);
        spawnBurst(three, scene, cfg, tk);
      }
    } else {
      tk.t += dt;
      const k = Math.min(1, tk.t / COLLECT_TIME);
      tk.spin = 8 + k * 36;                       // wind up as it goes
      m.scale.setScalar(Math.max(0, 1 - k));      // shrink to nothing
      m.position.y = tk.baseY + k * 0.8;          // and lift away
      if (k >= 1){ scene.remove(m); m.geometry.dispose(); m.material.dispose(); tokens.splice(i, 1); }
    }
  }

  updateBursts(scene, cfg, dt);
}

/* a quick outward spray of points where a token was grabbed */
function spawnBurst(three, scene, cfg, tk){
  const COUNT = 22;
  const pos = new Float32Array(COUNT * 3);
  const vel = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++){
    const dx = Math.random()*2 - 1, dy = Math.random()*2 - 1, dz = Math.random()*2 - 1;
    const l = Math.hypot(dx, dy, dz) || 1, sp = 1.0 + Math.random()*1.8;
    vel[i*3] = dx/l*sp; vel[i*3+1] = dy/l*sp + 0.7; vel[i*3+2] = dz/l*sp;
  }
  const geo = new three.BufferGeometry();
  geo.setAttribute("position", new three.BufferAttribute(pos, 3));
  const pts = new three.Points(geo, new three.PointsMaterial({
    color: tk.color, size: 0.09, transparent: true, opacity: 1,
    depthWrite: false, blending: three.AdditiveBlending }));
  pts.position.copy(tk.mesh.position);
  scene.add(pts);
  (cfg.bursts ??= []).push({ pts, vel, t: 0 });
}

function updateBursts(scene, cfg, dt){
  const bursts = cfg.bursts || [];
  for (let i = bursts.length - 1; i >= 0; i--){
    const b = bursts[i]; b.t += dt;
    const p = b.pts.geometry.attributes.position.array;
    for (let j = 0; j < p.length; j += 3){
      p[j]   += b.vel[j]   * dt;
      p[j+1] += b.vel[j+1] * dt;
      p[j+2] += b.vel[j+2] * dt;
      b.vel[j+1] -= 2.4 * dt;                 // gravity drags the spray down
    }
    b.pts.geometry.attributes.position.needsUpdate = true;
    b.pts.material.opacity = Math.max(0, 1 - b.t / BURST_TIME);
    if (b.t >= BURST_TIME){
      scene.remove(b.pts); b.pts.geometry.dispose(); b.pts.material.dispose();
      bursts.splice(i, 1);
    }
  }
}

/* keep the on-screen LT counter in sync with the player's balance */
export function refreshTokenHud(){
  const el = $("#hud-lt");
  if (el) el.textContent = `◈ ${player.tokens} LT`;
}

/* brief centre-screen flash (its own timer so it doesn't fight the
   dialogue toast that shares #hud-msg) */
function toast(msg){
  const el = $("#hud-msg");
  if (!el) return;
  el.textContent = msg; el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 1100);
}
