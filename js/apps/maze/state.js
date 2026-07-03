/* ============================================================
   MAZE.EXE — game state
   The RPG layer that sits on top of the maze engine: the player
   character (attributes + inventory) and the helpers dialogue
   uses to gate choices on those attributes. There is no combat
   sim — every interaction is resolved through dialogue boxes.

   Character affinity lives on the Character instances themselves
   (see characters.js) so it persists across maze levels; this
   module owns the *player* side of that relationship.

   Attributes are assigned at the character-creation screen
   (creation.js: name + a point-buy pool on top of STAT_BASE).
   This module's data is what menu.js saves and loads.
   ============================================================ */

/* SPECIAL-style attributes (Fallout flavour) */
export const STATS = [
  ["strength",     "STR"],
  ["perception",   "PER"],
  ["endurance",    "END"],
  ["charisma",     "CHA"],
  ["intelligence", "INT"],
  ["agility",      "AGI"],
  ["luck",         "LCK"],
];

export const player = {
  name: "OPERATOR",
  stats: Object.fromEntries(STATS.map(([k]) => [k, 5])),
  inventory: [],   // [{ id, name, desc }]
  tokens: 0,       // Labyrinth Tokens (LT): the world's currency, picked up in the maze
};

/* --- Labyrinth Tokens (LT) ---------------------------------------------
   LT are the currency of the Labyrinth Protocol: collected from the
   floating shapes in the maze and spent with characters for the goods
   they only part with for coin. The balance persists across levels. */
export function addTokens(n){ player.tokens += n; return player.tokens; }
export function spendTokens(n){ player.tokens = Math.max(0, player.tokens - n); return player.tokens; }
export function canAfford(n){ return player.tokens >= (n ?? 0); }

/* --- story flags + run counter ------------------------------------------
   Whole-game narrative state (see story.js for the content that reads it).
   Flags mark events that have happened ("msg-h2s", "found-data-vial") and
   gate story topics, graffiti and world items. The run counter tracks
   replays: relaunching the maze after a previous run is a new loop — the
   characters keep their memories and comment on seeing you "again from
   the top". Per-character memory lives on the Character instances. */
export const story = { flags: new Set(), run: 1, started: false };
export function setFlag(id){ story.flags.add(id); }
export function hasFlag(id){ return story.flags.has(id); }

/* back to a blank operator: creation (creation.js) then assigns the name
   and spends the point-buy pool on top of the base stats. Run/flag resets
   live with the save system (menu.js resetGame), which owns run semantics. */
export const STAT_BASE = 3;
export function resetPlayer(){
  player.name = "OPERATOR";
  for (const [k] of STATS) player.stats[k] = STAT_BASE;
  player.inventory.length = 0;
  player.tokens = 0;
}

/* does the player satisfy a dialogue requirement like
   { attr:"charisma", level:6 } ?  No requirement always passes. */
export function meetsReq(req){
  if (!req) return true;
  return (player.stats[req.attr] ?? 0) >= req.level;
}

export function addItem(item){ if (item) player.inventory.push(item); }

export function removeItem(id){
  const i = player.inventory.findIndex(it => it.id === id);
  return i < 0 ? null : player.inventory.splice(i, 1)[0];
}
