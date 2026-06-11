/* ============================================================
   NAVI-OS — taskbar clock
   ============================================================ */
import { $ } from "./utils.js";

const p2 = n => String(n).padStart(2, "0");

function tickClock(){
  const n = new Date();
  $("#clock-t").textContent = `${p2(n.getHours())}:${p2(n.getMinutes())}:${p2(n.getSeconds())}`;
  $("#clock-d").textContent = n.toLocaleDateString(undefined, {day:"2-digit", month:"short", year:"numeric"});
}

export function initClock(){
  tickClock();
  setInterval(tickClock, 1000);
}
