/* ============================================================
   NAVI-OS shell — entry point
   Boots the desktop and wires up every program.
   ============================================================ */
import { initTheme } from "./theme.js";
import { initWindows } from "./windows.js";
import { initStartMenu } from "./startmenu.js";
import { initSound } from "./sound.js";
import { initClock } from "./clock.js";
import { initCalendar } from "./apps/calendar.js";
import { initNotepad } from "./apps/notepad.js";
import { initFiles } from "./apps/files.js";
import { initCalculator } from "./apps/calculator.js";
import { initTerminal } from "./apps/terminal.js";
import { initSysmon } from "./apps/sysmon.js";
import { initSettings } from "./apps/settings.js";
import { initTracker } from "./apps/tracker.js";
import { initLife } from "./apps/life.js";
import { initDraw } from "./apps/draw.js";
import { initBBS } from "./apps/bbs.js";
import { initNotify } from "./notify.js";
import { initAchievements } from "./achievements.js";
import { initPalette } from "./palette.js";
import { initScreensaver } from "./screensaver.js";
import { initBoot } from "./boot.js";

initTheme();
initWindows();
initStartMenu();
initSound();
initClock();
initCalendar();
initNotepad();
initFiles();
initCalculator();
/* the maze + the six arcade games (flappy/worm/defrag/scan/vector/oracle)
   init lazily the first time their window opens — see LAZY in js/windows.js */
initTerminal();
initSysmon();
initSettings();
initTracker();
initLife();
initDraw();
initBBS();
initNotify();
initAchievements();
initPalette();
initScreensaver();
initBoot();
