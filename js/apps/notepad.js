/* ============================================================
   NAVI-OS — NOTEPAD
   ============================================================ */
import { $ } from "../utils.js";

export function initNotepad(){
  const note = $("#note-area");
  note.addEventListener("input", () => $("#note-count").textContent = `${note.value.length} chars`);
  $("#note-clear").addEventListener("click", () => { note.value = ""; note.dispatchEvent(new Event("input")); });
}
