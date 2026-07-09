/* ============================================================
   NAVI-OS — DEFRAG.EXE
   Breakout, reskinned as defragmenting a corrupted disk. The
   paddle is a read/write head; bricks are bad sectors that clear
   as the disk defragments. Loop runs only while the window opens.
   ============================================================ */
import { $ } from "../utils.js";
import { pal, beep } from "./_fx.js";
import { store } from "../store.js";

const W = 340, H = 380, M = 10;
const PADW = 62, PADH = 8, PADY = H - 26, BR = 5;
const BCOLS = 10, BROWS = 5, BGAP = 3, BTOP = 46, BH = 15;
const BW = (W - 2*M - BGAP*(BCOLS-1)) / BCOLS;
const TOTAL = BCOLS * BROWS;

let hi = store.get("hi-defrag", 0);

export function initDefrag(){
  const win = $("#win-defrag"), cv = $("#defrag-canvas");
  if (!win || !cv) return;
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");

  let px, ball, bricks, score, lives, state, blink;
  function buildBricks(){ bricks = []; for (let r = 0; r < BROWS; r++) for (let c = 0; c < BCOLS; c++) bricks.push({ c, r, alive:true }); }
  function resetBall(){ ball = { x:W/2, y:PADY-10, vx:0, vy:0, stuck:true }; }
  function reset(){ px = W/2 - PADW/2; buildBricks(); resetBall(); score = 0; lives = 3; state = "ready"; blink = 0; }
  reset();

  function launch(){
    if (state === "dead" || state === "win"){ reset(); return; }
    if (state === "ready") state = "play";
    if (ball.stuck){ ball.stuck = false; ball.vx = 2.0 * (Math.random() < .5 ? -1 : 1); ball.vy = -3.2; beep(600, .05); }
  }
  const brickRect = b => ({ x: M + b.c*(BW+BGAP), y: BTOP + b.r*(BH+BGAP), w: BW, h: BH });

  function update(dt){
    blink += dt;
    if (state !== "play") return;
    px = Math.max(0, Math.min(W - PADW, px));
    if (ball.stuck){ ball.x = px + PADW/2; ball.y = PADY - BR - 1; return; }
    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    if (ball.x < BR){ ball.x = BR; ball.vx = Math.abs(ball.vx); beep(300, .03); }
    if (ball.x > W-BR){ ball.x = W-BR; ball.vx = -Math.abs(ball.vx); beep(300, .03); }
    if (ball.y < BR){ ball.y = BR; ball.vy = Math.abs(ball.vy); beep(300, .03); }

    if (ball.vy > 0 && ball.y + BR >= PADY && ball.y - BR <= PADY + PADH && ball.x >= px - BR && ball.x <= px + PADW + BR){
      ball.y = PADY - BR;
      const hit = (ball.x - (px + PADW/2)) / (PADW/2);           // -1..1
      const sp = Math.min(6, Math.hypot(ball.vx, ball.vy) + .04), ang = hit * 1.05;
      ball.vx = sp * Math.sin(ang); ball.vy = -Math.abs(sp * Math.cos(ang)); beep(500, .04);
    }
    for (const b of bricks){
      if (!b.alive) continue;
      const r = brickRect(b);
      if (ball.x+BR > r.x && ball.x-BR < r.x+r.w && ball.y+BR > r.y && ball.y-BR < r.y+r.h){
        b.alive = false; score += 10; if (score > hi){ hi = score; store.set("hi-defrag", hi); }
        const ox = Math.min(ball.x+BR - r.x, r.x+r.w - (ball.x-BR));
        const oy = Math.min(ball.y+BR - r.y, r.y+r.h - (ball.y-BR));
        if (ox < oy) ball.vx = -ball.vx; else ball.vy = -ball.vy;
        beep(720 + b.r*40, .04); break;
      }
    }
    if (bricks.every(b => !b.alive)){ state = "win"; beep(880, .3, "square", .2); }
    if (ball.y - BR > H){ lives--; if (lives <= 0){ state = "dead"; beep(140, .35, "sawtooth", .2); } else resetBall(); }
  }

  function draw(){
    const c = pal();
    ctx.fillStyle = c.bg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = c.ink; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 20){ ctx.beginPath(); ctx.moveTo(x+.5, 30); ctx.lineTo(x+.5, H); ctx.stroke(); }

    for (const b of bricks){
      if (!b.alive) continue;
      const r = brickRect(b), col = b.r < 2 ? c.orange : c.green;
      ctx.fillStyle = col; ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = c.bg; ctx.fillRect(r.x+1, r.y+1, r.w-2, 2);
    }

    ctx.fillStyle = c.green; ctx.fillRect(px, PADY, PADW, PADH);
    ctx.fillStyle = c.orange; ctx.fillRect(px + PADW/2 - 4, PADY, 8, PADH);
    ctx.fillStyle = c.green; ctx.beginPath(); ctx.arc(ball.x, ball.y, BR, 0, 7); ctx.fill();

    const cleared = TOTAL - bricks.filter(b => b.alive).length;
    const pct = Math.round(cleared / TOTAL * 100);
    ctx.fillStyle = c.green; ctx.font = "18px 'VT323', monospace"; ctx.textAlign = "left";
    ctx.fillText(`DEFRAG ${pct}%`, 8, 20);
    ctx.textAlign = "right"; ctx.fillStyle = c.dim;
    ctx.fillText("HEADS " + "#".repeat(Math.max(0, lives)), W-8, 20);
    ctx.textAlign = "center";

    if (state === "ready"){
      ctx.fillStyle = c.orange; ctx.font = "28px 'VT323', monospace"; ctx.fillText("DEFRAG.EXE", W/2, H/2 - 16);
      ctx.fillStyle = c.green; ctx.font = "17px 'VT323', monospace"; ctx.fillText("MOVE HEAD · CLICK / SPACE TO SCAN", W/2, H/2 + 8);
    } else if (state === "dead" || state === "win"){
      ctx.fillStyle = "rgba(4,8,10,.74)"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = state === "win" ? c.green : c.orange; ctx.font = "30px 'VT323', monospace";
      ctx.fillText(state === "win" ? "DEFRAG COMPLETE" : "DISK FAILURE", W/2, H/2 - 22);
      ctx.fillStyle = c.green; ctx.font = "20px 'VT323', monospace"; ctx.fillText(`SCORE ${score}   HI ${hi}`, W/2, H/2 + 4);
      if ((blink % 60) < 38){ ctx.fillStyle = c.dim; ctx.fillText("CLICK TO RUN AGAIN", W/2, H/2 + 34); }
    }
    ctx.textAlign = "left";
  }

  let raf = 0, running = false, last = 0;
  function loop(now){ const dt = Math.min(2.4, (now-last)/16.667); last = now; update(dt); draw(); raf = requestAnimationFrame(loop); }
  function start(){ if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(loop); }
  function stop(){ running = false; cancelAnimationFrame(raf); raf = 0; }

  const pointerX = e => { const r = cv.getBoundingClientRect(); return (e.clientX - r.left) / r.width * W; };
  cv.tabIndex = 0;
  cv.addEventListener("pointermove", e => { if (state === "play") px = pointerX(e) - PADW/2; });
  cv.addEventListener("pointerdown", e => { e.preventDefault(); cv.focus(); px = pointerX(e) - PADW/2; launch(); });
  cv.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft" || e.key === "a"){ px -= 26; e.preventDefault(); }
    else if (e.key === "ArrowRight" || e.key === "d"){ px += 26; e.preventDefault(); }
    else if (e.code === "Space"){ launch(); e.preventDefault(); }
  });

  const sync = () => { if (win.classList.contains("open")){ start(); cv.focus(); } else { stop(); reset(); } };
  new MutationObserver(sync).observe(win, { attributes:true, attributeFilter:["class"] });
  sync();
}
