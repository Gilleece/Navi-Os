/* ============================================================
   NAVI-OS — CALENDAR
   ============================================================ */
import { $ } from "../utils.js";

const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const DOWS = ["MO","TU","WE","TH","FR","SA","SU"];
let calY, calM, calSel = null;
{ const n = new Date(); calY = n.getFullYear(); calM = n.getMonth(); }

export function renderCal(){
  const grid = $("#cal-grid"); grid.innerHTML = "";
  $("#cal-title").textContent = `${MONTHS[calM]} ${calY}`;
  DOWS.forEach(d => { const e = document.createElement("div"); e.className = "dow"; e.textContent = d; grid.appendChild(e); });
  const first = (new Date(calY, calM, 1).getDay() + 6) % 7;       // monday-first
  const days  = new Date(calY, calM + 1, 0).getDate();
  const today = new Date();
  for (let i = 0; i < first; i++){ const b = document.createElement("button"); b.className = "day blank"; grid.appendChild(b); }
  for (let d = 1; d <= days; d++){
    const b = document.createElement("button");
    b.className = "day"; b.textContent = d;
    if (d === today.getDate() && calM === today.getMonth() && calY === today.getFullYear()) b.classList.add("today");
    if (calSel && calSel.d === d && calSel.m === calM && calSel.y === calY) b.classList.add("sel");
    b.addEventListener("click", () => {
      calSel = {d, m: calM, y: calY};
      $("#cal-readout").textContent =
        `> selected: ${new Date(calY, calM, d).toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long",year:"numeric"})}`;
      renderCal();
    });
    grid.appendChild(b);
  }
}

export function initCalendar(){
  $("#cal-prev").addEventListener("click", () => { calM--; if (calM < 0){ calM = 11; calY--; } renderCal(); });
  $("#cal-next").addEventListener("click", () => { calM++; if (calM > 11){ calM = 0; calY++; } renderCal(); });
}
