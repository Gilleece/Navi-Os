/* ============================================================
   MAZE.EXE — characters
   A single reusable Character class, instantiated and populated
   per character. Each character carries their own affinity toward
   the player (0..100, persists across levels), a per-level dialogue
   tree whose tone shifts with that affinity, a description, a
   procedurally-drawn portrait, and an inventory they can offer
   from through dialogue.

   This module also handles spawning: every character appears on
   every level at a random spot, except those flagged
   `firstLevelNearStart` (Zit) who are guaranteed within the first
   five squares on level 1.
   ============================================================ */
import { cellCenter, bfsDistances, solidSides } from "./generator.js";

/* affinity buckets -> tone key used to pick dialogue flavour */
const TONES = [
  [20,  "hostile"],
  [40,  "wary"],
  [60,  "neutral"],
  [80,  "friendly"],
  [100, "warm"],
];

export class Character {
  constructor(def){
    this.id          = def.id;
    this.name        = def.name;
    this.description = def.description;
    this.color       = def.color ?? 0x46ff8e;
    this.affinity    = def.affinity ?? 50;          // 0..100, mutated by dialogue, persists
    this.met         = new Set();                    // ids of one-time affinity choices already taken
    this.inventory   = (def.inventory ?? []).map(i => ({ ...i }));
    this.portrait    = def.portrait;                // (ctx, w, h) => void
    this._dialogue   = def.dialogue;                // (ctx) => rootNode
    this.firstLevelNearStart = !!def.firstLevelNearStart;
  }

  like(delta){ this.affinity = Math.max(0, Math.min(100, this.affinity + delta)); }

  get tone(){ return (TONES.find(([max]) => this.affinity <= max) ?? TONES.at(-1))[1]; }

  /* remove an item from this character's pockets (when they give it away) */
  takeItem(id){
    const i = this.inventory.findIndex(it => it.id === id);
    return i < 0 ? null : this.inventory.splice(i, 1)[0];
  }

  /* the dialogue tree root for this maze level, flavoured by affinity */
  dialogueFor(depth, player){
    return this._dialogue({ depth, player, affinity: this.affinity, tone: this.tone, character: this });
  }
}

/* ---------- Zit: a small, sneaky, very Italian fixer ---------- */

function drawZit(g, w, h){
  g.clearRect(0, 0, w, h);
  const cx = w / 2;

  // ambient glow
  const grd = g.createRadialGradient(cx, h*0.55, 12, cx, h*0.55, w*0.62);
  grd.addColorStop(0, "rgba(70,255,142,.20)");
  grd.addColorStop(1, "rgba(70,255,142,0)");
  g.fillStyle = grd; g.fillRect(0, 0, w, h);

  const fill = "#0c2b1a";
  g.lineJoin = "round"; g.lineCap = "round";
  g.strokeStyle = "#46ff8e"; g.lineWidth = 3;

  // hunched torso — rounded back on the left, belly leaning forward
  g.fillStyle = fill;
  g.beginPath();
  g.moveTo(cx-58, h*0.96);
  g.bezierCurveTo(cx-82, h*0.62, cx-58, h*0.50, cx-18, h*0.47);
  g.bezierCurveTo(cx+48, h*0.47, cx+72, h*0.72, cx+58, h*0.96);
  g.closePath(); g.fill(); g.stroke();

  // head, tilted forward
  const hx = cx + 12, hy = h*0.32, hr = w*0.16;
  g.beginPath(); g.ellipse(hx, hy, hr*0.9, hr, 0, 0, Math.PI*2);
  g.fillStyle = fill; g.fill(); g.stroke();

  // flat cap (coppola) with a little brim
  g.beginPath();
  g.moveTo(hx-hr*1.05, hy-hr*0.45);
  g.quadraticCurveTo(hx-hr*0.1, hy-hr*1.5, hx+hr*1.0, hy-hr*0.75);
  g.quadraticCurveTo(hx+hr*1.7, hy-hr*0.6, hx+hr*1.25, hy-hr*0.2);
  g.quadraticCurveTo(hx, hy-hr*0.5, hx-hr*1.05, hy-hr*0.45);
  g.closePath(); g.fillStyle = fill; g.fill(); g.stroke();

  // sly, narrowed eyes
  g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(hx-hr*0.45, hy-hr*0.05); g.lineTo(hx-hr*0.08, hy+hr*0.04); g.stroke();
  g.beginPath(); g.moveTo(hx+hr*0.18, hy-hr*0.02); g.lineTo(hx+hr*0.5,  hy+hr*0.06); g.stroke();

  // sneaky grin
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(hx-hr*0.35, hy+hr*0.5);
  g.quadraticCurveTo(hx+hr*0.1, hy+hr*0.82, hx+hr*0.6, hy+hr*0.38); g.stroke();

  // big curled mustache
  g.lineWidth = 4.5;
  g.beginPath();
  g.moveTo(hx+hr*0.12, hy+hr*0.52);
  g.quadraticCurveTo(hx-hr*0.55, hy+hr*0.6, hx-hr*0.62, hy+hr*0.18);
  g.moveTo(hx+hr*0.12, hy+hr*0.52);
  g.quadraticCurveTo(hx+hr*0.75, hy+hr*0.6, hx+hr*0.82, hy+hr*0.18);
  g.stroke();

  // clasped, rubbing hands out in front
  g.lineWidth = 3; g.fillStyle = fill;
  const px = cx + 16, py = h*0.68;
  g.beginPath(); g.ellipse(px-11, py,   w*0.075, w*0.05, -0.35, 0, Math.PI*2); g.fill(); g.stroke();
  g.beginPath(); g.ellipse(px+13, py+5, w*0.075, w*0.05,  0.35, 0, Math.PI*2); g.fill(); g.stroke();
}

/* leaf helper — an end-of-conversation node */
const end = text => ({ text, choices: [] });
const bye = () => end("Ciao, ciao, amico... *Zit melts back into the static, rubbing his hands.*");

function zitDialogue(ctx){
  const { depth, tone, character } = ctx;

  const greet = {
    hostile:  "Eh. You again. Mamma mia... whaddya want?",
    wary:     "Mmm. Ciao. I am-a watching you, amico.",
    neutral:  "Ahh, ciao ciao! A little mouse, lost in the wires, eh?",
    friendly: "Amico! Bellissimo to see your face again!",
    warm:     "Mio caro amico! Come, come — Zit, he has been waiting for you!",
  }[tone];

  // an offer of whatever Zit is carrying next
  const item = character.inventory[0] || null;
  const offer = item
    ? { text: `*Zit leans close, glancing around.* For you, my friend — take this, a '${item.name}'. No charge... this-a time. *winks*`,
        choices: [
          { text: `Take the ${item.name}.`, effects: { give: item.id, like: +3 },
            next: end("*He presses it into your palm.* Sì! You no forget Zit was good to you, eh?") },
          { text: "No, thank you — I travel light.", effects: { like: +1 },
            next: end("Heh. A careful one. Smart. Zit respects this.") },
        ] }
    : end("*He pats his empty pockets.* Ahh, Zit has nothing more for you today. Next-a time, eh!");

  // hubs (links filled in after the tree exists, so they can loop back)
  const ask = {
    text: "The others down here? Pfft. Things in the static, wearing faces, amico. Me — Zit — I am the only honest one. *grin*",
    choices: [],
  };
  const canTrade = character.affinity >= 55;
  const trade = {
    text: canTrade
      ? "*He rubs his hands together.* For a friend, Zit always has-a the little something..."
      : "Trade? Hah! I no even know you, amico. You make Zit like you first, eh?",
    choices: canTrade ? [{ text: "Let's see it, then.", next: offer }] : [],
  };

  const root = {
    text: `${greet} Down here on level ${depth}, eh, is dangerous. But Zit, he knows-a things.`,
    choices: [
      { text: "Well met, friend. What is this place?", effects: { like: +4, once: "greet" },
        next: { text: "Heh — 'friend', he says. I like-a this one. This is the in-between, amico — the maze that is not a maze. Capisce?",
                choices: [
                  { text: "Tell me about the others down here.", next: ask },
                  { text: "Got anything to trade?",              next: trade },
                  { text: "I should go.",                        next: bye() },
                ] } },
      { text: "[Charisma] A man of your style must run this whole place.",
        req: { attr: "charisma", level: 6 }, effects: { like: +10, once: "charm" },
        next: { text: "*He puffs up, twirling the mustache.* Ahhh, you have-a the eye! Nothing it moves in these wires without Zit knowing. For you... maybe a little something.",
                choices: [
                  { text: "I'd be honoured.",                   next: offer },
                  { text: "Tell me about the others down here.", next: ask },
                  { text: "I should go.",                        next: bye() },
                ] } },
      { text: "[Intelligence] This is a recursive lattice — where does it terminate?",
        req: { attr: "intelligence", level: 6 },
        next: { text: "*Zit blinks, then cackles.* Clever mouse! It 'terminates' at the broken wall — where everything it falls into the static. Follow the glow, amico. And watch your step, eh.",
                choices: [
                  { text: "Got anything to trade?", next: trade },
                  { text: "My thanks.", effects: { like: +2, once: "int-thanks" }, next: bye() },
                ] } },
      { text: "Got anything to trade?", next: trade },
      { text: "Get out of my way, little man.", effects: { like: -12, once: "rude" },
        next: end("*The smile stays, but his eyes go cold.* Tsk. So rude. Va bene — get lost. See if Zit, he helps you then.") },
      { text: "(Leave)", next: bye() },
    ],
  };

  // wire the hubs back into the tree
  ask.choices = [
    { text: "Got anything to trade?", next: trade },
    { text: "Back.",                  next: root },
    { text: "(Leave)",                next: bye() },
  ];
  trade.choices.push(
    canTrade ? { text: "Maybe later.", next: root }
             : { text: "Back.",        next: root });
  trade.choices.push({ text: "(Leave)", next: bye() });

  return root;
}

const ZIT = new Character({
  id:   "zit",
  name: "ZIT",
  description: "A small, hunched Italian fixer who haunts the wired. Forever rubbing his hands and smiling like he knows something you don't. Honest, he swears.",
  color: 0x46ff8e,
  firstLevelNearStart: true,
  portrait: drawZit,
  dialogue: zitDialogue,
  inventory: [
    { id: "sausage", name: "Cured Sausage", desc: "Greasy, fragrant, faintly glowing. 'Real Italiano,' Zit insists." },
    { id: "coin",    name: "Brass Token",   desc: "A worn token stamped with a maze. Opens... something, somewhere." },
    { id: "charm",   name: "Tin Cornicello",desc: "A little tin horn against the evil eye. Zit swears by it." },
  ],
});

/* the full roster (just Zit for now) */
export const ROSTER = [ZIT];

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
  return { character, cell, side, wall: W.wall, npc: W.npc };
}

/* choose where each character appears this level. Returns
   [{ character, cell, side, wall, npc }]. */
export function spawnCharacters(cells, goalCell, depth, cfg){
  const { N, CELL } = cfg;
  const dist = bfsDistances(cells);
  const used = new Set();

  // valid host cells: not the start, not the goal, and with a wall to host a window
  const candidates = [];
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++){
      if (x === 0 && y === 0) continue;
      if (x === goalCell.x && y === goalCell.y) continue;
      if (solidSides(cells[y][x]).length === 0) continue;
      candidates.push({ x, y });
    }

  const spawns = [];
  for (const ch of ROSTER){
    let pool = candidates.filter(c => !used.has(c.x + "," + c.y));
    if (depth === 1 && ch.firstLevelNearStart){
      const near = pool.filter(c => dist[c.y][c.x] >= 1 && dist[c.y][c.x] <= 5);
      if (near.length) pool = near;   // guarantee within the first five squares
    }
    if (!pool.length) continue;

    const cell  = pool[Math.random()*pool.length | 0];
    used.add(cell.x + "," + cell.y);
    const sides = solidSides(cells[cell.y][cell.x]);
    const side  = sides[Math.random()*sides.length | 0];
    spawns.push(makeSpawn(ch, cell, side, CELL));
  }
  return spawns;
}

/* build the in-world figures (camera-facing sprites behind their
   windows) and return the interaction records the loop polls:
   [{ character, x, z }] where (x,z) is the windowed wall. */
export function buildCharacters(three, scene, spawns){
  const npcs = [];
  for (const s of spawns){
    const cnv = document.createElement("canvas");
    cnv.width = 256; cnv.height = 320;
    s.character.portrait(cnv.getContext("2d"), cnv.width, cnv.height);

    const sprite = new three.Sprite(new three.SpriteMaterial({
      map: new three.CanvasTexture(cnv), transparent: true,
    }));
    sprite.scale.set(1.9, 2.4, 1);
    sprite.position.set(s.npc.x, 1.3, s.npc.z);
    scene.add(sprite);

    // a soft glow so the figure reads through the window glass
    const glow = new three.PointLight(s.character.color, 0.8, 5);
    glow.position.set(s.npc.x, 1.7, s.npc.z);
    scene.add(glow);

    npcs.push({ character: s.character, x: s.wall.x, z: s.wall.z });
  }
  return npcs;
}
