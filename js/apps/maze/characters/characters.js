/* ============================================================
   MAZE.EXE - characters (engine)
   A single reusable Character class plus the roster, spawning, the
   2.5D in-world build and the idle animation. Each character's own
   data (portrait drawing, dialogue, inventory) lives in its own
   file (e.g. scally.js) and gets wrapped here in a Character instance.

   Each character carries their own affinity toward the player
   (0..100, persists across levels), a per-level dialogue tree whose
   tone shifts with that affinity, a description, a procedurally drawn
   portrait, and an inventory they can offer from through dialogue.

   Spawning: every character shows up on every level at a random spot,
   except those flagged `firstLevelNearStart` (Scally) who are
   guarenteed within the first five squares on level 1.

   The world is called the "Labyrinth Protocol" and characters speak of
   it by that name. Trading is rate-limited for everyone (see
   TRADE_COOLDOWN and Character.canTrade), so that rule lives here in the
   base class rather than being re-invented in each character's file.

   Adding a character: make a new file exporting a def (see
   scally.js), import it below and add it to DEFS.
   ============================================================ */
import { cellCenter, bfsDistances, exteriorSides } from "../generator.js";
import { characterInk } from "../palette.js";
import { scally } from "./scally.js";
import { homiss } from "./homiss.js";

/* affinity buckets -> tone key used to pick dialogue flavour */
const TONES = [
  [20,  "hostile"],
  [40,  "wary"],
  [60,  "neutral"],
  [80,  "friendly"],
  [100, "warm"],
];

/* relationship standing shown to the player (first band whose max >= affinity).
   The 30-39 band ("Wary of you") fills a gap in the original spec. */
const STANDINGS = [
  [0,   "Wants to end you"],
  [19,  "Hates your guts"],
  [29,  "Dislikes you"],
  [39,  "Wary of you"],
  [49,  "Suspicious of you"],
  [59,  "Neutral"],
  [69,  "Intrigued by you"],
  [79,  "Likes you"],
  [89,  "Likes you a LOT"],
  [99,  "Adores you"],
  [100, "Obsessed"],
];

/* below this affinity a character refuses normal conversation */
export const HOSTILE = 20;

/* the world's name; characters refer to it by this in their dialogue */
export const WORLD = "Labyrinth Protocol";

/* trade cooldown, measured in maze levels. A character will hand the
   player an item at most once every TRADE_COOLDOWN levels: a trade on
   level N is locked until level N + TRADE_COOLDOWN, so trading on level 1
   means the next trade with that character is level 3 (level 2 is the
   cool-down gap). See Character.canTrade / recordTrade. */
export const TRADE_COOLDOWN = 2;

export class Character {
  constructor(def){
    this.id          = def.id;
    this.name        = def.name;
    this.description = def.description;
    this.affinity    = def.affinity ?? 50;          // 0..100, mutated by dialogue, persists across levels (new game = 50)
    this.seen        = new Map();                    // level -> Set of exhausted topic ids (conversations are fresh each level)
    this.wants       = def.wants ?? [];              // item ids this character covets, gift one to thaw a hostile mood
    this.inventory   = (def.inventory ?? []).map(i => ({ ...i }));  // items[]; an item with a `price` is token-only (see economy note)
    this.interestsOpen = def.interests?.open ?? [];  // item ids this character openly wants from the player (barter)
    this.hiddenDesire  = def.interests?.hidden ?? null;  // the one item they crave but won't name; they speak of it in riddles
    this.lastTradeLevel = null;                      // last level we handed the player a gift (trade cooldown; null = never)
    this.portrait    = def.portrait;                // (ctx, w, h, mood, ink) => void   flat portrait
    this.drawLayer   = def.drawLayer ?? null;       // (ctx, w, h, mood, layer, ink) => void   one depth slice
    this.layerCount  = def.layerCount ?? 1;         // number of depth slices for the 2.5D figure
    this._dialogue   = def.dialogue;                // (ctx) => rootNode
    this.firstLevelNearStart = !!def.firstLevelNearStart;
  }

  like(delta){ this.affinity = Math.max(0, Math.min(100, this.affinity + delta)); }

  get tone(){ return (TONES.find(([max]) => this.affinity <= max) ?? TONES.at(-1))[1]; }

  /* relationship label shown next to the name in dialogue */
  get standing(){ return (STANDINGS.find(([max]) => this.affinity <= max) ?? STANDINGS.at(-1))[1]; }

  /* too cold for normal conversation, needs a gift to thaw first */
  get wontTalk(){ return this.affinity < HOSTILE; }

  /* topic exhaustion is tracked per maze level, so each level is a fresh conversation */
  hasSeen(level, id){ return this.seen.get(level)?.has(id) ?? false; }
  markSeen(level, id){
    let s = this.seen.get(level);
    if (!s) this.seen.set(level, s = new Set());
    s.add(id);
  }

  /* remove an item from this character's pockets (when they give it away) */
  takeItem(id){
    const i = this.inventory.findIndex(it => it.id === id);
    return i < 0 ? null : this.inventory.splice(i, 1)[0];
  }

  /* --- the economy (base behaviour, shared by every character) -----------
     Every character's pockets hold a mix of items the player can come by
     three different ways:

       1. TOKEN-ONLY items. An inventory item with a `price` is sold for
          Labyrinth Tokens (LT) only, never gifted or bartered. Each
          character has one prized item like this (see `forSale`). LT are
          the world's currency, picked up as floating shapes in the maze.

       2. AFFINITY GIFTS. The other (un-priced) items can be given away for
          free once the player is liked enough. This is the only path on
          the TRADE_COOLDOWN: a gift on level N blocks the next gift from
          this character until level N + TRADE_COOLDOWN (so a gift on level
          1 is unavailable again until level 3). dialogue.js records it for
          you when a `gift` effect fires; just gate the offer on canTrade()
          and, when it's false, brush the player off in character ("things
          are scarce in the Labyrinth Protocol right now").

       3. BARTER. Those same un-priced items can also be traded for a
          specific item the character wants from the player. Each character
          lists what they want: a handful they'll name openly
          (`interestsOpen`) plus one `hiddenDesire` they're cagey about and
          will only hint at in riddles. Barter and token sales are explicit
          exchanges and are NOT on the cooldown; they're self-limiting (the
          item or the LT is spent).

     New characters get all of this for free from the def: mark one item
     with a `price`, and supply `interests: { open:[...], hidden:"id" }`.
     Note: characters refer to the tokens however suits them; some say "LT"
     casually, others the full "Labyrinth Tokens". */
  get forSale(){ return this.inventory.filter(it => it.price != null); }   // token-only items
  get giftable(){ return this.inventory.filter(it => it.price == null); }  // affinity-gift / barter pool
  wantsOpenly(id){ return this.interestsOpen.includes(id); }
  desiresSecretly(id){ return this.hiddenDesire != null && this.hiddenDesire === id; }
  isInterestedIn(id){ return this.wantsOpenly(id) || this.desiresSecretly(id); }

  canTrade(level){ return this.lastTradeLevel == null || level - this.lastTradeLevel >= TRADE_COOLDOWN; }
  recordTrade(level){ this.lastTradeLevel = level; }

  /* the dialogue tree root for this maze level, flavoured by affinity */
  dialogueFor(depth, player){
    return this._dialogue({ depth, player, affinity: this.affinity, tone: this.tone, character: this });
  }
}

/* the full roster, one Character instance per def, created once so
   affinity and seen-topics persist across maze levels */
const DEFS = [scally, homiss];
export const ROSTER = DEFS.map(def => new Character(def));

/* passive recovery, applied once per maze level: a character who is
   almost murderous (affinity < 10) warms by 5, capped at 10, so an
   enraged character can eventually be approached again. */
export function recoverAffinity(){
  for (const c of ROSTER)
    if (c.affinity < 10) c.affinity = Math.min(10, c.affinity + 5);
}

/* ---------- spawning ---------- */

const BACK = 0.7;  // how far behind the window the figure stands

/* world geometry for a character placed against `side` of `cell`:
   the windowed wall, the figure's spot behind it, and the wall key
   the environment uses to render a window there. */
function makeSpawn(character, cell, side, CELL){
  const cx = cellCenter(cell.x, CELL), cz = cellCenter(cell.y, CELL);
  const W = { N: { wall:{x:cx, z:cell.y*CELL,      alongX:true},  npc:{x:cx, z:cell.y*CELL - BACK} },
              S: { wall:{x:cx, z:(cell.y+1)*CELL,  alongX:true},  npc:{x:cx, z:(cell.y+1)*CELL + BACK} },
              W: { wall:{x:cell.x*CELL, z:cz,      alongX:false}, npc:{x:cell.x*CELL - BACK, z:cz} },
              E: { wall:{x:(cell.x+1)*CELL, z:cz,  alongX:false}, npc:{x:(cell.x+1)*CELL + BACK, z:cz} } }[side];
  return { character, cell, side, wall: W.wall, npc: W.npc, face: { x: cx, z: cz } };
}

/* choose where each character appears this level. Returns
   [{ character, cell, side, wall, npc }]. */
export function spawnCharacters(cells, goalCell, depth, cfg){
  const { N, CELL } = cfg;
  const dist = bfsDistances(cells);
  const used = new Set();

  // valid host cells: not the start, not the goal, and with a wall facing
  // outside the grid. those are the only walls whose far side the player
  // can never reach, so the window can't be flanked from behind
  const candidates = [];
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++){
      if (x === 0 && y === 0) continue;
      if (x === goalCell.x && y === goalCell.y) continue;
      if (exteriorSides(cells, x, y).length === 0) continue;
      candidates.push({ x, y });
    }

  // ROSTER order matters on level 1: the `firstLevelNearStart` character
  // (Scally) is placed first, as near the start as possible, and every other
  // character is then pushed strictly farther in — so Scally is always the
  // first one the player meets. (Exactly one character should carry the flag.)
  const spawns = [];
  let firstMetDist = null;
  for (const ch of ROSTER){
    let pool = candidates.filter(c => !used.has(c.x + "," + c.y));

    if (depth === 1 && ch.firstLevelNearStart){
      const near = pool.filter(c => dist[c.y][c.x] >= 1 && dist[c.y][c.x] <= 5);
      if (near.length){
        const dmin = Math.min(...near.map(c => dist[c.y][c.x]));
        pool = near.filter(c => dist[c.y][c.x] === dmin);   // the closest tier (random among ties)
      }
    } else if (depth === 1 && firstMetDist != null){
      const far = pool.filter(c => dist[c.y][c.x] > firstMetDist);
      if (far.length) pool = far;     // keep everyone else deeper than Scally
    }
    if (!pool.length) continue;

    const cell  = pool[Math.random()*pool.length | 0];
    used.add(cell.x + "," + cell.y);
    if (depth === 1 && ch.firstLevelNearStart) firstMetDist = dist[cell.y][cell.x];

    const sides = exteriorSides(cells, cell.x, cell.y);
    const side  = sides[Math.random()*sides.length | 0];
    spawns.push(makeSpawn(ch, cell, side, CELL));
  }
  return spawns;
}

/* build the in-world figures behind their windows and return the
   interaction records the loop polls: [{ character, x, z }] where
   (x,z) is the windowed wall.

   Each figure is a small stack of cutout planes at increasing depth
   (body / head / hands) facing the cell, giving real parallax, so
   in VR stereo (and when moving in 2D) the character reads as solid
   rather than a flat decal. */
export function buildCharacters(three, scene, spawns, theme){
  const ink = characterInk(theme);   // every character drawn in this level's single colour
  const npcs = [];
  for (const s of spawns){
    const ch = s.character;
    const figure = new three.Group();
    const layers = ch.layerCount;

    for (let li = 0; li < layers; li++){
      // supersample: the art is drawn at a logical 256×320 but rasterised SS×
      // larger, so the line work stays crisp viewed up close in VR stereo
      const SS = 3, BW = 256, BH = 320;
      const cnv = document.createElement("canvas");
      cnv.width = BW * SS; cnv.height = BH * SS;
      const g = cnv.getContext("2d");
      g.scale(SS, SS);
      if (ch.drawLayer) ch.drawLayer(g, BW, BH, "neutral", li, ink);
      else              ch.portrait(g, BW, BH, "neutral", ink);

      const tex = new three.CanvasTexture(cnv);
      tex.anisotropy = 8;                  // sharpen at grazing angles
      const plane = new three.Mesh(
        new three.PlaneGeometry(1.9, 2.4),
        new three.MeshBasicMaterial({
          map: tex, transparent: true,
          depthWrite: false, side: three.DoubleSide,
        }));
      plane.position.z = li * 0.13;        // push nearer layers toward the viewer
      figure.add(plane);
    }

    const baseY = 1.3;
    figure.position.set(s.npc.x, baseY, s.npc.z);
    // +Z (the layer stack) faces the cell, i.e. toward the player. Heights
    // match, so the orientation is a pure yaw we can drive each frame.
    const restYaw = Math.atan2(s.face.x - s.npc.x, s.face.z - s.npc.z);
    figure.rotation.y = restYaw;
    scene.add(figure);

    const glow = new three.PointLight(theme.neon, 0.8, 5);
    glow.position.set(s.npc.x, 1.7, s.npc.z);
    scene.add(glow);

    npcs.push({
      character: ch, x: s.wall.x, z: s.wall.z,   // wall position, used for proximity
      figure, fx: s.npc.x, fz: s.npc.z, baseY,    // figure stands a little behind the wall
      restYaw, yaw: restYaw,                       // rest = facing the cell; yaw = current, smoothed
      anim: makeIdleMotion(ch.id),                 // breathing rhythm unique to this character
    });
  }
  return npcs;
}

/* ---------- idle animation ---------- */

/* deterministic per-character motion: the same character always breathes
   to the same rythm, but each one gets their own. */
function hashStr(s){
  let h = 2166136261;
  for (let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function seededRng(seed){
  return () => {
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function makeIdleMotion(id){
  const r = seededRng(hashStr(id ?? "npc"));
  const pick = (lo, hi) => lo + (hi - lo) * r();
  return {
    phase:      r() * Math.PI * 2,    // desync the breath...
    phase2:     r() * Math.PI * 2,    // ...and the sway, per character
    breatheRate: pick(1.1, 1.8),      // ~3.5-5.7s per breath
    breathAmp:   pick(0.010, 0.018),  // gentle vertical squash/stretch
    bobAmp:      pick(0.014, 0.018),  // subtle rise/fall with the breath
    swayRate:    pick(0.25, 0.65),    // slow weight-shift, slower than the breath
    yawSwayAmp:  pick(0.018, 0.030),  // a faint turn in the shoulders
    rollAmp:     pick(0.012, 0.024),  // a faint lean into the weight-shift
    maxTurn:     pick(0.6, 0.85),     // ~34-49°: how far they'll crane toward you
    track:       pick(0.62, 0.78),    // commit a bit more, but keep the gaze loose
    response:    pick(4.5, 6.0),      // higher = snappier turn toward the player
  };
}

/* shortest signed angle, wrapped to (-π, π] */
function wrapAngle(a){ return Math.atan2(Math.sin(a), Math.cos(a)); }

/* drive the in-world figures: a subtle breathing/sway idle loop plus a
   loose, lazy turn toward the player as they pass. Call once per frame
   (skip while a conversation is open, like the rest of the world). */
export function updateCharacters(M, dt){
  if (!M.npcs || !M.npcs.length) return;
  const t  = performance.now() * 0.001;
  const px = M.dolly.position.x, pz = M.dolly.position.z;

  for (const npc of M.npcs){
    const f = npc.figure, a = npc.anim;
    if (!f) continue;

    // loose facing: aim toward the player, but only crane part-way from rest
    // and ease into it, so the tracking lags and never snaps to a hard lock
    const want = Math.atan2(px - npc.fx, pz - npc.fz);
    const off  = Math.max(-a.maxTurn, Math.min(a.maxTurn, wrapAngle(want - npc.restYaw)));
    const target = npc.restYaw + off * a.track;
    npc.yaw += wrapAngle(target - npc.yaw) * (1 - Math.exp(-dt * a.response));

    // breathing + idle sway, each character to their own rhythm
    const breath = Math.sin(t * a.breatheRate + a.phase);
    const sway   = Math.sin(t * a.swayRate   + a.phase2);
    f.rotation.set(0, npc.yaw + sway * a.yawSwayAmp, sway * a.rollAmp);
    f.position.y = npc.baseY + breath * a.bobAmp;
    f.scale.set(1, 1 + breath * a.breathAmp, 1);
  }
}
