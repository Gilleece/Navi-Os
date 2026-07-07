/* ============================================================
   NAVI-OS shell — entry point
   Boots the desktop and wires up every program.
   ============================================================ */
import { initWindows } from "./windows.js";
import { initClock } from "./clock.js";
import { initCalendar } from "./apps/calendar.js";
import { initNotepad } from "./apps/notepad.js";
import { initCalculator } from "./apps/calculator.js";
import { initMaze } from "./apps/maze/maze.js";
import { initTerminal } from "./apps/terminal.js";
import { initSysmon } from "./apps/sysmon.js";
import { initFlappy } from "./apps/flappy.js";
import { initWorm } from "./apps/worm.js";
import { initTracker } from "./apps/tracker.js";
import { initLife } from "./apps/life.js";
import { initNotify } from "./notify.js";
import { initScreensaver } from "./screensaver.js";
import { initBoot } from "./boot.js";

initWindows();
initClock();
initCalendar();
initNotepad();
initCalculator();
initMaze();
initTerminal();
initSysmon();
initFlappy();
initWorm();
initTracker();
initLife();
initNotify();
initScreensaver();
initBoot();
