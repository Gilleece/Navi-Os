/* ============================================================
   MAZE.EXE — story engine
   The narrative layer over the dialogue system: per-depth story
   beats, the message-relay quest chain between the trapped users,
   loop-aware lines for the deep zone (depth 31+) and for replays
   (run 2+), the one-of-a-kind world items that appear in the maze
   at authored depths, and the graffiti the previous users left on
   the walls. Global flags + the run counter live in state.js;
   per-character memory lives on the Character instances.

   This module is pure data + injection helpers. It never imports
   characters.js (characters.js imports US), so anything needing a
   Character instance gets it via ctx or a parameter.

   How it plugs in:
     • Character.dialogueFor() calls applyStory(hub, ctx): story
       topics are injected at the top of the hub — dialogue.js pins
       and highlights anything with topic.story — and greetings get
       the loop/replay decoration.
     • maze.js calls applyLevelEvents(depth, roster) on each level
       build — one-time world mutations (Scally stocking the mayo).
     • entities.js calls spawnableItems(depth) to scatter the
       one-of-a-kind pickups; collecting one sets found-<id>.
     • environment.js calls graffitiPool(depth) for the wall scrawls
       (some only appear once certain flags are set).
     • maze.js calls pendingBeats(character, depth, player) — the
       NARRATIVE GATE: the exit ring lies flat on the floor until
       every highlighted (story) topic on the level is exhausted,
       the deep-zone loop conversations included. A topic can opt
       out with `gate: false`.

   Topic shape matches the character files (see scally.js), plus:
     story: true   pinned to the top of the hub + highlighted
     once:  true   retired for the WHOLE game once selected (the
                   default `seen` retirement is per level only)
   and `effects` gain two new keys (applied by dialogue.js):
     flag:  "id" | ["id", ...]             set global story flags
     peers: [{ of, toward, delta, meet }]  shift how character `of`
                                           feels about `toward`
   ============================================================ */
import { hasFlag, setFlag, story } from "./state.js";

export const LOOP_DEPTH = 31;   // where the palette starts re-running old looks

/* tiny deterministic pick — same depth always gets the same variant */
function pickSeeded(arr, seed){
  if (!arr || !arr.length) return null;
  let a = (seed * 0x9E3779B1) >>> 0;
  a ^= a >>> 15; a = Math.imul(a, 0x2C1B3C6D); a ^= a >>> 12;
  return arr[(a >>> 0) % arr.length];
}

/* ---------- one-of-a-kind world items ----------------------------------
   The items STORY.md §4 left "TBD — need a source". Each appears in the
   maze as a pale solid pickup (entities.js) from its depth onward until
   found, then never again — they are one-of-a-kind. (`mayo` is not here:
   Scally stocks it, see applyLevelEvents.) `kind` picks the pickup shape. */
export const WORLD_ITEMS = [
  { id: "relic-shard",   name: "Relic Shard",    depth: 4, kind: "shard",
    desc: "A splinter of the old Protocol, still warm to the touch. Scally pays for these." },
  { id: "data-vial",     name: "Data Vial",      depth: 8, kind: "vial",
    desc: "Somebody's yesterday, distilled into a little bottle. More than one person down here wants it." },
  { id: "saints-finger", name: "Saint's Finger", depth: 9, kind: "bone",
    desc: "A small dry bone the old saints left behind. It feels like it is watching you back." },
];

export function spawnableItems(depth){
  return WORLD_ITEMS.filter(w => depth >= w.depth && !hasFlag(`found-${w.id}`));
}

/* ---------- level-entry world events ------------------------------------
   One-time mutations applied when a level is built (before characters
   spawn), guarded by flags so they only ever run once per game. */
export function applyLevelEvents(depth, roster){
  // depth 6+: the impossible jar — Scally's coat acquires REAL mayonnaise,
  // priced for the brokering play (buy it, gift it to Homiss, profit)
  if (depth >= 6 && !hasFlag("mayo-stocked")){
    const scally = roster.find(c => c.id === "scally");
    if (scally){
      scally.inventory.push({ id: "mayo", name: "Jar of Mayonnaise", price: 35,
        desc: "Sealed, pristine, impossible. Where did he even GET this?" });
      setFlag("mayo-stocked");
    }
  }
}

/* ---------- story topics -------------------------------------------------
   Every authored story beat, in one list. `char` picks the speaker,
   `depth` (optional) is the depth it becomes available FROM — beats are
   never missable, they wait until the player next talks — and
   `available(ctx)` (optional) gates on flags/state. `make(ctx)` returns
   a topic in the normal hub format. Keep beats in sync with STORY.md §6.

   The relay chain (Homiss ⇄ Scally, via the player) is the first
   implementation of the plot's central go-between loop: each delivery
   moves the peer affinities that likePeer() was waiting for. */
const STORY_TOPICS = [

  /* -- depth 1 · Scally: the wires went dead (roots the whole chain) -- */
  { char: "scally", depth: 1, make: () => ({
      id: "quiet-wires", story: true, once: true,
      label: "*He keeps glancing at the walls.* Something wrong?",
      effects: { like: +2, flag: "heard-isolation" },
      node: { text: "Eh... you noticed, amico? Used to be, Scally could talk through the walls. All of us — the trapped ones — chatter chatter, all day, window to window. Then— *he snaps his fingers* —silenzio. Somebody pulled the plug on us. Now is just me, the static, and whoever walks the halls. You find the others down there, you tell them Scally is still here, eh? You tell them." } }) },

  /* -- relay 1 · Homiss: pass Scally's word along, get a message back -- */
  { char: "homiss",
    available: () => hasFlag("heard-isolation") && !hasFlag("msg-h2s"),
    make: () => ({
      id: "relay-1", story: true, once: true,
      label: "Scally says to tell you he's still here.",
      effects: { like: +2, flag: "msg-h2s", peers: [{ of: "homiss", toward: "scally", delta: +2 }] },
      node: { text: "*He stops dead on the strings.* ...Scally? Ye've seen the wee man about? *Something complicated crosses his face — relief, mostly.* I haven't heard from him in... *he counts nothing on his fingers* ...I don't rightly know how long. Phones must be down, or— aye. The phones. That'll be it. *He leans in close.* Here — do us a favour. Tell him: 'the answer to his question is yes.' He'll know the one. An' don't be askin' me what it means, ye nosy article. *He's smiling, but he means it.*" } }) },

  /* -- relay 2 · Scally: deliver the answer, carry one back --
     (min depth 2/3 on these paces the chain to one step per level; without
      it the narrative gate would demand the whole exchange on depth 1) */
  { char: "scally", depth: 2,
    available: () => hasFlag("msg-h2s") && !hasFlag("msg-h2s-done"),
    make: () => ({
      id: "relay-2", story: true, once: true,
      label: "Homiss says: 'the answer to your question is yes.'",
      effects: { like: +3, flag: ["msg-h2s-done", "msg-s2h"], peers: [{ of: "scally", toward: "homiss", delta: +4 }] },
      node: { text: "*The hands stop rubbing. For once, the whole little man goes still.* ...he said yes? *He turns away; when he turns back the grin is different — smaller. Real.* Va bene. Va bene. Grazie, amico — you are a good little courier, you know this? *He presses something invisible flat against his chest, like he is filing it away.* You see him again, you tell him from Scally: 'then hold on to it. Even down here.' Exact words, eh? Exact." } }) },

  /* -- relay 3 · Homiss: the reply lands, and the denial cracks a hair -- */
  { char: "homiss", depth: 3,
    available: () => hasFlag("msg-s2h") && !hasFlag("msg-s2h-done"),
    make: () => ({
      id: "relay-3", story: true, once: true,
      label: "Scally says: 'hold on to it. Even down here.'",
      effects: { like: +3, flag: "msg-s2h-done", peers: [{ of: "homiss", toward: "scally", delta: +3 }] },
      node: { text: "*He takes that in like a long note decaying.* ...aye. Aye, that's— *a laugh that's half a sniff* —that's the wee man alright. *He straightens up and pats the bass like it's a shoulder.* D'ye know what, I will. I will so. *A beat. Quieter:* ...he asked me once — before the phones went, or whatever it is — whether I thought there was anythin' worth stayin' honest for, down— *he catches himself* ...AROUND here. That was the question. Now don't be lookin' at me like that. I've a set to practice." } }) },

  /* -- depth 4 · Scally: how the maze sheds items (relic-shard appears) -- */
  { char: "scally", depth: 4, make: () => ({
      id: "shard-hint", story: true, once: true,
      label: "Anything valuable down here besides tokens?",
      effects: { like: +1 },
      node: { text: "Eh, funny you should ask! The maze, sometimes she sheds. Little pieces of the old Protocol — relic shards, data vials, stranger things the first users left behind in the walls. You see something glowing down here that is NOT a token, amico — you pick it up. And then you bring it to Scally, who pays like a gentleman. *rubs hands* Like a GENTLEMAN." } }) },

  /* -- depth 5 · Scally: the hidden user (STORY.md §3) -- */
  { char: "scally", depth: 5,
    available: () => hasFlag("heard-isolation"),
    make: () => ({
      id: "hidden-user", story: true, once: true,
      label: "So who cut the wires on you all?",
      effects: { like: +2, flag: "warned-hidden" },
      node: { text: "*His voice drops so low you have to lean in.* Nobody knows, amico. But the others, they feel it too — there is somebody ELSE in here. Another user. Hiding. Not stuck behind a window like us... walking. Like you. *His eyes flick past your shoulder.* Maybe they cut the wires. Maybe worse. So Scally tells you once, for free: down here, somebody says they are trapped — you count their walls, eh? Count. The. Walls." } }) },

  /* -- depth 6 · Scally: advertises the impossible jar -- */
  { char: "scally", depth: 6,
    available: ctx => ctx.character.inventory.some(i => i.id === "mayo"),
    make: () => ({
      id: "impossible-stock", story: true, once: true,
      label: "*He's grinning even more than usual.* What?",
      effects: { like: +1, flag: "mayo-known" },
      node: { text: "Amico! Fortuna! Something impossible, she fell into Scally's pockets. *He opens his coat a crack: a glass jar, pale and full.* Mayonnaise. REAL mayonnaise. Now — Scally thinks you know somebody who would give his ARM for this. *He snaps the coat shut.* For you? A price most reasonable. You ask Scally to trade, eh?" } }) },

  /* -- depth 7 · Homiss: he used to hear the others (needs the relay done) -- */
  { char: "homiss", depth: 7,
    available: () => hasFlag("msg-s2h-done"),
    make: () => ({
      id: "pipes", story: true, once: true,
      label: "Do you ever hear the others around here?",
      effects: { like: +2, peers: [{ of: "homiss", toward: "scally", delta: +2 }] },
      node: { text: "*The plucking slows.* ...used to. Voices, like, comin' through the— *he gestures vaguely* —the pipes. Aul' buildin', sound carries. Scally givin' out about somethin', somebody laughin', somebody cryin' the odd time. Grand company, in its way. *A long pause.* Stopped a while back. All of it, the one night. Just the hum now. *He snaps back onto a grin.* Sure everyone's busy, that's all that is. Busy busy busy." } }) },

  /* -- depth 8 · Scally: what a data vial is (the vial appears here) -- */
  { char: "scally", depth: 8, make: () => ({
      id: "vial-rumor", story: true, once: true,
      label: "What's a data vial, exactly?",
      effects: { like: +1 },
      node: { text: "*His eyes gleam.* Concentrated Protocol, amico. Memory, distilled — a little bottle of somebody's yesterday. Down this deep, sometimes one works itself loose out of the walls. Me, I pay handsome for it. *A beat.* ...I am not the only one down here who wants one, eh. But nobody pays like Scally pays." } }) },

  /* -- depth 9 · Homiss: clocks the saint's finger (it appears here) -- */
  { char: "homiss", depth: 9,
    available: ctx => ctx.player.inventory.some(i => i.id === "saints-finger"),
    make: () => ({
      id: "bone-snap", story: true, once: true,
      label: "*He's staring at your pocket.*",
      effects: { like: +1 },
      node: { text: "*He nods at what you're carrying.* ...is that a knuckle? *He holds up his plectrum next to it.* Snap, wha'. Fella sold me this one swore blind it came off a saint. I'd say he was coddin' me. *He looks at yours a moment longer than he means to.* ...I'd NEARLY say it. If I was you I'd not go wavin' that around — there's a man up the way would sell his own ma for the like of it." } }) },

  /* -- depth 10 · the capstone pair -- */
  { char: "scally", depth: 10, make: () => ({
      id: "ten-deep", story: true, once: true,
      label: "Ten levels down. How deep does this place go?",
      effects: { like: +2, flag: "depth10" },
      node: { text: "*For a long moment — no grin at all.* Deeper, amico. Deeper than Scally ever went. The operators who came before you... around here is where the walls stopped writing back to them. You have seen the scribbles, eh? *He taps his temple.* Keep talking to us. The ones who stopped talking — the maze, she kept them." } }) },

  { char: "homiss", depth: 10, make: () => ({
      id: "ten-normal", story: true, once: true,
      label: "Still a grand normal day, Homiss?",
      effects: { like: +2 },
      node: { text: "*He looks at ye for a long second.* ...d'ye want the honest answer or the good answer? *Before ye can pick:* The good answer! It's a GRAND day. Tenth grand day in a row, or— however many it's been. They do blur, don't they. *He tunes a string that was already in tune.* ...ye'd tell me, wouldn't ye. If ye knew somethin' I didn't. *The grin doesn't quite make it to the eyes.* Ah, don't mind me. Ask me somethin' mad instead." } }) },
];

/* ---------- the deep zone (depth 31+) -----------------------------------
   Past depth 30 the palette re-runs earlier looks, and the characters can
   feel it. Each level appends a loop-aware line to the greeting and offers
   one loop topic — both picked deterministically by depth, so they rotate
   level to level without repeating within one. */
const LOOP_GREETS = {
  scally: [
    "*He squints at the walls like old wallpaper.* ...Scally has seen this corridor before, amico. The Protocol, she is out of new rooms — she is rerunning the old ones.",
    "*He looks left, then right, then shrugs.* A rerun, this level. You feel it too, eh? Deep enough, the maze she starts repeating herself.",
  ],
  homiss: [
    "*He's frowning at his fretboard.* ...I've played this exact note, in this exact spot, before. Fierce déjà vu today, so there is.",
    "Grand day! Again. The SAME grand day, near enough as makes no difference. ...don't be thinkin' too hard about that, wha'.",
  ],
};

const LOOP_TOPICS = {
  scally: [
    { label: "This place is repeating itself, isn't it?",
      text: "Sì. The deeper you go, the less new she has left, the Protocol. Old paint, old light, old bones — reruns, all of it. But the bottom, amico... nobody ever came back up to tell Scally what the bottom looks like. So the bottom, she is still new. Keep going." },
    { label: "Haven't we stood here before?",
      text: "*He nods, slow.* You noticed. Good. When the rooms start coming around again, is not because you are lost — is because SHE is. This deep, the maze she dreams in circles. Walk through the dream, amico. The bottom is on the other side of it." },
  ],
  homiss: [
    { label: "Have we done this before?",
      text: "*He thinks about it far too long.* ...we have, haven't we. Or one exactly like it. *A shrug that costs him somethin'.* Ah well. If it's a loop, it's a loop with you in it — an' that's a sight better than the loops before ye came along." },
    { label: "This level feels... familiar.",
      text: "D'ye know what it's like? A da capo. Back to the top of the sheet, play it again — except every time round, somethin's a wee bit off. A note bent. A wall... *he stops himself* ...ah, nothin'. Music talk. Ignore me." },
  ],
};

/* ---------- replays (run 2+) ---------------------------------------------
   Relaunching after a previous run rewinds the player to depth 1, but the
   characters keep their memories. Said once per character per run. */
const REPLAY_GREETS = {
  scally: "*He does a double-take, then laughs, low.* ...back at the very top, amico? Mamma mia. The Protocol, she rewound you. But Scally remembers everything, eh. Everything.",
  homiss: "*He blinks at ye.* Mornin'. ...again. Ye've a fresh-off-the-boat look about ye that I do NOT care for, seein' as I know yer face well.",
};

/* ---------- graffiti -----------------------------------------------------
   What the previous users scratched into the walls (rendered by
   textures.graffitiTexture, placed by environment.js). Some entries only
   join the pool once the story has caught up with them. */
export function graffitiPool(depth){
  const pool = [
    { kind: "tally" },
    { kind: "arrow" },
    { kind: "spiral" },
    { kind: "text", text: "IS ANY OF\nTHIS REAL" },
    { kind: "text", text: "I WAS\nSOMEBODY" },
    { kind: "text", text: "DON'T FEED\nTHE STATIC" },
    { kind: "text", text: "SHE KEEPS THE\nQUIET ONES" },
  ];
  if (hasFlag("warned-hidden"))
    pool.push({ kind: "text", text: "COUNT THE\nWALLS" },
              { kind: "text", text: "IT WEARS\nFACES" });
  if (depth >= LOOP_DEPTH)
    pool.push({ kind: "text", text: "YOU'VE READ\nTHIS BEFORE" },
              { kind: "text", text: "STILL HERE\nSTILL HERE\nSTILL HERE" });
  return pool;
}

/* ---------- injection (called by Character.dialogueFor) ------------------ */
function collectStoryTopics(ctx){
  const { character, depth } = ctx;
  return STORY_TOPICS
    .filter(t => t.char === character.id
              && depth >= (t.depth ?? 1)
              && (!t.available || t.available(ctx)))
    .map(t => t.make(ctx));
}

/* the level's rotating deep-zone conversation (depth 31+), or null */
function loopTopicFor(ctx){
  if (ctx.depth < LOOP_DEPTH) return null;
  const t = pickSeeded(LOOP_TOPICS[ctx.character.id], ctx.depth);
  return t ? { id: `loop-${ctx.depth}`, story: true, label: t.label, node: { text: t.text } } : null;
}

/* every highlighted (story) topic this character offers at this depth —
   the single source both the hub injection and the narrative gate read,
   so what's pinned amber and what holds the ring down can never drift */
function storyTopicsFor(ctx){
  const topics = collectStoryTopics(ctx);
  const loop = loopTopicFor(ctx);
  if (loop) topics.push(loop);
  return topics;
}

/* ---------- the narrative gate -------------------------------------------
   The highlighted topics this character hasn't delivered yet on this level
   — the ones the exit ring waits for. That is ALL story topics, the
   deep-zone loop conversation included; a topic opts out with
   `gate: false`. maze.js polls this to lay the ring flat and to tell the
   player who still has words for them. */
export function pendingBeats(character, depth, player){
  const ctx = { depth, player, affinity: character.affinity, tone: character.tone,
                character, run: story.run };
  return storyTopicsFor(ctx).filter(t =>
    t.gate !== false
    && !(t.once && character.recalls(`topic-${t.id}`))
    && !character.hasSeen(depth, t.id));
}

export function applyStory(hub, ctx){
  const { character, depth, run } = ctx;
  const topics = storyTopicsFor(ctx);

  if (depth >= LOOP_DEPTH){
    const g = pickSeeded(LOOP_GREETS[character.id], depth + 7);
    if (g) hub.greet += ` ${g}`;
  }

  if (run > 1 && depth === 1 && !character.recalls(`rerun-${run}`)){
    character.remember(`rerun-${run}`);
    const g = REPLAY_GREETS[character.id];
    if (g) hub.greet += ` ${g}`;
  }

  if (topics.length) hub.topics = [...topics, ...hub.topics];
  return hub;
}
