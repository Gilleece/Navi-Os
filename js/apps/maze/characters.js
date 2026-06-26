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
   `firstLevelNearStart` (Scally) who are guaranteed within the first
   five squares on level 1.
   ============================================================ */
import { cellCenter, bfsDistances, exteriorSides } from "./generator.js";

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

export class Character {
  constructor(def){
    this.id          = def.id;
    this.name        = def.name;
    this.description = def.description;
    this.color       = def.color ?? 0x46ff8e;
    this.affinity    = def.affinity ?? 50;          // 0..100, mutated by dialogue, persists across levels (new game = 50)
    this.seen        = new Map();                    // level -> Set of exhausted topic ids (conversations are fresh each level)
    this.wants       = def.wants ?? [];              // item ids this character covets — gifting one thaws a hostile mood
    this.inventory   = (def.inventory ?? []).map(i => ({ ...i }));
    this.portrait    = def.portrait;                // (ctx, w, h, mood) => void  — flat portrait
    this.drawLayer   = def.drawLayer ?? null;       // (ctx, w, h, mood, layer) => void  — one depth slice
    this.layerCount  = def.layerCount ?? 1;         // number of depth slices for the 2.5D figure
    this._dialogue   = def.dialogue;                // (ctx) => rootNode
    this.firstLevelNearStart = !!def.firstLevelNearStart;
  }

  like(delta){ this.affinity = Math.max(0, Math.min(100, this.affinity + delta)); }

  get tone(){ return (TONES.find(([max]) => this.affinity <= max) ?? TONES.at(-1))[1]; }

  /* relationship label shown next to the name in dialogue */
  get standing(){ return (STANDINGS.find(([max]) => this.affinity <= max) ?? STANDINGS.at(-1))[1]; }

  /* too cold for normal conversation — needs a gift to thaw */
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

  /* the dialogue tree root for this maze level, flavoured by affinity */
  dialogueFor(depth, player){
    return this._dialogue({ depth, player, affinity: this.affinity, tone: this.tone, character: this });
  }
}

/* ---------- Scally: a small, sneaky, very Italian fixer ----------
   Drawn from composable parts so the same figure can be rendered as
   one flat portrait (for the dialogue box) or split across depth
   layers (for the 2.5D in-world figure), and so the face can switch
   between moods: "neutral" | "happy" | "angry" | "sad". */

const FILL = "#0c2b1a", LINE = "#46ff8e";

function scallyGlow(g, w, h){
  const grd = g.createRadialGradient(w/2, h*0.55, 12, w/2, h*0.55, w*0.62);
  grd.addColorStop(0, "rgba(70,255,142,.20)");
  grd.addColorStop(1, "rgba(70,255,142,0)");
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
}

function scallyBody(g, w, h){
  g.lineJoin = "round"; g.lineCap = "round";
  g.strokeStyle = LINE; g.lineWidth = 3; g.fillStyle = FILL;
  const cx = w / 2;
  g.beginPath();
  g.moveTo(cx-58, h*0.96);
  g.bezierCurveTo(cx-82, h*0.62, cx-58, h*0.50, cx-18, h*0.47);
  g.bezierCurveTo(cx+48, h*0.47, cx+72, h*0.72, cx+58, h*0.96);
  g.closePath(); g.fill(); g.stroke();
}

function scallyMustache(g, hx, hy, hr, curl){   // curl > 0 = tips up (cheerful), < 0 = droop
  g.strokeStyle = LINE; g.lineCap = "round"; g.lineWidth = 4.5;
  const base = hy + hr*0.52, tip = hy + hr*(0.52 - 0.34*curl);
  g.beginPath();
  g.moveTo(hx+hr*0.12, base);
  g.quadraticCurveTo(hx-hr*0.55, hy+hr*0.6, hx-hr*0.62, tip);
  g.moveTo(hx+hr*0.12, base);
  g.quadraticCurveTo(hx+hr*0.75, hy+hr*0.6, hx+hr*0.82, tip);
  g.stroke();
}

function scallyFace(g, hx, hy, hr, mood){
  g.strokeStyle = LINE; g.lineCap = "round"; g.lineJoin = "round";
  if (mood === "happy"){
    g.lineWidth = 2.5;                                   // arched, smiling eyes ^ ^
    g.beginPath(); g.moveTo(hx-hr*0.46, hy+hr*0.02); g.quadraticCurveTo(hx-hr*0.26, hy-hr*0.22, hx-hr*0.06, hy+hr*0.02); g.stroke();
    g.beginPath(); g.moveTo(hx+hr*0.16, hy+hr*0.02); g.quadraticCurveTo(hx+hr*0.36, hy-hr*0.22, hx+hr*0.56, hy+hr*0.02); g.stroke();
    g.lineWidth = 3;                                     // big grin
    g.beginPath(); g.moveTo(hx-hr*0.4, hy+hr*0.42); g.quadraticCurveTo(hx+hr*0.1, hy+hr*0.92, hx+hr*0.6, hy+hr*0.42); g.stroke();
    scallyMustache(g, hx, hy, hr, 1);
  } else if (mood === "angry"){
    g.lineWidth = 3;                                     // brows furrowed down-and-in
    g.beginPath(); g.moveTo(hx-hr*0.52, hy-hr*0.28); g.lineTo(hx-hr*0.1, hy-hr*0.04); g.stroke();
    g.beginPath(); g.moveTo(hx+hr*0.58, hy-hr*0.28); g.lineTo(hx+hr*0.16, hy-hr*0.04); g.stroke();
    g.lineWidth = 2.5;                                   // glaring slits
    g.beginPath(); g.moveTo(hx-hr*0.42, hy+hr*0.08); g.lineTo(hx-hr*0.1, hy+hr*0.1); g.stroke();
    g.beginPath(); g.moveTo(hx+hr*0.16, hy+hr*0.1); g.lineTo(hx+hr*0.46, hy+hr*0.08); g.stroke();
    g.lineWidth = 3;                                     // bared grimace
    g.beginPath(); g.moveTo(hx-hr*0.34, hy+hr*0.62); g.quadraticCurveTo(hx+hr*0.1, hy+hr*0.34, hx+hr*0.54, hy+hr*0.64); g.stroke();
    scallyMustache(g, hx, hy, hr, -0.5);
  } else if (mood === "sad"){
    g.lineWidth = 2.5;                                   // brows raised at the inner corners
    g.beginPath(); g.moveTo(hx-hr*0.46, hy-hr*0.08); g.lineTo(hx-hr*0.1, hy-hr*0.3); g.stroke();
    g.beginPath(); g.moveTo(hx+hr*0.5, hy-hr*0.08); g.lineTo(hx+hr*0.14, hy-hr*0.3); g.stroke();
    g.beginPath(); g.arc(hx-hr*0.27, hy+hr*0.08, hr*0.07, 0, Math.PI*2); g.stroke();   // droopy eyes
    g.beginPath(); g.arc(hx+hr*0.3,  hy+hr*0.08, hr*0.07, 0, Math.PI*2); g.stroke();
    g.lineWidth = 3;                                     // downturned mouth
    g.beginPath(); g.moveTo(hx-hr*0.3, hy+hr*0.64); g.quadraticCurveTo(hx+hr*0.1, hy+hr*0.38, hx+hr*0.5, hy+hr*0.64); g.stroke();
    scallyMustache(g, hx, hy, hr, -0.7);
  } else {                                               // neutral — sly and sneaky
    g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(hx-hr*0.45, hy-hr*0.05); g.lineTo(hx-hr*0.08, hy+hr*0.04); g.stroke();
    g.beginPath(); g.moveTo(hx+hr*0.18, hy-hr*0.02); g.lineTo(hx+hr*0.5,  hy+hr*0.06); g.stroke();
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(hx-hr*0.35, hy+hr*0.5); g.quadraticCurveTo(hx+hr*0.1, hy+hr*0.82, hx+hr*0.6, hy+hr*0.38); g.stroke();
    scallyMustache(g, hx, hy, hr, 0.2);
  }
}

function scallyHead(g, w, h, mood){
  g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = LINE; g.fillStyle = FILL;
  const hx = w/2 + 12, hy = h*0.32, hr = w*0.16;
  g.lineWidth = 3;
  g.beginPath(); g.ellipse(hx, hy, hr*0.9, hr, 0, 0, Math.PI*2); g.fill(); g.stroke();   // head
  g.beginPath();                                                                         // flat cap
  g.moveTo(hx-hr*1.05, hy-hr*0.45);
  g.quadraticCurveTo(hx-hr*0.1, hy-hr*1.5, hx+hr*1.0, hy-hr*0.75);
  g.quadraticCurveTo(hx+hr*1.7, hy-hr*0.6, hx+hr*1.25, hy-hr*0.2);
  g.quadraticCurveTo(hx, hy-hr*0.5, hx-hr*1.05, hy-hr*0.45);
  g.closePath(); g.fill(); g.stroke();
  scallyFace(g, hx, hy, hr, mood);
}

function scallyHands(g, w, h){
  g.lineJoin = "round"; g.strokeStyle = LINE; g.lineWidth = 3; g.fillStyle = FILL;
  const px = w/2 + 16, py = h*0.68;
  g.beginPath(); g.ellipse(px-11, py,   w*0.075, w*0.05, -0.35, 0, Math.PI*2); g.fill(); g.stroke();
  g.beginPath(); g.ellipse(px+13, py+5, w*0.075, w*0.05,  0.35, 0, Math.PI*2); g.fill(); g.stroke();
}

/* full flat portrait — used by the dialogue box */
function drawScally(g, w, h, mood = "neutral"){
  g.clearRect(0, 0, w, h);
  scallyGlow(g, w, h);
  scallyBody(g, w, h);
  scallyHead(g, w, h, mood);
  scallyHands(g, w, h);
}

/* one depth layer of the figure — used for the 2.5D in-world build.
   0 = body (back), 1 = head/face (mid), 2 = hands (front, nearest). */
function drawScallyLayer(g, w, h, mood, layer){
  g.clearRect(0, 0, w, h);
  if (layer === 0){ scallyGlow(g, w, h); scallyBody(g, w, h); }
  else if (layer === 1){ scallyHead(g, w, h, mood); }
  else { scallyHands(g, w, h); }
}

/* Scally's dialogue is a hub of topics. The dialogue engine shows the
   available topics as choices; once a topic is used it is recorded
   in `character.seen` and never offered again, and when nothing
   engageable is left the hub falls back to the `exhausted` line.

   A topic: { id, label, req?, effects?, oneShot?, available?, node }
     - req       gate on a player attribute (shown disabled if unmet)
     - effects   applied once, when the topic is selected (e.g. like)
     - oneShot   default true; false topics persist (driven by state)
     - available optional predicate for dynamic topics (e.g. trade)
     - node      the line(s) Scally speaks; an object, or a function that
                 returns one (use a function when it depends on state) */
function scallyDialogue(ctx){
  const { depth, character } = ctx;

  const greet = {
    hostile:  "Eh. You again. Mamma mia... whaddya want?",
    wary:     "Mmm. Ciao. I am-a watching you, amico.",
    neutral:  "Ahh, ciao ciao! A little mouse, lost in the wires, eh?",
    friendly: "Amico! Bellissimo to see your face again!",
    warm:     "Mio caro amico! Come, come — Scally, he has been waiting for you!",
  }[character.tone];

  return {
    hub: true,
    level: depth,                 // conversations are tracked (and exhausted) per level
    greet: `${greet} Down here on level ${depth}, eh, is dangerous. But Scally, he knows-a things.`,
    exhausted: "Eh, amico — we have-a talked enough for now. Go, go! The maze, she is waiting. *Scally rubs his hands and melts back into the static.*",
    hostile: "*He turns his back, muttering in Italian.* Pah! I got nothing for you. You bring Scally something nice, eh — then maybe we talk again.",
    topics: [
      { id: "place", label: "Well met, friend — what is this place?", effects: { like: +4 },
        node: { text: "Heh — 'friend', he says. I like-a this one. This is the in-between, amico — the maze that is not a maze. You walk, you talk to Scally, you no get lost. Capisce?" } },

      { id: "others", label: "Who else wanders down here?",
        node: { text: "The others? Pfft. Things in the static, wearing faces, amico. Me — Scally — I am the only honest one. *grin*" } },

      { id: "charm", label: "*Flatter him* A man of your style must run this whole place.",
        req: { attr: "charisma", level: 6 }, effects: { like: +10 },
        node: { text: "*He puffs up, twirling the mustache.* Ahhh, you have-a the eye! Nothing it moves in these wires without Scally knowing. We are friends now, eh? And friends — friends help each other." } },

      { id: "smart", label: "This is a recursive lattice — where does it terminate?",
        req: { attr: "intelligence", level: 6 }, effects: { like: +2 },
        node: { text: "*Scally blinks, then cackles.* Clever mouse! It 'terminates' at the broken wall — where everything it falls into the static. Follow the glow, amico. And watch your step, eh." } },

      { id: "rude", label: "Get out of my way, little man.", effects: { like: -12 },
        node: { text: "*The smile stays, but his eyes go cold.* Tsk. So rude. Va bene." } },

      { id: "trade", label: "Got anything to trade?", oneShot: false,
        available: () => character.affinity >= 55 && character.inventory.length > 0,
        node: () => {
          const item = character.inventory[0];
          return {
            text: `*Scally leans close, glancing around.* For you, my friend — take this, a '${item.name}'. No charge... this-a time. *winks*`,
            choices: [
              { text: `Take the ${item.name}.`, effects: { give: item.id, like: +3 } },
              { text: "No, thank you — I travel light." },
            ],
          };
        } },
    ],
  };
}

const SCALLY = new Character({
  id:   "scally",
  name: "SCALLY",
  description: "A small, hunched Italian fixer who haunts the wired. Forever rubbing his hands and smiling like he knows something you don't. Honest, he swears.",
  color: 0x46ff8e,
  firstLevelNearStart: true,
  portrait: drawScally,
  drawLayer: drawScallyLayer,
  layerCount: 3,
  dialogue: scallyDialogue,
  inventory: [
    { id: "sausage", name: "Cured Sausage", desc: "Greasy, fragrant, faintly glowing. 'Real Italiano,' Scally insists." },
    { id: "coin",    name: "Brass Token",   desc: "A worn token stamped with a maze. Opens... something, somewhere." },
    { id: "charm",   name: "Tin Cornicello",desc: "A little tin horn against the evil eye. Scally swears by it." },
  ],
});

/* the full roster (just Scally for now) */
export const ROSTER = [SCALLY];

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
  // outside the grid — the only walls whose far side the player can never
  // reach, so the window can't be flanked from the character's side
  const candidates = [];
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++){
      if (x === 0 && y === 0) continue;
      if (x === goalCell.x && y === goalCell.y) continue;
      if (exteriorSides(cells, x, y).length === 0) continue;
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
   (body / head / hands) facing the cell, giving real parallax — so
   in VR stereo, and when moving in 2D, the character reads as solid
   rather than a flat decal. */
export function buildCharacters(three, scene, spawns){
  const npcs = [];
  for (const s of spawns){
    const ch = s.character;
    const figure = new three.Group();
    const layers = ch.layerCount;

    for (let li = 0; li < layers; li++){
      const cnv = document.createElement("canvas");
      cnv.width = 256; cnv.height = 320;
      const g = cnv.getContext("2d");
      if (ch.drawLayer) ch.drawLayer(g, cnv.width, cnv.height, "neutral", li);
      else              ch.portrait(g, cnv.width, cnv.height, "neutral");

      const plane = new three.Mesh(
        new three.PlaneGeometry(1.9, 2.4),
        new three.MeshBasicMaterial({
          map: new three.CanvasTexture(cnv), transparent: true,
          depthWrite: false, side: three.DoubleSide,
        }));
      plane.position.z = li * 0.13;        // push nearer layers toward the viewer
      figure.add(plane);
    }

    figure.position.set(s.npc.x, 1.3, s.npc.z);
    figure.lookAt(s.face.x, 1.3, s.face.z);  // front (+Z, and the layer stack) faces the player
    scene.add(figure);

    const glow = new three.PointLight(ch.color, 0.8, 5);
    glow.position.set(s.npc.x, 1.7, s.npc.z);
    scene.add(glow);

    npcs.push({ character: ch, x: s.wall.x, z: s.wall.z });
  }
  return npcs;
}
