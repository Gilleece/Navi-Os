/* ============================================================
   NAVI-OS — LIFE.EXE
   Conway's Game of Life as a phosphor sandbox. Toroidal grid;
   click / drag to draw. Newborn cells flare orange, survivors
   settle to green. Ticks only while the window is open.
   ============================================================ */
import { $ } from "../utils.js";

const CELL = 9;                 // pixels per cell

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

export function initLife(){
  const win = $("#win-life"), cv = $("#life-canvas"), wrap = $("#life-wrap");
  if (!win || !cv) return;
  const ctx = cv.getContext("2d");

  let cols = 0, rows = 0, cur, age, gen = 0, pop = 0;
  let playing = false, sps = 10, acc = 0;   // steps per second

  function resize(){
    const w = wrap.clientWidth, h = wrap.clientHeight;
    if (w < 8 || h < 8) return;
    const nc = Math.floor(w / CELL), nr = Math.floor(h / CELL);
    if (nc === cols && nr === rows) return;
    cols = nc; rows = nr; cv.width = cols*CELL; cv.height = rows*CELL;
    cur = new Uint8Array(cols*rows); age = new Uint8Array(cols*rows);
    seed();
  }
  function seed(){
    gen = 0;
    for (let i = 0; i < cur.length; i++){ cur[i] = Math.random() < .22 ? 1 : 0; age[i] = cur[i]; }
    draw();
  }
  function clear(){
    gen = 0; cur.fill(0); age.fill(0); draw();
  }

  function step(){
    const nxt = new Uint8Array(cols*rows);
    pop = 0;
    for (let y = 0; y < rows; y++){
      const yu = (y-1+rows)%rows, yd = (y+1)%rows;
      for (let x = 0; x < cols; x++){
        const xl = (x-1+cols)%cols, xr = (x+1)%cols;
        const n = cur[yu*cols+xl]+cur[yu*cols+x]+cur[yu*cols+xr]
                + cur[y*cols+xl]              +cur[y*cols+xr]
                + cur[yd*cols+xl]+cur[yd*cols+x]+cur[yd*cols+xr];
        const i = y*cols+x, alive = cur[i];
        const live = alive ? (n === 2 || n === 3) : (n === 3);
        nxt[i] = live ? 1 : 0;
        if (live){ pop++; age[i] = alive ? Math.min(age[i]+1, 250) : 1; }
        else age[i] = 0;
      }
    }
    cur = nxt; gen++;
  }

  function draw(){
    const c = pal();
    ctx.fillStyle = c.bg; ctx.fillRect(0, 0, cv.width, cv.height);
    let live = 0;
    for (let i = 0; i < cur.length; i++){
      if (!cur[i]) continue;
      live++;
      const a = age[i];
      ctx.fillStyle = a === 1 ? c.orange : a < 6 ? c.green : c.dim;
      const x = (i % cols) * CELL, y = ((i / cols) | 0) * CELL;
      ctx.fillRect(x, y, CELL-1, CELL-1);
    }
    pop = live;
    $("#life-read").textContent = `GEN ${gen} · POP ${pop}`;
  }

  /* draw with the pointer --------------------------------------- */
  let painting = false, paintVal = 1;
  function cellAt(e){
    const r = cv.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / (r.width / cols));
    const y = Math.floor((e.clientY - r.top) / (r.height / rows));
    if (x < 0 || y < 0 || x >= cols || y >= rows) return -1;
    return y*cols + x;
  }
  cv.addEventListener("pointerdown", e => {
    e.preventDefault(); const i = cellAt(e); if (i < 0) return;
    paintVal = cur[i] ? 0 : 1; cur[i] = paintVal; age[i] = paintVal; draw();
    painting = true; cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener("pointermove", e => {
    if (!painting) return; const i = cellAt(e); if (i < 0) return;
    if (cur[i] !== paintVal){ cur[i] = paintVal; age[i] = paintVal; draw(); }
  });
  cv.addEventListener("pointerup", () => { painting = false; });

  /* loop -------------------------------------------------------- */
  let raf = 0, running = false, last = 0;
  function loop(now){
    const dt = (now - last) / 1000; last = now;
    if (playing){ acc += dt; let guard = 0; while (acc >= 1/sps && guard++ < 6){ acc -= 1/sps; step(); } if (guard) draw(); }
    raf = requestAnimationFrame(loop);
  }
  function start(){ if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(loop); }
  function stop(){ running = false; cancelAnimationFrame(raf); raf = 0; }

  const btnRun = $("#life-run");
  function setPlaying(p){ playing = p; btnRun.textContent = p ? "[ PAUSE ]" : "[ RUN ]"; btnRun.classList.toggle("on", p); }
  btnRun.addEventListener("click", () => setPlaying(!playing));
  $("#life-step").addEventListener("click", () => { setPlaying(false); step(); draw(); });
  $("#life-rand").addEventListener("click", seed);
  $("#life-clear").addEventListener("click", () => { setPlaying(false); clear(); });
  $("#life-speed").addEventListener("input", e => sps = +e.target.value);

  const sync = () => {
    if (win.classList.contains("open")){ resize(); start(); }
    else { stop(); setPlaying(false); }
  };
  new MutationObserver(sync).observe(win, { attributes:true, attributeFilter:["class"] });
  window.addEventListener("resize", () => { if (win.classList.contains("open")) resize(); });
  sync();
}
