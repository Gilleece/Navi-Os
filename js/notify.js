/* ============================================================
   NAVI-OS — notification toasts
   notify() is the shared API; initNotify() also arms a slow
   drip of ambient transmissions from the wired.
   ============================================================ */
import { $ } from "./utils.js";

let stack = null;

export function notify(title, body, ms = 7000){
  if (!stack) stack = $("#notify-stack");
  if (!stack) return;
  const t = document.createElement("div");
  t.className = "toast";
  const b = document.createElement("b"); b.textContent = title;
  const p = document.createElement("p"); p.textContent = body;
  t.append(b, p);
  t.addEventListener("click", () => dismiss(t));
  stack.appendChild(t);
  setTimeout(() => dismiss(t), ms);
}

function dismiss(t){
  if (!t.isConnected || t.classList.contains("bye")) return;
  t.classList.add("bye");
  setTimeout(() => t.remove(), 350);
}

const AMBIENT = [
  ["WIRED.MSG", "you have (1) new message. sender: unknown."],
  ["NET",       "packet loss on layer 07 — retrying forever."],
  ["MEMCHK",    "memory integrity 99.97%. one memory could not be verified."],
  ["NET",       "handshake from an unlisted node was refused."],
  ["SYS",       "clock drift corrected: −3s. you did not notice."],
  ["dream_log", "4KB written while you were looking away."],
  ["WIRED.MSG", "no matter where you go, everyone is connected."],
  ["SYS",       "TERM.EXE is listening. press ` to speak to the shell."],
];

export function initNotify(){
  stack = $("#notify-stack");
  let last = -1;
  const fire = () => {
    let i;
    do { i = Math.floor(Math.random() * AMBIENT.length); } while (i === last);
    last = i;
    if (!document.getElementById("boot")) notify(...AMBIENT[i]);
    setTimeout(fire, 240000 + Math.random() * 240000);
  };
  setTimeout(fire, 75000 + Math.random() * 90000);
}
