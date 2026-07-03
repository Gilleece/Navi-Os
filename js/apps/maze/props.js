/* ============================================================
   MAZE.EXE — props (set dressing + atmosphere)
   The junk the Labyrinth Protocol has shed: small crates, dead
   terminals, canisters, cable coils scattered in cell corners
   where they can't block a path, plus one larger centrepiece
   (server rack / big crate / terminal kiosk) parked against the
   back wall of a few dead-ends. Also owns the atmosphere layer:
   drifting neon "data motes" that give the fog a digital texture,
   and the ceiling light grid described below.

   Layout is seeded from the depth (same convention as the walls),
   skipping the start, the goal cell and any cell hosting a
   character window. Centrepieces get collision boxes (pushed into
   cfg.walls, the same list the player tests); the small junk is
   ankle-height and doesn't collide.

   THE LIGHT GRID: nearly every cell carries a glowing ceiling
   fixture (a cheap emissive panel), and a budget of real point
   lights is spread among them so the maze reads as lit by its own
   fixtures rather than by magic. Every fixture sits on one of a
   few flicker CHANNELS: steady, stuttering, or faulty (cuts out
   and re-strikes). How many fixtures misbehave ramps with depth
   (chaosFor, like the walls): depth 1 has the odd stutter, depth
   30 barely holds its light. The real lights follow their cell's
   channel, so panel and pool die together.

   In VR the small junk is GRABBABLE: squeeze the grip near a
   piece to pick it up (the same squeeze that curls the hand in
   hands.js), let go to drop or throw it. A deliberately tiny
   physics loop — gravity, floor bounce, wall bounce off the
   existing collision boxes, then the piece rights itself and goes
   back to sleep. Pure toy: nothing gameplay-relevant, it just
   keeps VR feeling immersive. Desktop/touch see the same props,
   minus the grabbing.

   Glow materials (screens, LEDs, motes, light wells) are returned
   in fx.glow so maze.js can recolour them per-frame on animated
   palette bands, exactly like the pane/trim materials.
   ============================================================ */
import { cellCenter, solidSides } from "./generator.js";
import { rng } from "./palette.js";
import { chaosFor } from "./environment.js";
import { crateTexture, screenTexture, ledTexture } from "./textures.js";

const GRAB_R      = 0.5;    // how close the hand must be to grab a piece
const THROW_BOOST = 1.25;   // hand velocity -> throw velocity
const MAX_THROW   = 7;      // m/s cap so nothing gets ballistic
const GRAV        = 9.0;
const REST        = 0.38;   // bounce restitution (floor + walls)

/* stepped value noise ~0..1, holds briefly — same feel as palette.js */
const frac  = x => x - Math.floor(x);
const noise = x => frac(Math.sin(Math.floor(x) * 127.1) * 43758.5453);
/* shortest signed angle, wrapped to (-π, π] */
const wrap  = a => Math.atan2(Math.sin(a), Math.cos(a));

/* dark prop shades follow the wall texture rules: theme.texRgb is the
   neon on solid bands and grey on the rest (lights supply the colour) */
const shade = (t3, f) => ((t3[0]*f|0) << 16) | ((t3[1]*f|0) << 8) | (t3[2]*f|0);

function box(three, w, h, d, mat){ return new three.Mesh(new three.BoxGeometry(w, h, d), mat); }

/* ---------- the small grabbable junk ----------
   Every builder returns { group, restY, r }: the group's origin sits at
   the piece's centre with +Y up, restY is where that origin rides when
   the piece rests on the floor, r is a coarse grab/bounce radius. Any
   built-in orientation lives on the inner meshes — the group's rotation
   belongs to the physics (tumble in flight, settle upright at rest). */

function mkCrate(three, mats, s){
  const g = new three.Group();
  g.add(box(three, s, s, s, mats.crate));
  return { group: g, restY: s/2, r: s*0.72 };
}

function mkTerminal(three, mats){
  const g = new three.Group();
  g.add(box(three, 0.34, 0.28, 0.26, mats.dark));
  const screen = new three.Mesh(new three.PlaneGeometry(0.26, 0.2), mats.screen);
  screen.position.set(0, 0.01, 0.131);
  g.add(screen);
  return { group: g, restY: 0.14, r: 0.26 };
}

function mkCanister(three, mats){
  const g = new three.Group();
  const body = new three.Mesh(new three.CylinderGeometry(0.11, 0.11, 0.34, 10), mats.mid);
  g.add(body);
  const band = new three.Mesh(new three.CylinderGeometry(0.112, 0.112, 0.045, 10), mats.glow);
  band.position.y = 0.06;
  g.add(band);
  return { group: g, restY: 0.17, r: 0.2 };
}

function mkBoard(three, mats){
  const g = new three.Group();
  g.add(box(three, 0.34, 0.026, 0.24, mats.dark));
  const leds = new three.Mesh(new three.PlaneGeometry(0.3, 0.2), mats.led);
  leds.rotation.x = -Math.PI/2;
  leds.position.y = 0.015;
  g.add(leds);
  return { group: g, restY: 0.013, r: 0.21 };
}

function mkCoil(three, mats){
  const g = new three.Group();
  const t = new three.Mesh(new three.TorusGeometry(0.16, 0.05, 8, 16), mats.mid);
  t.rotation.x = Math.PI/2;
  g.add(t);
  return { group: g, restY: 0.05, r: 0.21 };
}

/* ---------- the dead-end centrepieces ----------
   Built facing +Z (toward the dead-end's opening); w/d is the footprint
   used for the collision box. These are furniture, not toys. */

function mkRack(three, mats){
  const g = new three.Group();
  const body = box(three, 0.72, 1.9, 0.55, mats.dark);
  body.position.y = 0.95;
  g.add(body);
  const face = new three.Mesh(new three.PlaneGeometry(0.6, 1.7), mats.led);
  face.position.set(0, 0.95, 0.281);
  g.add(face);
  const stem = new three.Mesh(new three.CylinderGeometry(0.012, 0.012, 0.3, 5), mats.dark);
  stem.position.set(-0.22, 2.05, -0.15);
  g.add(stem);
  const tip = new three.Mesh(new three.SphereGeometry(0.03, 8, 8), mats.glow);
  tip.position.set(-0.22, 2.2, -0.15);
  g.add(tip);
  return { group: g, w: 0.72, d: 0.55 };
}

function mkBigCrate(three, mats){
  const g = new three.Group();
  const geo = new three.BoxGeometry(1.15, 1.15, 1.15);
  const body = new three.Mesh(geo, mats.crate);
  body.position.y = 0.575;
  g.add(body);
  const edges = new three.LineSegments(new three.EdgesGeometry(geo), mats.line);
  edges.position.y = 0.575;
  g.add(edges);
  return { group: g, w: 1.15, d: 1.15 };
}

function mkKiosk(three, mats){
  const g = new three.Group();
  const pedestal = box(three, 0.6, 1.05, 0.42, mats.dark);
  pedestal.position.y = 0.525;
  g.add(pedestal);
  const head = box(three, 0.66, 0.5, 0.12, mats.dark);
  head.position.set(0, 1.28, 0.05);
  head.rotation.x = -0.32;                     // tilted up at whoever's left to read it
  const screen = new three.Mesh(new three.PlaneGeometry(0.56, 0.4), mats.screen);
  screen.position.z = 0.065;
  head.add(screen);
  g.add(head);
  return { group: g, w: 0.66, d: 0.6 };
}

/* ---------- build ----------
   Call after buildEnvironment (colliders go into cfg.walls) with the
   character spawns so their host cells stay clear. Returns
   { props, fx } — props are the grabbable pieces updateProps steps,
   fx carries the glow materials + light wells + motes. */
export function buildProps(three, scene, cfg, cells, goalCell, spawns){
  const { N, CELL, WALL_H, WALL_T, theme, depth } = cfg;
  const size = N * CELL;

  // a piece still in the player's hand rides the dolly and survives the
  // level teardown — pull it out and free it before the lists reset
  for (const p of cfg.props ?? []){
    if (!p.group.parent) continue;
    p.group.parent.remove(p.group);
    p.group.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) for (const m of [].concat(o.material)){
        if (m.map) m.map.dispose();
        m.dispose();
      }
    });
  }
  for (const g of cfg.grabs ?? []) if (g) g.held = null;

  const r = rng(((depth ?? 1) * 0x2F6E2B1) >>> 0);
  const props = [];
  const glow  = [];

  // one set of materials per level; the glow ones are recoloured by the
  // animated bands via fx.glow, the Lambert ones are painted by the lights
  const t3 = theme.texRgb;
  const mats = {
    crate:  new three.MeshLambertMaterial({ map: crateTexture(three, theme, r) }),
    dark:   new three.MeshLambertMaterial({ color: shade(t3, 0.10) }),
    mid:    new three.MeshLambertMaterial({ color: shade(t3, 0.16) }),
    screen: new three.MeshBasicMaterial({ map: screenTexture(three, r), color: theme.neon }),
    led:    new three.MeshBasicMaterial({ map: ledTexture(three, r), color: theme.neon }),
    glow:   new three.MeshBasicMaterial({ color: theme.neon }),
    line:   new three.LineBasicMaterial({ color: theme.neon, transparent: true, opacity: 0.7 }),
  };
  glow.push(mats.screen, mats.led, mats.glow, mats.line);

  // cells that must stay clear of props: start, goal, character windows
  const skip = new Set(["0,0", `${goalCell.x},${goalCell.y}`]);
  for (const s of spawns ?? []) skip.add(`${s.cell.x},${s.cell.y}`);

  /* register a grabbable piece at a world spot (y defaults to floor rest) */
  const place = (piece, x, z, yaw = 0, y = null) => {
    piece.group.position.set(x, y ?? piece.restY, z);
    piece.group.rotation.y = yaw;
    scene.add(piece.group);
    props.push({ group: piece.group, restY: piece.restY, r: piece.r,
                 vel: new three.Vector3(), spin: new three.Vector3(),
                 state: "idle", settle: false });
  };

  // ---- dead-end centrepieces: something larger where the maze stops ----
  const OPEN_DIRS = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
  const deadEnds = [];
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++){
      if (skip.has(x + "," + y)) continue;
      const c = cells[y][x];
      if (solidSides(c).length !== 3) continue;
      const open = ["N", "S", "E", "W"].find(d => !c[d]);
      deadEnds.push({ x, y, open });
    }
  for (let i = deadEnds.length - 1; i > 0; i--){               // seeded shuffle
    const j = r() * (i + 1) | 0;
    [deadEnds[i], deadEnds[j]] = [deadEnds[j], deadEnds[i]];
  }
  const CENTREPIECES = [mkRack, mkBigCrate, mkKiosk];
  const kindOff = r() * CENTREPIECES.length | 0;
  deadEnds.slice(0, 4).forEach((de, i) => {
    skip.add(de.x + "," + de.y);                                // no junk underfoot too
    const piece = CENTREPIECES[(i + kindOff) % CENTREPIECES.length](three, mats);
    const [ox, oz] = OPEN_DIRS[de.open];
    const bx = -ox, bz = -oz;                                   // back wall = opposite the opening
    const cx = cellCenter(de.x, CELL), cz = cellCenter(de.y, CELL);
    const off = CELL/2 - WALL_T/2 - piece.d/2 - 0.07;
    piece.group.position.set(cx + bx * off, 0, cz + bz * off);
    piece.group.rotation.y = Math.atan2(-bx, -bz);              // face the opening
    scene.add(piece.group);
    // furniture blocks the player (and bounces thrown junk) like a wall;
    // rotations are right angles, so swap the footprint on the X axis
    const hx = (bx ? piece.d : piece.w)/2 + 0.05;
    const hz = (bx ? piece.w : piece.d)/2 + 0.05;
    const p = piece.group.position;
    cfg.walls.push({ minX: p.x - hx, maxX: p.x + hx, minZ: p.z - hz, maxZ: p.z + hz });
  });

  // ---- corner junk: a scatter of small pieces, never in the walkway ----
  // corners sit ~1.05-1.35 from the cell centre; the corridor is 3.5 wide,
  // so even a fat piece leaves the whole path clear
  for (let cy = 0; cy < N; cy++)
    for (let cx = 0; cx < N; cx++){
      if (skip.has(cx + "," + cy)) continue;
      if (r() > 0.17) continue;
      const wx = cellCenter(cx, CELL), wz = cellCenter(cy, CELL);
      const sx = r() < 0.5 ? -1 : 1, sz = r() < 0.5 ? -1 : 1;
      const px = wx + sx * (1.05 + r() * 0.3);
      const pz = wz + sz * (1.05 + r() * 0.3);
      const kind = r();
      if (kind < 0.35){
        // a stack of small crates, each its own grabbable piece
        const n = 1 + (r() < 0.6 ? 1 : 0) + (r() < 0.3 ? 1 : 0);
        let topY = 0;
        for (let k = 0, s = 0.3 + r() * 0.12; k < n; k++, s *= 0.82){
          place(mkCrate(three, mats, s),
                px + (r() * 0.12 - 0.06), pz + (r() * 0.12 - 0.06),
                r() * Math.PI, topY + s/2);
          topY += s;
        }
      } else if (kind < 0.55){
        const term = mkTerminal(three, mats);
        if (r() < 0.5){                            // sometimes propped on a crate
          const s = 0.3 + r() * 0.08;
          place(mkCrate(three, mats, s), px, pz, r() * Math.PI);
          place(term, px, pz, r() * Math.PI * 2, s + term.restY);
        } else {
          place(term, px, pz, r() * Math.PI * 2);
        }
      } else if (kind < 0.7){
        place(mkCanister(three, mats), px, pz, r() * Math.PI);
        if (r() < 0.5) place(mkCanister(three, mats), px + 0.2, pz - 0.14, r() * Math.PI);
      } else if (kind < 0.85){
        place(mkBoard(three, mats), px, pz, r() * Math.PI * 2);
      } else {
        place(mkCoil(three, mats), px, pz, r() * Math.PI * 2);
      }
    }

  // ---- the light grid: a ceiling fixture in nearly every cell ----------
  // Panels are cheap emissive quads on shared per-channel materials, so a
  // whole level of fixtures costs five materials. Channel 0 is steady;
  // 1-2 stutter; 3-4 are faulty tubes that cut out. How many fixtures land
  // on a misbehaving channel ramps with depth, like the wall decay.
  const chaos     = chaosFor(depth);
  const flickFrac = Math.min(0.85, 0.06 + 0.7 * chaos);   // fixtures that misbehave at all
  const faultBias = 0.25 + 0.55 * chaos;                  // of those, how many cut out hard
  const chans = Array.from({ length: 5 }, (_, i) => ({
    kind: i === 0 ? "steady" : i <= 2 ? "stutter" : "faulty",
    seed: r() * 100,
    mat:  new three.MeshBasicMaterial({ color: theme.neon, transparent: true, opacity: 0.85 }),
  }));
  glow.push(...chans.map(c => c.mat));

  const panelGeo = new three.PlaneGeometry(1.1, 1.1);
  const fixtures = [];                                    // cells that got a fixture
  for (let cy = 0; cy < N; cy++)
    for (let cx = 0; cx < N; cx++){
      if (cx === goalCell.x && cy === goalCell.y) continue;   // the gate lights itself
      if (r() > 0.88) continue;                               // the odd dead socket
      let ch = 0;
      if (r() < flickFrac) ch = r() < faultBias ? 3 + (r() * 2 | 0) : 1 + (r() * 2 | 0);
      const wx = cellCenter(cx, CELL), wz = cellCenter(cy, CELL);
      const panel = new three.Mesh(panelGeo, chans[ch].mat);
      panel.rotation.x = Math.PI/2;                           // face down, like the ceiling
      panel.position.set(wx, WALL_H - 0.02, wz);
      scene.add(panel);
      fixtures.push({ x: cx, y: cy, wx, wz, ch });
    }

  // real point lights on a budget, spread across the grid so every stretch
  // of corridor sits in somebody's pool; each follows its fixture's channel
  for (let i = fixtures.length - 1; i > 0; i--){              // seeded shuffle
    const j = r() * (i + 1) | 0;
    [fixtures[i], fixtures[j]] = [fixtures[j], fixtures[i]];
  }
  const lights = [];
  for (const f of fixtures){
    if (lights.length >= 6) break;
    if (lights.some(l => Math.abs(l.cx - f.x) + Math.abs(l.cy - f.y) < 3)) continue;
    const light = new three.PointLight(theme.neon, 0.75, 9);
    light.position.set(f.wx, WALL_H - 0.8, f.wz);
    scene.add(light);
    lights.push({ light, base: 0.75, ch: f.ch, cx: f.x, cy: f.y });
  }

  // ---- data motes: the fog, made digital ------------------------------
  // a slow upward drift of neon specks through the whole maze volume;
  // additive + fogged, so distance swallows them like everything else
  const COUNT = 240;
  const pos = new Float32Array(COUNT * 3);
  const vel = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++){
    pos[i*3]   = r() * size;
    pos[i*3+1] = 0.15 + r() * (WALL_H - 0.3);
    pos[i*3+2] = r() * size;
    vel[i*3]   = (r() - 0.5) * 0.1;
    vel[i*3+1] = 0.04 + r() * 0.12;
    vel[i*3+2] = (r() - 0.5) * 0.1;
  }
  const geo = new three.BufferGeometry();
  geo.setAttribute("position", new three.BufferAttribute(pos, 3));
  const moteMat = new three.PointsMaterial({
    color: theme.neon, size: 0.045, sizeAttenuation: true,
    transparent: true, opacity: 0.55, depthWrite: false,
    blending: three.AdditiveBlending });
  glow.push(moteMat);
  const motePts = new three.Points(geo, moteMat);
  scene.add(motePts);

  return { props, fx: { glow, chans, lights, motes: { geo, pos, vel, count: COUNT, size, top: WALL_H } } };
}

/* ---------- per-frame ----------
   Atmosphere (motes + light wells) runs every frame, dialogue or not —
   the world keeps breathing. Grabbing tracks every frame too (so a held
   piece can still be dropped), but new grabs and the throw physics pause
   while a conversation is open, like the rest of the world. */
export function updateProps(three, M, dt){
  const fx = M.propFx;
  if (fx){
    const mo = fx.motes;
    for (let i = 0; i < mo.count; i++){
      let x = mo.pos[i*3] + mo.vel[i*3] * dt;
      let y = mo.pos[i*3+1] + mo.vel[i*3+1] * dt;
      let z = mo.pos[i*3+2] + mo.vel[i*3+2] * dt;
      if (y > mo.top - 0.1) y = 0.15;
      if (x < 0) x += mo.size; else if (x > mo.size) x -= mo.size;
      if (z < 0) z += mo.size; else if (z > mo.size) z -= mo.size;
      mo.pos[i*3] = x; mo.pos[i*3+1] = y; mo.pos[i*3+2] = z;
    }
    mo.geo.attributes.position.needsUpdate = true;

    // one brightness per channel per frame; panels and their pooled lights
    // read the same value, so a fixture and its light die together
    const t = performance.now() * 0.001;
    for (const c of fx.chans){
      c.k = channelK(c, t);
      c.mat.opacity = 0.2 + 0.72 * c.k;
    }
    for (const l of fx.lights){
      l.light.intensity = l.base * fx.chans[l.ch].k;
      l.light.color.copy(M.lamp.color);                         // follows the animated bands
    }
  }

  if (M.props && M.props.length){
    updateGrabs(three, M, dt);
    if (!M.dialogueOpen) stepPhysics(M, dt);
  }
}

/* brightness 0..~1 for a flicker channel at time t. Steady barely breathes;
   stutter wobbles and occasionally dips; faulty mostly holds, then cuts to
   near-black and re-strikes — brief and never to full black, same
   photosensitivity care as the palette's flicker band. */
function channelK(c, t){
  if (c.kind === "steady") return 0.93 + 0.07 * Math.sin(t * 1.3 + c.seed);
  if (c.kind === "stutter"){
    let k = 0.78 + 0.22 * Math.sin(t * 2.1 + c.seed);
    if (noise(t * 6 + c.seed) < 0.1) k *= 0.45;
    return k;
  }
  let k = 0.85 + 0.15 * Math.sin(t * 1.9 + c.seed);   // faulty
  const n = noise(t * 8 + c.seed);
  if (n < 0.14) k *= 0.07;
  else if (n < 0.26) k *= 0.5;
  return k;
}

/* ---------- VR grabbing ---------- */

function grabStateFor(three, M, i){
  M.grabs ??= [];
  return M.grabs[i] ??= {
    held: null, prev: false, has: false,
    pos: new three.Vector3(), vel: new three.Vector3(),
    tmp: new three.Vector3(), inst: new three.Vector3(),
  };
}

function updateGrabs(three, M, dt){
  const session = M.renderer.xr.getSession && M.renderer.xr.getSession();
  if (!session) return;

  for (const src of session.inputSources){
    const gp = src.gamepad;
    if (!gp) continue;
    const i = (M.controllers || []).findIndex(c => c.userData.handedness === src.handedness);
    if (i < 0) continue;
    const g = grabStateFor(three, M, i);
    const grip = M.grips[i];

    // hand velocity: smoothed world-space delta of the grip, for the throw
    grip.getWorldPosition(g.tmp);
    if (g.has && dt > 0){
      g.inst.copy(g.tmp).sub(g.pos).divideScalar(dt);
      g.vel.lerp(g.inst, 0.4);
    }
    g.pos.copy(g.tmp);
    g.has = true;

    // a rebuild can have freed the held piece under us
    if (g.held && g.held.group.parent !== grip) g.held = null;

    const squeezing = !!(gp.buttons[1] && gp.buttons[1].pressed);
    if (squeezing && !g.prev && !g.held && !M.dialogueOpen) tryGrab(M, g, grip);
    if (!squeezing && g.held) release(M, g);
    g.prev = squeezing;
  }
}

function tryGrab(M, g, grip){
  let best = null, bestD = GRAB_R;
  for (const p of M.props){
    if (p.state === "held") continue;
    const d = p.group.position.distanceTo(g.pos);   // idle/flying pieces live in scene space
    if (d < bestD){ best = p; bestD = d; }
  }
  if (!best) return;
  wakeAbove(M, best);                               // a stack loses its footing
  grip.attach(best.group);                          // keeps the world transform
  best.state = "held";
  best.settle = false;
  g.held = best;
}

function release(M, g){
  const p = g.held;
  g.held = null;
  M.scene.attach(p.group);
  p.state = "flying";
  p.vel.copy(g.vel).multiplyScalar(THROW_BOOST);
  if (p.vel.length() > MAX_THROW) p.vel.setLength(MAX_THROW);
  const s = Math.min(p.vel.length() * 1.2, 6);      // tumble with the throw
  p.spin.set((Math.random() - 0.5) * 2 * s, (Math.random() - 0.5) * 2 * s, (Math.random() - 0.5) * 2 * s);
}

/* pieces resting on top of a disturbed one fall (crate stacks collapse) */
function wakeAbove(M, moved){
  const mp = moved.group.position;
  for (const q of M.props){
    if (q === moved || q.state !== "idle") continue;
    const qp = q.group.position;
    if (Math.abs(qp.x - mp.x) < 0.35 && Math.abs(qp.z - mp.z) < 0.35 && qp.y > mp.y + 0.05){
      q.state = "flying";
      q.settle = false;
    }
  }
}

/* ---------- toy physics ---------- */

function stepPhysics(M, dt){
  for (const p of M.props){
    if (p.state === "flying"){
      const g = p.group.position;
      p.vel.y -= GRAV * dt;
      g.x += p.vel.x * dt;
      g.y += p.vel.y * dt;
      g.z += p.vel.z * dt;
      p.group.rotation.x += p.spin.x * dt;
      p.group.rotation.y += p.spin.y * dt;
      p.group.rotation.z += p.spin.z * dt;

      // floor
      if (g.y < p.restY){
        g.y = p.restY;
        if (p.vel.y < -1.2){
          p.vel.y = -p.vel.y * REST;
          p.vel.x *= 0.72; p.vel.z *= 0.72;
          p.spin.multiplyScalar(0.5);
        } else {
          p.vel.y = 0;
          const f = Math.exp(-dt * 6);              // ground friction
          p.vel.x *= f; p.vel.z *= f;
          p.spin.multiplyScalar(f);
        }
      }
      // ceiling (an enthusiastic throw)
      if (g.y > M.WALL_H - p.r){
        g.y = M.WALL_H - p.r;
        if (p.vel.y > 0) p.vel.y = -p.vel.y * REST;
      }
      bounceWalls(M, p);

      // back to sleep once it's down and slow
      if (g.y <= p.restY + 1e-3 &&
          p.vel.x * p.vel.x + p.vel.z * p.vel.z < 0.02 && Math.abs(p.vel.y) < 0.2){
        p.state = "idle";
        p.vel.set(0, 0, 0);
        p.spin.set(0, 0, 0);
        p.settle = true;
      }
    } else if (p.settle){
      // right itself: ease the tumble back to upright, then hold
      const k = Math.exp(-6 * dt);
      const rx = wrap(p.group.rotation.x) * k;
      const rz = wrap(p.group.rotation.z) * k;
      p.group.rotation.x = rx;
      p.group.rotation.z = rz;
      if (Math.abs(rx) < 0.01 && Math.abs(rz) < 0.01){
        p.group.rotation.x = 0;
        p.group.rotation.z = 0;
        p.settle = false;
      }
    }
  }
}

/* circle-vs-AABB in the floor plane against the shared collision boxes —
   walls and centrepiece furniture alike */
function bounceWalls(M, p){
  const g = p.group.position, r = p.r;
  for (const w of M.walls){
    const cx = Math.max(w.minX, Math.min(g.x, w.maxX));
    const cz = Math.max(w.minZ, Math.min(g.z, w.maxZ));
    const dx = g.x - cx, dz = g.z - cz;
    const d2 = dx*dx + dz*dz;
    if (d2 >= r*r) continue;
    if (d2 > 1e-8){
      const d = Math.sqrt(d2), nx = dx/d, nz = dz/d;
      g.x += nx * (r - d);
      g.z += nz * (r - d);
      const vn = p.vel.x * nx + p.vel.z * nz;
      if (vn < 0){
        p.vel.x -= (1 + REST) * vn * nx;
        p.vel.z -= (1 + REST) * vn * nz;
      }
    } else {
      // centre ended up inside the box: push out the thinnest side
      const px = Math.min(g.x - w.minX, w.maxX - g.x);
      const pz = Math.min(g.z - w.minZ, w.maxZ - g.z);
      if (px < pz){
        g.x += (g.x - w.minX < w.maxX - g.x) ? -(px + r) : (px + r);
        p.vel.x *= -REST;
      } else {
        g.z += (g.z - w.minZ < w.maxZ - g.z) ? -(pz + r) : (pz + r);
        p.vel.z *= -REST;
      }
    }
  }
}
