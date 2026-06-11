/* ============================================================
   NAVI-OS — boot sequence
   ============================================================ */
import { $ } from "./utils.js";
import { openWindow } from "./windows.js";

const BOOT_LINES = [
  "NAVI-OS v0.1 — atlas kernel",
  "bios: protocol layer 1 ............ <span class='ok'>OK</span>",
  "mem check: 640K wired ............. <span class='ok'>OK</span>",
  "mounting /self .................... <span class='ok'>OK</span>",
  "handshake with the wired .......... <span class='ok'>OK</span>",
  "loading desktop shell_",
];

export function initBoot(){
  const bootEl = $("#boot"), bootTxt = $("#boot-text");
  let bootDone = false, li = 0;

  function typeLine(){
    if (li >= BOOT_LINES.length){ return; }
    const d = document.createElement("div");
    d.innerHTML = BOOT_LINES[li++];
    bootTxt.appendChild(d);
    setTimeout(typeLine, 260 + Math.random()*240);
  }
  typeLine();

  function enterDesktop(){
    if (bootDone) return; bootDone = true;
    bootEl.remove();
    $("#desktop").hidden = false;
    $("#taskbar").hidden = false;
    openWindow("win-about");
  }
  bootEl.addEventListener("click", enterDesktop);
  addEventListener("keydown", e => { if (!bootDone) enterDesktop(); }, {once:false});
  setTimeout(enterDesktop, 7000); // auto-boot fallback
}
