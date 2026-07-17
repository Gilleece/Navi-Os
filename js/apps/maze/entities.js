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

   The maze also sheds one-of-a-kind story items (story.js
   WORLD_ITEMS) — pale solid shapes, collected the same way but
   landing in the inventory instead of the LT balance.
   ============================================================ */
import { cellCenter } from "./generator.js";
import { $ } from "../../utils.js";
import { player, addTokens, addItem, setFlag } from "./state.js";
import { spawnableItems } from "./story.js";
import { showVRBanner } from "./vrbanner.js";
import { playPickup } from "./audio.js";
import { toast as hudToast } from "./hud.js";

const PICKUP_R    = 0.9;   // how close the player must get to collect
const MAGNET_R    = 1.8;   // within this, a token drifts toward the player first
const COLLECT_TIME = 0.5;  // seconds of the collect pop before it's gone
const BURST_TIME   = 0.7;  // particle lifetime

/* the three denominations: value -> geometry maker, radius, colour.
   radius grows with value so the 5 LT reads as the fattest crystal. */
const KINDS = [
  { value: 1, color: 0xd98a3c, r: 0.26, geo: three => new three.TetrahedronGeometry(0.26) },
  { value: 3, color: 0x9fc6d8, r: 0.40, geo: three => new three.OctahedronGeometry(0.40) },
  { value: 5, color: 0xffd24a, r: 0.55, geo: three => new three.IcosahedronGeometry(0.55) },
];
/* what spawns each level: a handful of small ones, fewer big ones */
const SPAWN = [1, 1, 1, 3, 3, 5];   // 14 LT on the floor per level

/* the one-of-a-kind story items (story.js WORLD_ITEMS) read as pale,
   solid shapes — unmistakably not a wireframe token. Shape by `kind`. */
const ITEM_COLOR = 0xf5f2e8;
const ITEM_GEOS = {
  shard: three => new three.TetrahedronGeometry(0.3),
  vial:  three => new three.CylinderGeometry(0.11, 0.11, 0.46, 8),
  bone:  three => new three.BoxGeometry(0.1, 0.44, 0.1),
  shoe:  three => new three.TorusGeometry(0.2, 0.055, 6, 12, Math.PI * 1.5),  // horseshoe: an open torus
  card:  three => new three.BoxGeometry(0.3, 0.4, 0.02),                      // foil sticker: a thin card
  badge: three => new three.BoxGeometry(0.24, 0.34, 0.04),                    // lanyard: a hanging pass
  tome:  three => new three.BoxGeometry(0.34, 0.44, 0.1),                     // the Christmas TV guide, thick as a phone book
};

/* builds the maze's props into `scene`, returns
   { goal, goalLight, spinners, tokens }. The gate sits in `goalCell` -
   the dead-end where the walls are breaking down into cyberspace. */
export function buildEntities(three, scene, cfg, goalCell){
  const { N, CELL } = cfg;
  const spinners = [];
  cfg.bursts = [];                 // reset any particle bursts from the previous level

  // goal gate - at the dead-end goal cell. NOT in `spinners`: maze.js
  // drives its pose (it lies flat on the floor until the level's story
  // beats are heard — the narrative gate — then rises and tumbles).
  const gate = new three.Mesh(
    new three.TorusGeometry(1.1, 0.12, 10, 32),
    new three.MeshBasicMaterial({color:0xff7a1a}));
  gate.position.set(cellCenter(goalCell.x, CELL), 1.5, cellCenter(goalCell.y, CELL));
  scene.add(gate);
  const gateLight = new three.PointLight(0xff7a1a, 1.4, 9);
  gateLight.position.set(gate.position.x, 1.5, gate.position.z);
  scene.add(gateLight);

  // a light column over the ring: invisible while the narrative gate lies
  // flat, faded up by maze.js (updateGate) once the way down opens — so a
  // distant player can sight the open gate down a corridor
  const beam = new three.Mesh(
    new three.CylinderGeometry(0.42, 0.42, 3.2, 12, 1, true),
    new three.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0,
                                  depthWrite: false, side: three.DoubleSide,
                                  blending: three.AdditiveBlending }));
  beam.position.set(gate.position.x, 1.6, gate.position.z);
  beam.visible = false;
  scene.add(beam);

  // one interior cell per pickup, shuffled, so nothing spawns stacked on
  // anything else (or inside the goal cell where the gate already sits)
  const cells = [];
  for (let cx = 1; cx < N - 1; cx++)
    for (let cz = 1; cz < N - 1; cz++)
      if (!(cx === goalCell.x && cz === goalCell.y)) cells.push([cx, cz]);
  for (let i = cells.length - 1; i > 0; i--){
    const j = Math.random() * (i + 1) | 0;
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  const spot = () => {
    const [cx, cz] = cells.length ? cells.pop() : [1 + (Math.random()*(N-2) | 0), 1 + (Math.random()*(N-2) | 0)];
    return { x: cellCenter(cx, CELL) + (Math.random()*1.4 - 0.7),
             z: cellCenter(cz, CELL) + (Math.random()*1.4 - 0.7) };
  };

  // floating Labyrinth Tokens, scattered across interior cells
  const tokens = [];
  for (const value of SPAWN){
    const kind = KINDS.find(k => k.value === value);
    const mesh = new three.Mesh(kind.geo(three),
      new three.MeshBasicMaterial({ color: kind.color, wireframe: true }));
    const { x, z } = spot();
    const baseY = 1.6;
    mesh.position.set(x, baseY, z);
    mesh.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, 0);
    scene.add(mesh);
    tokens.push({ mesh, value, color: kind.color, baseY,
                  phase: Math.random()*Math.PI*2, spin: 1.0 + Math.random()*0.4,
                  collecting: false, t: 0 });
  }

  // the one-of-a-kind story items due at this depth (until someone finds them)
  for (const def of spawnableItems(cfg.depth)){
    const mesh = new three.Mesh((ITEM_GEOS[def.kind] ?? ITEM_GEOS.shard)(three),
      new three.MeshBasicMaterial({ color: ITEM_COLOR }));
    const { x, z } = spot();
    const baseY = 1.4;
    mesh.position.set(x, baseY, z);
    scene.add(mesh);
    tokens.push({ mesh, value: 0, item: def, color: ITEM_COLOR, baseY,
                  phase: Math.random()*Math.PI*2, spin: 0.5 + Math.random()*0.2,
                  collecting: false, t: 0 });
  }

  refreshTokenHud();
  return { goal: gate, goalLight: gateLight, beam, spinners, tokens };
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
      // magnet: once the player is close, the token drifts toward them (and
      // pulls harder the nearer it gets) so pickups feel eager, not passive
      const dist = Math.hypot(px - m.position.x, pz - m.position.z);
      if (dist < MAGNET_R && dist > 0.001){
        const pull = (1 - dist / MAGNET_R);            // 0 at the edge, 1 at the player
        const k = 1 - Math.exp(-dt * (3 + pull * 12));
        m.position.x += (px - m.position.x) * k * pull;
        m.position.z += (pz - m.position.z) * k * pull;
      }
      if (Math.hypot(px - m.position.x, pz - m.position.z) < PICKUP_R){
        tk.collecting = true; tk.t = 0;
        m.material.transparent = true;                 // so the collect pop can fade it out
        if (tk.item){
          // a one-of-a-kind story item: into the inventory, never respawns
          const { id, name, desc } = tk.item;
          addItem({ id, name, desc });
          setFlag(`found-${id}`);
          toast(`FOUND: ${name.toUpperCase()}`);
          if (cfg.inVR) showVRBanner(`FOUND: ${name.toUpperCase()}`, 1400);
          playPickup(5, m.position);                              // the grand chime — these are rare (positional)
        } else {
          addTokens(tk.value); refreshTokenHud();
          toast(`+${tk.value} LT`);                                // desktop/touch HUD flash
          if (cfg.inVR) showVRBanner(`+${tk.value} LT`, 1100);     // same head-locked banner as depth changes
          playPickup(tk.value, m.position);                        // synth blip, grander for bigger denominations (positional)
        }
        spawnBurst(three, scene, cfg, tk);
      }
    } else {
      tk.t += dt;
      const k = Math.min(1, tk.t / COLLECT_TIME);
      tk.spin = 8 + k * 36;                       // wind up as it goes
      m.scale.setScalar(1 + k * 0.9);             // pop outward...
      m.material.opacity = Math.max(0, 1 - k);    // ...as it fades away
      m.position.y = tk.baseY + k * 0.6;          // and lift a little
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

/* brief centre-screen flash (its snappier 1100ms timing; the shared toast
   owns #hud-msg). VR banners are fired separately at the call sites above. */
const toast = (msg) => hudToast(msg, { ms: 1100 });
