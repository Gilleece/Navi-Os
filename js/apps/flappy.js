/* ============================================================
   NAVI-OS — FLAPPY.EXE
   A DOS-flavoured flap-through-the-firewall game. Chunky pixels,
   phosphor palette, WebAudio bleeps. The loop only runs while the
   window is open; the high score lives in session memory.
   ============================================================ */
import { $ } from "../utils.js";
import { pal, beep } from "./_fx.js";
import { store } from "../store.js";

const W = 300, H = 420;              // internal (pixel) resolution
const GROUND = 46;
const BIRD_X = 78, BIRD_R = 11;
const GAP = 132, PIPE_W = 46, SPEED = 1.9, SPAWN = 168;
const GRAV = 0.42, FLAP = -6.6;

let hi = store.get("hi-flappy", 0);

export function initFlappy(){
  const win = $("#win-flappy"), cv = $("#flappy-canvas");
  if (!win || !cv) return;
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  const stars = Array.from({length:36}, () => ({ x:Math.random()*W, y:Math.random()*(H-GROUND), s:Math.random()<.3?2:1 }));

  let bird, vy, pipes, score, state, tSpawn, blink;
  function reset(){ bird = H/2; vy = 0; pipes = []; score = 0; state = "ready"; tSpawn = SPAWN*0.4; blink = 0; }
  reset();

  function flap(){
    if (state === "dead"){ reset(); return; }
    if (state === "ready") state = "play";
    if (state === "play"){ vy = FLAP; beep(660, .06); }
  }

  function spawn(){
    const m = 46, gy = m + Math.random() * (H - GROUND - GAP - m*2);
    pipes.push({ x: W, gy, passed:false });
  }
  function die(){ if (state === "play"){ state = "dead"; beep(160, .3, "sawtooth", .22); } }

  function update(dt){
    blink += dt;
    if (state !== "play") return;
    vy += GRAV * dt; bird += vy * dt;
    tSpawn += SPEED * dt;
    if (tSpawn >= SPAWN){ tSpawn -= SPAWN; spawn(); }
    for (const p of pipes){
      p.x -= SPEED * dt;
      if (!p.passed && p.x + PIPE_W < BIRD_X){ p.passed = true; score++; beep(880, .05); if (score > hi){ hi = score; store.set("hi-flappy", hi); } }
    }
    pipes = pipes.filter(p => p.x + PIPE_W > -4);
    if (bird + BIRD_R > H - GROUND){ bird = H - GROUND - BIRD_R; die(); }
    if (bird - BIRD_R < 0){ bird = BIRD_R; vy = 0; }
    for (const p of pipes){
      if (BIRD_X + BIRD_R > p.x && BIRD_X - BIRD_R < p.x + PIPE_W &&
          (bird - BIRD_R < p.gy || bird + BIRD_R > p.gy + GAP)) die();
    }
  }

  function pipe(x, y, h, c, capTop){
    if (h <= 0) return;
    ctx.fillStyle = c.ink; ctx.fillRect(x, y, PIPE_W, h);
    ctx.fillStyle = c.dim;
    for (let yy = y+3; yy < y+h-2; yy += 7) ctx.fillRect(x+4, yy, PIPE_W-8, 2);
    ctx.strokeStyle = c.green; ctx.lineWidth = 2; ctx.strokeRect(x+1, y-1, PIPE_W-2, h+2);
    const cy = capTop ? y+h-8 : y;
    ctx.fillStyle = c.green; ctx.fillRect(x-1, cy, PIPE_W+2, 8);
    ctx.fillStyle = c.bg;    ctx.fillRect(x+2, cy+2, PIPE_W-4, 4);
  }

  function draw(){
    const c = pal();
    ctx.fillStyle = c.bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = c.dim; for (const s of stars) ctx.fillRect(s.x|0, s.y|0, s.s, s.s);

    for (const p of pipes){
      pipe(p.x, 0, p.gy, c, true);
      pipe(p.x, p.gy + GAP, H - GROUND - (p.gy + GAP), c, false);
    }

    ctx.fillStyle = c.ink; ctx.fillRect(0, H-GROUND, W, GROUND);
    ctx.fillStyle = c.dim; for (let x = 0; x < W; x += 4) ctx.fillRect(x, H-GROUND, 2, 2);
    ctx.strokeStyle = c.green; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, H-GROUND+1); ctx.lineTo(W, H-GROUND+1); ctx.stroke();

    const bx = BIRD_X-BIRD_R, by = bird-BIRD_R, d = BIRD_R*2;
    ctx.fillStyle = c.orange; ctx.fillRect(bx, by, d, d);
    ctx.fillStyle = c.ink;    ctx.fillRect(bx+2, by + (vy < 0 ? d-6 : 3), d-8, 3);   // wing
    ctx.fillStyle = c.bg;     ctx.fillRect(bx + d - 8, by + 5, 3, 3);                // eye
    ctx.fillStyle = c.green;  ctx.fillRect(bx + d, by + d/2 - 1, 5, 3);              // beak

    ctx.fillStyle = c.green; ctx.font = "28px 'VT323', monospace"; ctx.textAlign = "center";
    ctx.fillText(score, W/2, 40);

    if (state === "ready"){
      ctx.fillStyle = c.orange; ctx.font = "30px 'VT323', monospace";
      ctx.fillText("FLAPPY.EXE", W/2, H/2 - 20);
      ctx.fillStyle = c.green; ctx.font = "18px 'VT323', monospace";
      ctx.fillText("TAP / SPACE TO FLAP", W/2, H/2 + 8);
    } else if (state === "dead"){
      ctx.fillStyle = "rgba(4,8,10,.72)"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = c.orange; ctx.font = "32px 'VT323', monospace";
      ctx.fillText("CONNECTION LOST", W/2, H/2 - 28);
      ctx.fillStyle = c.green; ctx.font = "20px 'VT323', monospace";
      ctx.fillText(`SCORE ${score}   HI ${hi}`, W/2, H/2 + 4);
      if ((blink % 60) < 38){ ctx.fillStyle = c.dim; ctx.fillText("TAP TO RETRY", W/2, H/2 + 36); }
    }
    ctx.textAlign = "left";
  }

  /* loop, gated on the window being open ------------------------ */
  let raf = 0, running = false, last = 0;
  function loop(now){
    const dt = Math.min(2.4, (now - last) / 16.667); last = now;
    update(dt); draw();
    raf = requestAnimationFrame(loop);
  }
  function start(){ if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(loop); }
  function stop(){ running = false; cancelAnimationFrame(raf); raf = 0; }

  cv.tabIndex = 0;
  cv.addEventListener("pointerdown", e => { e.preventDefault(); cv.focus(); flap(); });
  cv.addEventListener("keydown", e => {
    if (e.code === "Space" || e.code === "ArrowUp" || e.key === "w" || e.key === "W"){ e.preventDefault(); flap(); }
  });

  const sync = () => {
    if (win.classList.contains("open")){ start(); cv.focus(); }
    else { stop(); reset(); }
  };
  new MutationObserver(sync).observe(win, { attributes:true, attributeFilter:["class"] });
  sync();
}
