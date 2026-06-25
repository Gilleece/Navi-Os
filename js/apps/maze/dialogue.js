/* ============================================================
   MAZE.EXE — dialogue + interaction
   The RPG front-end: an old-school portrait dialogue box, and the
   proximity check that lets the player speak to a character through
   their window. Choices can be gated on player attributes (Fallout
   style), shift the character's affinity, and make them hand over
   an item. All UI is built here and lives inside #maze-layer.
   ============================================================ */
import { player, STATS, meetsReq, addItem, removeItem } from "./state.js";

const STAT_ABBR = { strength:"STR", perception:"PER", endurance:"END",
                    charisma:"CHA", intelligence:"INT", agility:"AGI", luck:"LCK" };

const ui = {};          // cached DOM refs
let M = null;           // shared engine state
let current = null;     // character currently being spoken to
let hub = null;         // current character's topic hub
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
  hub = character.dialogueFor(M.depth, player);
  M.dialogueOpen = true;
  M.keys = {};                              // drop any held movement keys
  M.talk = false;

  character.portrait(ui.portrait.getContext("2d"), ui.portrait.width, ui.portrait.height);
  ui.name.textContent = character.name;
  ui.foot.textContent = STATS.map(([k]) => `${STAT_ABBR[k]} ${player.stats[k]}`).join("  ·  ");

  renderHub();
  ui.prompt.classList.remove("on");
  ui.box.classList.add("on");
}

function close(){
  M.dialogueOpen = false;
  current = null;
  hub = null;
  ui.box.classList.remove("on");
}

/* close from outside (e.g. when the player exits the maze) */
export function closeDialogue(state){ if (state) M = state; if (ui.box) close(); }

/* a numbered choice button; disabled (and unclickable) when its
   requirement isn't met, with a green/red attribute tag */
function choiceButton(index, { label, req, disabled, onClick }){
  const btn = document.createElement("button");
  if (req){
    const tag = document.createElement("span");
    tag.className = "req";
    tag.textContent = `[${STAT_ABBR[req.attr]} ${req.level}] `;
    btn.appendChild(tag);
  }
  btn.appendChild(document.createTextNode(`${index}. ${label}`));
  if (disabled) btn.disabled = true;
  else btn.addEventListener("click", onClick);
  return btn;
}

/* ---------- the topic hub ---------- */
function renderHub(){
  refreshAffinity();
  ui.choices.innerHTML = "";

  // a hostile character won't hold a normal conversation — but offering an
  // item they covet (won from another character) will thaw them out
  if (current.wontTalk){
    const wanted = current.wants.map(id => player.inventory.find(it => it.id === id)).find(Boolean);
    if (wanted){ renderGift(wanted); return; }
    ui.text.textContent = hub.hostile;
    ui.choices.appendChild(choiceButton(1, { label: "(Leave)", onClick: close }));
    return;
  }

  // topics still worth offering: not exhausted this level, and currently available
  const topics = hub.topics.filter(t => !current.hasSeen(hub.level, t.id) && (!t.available || t.available()));
  const engageable = topics.filter(t => meetsReq(t.req));

  // nothing left the player can actually do -> in-character brush-off
  if (!engageable.length){
    ui.text.textContent = hub.exhausted;
    ui.choices.appendChild(choiceButton(1, { label: "(Leave)", onClick: close }));
    return;
  }

  ui.text.textContent = hub.greet;
  let i = 1;
  for (const t of topics)
    ui.choices.appendChild(choiceButton(i++, {
      label: t.label, req: t.req, disabled: !meetsReq(t.req),
      onClick: () => selectTopic(t),
    }));
  ui.choices.appendChild(choiceButton(i, { label: "(Leave)", onClick: close }));
}

/* offer a coveted item to a hostile character to win them over */
function renderGift(item){
  ui.text.textContent = `*${current.name} eyes the ${item.name} in your hands, suddenly interested.*`;
  ui.choices.innerHTML = "";
  ui.choices.appendChild(choiceButton(1, { label: `Offer the ${item.name}.`, onClick: () => {
    const given = removeItem(item.id);
    if (given){ current.inventory.push(given); current.like(20); toast(`GAVE — ${given.name.toUpperCase()}`); }
    renderHub();                                 // mood may now be warm enough to talk
  }}));
  ui.choices.appendChild(choiceButton(2, { label: "(Leave)", onClick: close }));
}

function selectTopic(t){
  if (!meetsReq(t.req)) return;                 // belt-and-braces
  if (t.oneShot !== false) current.markSeen(hub.level, t.id);   // carried out -> not offered again this level
  if (t.effects && typeof t.effects.like === "number") current.like(t.effects.like);
  renderNode(typeof t.node === "function" ? t.node() : t.node);
}

/* ---------- a line within a topic; ends back at the hub ---------- */
function renderNode(node){
  refreshAffinity();
  ui.text.textContent = node.text;
  ui.choices.innerHTML = "";

  const choices = (node.choices && node.choices.length)
    ? node.choices
    : [{ text: "(Continue)" }];     // no choices -> a single button back to the hub

  choices.forEach((choice, idx) =>
    ui.choices.appendChild(choiceButton(idx + 1, {
      label: choice.text, req: choice.req, disabled: choice.req && !meetsReq(choice.req),
      onClick: () => chooseChoice(choice),
    })));
}

function chooseChoice(choice){
  if (choice.req && !meetsReq(choice.req)) return;   // belt-and-braces

  const fx = choice.effects;
  if (fx){
    if (typeof fx.like === "number") current.like(fx.like);
    if (fx.give){                                    // giving is self-limiting (item is removed)
      const item = current.takeItem(fx.give);
      if (item){ addItem(item); toast(`RECEIVED — ${item.name.toUpperCase()}`); }
    }
  }

  if (choice.next) renderNode(choice.next);
  else renderHub();                                  // end of the topic -> back to the hub
}

function refreshAffinity(){
  ui.aff.textContent = `${current.standing.toUpperCase()} · ${current.affinity}`;
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
