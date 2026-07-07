/* ============================================================
   NAVI-OS — SCAN.EXE
   Minesweeper, reskinned as scanning disk sectors for logic
   bombs. Numbers count adjacent threats. Right-click (or FLAG
   mode on touch) to mark a sector. First scan is always safe.
   ============================================================ */
import { $ } from "../utils.js";
import { beep } from "./_fx.js";

const COLS = 10, ROWS = 12, MINES = 18, N = COLS*ROWS;

export function initScan(){
  const win = $("#win-scan"), grid = $("#scan-grid"), read = $("#scan-read");
  if (!win || !grid) return;

  let mine, count, shown, flag, cells, state, placed, flags;

  function build(){
    grid.innerHTML = ""; cells = [];
    for (let i = 0; i < N; i++){
      const b = document.createElement("button");
      b.className = "scan-cell"; b.dataset.i = i;
      cells.push(b); grid.appendChild(b);
    }
  }
  function reset(){
    mine = new Uint8Array(N); count = new Uint8Array(N);
    shown = new Uint8Array(N); flag = new Uint8Array(N);
    state = "ready"; placed = false; flags = 0;
    cells.forEach(b => { b.className = "scan-cell"; b.textContent = ""; });
    render();
  }

  const nbrs = i => {
    const x = i % COLS, y = (i/COLS)|0, out = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++){
      if (!dx && !dy) continue;
      const nx = x+dx, ny = y+dy;
      if (nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS) out.push(ny*COLS + nx);
    }
    return out;
  };

  function place(safe){
    const pool = [];
    for (let i = 0; i < N; i++) if (i !== safe && !nbrs(safe).includes(i)) pool.push(i);
    for (let m = 0; m < MINES; m++){ const k = (Math.random()*pool.length)|0; mine[pool.splice(k,1)[0]] = 1; }
    for (let i = 0; i < N; i++) count[i] = nbrs(i).reduce((s, j) => s + mine[j], 0);
    placed = true;
  }

  function reveal(i){
    if (shown[i] || flag[i]) return;
    shown[i] = 1;
    if (count[i] === 0 && !mine[i]) nbrs(i).forEach(reveal);
  }

  function render(){
    for (let i = 0; i < N; i++){
      const b = cells[i];
      b.className = "scan-cell";
      b.textContent = "";
      if (flag[i] && !shown[i]){ b.classList.add("flag"); b.textContent = "⚑"; continue; }
      if (!shown[i]) continue;
      b.classList.add("open");
      if (mine[i]){ b.classList.add("bomb"); b.textContent = "✹"; }
      else if (count[i]){ b.textContent = count[i]; b.dataset.n = count[i]; }
    }
    const left = MINES - flags;
    read.textContent = state === "dead" ? "SECTOR BREACH — logic bomb detonated"
      : state === "win" ? "DISK CLEAN — all sectors scanned"
      : `BOMBS ${left}   ·   right-click / FLAG to mark`;
  }

  function lose(){ state = "dead"; for (let i = 0; i < N; i++) if (mine[i]) shown[i] = 1; render(); beep(140, .4, "sawtooth", .2); }
  function checkWin(){
    let ok = 0; for (let i = 0; i < N; i++) if (shown[i] && !mine[i]) ok++;
    if (ok === N - MINES){ state = "win"; beep(880, .3, "square", .2); render(); }
  }

  function dig(i){
    if (state === "dead" || state === "win" || shown[i] || flag[i]) return;
    if (!placed) place(i);
    if (mine[i]) return lose();
    reveal(i); state = "play"; beep(600, .03, "square", .1); render(); checkWin();
  }
  function mark(i){
    if (state === "dead" || state === "win" || shown[i]) return;
    flag[i] ^= 1; flags += flag[i] ? 1 : -1; render();
  }

  let flagMode = false;
  const flagBtn = $("#scan-flag");
  grid.addEventListener("click", e => { const b = e.target.closest(".scan-cell"); if (!b) return; const i = +b.dataset.i; flagMode ? mark(i) : dig(i); });
  grid.addEventListener("contextmenu", e => { const b = e.target.closest(".scan-cell"); if (!b) return; e.preventDefault(); mark(+b.dataset.i); });
  flagBtn.addEventListener("click", () => { flagMode = !flagMode; flagBtn.classList.toggle("on", flagMode); flagBtn.textContent = flagMode ? "FLAG: ON" : "FLAG: OFF"; });
  $("#scan-new").addEventListener("click", reset);

  build(); reset();
}
