/* ============================================================
   MAZE.EXE — game state
   The RPG layer that sits on top of the maze engine: the player
   character (attributes + inventory) and the helpers dialogue
   uses to gate choices on those attributes. There is no combat
   sim — every interaction is resolved through dialogue boxes.

   Character affinity lives on the Character instances themselves
   (see characters.js) so it persists across maze levels; this
   module owns the *player* side of that relationship.

   Attribute values are randomised for now; character creation
   will replace rollStats() later. This is also the data the
   menu (menu.js) will eventually save and load.
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
};

/* randomise the player's attributes (placeholder for character
   creation). Values land in 3..8 — enough spread that skill-gated
   dialogue choices sometimes pass and sometimes fail. */
export function rollStats(){
  for (const [k] of STATS) player.stats[k] = 3 + (Math.random()*6 | 0);
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
