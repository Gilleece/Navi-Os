/* ============================================================
   NAVI-OS — start menu (the ROOT button)
   Program launcher + theme switcher + system actions. Built
   from the APPS registry, so new programs show up on their own.
   ============================================================ */
import { $ } from "./utils.js";
import { APPS, openWindow, hideAllWindows } from "./windows.js";
import { setTheme, THEMES } from "./theme.js";
import { reboot } from "./system.js";

export function initStartMenu(){
  const root = $("#tb-root"), menu = $("#start-menu");
  if (!root || !menu) return;

  function section(title){
    const h = document.createElement("div");
    h.className = "sm-title"; h.textContent = title;
    menu.appendChild(h);
  }
  function item(label, fn, cls = ""){
    const b = document.createElement("button");
    b.className = "sm-item" + (cls ? " " + cls : "");
    b.textContent = label;
    b.addEventListener("click", () => { fn(); hide(); });
    menu.appendChild(b);
  }

  section("PROGRAMS");
  for (const app of Object.values(APPS))
    if (app.group === "system") item(app.label, () => openWindow(app.id));

  section("GAMES");
  for (const app of Object.values(APPS))
    if (app.group === "games") item(app.label, () => openWindow(app.id));
  item("MAZE.EXE", () => openWindow(APPS.maze.id), "maze");

  section("THEME");
  const sw = document.createElement("div"); sw.className = "sm-themes";
  for (const [name, t] of Object.entries(THEMES)){
    const b = document.createElement("button");
    b.className = "sm-swatch"; b.title = name;
    b.setAttribute("aria-label", "Theme: " + name);
    b.style.background = t["--green"];
    b.addEventListener("click", () => setTheme(name));   // stays open to try themes
    sw.appendChild(b);
  }
  menu.appendChild(sw);

  section("SYSTEM");
  item("SHOW DESKTOP", hideAllWindows);
  item("REBOOT", () => reboot(300), "danger");

  function show(){ menu.hidden = false; root.setAttribute("aria-expanded", "true"); }
  function hide(){ menu.hidden = true; root.setAttribute("aria-expanded", "false"); }
  root.addEventListener("click", () => menu.hidden ? show() : hide());
  addEventListener("pointerdown", e => {
    if (!menu.hidden && !e.target.closest("#start-menu") && !e.target.closest("#tb-root")) hide();
  });
  addEventListener("keydown", e => { if (e.key === "Escape" && !menu.hidden) hide(); });
}
