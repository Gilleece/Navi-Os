/* ============================================================
   NAVI-OS — taskbar clock
   ============================================================ */
import { $ } from "./utils.js";
import { store } from "./store.js";

const p2 = n => String(n).padStart(2, "0");

function tickClock(){
  const n = new Date();
  const is24 = store.get("clock24", true) !== false;
  let h = n.getHours(), suffix = "";
  if (!is24){
    suffix = h >= 12 ? " PM" : " AM";
    h = h % 12 || 12;
  }
  $("#clock-t").textContent = `${p2(h)}:${p2(n.getMinutes())}:${p2(n.getSeconds())}${suffix}`;
  $("#clock-d").textContent = n.toLocaleDateString(undefined, {day:"2-digit", month:"short", year:"numeric"});
}

export function initClock(){
  tickClock();
  setInterval(tickClock, 1000);
}
