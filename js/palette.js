/* ============================================================
   NAVI-OS — command palette (Ctrl+K / Cmd+K)
   A global fuzzy launcher over programs, themes and system
   actions. Built fresh on every open so APPS / THEMES / the
   taskbar (tb-merits may not exist yet at import time) stay
   current. Guards: silent no-op during boot or while the maze
   overlay owns input.
   ============================================================ */
import { APPS, openWindow } from "./windows.js";
import { THEMES, setTheme } from "./theme.js";
import { reboot } from "./system.js";
import { notify } from "./notify.js";

let root = null, input = null, list = null;
let open = false;
let entries = [];   // full index, rebuilt per open
let shown = [];      // currently rendered/filtered entries, in order
let selIndex = 0;

/* ---------- index -------------------------------------------- */
function buildIndex(){
  const out = [];

  for (const app of Object.values(APPS))
    out.push({ group: "programs", label: `open — ${app.label}`, kw: "", run: () => openWindow(app.id) });

  for (const name of Object.keys(THEMES))
    out.push({
      group: "themes", label: `theme — ${name}`, kw: "",
      run: () => { setTheme(name); notify("THEME", `palette shifted to ${name}.`); },
    });

  out.push({
    group: "actions", label: "sound — toggle mute", kw: "snd audio volume",
    run: () => document.getElementById("tb-mute")?.click(),
  });
  if (document.getElementById("tb-merits"))
    out.push({
      group: "actions", label: "merits — show achievements", kw: "badges trophies",
      run: () => document.getElementById("tb-merits")?.click(),
    });
  out.push({
    group: "actions", label: "matrix — let the rain fall", kw: "screensaver digital rain",
    run: () => dispatchEvent(new CustomEvent("navi-matrix")),
  });
  out.push({
    group: "actions", label: "system — reboot", kw: "restart reload",
    run: () => reboot(700),
  });
  out.push({
    group: "actions", label: "maze — jack into the labyrinth", kw: "maze.exe labyrinth screensaver",
    run: () => openWindow("win-maze"),
  });

  return out;
}

/* ---------- matching ------------------------------------------ */
/* greedy in-order subsequence match; returns matched indices or null */
function fuzzyPositions(hay, q){
  const positions = [];
  let from = 0;
  for (let i = 0; i < q.length; i++){
    const idx = hay.indexOf(q[i], from);
    if (idx === -1) return null;
    positions.push(idx);
    from = idx + 1;
  }
  return positions;
}

/* score a single entry against the query; null if no match */
function matchEntry(query, entry){
  const q = query.toLowerCase();
  const label = entry.label.toLowerCase();
  const hay = label + " " + entry.kw.toLowerCase();
  const exactIdx = hay.indexOf(q);
  if (exactIdx !== -1) return { exact: true, rank: exactIdx };
  const pos = fuzzyPositions(hay, q);
  if (pos) return { exact: false, rank: pos[pos.length - 1] - pos[0] };
  return null;
}

const ESC_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const escapeHtml = s => s.replace(/[&<>"]/g, c => ESC_MAP[c]);

/* highlighted label markup — a <b> per matched char, best-effort against
   the visible label (keyword-only matches render plain, unhighlighted) */
function labelHTML(label, query){
  if (!query) return escapeHtml(label);
  const lower = label.toLowerCase(), q = query.toLowerCase();
  let positions = null;
  const idx = lower.indexOf(q);
  if (idx !== -1) positions = Array.from({ length: q.length }, (_, i) => idx + i);
  else positions = fuzzyPositions(lower, q);
  if (!positions) return escapeHtml(label);
  const hit = new Set(positions);
  let html = "";
  for (let i = 0; i < label.length; i++){
    const ch = escapeHtml(label[i]);
    html += hit.has(i) ? `<b>${ch}</b>` : ch;
  }
  return html;
}

/* ---------- rendering ------------------------------------------ */
function filterEntries(query){
  if (!query) return entries.slice();          // grouped, insertion order: programs -> themes -> actions
  const scored = [];
  entries.forEach((entry, i) => {
    const m = matchEntry(query, entry);
    if (m) scored.push({ entry, i, ...m });
  });
  scored.sort((a, b) => {
    if (a.exact !== b.exact) return a.exact ? -1 : 1;
    if (a.entry.label.length !== b.entry.label.length) return a.entry.label.length - b.entry.label.length;
    return a.i - b.i;
  });
  return scored.map(s => s.entry);
}

function render(){
  const query = input.value.trim();
  shown = filterEntries(query);
  if (selIndex >= shown.length) selIndex = Math.max(0, shown.length - 1);

  list.innerHTML = "";
  if (!shown.length){
    const empty = document.createElement("div");
    empty.className = "palette-empty";
    empty.textContent = "no matches.";
    list.appendChild(empty);
    return;
  }

  let lastGroup = null;
  shown.forEach((entry, i) => {
    if (!query && entry.group !== lastGroup){
      lastGroup = entry.group;
      const h = document.createElement("div");
      h.className = "palette-group";
      h.textContent = lastGroup.toUpperCase();
      list.appendChild(h);
    }
    const row = document.createElement("div");
    row.className = "palette-item" + (i === selIndex ? " sel" : "");
    row.setAttribute("role", "option");
    row.setAttribute("aria-selected", String(i === selIndex));
    row.innerHTML = labelHTML(entry.label, query);
    row.addEventListener("pointerenter", () => { selIndex = i; paintSelection(); });
    row.addEventListener("click", () => runEntry(entry));
    list.appendChild(row);
  });
}

function paintSelection(){
  const rows = list.querySelectorAll(".palette-item");
  rows.forEach((r, i) => {
    const sel = i === selIndex;
    r.classList.toggle("sel", sel);
    r.setAttribute("aria-selected", String(sel));
  });
  rows[selIndex]?.scrollIntoView({ block: "nearest" });
}

function moveSel(delta){
  if (!shown.length) return;
  selIndex = (selIndex + delta + shown.length) % shown.length;
  paintSelection();
}

function runEntry(entry){
  closePalette();
  entry.run();
}

/* ---------- open / close ---------------------------------------- */
function buildUI(){
  root = document.createElement("div");
  root.id = "navi-palette";
  root.setAttribute("aria-hidden", "true");
  root.innerHTML = `
    <div class="palette-box" role="dialog" aria-label="Command palette">
      <input id="palette-input" class="palette-input" type="text" autocomplete="off"
             autocapitalize="off" autocorrect="off" spellcheck="false"
             placeholder="&gt; search programs, themes, actions…" aria-label="Search programs, themes, actions">
      <div id="palette-list" class="palette-list" role="listbox" aria-label="Results"></div>
    </div>`;
  document.body.appendChild(root);
  input = root.querySelector("#palette-input");
  list = root.querySelector("#palette-list");

  input.addEventListener("input", () => { selIndex = 0; render(); });
  input.addEventListener("keydown", e => {
    if (e.key === "ArrowDown"){ e.preventDefault(); moveSel(1); }
    else if (e.key === "ArrowUp"){ e.preventDefault(); moveSel(-1); }
    else if (e.key === "Enter"){ e.preventDefault(); if (shown[selIndex]) runEntry(shown[selIndex]); }
  });

  addEventListener("pointerdown", e => {
    if (open && !e.target.closest("#navi-palette")) closePalette();
  });
}

function openPalette(){
  if (!root) buildUI();
  entries = buildIndex();
  open = true;
  root.classList.add("show");
  root.setAttribute("aria-hidden", "false");
  input.value = "";
  selIndex = 0;
  render();
  input.focus();
}

function closePalette(){
  open = false;
  if (root){ root.classList.remove("show"); root.setAttribute("aria-hidden", "true"); }
}

function togglePalette(){
  if (open) closePalette(); else openPalette();
}

/* ---------- init -------------------------------------------------- */
export function initPalette(){
  /* capture phase: intercepts before the browser's own find/search
     shortcut, and (on Escape) before other modules' bubble-phase
     Escape handlers, so an open palette always wins the keystroke */
  addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === "k" || e.key === "K")){
      if (document.getElementById("boot")) return;                                   // boot owns input
      if (document.getElementById("maze-layer")?.classList.contains("on")) return;    // maze owns input
      e.preventDefault();
      togglePalette();
      return;
    }
    if (open && e.key === "Escape"){
      e.preventDefault();
      e.stopImmediatePropagation();
      closePalette();
    }
  }, true);
}
