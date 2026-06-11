/* ============================================================
   NAVI-OS shell — entry point
   Boots the desktop and wires up every program.
   ============================================================ */
import { initWindows } from "./windows.js";
import { initClock } from "./clock.js";
import { initCalendar } from "./apps/calendar.js";
import { initNotepad } from "./apps/notepad.js";
import { initCalculator } from "./apps/calculator.js";
import { initMaze } from "./apps/maze.js";
import { initBoot } from "./boot.js";

initWindows();
initClock();
initCalendar();
initNotepad();
initCalculator();
initMaze();
initBoot();
