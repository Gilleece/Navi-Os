/* ============================================================
   MAZE.EXE - dialogue + interaction
   The RPG front-end. A conversation is built once into a view model
   (text + a list of choices) and rendered two ways:
     • desktop / touch : the HTML dialogue box (#maze-dialogue)
     • VR             : a canvas textured onto a 3D panel in front of
                        the player (panel.js), driven by the controllers
   Choices can be gated on player attributes, shift affinity, and make
   a character hand over an item. The portrait switches mood
   (happy / angry / sad / neutral) to match what just happened.
   ============================================================ */
import { player, STATS, meetsReq, addItem, removeItem, canAfford, spendTokens } from "./state.js";
import { createPanel, raycastPanel, PANEL_W, PANEL_H } from "./panel.js";
import { refreshTokenHud } from "./entities.js";
import { characterInk } from "./palette.js";

const STAT_ABBR = { strength:"STR", perception:"PER", endurance:"END",
                    charisma:"CHA", intelligence:"INT", agility:"AGI", luck:"LCK" };

const ui = {};            // cached DOM refs
let M = null;             // shared engine state
let three = null;         // three.js (for the VR panel raycast)
let panel = null;         // 3D panel object (VR)
let current = null;       // character being spoken to
let hub = null;           // their topic hub
let view = null;          // { text, choices:[{ label, req, disabled, onSelect }] }
let scrollTop = 0;        // panel choice scroll offset (px)
let shownAffinity = null; // last affinity rendered (drives the pulse + reaction mood)
const TALK_RADIUS = 2.4;

/* panel choice-list layout (canvas px) */
const PAD = 32, BODY_X = 260, CH_TOP = 320, CH_BOTTOM = PANEL_H - 60, ROW_H = 44, ROW_GAP = 8;
const STRIDE = ROW_H + ROW_GAP;

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

  Object.assign(ui, {
    prompt, box,
    portrait: box.querySelector(".dlg-portrait"),
    name:     box.querySelector(".nm"),
    aff:      box.querySelector(".dlg-aff"),
    text:     box.querySelector(".dlg-text"),
    choices:  box.querySelector(".dlg-choices"),
    foot:     box.querySelector(".dlg-foot"),
  });

  // keyboard controll while the box is open (desktop)
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

/* ---------- build the VR panel (once renderer/dolly exist) ---------- */
let scratch = null;          // reused math objects for panel placement
export function initPanel(three_, dolly){
  three = three_;
  panel = createPanel(three);
  dolly.add(panel.group);
  scratch = {
    m: new three.Matrix4(), s: new three.Vector3(),
    hp: new three.Vector3(), hq: new three.Quaternion(),
    tp: new three.Vector3(), tq: new three.Quaternion(),
    a:  new three.Vector3(), b:  new three.Vector3(), e: new three.Euler(),
  };
}

/* ---------- VR panel placement ----------
   The panel sits at a fixed spot in front of the head. If the user turns
   away from it for longer than REGRAB_DELAY, it eases back to in front of
   them and re-locks once it's centred again, so it can't get stranded
   out of view, but also doesn't jitter with every small head movement. */
const PANEL_DIST   = 1.5;    // metres in front of the head
const PANEL_DROP   = 0.05;   // sit a touch below eye level
const LOSE_ANGLE   = 0.6;    // >~34° off-centre counts as "looked away"
const RELOCK_ANGLE = 0.12;   // settles when back within ~7° of centre
const REGRAB_DELAY = 0.5;    // seconds out of view before it follows
const PLACE_EASE   = 7;      // higher = snappier slide
let place = { away: 0, locked: true };

/* head pose expressed in dolly-local space (the panel lives under the dolly,
   which is itself rotated by snap-turn, so we can't assume identity). */
function headLocalPose(outPos, outQuat){
  const xrCam = M.renderer.xr.getCamera ? M.renderer.xr.getCamera(M.camera) : M.camera;
  scratch.m.copy(M.dolly.matrixWorld).invert().multiply(xrCam.matrixWorld);
  scratch.m.decompose(outPos, outQuat, scratch.s);
}

function updatePanelPlacement(dt, snap){
  if (!panel || !scratch || !M.inVR) return;
  headLocalPose(scratch.hp, scratch.hq);

  // forward (flattened to horizontal so the panel stays upright)
  const fwd = scratch.a.set(0, 0, -1).applyQuaternion(scratch.hq);
  fwd.y = 0;
  if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, -1);
  fwd.normalize();

  // target: ahead of the head, a touch below eye level, facing back at it
  scratch.tp.copy(scratch.hp).addScaledVector(fwd, PANEL_DIST);
  scratch.tp.y = scratch.hp.y - PANEL_DROP;
  scratch.tq.setFromEuler(scratch.e.set(0, Math.atan2(-fwd.x, -fwd.z), 0));

  if (snap){
    panel.group.position.copy(scratch.tp);
    panel.group.quaternion.copy(scratch.tq);
    place.locked = true; place.away = 0;
    return;
  }

  // how far the panel currently sits from the centre of the gaze
  const toPanel = scratch.b.copy(panel.group.position).sub(scratch.hp);
  const ang = toPanel.lengthSq() > 1e-6 ? fwd.angleTo(toPanel) : 0;

  if (place.locked){
    if (ang > LOSE_ANGLE){ place.away += dt; if (place.away >= REGRAB_DELAY) place.locked = false; }
    else place.away = 0;
  } else {
    const k = 1 - Math.exp(-dt * PLACE_EASE);
    panel.group.position.lerp(scratch.tp, k);
    panel.group.quaternion.slerp(scratch.tq, k);
    if (ang < RELOCK_ANGLE){ place.locked = true; place.away = 0; }
  }
}

/* ---------- open / close ---------- */
let trig = { down:false, dragged:false, startY:null, startScroll:0 };

export function openDialogue(state, character){
  M = state;
  current = character;
  hub = character.dialogueFor(M.depth, player);
  M.dialogueOpen = true;
  M.keys = {};                       // drop held movement keys
  M.talk = false;
  shownAffinity = null;              // no pulse on the opening render
  trig = { down:true, dragged:true, startY:null, startScroll:0 };  // ignore the trigger press that opened us

  ui.name.textContent = character.name;
  ui.foot.textContent = STATS.map(([k]) => `${STAT_ABBR[k]} ${player.stats[k]}`).join("  ·  ");

  renderHub();                       // builds the view + renders DOM + panel
  ui.prompt.classList.remove("on");
  ui.box.classList.add("on");
  if (panel){
    panel.group.visible = !!M.inVR;
    if (M.inVR) updatePanelPlacement(0, true);   // snap in front of the head
  }
}

function close(){
  M.dialogueOpen = false;
  current = null; hub = null; view = null;
  ui.box.classList.remove("on");
  if (panel) panel.group.visible = false;
}

/* close from outside (e.g. when the player exits the maze) */
export function closeDialogue(state){ if (state) M = state; if (ui.box) close(); }

/* ---------- view assembly (the hub / nodes build these) ---------- */
function present(text, choices){
  view = { text, choices };
  scrollTop = 0;
  syncHeader();
  renderDOM();
  drawPanel();
}

function renderHub(){
  // hostile characters refuse normal conversation, unless you bring an
  // item they covet (won from another character) to thaw them out
  if (current.wontTalk){
    const wanted = current.wants.map(id => player.inventory.find(it => it.id === id)).find(Boolean);
    if (wanted) return present(
      `*${current.name} eyes the ${wanted.name} in your hands, suddenly interested.*`,
      [{ label: `Offer the ${wanted.name}.`, onSelect: () => giftTo(wanted) },
       { label: "(Leave)", onSelect: close }]);
    return present(hub.hostile, [{ label: "(Leave)", onSelect: close }]);
  }

  const topics = hub.topics.filter(t => !current.hasSeen(hub.level, t.id) && (!t.available || t.available()));
  const engageable = topics.filter(t => meetsReq(t.req));
  if (!engageable.length) return present(hub.exhausted, [{ label: "(Leave)", onSelect: close }]);

  const choices = topics.map(t => ({
    label: t.label, req: t.req, disabled: !meetsReq(t.req), onSelect: () => selectTopic(t),
  }));
  choices.push({ label: "(Leave)", onSelect: close });
  present(hub.greet, choices);
}

function giftTo(item){
  const given = removeItem(item.id);
  if (given){ current.inventory.push(given); current.like(20); toast(`GAVE — ${given.name.toUpperCase()}`); }
  renderHub();                       // mood may now be warm enough to talk
}

function selectTopic(t){
  if (!meetsReq(t.req)) return;
  if (t.oneShot !== false) current.markSeen(hub.level, t.id);   // carried out -> not offered again this level
  if (t.effects && typeof t.effects.like === "number") current.like(t.effects.like);
  renderNode(typeof t.node === "function" ? t.node() : t.node);
}

/* a choice can be gated on an attribute (req) and/or a token price
   (effects.cost); it's only selectable when both are satisfied */
function canSelect(c){
  if (c.req && !meetsReq(c.req)) return false;
  const cost = c.effects?.cost;
  if (cost != null && !canAfford(cost)) return false;
  return true;
}

function renderNode(node){
  const list = (node.choices && node.choices.length) ? node.choices : [{ text: "(Continue)" }];
  const choices = list.map(c => ({
    label: c.text, req: c.req, cost: c.effects?.cost ?? null,
    disabled: !canSelect(c), onSelect: () => chooseChoice(c),
  }));
  present(node.text, choices);
}

function chooseChoice(choice){
  if (!canSelect(choice)) return;
  const fx = choice.effects;
  if (fx){
    if (typeof fx.like === "number") current.like(fx.like);
    if (typeof fx.cost === "number" && fx.cost > 0){ spendTokens(fx.cost); refreshTokenHud(); }  // pay LT
    if (fx.take) removeItem(fx.take);                // barter: hand the character one of your items
    if (fx.give){                                    // giving is self-limiting (item is removed)
      const item = current.takeItem(fx.give);
      if (item){
        addItem(item);
        if (fx.gift) current.recordTrade(hub.level); // only free affinity gifts go on the cooldown
        toast(`RECEIVED — ${item.name.toUpperCase()}`);
      }
    }
  }
  if (choice.next) renderNode(choice.next);
  else renderHub();                                  // end of the topic -> back to the hub
}

function selectByIndex(i){
  const c = view && view.choices[i];
  if (c && !c.disabled) c.onSelect();
}

/* ---------- header (portrait mood + standing) ---------- */
function currentMood(){
  const a = current.affinity;
  const delta = shownAffinity == null ? 0 : a - shownAffinity;
  if (delta >= 3)  return "happy";        // just pleased them
  if (delta <= -3) return "angry";        // just upset them
  if (current.wontTalk) return "angry";   // hates you
  if (a < 40) return "sad";               // dislikes / wary
  if (a >= 70) return "happy";            // likes you
  return "neutral";
}

function syncHeader(){
  const mood = currentMood();
  current.portrait(ui.portrait.getContext("2d"), ui.portrait.width, ui.portrait.height, mood, characterInk(M.theme));
  refreshAffinity();
}

/* standing label only (no number), red (0) -> green (100), pulse on change */
function refreshAffinity(){
  const a = current.affinity;
  ui.aff.textContent = current.standing.toUpperCase();
  const col = `hsl(${Math.round((a / 100) * 140)}, 100%, 55%)`;
  ui.aff.style.color = col;
  ui.aff.style.textShadow = `0 0 10px ${col}, 0 0 4px ${col}`;
  if (shownAffinity !== null && a !== shownAffinity)
    ui.aff.animate(
      [{ transform: "scale(1.3)", filter: "brightness(2.4)" },
       { transform: "scale(1)",   filter: "brightness(1)" }],
      { duration: 420, easing: "ease-out" });
  shownAffinity = a;
}

/* ---------- DOM renderer ---------- */
function domChoiceButton(index, c){
  const btn = document.createElement("button");
  if (c.req){
    const tag = document.createElement("span");
    tag.className = "req";
    tag.textContent = `[${STAT_ABBR[c.req.attr]} ${c.req.level}] `;
    btn.appendChild(tag);
  }
  if (c.cost != null){
    const tag = document.createElement("span");
    tag.className = "req lt";
    tag.textContent = `[${c.cost} LT] `;
    btn.appendChild(tag);
  }
  btn.appendChild(document.createTextNode(`${index}. ${c.label}`));
  if (c.disabled) btn.disabled = true;
  else btn.addEventListener("click", c.onSelect);
  return btn;
}

function renderDOM(){
  ui.text.textContent = view.text;
  ui.choices.innerHTML = "";
  view.choices.forEach((c, i) => ui.choices.appendChild(domChoiceButton(i + 1, c)));
}

/* ---------- VR panel renderer ---------- */
function wrapText(g, text, x, y, maxW, lh){
  let line = "", yy = y;
  for (const word of String(text).split(/\s+/)){
    const test = line ? line + " " + word : word;
    if (g.measureText(test).width > maxW && line){ g.fillText(line, x, yy); line = word; yy += lh; }
    else line = test;
  }
  if (line) g.fillText(line, x, yy);
}

function maxScroll(){
  return Math.max(0, view.choices.length * STRIDE - (CH_BOTTOM - CH_TOP));
}
function clampScroll(s){ return Math.max(0, Math.min(s, maxScroll())); }

function panelChoiceAt(uv){
  if (!view) return -1;
  const y = uv.y * PANEL_H;
  if (y < CH_TOP || y > CH_BOTTOM) return -1;
  const rel = y - CH_TOP + scrollTop;
  if (rel % STRIDE > ROW_H) return -1;               // pointing at the gap between rows
  const idx = Math.floor(rel / STRIDE);
  return (idx >= 0 && idx < view.choices.length) ? idx : -1;
}

function drawPanel(hover = -1){
  if (!panel || !view) return;
  const g = panel.ctx, W = PANEL_W, H = PANEL_H;
  g.clearRect(0, 0, W, H);
  g.fillStyle = "rgba(8,18,15,0.96)"; g.fillRect(0, 0, W, H);
  g.strokeStyle = "#1f7a4a"; g.lineWidth = 3; g.strokeRect(4, 4, W - 8, H - 8);

  // portrait (reuse the DOM portrait canvas, already drawn for the mood)
  g.drawImage(ui.portrait, 32, 32, 205, 256);
  g.lineWidth = 2; g.strokeRect(32, 32, 205, 256);

  // name + standing
  g.textAlign = "left"; g.textBaseline = "alphabetic";
  g.fillStyle = "#ff7a1a"; g.font = "40px 'VT323', monospace";
  g.fillText(current.name, BODY_X, 72);
  g.fillStyle = `hsl(${Math.round((current.affinity / 100) * 140)},100%,55%)`;
  g.font = "26px 'VT323', monospace";
  g.fillText(current.standing.toUpperCase(), BODY_X, 108);

  // text
  g.fillStyle = "#46ff8e"; g.font = "24px 'Share Tech Mono', monospace";
  wrapText(g, view.text, BODY_X, 150, W - BODY_X - 32, 30);

  // choices (scroll-clipped)
  const regionH = CH_BOTTOM - CH_TOP;
  g.save();
  g.beginPath(); g.rect(PAD, CH_TOP, W - 2 * PAD, regionH); g.clip();
  g.textBaseline = "middle";
  view.choices.forEach((c, i) => {
    const y = CH_TOP - scrollTop + i * STRIDE;
    if (y + ROW_H < CH_TOP || y > CH_BOTTOM) return;
    g.fillStyle = (i === hover && !c.disabled) ? "rgba(70,255,142,0.18)" : "rgba(4,8,10,0.6)";
    g.fillRect(PAD, y, W - 2 * PAD, ROW_H);
    g.strokeStyle = c.disabled ? "#7a1f1f" : "#1f7a4a"; g.lineWidth = 2;
    g.strokeRect(PAD, y, W - 2 * PAD, ROW_H);
    let tx = PAD + 12;
    g.font = "22px 'Share Tech Mono', monospace";
    if (c.req){
      g.fillStyle = c.disabled ? "#ff3b3b" : "#46ff8e";
      const tag = `[${STAT_ABBR[c.req.attr]} ${c.req.level}] `;
      g.fillText(tag, tx, y + ROW_H / 2); tx += g.measureText(tag).width;
    }
    if (c.cost != null){
      g.fillStyle = c.disabled ? "#ff3b3b" : "#ffd24a";   // gold, red when you can't afford it
      const tag = `[${c.cost} LT] `;
      g.fillText(tag, tx, y + ROW_H / 2); tx += g.measureText(tag).width;
    }
    g.fillStyle = c.disabled ? "#1f7a4a" : "#cfffe0";
    g.fillText(`${i + 1}. ${c.label}`, tx, y + ROW_H / 2);
  });
  g.restore();
  g.textBaseline = "alphabetic";

  // scrollbar
  const contentH = view.choices.length * STRIDE;
  if (contentH > regionH){
    const sx = W - PAD + 8;
    g.fillStyle = "rgba(70,255,142,0.08)"; g.fillRect(sx, CH_TOP, 6, regionH);
    const th = Math.max(24, regionH * regionH / contentH);
    const ty = CH_TOP + (regionH - th) * (scrollTop / (contentH - regionH));
    g.fillStyle = "#1f7a4a"; g.fillRect(sx, ty, 6, th);
  }

  // footer (player stats)
  g.fillStyle = "#1f7a4a"; g.font = "22px 'VT323', monospace";
  g.fillText(STATS.map(([k]) => `${STAT_ABBR[k]} ${player.stats[k]}`).join("  ·  "), PAD, H - 26);

  panel.tex.needsUpdate = true;
}

/* ---------- VR per-frame input (called from the loop while in VR) ---------- */
export function updateDialogueXR(state, three_, dt){
  M = state; three = three_;
  if (!panel || !panel.group.visible || !M.dialogueOpen) return;
  const session = M.renderer.xr.getSession && M.renderer.xr.getSession();
  if (!session) return;

  updatePanelPlacement(dt, false);   // keep it in front of the head (lazy follow)
  panel.group.updateWorldMatrix(true, true);   // raycast collider must match where it's drawn this frame

  // Raycast the ACTIVE controller first — its pointer is the one shown and the
  // one you're aiming. Looking left used to let the (non-aiming) left
  // controller's ray clip the panel first and steal the hover from the right
  // hand; prioritising the active controller fixes that. Fall back to the
  // other controller only when the active one isn't on the panel.
  const ctrls = M.controllers || [];
  const ai = (M.hands && M.hands.active) || 0;
  const activeHit = ctrls[ai] ? raycastPanel(three, panel, ctrls[ai]) : null;
  let uv = activeHit;
  if (!uv){
    for (let i = 0; i < ctrls.length; i++){
      if (i === ai) continue;
      const u = raycastPanel(three, panel, ctrls[i]);
      if (u){ uv = u; break; }
    }
  }
  const hover = uv ? panelChoiceAt(uv) : -1;

  // end the visible (active) pointer at the panel surface, if it's on it
  M.pointerReach = activeHit ? activeHit.distance : null;

  // thumbstick + trigger across input sources
  let thumb = 0, trigger = false;
  for (const src of session.inputSources){
    const gp = src.gamepad; if (!gp) continue;
    const ty = (gp.axes[3] ?? 0) || (gp.axes[1] ?? 0);
    if (Math.abs(ty) > 0.18) thumb += ty;
    if (gp.buttons[0] && gp.buttons[0].pressed) trigger = true;
  }

  // thumbstick scroll while pointing at the panel
  if (uv && Math.abs(thumb) > 0.18) scrollTop = clampScroll(scrollTop + thumb * 900 * dt);

  // trigger: hold-drag to scroll, tap to select
  if (trigger && !trig.down){
    trig.down = true; trig.dragged = false;
    trig.startY = uv ? uv.y : null; trig.startScroll = scrollTop;
  } else if (trigger && trig.down){
    if (uv && trig.startY !== null){
      const dy = (uv.y - trig.startY) * PANEL_H;     // drag the surface
      if (Math.abs(dy) > 14){ trig.dragged = true; scrollTop = clampScroll(trig.startScroll - dy); }
    }
  } else if (!trigger && trig.down){
    trig.down = false;
    if (!trig.dragged && hover >= 0) selectByIndex(hover);
  }

  drawPanel(hover);
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
    ui.prompt.textContent = M.inVR
      ? `TRIGGER — SPEAK WITH ${near.character.name}`
      : `PRESS [F] — SPEAK WITH ${near.character.name}`;
    ui.prompt.classList.add("on");
  } else {
    ui.prompt.classList.remove("on");
  }

  if (M.talk){
    M.talk = false;
    if (near) openDialogue(M, near.character);
  }
}
