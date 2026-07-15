/* ============================================================
   MAZE.EXE — operator log (journal / quest tracker)
   The game's best systems — the narrative gate, the barter/relay
   economy, the standings — were legible only in the moment. This
   overlay makes them reviewable. Three tabs:
     OBJECTIVE  — who on this level still holds the way down
     CONTACTS   — each trapped user's standing + what they want
     INVENTORY  — LT balance + the items you carry, with lore
   Like the minimap, one canvas serves both worlds: a DOM overlay
   on flat screens, and the same pixels textured onto a panel in
   front of the player in VR (the DOM layer isn't composited into
   immersive-vr). Terminal aesthetic to match the HUD.

   Opening freezes the world (maze.js reads M.journalOpen), so it
   reads like pausing to check your notes.
   ============================================================ */
import { $ } from "../../utils.js";
import { player, hasFlag, depthInCycle, cycleOf } from "./state.js";
import { ROSTER } from "./characters/characters.js";
import { WORLD_ITEMS, activeErrands } from "./story.js";

const W = 560, H = 760, DPR = 2;    // logical size; canvas is DPR× for crisp text
const TABS = ["OBJECTIVE", "CONTACTS", "INVENTORY", "ERRANDS"];

let canvas = null, g = null;
let M = null;                        // shared engine state (kept for the DOM redraws)
let tab = 0;
let scroll = 0;                      // px, for tabs that overflow (CONTACTS/INVENTORY)

/* VR panel (built lazily by initJournalXR) */
let xr = null;                       // { tex, mesh, group }
let btnEdge = false, stickEdge = false, closeEdge = false;

/* ---------- build (once) ---------- */
export function buildJournal(state){
  M = state;
  ensureCanvas();

  // own key handling: Tab / J toggles; 1-3 pick a tab; Esc / J / Tab close.
  // guarded so it never opens over a conversation (dialogue owns input then).
  addEventListener("keydown", e => {
    const layer = $("#maze-layer");
    if (!layer || !layer.classList.contains("on")) return;
    if (e.target && e.target.tagName === "INPUT") return;
    const k = e.key.toLowerCase();
    if (k === "tab" || k === "j"){
      e.preventDefault();
      if (M.dialogueOpen || M.pauseOpen) return;
      toggleJournal();
      return;
    }
    if (!M.journalOpen) return;
    e.preventDefault();
    if (e.key === "Escape"){ closeJournal(); return; }
    if (k === "1"){ setTab(0); }
    else if (k === "2"){ setTab(1); }
    else if (k === "3"){ setTab(2); }
    else if (k === "4"){ setTab(3); }
    else if (k === "arrowright" || k === "e"){ setTab((tab + 1) % TABS.length); }
    else if (k === "arrowleft"  || k === "q"){ setTab((tab + TABS.length - 1) % TABS.length); }
    else if (k === "arrowdown" || k === "s"){ scrollBy(48); }
    else if (k === "arrowup"   || k === "w"){ scrollBy(-48); }
  });
  // wheel scroll on the DOM overlay
  canvas.addEventListener("wheel", e => { if (M.journalOpen){ e.preventDefault(); scrollBy(e.deltaY); } }, { passive: false });

  const btn = $("#btn-journal");
  if (btn) btn.addEventListener("click", () => toggleJournal());
}

function ensureCanvas(){
  if (canvas) return;
  canvas = document.createElement("canvas");
  canvas.id = "maze-journal";
  canvas.width = W * DPR; canvas.height = H * DPR;
  g = canvas.getContext("2d");
  g.scale(DPR, DPR);
  $("#maze-layer").appendChild(canvas);
}

/* ---------- open / close ---------- */
export function isJournalOpen(){ return !!(M && M.journalOpen); }

export function toggleJournal(){ M.journalOpen ? closeJournal() : openJournal(); }

export function openJournal(){
  if (M.dialogueOpen || M.pauseOpen) return;
  M.journalOpen = true;
  // free the cursor while the log is open (matches the dialogue/pause modals)
  try { document.exitPointerLock && document.exitPointerLock(); } catch {}
  M.keys = {};                       // drop held movement keys
  scroll = 0;
  if (!M.inVR){ canvas.classList.add("on"); draw(); }
}

export function closeJournal(){
  M.journalOpen = false;
  canvas.classList.remove("on");
  if (xr) xr.group.visible = false;
}

function setTab(i){ tab = i; scroll = 0; if (!M.inVR) draw(); }
function scrollBy(dy){ scroll = Math.max(0, Math.min(scroll + dy, maxScroll)); if (!M.inVR) draw(); }
let maxScroll = 0;

/* ---------- item-name resolver ---------- */
const EXTRA_NAMES = { mayo: "Jar of Mayonnaise" };
function itemName(id){
  const w = WORLD_ITEMS.find(w => w.id === id);
  if (w) return w.name;
  for (const c of ROSTER){ const it = c.inventory.find(i => i.id === id); if (it) return it.name; }
  return EXTRA_NAMES[id] || id;
}

/* ---------- theme + palette ---------- */
const BG = "rgba(6,14,12,0.97)";
const GREEN = "#46ff8e", DIM = "#1f7a4a", ORANGE = "#ff7a1a", INK = "#cfffe0";
function neonHex(){ const n = (M.theme && M.theme.neon) ?? 0x46ff8e; return "#" + n.toString(16).padStart(6, "0"); }
function standingColor(a){ return `hsl(${Math.round((a / 100) * 140)},100%,55%)`; }

function wrap(text, x, y, maxW, lh, max = 99){
  let line = "", yy = y, n = 0;
  for (const word of String(text).split(/\s+/)){
    const test = line ? line + " " + word : word;
    if (g.measureText(test).width > maxW && line){ g.fillText(line, x, yy); line = word; yy += lh; if (++n >= max) return yy; }
    else line = test;
  }
  if (line) g.fillText(line, x, yy);
  return yy + lh;
}

/* ---------- draw ---------- */
export function draw(){
  if (!g || !M) return;
  const neon = neonHex();

  g.clearRect(0, 0, W, H);
  g.fillStyle = BG; g.fillRect(0, 0, W, H);
  g.strokeStyle = neon; g.lineWidth = 2; g.strokeRect(4, 4, W - 8, H - 8);

  // title
  g.textAlign = "left"; g.textBaseline = "alphabetic";
  g.fillStyle = ORANGE; g.font = "34px 'VT323', monospace";
  g.fillText("OPERATOR LOG", 24, 44);
  g.fillStyle = DIM; g.font = "16px 'Share Tech Mono', monospace";
  g.fillText(player.name, W - 24 - g.measureText(player.name).width, 42);

  // tab bar
  const tabY = 62, tabH = 34, tw = (W - 48) / TABS.length;
  TABS.forEach((label, i) => {
    const x = 24 + i * tw;
    g.fillStyle = i === tab ? "rgba(70,255,142,0.16)" : "rgba(4,8,10,0.5)";
    g.fillRect(x, tabY, tw - 6, tabH);
    g.strokeStyle = i === tab ? GREEN : DIM; g.lineWidth = 1.5;
    g.strokeRect(x, tabY, tw - 6, tabH);
    g.fillStyle = i === tab ? GREEN : DIM;
    g.font = "18px 'VT323', monospace"; g.textAlign = "center";
    g.fillText(`${i + 1} ${label}`, x + (tw - 6) / 2, tabY + 23);
  });
  g.textAlign = "left";

  // body, clipped to the region below the tabs and scrolled
  const top = 118, bottom = H - 34;
  g.save();
  g.beginPath(); g.rect(20, top - 6, W - 40, bottom - top + 6); g.clip();
  g.translate(0, -scroll);
  let endY = top;
  if (tab === 0)      endY = drawObjective(top);
  else if (tab === 1) endY = drawContacts(top);
  else if (tab === 2) endY = drawInventory(top);
  else                endY = drawErrands(top);
  g.restore();

  maxScroll = Math.max(0, endY - bottom + 20);

  // scrollbar hint
  if (maxScroll > 0){
    const trackH = bottom - top;
    g.fillStyle = "rgba(70,255,142,0.08)"; g.fillRect(W - 14, top, 5, trackH);
    const th = Math.max(24, trackH * trackH / (trackH + maxScroll));
    const ty = top + (trackH - th) * (scroll / maxScroll);
    g.fillStyle = DIM; g.fillRect(W - 14, ty, 5, th);
  }

  // footer hint
  g.fillStyle = DIM; g.font = "14px 'Share Tech Mono', monospace"; g.textAlign = "center";
  g.fillText(M.inVR ? "X: CLOSE  ·  STICK ◂ ▸: TABS" : "TAB / J: CLOSE  ·  1·2·3·4: TABS  ·  ↑↓: SCROLL", W / 2, H - 14);
  g.textAlign = "left";

  if (xr){ xr.tex.needsUpdate = true; }
}

function drawObjective(top){
  let y = top + 14;
  const shown = String(depthInCycle(M.depth)).padStart(2, "0");
  const cyc = cycleOf(M.depth);
  g.fillStyle = INK; g.font = "20px 'VT323', monospace";
  g.fillText(M.inSanctum ? "THE BASE DEPTH" : `DEPTH ${shown}${cyc > 1 ? `  ·  CYCLE ${cyc}` : ""}`, 24, y);
  y += 30;

  const pending = M.gatePending || [];
  g.font = "17px 'Share Tech Mono', monospace";
  if (pending.length){
    g.fillStyle = ORANGE;
    y = wrap("The way down is SEALED. Hear everyone's story, and speak with each of them, to raise the ring.", 24, y, W - 60, 24);
  } else {
    g.fillStyle = GREEN;
    y = wrap("The way down is OPEN. Find the ring and descend.", 24, y, W - 60, 24);
  }
  y += 8;

  // per-character status on this level
  g.fillStyle = DIM; g.font = "16px 'VT323', monospace";
  g.fillText("— ON THIS LEVEL —", 24, y); y += 26;
  const npcs = M.npcs || [];
  if (!npcs.length){
    g.fillStyle = DIM; g.font = "16px 'Share Tech Mono', monospace";
    g.fillText("(no one is trapped here)", 24, y); y += 24;
  }
  for (const npc of npcs){
    const name = npc.character.name;
    const stillPending = pending.includes(name);
    g.font = "18px 'Share Tech Mono', monospace";
    g.fillStyle = stillPending ? ORANGE : GREEN;
    g.fillText(stillPending ? "◇" : "✓", 26, y);
    g.fillStyle = INK;
    g.fillText(name, 50, y);
    g.fillStyle = DIM; g.font = "14px 'Share Tech Mono', monospace";
    g.fillText(stillPending ? "still has words for you" : "heard", 50, y + 18);
    y += 42;
  }
  return y;
}

function drawContacts(top){
  let y = top + 14;
  const known = ROSTER.filter(c => M.depth >= (c.minDepth ?? 1));
  for (const c of known){
    const freed = hasFlag(`freed-${c.id}`);
    g.font = "22px 'VT323', monospace"; g.fillStyle = ORANGE;
    g.fillText(c.name, 24, y);
    g.font = "16px 'VT323', monospace";
    if (freed){ g.fillStyle = "#9fc6d8"; g.fillText("RELEASED", W - 24 - g.measureText("RELEASED").width, y); }
    else { g.fillStyle = standingColor(c.affinity); const s = c.standing.toUpperCase();
           g.fillText(s, W - 24 - g.measureText(s).width, y); }
    y += 24;

    g.font = "15px 'Share Tech Mono', monospace"; g.fillStyle = DIM;
    if (freed){
      y = wrap("Their window is dark now. You carried them out.", 40, y, W - 76, 20);
    } else {
      const wants = (c.interestsOpen || []).map(itemName);
      const line = wants.length ? `Wants: ${wants.join(", ")}` : "Wants: (nothing they'll name)";
      y = wrap(line, 40, y, W - 76, 20);
      // barter surfacing: if you're carrying something they openly want, say so
      const carried = (c.interestsOpen || []).filter(id => (player.inventory || []).some(it => it.id === id));
      if (carried.length){
        g.fillStyle = GREEN;
        y = wrap(`Will trade for your ${carried.map(itemName).join(", ")}.`, 40, y, W - 76, 20);
      }
    }
    y += 14;
  }
  if (!known.length){ g.fillStyle = DIM; g.font = "16px 'Share Tech Mono', monospace"; g.fillText("(no contacts yet)", 24, y); y += 24; }
  return y;
}

function drawInventory(top){
  let y = top + 14;
  g.font = "20px 'VT323', monospace"; g.fillStyle = "#ffd24a";
  g.fillText(`◈ ${player.tokens} LT`, 24, y);
  y += 34;
  g.fillStyle = DIM; g.font = "16px 'VT323', monospace";
  g.fillText("— CARRIED ITEMS —", 24, y); y += 26;

  const inv = player.inventory || [];
  if (!inv.length){
    g.fillStyle = DIM; g.font = "16px 'Share Tech Mono', monospace";
    g.fillText("(your pockets are empty)", 24, y); y += 24;
  }
  for (const it of inv){
    g.font = "18px 'Share Tech Mono', monospace"; g.fillStyle = INK;
    g.fillText(`• ${it.name}`, 24, y); y += 22;
    if (it.desc){
      g.font = "14px 'Share Tech Mono', monospace"; g.fillStyle = DIM;
      y = wrap(it.desc, 40, y, W - 76, 19);
    }
    y += 12;
  }
  return y;
}

/* the relay/promise tracker: what the player has been asked to carry, and
   the promises they've made, still outstanding (story.js activeErrands) */
function drawErrands(top){
  let y = top + 14;
  g.fillStyle = INK; g.font = "20px 'VT323', monospace";
  g.fillText("OUTSTANDING", 24, y); y += 30;

  const errands = activeErrands();
  if (!errands.length){
    g.fillStyle = DIM; g.font = "16px 'Share Tech Mono', monospace";
    g.fillText("(none outstanding)", 24, y); y += 24;
    y += 10;
    g.fillStyle = DIM; g.font = "14px 'Share Tech Mono', monospace";
    y = wrap("Carry a message or make a promise and it will be logged here.", 24, y, W - 60, 20);
    return y;
  }
  for (const e of errands){
    g.fillStyle = ORANGE; g.font = "18px 'Share Tech Mono', monospace";
    g.fillText("▸", 26, y);
    g.fillStyle = INK; g.font = "16px 'Share Tech Mono', monospace";
    y = wrap(e.text, 50, y, W - 86, 22);
    y += 12;
  }
  return y;
}

/* ---------- VR panel ----------
   Same canvas, textured onto a plane parked in front of the dolly (like
   the debug panel). Toggled with the left controller's X button; the left
   thumbstick flicks between tabs; B closes. */
export function initJournalXR(three, dolly){
  ensureCanvas();
  const tex = new three.CanvasTexture(canvas);
  const mesh = new three.Mesh(
    new three.PlaneGeometry(0.7, 0.7 * H / W),
    new three.MeshBasicMaterial({ map: tex, transparent: true, fog: false, depthTest: false, depthWrite: false }));
  mesh.renderOrder = 999;
  const group = new three.Group();
  group.add(mesh);
  group.position.set(0, 1.5, -1.15);   // in front of the dolly origin
  group.visible = false;
  dolly.add(group);
  xr = { tex, mesh, group };
}

/* called every frame while in VR (from the loop). Polls the toggle button
   even when closed; renders + reads tab input when open. */
export function updateJournalXR(state, three, dt){
  M = state;
  if (!xr) return;
  const session = M.renderer.xr.getSession && M.renderer.xr.getSession();
  if (!session){ xr.group.visible = false; return; }

  let openBtn = false, closeBtn = false, stickX = 0;
  for (const src of session.inputSources){
    const gp = src.gamepad; if (!gp) continue;
    if (src.handedness === "left"){
      if (gp.buttons[4] && gp.buttons[4].pressed) openBtn = true;   // X
      stickX += (gp.axes[2] ?? 0) || (gp.axes[0] ?? 0);
    }
    if (gp.buttons[5] && gp.buttons[5].pressed) closeBtn = true;    // B / Y
  }

  // edge-detect the toggle (X), so a held press flips it once
  if (openBtn && !btnEdge){ btnEdge = true; toggleJournal(); }
  else if (!openBtn) btnEdge = false;

  if (!M.journalOpen){ xr.group.visible = false; return; }

  xr.group.visible = true;

  // B closes
  if (closeBtn && !closeEdge){ closeEdge = true; closeJournal(); return; }
  else if (!closeBtn) closeEdge = false;

  // thumbstick flick cycles tabs
  if (Math.abs(stickX) > 0.6){
    if (!stickEdge){ stickEdge = true; setTab((tab + (stickX > 0 ? 1 : TABS.length - 1)) % TABS.length); }
  } else stickEdge = false;

  draw();     // redraw + tex.needsUpdate every frame while open
}
