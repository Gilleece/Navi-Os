/* ============================================================
   MAZE.EXE — dialogue + interaction
   The RPG front-end: an old-school portrait dialogue box, and the
   proximity check that lets the player speak to a character through
   their window. Choices can be gated on player attributes (Fallout
   style), shift the character's affinity, and make them hand over
   an item. All UI is built here and lives inside #maze-layer.
   ============================================================ */
import { player, STATS, meetsReq, addItem } from "./state.js";

const STAT_ABBR = { strength:"STR", perception:"PER", endurance:"END",
                    charisma:"CHA", intelligence:"INT", agility:"AGI", luck:"LCK" };

const ui = {};          // cached DOM refs
let M = null;           // shared engine state
let current = null;     // character currently being spoken to
const TALK_RADIUS = 2.4;

/* ---------- build the DOM (once) ---------- */
export function initDialogue(state){
  M = state;
  const layer = document.querySelector("#maze-layer");

  const prompt = document.createElement("button");
  prompt.id = "maze-prompt";
  prompt.addEventListener("click", () => { M.talk = true; });
  layer.appendChild(prompt);

  const box = document.createElement("div");
  box.id = "maze-dialogue";
  box.innerHTML = `
    <canvas class="dlg-portrait" width="256" height="320"></canvas>
    <div class="dlg-body">
      <div class="dlg-name"><span class="nm"></span><span class="dlg-aff"></span></div>
      <div class="dlg-text"></div>
      <div class="dlg-choices"></div>
      <div class="dlg-foot"></div>
    </div>`;
  layer.appendChild(box);

  ui.prompt   = prompt;
  ui.box      = box;
  ui.portrait = box.querySelector(".dlg-portrait");
  ui.name     = box.querySelector(".nm");
  ui.aff      = box.querySelector(".dlg-aff");
  ui.text     = box.querySelector(".dlg-text");
  ui.choices  = box.querySelector(".dlg-choices");
  ui.foot     = box.querySelector(".dlg-foot");

  // keyboard control while the box is open
  addEventListener("keydown", e => {
    if (!M.dialogueOpen) return;
    if (e.key === "Escape"){ e.preventDefault(); close(); return; }
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 9){
      const btn = ui.choices.children[n-1];
      if (btn && !btn.disabled){ e.preventDefault(); btn.click(); }
    }
  });
}

/* ---------- open / close ---------- */
export function openDialogue(state, character){
  M = state;
  current = character;
  M.dialogueOpen = true;
  M.keys = {};                              // drop any held movement keys
  M.talk = false;

  character.portrait(ui.portrait.getContext("2d"), ui.portrait.width, ui.portrait.height);
  ui.name.textContent = character.name;
  ui.foot.textContent = STATS.map(([k]) => `${STAT_ABBR[k]} ${player.stats[k]}`).join("  ·  ");

  renderNode(character.dialogueFor(M.depth, player));
  ui.prompt.classList.remove("on");
  ui.box.classList.add("on");
}

function close(){
  M.dialogueOpen = false;
  current = null;
  ui.box.classList.remove("on");
}

/* close from outside (e.g. when the player exits the maze) */
export function closeDialogue(state){ if (state) M = state; if (ui.box) close(); }

/* ---------- render a single dialogue node ---------- */
function renderNode(node){
  refreshAffinity();
  ui.text.textContent = node.text;
  ui.choices.innerHTML = "";

  const choices = (node.choices && node.choices.length)
    ? node.choices
    : [{ text: "(End)", _close: true }];

  choices.forEach((choice, i) => {
    const btn = document.createElement("button");
    const ok  = meetsReq(choice.req);
    if (choice.req){
      const tag = document.createElement("span");
      tag.className = "req";
      tag.textContent = `[${STAT_ABBR[choice.req.attr]} ${choice.req.level}] `;
      btn.appendChild(tag);
    }
    btn.appendChild(document.createTextNode(`${i+1}. ${choice.text}`));
    if (choice.req && !ok) btn.disabled = true;
    btn.addEventListener("click", () => chooseChoice(choice));
    ui.choices.appendChild(btn);
  });
}

function chooseChoice(choice){
  if (choice._close){ close(); return; }
  if (choice.req && !meetsReq(choice.req)) return;   // belt-and-braces

  // _used guards against double-apply within one conversation; `once`
  // guards against re-farming by re-opening the conversation later.
  if (choice.effects && !choice._used){
    choice._used = true;
    const fx = choice.effects;
    if (typeof fx.like === "number" && (!fx.once || !current.met.has(fx.once))){
      current.like(fx.like);
      if (fx.once) current.met.add(fx.once);
    }
    if (fx.give){                                    // giving is self-limiting (item is removed)
      const item = current.takeItem(fx.give);
      if (item){ addItem(item); toast(`RECEIVED — ${item.name.toUpperCase()}`); }
    }
  }

  if (choice.next) renderNode(choice.next);
  else close();
}

function refreshAffinity(){
  const a = current.affinity;
  const bars = Math.round(a / 10);
  ui.aff.textContent = `LIKES YOU ${"|".repeat(bars)}${".".repeat(10-bars)} ${a}`;
}

/* reuse the maze's centre banner for pickups */
function toast(msg){
  const el = document.querySelector("#hud-msg");
  if (!el) return;
  el.textContent = msg; el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 1600);
}

/* ---------- proximity prompt (called from the main loop) ---------- */
export function updateInteractions(state){
  M = state;
  if (M.dialogueOpen){ ui.prompt.classList.remove("on"); return; }

  const p = M.dolly.position;
  let near = null, best = TALK_RADIUS;
  for (const npc of (M.npcs || [])){
    const d = Math.hypot(p.x - npc.x, p.z - npc.z);
    if (d < best){ best = d; near = npc; }
  }
  M.nearCharacter = near;

  if (near){
    ui.prompt.textContent = `PRESS [F] — SPEAK WITH ${near.character.name}`;
    ui.prompt.classList.add("on");
  } else {
    ui.prompt.classList.remove("on");
  }

  if (M.talk){
    M.talk = false;
    if (near) openDialogue(M, near.character);
  }
}
