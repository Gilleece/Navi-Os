/* ============================================================
   NAVI-OS — window manager (open / close / focus / drag / taskbar)
   ============================================================ */
import { $, $$, isMobile } from "./utils.js";
import { renderCal } from "./apps/calendar.js";

let zTop = 10;
const tasks = $("#tb-tasks");

export function focusWindow(w){
  zTop += 1; w.style.zIndex = zTop;
  $$(".tb-task").forEach(b => b.classList.toggle("active", b.dataset.win === w.id && w.classList.contains("open")));
}

export function openWindow(id){
  const w = document.getElementById(id);
  if (!w) return;
  w.classList.add("open");
  if (!tasks.querySelector(`[data-win="${id}"]`)){
    const b = document.createElement("button");
    b.className = "tb-task"; b.dataset.win = id;
    b.textContent = w.dataset.title;
    b.addEventListener("click", () => {
      const win = document.getElementById(id);
      if (win.classList.contains("open") && win.style.zIndex == zTop) win.classList.remove("open");
      else { win.classList.add("open"); focusWindow(win); }
      b.classList.toggle("active", win.classList.contains("open"));
    });
    tasks.appendChild(b);
  }
  focusWindow(w);
  if (id === "win-calendar") renderCal();
}

export function closeWindow(w){
  w.classList.remove("open");
  const b = tasks.querySelector(`[data-win="${w.id}"]`);
  if (b) b.remove();
}

export function initWindows(){
  $$("[data-open]").forEach(btn => btn.addEventListener("click", () => openWindow(btn.dataset.open)));
  $$(".window").forEach(w => {
    w.addEventListener("pointerdown", () => focusWindow(w));
    w.querySelector(".close").addEventListener("click", () => closeWindow(w));
    w.querySelector(".min").addEventListener("click", () => {
      w.classList.remove("open");
      const b = tasks.querySelector(`[data-win="${w.id}"]`);
      if (b) b.classList.remove("active");
    });
    /* drag (desktop only) */
    const bar = w.querySelector(".titlebar");
    bar.addEventListener("pointerdown", e => {
      if (isMobile() || e.target.closest(".tb-btn")) return;
      const r = w.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top;
      bar.setPointerCapture(e.pointerId);
      const move = ev => {
        w.style.left = Math.max(0, Math.min(innerWidth - 80, ev.clientX - ox)) + "px";
        w.style.top  = Math.max(0, Math.min(innerHeight - 80, ev.clientY - oy)) + "px";
        w.style.right = "auto"; w.style.bottom = "auto";
      };
      const up = () => { bar.removeEventListener("pointermove", move); bar.removeEventListener("pointerup", up); };
      bar.addEventListener("pointermove", move);
      bar.addEventListener("pointerup", up);
    });
  });
  $("#tb-root").addEventListener("click", () => $$(".window.open").forEach(w => {
    w.classList.remove("open");
    const b = tasks.querySelector(`[data-win="${w.id}"]`); if (b) b.classList.remove("active");
  }));
}
