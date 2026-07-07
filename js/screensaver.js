/* ============================================================
   NAVI-OS — idle screensaver (digital rain)
   Kicks in after inactivity; any input wakes it. Draws the
   classic falling-glyph curtain in atlas green.
   ============================================================ */
import { $ } from "./utils.js";

const IDLE_MS = 60000;
const GLYPHS = "アイウエオカキクケコサシスセソタチツテトナニヌ01<>/\\{}[]#*+=".split("");

export function initScreensaver(){
  const cv = $("#saver");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  let raf = 0, cols = [], active = false, idleTimer = 0;

  function resize(){
    cv.width = innerWidth; cv.height = innerHeight;
    const n = Math.floor(cv.width / 14);
    cols = Array.from({ length: n }, () => Math.random() * -cv.height);
  }

  function frame(){
    ctx.fillStyle = "rgba(4,8,10,0.10)";
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.font = "16px 'Share Tech Mono', monospace";
    for (let i = 0; i < cols.length; i++){
      const x = i * 14, y = cols[i];
      ctx.fillStyle = "#c9ffe0";
      ctx.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], x, y);
      ctx.fillStyle = "rgba(70,255,142,0.55)";
      ctx.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], x, y - 16);
      cols[i] = y > cv.height + Math.random() * 400 ? 0 : y + 16;
    }
    raf = requestAnimationFrame(frame);
  }

  function start(){
    if (active || document.getElementById("boot")) return;
    if (document.getElementById("maze-layer")?.classList.contains("on")) return;
    active = true;
    resize(); ctx.fillStyle = "#04080a"; ctx.fillRect(0, 0, cv.width, cv.height);
    cv.classList.add("on");
    frame();
  }
  function stop(){
    if (!active) return;
    active = false; cancelAnimationFrame(raf); cv.classList.remove("on");
  }
  function poke(){
    if (active) stop();
    clearTimeout(idleTimer);
    idleTimer = setTimeout(start, IDLE_MS);
  }

  addEventListener("resize", () => { if (active) resize(); });
  ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"]
    .forEach(ev => addEventListener(ev, poke, { passive: true }));
  addEventListener("navi-matrix", () => { clearTimeout(idleTimer); start(); });
  poke();
}
