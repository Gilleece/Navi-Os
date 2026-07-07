/* ============================================================
   NAVI-OS — system core: process table, signals, kernel panic
   The process table is honest theatre: window processes map to
   real open windows, and SIGKILL really closes them. The vital
   daemons are load-bearing — kill one and the kernel notices.
   ============================================================ */
import { closeWindow } from "./windows.js";
import { notify } from "./notify.js";

const BOOT_T = Date.now();
const p2 = n => String(n).padStart(2, "0");

export function uptimeStr(){
  let s = Math.floor((Date.now() - BOOT_T) / 1000);
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60);   s -= m * 60;
  return `${p2(h)}:${p2(m)}:${p2(s)}`;
}

/* ---------- process table ---------------------------------- */
/* cpu:[lo,hi] bounds a random walk; mem is a base figure in K. */
const SYS_PROCS = [
  { pid:  1, name: "atlas_kernel",   vital: true,  cpu: [1, 7],  mem: 112 },
  { pid:  7, name: "wired_daemon",   vital: true,  cpu: [2, 12], mem: 96  },
  { pid: 23, name: "navi_shell",     vital: true,  cpu: [1, 5],  mem: 64  },
  { pid: 40, name: "crt_compositor", vital: false, cpu: [2, 9],  mem: 48  },
  { pid: 77, name: "dream_log",      vital: false, cpu: [0, 3],  mem: 16  },
];
const WIN_PROCS = {
  "win-about":    { pid: 101, name: "about.sys", cpu: [0, 2],  mem: 24 },
  "win-projects": { pid: 102, name: "projects",  cpu: [0, 2],  mem: 28 },
  "win-calendar": { pid: 103, name: "calendar",  cpu: [0, 3],  mem: 22 },
  "win-notepad":  { pid: 104, name: "notepad",   cpu: [0, 2],  mem: 30 },
  "win-calc":     { pid: 105, name: "calc.exe",  cpu: [0, 2],  mem: 18 },
  "win-maze":     { pid: 106, name: "maze.exe",  cpu: [9, 38], mem: 96 },
  "win-term":     { pid: 107, name: "term.exe",  cpu: [0, 4],  mem: 26 },
  "win-sysmon":   { pid: 108, name: "sysmon",    cpu: [1, 5],  mem: 20 },
};

const dead = new Set();
const walk = new Map(); // pid -> current cpu, random-walked between samples

function sample(p){
  let cur = walk.get(p.pid) ?? (p.cpu[0] + p.cpu[1]) / 2;
  cur += (Math.random() - .5) * (p.cpu[1] - p.cpu[0]) * .4;
  cur = Math.max(p.cpu[0], Math.min(p.cpu[1], cur));
  walk.set(p.pid, cur);
  return { pid: p.pid, name: p.name, vital: !!p.vital,
           cpu: cur, mem: p.mem * (0.92 + Math.random() * .16) };
}

export function listProcs(){
  const out = SYS_PROCS.filter(p => !dead.has(p.pid)).map(sample);
  for (const [id, p] of Object.entries(WIN_PROCS)){
    const w = document.getElementById(id);
    if (w?.classList.contains("open")) out.push(sample(p));
  }
  return out;
}

export function kill(pid){
  const sys = SYS_PROCS.find(p => p.pid === pid && !dead.has(p.pid));
  if (sys){
    if (sys.vital){
      kernelPanic(`operator sent SIGKILL to ${sys.name} (pid ${pid})`);
      return "signal sent.";
    }
    dead.add(pid);
    if (sys.name === "crt_compositor"){
      document.body.classList.remove("crt");
      setTimeout(() => {
        dead.delete(pid);
        document.body.classList.add("crt");
        notify("SYS", "crt_compositor respawned — scanlines restored.");
      }, 24000);
      return "crt_compositor terminated. compositor offline: raw scan output.";
    }
    return `${sys.name} terminated. tonight's dreams will go unrecorded.`;
  }
  const entry = Object.entries(WIN_PROCS).find(([, p]) => p.pid === pid);
  if (entry){
    const w = document.getElementById(entry[0]);
    if (w?.classList.contains("open")){
      closeWindow(w);
      return `${entry[1].name} (pid ${pid}) terminated.`;
    }
  }
  return `kill: no such process: ${pid}`;
}

export function reboot(delay = 600){
  setTimeout(() => location.reload(), delay);
}

/* ---------- kernel panic ------------------------------------ */
export function kernelPanic(cause){
  if (document.getElementById("panic")) return;
  const hex = () => (Math.random() * 0xffffffff >>> 0).toString(16).padStart(8, "0");
  let dump = "";
  for (let i = 0; i < 6; i++) dump += `    0x${hex()}  0x${hex()}  0x${hex()}\n`;
  const d = document.createElement("div");
  d.id = "panic";
  d.innerHTML = `
    <div class="panic-box">
      <h1>:: KERNEL PANIC ::</h1>
      <pre>atlas kernel 7.7.7-wired — fatal exception in ring 0

cause: ${cause}

${dump}
state dump written to /dev/null
the wired does not forgive

rebooting in <span id="panic-n">3</span>_</pre>
    </div>`;
  document.body.appendChild(d);
  let n = 3;
  const t = setInterval(() => {
    n -= 1;
    const el = document.getElementById("panic-n");
    if (el) el.textContent = n;
    if (n <= 0){ clearInterval(t); location.reload(); }
  }, 1100);
}
