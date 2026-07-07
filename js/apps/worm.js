/* ============================================================
   NAVI-OS — WORM.EXE
   A phosphor take on Snake. The worm crawls the grid eating stray
   data packets; walls and its own tail are fatal. Arrows / WASD on
   desktop, swipe on touch. High score lives in session memory.
   ============================================================ */
import { $ } from "../utils.js";

const COLS = 24, ROWS = 20, CELL = 16;   // internal res 384 x 320
const W = COLS * CELL, H = ROWS * CELL;

let hi = 0;

/* palette cache ------------------------------------------------- */
let _t = "", _p = {};
function pal(){
  const t = document.documentElement.dataset.theme || "atlas";
  if (t !== _t){
    const cs = getComputedStyle(document.documentElement), g = k => cs.getPropertyValue(k).trim();
    _p = { green:g("--green")||"#46ff8e", dim:g("--green-dim")||"#1f7a4a",
           ink:g("--green-ink")||"#0c2b1a", orange:g("--orange")||"#ff7a1a", bg:g("--bg")||"#04080a" };
    _t = t;
  }
  return _p;
}

/* audio --------------------------------------------------------- */
let ac = null;
function beep(freq, dur = .07, type = "square", vol = .16){
  try{
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === "suspended") ac.resume();
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + dur + .02);
  }catch(e){}
}

export function initWorm(){
  const win = $("#win-worm"), cv = $("#worm-canvas");
  if (!win || !cv) return;
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");

  let snake, dir, nextDir, food, score, state, acc, blink;
  function interval(){ return Math.max(.072, .145 - score * 0.004); }

  function placeFood(){
    let x, y;
    do { x = (Math.random()*COLS)|0; y = (Math.random()*ROWS)|0; }
    while (snake.some(s => s.x === x && s.y === y));
    food = { x, y };
  }
  function reset(){
    snake = [{x:8,y:10},{x:7,y:10},{x:6,y:10}];
    dir = {x:1,y:0}; nextDir = dir; score = 0; state = "ready"; acc = 0; blink = 0;
    placeFood();
  }
  reset();

  function turn(x, y){
    if (state === "dead"){ reset(); return; }
    if (x === -dir.x && y === -dir.y) return;   // no reversing into the neck
    nextDir = { x, y };
    if (state === "ready") state = "play";
  }

  function step(){
    dir = nextDir;
    const nx = snake[0].x + dir.x, ny = snake[0].y + dir.y;
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) return die();
    const grow = (nx === food.x && ny === food.y);
    const body = grow ? snake : snake.slice(0, -1);
    if (body.some(s => s.x === nx && s.y === ny)) return die();
    snake.unshift({ x:nx, y:ny });
    if (grow){ score++; if (score > hi) hi = score; beep(760 + score*8, .05); placeFood(); }
    else snake.pop();
  }
  function die(){ state = "dead"; beep(150, .32, "sawtooth", .2); }

  function cell(x, y, color, inset = 1){
    ctx.fillStyle = color;
    ctx.fillRect(x*CELL + inset, y*CELL + inset, CELL - inset*2, CELL - inset*2);
  }

  function draw(){
    const c = pal();
    ctx.fillStyle = c.bg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = c.ink; ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x++){ ctx.beginPath(); ctx.moveTo(x*CELL+.5,0); ctx.lineTo(x*CELL+.5,H); ctx.stroke(); }
    for (let y = 0; y <= ROWS; y++){ ctx.beginPath(); ctx.moveTo(0,y*CELL+.5); ctx.lineTo(W,y*CELL+.5); ctx.stroke(); }

    if ((blink % 40) < 28) cell(food.x, food.y, c.orange, 3);   // blinking packet
    cell(food.x, food.y, c.orange, 5);

    snake.forEach((s, i) => cell(s.x, s.y, i === 0 ? c.green : c.dim, i === 0 ? 1 : 2));

    ctx.fillStyle = c.green; ctx.font = "20px 'VT323', monospace"; ctx.textAlign = "left";
    ctx.fillText(`LEN ${snake.length}`, 8, 20);
    ctx.textAlign = "right"; ctx.fillStyle = c.dim; ctx.fillText(`HI ${hi}`, W-8, 20);
    ctx.textAlign = "center";

    if (state === "ready"){
      ctx.fillStyle = "rgba(4,8,10,.55)"; ctx.fillRect(0, H/2-46, W, 92);
      ctx.fillStyle = c.orange; ctx.font = "30px 'VT323', monospace"; ctx.fillText("WORM.EXE", W/2, H/2-8);
      ctx.fillStyle = c.green; ctx.font = "17px 'VT323', monospace"; ctx.fillText("ARROWS / WASD / SWIPE", W/2, H/2+18);
    } else if (state === "dead"){
      ctx.fillStyle = "rgba(4,8,10,.72)"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = c.orange; ctx.font = "30px 'VT323', monospace"; ctx.fillText("SEGMENTATION FAULT", W/2, H/2-24);
      ctx.fillStyle = c.green; ctx.font = "20px 'VT323', monospace"; ctx.fillText(`LEN ${snake.length}   HI ${hi}`, W/2, H/2+4);
      if ((blink % 60) < 38){ ctx.fillStyle = c.dim; ctx.fillText("TAP / KEY TO RETRY", W/2, H/2+34); }
    }
    ctx.textAlign = "left";
  }

  let raf = 0, running = false, last = 0;
  function loop(now){
    const dt = (now - last) / 1000; last = now; blink += dt * 60;
    if (state === "play"){ acc += dt; let guard = 0; while (acc >= interval() && guard++ < 8){ acc -= interval(); step(); } }
    else acc = 0;
    draw();
    raf = requestAnimationFrame(loop);
  }
  function start(){ if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(loop); }
  function stop(){ running = false; cancelAnimationFrame(raf); raf = 0; }

  cv.tabIndex = 0;
  cv.addEventListener("keydown", e => {
    const k = e.key;
    if (k === "ArrowUp" || k === "w" || k === "W"){ e.preventDefault(); turn(0,-1); }
    else if (k === "ArrowDown" || k === "s" || k === "S"){ e.preventDefault(); turn(0,1); }
    else if (k === "ArrowLeft" || k === "a" || k === "A"){ e.preventDefault(); turn(-1,0); }
    else if (k === "ArrowRight" || k === "d" || k === "D"){ e.preventDefault(); turn(1,0); }
  });

  // touch / click: swipe to steer, tap to start or retry
  let sx = 0, sy = 0;
  cv.addEventListener("pointerdown", e => { cv.focus(); sx = e.clientX; sy = e.clientY; });
  cv.addEventListener("pointerup", e => {
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12){ if (state !== "play") turn(dir.x, dir.y); return; }
    if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 1 : -1, 0);
    else turn(0, dy > 0 ? 1 : -1);
  });

  const sync = () => {
    if (win.classList.contains("open")){ start(); cv.focus(); }
    else { stop(); reset(); }
  };
  new MutationObserver(sync).observe(win, { attributes:true, attributeFilter:["class"] });
  sync();
}
