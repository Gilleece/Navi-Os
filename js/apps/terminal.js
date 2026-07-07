/* ============================================================
   NAVI-OS — TERM.EXE
   A small shell that actually drives the OS: it can open and
   close windows, list and kill processes, switch themes, and
   talk back. Backtick (`) toggles it from anywhere.
   ============================================================ */
import { $ } from "../utils.js";
import { openWindow } from "../windows.js";
import { listProcs, kill, uptimeStr, reboot, kernelPanic } from "../system.js";
import { setTheme, THEMES } from "../theme.js";

const WINDOWS = {
  about: "win-about", projects: "win-projects", calendar: "win-calendar",
  notepad: "win-notepad", calc: "win-calc", maze: "win-maze",
  term: "win-term", sysmon: "win-sysmon",
  flappy: "win-flappy", worm: "win-worm", tracker: "win-tracker", life: "win-life",
};

let out, input, history = [], hi = 0;

function print(text = "", cls = ""){
  const line = document.createElement("div");
  line.className = "term-line" + (cls ? " " + cls : "");
  line.textContent = text;
  out.appendChild(line);
  out.scrollTop = out.scrollHeight;
}
function printHTML(html){
  const line = document.createElement("div");
  line.className = "term-line"; line.innerHTML = html;
  out.appendChild(line); out.scrollTop = out.scrollHeight;
}

const COMMANDS = {
  help(){
    print("available commands:", "accent");
    print("  help              this list");
    print("  ls                list programs");
    print("  open <name>       launch a program window");
    print("  close <name>      close a program window");
    print("  ps                list running processes");
    print("  kill <pid>        send SIGKILL to a process");
    print("  top               open the process monitor");
    print("  uptime            time since boot");
    print("  theme [name]      list or switch colour themes");
    print("  neofetch          system readout");
    print("  echo <text>       say it back");
    print("  whoami            operator identity");
    print("  date              current wired time");
    print("  fortune           a transmission from the wired");
    print("  matrix            let the rain fall");
    print("  clear             wipe the screen");
    print("  reboot            reload the shell");
    print("  exit              close this terminal");
  },
  ls(){
    Object.keys(WINDOWS).forEach(k => print("  " + k));
  },
  open(a){
    const id = WINDOWS[a?.toLowerCase()];
    if (!id) return print(`open: unknown program: ${a || ""}`, "err");
    openWindow(id); print(`launching ${a}...`, "ok");
  },
  close(a){
    const id = WINDOWS[a?.toLowerCase()];
    const w = id && document.getElementById(id);
    if (!w?.classList.contains("open")) return print(`close: not running: ${a || ""}`, "err");
    w.querySelector(".close").click(); print(`closed ${a}.`, "ok");
  },
  ps(){
    print("  PID  CPU%   MEM   PROCESS", "accent");
    listProcs().sort((x, y) => x.pid - y.pid).forEach(p =>
      print(`  ${String(p.pid).padStart(3)}  ${p.cpu.toFixed(1).padStart(4)}  ${String(Math.round(p.mem)).padStart(4)}K  ${p.name}${p.vital ? "  *" : ""}`));
    print("  * = vital daemon. handle with care.", "dim");
  },
  kill(a){
    const pid = parseInt(a, 10);
    if (Number.isNaN(pid)) return print("kill: usage: kill <pid>", "err");
    print(kill(pid), "ok");
  },
  top(){ openWindow("win-sysmon"); print("opening sysmon...", "ok"); },
  uptime(){ print(`up ${uptimeStr()} — since you jacked in.`); },
  theme(a){
    if (!a){
      print("themes: " + Object.keys(THEMES).join(", "), "accent");
      print("usage: theme <name>", "dim");
      return;
    }
    if (setTheme(a.toLowerCase())) print(`theme set: ${a}`, "ok");
    else print(`theme: unknown: ${a}`, "err");
  },
  neofetch(){
    const proc = listProcs().length;
    printHTML(`<span class="term-fetch">
<span class="accent">        /\\        </span>  <b>operator</b>@<b>navi-os</b>
<span class="accent">       /  \\       </span>  ----------------
<span class="accent">      / /\\ \\      </span>  OS      : NAVI-OS v0.1 (atlas kernel)
<span class="accent">     / /  \\ \\     </span>  HOST    : the wired, node BELFAST
<span class="accent">    / /    \\ \\    </span>  UPTIME  : ${uptimeStr()}
<span class="accent">   / /______\\ \\   </span>  SHELL   : term.exe
<span class="accent">  /____________\\  </span>  PROCS   : ${proc} running
<span class="accent">                  </span>  MEMORY  : 640K wired
<span class="accent">   present day     </span>  DISPLAY : CRT / phosphor green
<span class="accent">   present time     </span>  <span class="ok"> hehehe.</span>
</span>`);
  },
  echo(a, raw){ print(raw); },
  whoami(){ print("sean gilleece — operator, present day, present time."); },
  date(){ print(new Date().toString()); },
  fortune(){
    const f = [
      "close the world, open the nExt.",
      "if you're not remembered, you never existed.",
      "the wired is not another world — it is this one, wearing a mask.",
      "no matter where you go, everyone is connected.",
      "you don't need a body to travel the wired.",
      "reality is only as deep as your connection.",
      "let's all love lain.",
    ];
    print(f[(Math.random() * f.length) | 0], "accent");
  },
  matrix(){
    print("engaging digital rain — move to wake.", "ok");
    dispatchEvent(new CustomEvent("navi-matrix"));
  },
  clear(){ out.innerHTML = ""; },
  reboot(){ print("rebooting the wired...", "err"); reboot(700); },
  panic(){ print("forcing exception...", "err"); setTimeout(() => kernelPanic("operator invoked panic() from term.exe"), 500); },
  exit(){ $("#win-term").querySelector(".close").click(); },
};
const ALIASES = { cls: "clear", quit: "exit", "?": "help", ll: "ls", man: "help" };

function run(raw){
  const line = raw.trim();
  print("> " + raw, "cmd");
  if (!line) return;
  history.push(line); hi = history.length;
  const sp = line.indexOf(" ");
  let cmd = (sp < 0 ? line : line.slice(0, sp)).toLowerCase();
  const rest = sp < 0 ? "" : line.slice(sp + 1);
  const arg = rest.split(" ")[0];
  cmd = ALIASES[cmd] || cmd;
  const fn = COMMANDS[cmd];
  if (fn) fn(arg, rest);
  else print(`${cmd}: command not found — try 'help'`, "err");
}

export function initTerminal(){
  out = $("#term-out"); input = $("#term-input");
  if (!out || !input) return;

  print("NAVI-OS shell — term.exe", "accent");
  print("type 'help' for commands. ` toggles this window.", "dim");

  input.addEventListener("keydown", e => {
    if (e.key === "Enter"){ run(input.value); input.value = ""; }
    else if (e.key === "ArrowUp"){ if (hi > 0){ hi--; input.value = history[hi]; } e.preventDefault(); }
    else if (e.key === "ArrowDown"){ if (hi < history.length - 1){ hi++; input.value = history[hi]; } else { hi = history.length; input.value = ""; } e.preventDefault(); }
    else if (e.key === "Tab"){
      e.preventDefault();
      const partial = input.value.toLowerCase();
      const m = Object.keys(COMMANDS).filter(c => c.startsWith(partial));
      if (m.length === 1) input.value = m[0];
      else if (m.length > 1) print(m.join("  "), "dim");
    }
  });

  $("#win-term")?.addEventListener("pointerdown", () => setTimeout(() => input.focus(), 0));

  // backtick toggles the terminal from anywhere
  addEventListener("keydown", e => {
    if (e.key !== "`" || document.getElementById("boot")) return;
    const tag = document.activeElement?.tagName;
    if (tag === "TEXTAREA" || (tag === "INPUT" && document.activeElement !== input)) return;
    e.preventDefault();
    const w = $("#win-term");
    if (w.classList.contains("open") && document.activeElement === input) w.querySelector(".close").click();
    else { openWindow("win-term"); input.focus(); }
  });
}
