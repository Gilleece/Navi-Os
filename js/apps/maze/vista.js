/* ============================================================
   MAZE.EXE — the vista (the world outside the walls)
   What the perimeter viewport windows (environment.js) look out
   on. WHICH world depends on where you are in the cycle
   (state.js depthInCycle, so it repeats every ten floors):

     01  the city       — open air: synthwave sun, skyline, moon
     02  the nightclub  — dancefloor cavern, lasers, mirror ball
     03  the works      — factory: furnaces, pistons, the gear
     04  the stacks     — warehouse: rack canyons, patrol drones
     05  the chapel     — cyber church: circuit glass, the sigil
     06  the crypt      — server catacombs, fans, data pulses
     07  the scrap sea  — junk ranges, cranes, searchlights
     08  the geode      — crystal cavern, resonant and glowing
     09  the terminus   — dead metro: a ghost train still runs
     10  the abyss      — underwater: fish, god-rays, leviathan

   Only depth 01 is above ground; everything below is buried —
   each floor's windows open onto a different vast underground
   chamber, and the bottom of the cycle is drowned. THE EYE
   appears in every one of them: whatever else is out there,
   the Protocol is watching.

   Everything here is MeshBasic / additive with fog:false, so it
   ignores the interior fog: corridors stay swallowed in the dark
   while a window reads as a bright cut into somewhere else. All
   of it is seeded from the depth and coloured from the level's
   theme plus a fixed per-scene accent pair. Distances respect the
   camera's 80m far plane (maze corner is ~19m from the centre):
   sky shell 56, backdrop rings 42/33, ground disc 54.

   Returns { group, update }; maze.js stores it on M.vista, calls
   update(dt) every frame, and clearScene disposes the subtree.
   ============================================================ */
import { rng } from "./palette.js";
import { depthInCycle } from "./state.js";

const TAU = Math.PI * 2;
const c255 = v => Math.max(0, Math.min(255, Math.round(v)));
const hex3 = t => (c255(t[0]) << 16) | (c255(t[1]) << 8) | c255(t[2]);
const css  = (t, a = 1) => `rgba(${c255(t[0])},${c255(t[1])},${c255(t[2])},${a})`;
const sc3  = (t, f) => [t[0] * f, t[1] * f, t[2] * f];
const mix3 = (a, b, k) => [a[0] + (b[0]-a[0])*k, a[1] + (b[1]-a[1])*k, a[2] + (b[2]-a[2])*k];

const R_SKY = 56, R_HAZE = 51, R_FAR = 42, R_NEAR = 33, R_GRID = 54;

function canvas(w, h){
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}

export function buildVista(three, scene, cfg){
  const { N, CELL, theme, depth } = cfg;
  const size = N * CELL;
  const r = rng(((depth ?? 1) * 0xC0FFEE1) >>> 0);

  const V = {
    near: theme.near, mid: theme.mid, far: theme.far,
    nearStr: `${c255(theme.near[0])},${c255(theme.near[1])},${c255(theme.near[2])}`,
    r,
  };

  const g = new three.Group();
  g.position.set(size / 2, 0, size / 2);
  scene.add(g);

  const updates = [];
  let t = r() * 100;

  /* ---------- the shared rig ---------- */
  const ctx = {
    three, g, V, r, cfg,
    az0: r() * TAU,                      // the scene's master bearing
    on: fn => updates.push(fn),
    flat: opts => new three.MeshBasicMaterial({ fog: false, ...opts }),
    ctex(w, h, paint){
      const c = canvas(w, h);
      paint(c.getContext("2d"), w, h);
      return new three.CanvasTexture(c);
    },
    face(m){ m.rotation.y = Math.atan2(-m.position.x, -m.position.z); },

    /* the enclosing shell: sky, cavern vault, water column */
    dome(paint){
      const m = new three.Mesh(
        new three.SphereGeometry(R_SKY, 24, 16),
        ctx.flat({ map: ctx.ctex(512, 512, paint), side: three.BackSide, depthWrite: false }));
      m.renderOrder = -2;
      g.add(m);
      return m;
    },

    /* the ground disc under everything out there. rep = tiling texture;
       omit it for a single 1024 canvas painted edge to edge (radial art —
       rails, caustics, the nave — needs to know where the centre is). */
    ground(paint, rep){
      const tex = ctx.ctex(rep ? 256 : 1024, rep ? 256 : 1024, paint);
      if (rep){ tex.wrapS = tex.wrapT = three.RepeatWrapping; tex.repeat.set(rep, rep); }
      const m = new three.Mesh(new three.CircleGeometry(R_GRID, 48), ctx.flat({ map: tex }));
      m.rotation.x = -Math.PI / 2;
      m.position.y = -0.06;
      g.add(m);
      return m;
    },

    /* a ring of backdrop planes facing the maze, one fresh canvas each */
    ringOf(radius, count, w, h, yBase, paint){
      for (let i = 0; i < count; i++){
        const a = (i / count) * TAU + ctx.az0;
        const m = new three.Mesh(
          new three.PlaneGeometry(w, h),
          ctx.flat({ map: ctx.ctex(512, 256, paint), transparent: true, alphaTest: 0.5 }));
        m.position.set(Math.sin(a) * radius, yBase + h / 2, Math.cos(a) * radius);
        ctx.face(m);
        g.add(m);
      }
    },

    /* the glowing air near the ground, hides the disc's edge */
    haze(col, o = {}){
      const c = canvas(16, 64), hg = c.getContext("2d");
      const grad = hg.createLinearGradient(0, 64, 0, 0);
      grad.addColorStop(0, css(col, o.alpha ?? 0.5));
      grad.addColorStop(1, css(col, 0));
      hg.fillStyle = grad; hg.fillRect(0, 0, 16, 64);
      const m = new three.Mesh(
        new three.CylinderGeometry(o.radius ?? R_HAZE, o.radius ?? R_HAZE, o.h ?? 7, 48, 1, true),
        ctx.flat({ map: new three.CanvasTexture(c), transparent: true, depthWrite: false,
                   side: three.BackSide, blending: three.AdditiveBlending }));
      m.position.y = (o.h ?? 7) / 2;
      g.add(m);
      return m;
    },

    /* THE EYE — in every scene, always facing the player, blinking */
    eye(colA, colB, o = {}){
      const m = new three.Mesh(
        new three.PlaneGeometry(1, 1),
        ctx.flat({ map: eyeTexture(three, colA, colB), transparent: true, depthWrite: false }));
      const az = o.az ?? (ctx.az0 + Math.PI);
      const s = o.size ?? 7.5;
      m.position.set(Math.sin(az) * (o.dist ?? 45), o.y ?? 15, Math.cos(az) * (o.dist ?? 45));
      g.add(m);
      const _v = new three.Vector3();
      const period = o.blink ?? 8.5;
      ctx.on(dt => {
        if (cfg.camera){ cfg.camera.getWorldPosition(_v); m.lookAt(_v); }
        const bt = t % period;
        const shut = bt < 0.28 ? Math.sin((bt / 0.28) * Math.PI) : 0;
        m.scale.set(s * (1 + 0.03 * Math.sin(t * 0.8)), s * Math.max(0.06, 1 - shut), 1);
      });
      return m;
    },

    /* vertical light pillars (or slanted god-rays), breathing softly */
    shafts(n, col, o = {}){
      for (let i = 0; i < n; i++){
        const a = r() * TAU;
        const m = new three.Mesh(
          new three.CylinderGeometry(o.rTop ?? 0.5, o.rBot ?? 0.9, o.h ?? 26, 10, 1, true),
          ctx.flat({ color: hex3(col), transparent: true, opacity: 0.12, depthWrite: false,
                     side: three.DoubleSide, blending: three.AdditiveBlending }));
        const rad = o.rMin ?? (R_FAR + 2);
        m.position.set(Math.sin(a) * rad, o.y ?? 12, Math.cos(a) * rad);
        if (o.tilt) m.rotation.z = o.tilt;
        g.add(m);
        const seed = r() * 10;
        ctx.on(() => { m.material.opacity = (o.base ?? 0.09) + 0.06 * (0.5 + 0.5 * Math.sin(t * 0.6 + seed)); });
      }
    },

    /* an energy ring racing out across the ground, then resetting */
    pulse(col, o = {}){
      const m = new three.Mesh(
        new three.RingGeometry(0.94, 1, 64),
        ctx.flat({ color: hex3(col), transparent: true, opacity: 0, depthWrite: false,
                   side: three.DoubleSide, blending: three.AdditiveBlending }));
      m.rotation.x = -Math.PI / 2;
      m.position.y = -0.045;
      g.add(m);
      const period = o.period ?? 7, run = o.run ?? 5;
      ctx.on(() => {
        const pk = (t % period) / run;
        m.visible = pk < 1;
        if (pk < 1){ m.scale.setScalar(6 + pk * 46); m.material.opacity = (o.alpha ?? 0.4) * (1 - pk); }
      });
    },

    /* a cloud of drifting points in the void band around the maze:
       embers, dust, bubbles, marine snow, rising shards */
    drift(count, o = {}){
      const rIn = o.rIn ?? 16, rOut = o.rOut ?? 48;
      const yMin = o.yMin ?? 0.5, yMax = o.yMax ?? 18;
      const pos = new Float32Array(count * 3);
      const base = new Float32Array(count * 2);          // anchor x/z for the wobble
      const ph = new Float32Array(count);
      for (let i = 0; i < count; i++){
        const a = r() * TAU, rad = rIn + r() * (rOut - rIn);
        base[i*2] = Math.sin(a) * rad; base[i*2+1] = Math.cos(a) * rad;
        pos[i*3] = base[i*2]; pos[i*3+1] = yMin + r() * (yMax - yMin); pos[i*3+2] = base[i*2+1];
        ph[i] = r() * TAU;
      }
      const geo = new three.BufferGeometry();
      geo.setAttribute("position", new three.BufferAttribute(pos, 3));
      const mat = new three.PointsMaterial({
        color: hex3(o.color ?? V.near), size: o.size ?? 0.12, sizeAttenuation: true,
        transparent: true, opacity: o.opacity ?? 0.5, depthWrite: false, fog: false,
        blending: three.AdditiveBlending });
      g.add(new three.Points(geo, mat));
      const vy = o.vy ?? 0.3, wob = o.wobble ?? 0;
      ctx.on(dt => {
        for (let i = 0; i < count; i++){
          let y = pos[i*3+1] + vy * dt;
          if (vy > 0 && y > yMax) y = yMin;
          if (vy < 0 && y < yMin) y = yMax;
          pos[i*3+1] = y;
          if (wob){
            pos[i*3]   = base[i*2]   + Math.sin(t * 0.8 + ph[i]) * wob;
            pos[i*3+2] = base[i*2+1] + Math.cos(t * 0.7 + ph[i]) * wob;
          }
        }
        geo.attributes.position.needsUpdate = true;
      });
    },
  };

  const build = SCENES[depthInCycle(depth ?? 1)] ?? buildCity;
  build(ctx);

  return {
    group: g,
    update(dt){ t += dt; for (const u of updates) u(dt, t); },
  };
}

/* keep an orbiting thing on its circle, long axis on the tangent */
function stepOrbit(m, o, dt, t){
  o.a += o.speed * dt;
  const bob = o.bob ? Math.sin(t * o.bob + (o.ph ?? 0)) * o.bobAmp : 0;
  m.position.set(Math.sin(o.a) * o.radius, o.y + bob, Math.cos(o.a) * o.radius);
  m.rotation.y = o.a;
}

/* ---------- shared textures ---------- */

/* exported: sanctum.js perches this same eye on the Custodian's tower */
export function eyeTexture(three, A, B){
  const c = canvas(256, 256), g = c.getContext("2d");
  const ring = (rad, w, col) => {
    g.strokeStyle = col; g.lineWidth = w;
    g.beginPath(); g.arc(128, 128, rad, 0, TAU); g.stroke();
  };
  ring(118, 5, css(A, 0.9));
  ring(104, 2, css(A, 0.3));
  g.strokeStyle = css(B, 0.55); g.lineWidth = 3;
  for (let a = 0; a < TAU; a += TAU / 36){
    g.beginPath();
    g.moveTo(128 + Math.cos(a) * 40, 128 + Math.sin(a) * 40);
    g.lineTo(128 + Math.cos(a + 0.06) * 92, 128 + Math.sin(a + 0.06) * 92);
    g.stroke();
  }
  const iris = g.createRadialGradient(128, 128, 26, 128, 128, 96);
  iris.addColorStop(0, css(B, 0.5));
  iris.addColorStop(1, css(A, 0.08));
  g.fillStyle = iris;
  g.beginPath(); g.arc(128, 128, 96, 0, TAU); g.fill();
  g.fillStyle = "#02030a";
  g.beginPath(); g.arc(128, 128, 30, 0, TAU); g.fill();
  g.fillStyle = "rgba(255,255,255,.85)";
  g.beginPath(); g.arc(116, 114, 7, 0, TAU); g.fill();
  return new three.CanvasTexture(c);
}

function haloTexture(three, stops){
  const c = canvas(128, 128), g = c.getContext("2d");
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  for (const [k, col] of stops) grad.addColorStop(k, col);
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  return new three.CanvasTexture(c);
}

/* ============================================================
   01 · THE CITY — the only floor still above the ground
   ============================================================ */
function buildCity(ctx){
  const { three, g, V, r } = ctx;
  const azSun = ctx.az0;

  ctx.dome(sg => {
    const grad = sg.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0.00, "#020208");
    grad.addColorStop(0.30, css(sc3(V.far, 0.06)));
    grad.addColorStop(0.44, css(sc3(V.near, 0.16)));
    grad.addColorStop(0.50, css(sc3(V.near, 0.42)));
    grad.addColorStop(0.56, css(sc3(V.near, 0.12)));
    grad.addColorStop(1.00, "#010104");
    sg.fillStyle = grad; sg.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 3; i++){
      const y = 90 + r() * 120;
      const band = sg.createLinearGradient(0, y - 6, 0, y + 6);
      band.addColorStop(0, css(V.mid, 0));
      band.addColorStop(0.5, css(V.mid, 0.06));
      band.addColorStop(1, css(V.mid, 0));
      sg.fillStyle = band; sg.fillRect(0, y - 6, 512, 12);
    }
    for (let i = 0; i < 150; i++){
      const y = r() * 225, x = r() * 512;
      const a = 0.25 + r() * 0.75, s = r() < 0.12 ? 2 : 1;
      sg.fillStyle = r() < 0.2 ? css(V.near, a) : `rgba(255,255,255,${a * 0.85})`;
      sg.fillRect(x, y, s, s);
    }
  });

  // the neon grid plain
  ctx.ground(gg => {
    gg.fillStyle = "#04040a"; gg.fillRect(0, 0, 256, 256);
    gg.strokeStyle = css(V.near, 0.5); gg.lineWidth = 5;
    gg.beginPath(); gg.moveTo(0, 2); gg.lineTo(256, 2); gg.moveTo(2, 0); gg.lineTo(2, 256); gg.stroke();
    gg.strokeStyle = css(V.near, 0.12); gg.lineWidth = 2;
    gg.beginPath(); gg.moveTo(0, 128); gg.lineTo(256, 128); gg.moveTo(128, 0); gg.lineTo(128, 256); gg.stroke();
  }, 34);

  ctx.haze(sc3(V.near, 1), { alpha: 0.5 });

  // the sun + halo, half-set
  const sun = new three.Mesh(
    new three.CircleGeometry(11, 48),
    ctx.flat({ map: ctx.ctex(256, 256, sg => {
      const grad = sg.createLinearGradient(0, 20, 0, 246);
      grad.addColorStop(0, "#ffe89a");
      grad.addColorStop(0.35, "#ffc44d");
      grad.addColorStop(0.65, "#ff6a8e");
      grad.addColorStop(1, "#ff2d78");
      sg.fillStyle = grad; sg.fillRect(0, 0, 256, 256);
      sg.globalCompositeOperation = "destination-out";
      let y = 132, gap = 3;
      while (y < 256){ sg.fillRect(0, y, 256, gap); y += gap + 14; gap += 2.6; }
    }), transparent: true, depthWrite: false }));
  sun.position.set(Math.sin(azSun) * 47, 5.2, Math.cos(azSun) * 47);
  ctx.face(sun);
  g.add(sun);
  const sunHalo = new three.Mesh(
    new three.PlaneGeometry(46, 46),
    ctx.flat({ map: haloTexture(three, [[0, "rgba(255,110,130,.5)"], [0.5, "rgba(255,60,120,.14)"], [1, "rgba(255,60,120,0)"]]),
               transparent: true, depthWrite: false, blending: three.AdditiveBlending }));
  sunHalo.position.copy(sun.position).multiplyScalar(1.005);
  ctx.face(sunHalo);
  sunHalo.renderOrder = -1;
  g.add(sunHalo);

  // skyline: far ring + a nearer darker ring for parallax
  const skyline = near => (cg) => {
    let x = 0;
    while (x < 500){
      const w = 26 + r() * 54;
      const h = near ? 55 + r() * 140 : 50 + r() * 190;
      const y0 = 256 - h;
      cg.fillStyle = near ? "#03040a" : "#070a18";
      cg.fillRect(x, y0, w, h);
      if (r() < 0.5) cg.fillRect(x + w * 0.3, y0 - 6, w * 0.4, 6);
      if (r() < 0.4){
        const ax = x + 6 + r() * (w - 12);
        const top = y0 - 16 - r() * 22;
        cg.fillRect(ax, top, 2, y0 - top);
        cg.fillStyle = "rgba(255,70,90,.95)";
        cg.fillRect(ax - 1.5, top - 4, 5, 5);
        cg.fillStyle = near ? "#03040a" : "#070a18";
      }
      const litA = near ? 0.35 : 1;
      for (let wy = y0 + 8; wy < 248; wy += 7)
        for (let wx = x + 4; wx < x + w - 6; wx += 6){
          const q = r();
          if (q > (near ? 0.14 : 0.34)) continue;
          const tint = q < 0.04 ? "255,216,160" : q < 0.09 ? "205,232,255" : V.nearStr;
          cg.fillStyle = `rgba(${tint},${(0.25 + r() * 0.75) * litA})`;
          cg.fillRect(wx, wy, 3, 4);
        }
      if (!near && r() < 0.3){
        cg.fillStyle = css(V.mid, 0.85);
        cg.fillRect(x + 4 + r() * (w - 12), y0 + 12 + r() * 40, 5, 28 + r() * 55);
      }
      x += w + (r() < 0.25 ? 3 + r() * 8 : 0);
    }
  };
  ctx.ringOf(R_FAR, 12, 23.5, 15, -1, skyline(false));
  ctx.ringOf(R_NEAR, 10, 22, 11, -1, skyline(true));

  ctx.shafts(5, V.far);
  ctx.eye(V.near, V.mid);
  ctx.pulse(V.near);

  // the hypno-spiral, slowly turning
  const spiral = new three.Mesh(
    new three.PlaneGeometry(6.5, 6.5),
    ctx.flat({ map: ctx.ctex(256, 256, sg => {
      sg.lineCap = "round";
      for (const a0 of [0, TAU / 3, (TAU * 2) / 3]){
        sg.strokeStyle = a0 === 0 ? css(V.near, 0.85) : css(V.mid, 0.7);
        sg.lineWidth = 7;
        sg.beginPath();
        for (let rad = 8; rad < 118; rad += 1.6){
          const a = a0 + rad * 0.11;
          const x = 128 + Math.cos(a) * rad, y = 128 + Math.sin(a) * rad;
          rad === 8 ? sg.moveTo(x, y) : sg.lineTo(x, y);
        }
        sg.stroke();
      }
    }), transparent: true, depthWrite: false, blending: three.AdditiveBlending }));
  spiral.position.set(Math.sin(azSun - TAU / 4) * 40, 11, Math.cos(azSun - TAU / 4) * 40);
  ctx.face(spiral);
  g.add(spiral);
  ctx.on(dt => { spiral.rotation.z += dt * 0.55; });

  // the tesseract
  const pts = [];
  const cube = s => {
    const k = s / 2, c = [];
    for (const x of [-k, k]) for (const y of [-k, k]) for (const z of [-k, k]) c.push([x, y, z]);
    for (let i = 0; i < 8; i++)
      for (let j = i + 1; j < 8; j++){
        const d = (c[i][0] !== c[j][0]) + (c[i][1] !== c[j][1]) + (c[i][2] !== c[j][2]);
        if (d === 1) pts.push(...c[i], ...c[j]);
      }
    return c;
  };
  const outer = cube(4.6), inner = cube(2.3);
  for (let i = 0; i < 8; i++) pts.push(...outer[i], ...inner[i]);
  const tessGeo = new three.BufferGeometry();
  tessGeo.setAttribute("position", new three.Float32BufferAttribute(pts, 3));
  const tess = new three.LineSegments(tessGeo,
    new three.LineBasicMaterial({ color: hex3(V.near), transparent: true, opacity: 0.85,
                                  fog: false, blending: three.AdditiveBlending }));
  tess.position.set(Math.sin(azSun + TAU / 4) * 40, 12.5, Math.cos(azSun + TAU / 4) * 40);
  g.add(tess);
  ctx.on(dt => { tess.rotation.x += dt * 0.21; tess.rotation.y += dt * 0.34; });

  // the ringed moon
  const moon = new three.Mesh(
    new three.CircleGeometry(3.2, 32),
    ctx.flat({ map: ctx.ctex(128, 128, mg => {
      mg.fillStyle = "rgba(226,232,255,.95)";
      mg.beginPath(); mg.arc(64, 64, 60, 0, TAU); mg.fill();
      mg.fillStyle = "rgba(150,160,205,.5)";
      for (const [x, y, rad] of [[45, 40, 14], [82, 62, 10], [58, 88, 16], [88, 30, 7]]){
        mg.beginPath(); mg.arc(x, y, rad, 0, TAU); mg.fill();
      }
    }), transparent: true, depthWrite: false }));
  moon.position.set(Math.sin(azSun + 2.5) * 49, 19, Math.cos(azSun + 2.5) * 49);
  ctx.face(moon);
  g.add(moon);
  const moonRing = new three.Mesh(
    new three.RingGeometry(4.4, 5.3, 40),
    ctx.flat({ color: 0xbfd0ff, transparent: true, opacity: 0.35, depthWrite: false,
               side: three.DoubleSide, blending: three.AdditiveBlending }));
  moonRing.position.copy(moon.position);
  ctx.face(moonRing);
  moonRing.rotateX(1.15);
  g.add(moonRing);

  // air traffic: warm one way, cool the other
  const trafGeo = new three.BoxGeometry(0.9, 0.055, 0.055);
  const warm = ctx.flat({ color: 0xffb36b, transparent: true, opacity: 0.9,
                          depthWrite: false, blending: three.AdditiveBlending });
  const cool = ctx.flat({ color: 0x7ad9ff, transparent: true, opacity: 0.9,
                          depthWrite: false, blending: three.AdditiveBlending });
  const traffic = [];
  for (let i = 0; i < 14; i++){
    const dir = i % 2 ? 1 : -1;
    const m = new three.Mesh(trafGeo, dir > 0 ? warm : cool);
    traffic.push({ m, o: { a: r() * TAU, radius: 34 + r() * 11, y: 5 + r() * 12,
                           speed: dir * (0.2 + r() * 0.45) } });
    g.add(m);
  }
  ctx.on((dt, tt) => { for (const tr of traffic) stepOrbit(tr.m, tr.o, dt, tt); });

  // the odd comet
  const comet = {
    m: new three.Mesh(new three.BoxGeometry(0.07, 0.07, 2.8),
      ctx.flat({ color: 0xeef6ff, transparent: true, opacity: 0, depthWrite: false,
                 blending: three.AdditiveBlending })),
    vel: new three.Vector3(), t: 99, life: 1.1, next: 2 + r() * 5,
  };
  comet.m.visible = false;
  g.add(comet.m);
  const _cv = new three.Vector3();
  ctx.on(dt => {
    comet.t += dt;
    if (comet.t > comet.life + comet.next){
      comet.t = 0; comet.next = 3 + r() * 6;
      const a = r() * TAU, s = r() < 0.5 ? 1 : -1;
      comet.m.position.set(Math.sin(a) * 46, 20 + r() * 7, Math.cos(a) * 46);
      comet.vel.set(Math.cos(a) * s * 14, -(8 + r() * 6), -Math.sin(a) * s * 14);
      _cv.copy(comet.m.position).add(comet.vel).add(g.position);
      comet.m.lookAt(_cv);
    }
    if (comet.t < comet.life){
      comet.m.visible = true;
      comet.m.position.addScaledVector(comet.vel, dt);
      comet.m.material.opacity = 0.9 * Math.sin(Math.PI * (comet.t / comet.life));
    } else comet.m.visible = false;
  });
}

/* ============================================================
   02 · THE NIGHTCLUB — a dancefloor the size of a district
   ============================================================ */
function buildClub(ctx){
  const { three, g, V, r } = ctx;
  const MAG = [255, 60, 200], CYA = [80, 220, 255], VIO = [170, 90, 255];

  ctx.dome(sg => {                                   // the rig: black + hung lights + truss
    sg.fillStyle = "#030308"; sg.fillRect(0, 0, 512, 512);
    sg.strokeStyle = "rgba(120,130,160,.14)"; sg.lineWidth = 2;
    for (const y of [70, 130, 190]){ sg.beginPath(); sg.moveTo(0, y); sg.lineTo(512, y); sg.stroke(); }
    for (let i = 0; i < 90; i++){
      const cols = [MAG, CYA, VIO, [255, 220, 120]];
      sg.fillStyle = css(cols[r() * 4 | 0], 0.3 + r() * 0.7);
      sg.fillRect(r() * 512, r() * 220, 2, 2);
    }
  });

  ctx.ground(gg => {                                 // the lit checker floor
    const cols = [MAG, CYA, VIO, [30, 30, 50]];
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++){
        const col = cols[(x + y * 3 + (r() * 2 | 0)) % 4];
        gg.fillStyle = css(sc3(col, 0.55), 0.9);
        gg.fillRect(x * 64 + 2, y * 64 + 2, 60, 60);
      }
  }, 20);

  ctx.haze(MAG, { alpha: 0.35 });

  // far ring: speaker stacks, washes, the bar; near ring: the crowd
  ctx.ringOf(R_FAR, 12, 23.5, 14, -1, cg => {
    for (let i = 0; i < 3; i++){                     // wall washes
      const x = r() * 400, w = 70 + r() * 110;
      const wash = cg.createLinearGradient(0, 40, 0, 256);
      const col = [MAG, CYA, VIO][r() * 3 | 0];
      wash.addColorStop(0, css(col, 0));
      wash.addColorStop(1, css(col, 0.22));
      cg.fillStyle = wash; cg.fillRect(x, 40, w, 216);
    }
    if (r() < 0.5){                                  // the bar: shelves of lit bottles
      const bx = r() * 300, bw = 130 + r() * 80;
      for (let s = 0; s < 3; s++){
        const by = 120 + s * 34;
        cg.fillStyle = "rgba(255,255,255,.12)"; cg.fillRect(bx, by + 12, bw, 2);
        for (let b = bx + 6; b < bx + bw - 6; b += 9){
          cg.fillStyle = css([MAG, CYA, [255, 220, 120]][r() * 3 | 0], 0.5 + r() * 0.5);
          cg.fillRect(b, by, 4, 11);
        }
      }
    }
    for (let i = 0; i < 2; i++){                     // speaker stacks
      const sx = r() * 440, sw = 46 + r() * 30, sy = 256 - (110 + r() * 60);
      cg.fillStyle = "#05060c"; cg.fillRect(sx, sy, sw, 256 - sy);
      cg.strokeStyle = css(CYA, 0.5); cg.lineWidth = 2;
      for (let cy = sy + 14; cy < 240; cy += 30){
        cg.beginPath(); cg.arc(sx + sw / 2, cy, sw * 0.27, 0, TAU); cg.stroke();
      }
    }
  });
  ctx.ringOf(R_NEAR, 10, 22, 9, -1, cg => {
    const wash = cg.createLinearGradient(0, 0, 0, 256);   // glow behind the heads
    wash.addColorStop(0, css([MAG, CYA][r() * 2 | 0], 0.16));
    wash.addColorStop(1, css(VIO, 0.02));
    cg.fillStyle = wash; cg.fillRect(0, 0, 512, 256);
    cg.fillStyle = "#04040a";                              // the crowd, arms up
    let x = 6 + r() * 14;
    while (x < 500){
      const hy = 150 + r() * 40, hr = 9 + r() * 5;
      cg.beginPath(); cg.arc(x, hy, hr, 0, TAU); cg.fill();       // head
      cg.fillRect(x - hr * 1.4, hy + hr * 0.8, hr * 2.8, 256);    // shoulders down
      if (r() < 0.6){                                              // raised arms
        cg.save(); cg.lineWidth = 5; cg.strokeStyle = "#04040a";
        cg.beginPath();
        cg.moveTo(x - hr, hy + 2); cg.lineTo(x - hr - 8, hy - 18 - r() * 10);
        cg.moveTo(x + hr, hy + 2); cg.lineTo(x + hr + 8, hy - 16 - r() * 12);
        cg.stroke(); cg.restore();
        if (r() < 0.4){                                            // a glowstick
          cg.fillStyle = css([MAG, CYA][r() * 2 | 0], 0.9);
          cg.fillRect(x + hr + 4, hy - 26 - r() * 8, 3, 10);
          cg.fillStyle = "#04040a";
        }
      }
      x += hr * 2 + 4 + r() * 10;
    }
  });

  // the mirror ball, slowly turning
  const ball = new three.Mesh(
    new three.SphereGeometry(2.4, 16, 12),
    ctx.flat({ map: ctx.ctex(128, 128, bg => {
      bg.fillStyle = "#14161f"; bg.fillRect(0, 0, 128, 128);
      for (let y = 0; y < 128; y += 10)
        for (let x = 0; x < 128; x += 10){
          const l = r();
          bg.fillStyle = l < 0.12 ? "rgba(255,255,255,.95)" : `rgba(190,205,235,${0.1 + l * 0.3})`;
          bg.fillRect(x + 1, y + 1, 8, 8);
        }
    }) }));
  const azB = ctx.az0 + 0.9;
  ball.position.set(Math.sin(azB) * 30, 13, Math.cos(azB) * 30);
  g.add(ball);
  ctx.on(dt => { ball.rotation.y += dt * 0.5; });

  // the laser fan, sweeping from above the ball
  const lasers = new three.Group();
  lasers.position.set(ball.position.x, 17, ball.position.z);
  for (let i = 0; i < 6; i++){
    const beam = new three.Mesh(
      new three.PlaneGeometry(0.16, 34),
      ctx.flat({ color: hex3(i % 2 ? MAG : CYA), transparent: true, opacity: 0.3,
                 depthWrite: false, side: three.DoubleSide, blending: three.AdditiveBlending }));
    beam.position.y = -17;
    const arm = new three.Group();
    arm.rotation.y = (i / 6) * TAU;
    arm.rotation.z = 0.45 + (i % 3) * 0.18;          // fanned outward
    arm.add(beam);
    beam.position.set(0, -15, 0);
    lasers.add(arm);
  }
  g.add(lasers);

  // the beat: floor glow + lasers breathing together, ~118 BPM, gentle
  const beatDisc = new three.Mesh(
    new three.CircleGeometry(R_GRID, 48),
    ctx.flat({ color: hex3(MAG), transparent: true, opacity: 0.05, depthWrite: false,
               blending: three.AdditiveBlending }));
  beatDisc.rotation.x = -Math.PI / 2;
  beatDisc.position.y = -0.03;
  g.add(beatDisc);
  ctx.on((dt, tt) => {
    const beat = 0.5 + 0.5 * Math.sin(tt * TAU * 0.98);        // ~59 pulses/min: a slow heavy room
    lasers.rotation.y += dt * 0.5;
    for (const arm of lasers.children) arm.children[0].material.opacity = 0.16 + 0.2 * beat;
    beatDisc.material.opacity = 0.03 + 0.07 * beat;
  });

  ctx.drift(80, { color: [255, 255, 255], size: 0.07, opacity: 0.35, vy: -0.15, yMax: 14 });  // falling glitter
  ctx.eye(MAG, CYA, { y: 14 });
}

/* ============================================================
   03 · THE WORKS — the factory floor the Protocol was cast on
   ============================================================ */
function buildFactory(ctx){
  const { three, g, V, r } = ctx;
  const AMB = [255, 150, 40], HOT = [255, 90, 30];

  ctx.dome(sg => {
    sg.fillStyle = "#050404"; sg.fillRect(0, 0, 512, 512);
    sg.strokeStyle = "rgba(140,120,90,.1)"; sg.lineWidth = 2;      // girder lattice
    for (let x = 0; x < 512; x += 46){
      sg.beginPath(); sg.moveTo(x, 40); sg.lineTo(x + 30, 170); sg.stroke();
      sg.beginPath(); sg.moveTo(x + 30, 40); sg.lineTo(x, 170); sg.stroke();
    }
    for (let i = 0; i < 12; i++){                                   // hanging chains
      const x = r() * 512;
      sg.strokeStyle = "rgba(120,110,90,.14)";
      sg.beginPath(); sg.moveTo(x, 0); sg.lineTo(x, 30 + r() * 80); sg.stroke();
    }
    const glow = sg.createLinearGradient(0, 200, 0, 280);           // furnace light from below
    glow.addColorStop(0, css(HOT, 0));
    glow.addColorStop(1, css(HOT, 0.14));
    sg.fillStyle = glow; sg.fillRect(0, 200, 512, 80);
  });

  ctx.ground(gg => {
    gg.fillStyle = "#0a0806"; gg.fillRect(0, 0, 256, 256);
    gg.strokeStyle = "rgba(150,140,120,.1)"; gg.lineWidth = 2;
    gg.strokeRect(3, 3, 250, 250);
    for (let i = 0; i < 8; i++){                                    // hazard dashes
      gg.fillStyle = i % 2 ? "rgba(255,190,40,.25)" : "rgba(0,0,0,.5)";
      gg.fillRect(20 + i * 26, 122, 20, 10);
    }
    for (let i = 0; i < 4; i++){                                    // oil stains
      gg.fillStyle = `rgba(0,0,0,${0.25 + r() * 0.3})`;
      gg.beginPath(); gg.arc(r() * 256, r() * 256, 10 + r() * 22, 0, TAU); gg.fill();
    }
  }, 16);

  ctx.haze(HOT, { alpha: 0.3 });

  ctx.ringOf(R_FAR, 12, 23.5, 15, -1, cg => {
    let x = 0;
    while (x < 490){                                                // machine skyline
      const w = 50 + r() * 90, h = 90 + r() * 130, y0 = 256 - h;
      cg.fillStyle = "#0a0806"; cg.fillRect(x, y0, w, h);
      if (r() < 0.5){                                               // chimney, venting heat
        const chx = x + 8 + r() * (w - 24);
        cg.fillRect(chx, y0 - 30 - r() * 26, 14, 40);
        cg.fillStyle = css(HOT, 0.5);
        cg.fillRect(chx + 2, y0 - 32 - r() * 26, 10, 4);
        cg.fillStyle = "#0a0806";
      }
      if (r() < 0.65){                                              // the furnace mouth
        const fw = 24 + r() * 22, fx = x + (w - fw) / 2, fy = 256 - 34;
        const fg = cg.createRadialGradient(fx + fw/2, fy + 12, 2, fx + fw/2, fy + 12, fw);
        fg.addColorStop(0, css([255, 230, 160], 0.95));
        fg.addColorStop(0.4, css(HOT, 0.8));
        fg.addColorStop(1, css(HOT, 0));
        cg.fillStyle = fg; cg.fillRect(fx - fw, fy - fw, fw * 3, fw * 2.4);
        cg.fillStyle = css([255, 220, 140], 0.9); cg.fillRect(fx, fy, fw, 22);
      }
      cg.strokeStyle = "rgba(150,140,120,.35)"; cg.lineWidth = 3;   // pipe runs
      const py = y0 + 14 + r() * 30;
      cg.beginPath(); cg.moveTo(x - 6, py); cg.lineTo(x + w + 6, py); cg.stroke();
      cg.beginPath(); cg.arc(x + w * (0.3 + r() * 0.4), py, 6, 0, TAU); cg.stroke();   // valve wheel
      for (let lx = x + 6; lx < x + w - 6; lx += 11){               // panel LEDs
        if (r() < 0.4) continue;
        cg.fillStyle = css([AMB, [120, 255, 140], HOT][r() * 3 | 0], 0.4 + r() * 0.5);
        cg.fillRect(lx, y0 + h * 0.4, 3, 3);
      }
      x += w + 4 + r() * 10;
    }
  });
  ctx.ringOf(R_NEAR, 10, 22, 10, -1, cg => {                        // pipe racks + fence
    cg.strokeStyle = "rgba(120,110,95,.6)"; cg.lineWidth = 5;
    for (let i = 0; i < 3; i++){
      const y = 150 + i * 30 + r() * 8;
      cg.beginPath(); cg.moveTo(0, y); cg.lineTo(512, y); cg.stroke();
    }
    cg.lineWidth = 3;
    for (let x = 10 + r() * 20; x < 512; x += 40 + r() * 30){
      cg.beginPath(); cg.moveTo(x, 140); cg.lineTo(x, 256); cg.stroke();
    }
    if (r() < 0.4){ cg.fillStyle = css(HOT, 0.4); cg.fillRect(r() * 460, 190, 40, 3); }  // a hot seam
  });

  // pistons, working forever
  const pistons = [];
  for (let i = 0; i < 3; i++){
    const a = ctx.az0 + 1.1 + i * 1.9;
    const m = new three.Mesh(new three.BoxGeometry(2.6, 5, 2.6), ctx.flat({ color: 0x0d0a08 }));
    m.position.set(Math.sin(a) * 30, 5, Math.cos(a) * 30);
    g.add(m);
    pistons.push({ m, ph: r() * TAU, sp: 0.5 + r() * 0.4 });
  }
  ctx.on((dt, tt) => { for (const p of pistons) p.m.position.y = 5 + Math.sin(tt * p.sp + p.ph) * 1.5; });

  // the great gear, still turning
  const gear = new three.Mesh(
    new three.PlaneGeometry(9, 9),
    ctx.flat({ map: ctx.ctex(256, 256, gg => {
      gg.strokeStyle = css(AMB, 0.7); gg.fillStyle = "#0c0906";
      gg.lineWidth = 5;
      gg.beginPath(); gg.arc(128, 128, 86, 0, TAU); gg.fill(); gg.stroke();
      for (let i = 0; i < 12; i++){                                 // teeth
        const a = (i / 12) * TAU;
        gg.save(); gg.translate(128, 128); gg.rotate(a);
        gg.fillRect(-11, -114, 22, 30); gg.strokeRect(-11, -114, 22, 30);
        gg.restore();
      }
      gg.beginPath(); gg.arc(128, 128, 26, 0, TAU); gg.stroke();
      for (let i = 0; i < 4; i++){                                  // spokes
        const a = (i / 4) * TAU;
        gg.beginPath(); gg.moveTo(128 + Math.cos(a) * 26, 128 + Math.sin(a) * 26);
        gg.lineTo(128 + Math.cos(a) * 82, 128 + Math.sin(a) * 82); gg.stroke();
      }
    }), transparent: true, depthWrite: false }));
  const azG = ctx.az0 + 3.6;
  gear.position.set(Math.sin(azG) * 38, 11, Math.cos(azG) * 38);
  ctx.face(gear);
  g.add(gear);
  ctx.on(dt => { gear.rotation.z += dt * 0.15; });

  // furnace glows flickering at the ring's feet
  for (let i = 0; i < 2; i++){
    const a = ctx.az0 + 0.4 + i * 2.8;
    const glow = new three.Mesh(
      new three.PlaneGeometry(14, 9),
      ctx.flat({ map: haloTexture(three, [[0, css(HOT, 0.55)], [1, css(HOT, 0)]]),
                 transparent: true, depthWrite: false, blending: three.AdditiveBlending }));
    glow.position.set(Math.sin(a) * (R_FAR - 1), 3, Math.cos(a) * (R_FAR - 1));
    ctx.face(glow);
    g.add(glow);
    const seed = r() * 9;
    ctx.on((dt, tt) => {
      const n = Math.sin(tt * 7 + seed) * Math.sin(tt * 3.1 + seed * 2);
      glow.material.opacity = 0.55 + 0.25 * n;
    });
  }

  ctx.drift(70, { color: HOT, size: 0.09, opacity: 0.5, vy: 0.5, wobble: 0.4, yMax: 12 });  // embers
  ctx.eye(AMB, HOT, { y: 14 });
}

/* ============================================================
   04 · THE STACKS — a warehouse with no far wall
   ============================================================ */
function buildWarehouse(ctx){
  const { three, g, V, r } = ctx;
  const AMB = [255, 200, 90], CLD = [140, 200, 255];

  ctx.dome(sg => {
    sg.fillStyle = "#040405"; sg.fillRect(0, 0, 512, 512);
    for (let y = 40; y < 200; y += 34){                             // rings of strip lights
      for (let x = 0; x < 512; x += 44){
        sg.fillStyle = css(AMB, 0.5 + r() * 0.4);
        sg.fillRect(x + 8, y, 26, 3);
      }
    }
  });

  ctx.ground(gg => {
    gg.fillStyle = "#08080a"; gg.fillRect(0, 0, 256, 256);
    gg.strokeStyle = "rgba(255,210,80,.3)"; gg.lineWidth = 3;       // lane lines
    gg.beginPath(); gg.moveTo(30, 0); gg.lineTo(30, 256); gg.moveTo(226, 0); gg.lineTo(226, 256); gg.stroke();
    gg.setLineDash([16, 12]);
    gg.strokeStyle = "rgba(255,210,80,.18)";
    gg.beginPath(); gg.moveTo(128, 0); gg.lineTo(128, 256); gg.stroke();
    gg.setLineDash([]);
    gg.fillStyle = "rgba(200,210,230,.14)";                         // bay number
    gg.font = "44px 'VT323', monospace"; gg.textAlign = "center";
    gg.fillText(String(1 + (r() * 98 | 0)).padStart(2, "0"), 128, 140);
  }, 12);

  ctx.haze(sc3(AMB, 0.8), { alpha: 0.25 });

  const racks = near => cg => {
    cg.fillStyle = near ? "#030304" : "#060607";
    cg.fillRect(0, 30, 512, 226);
    const up = near ? "rgba(120,130,150,.5)" : "rgba(120,130,150,.35)";
    for (let x = 0; x < 512; x += 42){                              // uprights
      cg.fillStyle = up; cg.fillRect(x, 30, 4, 226);
    }
    for (let y = 44; y < 256; y += 36){                             // beams + crates
      cg.fillStyle = up; cg.fillRect(0, y, 512, 3);
      for (let x = 6; x < 508; x += 42){
        if (r() < 0.24) continue;                                   // an empty slot
        const lit = r();
        cg.fillStyle = lit < 0.12 ? css(AMB, 0.75) : lit < 0.2 ? css(CLD, 0.6)
                     : `rgba(60,62,74,${near ? 0.85 : 1})`;
        cg.fillRect(x + 3, y + 6, 32, 24);
      }
    }
    if (r() < 0.4){                                                 // an aisle running away
      const ax = 40 + r() * 400;
      cg.clearRect(ax, 30, 34, 226);
      const deep = cg.createLinearGradient(0, 30, 0, 256);
      deep.addColorStop(0, "rgba(0,0,0,0)");
      deep.addColorStop(1, css(AMB, 0.3));
      cg.fillStyle = deep; cg.fillRect(ax, 30, 34, 226);
    }
    if (near && r() < 0.35){                                        // a forklift, parked forever
      const fx = r() * 420, fy = 256 - 46;
      cg.fillStyle = "#020203";
      cg.fillRect(fx, fy, 46, 30);                                  // body
      cg.fillRect(fx + 40, fy - 34, 5, 64);                         // mast
      cg.fillRect(fx + 45, fy + 24, 22, 4);                         // forks
      cg.fillStyle = css(AMB, 0.9); cg.fillRect(fx + 8, fy - 6, 6, 5);   // beacon
    }
  };
  ctx.ringOf(R_FAR, 12, 23.5, 14, -1, racks(false));
  ctx.ringOf(R_NEAR, 10, 22, 10, -1, racks(true));

  // real crate stacks for parallax
  for (let i = 0; i < 5; i++){
    const a = r() * TAU, rad = 25 + r() * 6, s = 1.6 + r() * 1.6;
    const m = new three.Mesh(new three.BoxGeometry(s, s, s),
      ctx.flat({ color: 0x14151c }));
    m.position.set(Math.sin(a) * rad, s / 2, Math.cos(a) * rad);
    m.rotation.y = r() * TAU;
    g.add(m);
    if (r() < 0.6){
      const m2 = new three.Mesh(new three.BoxGeometry(s * 0.7, s * 0.7, s * 0.7), m.material);
      m2.position.set(m.position.x, s + s * 0.35, m.position.z);
      m2.rotation.y = r() * TAU;
      g.add(m2);
    }
  }

  // patrol drones with blinking beacons
  const drones = [];
  for (let i = 0; i < 2; i++){
    const body = new three.Mesh(new three.BoxGeometry(0.5, 0.14, 0.5), ctx.flat({ color: 0x101218 }));
    const lamp = new three.Mesh(new three.BoxGeometry(0.12, 0.08, 0.12),
      ctx.flat({ color: hex3(AMB), transparent: true, opacity: 1,
                 depthWrite: false, blending: three.AdditiveBlending }));
    lamp.position.y = 0.12;
    body.add(lamp);
    g.add(body);
    drones.push({ m: body, lamp, ph: r() * 9,
                  o: { a: r() * TAU, radius: 24 + r() * 10, y: 7 + r() * 5,
                       speed: (i ? -1 : 1) * (0.1 + r() * 0.1), bob: 0.7, bobAmp: 0.4, ph: r() * TAU } });
  }
  ctx.on((dt, tt) => {
    for (const d of drones){
      stepOrbit(d.m, d.o, dt, tt);
      d.lamp.material.opacity = (tt + d.ph) % 1.4 < 0.15 ? 1 : 0.06;
    }
  });

  ctx.drift(60, { color: [220, 210, 180], size: 0.06, opacity: 0.25, vy: -0.06, wobble: 0.3, yMax: 12 });
  ctx.eye(AMB, CLD, { y: 13 });
}

/* ============================================================
   05 · THE CHAPEL — a church built by something that read about them
   ============================================================ */
function buildChurch(ctx){
  const { three, g, V, r } = ctx;
  const GLD = [255, 190, 80], VIO = [180, 110, 255];
  const azAltar = ctx.az0;

  ctx.dome(sg => {
    sg.fillStyle = "#040309"; sg.fillRect(0, 0, 512, 512);
    sg.strokeStyle = css(VIO, 0.12); sg.lineWidth = 3;              // ribs converging on the zenith
    for (let x = 0; x < 512; x += 46){
      sg.beginPath(); sg.moveTo(x, 190); sg.lineTo(x, 0); sg.stroke();
    }
    for (let i = 0; i < 40; i++){
      sg.fillStyle = css(GLD, 0.2 + r() * 0.5);
      sg.fillRect(r() * 512, r() * 150, 1.5, 1.5);
    }
  });

  ctx.ground(gg => {                                                // stone floor + the lit nave
    gg.fillStyle = "#08070c"; gg.fillRect(0, 0, 1024, 1024);
    gg.strokeStyle = "rgba(120,110,140,.12)"; gg.lineWidth = 2;
    for (let k = 0; k <= 1024; k += 64){
      gg.beginPath(); gg.moveTo(0, k); gg.lineTo(1024, k); gg.moveTo(k, 0); gg.lineTo(k, 1024); gg.stroke();
    }
    gg.save();                                                      // the nave: an aisle of light to the altar
    gg.translate(512, 512);
    gg.rotate(-azAltar);
    const nave = gg.createLinearGradient(0, 0, 0, -500);
    nave.addColorStop(0, css(GLD, 0.03));
    nave.addColorStop(1, css(GLD, 0.3));
    gg.fillStyle = nave; gg.fillRect(-42, -500, 84, 500);
    gg.restore();
    for (let i = 0; i < 60; i++){                                   // scattered candle points
      gg.fillStyle = css(GLD, 0.25 + r() * 0.5);
      const a = r() * TAU, rad = 220 + r() * 280;
      gg.fillRect(512 + Math.sin(a) * rad, 512 + Math.cos(a) * rad, 3, 3);
    }
  });

  ctx.haze(sc3(VIO, 0.9), { alpha: 0.3 });

  ctx.ringOf(R_FAR, 12, 23.5, 16, -1, cg => {                      // the arches + circuit glass
    cg.fillStyle = "#060510"; cg.fillRect(0, 40, 512, 216);
    let x = 10;
    while (x < 470){
      const w = 70 + r() * 40, apex = 60 + r() * 20;
      // the pointed arch
      cg.save();
      cg.beginPath();
      cg.moveTo(x, 256);
      cg.lineTo(x, apex + 60);
      cg.quadraticCurveTo(x + w / 2, apex - 40, x + w, apex + 60);
      cg.lineTo(x + w, 256);
      cg.closePath();
      cg.clip();
      // circuit stained glass: leaded facets in gold / violet / cyan
      for (let gy = apex - 20; gy < 256; gy += 24)
        for (let gx = x - 8; gx < x + w; gx += 22){
          const col = [GLD, VIO, [90, 200, 230]][r() * 3 | 0];
          cg.fillStyle = css(col, 0.1 + r() * 0.28);
          cg.beginPath();
          cg.moveTo(gx, gy + 24); cg.lineTo(gx + 11 + r() * 8, gy); cg.lineTo(gx + 22, gy + 24);
          cg.closePath(); cg.fill();
        }
      cg.strokeStyle = "rgba(10,8,16,.9)"; cg.lineWidth = 3;        // leading
      for (let gy = apex; gy < 256; gy += 24){
        cg.beginPath(); cg.moveTo(x, gy); cg.lineTo(x + w, gy); cg.stroke();
      }
      cg.restore();
      cg.strokeStyle = css(VIO, 0.4); cg.lineWidth = 3;             // arch outline
      cg.beginPath();
      cg.moveTo(x, 256); cg.lineTo(x, apex + 60);
      cg.quadraticCurveTo(x + w / 2, apex - 40, x + w, apex + 60);
      cg.lineTo(x + w, 256);
      cg.stroke();
      // candles at the foot
      for (let i = 0; i < 4; i++){
        cg.fillStyle = css(GLD, 0.5 + r() * 0.5);
        cg.fillRect(x + 8 + r() * (w - 16), 240 + r() * 12, 2, 4);
      }
      x += w + 18 + r() * 16;
    }
  });
  ctx.ringOf(R_NEAR, 10, 22, 11, -1, cg => {                       // the dark colonnade
    for (let x = 20 + r() * 20; x < 500; x += 90 + r() * 40){
      cg.fillStyle = "#030208";
      cg.fillRect(x, 40, 22, 216);
      cg.fillRect(x - 8, 40, 38, 12);
    }
  });

  // the sigil: a rotating rose window hung over the altar
  const sigil = new three.Mesh(
    new three.PlaneGeometry(8, 8),
    ctx.flat({ map: ctx.ctex(256, 256, sg => {
      sg.lineCap = "round";
      sg.strokeStyle = css(GLD, 0.9); sg.lineWidth = 4;
      for (const rad of [116, 92, 40]){
        sg.beginPath(); sg.arc(128, 128, rad, 0, TAU); sg.stroke();
      }
      sg.strokeStyle = css(VIO, 0.7);
      for (let i = 0; i < 12; i++){                                 // petals
        const a = (i / 12) * TAU;
        sg.beginPath();
        sg.moveTo(128 + Math.cos(a) * 40, 128 + Math.sin(a) * 40);
        sg.quadraticCurveTo(128 + Math.cos(a + 0.26) * 120, 128 + Math.sin(a + 0.26) * 120,
                            128 + Math.cos(a + 0.52) * 40, 128 + Math.sin(a + 0.52) * 40);
        sg.stroke();
      }
      sg.fillStyle = css(GLD, 0.9);
      sg.beginPath(); sg.arc(128, 128, 9, 0, TAU); sg.fill();
    }), transparent: true, depthWrite: false, blending: three.AdditiveBlending }));
  sigil.position.set(Math.sin(azAltar) * 36, 11, Math.cos(azAltar) * 36);
  ctx.face(sigil);
  g.add(sigil);
  ctx.on(dt => { sigil.rotation.z += dt * 0.12; });

  const altar = new three.Mesh(new three.BoxGeometry(5, 2.6, 2.4), ctx.flat({ color: 0x0a0812 }));
  altar.position.set(Math.sin(azAltar) * 34, 1.3, Math.cos(azAltar) * 34);
  altar.rotation.y = azAltar;
  g.add(altar);
  const altarGlow = new three.Mesh(
    new three.PlaneGeometry(12, 8),
    ctx.flat({ map: haloTexture(three, [[0, css(GLD, 0.5)], [1, css(GLD, 0)]]),
               transparent: true, depthWrite: false, blending: three.AdditiveBlending }));
  altarGlow.position.set(Math.sin(azAltar) * 33.4, 2.6, Math.cos(azAltar) * 33.4);
  ctx.face(altarGlow);
  g.add(altarGlow);

  ctx.drift(50, { color: GLD, size: 0.1, opacity: 0.5, vy: 0.12, wobble: 0.5, yMin: 2, yMax: 9, rIn: 20, rOut: 44 });  // votive lights
  ctx.shafts(4, GLD, { base: 0.07 });
  ctx.eye(VIO, GLD, { az: azAltar + Math.PI, y: 14 });
  ctx.pulse(VIO, { period: 11, alpha: 0.25 });
}

/* ============================================================
   06 · THE CRYPT — server catacombs; the racks hum like plainsong
   ============================================================ */
function buildCrypt(ctx){
  const { three, g, V, r } = ctx;
  const GRN = [80, 255, 120], AMB = [255, 180, 60];

  ctx.dome(sg => {
    sg.fillStyle = "#030503"; sg.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 60; i++){                                   // rough vault mottling
      sg.fillStyle = `rgba(0,0,0,${0.2 + r() * 0.3})`;
      sg.beginPath(); sg.arc(r() * 512, r() * 200, 8 + r() * 26, 0, TAU); sg.fill();
    }
    sg.strokeStyle = css(GRN, 0.08); sg.lineWidth = 2;              // faint arcs
    for (let x = -40; x < 512; x += 90){
      sg.beginPath(); sg.arc(x + 45, 230, 70, Math.PI, TAU); sg.stroke();
    }
  });

  ctx.ground(gg => {                                                // raised floor, seams alight
    gg.fillStyle = "#040604"; gg.fillRect(0, 0, 256, 256);
    gg.strokeStyle = css(GRN, 0.22); gg.lineWidth = 2;
    for (let k = 0; k <= 256; k += 64){
      gg.beginPath(); gg.moveTo(0, k); gg.lineTo(256, k); gg.moveTo(k, 0); gg.lineTo(k, 256); gg.stroke();
    }
    gg.fillStyle = css(GRN, 0.5);
    gg.fillRect(62, 62, 4, 4); gg.fillRect(190, 190, 4, 4);
  }, 18);

  ctx.haze(sc3(GRN, 0.8), { alpha: 0.3 });

  const rackWall = cg => {
    cg.fillStyle = "#040504"; cg.fillRect(0, 30, 512, 226);
    let x = 6;
    while (x < 490){
      const w = 34 + r() * 14, top = 60 + r() * 30;
      cg.fillStyle = "#070907"; cg.fillRect(x, top, w, 256 - top);
      cg.strokeStyle = css(GRN, 0.2); cg.lineWidth = 2;             // alcove arch over the rack
      cg.beginPath(); cg.arc(x + w / 2, top, w / 2, Math.PI, TAU); cg.stroke();
      for (let y = top + 8; y < 250; y += 9){                       // LED constellations
        for (let lx = x + 5; lx < x + w - 5; lx += 8){
          const q = r();
          if (q > 0.5) continue;
          cg.fillStyle = q < 0.06 ? css(AMB, 0.9) : css(GRN, 0.2 + r() * 0.6);
          cg.fillRect(lx, y, 3, 3);
        }
      }
      x += w + 10 + r() * 10;
    }
    cg.strokeStyle = "rgba(90,100,90,.4)"; cg.lineWidth = 3;        // cable droops between racks
    for (let i = 0; i < 5; i++){
      const cx = r() * 440, cw = 50 + r() * 60;
      cg.beginPath();
      cg.moveTo(cx, 60 + r() * 30);
      cg.quadraticCurveTo(cx + cw / 2, 120 + r() * 40, cx + cw, 60 + r() * 30);
      cg.stroke();
    }
  };
  ctx.ringOf(R_FAR, 12, 23.5, 14, -1, rackWall);
  ctx.ringOf(R_NEAR, 10, 22, 10, -1, rackWall);

  // cooling fans, spinning in the dark
  for (let i = 0; i < 3; i++){
    const a = ctx.az0 + 0.8 + i * 2.1;
    const fan = new three.Mesh(
      new three.PlaneGeometry(4.5, 4.5),
      ctx.flat({ map: ctx.ctex(128, 128, fg => {
        fg.strokeStyle = css(GRN, 0.55); fg.lineWidth = 4;
        fg.beginPath(); fg.arc(64, 64, 58, 0, TAU); fg.stroke();
        fg.fillStyle = css(GRN, 0.4);
        for (let b = 0; b < 4; b++){
          fg.save(); fg.translate(64, 64); fg.rotate((b / 4) * TAU);
          fg.beginPath();
          fg.moveTo(0, 0); fg.quadraticCurveTo(34, -14, 50, -4); fg.quadraticCurveTo(30, 12, 0, 0);
          fg.fill(); fg.restore();
        }
      }), transparent: true, depthWrite: false, blending: three.AdditiveBlending }));
    fan.position.set(Math.sin(a) * (R_NEAR - 1), 8, Math.cos(a) * (R_NEAR - 1));
    ctx.face(fan);
    g.add(fan);
    const sp = 2.2 + r() * 1.6;
    ctx.on(dt => { fan.rotation.z += dt * sp; });
  }

  // data pulses circling the racks
  const pulses = [];
  const pulseGeo = new three.BoxGeometry(1.4, 0.06, 0.06);
  const pulseMat = ctx.flat({ color: hex3(GRN), transparent: true, opacity: 0.9,
                              depthWrite: false, blending: three.AdditiveBlending });
  for (let i = 0; i < 6; i++){
    const m = new three.Mesh(pulseGeo, pulseMat);
    pulses.push({ m, o: { a: r() * TAU, radius: R_NEAR - 0.5, y: 2 + r() * 7,
                          speed: (i % 2 ? 1 : -1) * (0.3 + r() * 0.4) } });
    g.add(m);
  }
  ctx.on((dt, tt) => { for (const p of pulses) stepOrbit(p.m, p.o, dt, tt); });

  ctx.drift(90, { color: GRN, size: 0.07, opacity: 0.4, vy: -0.5, yMax: 16 });   // the rain, outdoors now
  ctx.eye(GRN, AMB, { y: 13 });
  ctx.pulse(GRN, { period: 6 });
}

/* ============================================================
   07 · THE SCRAP SEA — where the Protocol's dead parts washed up
   ============================================================ */
function buildScrap(ctx){
  const { three, g, V, r } = ctx;
  const RST = [255, 120, 50], PAL = [255, 240, 220];

  ctx.dome(sg => {
    sg.fillStyle = "#040303"; sg.fillRect(0, 0, 512, 512);
    const dust = sg.createLinearGradient(0, 130, 0, 260);
    dust.addColorStop(0, css(RST, 0));
    dust.addColorStop(1, css(RST, 0.09));
    sg.fillStyle = dust; sg.fillRect(0, 130, 512, 130);
  });

  ctx.ground(gg => {
    gg.fillStyle = "#070605"; gg.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 30; i++){                                   // strewn glints
      gg.fillStyle = r() < 0.3 ? css(RST, 0.4 + r() * 0.5) : `rgba(150,150,160,${0.1 + r() * 0.2})`;
      gg.fillRect(r() * 256, r() * 256, 2 + r() * 3, 2);
    }
    gg.strokeStyle = "rgba(0,0,0,.5)"; gg.lineWidth = 6;            // tyre ruts
    gg.beginPath(); gg.arc(300, 128, 200, 2.6, 3.6); gg.stroke();
  }, 14);

  ctx.haze(sc3(RST, 0.8), { alpha: 0.28 });

  ctx.ringOf(R_FAR, 12, 23.5, 14, -1, cg => {                       // the ranges of junk
    for (const [base, tone] of [[120, "#0a0908"], [70, "#060505"]]){
      cg.fillStyle = tone;
      cg.beginPath();
      cg.moveTo(0, 256);
      let x = 0, y = 256 - base * (0.4 + r() * 0.5);
      while (x < 512){
        x += 20 + r() * 40;
        y = Math.min(250, Math.max(256 - base - r() * 60, y + (r() * 2 - 1) * 46));
        cg.lineTo(x, y);
      }
      cg.lineTo(512, 256);
      cg.closePath(); cg.fill();
      for (let i = 0; i < 26; i++){                                 // dead screens still lit
        cg.fillStyle = r() < 0.4 ? css(RST, 0.3 + r() * 0.5) : css([120, 220, 160], 0.2 + r() * 0.3);
        cg.fillRect(r() * 512, 256 - r() * base, 3 + r() * 4, 2 + r() * 3);
      }
    }
    if (r() < 0.4){                                                 // the crane over the heaps
      const cx = 60 + r() * 380;
      cg.fillStyle = "#050404";
      cg.fillRect(cx, 60, 7, 196);                                  // mast
      cg.fillRect(cx - 70, 60, 150, 6);                             // jib
      cg.fillRect(cx + 66, 66, 2, 60);                              // cable
      cg.fillRect(cx + 56, 126, 22, 14);                            // the magnet
      cg.fillStyle = css(RST, 0.9); cg.fillRect(cx + 2, 52, 4, 4);  // mast light
    }
  });
  ctx.ringOf(R_NEAR, 10, 22, 9, -1, cg => {                         // nearer heaps: crushed cars
    cg.fillStyle = "#040303";
    cg.beginPath();
    cg.moveTo(0, 256);
    let x = 0, y = 200;
    while (x < 512){ x += 30 + r() * 50; y = Math.min(252, Math.max(150, y + (r() * 2 - 1) * 40)); cg.lineTo(x, y); }
    cg.lineTo(512, 256); cg.closePath(); cg.fill();
    for (let i = 0; i < 4; i++){                                    // a stack of flattened shells
      const sx = r() * 440, sy = 256 - 20;
      for (let k = 0; k < 3; k++){
        cg.fillStyle = "#050405";
        cg.fillRect(sx, sy - k * 14, 60, 12);
        cg.fillStyle = css(PAL, 0.25);
        cg.fillRect(sx + 4, sy - k * 14 + 3, 4, 3);                 // a headlight that won't die
        }
    }
  });

  // the searchlights, sweeping the heaps
  for (let i = 0; i < 2; i++){
    const a = ctx.az0 + i * 2.6;
    const pivot = new three.Group();
    pivot.position.set(Math.sin(a) * 34, 13, Math.cos(a) * 34);
    const beam = new three.Mesh(
      new three.PlaneGeometry(1.2, 30),
      ctx.flat({ color: hex3(PAL), transparent: true, opacity: 0.16, depthWrite: false,
                 side: three.DoubleSide, blending: three.AdditiveBlending }));
    beam.position.y = -14;
    const arm = new three.Group();
    arm.rotation.z = 0.6;
    arm.add(beam);
    pivot.add(arm);
    g.add(pivot);
    const sp = (i ? -1 : 1) * (0.25 + r() * 0.15);
    ctx.on(dt => { pivot.rotation.y += dt * sp; });
  }

  // a scavenger drone, circling with a red blink
  const drone = new three.Mesh(new three.BoxGeometry(0.5, 0.14, 0.5), ctx.flat({ color: 0x0c0a0a }));
  const dLamp = new three.Mesh(new three.BoxGeometry(0.12, 0.08, 0.12),
    ctx.flat({ color: 0xff4444, transparent: true, opacity: 1, depthWrite: false,
               blending: three.AdditiveBlending }));
  dLamp.position.y = 0.12;
  drone.add(dLamp);
  g.add(drone);
  const dOrbit = { a: r() * TAU, radius: 30, y: 9, speed: 0.16, bob: 0.5, bobAmp: 0.8 };
  ctx.on((dt, tt) => {
    stepOrbit(drone, dOrbit, dt, tt);
    dLamp.material.opacity = tt % 1.1 < 0.12 ? 1 : 0.05;
  });

  ctx.drift(60, { color: RST, size: 0.08, opacity: 0.45, vy: 0.35, wobble: 0.5, yMax: 10 });   // rust sparks
  ctx.eye(RST, PAL, { y: 13 });
}

/* ============================================================
   08 · THE GEODE — a cavern the data crystallised in
   ============================================================ */
function buildGeode(ctx){
  const { three, g, V, r } = ctx;
  const CYA = [110, 240, 255], VIO = [190, 120, 255];

  ctx.dome(sg => {
    sg.fillStyle = "#030308"; sg.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 26; i++){                                   // hanging crystal points
      const x = r() * 512, len = 20 + r() * 60, w = 6 + r() * 12;
      const col = r() < 0.5 ? CYA : VIO;
      const grad = sg.createLinearGradient(0, 0, 0, len);
      grad.addColorStop(0, css(col, 0.05));
      grad.addColorStop(1, css(col, 0.5));
      sg.fillStyle = grad;
      sg.beginPath();
      sg.moveTo(x - w / 2, 0); sg.lineTo(x + w / 2, 0); sg.lineTo(x, len);
      sg.closePath(); sg.fill();
    }
  });

  ctx.ground(gg => {                                                // dark rock, glowing crack web
    gg.fillStyle = "#050508"; gg.fillRect(0, 0, 1024, 1024);
    gg.lineCap = "round";
    for (let i = 0; i < 26; i++){
      let x = r() * 1024, y = r() * 1024;
      const col = r() < 0.5 ? CYA : VIO;
      gg.strokeStyle = css(col, 0.2 + r() * 0.3);
      gg.lineWidth = 2 + r() * 3;
      gg.beginPath(); gg.moveTo(x, y);
      for (let s = 0; s < 5; s++){
        x += (r() * 2 - 1) * 120; y += (r() * 2 - 1) * 120;
        gg.lineTo(x, y);
      }
      gg.stroke();
    }
    for (let i = 0; i < 80; i++){
      gg.fillStyle = css(r() < 0.5 ? CYA : VIO, 0.3 + r() * 0.5);
      gg.fillRect(r() * 1024, r() * 1024, 3, 3);
    }
  });

  ctx.haze(sc3(CYA, 0.9), { alpha: 0.35 });

  ctx.ringOf(R_FAR, 12, 23.5, 16, -1, cg => {                       // crystal ranges
    for (let layer = 0; layer < 2; layer++){
      const back = layer === 0;
      let x = r() * 30;
      while (x < 500){
        const w = (back ? 30 : 45) + r() * 60;
        const h = (back ? 80 : 120) + r() * (back ? 80 : 120);
        const col = r() < 0.5 ? CYA : VIO;
        const lean = (r() * 2 - 1) * 18;
        const grad = cg.createLinearGradient(0, 256 - h, 0, 256);
        grad.addColorStop(0, css(col, back ? 0.35 : 0.6));
        grad.addColorStop(1, css(col, 0.04));
        cg.fillStyle = grad;
        cg.beginPath();
        cg.moveTo(x, 256); cg.lineTo(x + w / 2 + lean, 256 - h); cg.lineTo(x + w, 256);
        cg.closePath(); cg.fill();
        cg.strokeStyle = css(col, back ? 0.3 : 0.7); cg.lineWidth = 2;
        cg.stroke();
        if (!back && r() < 0.5){                                    // a bright core seam
          cg.strokeStyle = css([255, 255, 255], 0.5);
          cg.beginPath(); cg.moveTo(x + w / 2 + lean, 256 - h + 8); cg.lineTo(x + w / 2, 250); cg.stroke();
        }
        x += w * (back ? 0.6 : 0.8) + r() * 30;
      }
    }
  });

  // true 3D crystals, pulsing out in the dark
  const crystals = [];
  for (let i = 0; i < 9; i++){
    const a = r() * TAU, rad = 24 + r() * 15;
    const col = r() < 0.5 ? CYA : VIO;
    const geo = new three.OctahedronGeometry(1.1 + r() * 1.6);
    const m = new three.Mesh(geo,
      ctx.flat({ color: hex3(col), transparent: true, opacity: 0.35,
                 depthWrite: false, blending: three.AdditiveBlending }));
    m.scale.y = 2.2 + r() * 1.4;
    m.position.set(Math.sin(a) * rad, m.scale.y * 1.1, Math.cos(a) * rad);
    m.rotation.y = r() * TAU;
    g.add(m);
    crystals.push({ m, ph: r() * TAU, sp: 0.5 + r() * 0.7 });
  }
  ctx.on((dt, tt) => {
    for (const c of crystals) c.m.material.opacity = 0.28 + 0.2 * (0.5 + 0.5 * Math.sin(tt * c.sp + c.ph));
  });

  ctx.drift(80, { color: CYA, size: 0.08, opacity: 0.5, vy: 0.3, wobble: 0.4, yMax: 14 });     // rising shards
  ctx.eye(CYA, VIO, { y: 14 });
  ctx.pulse(CYA, { period: 8 });
}

/* ============================================================
   09 · THE TERMINUS — the metro that served the Protocol, unmanned
   ============================================================ */
function buildTerminus(ctx){
  const { three, g, V, r } = ctx;
  const SOD = [255, 170, 60];
  const R_RAIL = 28;

  ctx.dome(sg => {
    sg.fillStyle = "#040404"; sg.fillRect(0, 0, 512, 512);
    for (let x = 0; x < 512; x += 58){                              // arch ribs + grime
      sg.fillStyle = "rgba(120,120,130,.1)";
      sg.fillRect(x, 0, 8, 210);
      sg.fillStyle = "rgba(0,0,0,.35)";
      sg.fillRect(x + 20, 0, 12, 160 + r() * 60);
    }
  });

  ctx.ground(gg => {                                                // platform ring + the rails
    gg.fillStyle = "#060607"; gg.fillRect(0, 0, 1024, 1024);
    gg.strokeStyle = "rgba(140,140,150,.1)"; gg.lineWidth = 2;      // platform tiling
    for (let k = 0; k <= 1024; k += 44){
      gg.beginPath(); gg.moveTo(0, k); gg.lineTo(1024, k); gg.moveTo(k, 0); gg.lineTo(k, 1024); gg.stroke();
    }
    const px = rad => rad / R_GRID * 512;                           // world radius -> canvas px
    gg.fillStyle = "#020203";                                       // the track trench
    gg.beginPath(); gg.arc(512, 512, px(R_RAIL + 2.2), 0, TAU);
    gg.arc(512, 512, px(R_RAIL - 2.2), 0, TAU, true);
    gg.fill();
    gg.strokeStyle = css(SOD, 0.5); gg.lineWidth = 3;               // the rails, catching light
    for (const rad of [R_RAIL - 0.8, R_RAIL + 0.8]){
      gg.beginPath(); gg.arc(512, 512, px(rad), 0, TAU); gg.stroke();
    }
    gg.strokeStyle = css(SOD, 0.85); gg.lineWidth = 4;              // the platform edge line
    gg.beginPath(); gg.arc(512, 512, px(R_RAIL - 3), 0, TAU); gg.stroke();
    gg.beginPath(); gg.arc(512, 512, px(R_RAIL + 3), 0, TAU); gg.stroke();
  });

  ctx.haze(sc3(SOD, 0.7), { alpha: 0.3 });

  ctx.ringOf(R_FAR, 12, 23.5, 13, -1, cg => {                       // the station wall
    cg.fillStyle = "#07070a"; cg.fillRect(0, 60, 512, 196);
    cg.strokeStyle = "rgba(150,150,160,.12)"; cg.lineWidth = 2;     // tilework
    for (let y = 70; y < 256; y += 22){ cg.beginPath(); cg.moveTo(0, y); cg.lineTo(512, y); cg.stroke(); }
    for (let x = 30 + r() * 30; x < 500; x += 110 + r() * 40){      // pillars
      cg.fillStyle = "#040406";
      cg.fillRect(x, 60, 26, 196);
      cg.fillRect(x - 8, 60, 42, 10);
    }
    if (r() < 0.55){                                                // a tunnel mouth + signals
      const tx = 60 + r() * 340;
      cg.fillStyle = "#010102";
      cg.beginPath();
      cg.moveTo(tx, 256); cg.lineTo(tx, 140);
      cg.quadraticCurveTo(tx + 45, 90, tx + 90, 140);
      cg.lineTo(tx + 90, 256);
      cg.closePath(); cg.fill();
      cg.fillStyle = "rgba(255,60,60,.9)"; cg.fillRect(tx - 8, 200, 5, 5);
      cg.fillStyle = "rgba(60,255,120,.9)"; cg.fillRect(tx + 98, 200, 5, 5);
    }
    if (r() < 0.5){                                                 // a departure board, still guessing
      const bx = 60 + r() * 340, by = 84;
      cg.fillStyle = "#020203"; cg.fillRect(bx, by, 120, 46);
      cg.strokeStyle = css(SOD, 0.5); cg.lineWidth = 2; cg.strokeRect(bx, by, 120, 46);
      for (let row = 0; row < 3; row++){
        let x2 = bx + 6;
        const end = bx + 40 + r() * 70;
        while (x2 < end){
          const w = 5 + r() * 14;
          cg.fillStyle = css(SOD, 0.35 + r() * 0.55);
          cg.fillRect(x2, by + 8 + row * 13, w, 7);
          x2 += w + 4;
        }
      }
    }
  });

  // the ghost train, riding the loop forever
  const cars = [];
  const carTex = ctx.ctex(256, 64, cg => {
    cg.fillStyle = "#0a0b10"; cg.fillRect(0, 0, 256, 64);
    for (let x = 10; x < 246; x += 26){                             // lit windows
      cg.fillStyle = css(SOD, 0.5 + r() * 0.5);
      cg.fillRect(x, 18, 16, 20);
    }
    cg.fillStyle = "rgba(200,210,230,.25)";
    cg.fillRect(0, 6, 256, 3);
  });
  const carGeo = new three.BoxGeometry(4.6, 2.4, 1.2);
  const carMat = ctx.flat({ map: carTex });
  const lead = r() * TAU;
  for (let i = 0; i < 5; i++){
    const m = new three.Mesh(carGeo, carMat);
    cars.push({ m, o: { a: lead - i * 0.185, radius: R_RAIL, y: 1.2, speed: 0.26 } });
    g.add(m);
  }
  const head = new three.Mesh(
    new three.PlaneGeometry(5, 5),
    ctx.flat({ map: haloTexture(three, [[0, "rgba(255,240,200,.8)"], [1, "rgba(255,240,200,0)"]]),
               transparent: true, depthWrite: false, blending: three.AdditiveBlending }));
  g.add(head);
  ctx.on((dt, tt) => {
    for (const c of cars) stepOrbit(c.m, c.o, dt, tt);
    const o = cars[0].o;
    const ha = o.a + 0.09;                                          // just ahead of the lead car
    head.position.set(Math.sin(ha) * o.radius, 1.4, Math.cos(ha) * o.radius);
    head.rotation.y = ha + Math.PI / 2;                             // washing forward down the line
  });

  ctx.drift(50, { color: [200, 200, 210], size: 0.06, opacity: 0.22, vy: -0.05, wobble: 0.3, yMax: 10 });
  ctx.eye(SOD, [255, 90, 60], { y: 12 });
}

/* ============================================================
   10 · THE ABYSS — the bottom of the cycle is under water
   ============================================================ */
function buildAbyss(ctx){
  const { three, g, V, r } = ctx;
  const TEA = [60, 200, 220], DEE = [40, 90, 200], PAL = [200, 240, 255];

  ctx.dome(sg => {                                                  // the water column
    const grad = sg.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0.00, css(mix3(TEA, PAL, 0.5), 0.5));         // the surface, impossibly far up
    grad.addColorStop(0.18, css(TEA, 0.32));
    grad.addColorStop(0.45, css(DEE, 0.2));
    grad.addColorStop(0.75, "#020409");
    grad.addColorStop(1.00, "#010204");
    sg.fillStyle = grad; sg.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 8; i++){                                    // baked light rays
      const x = r() * 512, w = 14 + r() * 30;
      const ray = sg.createLinearGradient(0, 0, 0, 260);
      ray.addColorStop(0, css(PAL, 0.14));
      ray.addColorStop(1, css(PAL, 0));
      sg.fillStyle = ray;
      sg.beginPath();
      sg.moveTo(x, 0); sg.lineTo(x + w, 0); sg.lineTo(x + w + 26, 260); sg.lineTo(x - 26, 260);
      sg.closePath(); sg.fill();
    }
  });

  ctx.ground(gg => {                                                // silt, ripples, anemones
    gg.fillStyle = "#04070a"; gg.fillRect(0, 0, 1024, 1024);
    gg.strokeStyle = css(TEA, 0.1); gg.lineWidth = 2;
    for (let i = 0; i < 40; i++){                                   // ripple arcs
      const x = r() * 1024, y = r() * 1024;
      gg.beginPath(); gg.arc(x, y, 20 + r() * 40, r() * TAU, r() * TAU + 1.5); gg.stroke();
    }
    gg.lineCap = "round";
    for (let i = 0; i < 24; i++){                                   // caustic web
      let x = r() * 1024, y = r() * 1024;
      gg.strokeStyle = css(PAL, 0.08 + r() * 0.1);
      gg.lineWidth = 3;
      gg.beginPath(); gg.moveTo(x, y);
      for (let s = 0; s < 4; s++){ x += (r()*2-1)*90; y += (r()*2-1)*90; gg.lineTo(x, y); }
      gg.stroke();
    }
    for (let i = 0; i < 50; i++){                                   // anemone lights
      gg.fillStyle = css(r() < 0.5 ? TEA : [255, 130, 180], 0.3 + r() * 0.5);
      gg.beginPath(); gg.arc(r() * 1024, r() * 1024, 2 + r() * 3, 0, TAU); gg.fill();
    }
  });

  ctx.haze(DEE, { alpha: 0.4, h: 10 });

  // the sunken city, drowned and dark
  ctx.ringOf(R_FAR, 12, 23.5, 15, -1, cg => {
    let x = 0;
    while (x < 490){
      const w = 30 + r() * 60, h = 60 + r() * 160, y0 = 256 - h;
      const lean = (r() * 2 - 1) * (r() < 0.3 ? 26 : 6);            // some towers went over
      cg.fillStyle = "#04070c";
      cg.beginPath();
      cg.moveTo(x, 256); cg.lineTo(x + lean, y0); cg.lineTo(x + w + lean, y0 + (r() < 0.3 ? 14 : 0));
      cg.lineTo(x + w, 256);
      cg.closePath(); cg.fill();
      for (let wy = y0 + 10; wy < 246; wy += 9)                     // a few windows still burning
        for (let wx = x + 4; wx < x + w - 5; wx += 7){
          if (r() > 0.06) continue;
          cg.fillStyle = css(r() < 0.6 ? TEA : PAL, 0.2 + r() * 0.4);
          cg.fillRect(wx + lean * ((256 - wy) / h), wy, 3, 4);
        }
      x += w + 6 + r() * 14;
    }
    cg.lineCap = "round";                                           // kelp forest in front
    for (let i = 0; i < 10; i++){
      const kx = r() * 512, kh = 70 + r() * 120;
      cg.strokeStyle = `rgba(20,60,50,${0.5 + r() * 0.4})`;
      cg.lineWidth = 4 + r() * 3;
      cg.beginPath(); cg.moveTo(kx, 256);
      cg.quadraticCurveTo(kx + 20 * (r() * 2 - 1), 256 - kh * 0.6, kx + 14 * (r() * 2 - 1), 256 - kh);
      cg.stroke();
    }
    for (let i = 0; i < 8; i++){                                    // coral glow at the feet
      cg.fillStyle = css([255, 130, 180], 0.2 + r() * 0.3);
      cg.beginPath(); cg.arc(r() * 512, 246 + r() * 8, 4 + r() * 7, Math.PI, TAU); cg.fill();
    }
  });
  ctx.ringOf(R_NEAR, 10, 22, 9, -1, cg => {                         // reef rocks, closer and darker
    cg.fillStyle = "#030507";
    cg.beginPath();
    cg.moveTo(0, 256);
    let x = 0, y = 210;
    while (x < 512){ x += 40 + r() * 60; y = Math.min(252, Math.max(140, y + (r()*2-1)*50)); cg.lineTo(x, y); }
    cg.lineTo(512, 256); cg.closePath(); cg.fill();
    cg.lineCap = "round";
    for (let i = 0; i < 8; i++){
      const kx = r() * 512, kh = 60 + r() * 100;
      cg.strokeStyle = `rgba(15,45,40,${0.6 + r() * 0.4})`;
      cg.lineWidth = 5;
      cg.beginPath(); cg.moveTo(kx, 256);
      cg.quadraticCurveTo(kx + 24 * (r()*2-1), 256 - kh * 0.6, kx + 16 * (r()*2-1), 256 - kh);
      cg.stroke();
    }
  });

  // fish, in three loose schools
  const fishTex = ctx.ctex(64, 32, fg => {
    fg.fillStyle = css(PAL, 0.8);
    fg.beginPath();
    fg.moveTo(6, 16); fg.quadraticCurveTo(28, 2, 46, 16); fg.quadraticCurveTo(28, 30, 6, 16);
    fg.fill();
    fg.beginPath(); fg.moveTo(46, 16); fg.lineTo(58, 8); fg.lineTo(58, 24); fg.closePath(); fg.fill();
  });
  const fishGeo = new three.PlaneGeometry(0.9, 0.45);
  const fishMat = ctx.flat({ map: fishTex, transparent: true, opacity: 0.75,
                             depthWrite: false, side: three.DoubleSide });
  const fish = [];
  for (let s = 0; s < 3; s++){
    const rad = 24 + r() * 14, y = 4 + r() * 10, speed = (s % 2 ? -1 : 1) * (0.12 + r() * 0.1);
    const a0 = r() * TAU;
    for (let i = 0; i < 6; i++){
      const m = new three.Mesh(fishGeo, fishMat);
      fish.push({ m, o: { a: a0 + r() * 0.5, radius: rad + (r()*2-1)*1.5, y: y + (r()*2-1)*1.2,
                          speed, bob: 1.2 + r(), bobAmp: 0.25, ph: r() * TAU } });
      g.add(m);
    }
  }
  ctx.on((dt, tt) => { for (const f of fish) stepOrbit(f.m, f.o, dt, tt); });

  // jellyfish, rising and pulsing
  const jellies = [];
  for (let i = 0; i < 5; i++){
    const m = new three.Mesh(
      new three.PlaneGeometry(1.6, 1.6),
      ctx.flat({ map: haloTexture(three, [[0, css([255, 160, 200], 0.55)], [0.5, css(TEA, 0.18)], [1, css(TEA, 0)]]),
                 transparent: true, depthWrite: false, blending: three.AdditiveBlending }));
    const a = r() * TAU, rad = 22 + r() * 18;
    m.position.set(Math.sin(a) * rad, 2 + r() * 10, Math.cos(a) * rad);
    g.add(m);
    jellies.push({ m, ph: r() * TAU });
  }
  const _jv = new three.Vector3();
  ctx.on((dt, tt) => {
    for (const j of jellies){
      j.m.position.y += dt * (0.25 + 0.15 * Math.sin(tt * 1.4 + j.ph));
      if (j.m.position.y > 15) j.m.position.y = 1.5;
      j.m.scale.setScalar(1 + 0.18 * Math.sin(tt * 1.4 + j.ph));
      if (ctx.cfg.camera){ ctx.cfg.camera.getWorldPosition(_jv); j.m.lookAt(_jv); }
    }
  });

  // the leviathan: a shadow that takes a long time to pass
  const whale = new three.Mesh(
    new three.PlaneGeometry(26, 8),
    ctx.flat({ map: ctx.ctex(256, 96, wg => {
      wg.fillStyle = "rgba(2,6,10,.9)";
      wg.beginPath();
      wg.moveTo(10, 60);
      wg.quadraticCurveTo(60, 18, 150, 30);
      wg.quadraticCurveTo(210, 38, 236, 26);                        // head
      wg.quadraticCurveTo(246, 46, 232, 56);
      wg.quadraticCurveTo(150, 78, 60, 72);
      wg.quadraticCurveTo(22, 70, 10, 60);                          // tail root
      wg.closePath(); wg.fill();
      wg.beginPath();                                               // the fluke
      wg.moveTo(12, 60); wg.lineTo(-2, 40); wg.lineTo(6, 62); wg.lineTo(-2, 82); wg.closePath(); wg.fill();
      wg.fillStyle = css(TEA, 0.5);                                 // one pale eye
      wg.beginPath(); wg.arc(224, 40, 2.5, 0, TAU); wg.fill();
    }), transparent: true, depthWrite: false, side: three.DoubleSide }));
  const wOrbit = { a: r() * TAU, radius: 42, y: 16, speed: 0.045 };
  g.add(whale);
  ctx.on((dt, tt) => {
    stepOrbit(whale, wOrbit, dt, tt);
    whale.rotation.y = wOrbit.a + Math.PI / 2;                      // broadside to the maze
    whale.position.y = 16 + Math.sin(tt * 0.3) * 1.2;
  });

  // god-rays, bubbles, marine snow
  ctx.shafts(5, PAL, { rTop: 1.2, rBot: 2.2, h: 34, y: 16, tilt: 0.14, base: 0.06, rMin: 30 });
  ctx.drift(70, { color: PAL, size: 0.09, opacity: 0.5, vy: 0.9, wobble: 0.5, yMax: 18 });     // bubbles
  ctx.drift(110, { color: [180, 200, 210], size: 0.05, opacity: 0.3, vy: -0.12, wobble: 0.4, yMax: 16 });  // snow
  ctx.eye(TEA, DEE, { y: 13, blink: 12, size: 9 });
}

const SCENES = {
  1: buildCity,
  2: buildClub,
  3: buildFactory,
  4: buildWarehouse,
  5: buildChurch,
  6: buildCrypt,
  7: buildScrap,
  8: buildGeode,
  9: buildTerminus,
  10: buildAbyss,
};
