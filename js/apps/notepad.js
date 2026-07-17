/* ============================================================
   NAVI-OS — NOTEPAD
   File-backed pad: reads /home/operator/notes.txt on open and
   debounce-autosaves back to it, so the shell and FILES.SYS see
   the same text. Reloads on re-open in case they edited it.
   ============================================================ */
import { $ } from "../utils.js";
import { fsRead, fsWrite } from "../fs.js";

const NOTES = "/home/operator/notes.txt";

export function initNotepad(){
  const note = $("#note-area");
  if (!note) return;
  const count = $("#note-count");
  let timer = null;

  const updateCount = () => { count.textContent = `${note.value.length} chars`; };
  const load = () => { const c = fsRead(NOTES); note.value = c === null ? "" : c; updateCount(); };

  note.addEventListener("input", () => {
    updateCount();
    clearTimeout(timer);
    timer = setTimeout(() => fsWrite(NOTES, note.value), 400);   // debounced autosave
  });
  $("#note-clear").addEventListener("click", () => { note.value = ""; updateCount(); fsWrite(NOTES, ""); });

  load();

  /* reload when the window re-opens — FILES.SYS or the shell
     may have rewritten notes.txt while notepad was closed */
  const win = $("#win-notepad");
  if (win){
    let wasOpen = win.classList.contains("open");
    new MutationObserver(() => {
      const open = win.classList.contains("open");
      if (open && !wasOpen) load();
      wasOpen = open;
    }).observe(win, { attributes:true, attributeFilter:["class"] });
  }
}
