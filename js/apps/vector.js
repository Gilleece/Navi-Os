/* ============================================================
   NAVI-OS — VECTOR.EXE
   Wireframe asteroids, drawn to match the desktop sigil: thin
   green polygons, a triangle ship, screen-wrap everywhere. Keys
   on desktop, the button row works for mouse and touch alike.
   ============================================================ */
import { $ } from "../utils.js";
import { pal, beep } from "./_fx.js";
import { store } from "../store.js";

const W = 400, H = 340, SHIPR = 11;
const TIER = { 32:{next:18, score:20}, 18:{next:10, score:50}, 10:{next:0, score:100} };

let hi = store.get("hi-vector", 0);

export function initVector(){
  const win = $("#win-vector"), cv = $("#vector-canvas");
  if (!win || !cv) return;
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");

  let ship, bullets, rocks, score, lives, wave, state, blink, inv, cool;
  const held = { left:false, right:false, thrust:false, fire:false };

  function makeRock(x, y, r){
    const n = 9, verts = [];
    for (let i = 0; i < n; i++) verts.push(0.7 + Math.random()*0.5);
    const a = Math.random()*6.28, sp = (0.4 + Math.random()*0.7) * (r < 20 ? 1.6 : 1);
    return { x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, r, verts, rot:Math.random()*6, vr:(Math.random()-.5)*.05 };
  }
  function spawnWave(n){
    rocks = [];
    for (let i = 0; i < n; i++){
      const edge = Math.random() < .5;
      rocks.push(makeRock(edge ? 0 : Math.random()*W, edge ? Math.random()*H : 0, 32));
    }
  }
  function resetShip(){ ship = { x:W/2, y:H/2, a:-Math.PI/2, vx:0, vy:0 }; inv = 120; }
  function reset(){ score = 0; lives = 3; wave = 1; state = "ready"; blink = 0; bullets = []; cool = 0; resetShip(); spawnWave(4); }
  reset();

  function start_(){ if (state === "dead"){ reset(); return; } if (state === "ready") state = "play"; }
  function wrap(o){ if (o.x < 0) o.x += W; if (o.x > W) o.x -= W; if (o.y < 0) o.y += H; if (o.y > H) o.y -= H; }

  function fire(){
    if (cool > 0 || bullets.length > 4) return;
    bullets.push({ x: ship.x + Math.cos(ship.a)*SHIPR, y: ship.y + Math.sin(ship.a)*SHIPR,
                   vx: Math.cos(ship.a)*6 + ship.vx, vy: Math.sin(ship.a)*6 + ship.vy, life: 46 });
    cool = 9; beep(880, .04, "square", .12);
  }

  function update(dt){
    blink += dt;
    if (state !== "play") return;
    if (held.left)  ship.a -= 0.09 * dt;
    if (held.right) ship.a += 0.09 * dt;
    if (held.thrust){ ship.vx += Math.cos(ship.a)*0.16*dt; ship.vy += Math.sin(ship.a)*0.16*dt; if (blink % 6 < 1) beep(110, .03, "sawtooth", .08); }
    const sp = Math.hypot(ship.vx, ship.vy); if (sp > 6){ ship.vx *= 6/sp; ship.vy *= 6/sp; }
    ship.vx *= 0.992; ship.vy *= 0.992;
    ship.x += ship.vx*dt; ship.y += ship.vy*dt; wrap(ship);
    if (inv > 0) inv -= dt;
    cool -= dt; if (held.fire) fire();

    for (const b of bullets){ b.x += b.vx*dt; b.y += b.vy*dt; b.life -= dt; wrap(b); }
    bullets = bullets.filter(b => b.life > 0);

    for (const r of rocks){ r.x += r.vx*dt; r.y += r.vy*dt; r.rot += r.vr*dt; wrap(r); }

    // bullet vs rock
    for (let i = rocks.length-1; i >= 0; i--){
      const rk = rocks[i];
      for (let j = bullets.length-1; j >= 0; j--){
        const b = bullets[j];
        if (Math.hypot(b.x-rk.x, b.y-rk.y) < rk.r){
          bullets.splice(j, 1); rocks.splice(i, 1);
          score += TIER[rk.r].score; if (score > hi){ hi = score; store.set("hi-vector", hi); }
          const nx = TIER[rk.r].next; if (nx){ rocks.push(makeRock(rk.x, rk.y, nx), makeRock(rk.x, rk.y, nx)); }
          beep(200 + rk.r*4, .08, "square", .16); break;
        }
      }
    }
    // ship vs rock
    if (inv <= 0) for (const rk of rocks){
      if (Math.hypot(ship.x-rk.x, ship.y-rk.y) < rk.r + SHIPR*0.7){
        lives--; beep(90, .4, "sawtooth", .22);
        if (lives <= 0){ state = "dead"; } else resetShip();
        break;
      }
    }
    if (!rocks.length){ wave++; resetShip(); spawnWave(3 + wave); beep(660, .12, "square", .16); }
  }

  function poly(cx, cy, rot, r, verts, col){
    ctx.strokeStyle = col; ctx.lineWidth = 1.4; ctx.beginPath();
    for (let i = 0; i <= verts.length; i++){
      const k = i % verts.length, ang = rot + (k / verts.length)*6.283, rr = r*verts[k];
      const x = cx + Math.cos(ang)*rr, y = cy + Math.sin(ang)*rr;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }

  function draw(){
    const c = pal();
    ctx.fillStyle = c.bg; ctx.fillRect(0, 0, W, H);
    for (const rk of rocks) poly(rk.x, rk.y, rk.rot, rk.r, rk.verts, c.green);

    ctx.fillStyle = c.orange;
    for (const b of bullets) ctx.fillRect(b.x-1.5, b.y-1.5, 3, 3);

    if (state !== "dead" && !(inv > 0 && (blink % 12) < 6)){
      ctx.strokeStyle = c.orange; ctx.lineWidth = 1.6; ctx.beginPath();
      const a = ship.a;
      ctx.moveTo(ship.x + Math.cos(a)*SHIPR, ship.y + Math.sin(a)*SHIPR);
      ctx.lineTo(ship.x + Math.cos(a+2.5)*SHIPR, ship.y + Math.sin(a+2.5)*SHIPR);
      ctx.lineTo(ship.x + Math.cos(a-2.5)*SHIPR, ship.y + Math.sin(a-2.5)*SHIPR);
      ctx.closePath(); ctx.stroke();
      if (held.thrust && state === "play"){
        ctx.strokeStyle = c.green; ctx.beginPath();
        ctx.moveTo(ship.x + Math.cos(a+2.9)*SHIPR*0.7, ship.y + Math.sin(a+2.9)*SHIPR*0.7);
        ctx.lineTo(ship.x - Math.cos(a)*SHIPR*1.4, ship.y - Math.sin(a)*SHIPR*1.4);
        ctx.lineTo(ship.x + Math.cos(a-2.9)*SHIPR*0.7, ship.y + Math.sin(a-2.9)*SHIPR*0.7);
        ctx.stroke();
      }
    }

    ctx.fillStyle = c.green; ctx.font = "18px 'VT323', monospace"; ctx.textAlign = "left";
    ctx.fillText(`SCORE ${score}`, 8, 20);
    ctx.textAlign = "center"; ctx.fillStyle = c.dim; ctx.fillText(`WAVE ${wave}`, W/2, 20);
    ctx.textAlign = "right"; ctx.fillStyle = c.orange; ctx.fillText("^".repeat(Math.max(0, lives)), W-8, 20);
    ctx.textAlign = "center";

    if (state === "ready"){
      ctx.fillStyle = c.orange; ctx.font = "30px 'VT323', monospace"; ctx.fillText("VECTOR.EXE", W/2, H/2 - 14);
      ctx.fillStyle = c.green; ctx.font = "16px 'VT323', monospace"; ctx.fillText("ROTATE · THRUST · FIRE", W/2, H/2 + 10);
    } else if (state === "dead"){
      ctx.fillStyle = "rgba(4,8,10,.74)"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = c.orange; ctx.font = "30px 'VT323', monospace"; ctx.fillText("SIGNAL LOST", W/2, H/2 - 20);
      ctx.fillStyle = c.green; ctx.font = "20px 'VT323', monospace"; ctx.fillText(`SCORE ${score}   HI ${hi}`, W/2, H/2 + 6);
      if ((blink % 60) < 38){ ctx.fillStyle = c.dim; ctx.fillText("FIRE TO RESTART", W/2, H/2 + 36); }
    }
    ctx.textAlign = "left";
  }

  let raf = 0, running = false, last = 0;
  function loop(now){ const dt = Math.min(2.4, (now-last)/16.667); last = now; update(dt); draw(); raf = requestAnimationFrame(loop); }
  function start(){ if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(loop); }
  function stop(){ running = false; cancelAnimationFrame(raf); raf = 0; }

  cv.tabIndex = 0;
  cv.addEventListener("pointerdown", () => cv.focus());
  cv.addEventListener("keydown", e => {
    const k = e.key;
    if (k === "ArrowLeft" || k === "a"){ held.left = true; e.preventDefault(); }
    else if (k === "ArrowRight" || k === "d"){ held.right = true; e.preventDefault(); }
    else if (k === "ArrowUp" || k === "w"){ held.thrust = true; e.preventDefault(); }
    else if (e.code === "Space"){ if (state !== "play") start_(); else fire(); e.preventDefault(); }
  });
  cv.addEventListener("keyup", e => {
    const k = e.key;
    if (k === "ArrowLeft" || k === "a") held.left = false;
    else if (k === "ArrowRight" || k === "d") held.right = false;
    else if (k === "ArrowUp" || k === "w") held.thrust = false;
  });

  // on-screen buttons (mouse + touch)
  function bindHold(id, prop){
    const b = $(id); if (!b) return;
    const on = e => { e.preventDefault(); cv.focus(); if (state !== "play" && prop === "fire") start_(); held[prop] = true; };
    const off = () => held[prop] = false;
    b.addEventListener("pointerdown", on);
    b.addEventListener("pointerup", off);
    b.addEventListener("pointerleave", off);
    b.addEventListener("pointercancel", off);
  }
  bindHold("#vec-left", "left"); bindHold("#vec-right", "right");
  bindHold("#vec-thrust", "thrust"); bindHold("#vec-fire", "fire");

  const sync = () => {
    if (win.classList.contains("open")){ start(); cv.focus(); }
    else { stop(); for (const k in held) held[k] = false; reset(); }
  };
  new MutationObserver(sync).observe(win, { attributes:true, attributeFilter:["class"] });
  sync();
}
