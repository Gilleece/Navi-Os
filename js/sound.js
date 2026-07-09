/* ============================================================
   NAVI-OS — taskbar sound toggle
   One switch for the whole machine: flips the master bus in
   _fx.js, which every program's audio routes through.
   ============================================================ */
import { $ } from "./utils.js";
import { isMuted, setMuted } from "./apps/_fx.js";

export function initSound(){
  const b = $("#tb-mute");
  if (!b) return;
  const paint = () => {
    const m = isMuted();
    b.textContent = m ? "MUT" : "SND";
    b.classList.toggle("off", m);
    b.setAttribute("aria-pressed", String(m));
    b.title = m ? "Sound: off" : "Sound: on";
  };
  b.addEventListener("click", () => { setMuted(!isMuted()); paint(); });
  paint();
}
