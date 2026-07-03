/* ============================================================
   MAZE.EXE — persistence (save / load / new game)
   One save slot in localStorage, plus export/import as a JSON
   file for players who want to keep or move a run. The launcher
   (maze.js initMaze) owns the buttons; this module owns the data.

   What a save carries: the player (name, stats, inventory, LT),
   the story (flags + run counter), the depth, and every character's
   whole state (affinity, pockets, memory, peer feelings, per-level
   seen topics) — enough that CONTINUE drops you back at the top of
   the saved depth with the world exactly as you left it. The level
   layout itself is not saved; mazes are disposable.

   Run semantics: NEW GAME rewinds the Protocol — flags, characters
   and player reset — but the run counter increments, so the trapped
   users greet a returning operator with déjà vu (story.js
   REPLAY_GREETS). CONTINUE restores the run as saved.
   ============================================================ */
import { player, story, STATS, STAT_BASE, resetPlayer } from "./state.js";
import { ROSTER, resetRoster } from "./characters/characters.js";

const KEY = "maze-save-v1";
const VERSION = 1;

/* localStorage can be unavailable (privacy modes) — degrade to no-op */
function storage(){
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

function snapshot(depth){
  return {
    v: VERSION,
    savedAt: new Date().toISOString(),
    depth,
    run: story.run,
    flags: [...story.flags],
    player: {
      name: player.name,
      stats: { ...player.stats },
      tokens: player.tokens,
      inventory: player.inventory.map(i => ({ ...i })),
    },
    characters: Object.fromEntries(ROSTER.map(c => [c.id, {
      affinity: c.affinity,
      inventory: c.inventory.map(i => ({ ...i })),
      lastTradeLevel: c.lastTradeLevel,
      memory: [...c.memory],
      peers: { ...c.peers },
      seen: Object.fromEntries([...c.seen].map(([lvl, ids]) => [lvl, [...ids]])),
    }])),
  };
}

const valid = d => d && d.v === VERSION && d.depth >= 1 && d.player && d.characters;

export function saveGame(depth){
  const s = storage(); if (!s) return false;
  try { s.setItem(KEY, JSON.stringify(snapshot(depth))); return true; }
  catch { return false; }
}

/* peek at the slot without touching game state (launcher labels) */
export function saveInfo(){
  const s = storage(); if (!s) return null;
  try {
    const d = JSON.parse(s.getItem(KEY));
    return valid(d) ? { depth: d.depth, run: d.run ?? 1, savedAt: d.savedAt } : null;
  } catch { return null; }
}

/* restore the slot into live state; returns the depth to resume at, or
   null if there is nothing (or nothing readable) to restore */
export function loadGame(){
  const s = storage(); if (!s) return null;
  let d;
  try { d = JSON.parse(s.getItem(KEY)); } catch { return null; }
  if (!valid(d)) return null;

  story.flags = new Set(d.flags ?? []);
  story.run = d.run ?? 1;
  story.started = true;

  player.name = d.player.name ?? "OPERATOR";
  for (const [k] of STATS) player.stats[k] = d.player.stats?.[k] ?? STAT_BASE;
  player.tokens = d.player.tokens ?? 0;
  player.inventory.length = 0;
  for (const it of d.player.inventory ?? []) player.inventory.push({ ...it });

  for (const c of ROSTER){
    const cs = d.characters[c.id];
    if (!cs){ c.reset(); continue; }              // character added since this save
    c.affinity = cs.affinity ?? 50;
    c.inventory = (cs.inventory ?? []).map(i => ({ ...i }));
    c.lastTradeLevel = cs.lastTradeLevel ?? null;
    c.memory = new Set(cs.memory ?? []);
    c.peers = { ...(cs.peers ?? {}) };
    c.seen = new Map(Object.entries(cs.seen ?? {}).map(([lvl, ids]) => [Number(lvl), new Set(ids)]));
  }
  return d.depth;
}

/* NEW GAME: the Protocol rewinds. World state resets; the run counter
   climbs past anything played or saved before, so the characters keep
   their déjà vu of you ("...back at the very top, amico?"). */
export function resetGame(){
  const prev = Math.max(story.started ? story.run : 0, saveInfo()?.run ?? 0);
  story.run = prev + 1;
  story.started = true;
  story.flags.clear();
  resetPlayer();
  resetRoster();
}

/* hand the raw save to the player as a download */
export function exportSave(){
  const s = storage();
  const raw = s && s.getItem(KEY);
  if (!raw) return false;
  let depth = 0;
  try { depth = JSON.parse(raw).depth ?? 0; } catch {}
  const url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `labyrinth-protocol-depth${String(depth).padStart(2, "0")}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

/* accept a previously exported file into the slot (validated first) */
export async function importSave(file){
  if (!file) return false;
  try {
    const d = JSON.parse(await file.text());
    if (!valid(d)) return false;
    const s = storage(); if (!s) return false;
    s.setItem(KEY, JSON.stringify(d));
    return true;
  } catch { return false; }
}
