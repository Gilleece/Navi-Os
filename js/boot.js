/* ============================================================
   NAVI-OS — boot sequence
   Deep links (#projects, #term, …) skip the boot theatre and
   jump straight to the linked window.
   ============================================================ */
import { $ } from "./utils.js";
import { openWindow, APPS } from "./windows.js";
import { notify } from "./notify.js";

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

  const deepLink = APPS[(location.hash || "").slice(1).toLowerCase()];

  function enterDesktop(){
    if (bootDone) return; bootDone = true;
    bootEl.remove();
    $("#desktop").hidden = false;
    $("#taskbar").hidden = false;
    openWindow(deepLink ? deepLink.id : "win-about");
    setTimeout(() => notify("NAVI-OS", "welcome back, operator. press ` for a shell."), 1400);
  }

  if (deepLink){ enterDesktop(); return; }   // shared link — jack in immediately

  function typeLine(){
    if (li >= BOOT_LINES.length){ return; }
    const d = document.createElement("div");
    d.innerHTML = BOOT_LINES[li++];
    bootTxt.appendChild(d);
    setTimeout(typeLine, 260 + Math.random()*240);
  }
  typeLine();

  bootEl.addEventListener("click", enterDesktop);
  addEventListener("keydown", e => { if (!bootDone) enterDesktop(); }, {once:false});
  setTimeout(enterDesktop, 7000); // auto-boot fallback
}

/* service worker — offline shell + installability, fails silent */
addEventListener("load", () => {
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
});
