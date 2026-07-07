/* ============================================================
   NAVI-OS — SYSMON (process monitor)
   Live view over the same process table term.exe uses. Rows
   are clickable to kill; a rolling CPU sparkline sits on top.
   Only ticks while its window is open.
   ============================================================ */
import { $ } from "../utils.js";
import { listProcs, kill, uptimeStr } from "../system.js";

const HIST = 60;
let cpuHist = [];

function drawGraph(cv, total){
  const ctx = cv.getContext("2d"), w = cv.width, h = cv.height;
  ctx.clearRect(0, 0, w, h);
  const css = getComputedStyle(document.documentElement);
  const green = css.getPropertyValue("--green").trim() || "#46ff8e";
  const dim = css.getPropertyValue("--green-dim").trim() || "#1f7a4a";
  // grid
  ctx.strokeStyle = dim; ctx.globalAlpha = .35; ctx.lineWidth = 1;
  for (let y = 0; y <= 4; y++){
    const yy = (h / 4) * y + .5;
    ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(w, yy); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // line
  ctx.beginPath();
  cpuHist.forEach((v, i) => {
    const x = (w / (HIST - 1)) * i;
    const y = h - (Math.min(v, 100) / 100) * h;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });
  ctx.strokeStyle = green; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
  ctx.globalAlpha = .12; ctx.fillStyle = green; ctx.fill(); ctx.globalAlpha = 1;
  ctx.fillStyle = green; ctx.font = "14px 'VT323', monospace";
  ctx.fillText(`CPU ${total.toFixed(0)}%`, 6, 16);
}

export function initSysmon(){
  const win = $("#win-sysmon");
  const body = $("#sysmon-body");
  const graph = $("#sysmon-graph");
  const foot = $("#sysmon-foot");
  if (!win || !body) return;
  cpuHist = new Array(HIST).fill(0);

  function tick(){
    if (!win.classList.contains("open")) return;
    const procs = listProcs().sort((a, b) => b.cpu - a.cpu);
    const totalCpu = procs.reduce((s, p) => s + p.cpu, 0);
    const totalMem = procs.reduce((s, p) => s + p.mem, 0);
    cpuHist.push(totalCpu); if (cpuHist.length > HIST) cpuHist.shift();
    if (graph.width !== graph.clientWidth) graph.width = graph.clientWidth;
    drawGraph(graph, totalCpu);

    body.innerHTML = "";
    for (const p of procs){
      const row = document.createElement("div");
      row.className = "sm-row" + (p.vital ? " vital" : "");
      const barW = Math.min(100, (p.cpu / 40) * 100);
      row.innerHTML =
        `<span class="sm-pid">${p.pid}</span>` +
        `<span class="sm-name">${p.name}</span>` +
        `<span class="sm-bar"><i style="width:${barW}%"></i></span>` +
        `<span class="sm-cpu">${p.cpu.toFixed(1)}%</span>` +
        `<span class="sm-mem">${Math.round(p.mem)}K</span>` +
        `<button class="sm-kill" title="SIGKILL">×</button>`;
      row.querySelector(".sm-kill").addEventListener("click", e => {
        e.stopPropagation();
        kill(p.pid);
      });
      body.appendChild(row);
    }
    foot.textContent = `${procs.length} procs · ${(totalMem / 1024).toFixed(2)}M used · up ${uptimeStr()}`;
  }

  // run only while open
  let timer = 0;
  const obs = () => {
    if (win.classList.contains("open") && !timer){ tick(); timer = setInterval(tick, 1000); }
    else if (!win.classList.contains("open") && timer){ clearInterval(timer); timer = 0; }
  };
  new MutationObserver(obs).observe(win, { attributes: true, attributeFilter: ["class"] });
  obs();
}
