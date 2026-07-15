/* ============================================================
   MAZE.EXE — character creation ("operator registration")
   A DOM overlay shown on NEW GAME, before the first level builds:
   pick a handle and spend a fixed pool of points across the seven
   SPECIAL-style attributes. Deliberately simple — every stat starts
   at STAT_BASE and the pool must be fully spent to jack in, so every
   operator is the same total strength, just shaped differently.
   (All seven attributes gate dialogue somewhere — see STORY.md §7.)

   Desktop/touch only by design: creation happens before the player
   can enter VR, so no in-world panel is needed.
   ============================================================ */
import { $ } from "../../utils.js";
import { player, STATS, STAT_BASE, STAT_MAX } from "./state.js";

export const POOL = 12;      // points to spend
export { STAT_MAX };         // per-attribute ceiling (owned by state.js; re-exported for callers)

let el = null, vals = null, onDone = null, onCancel = null;

export function showCreation(done, cancel){
  onDone = done; onCancel = cancel;
  build();
  vals = Object.fromEntries(STATS.map(([k]) => [k, STAT_BASE]));
  el.querySelector(".cr-name").value = "";
  render();
  el.classList.add("on");
  el.querySelector(".cr-name").focus();
}

export function hideCreation(){ if (el) el.classList.remove("on"); }

const spent = () => STATS.reduce((n, [k]) => n + vals[k] - STAT_BASE, 0);
const left  = () => POOL - spent();

function render(){
  el.querySelector(".cr-left").textContent = left();
  for (const row of el.querySelectorAll(".cr-row")){
    const k = row.dataset.stat;
    row.querySelector(".cr-val").textContent = vals[k];
    row.querySelector("[data-d='-1']").disabled = vals[k] <= STAT_BASE;
    row.querySelector("[data-d='1']").disabled  = vals[k] >= STAT_MAX || left() <= 0;
  }
  el.querySelector(".cr-begin").disabled = left() !== 0;
}

function randomise(){
  for (const [k] of STATS) vals[k] = STAT_BASE;
  let n = POOL;
  while (n > 0){
    const [k] = STATS[Math.random() * STATS.length | 0];
    if (vals[k] < STAT_MAX){ vals[k]++; n--; }
  }
  render();
}

function begin(){
  if (left() !== 0) return;
  player.name = (el.querySelector(".cr-name").value.trim().toUpperCase() || "OPERATOR").slice(0, 14);
  for (const [k] of STATS) player.stats[k] = vals[k];
  hideCreation();
  if (onDone) onDone();
}

function build(){
  if (el) return;
  el = document.createElement("div");
  el.id = "maze-create";
  el.innerHTML = `
    <div class="cr-panel">
      <h2>OPERATOR REGISTRATION</h2>
      <label class="cr-handle">HANDLE
        <input class="cr-name" maxlength="14" placeholder="OPERATOR" spellcheck="false" autocomplete="off">
      </label>
      <div class="cr-pool">POINTS REMAINING <b class="cr-left">${POOL}</b></div>
      ${STATS.map(([k, abbr]) => `
        <div class="cr-row" data-stat="${k}">
          <span class="cr-label">${k.toUpperCase()} <i>${abbr}</i></span>
          <span class="cr-ctl">
            <button data-d="-1" aria-label="Decrease ${k}">−</button>
            <span class="cr-val">${STAT_BASE}</span>
            <button data-d="1" aria-label="Increase ${k}">+</button>
          </span>
        </div>`).join("")}
      <div class="cr-actions">
        <button class="cr-abort">[ ABORT ]</button>
        <button class="cr-rand">[ RANDOMISE ]</button>
        <button class="cr-begin" disabled>[ JACK IN ]</button>
      </div>
    </div>`;
  $("#maze-layer").appendChild(el);

  el.addEventListener("click", e => {
    const btn = e.target.closest("button");
    if (!btn) return;
    if (btn.dataset.d){
      const k = btn.closest(".cr-row").dataset.stat;
      const d = Number(btn.dataset.d);
      if (d > 0 && vals[k] < STAT_MAX && left() > 0) vals[k]++;
      if (d < 0 && vals[k] > STAT_BASE) vals[k]--;
      render();
    }
    else if (btn.classList.contains("cr-rand"))  randomise();
    else if (btn.classList.contains("cr-begin")) begin();
    else if (btn.classList.contains("cr-abort")){ hideCreation(); if (onCancel) onCancel(); }
  });
  el.querySelector(".cr-name").addEventListener("keydown", e => {
    if (e.key === "Enter" && left() === 0) begin();
    e.stopPropagation();                    // don't leak WASD/F/Esc to the maze input
  });
}
