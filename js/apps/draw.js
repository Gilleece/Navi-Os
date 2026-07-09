/* ============================================================
   NAVI-OS — DRAW.EXE
   A little MS-Paint-style pixel canvas locked to a phosphor
   palette. Pencil / eraser, clear, and export-to-PNG. Colours
   are fixed hex so an exported sprite looks the same anywhere.
   ============================================================ */
import { $ } from "../utils.js";
import { pal } from "./_fx.js";
import { store } from "../store.js";

const GW = 40, GH = 32, CELL = 10;
const W = GW*CELL, H = GH*CELL;
const COLORS = ["#46ff8e", "#1f7a4a", "#ff7a1a", "#ff3b3b", "#5ad4ff", "#ffb642", "#d8f0e4", null]; // null = erase

export function initDraw(){
  const win = $("#win-draw"), cv = $("#draw-canvas"), pl = $("#draw-palette");
  if (!win || !cv) return;
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  const data = new Array(GW*GH).fill(null);
  const savedPix = store.get("draw");
  if (Array.isArray(savedPix) && savedPix.length === data.length)
    savedPix.forEach((v, i) => data[i] = v);
  let color = COLORS[0], painting = false;

  // palette swatches
  pl.innerHTML = "";
  COLORS.forEach((col, i) => {
    const b = document.createElement("button");
    b.className = "draw-sw" + (col === null ? " erase" : "") + (i === 0 ? " sel" : "");
    if (col) b.style.background = col;
    b.title = col === null ? "erase" : col;
    b.addEventListener("click", () => {
      color = col;
      [...pl.children].forEach(x => x.classList.remove("sel"));
      b.classList.add("sel");
    });
    pl.appendChild(b);
  });

  function draw(){
    const c = pal();
    ctx.fillStyle = c.bg; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < data.length; i++){
      if (!data[i]) continue;
      ctx.fillStyle = data[i];
      ctx.fillRect((i % GW)*CELL, ((i/GW)|0)*CELL, CELL, CELL);
    }
    ctx.strokeStyle = c.ink; ctx.lineWidth = 1; ctx.globalAlpha = .5;
    for (let x = 0; x <= GW; x++){ ctx.beginPath(); ctx.moveTo(x*CELL+.5, 0); ctx.lineTo(x*CELL+.5, H); ctx.stroke(); }
    for (let y = 0; y <= GH; y++){ ctx.beginPath(); ctx.moveTo(0, y*CELL+.5); ctx.lineTo(W, y*CELL+.5); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }

  function cellAt(e){
    const r = cv.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / (r.width / GW));
    const y = Math.floor((e.clientY - r.top) / (r.height / GH));
    return (x < 0 || y < 0 || x >= GW || y >= GH) ? -1 : y*GW + x;
  }
  function paintAt(e){ const i = cellAt(e); if (i < 0) return; if (data[i] !== color){ data[i] = color; draw(); } }

  cv.addEventListener("pointerdown", e => { e.preventDefault(); painting = true; cv.setPointerCapture(e.pointerId); paintAt(e); });
  cv.addEventListener("pointermove", e => { if (painting) paintAt(e); });
  cv.addEventListener("pointerup", () => { painting = false; store.set("draw", data); });

  $("#draw-clear").addEventListener("click", () => { data.fill(null); draw(); store.set("draw", data); });
  $("#draw-save").addEventListener("click", () => {
    const S = 12, out = document.createElement("canvas");
    out.width = GW*S; out.height = GH*S;
    const o = out.getContext("2d");
    o.fillStyle = "#04080a"; o.fillRect(0, 0, out.width, out.height);
    for (let i = 0; i < data.length; i++){ if (!data[i]) continue; o.fillStyle = data[i]; o.fillRect((i%GW)*S, ((i/GW)|0)*S, S, S); }
    out.toBlob(blob => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "navi-draw.png"; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    });
  });

  const sync = () => { if (win.classList.contains("open")) draw(); };
  new MutationObserver(sync).observe(win, { attributes:true, attributeFilter:["class"] });
  draw();
}
