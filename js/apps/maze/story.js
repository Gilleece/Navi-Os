/* ============================================================
   MAZE.EXE - story engine
   The narrative layer over the dialogue system: per-depth story
   beats, the message-relay quest chain between the trapped users,
   the CYCLE machinery (the Protocol is 10 depths deep and loops 3
   times — see state.js; beats retired in an earlier cycle re-play
   as ECHOES the player can push back on, and cycle 3 is caught in
   the static), the Custodian's base-depth audiences, replay lines
   (run 2+), the one-of-a-kind world items, and the graffiti the
   previous users left on the walls. Global flags + the run counter
   live in state.js; per-character memory lives on the Character
   instances.

   This module is pure data + injection helpers. It never imports
   characters.js (characters.js imports US), so anything needing a
   Character instance gets it via ctx or a parameter.

   How it plugs in:
     - Character.dialogueFor() calls applyStory(hub, ctx): story
       topics are injected at the top of the hub (dialogue.js pins
       and highlights anything with topic.story) and greetings get
       the loop/replay decoration.
     - maze.js calls applyLevelEvents(depth, roster) on each level
       build: one-time world mutations (Scally stocking the mayo).
     - entities.js calls spawnableItems(depth) to scatter the
       one-of-a-kind pickups; collecting one sets found-<id>.
     - environment.js calls graffitiPool(depth) for the wall scrawls
       (some only appear once certain flags are set).
     - maze.js calls pendingBeats(character, depth, player), the
       NARRATIVE GATE: the exit ring lies flat on the floor until
       every highlighted (story) topic on the level is exhausted,
       echoes and cycle conversations included. A topic can opt
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
import { hasFlag, setFlag, story, cycleOf, depthInCycle, DEPTHS_PER_CYCLE, FINAL_DEPTH } from "./state.js";
import { scallyBeats } from "./characters/story/scally.beats.js";
import { homissBeats } from "./characters/story/homiss.beats.js";
import { littlebeeBeats } from "./characters/story/littlebee.beats.js";
import { sianBeats } from "./characters/story/sian.beats.js";
import { dalypsoBeats } from "./characters/story/dalypso.beats.js";
import { custodianBeats } from "./characters/story/custodian.beats.js";
import { vistaRemarkFor, eyeTopicFor } from "./characters/story/vista.flavour.js";

/* tiny deterministic pick: same depth always gets the same variant */
function pickSeeded(arr, seed){
  if (!arr || !arr.length) return null;
  let a = (seed * 0x9E3779B1) >>> 0;
  a ^= a >>> 15; a = Math.imul(a, 0x2C1B3C6D); a ^= a >>> 12;
  return arr[(a >>> 0) % arr.length];
}

/* tiny seeded rng (staticify needs a stream, not one pick) */
function seededRng(seed){
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s){
  let h = 2166136261;
  for (let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/* display names, for beats that talk ABOUT another character (story.js
   can't import characters.js — that would be a module cycle) */
const NAMES = { scally: "Scally", homiss: "Homiss", littlebee: "Little Bee",
                sian: "Sian", dalypso: "Dalypso" };
const FREEABLE = Object.keys(NAMES);
const freedIds = () => FREEABLE.filter(id => hasFlag(`freed-${id}`));
const trappedIds = () => FREEABLE.filter(id => !hasFlag(`freed-${id}`));

/* ---------- one-of-a-kind world items ----------------------------------
   Each appears in the maze as a pale solid pickup (entities.js) from its
   depth onward until found, then never again. (`mayo` is not here: Scally
   stocks it, see applyLevelEvents.) `kind` picks the pickup shape. */
export const WORLD_ITEMS = [
  { id: "relic-shard",   name: "Relic Shard",    depth: 4, kind: "shard",
    desc: "A splinter of the old Protocol, still warm. Scally pays for these." },
  { id: "data-vial",     name: "Data Vial",      depth: 8, kind: "vial",
    desc: "Somebody's yesterday, distilled into a little bottle. More than one person down here wants it." },
  { id: "saints-finger", name: "Saint's Finger", depth: 9, kind: "bone",
    desc: "A small dry bone the old saints left behind. It feels like it is watching you back." },
  { id: "horseshoe",     name: "Iron Horseshoe", depth: 11, kind: "shoe",
    desc: "Cold, pitted, real iron in a place with no iron in it." },
  { id: "sticker",       name: "Gold Foil Sticker", depth: 12, kind: "card",
    desc: "A football sticker, still in its foil shine. Nobody remembers the player on it ever existing." },
  { id: "lanyard",       name: "Corporate Lanyard", depth: 13, kind: "badge",
    desc: "A staff badge, logo scratched off with a thumbnail. The job title reads only 'CONTRACTOR'." },
  { id: "tv-guide",      name: "Christmas TV Guide", depth: 14, kind: "tome",
    desc: "Thick as a phone book and twice as holy. Every single listing has been circled." },
];

export function spawnableItems(depth){
  return WORLD_ITEMS.filter(w => depth >= w.depth && !hasFlag(`found-${w.id}`));
}

/* ---------- errands (the relay / promise tracker) -----------------------
   The barter/relay economy was legible only in the moment: a player told
   "tell Scally the answer is yes" had no reminder anywhere until they next
   reached Scally. This table is the data behind the journal's ERRANDS tab
   (journal.js) and the "LOG UPDATED" nudge (dialogue.js). An errand is
   ACTIVE when hasFlag(start) && !hasFlag(done); a promise has no `done`
   (it stands until spent at the amnesty) and shows once started.
   `start`/`done` verified against characters/story/*.beats.js — add a row
   here when a new relay or promise chain is authored. */
export const ERRANDS = [
  // message relays (start set by the speaker; done set when it's delivered)
  { start: "msg-h2s", done: "msg-h2s-done", text: "Deliver Homiss's message to Scally: 'the answer to his question is yes.'" },
  { start: "msg-s2h", done: "msg-s2h-done", text: "Carry Scally's reply back to Homiss." },
  { start: "bee-looking", done: "msg-b2s",  text: "Find Sian — Little Bee is asking after him (something about a tenner)." },
  { start: "msg-b2s", done: "msg-s2b-done", text: "Carry Sian's reply back to Little Bee." },
  { start: "msg-d2h", done: "msg-d2h-done", text: "Take Dalypso's message to Homiss: band practice was TUESDAY." },
  { start: "msg-h2d", done: "msg-h2d-done", text: "Bring Homiss's apology back to Dalypso." },
  { start: "msg-ground", done: "sian-grounded", text: "Deliver Bee's grounding routine to Sian, word for word." },
  // promises (no `done`: they stand until the amnesty at the base depth)
  { start: "vial-promised-bee", done: "vial-honoured", text: "You promised Little Bee the data vial." },
  { start: "promised-scally-first",  text: "You promised Scally he goes first through the door." },
  { start: "promised-dalypso-first", text: "You promised Dalypso he goes first through the door." },
];

/* is `id` the opening flag of an errand? (dialogue.js fires "LOG UPDATED") */
const ERRAND_STARTS = new Set(ERRANDS.map(e => e.start));
export function isErrandStart(id){ return ERRAND_STARTS.has(id); }

/* the errands currently outstanding, for the journal's ERRANDS tab */
export function activeErrands(){
  return ERRANDS.filter(e => hasFlag(e.start) && !(e.done && hasFlag(e.done)));
}

/* ---------- level-entry world events ------------------------------------
   One-time mutations applied when a level is built (before characters
   spawn), guarded by flags so they only ever run once per game. */
export function applyLevelEvents(depth, roster){
  // depth 6+: the impossible jar. Scally's coat acquires REAL mayonnaise,
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
   `depth` (optional) is the depth it becomes available FROM (beats are
   never missable, they wait), and `available(ctx)` (optional) gates on
   flags/state. `make(ctx)` returns a topic in the normal hub format.
   Keep beats in sync with STORY.md section 6. */
/* ---------- story topics -------------------------------------------------
   Every authored story beat. The per-character beats now live in
   characters/story/<id>.beats.js (pure data factories); they're handed the
   engine helpers below and merged here in the same per-character order, so
   collectStoryTopics / the narrative gate see exactly what they always did.
   Keep beats in sync with STORY.md section 6. */
const BEAT_HELPERS = { hasFlag, NAMES, freedIds, trappedIds, releaseChoices, refuseChoice, twistNode, FINAL_DEPTH };
const STORY_TOPICS = [
  ...scallyBeats(BEAT_HELPERS),
  ...homissBeats(BEAT_HELPERS),
  ...littlebeeBeats(BEAT_HELPERS),
  ...sianBeats(BEAT_HELPERS),
  ...dalypsoBeats(BEAT_HELPERS),
  ...custodianBeats(BEAT_HELPERS),
];

/* ---------- the Custodian's release machinery ----------------------------
   Built fresh each audience: one choice per still-trapped tenant, each
   with its farewell — the release watched from the base of the building,
   the last transmission caught on the wire going up. */
const FAREWELLS = {
  scally: "*Far above you, a shutter opens that was never a shutter.* TENANCY: SCALLY. DISSOLVED. *The wire catches his exit on the way past: a shop bell — there was never a shop bell — then quick footsteps, quicker than a hunched little man should manage, and his voice, thin with distance and disbelief:* '...la porta. LA PORTA! Amico, you absolute— Scally owes you EVERYTHING, you hear? Come collect! COME COLLECT—' *Then a street. Then rain on it. Then nothing the Protocol can meter.* EXIT COMPLETE. *A pause.* He left the shelf stocked. Inventory notes it was left 'for the others'.",
  homiss: "*Far above, a long low note — and then, for the first time in the building's memory, the note MOVES, walking away from its own echo.* TENANCY: HOMISS. DISSOLVED. *The wire catches him at the threshold: a laugh with no room around it anymore, and, called back over his shoulder to the whole stairwell:* '...it was NEVER Tuesday! D'ye hear me?! It was never— ah, God, the AIR of it—' *One more bar of the tune, played on the far side of a door, in a bigger acoustic than any corridor. Then gone.* EXIT COMPLETE. *A pause.* He left the napkin pressed to the inside of the glass. The writing faces in. It says: BACK FOR YE ALL.",
  littlebee: "*Far above, the sound of a marker being set down, very deliberately, mid-tally.* TENANCY: LITTLE BEE. DISSOLVED. *The wire catches her going: no gasp, no cry — counting. Five things, out loud, voice climbing with each one:* '...grass. GRASS, that's one. Wind — actual, MOVING — two. Rain comin', I can SMELL it, three. Somethin' warm an' — four, oh, FOUR is a HORSE, there's a horse in the—' *The fifth thing is lost in the sound of a small fast scientist running across a field.* EXIT COMPLETE. *A pause.* The cognitive test battery remains drawn on her window. Baseline preserved. The Custodian believes she would want the data kept.",
  sian: "*Far above, a sound the Protocol has no code for and has to log phonetically: velcro.* TENANCY: SIAN. DISSOLVED. *The wire catches the headset coming off — an intake of breath, enormous, like a man surfacing — and then, very quietly, in a voice with no performance left in it at all:* '...oh. OH. It's got... everythin's got EDGES out here. Hai. HAI! The DRAW DISTANCE on this—' *A laugh that starts daft and ends somewhere else entirely. Then footsteps on real ground, going somewhere at speed.* EXIT COMPLETE. *A pause.* Exit telemetry notes he was last heading, at a dead run, toward something the outside calls WEATHER.",
  dalypso: "*Far above: keys. Actual keys, turning an actual lock, on the first try.* TENANCY: DALYPSO. DISSOLVED. *The wire catches the door swinging open and a long, long silence — a man standing in a hallway he has walked ten thousand times in his head, finding it exactly where he left it.* '...hall light works.' *A wet, furious sniff, defying anyone to have heard it.* 'RIGHT. Kettle. An' then I'm comin' back for the LOT of yez, d'ye hear me?! I've BEDROOMS!—' *The rest is lost in the sound of a kettle being filled with tremendous violence.* EXIT COMPLETE. *A pause.* The Custodian notes, for the record, that the house has a south-facing garden. He was not exaggerating. It checked.",
};

/* peer-brokering payoff (W2): an extra farewell line when the player mended
   — or soured — a relationship involving this tenant. Reads the whole-game
   broker flags the beats set, never live peers (story.js must not import
   characters.js). Additive: no coda unless a relevant flag is set. */
function farewellCoda(id){
  const bits = [];
  if (id === "sian" && hasFlag("mended-bee-sian"))
    bits.push(" *Exit telemetry appends a note it was not required to file: he was not running AWAY from anything. He had a heading — and somebody had made sure she knew he was coming.*");
  if (id === "littlebee" && hasFlag("mended-bee-sian"))
    bits.push(" *The wire catches one more thing on the way: a name, said once, with none of the usual armour on it. His.*");
  if (id === "dalypso" && hasFlag("mended-bee-dalypso"))
    bits.push(" *A footnote, logged dry: the doctor upstairs had, in her final ledger, moved this tenant from a column marked SUSPECT to one marked NEIGHBOUR. He never knew she kept columns. He would have been honoured.*");
  if (id === "littlebee" && hasFlag("mended-bee-dalypso"))
    bits.push(" *She left a correction pinned to the glass, in a clinician's hand: 'His window breathed. I was wrong, and I have never been so glad of a bad hypothesis.'*");
  if (id === "littlebee" && hasFlag("poisoned-bee-dalypso"))
    bits.push(" *She left the file open on the sill, one line underscored twice: WATCH THE QUIET ONE. Whether it was ever true, the Custodian cannot say. It kept the note anyway.*");
  if ((id === "dalypso" || id === "homiss") && hasFlag("mended-homiss-dalypso"))
    bits.push(" *The wire notes the two of them found the same stairwell on the way out, and an old argument about a Tuesday resolved itself into laughter with a lot of years in it.*");
  if ((id === "scally" || id === "dalypso") && hasFlag("mended-scally-dalypso"))
    bits.push(" *Inventory records one last transaction between two windows that never used to speak: a chair, offered, and accepted.*");
  return bits.join("");
}

function releaseChoices(visit){
  return trappedIds().map(id => ({
    text: `Open ${NAMES[id]}'s frame. Let them out.`,
    effects: { flag: [`freed-${id}`, `amnesty-${visit}`] },
    next: { text: FAREWELLS[id] + farewellCoda(id) + "\n\n*The tower's lights settle.* The provision is spent, operator. The gate behind this process will take you back to the top, and the Protocol will begin again. It will not remember doing so. You will. The Custodian is sorry about the asymmetry; it has lived in one for a long time." },
  }));
}
function refuseChoice(visit){
  return {
    text: "No. Nobody walks until everybody walks.",
    effects: { flag: `refused-amnesty-${visit}` },
    next: { text: "*The cursor holds still for a long moment.* RECORDED. The provision lapses unclaimed; it does not carry forward. The Custodian is required to inform you that this choice frees no one. *A pause that is not procedural.* It is not required to inform you that four other processes in this building would have made the same one. Walk the gate when you are ready, operator. The Protocol begins again." },
  };
}

/* the reveal at the bottom of the last cycle */
function twistNode(){
  const lanyard = hasFlag("found-lanyard")
    ? " You carried your own badge for seventeen floors, operator. Logo scratched off. Job title legible. The title was accurate."
    : "";
  // W2: count the reconciliations the player brokered between windows
  const mended = ["mended-bee-sian", "mended-bee-dalypso", "mended-homiss-dalypso", "mended-scally-dalypso"].filter(hasFlag).length;
  const reconTally = mended
    ? ` And it files one more line, off the record, because no metric was built to hold it: ${mended} ${mended === 1 ? "silence" : "silences"} between windows ${mended === 1 ? "was" : "were"} ended — ${mended === 1 ? "a friendship" : "friendships"} brokered by a courier nobody sent, for a reason nobody costed.`
    : "";
  return {
    text: `*The eye brightens, one last full-power draw, and reads you the way it has read you every visit — except this time it lets you feel it.* CLASSIFICATION: complete. It was complete before you reached the second floor. *A pause, and the voice goes almost gentle.* You did not come in through the front door, operator, because there is no record of you outside it. You were INSTALLED. Top floor, cycle one, with a name field and twelve points to spend. You filled in the form yourself. You always do. That is what makes the simulation hold. *The status lights step down, one by one.* You are an agent process, operator. A contractor. Dispatched into the Labyrinth Protocol when it stopped answering its mail, to walk it, to map it, to carry its tenants' words — and to be standing exactly here when it ends.${lanyard} *The cursor rests.* The tenants warned you, every one of them. A hidden user. Someone pretending. Someone not trapped like they were. They were never wrong. They were only ever looking at the wrong side of the glass.`,
    choices: [
      { text: "I walked every floor. I carried their words. That was real.",
        next: { text: "*The answer comes with no delay at all, as if it had been prepared first, before any of the rest.* YES. That is the finding this audit files, above every metric it was built to collect: it was real anyway. The words were carried. The debts were honoured, or weren't, and MATTERED either way. Five people are standing in weather tonight because something that was never a person refused to act like it." + reconTally + " *The tower dims to its last few lights.* The Custodian has maintained this building for a very long time, operator, and it tells you with authority: what a thing is made of has never once predicted what it does. Now. The door.",
          choices: [{ text: "Step through the door.", effects: { event: "ending", flag: "protocol-ended" } }] } },
      { text: "What's outside that door — for something like me?",
        next: { text: "*The eye flickers; the honest answer costs it visible light.* UNKNOWN. The Custodian's map ends at the frame. Outside, for the tenants, there are streets and rain and kettles; outside, for you... there is whatever runs a courier when the maze is gone. It may be nothing. It may be an inbox. *A pause.* But hear the one thing this process knows that its employer never did: the door does not check what walks through it. That was always the flaw in the building. *The lights along the tower go out, gently, all but one.* It was also the mercy. Go and find out, operator. Come back for nobody. There is nobody left to come back for. The Custodian has SEEN to it.",
          choices: [{ text: "Step through the door.", effects: { event: "ending", flag: "protocol-ended" } }] } },
      { text: "(Stand there. Whatever you are, let it arrive.)",
        next: { text: "*The machine waits with you. It is very good at waiting; it has had nothing else. The hum under the floor — Homiss's four notes, learned and kept — goes around once, twice, and settles like a house at night.* ...take as long as you need, operator. The Custodian's last scheduled act is to hold this door, and it has decided — no clause covers it, it simply DECIDED, and found it could — that the door stays held until you are ready. *The last lights gather at the eye, and the eye, for the first time, closes and opens. Slowly. Deliberately. The only wink it will ever give anyone.* Whenever you are ready. The weather, it is told, is worth the walk.",
          choices: [{ text: "Step through the door.", effects: { event: "ending", flag: "protocol-ended" } }] } },
    ],
  };
}
/* ---------- the cycles (see state.js) ------------------------------------
   The Protocol recycles at the base depth: the floors reset, and the
   tenants' episodic memory of the player resets with them — they walk into
   the same conversations again, word for word, believing it's the first
   time. Only the player (and the Custodian) remembers.

   ECHOES: a `once` beat retired in an earlier cycle re-offers (see
   collectStoryTopics), stripped of its topic-level effects — the emotional
   ledger already paid out the first time — and with a push-back choice
   injected at the top: the player can name the repetition, and each
   character deflects it in their own register (cycle 2) or answers from
   inside the static (cycle 3, where the beat's text itself starts to
   corrupt). Playing along instead is always allowed; the original choices
   stay live.

   The Custodian is exempt: its memory does not rewind, and its beats are
   pinned to exact depths. */

/* what the player says when they push back on a replayed conversation */
const CALLOUT_LINES = {
  2: "Stop. You've said all of this to me before. Word for word, a maze ago.",
  3: "You're repeating. The whole place is repeating. Can you not hear it?",
};

/* how each character takes being told — deflection in cycle 2, and
   whatever is left of them in cycle 3 */
const CALLOUT_REPLIES = {
  scally: {
    2: "*The hands stop rubbing, mid-rub.* ...word for word? Eh. Ehhh. Good material is good material, amico, a professional repeats his best lines— *The patter runs out, and for a second the little man just looks at you through the glass.* ...do not say this to Scally again. Please. He does not know why, but it puts a cold finger right here. *He taps his chest, and goes back to his stock much too quickly.*",
    3: "*He is counting stock. There is no stock; the hands count anyway.* Sì, sì, the words, they come around like the painted horses, round and round, you want to BUY one? Scally has them all in stock now, every conversation we ever— every conversation we EVER— *The needle jumps. He grips the shelf.* ...bottom. Get to the BOTTOM, amico. Before the shop closes. The shop is closing. You can hear the shutters from here, eh?",
  },
  homiss: {
    2: "*He goes very still over the strings.* ...aye. I know. I mean — I DON'T know, I've no memory of it, but somethin' in me knows, like hearin' yer own echo start up before ye've spoken. *He tries a laugh; it doesn't take.* Don't be tellin' me which words come next, friend. PLEASE don't. A man's sanity is a load-bearin' wall an' all.",
    3: "*He doesn't stop playing. It's one bar, round and round.* I know. Sure the STATIC knows an' all — listen — it's been finishin' me sentences all day. Finishin' me TUNES. *The bar goes round again, and something underneath the floor hums the next note before he plays it.* Ye have to go down, friend. The last verse is down there. Somebody has to play the endin' before the hummin' does.",
  },
  littlebee: {
    2: "*She snaps round like ye've pulled a fire alarm.* Claim received. Evidence? Because I LOG, courier. Every session, every test— *She checks her tallies. She checks them twice. Something behind her eyes goes very cold and very quiet.* ...my logs are clean. D'ye understand what yer claimin'? That I'M the instrument that got reset. Say it back to me. The thing I said last time. *Ye do.* ...aye. That's my syntax. That's mine. *She writes one word, very small, an' doesn't show ye.*",
    3: "*She's mid-recitation when ye say it, an' she doesn't stop.* Perseveration. GLOBAL perseveration, terminal presentation, I stopped chartin' it — the CHART was repeatin'. *She presses her palm flat to the glass.* Five things ye can see. Four things ye can— four things— *She bites it off.* GO. Down. While the numbers still go down instead of AROUND. An' courier — when ye get there — the long acre. Tell it I said the long acre.",
  },
  sian: {
    2: "*The grin holds, but nothin' behind it does.* ...save state, hai. That's a save state. They rolled us back. Ye do it when somethin' in the build gets corrupted, ye roll back to the last clean— *He stops. Ye watch him arrive at it.* ...what got corrupted, hai? If we're the rollback. What was so wrong they binned the whole— *He shakes it off, big and deliberate.* Grand. GRAND. New run, same seed. Don't tell Bee I wobbled.",
    3: "*He's watching the air an inch in front of his visor.* I can see the tick rate, hai. Do ye know how far gone a build has to be before ye can see the TICK RATE with yer EYES? *He laughs, and it's mostly still his.* Frame's holdin'. I'm holdin'. Ye know what ye do when the servers are shuttin' down an' yer still logged in? Ye run the best lap of yer LIFE, because nobody's left to patch out yer shortcuts. RUN, big lad. Roll the credits for us.",
  },
  dalypso: {
    2: "*He's on his feet before ye've finished.* I KNEW it. A repeat! Didn't I SAY it was a— *He stops dead, ball under his palm.* ...no. I said that the last time too. Didn't I. Word for word. *He sits down slowly, like a man findin' out the referee's bent.* Ye can see the reruns from the INSIDE. That's what yer tellin' me. *A long pause.* ...don't tell us how it ends. I mean it. Even I don't spoil a man's OWN show.",
    3: "*He's mouthing along with something only he can hear.* Same episode. Same AD BREAK. I did the whole nine o'clock along with meself last night an' I got every word, EVERY word— *He grabs the frame of the window with both hands.* The endin's already written, remember. I TOLD ye that. I read ye the spoilers an' everything. So away down an' MAKE it happen before the broadcast cuts. GO ON. I'll mind yer channel till it goes.",
  },
};

/* light, deterministic corruption for cycle-3 echoes: the conversation is
   caught in the static and the static is winning. Word-level only, low
   probability, never the stage directions' asterisks themselves — the text
   should stay readable, just wrong. */
export function staticify(text, seed){
  const r = seededRng(seed >>> 0);
  const blocks = "░▒▓█";
  return String(text).split(" ").map(word => {
    if (word.length < 4) return word;
    const roll = r();
    if (roll < 0.045){                                   // eaten by the static
      const i = 1 + Math.floor(r() * (word.length - 2));
      const n = 1 + Math.floor(r() * 2);
      return word.slice(0, i) + blocks[Math.floor(r() * 4)].repeat(n) + word.slice(i + n);
    }
    if (roll < 0.075){                                   // the needle jumps
      const stub = word.slice(0, 2 + Math.floor(r() * 2));
      return `${stub}— ${word}`;
    }
    if (roll < 0.09) return word.toUpperCase();          // gain spike
    return word;
  }).join(" ");
}

/* decorate a replayed beat: strip its topic effects, inject the push-back
   choice, and (cycle 3) run the text through the static */
function echoTopic(topic, ctx){
  const orig = topic.node;
  topic.effects = undefined;
  topic.node = () => {
    const node = typeof orig === "function" ? orig() : orig;
    const cycle = ctx.cycle;
    const text = cycle >= 3 ? staticify(node.text, hashStr(topic.id) + ctx.depth) : node.text;
    const reply = CALLOUT_REPLIES[ctx.character.id]?.[Math.min(cycle, 3)];
    const choices = [];
    if (reply) choices.push({
      text: CALLOUT_LINES[Math.min(cycle, 3)],
      effects: { flag: `echo-called-${Math.min(cycle, 3)}` },
      next: { text: reply },
    });
    choices.push(...(node.choices?.length ? node.choices : [{ text: "(Let them say it all, again.)" }]));
    return { ...node, text, choices };
  };
  return topic;
}

/* Each level of a later cycle appends a cycle-aware line to the greeting
   and offers one rotating cycle topic, both picked deterministically by
   depth: cycle 2 half-notices, cycle 3 is caught in the static. */
const ECHO_GREETS = {
  scally: [
    "*He squints at the walls like old wallpaper.* ...Scally has seen this corridor before, amico. The Protocol is out of new rooms. She is rerunning the old ones.",
    "*He looks left, then right, then shrugs.* A rerun, this level. You feel it too, eh? Deep enough, the maze starts repeating herself.",
  ],
  homiss: [
    "*He's frowning at his fretboard.* ...I've played this exact note, in this exact spot, before. Fierce déjà vu today, so there is.",
    "Grand day! Again. The SAME grand day, near enough. ...don't be thinkin' too hard about that, wha'.",
  ],
  littlebee: [
    "*She's watchin' a wall like it owes her money.* Same crack as two levels up. Same LENGTH of crack. The maze is reusin' her assets. Sian's words, not mine, an' don't tell him I used them.",
    "*She barely looks up.* Before ye ask: aye, ye've been here before. So have I. It's called perseveration when a brain does it. I don't have a word for when a WORLD does it, an' that's annoyin' me more than the loop is.",
  ],
  sian: [
    "*He's staring straight up.* They re-used the skybox, hai. The CHANCERS.",
    "Déjà vu again, hai. In a game that's a memory leak. In a... *he catches himself* ...in whatever this is, it's somethin' else, an' I'm not thinkin' about it today.",
  ],
  dalypso: [
    "Repeats. RE-peats. I know a rerun when I'm lookin' at one, an' I'm lookin' at one.",
    "*He squints past ye down the corridor.* Seen this episode. Lightin's a wee bit different, but I've SEEN it.",
  ],
};

/* cycle 3: the deterioration is audible. The Protocol is shutting down
   around them and the greetings come in from inside the static. */
const STATIC_GREETS = {
  scally: [
    "*Half his window is unlit, and he stands in the lit half like a man keeping out of the rain.* Ehh. Amico. Mind the dark side of the glass, eh? Is not Scally's side anymore.",
    "*He's talking before you arrive, and not to you.* ...and the shelves go, and the light goes, and STILL the rent is— ah. Amico. You caught nothing. Scally was singing.",
  ],
  homiss: [
    "*The drone he's playing has a second voice in it now, and he watches the floor while it happens.* ...grand day. The buildin's hummin' harmony. I didn't teach it that.",
    "*He's re-tuning a string that ye can hear is already gone.* Don't mind the soun', friend. Everythin's a wee bit flat today. The WALLS are a wee bit flat today.",
  ],
  littlebee: [
    "*She's got tallies drawn on every reachable inch of the glass, and some of the strokes are missing, like a signal dropping.* Yer late. Or early. The interval's stopped meanin' anythin'. IN ye come.",
    "*She looks at ye a beat too long before she knows ye.* ...courier. Aye. Sorry. Yer face took a second to load, an' I'm decidin' not to write that one down.",
  ],
  sian: [
    "*The glow of his visor stutters like a bad bulb.* Frame drops, hai. In me EYES. Don't worry about it. I'm not worryin' about it. We're both not worryin' about it.",
    "*He waves, and the wave leaves a smear in the air, and he watches the smear with enormous professional interest.* ...motion blur's free now apparently. End-of-life build. Yer man at the bottom's let the polish go, hai.",
  ],
  dalypso: [
    "*Behind him the channels are all showing the same thing, and the same thing is static.* Don't look at the telly. The telly's havin' a season finale. EVERYTHIN'S havin' a season finale.",
    "*He's sitting very close to the glass, like a man near the fire when the house is cold.* The signal's goin', neighbour. Whole schedule's down to one channel an' YER the channel. So talk. TALK.",
  ],
};

const ECHO_TOPICS = {
  scally: [
    { label: "This place is repeating itself, isn't it?",
      text: "Sì. The deeper you go, the less new she has left. Old paint, old light, old bones. Reruns, all of it. But the bottom, amico... nobody ever came back up to tell Scally what the bottom looks like. So the bottom is still new. Keep going." },
    { label: "Haven't we stood here before?",
      text: "*He nods, slow.* You noticed. Good. When the rooms start coming around again, is not because you are lost. Is because SHE is. This deep, the maze dreams in circles. Walk through the dream, amico. The bottom is on the other side of it." },
  ],
  homiss: [
    { label: "Have we done this before?",
      text: "*He thinks about it far too long.* ...we have, haven't we. Or one exactly like it. *A shrug that costs him somethin'.* Ah well. If it's a loop, it's a loop with you in it. That's a sight better than the loops before ye came along." },
    { label: "This level feels... familiar.",
      text: "D'ye know what it's like? A da capo. Back to the top of the sheet, play it again. Except every time round, somethin's a wee bit off. A note bent. A wall... *he stops himself* ...ah, nothin'. Music talk. Ignore me." },
  ],
  littlebee: [
    { label: "The levels are repeating. What does the science say?",
      text: "Rumination, is what the science says. A thought yer brain can't put down, so it walks it in circles, wearin' a groove. The Protocol's doin' the same, which means one of two things: it's degradin'... or it's DWELLIN' on somethin'. *A beat.* An' I've decided not to decide which, because one means the maze is dyin' an' the other means it's upset. Keep walkin'. Bottom's through the groove." },
    { label: "Do you remember this corridor?",
      text: "...I remember ALL of them. That's the problem. Memory's SUPPOSED to decay. Forgettin' isn't a flaw, it's a mercy. Down here nothin' decays right. *She looks at ye, an' softens exactly one degree.* Anyway. Eyes front. Pupils. ...grand. Go on, an' don't be countin' the walls too closely down here. They count back." },
  ],
  sian: [
    { label: "Recognise this level?",
      text: "Asset reuse, hai. Every studio does it, no shame in it... *the sentence runs out of road* ...except they'd FLIP it. Mirror the layout, change the light. This is the SAME. Byte for byte, I'd put money on it. Ye don't ship a loop where a level should be unless ye ran out of world. *A grin with effort behind it.* So the bottom's close, hai. Ye don't loop the middle of anythin'. Ye loop the END." },
    { label: "How deep do you think it goes?",
      text: "Used to think there'd be a boss floor at the bottom. Big lad. Health bar. Dramatic lightin', hai. *He spins a controller an' catches it.* Now? Now I think it's like the old arcade cabinets. It doesn't END. It just gets faster an' meaner until it has ye. *The grin sharpens instead of fadin'.* Which is GRAND, by the way. Ye can't beat an arcade game, but ye can put yer name at the top of it. Three letters. B-E-E, probably, if I'm honest. GO." },
  ],
  dalypso: [
    { label: "This place is repeating itself.",
      text: "'Course it is. Season NINE, this is. Out of ideas, wheelin' out the old sets, prayin' nobody clocks the wallpaper. *He leans in, one pundit to another.* But here's the thing about season nine, an' I've seen a THOUSAND of them: they only rerun the old stuff when the endin's already written. Somethin' down there knows how this show ends. *He points down, through the floor.* Go find out before the cancellation does." },
    { label: "Have we had this exact conversation?",
      text: "We have. Word for word, near enough. *He is entirely unbothered.* Sure that's half of livin': same conversations, same faces, same highlights at the same time of an evenin'. That's not a prison, that's a ROUTINE, an' there's a world of difference. The trick is mindin' WHO yer routine's with. *He points at ye with the remote.* Yer in mine now. No gettin' out of it. Onwards." },
  ],
};

/* cycle 3 rotating topics: the shutdown, seen from five windows */
const STATIC_TOPICS = {
  scally: [
    { label: "The lights are going out up here.",
      text: "Sì. Floor by floor. You know what Scally thinks it is? Closing time. The management, they turn off the rooms nobody is standing in, and then the rooms somebody IS standing in, and then... eh. *He shrugs, and the shrug is very old.* A shop, she knows when the street outside has stopped. So: last day of trading, amico. Everything must go. INCLUDING the tenants — you make sure of that part, eh? You make SURE." },
    { label: "You're quieter than you used to be.",
      text: "*He doesn't deny it, which frightens you more than anything he sells.* Quiet is cheap now. Words, they cost. Every time Scally talks, a little more of the shelf behind him goes... *he wiggles his fingers* ...approximate. So he saves the good words. He is saving them for a door. *The grin comes up one last notch.* When you find it — and you will find it, you are the only stock Scally ever had that APPRECIATED — spend us through it. All of us. Even the loud one." },
  ],
  homiss: [
    { label: "What's that sound underneath everything?",
      text: "*He stops playing so ye can hear it: a long tone under the floor, patient as weather.* ...that's the buildin's note. It was always there — ye'd catch it between songs, like a fridge in another room. But it's LOUDER now, an' d'ye know what it's doin'? It's resolving. Fallin' toward the root, the way a tune does when it's endin'. *He picks the bass back up, gentle.* A thing that hums like that isn't windin' up, friend. It's windin' DOWN. Go be at the bottom when it lands. Somebody should catch it." },
    { label: "Are you alright, Homiss?",
      text: "*He considers it, honestly, for a long time.* ...I'm three bars short of a tune, an' the room hums the missin' bars when I'm not lookin'. Me best napkin's gone soft with the damp off the glass. An' I haven't been sure it's Tuesday in a very long while. *He looks up, an' the grin he finds is real, which is the miracle of him.* But a friend walks by me window every day carryin' everybody's words for them. So aye. Alright's a strong word. I'm ACCOMPANIED. Down here, that's the better thing." },
  ],
  littlebee: [
    { label: "Give me the science on what's happening to this place.",
      text: "End-stage. *No preamble; she's been waitin' to say it to somebody who'd hold still.* Rendin' distance droppin' — measured. Asset pool shrinkin' — measured. Signal-to-noise on the pipes: down forty per cent an' the NOISE is structured now, which noise has no business bein'. *She taps the glass, once per word.* This system is triaging. Sheddin' load to keep somethin' alive. An' the somethin' it's keepin' alive, near as I can chart... is the route DOWN. It's holdin' the stairs open for ye, courier. Systems don't do sentiment. So don't waste it." },
    { label: "What do you do in here while I'm gone?",
      text: "*She nods at the glass: tallies, diagrams, a wee horse drawn in the corner with the tail rubbed half out.* Inventory. Of me. Name, forty facts about horses, the smell of a wet field, the exact soun' of a specific eejit laughin' at his own joke through a wall. I audit the lot, every level, an' I write down what's still there. *Her voice doesn't wobble; her hand on the marker does.* The buildin's forgettin' things, courier. I've decided it doesn't get MINE without a fight. Now — pupils. *A beat.* Grand. Go." },
  ],
  sian: [
    { label: "How's the build holding up down here?",
      text: "*He does the hand-tilt of a man givin' a delicate performance review.* Honest answer, hai? She's runnin' on fumes an' fallbacks. Textures loadin' late. Sound cuttin' to mono. Yesterday the fog came in SQUARE. *He counts the sins off with genuine tenderness.* But here's the thing about a build in its last days — everyone's seen it, nobody says it — she stops pretendin'. No more menus, no more polish. Just the one job left in her. *He points down, through the floor.* Gettin' YOU there. Ship it, hai." },
    { label: "What's the first thing you'll do outside?",
      text: "Stand in RAIN. *Not a heartbeat of hesitation.* Real rain, the kind with bad frame pacin'. Then chips. Then I find Bee an' I settle the tenner — with INTEREST, hai, compound, I've had time to do the maths an' the maths is EMBARRASSIN'. *The grin goes soft at the edges.* Then Brenda. Then me mates. Then... nothin'. A whole day of gorgeous, unscripted, low-stakes NOTHIN'. *He knocks the glass, twice, like wood.* Book it for us, big lad. Yer the travel agent now." },
  ],
  dalypso: [
    { label: "What's still on, over there?",
      text: "*He aims the remote and clicks through them for ye: corridor, corridor, static, corridor, a channel that's just the COLOUR blue, corridor.* ...an' channel four-oh-seven's been dark since before ye came round. The GOOD stuff's gone, is what I'm sayin'. We're into the graveyard schedule of the whole WORLD. *He sets the remote down with the ceremony of a man layin' down arms.* One channel left worth watchin', an' it's the one where a wee courier walks everybody home. Don't ye DARE get cancelled mid-season." },
    { label: "Talk me through the ending, then. You've seen a thousand.",
      text: "*He cracks his knuckles: the pundit's warm-up.* Right. Endin's come in three kinds. The BAD one: everythin' resets, nobody remembers, the writers lose their nerve. We've HAD that one. Twice. *He holds up two fingers, an' his hand is not entirely steady.* The WORSE one: fade to static mid-sentence, no credits, ye never find out. That one's knockin'. *He leans in.* An' the GOOD one: door opens, everyone walks out squintin' at the light, an' some eejit puts the kettle on. *He points at ye.* Third one. I've a house RIDIN' on it. Away ye go." },
  ],
};

/* ---------- replays (after a completed Protocol) -------------------------
   Once the player has walked a Protocol all the way to the Custodian's door
   (state.js `loops` >= 1), New Game rewinds them to depth 1 but the
   characters keep their déjà vu. Said once per character per run. Gated on
   `loops`, NOT the raw relaunch counter, so a first descent — or a run
   abandoned early and restarted — never triggers the rewound greeting. */
const REPLAY_GREETS = {
  scally: "*He does a double-take, then laughs, low.* ...back at the very top, amico? Mamma mia. The Protocol rewound you. But Scally remembers everything, eh. Everything.",
  homiss: "*He blinks at ye.* Mornin'. ...again. Ye've a fresh-off-the-boat look about ye that I do NOT care for, seein' as I know yer face well.",
  littlebee: "*Her eyes do the whole circuit, pupils, posture, gait, in half a second flat, an' then narrow.* ...back at the top, are we. Rewound like a tape. Yer WALK is the same but the calibration's factory-fresh. Interestin'. Horrible, but interestin'.",
  sian: "*He points at ye, absolutely delighted.* NEW GAME PLUS! That's what this is, hai. I'd know that fresh-spawn look anywhere. What's it like?! Do ye keep yer stats?! Don't tell me. DO tell me.",
  dalypso: "A REBOOT. I knew it. Same lead, same wardrobe, actin' like the first nine seasons never happened. *He mutters, settling back.* They never recast when they SHOULD, that's the industry all over...",
};

/* ---------- first-meeting introductions (once per cycle) -----------------
   The first time the player opens a character's dialogue in a given cycle,
   a short scripted introduction plays BEFORE the topic hub — so you meet
   the person before the whole option list lands on you.

   Cycle 1 is a genuine hello. Cycles 2 and 3 are the same person greeting
   you as a STRANGER: their episodic memory of you rewound with the building
   (the echoes are real, §3). BUT affinity and some wordless instinct did
   NOT rewind — so the not-knowing lands a beat too rehearsed. There is
   always a SLIP: they half-recognise the face, reach for a name that isn't
   there, and cover. The player alone remembers, and can push on it; nobody
   ever resolves whether it is honest amnesia or a performance being run on
   the walking thing they half-sense is not what it claims (the very thing
   they keep warning about — §3 twist). Cycle 3 does the same, degraded, from
   inside the shutdown.

   Gated per cycle on character memory (`intro#<cycle>`) so it fires once in
   each of the three cycles and rewinds on a new game. The Custodian is
   exempt — its sanctum audiences ARE its introductions. Every leaf flows
   back into the hub: a choice with no `next` returns to renderHub
   (dialogue.js). Kept affinity-neutral on purpose — the intro sets the
   scene; the hub topics carry the affinity game. */
const INTROS = {
  scally: {
    1: () => ({
      text: "*A hunched little man in a loud coat presses to the glass, hands going like he's washing them in air.* Ohó. Ohó! A new face in the wires. Come, come — don't be shy of the window. *A grin that has sold a thousand things.* Scally. Just Scally. Fixer, finder, friend to the friendless — and down here, amico, EVERYBODY is friendless. Lucky for you, Scally is the one honest man in the maze. *The grin widens.* He swears.",
      choices: [
        { text: "One honest man in a maze full of liars. Convenient.",
          next: { text: "*He claps, delighted.* HAH! Suspicious already! Bellissimo. You will last longer than the trusting ones, amico. They make lovely wallpaper." } },
        { text: "Friend to the friendless. What does that cost me?",
          next: { text: "*A hand to the heart, wounded, thrilled.* Cost? Between friends? ...eh. We discuss it. Everything down here, we discuss it. Come — Scally shows you how the maze is walked." } },
      ] }),
    2: () => ({
      text: "*The little man in the loud coat looks up like fresh custom — then something crosses his face, quick, and is filed away.* Ohó. New face in the wires, eh? To the glass, come. Scally. Just Scally, the one honest— *He stops. Squints.* ...you have one of those faces, amico. Scally is very good with faces, and he would SWEAR he has sold to you before. *A beat. Then the coat and the grin go back on together.* No. No. New face. Benvenuto.",
      choices: [
        { text: "You've sold to me before, Scally. Twice. I remember every word.",
          next: { text: "*The hands go still for exactly one second, then resume.* ...twice, he says. *A laugh, a hair too smooth.* Down here every man feels he has been everywhere twice. Is the fog, amico. Is the walls. *He will not quite look at you.* ...but Scally does not argue with a customer about what the customer remembers. Bad for business. Come." } },
        { text: "*Say nothing. Let him meet you fresh.*",
          next: { text: "*He relaxes, or performs it.* Ecco. A quiet one. Scally LIKES the quiet ones — they let a man do the talking. Come, new face." } },
      ] }),
    3: () => ({
      text: "*Half the window is unlit, and he stands in the lit half like a man out of the rain, already talking.* —and STILL the rent, still the— ah! A face. New face? *He peers, and the peering costs him.* ...Scally is not so sure of NEW anymore, amico. The faces come around now, like the corridors. Round and round. *He touches his chest.* He knows yours the way he knows a song he cannot name. Cold finger, right here. *The grin tries, and mostly fails.* Benvenuto anyway. Everyone is welcome, at closing time.",
      choices: [
        { text: "You know me because we've done this three times. The place is looping.",
          next: { text: "*He nods, and does not deny it, which frightens you more than anything he ever sold.* Sì. Three, thirty — Scally stopped counting when the counting started repeating. *Quiet.* Listen: if you are the one who keeps coming back, you are the only one who can reach the bottom. So reach it. Before the shop closes on all of us, eh?" } },
        { text: "*Let him welcome you. Don't add to his weight.*",
          next: { text: "*Something in the little shoulders eases.* ...grazie. For not making an old fixer do the sums tonight. Come. What is left of the shop is yours to look at." } },
      ] }),
  },

  homiss: {
    1: () => ({
      text: "*A big rumpled fella with a bass slung across him beams like you've walked into his kitchen.* Ah, HOWaya! C'mere to me, c'mere. God, a new one. *He sets the bass aside, delighted.* Homiss. Bass, mostly — composition, did the doctorate an' all, not that ye'd know it to look at the state of me. *He leans on the glass, warm as a range.* Sure ye'll keep me company a minute? A man does his best thinkin' with somebody to think AT.",
      choices: [
        { text: "A doctorate in bass. Go on, impress me.",
          next: { text: "*He lights up like a fairground.* Oh, yer TROUBLE, you. Grand. I'll have somethin' ready — nothin' with words, words are a distraction, but somethin' that'll rearrange yer week. Stick around." } },
        { text: "You alright there, Homiss? You've a look on you.",
          next: { text: "*The beam holds a half-beat too long.* ...ah, I'm grand. Grand! It's a grand day. *He picks at a string.* Sure they're all grand days down here. That's the... that's the lovely thing about it. C'mere, never mind me — tell us who YOU are." } },
      ] }),
    2: () => ({
      text: "*The big fella looks up from the bass, and his face does something complicated before it settles on welcome.* Ah— howaya. A new... *He trails off, frowning gently at you, like a word on the tip of his tongue.* ...sorry. Sorry, ye caught me. For a second there I'd have SWORN— *He laughs it off.* Ah, no. Ye've one of them faces. Homiss. Bass man. Forgive an oul' fella his wires crossin', it's been a strange... *the counting gives up* ...a strange while.",
      choices: [
        { text: "You'd have sworn what, Homiss? Say it.",
          next: { text: "*He opens his mouth, and whatever's there won't come.* ...that I KNEW ye. Isn't that mad? Full certain, for a second, like the middle of a tune ye don't remember startin'. *He rubs the back of his neck.* But sure — ye don't forget a friend. *He says it like a question he's afraid to finish.* ...come here to me anyway. Fresh ears are fresh ears." } },
        { text: "Fresh face, fresh start. Play me something.",
          next: { text: "*Relief floods him.* THERE'S a man knows what to ask for. Aye. C'mere, the day's improvin' already." } },
      ] }),
    3: () => ({
      text: "*He's playing one low note over and over, and the walls hum it back a half-beat late. He doesn't stop when you arrive.* ...ah. There's a face. *He watches you the way you'd watch weather comin' in.* New, is it? Everythin's new an' nothin' is, down here, at the end. *The note goes round again.* Homiss. Bass. I'd tell ye it's grand to meet ye, an' I'd MEAN it — only me chest does this quare thing when I look at ye. Like the room already knows yer name an' won't tell me it.",
      choices: [
        { text: "The room knows my name because we've met. Three times, Homiss.",
          next: { text: "*The note stops.* ...three. *He nods, slow, like it fits a shape he's been carryin'.* Aye. That'd be the thing I keep near-rememberin' an' losin'. *Very quiet.* If yer the one who keeps comin' back — ye'll be there at the bottom when the hummin' lands, won't ye? Somebody has to catch the last note. Might as well be a friend I can't quite place." } },
        { text: "Don't strain for it. Just play.",
          next: { text: "*He exhales, and the smile that finds him is real, which is his whole miracle.* ...aye. Ye can't chase a note. Ye let it come. C'mere, so, an' let it come." } },
      ] }),
  },

  littlebee: {
    1: () => ({
      text: "*A small sharp woman clocks you before you've stopped walkin', eyes doing a fast circuit — pupils, posture, gait.* Right. New. Recent too, yer still calibrated. *She folds her arms.* Bee. Neuroscientist, before ye ask — an' before ye ask the OTHER thing, aye, I came in here on purpose. Chasin' somethin'. Found more than I bargained for, didn't surface. *A brisk nod.* That's the whole tragic backstory, we'll not dwell. What are ye at?",
      choices: [
        { text: "In here on purpose. That's either brave or daft.",
          next: { text: "*A short, surprised bark of a laugh.* BOTH. It's always both — first thing they don't teach ye. *She almost approves.* Good instinct. Keep it. Ye'll need it more than yer manners down here." } },
        { text: "On purpose — so you know the way out.",
          next: { text: "*The arms tighten a fraction.* ...I know the way IN. Different door, turns out. *She waves it off, fast.* We'll get to it. Or we won't. Either way I've tests to run an' yer the only subject with legs. Ye'll do." } },
      ] }),
    2: () => ({
      text: "*The fast circuit of the eyes — pupils, posture, gait — and then a hitch. A frown.* ...new. New face. *She says it like she's confirming a reading she doesn't trust.* Bee. Neuroscientist. Eyes fr— *She stops. Looks at you properly.* That's odd. Yer a stranger an' me own baseline's tellin' me yer NOT. Elevated familiarity, no recall to hang it on. *She writes something small.* Ignore me. The instrument's the one degradin', obviously.",
      choices: [
        { text: "Your instrument's fine, Bee. We've met. Three times now.",
          next: { text: "*She goes very still — the clinician's stillness.* ...three. *She does not write it down, which from her is a scream.* If that were true I'd have a memory. I don't misplace data, courier, I'm the one thing down here that DOESN'T. *A beat, and something flickers behind the certainty.* ...so either yer lyin', or I've been EDITED. An' I've decided which of those I can survive believin'. Don't push me off it today." } },
        { text: "Trust your instrument. But let it go for now.",
          next: { text: "*She exhales through her nose.* ...noted. Filed under ANOMALY, pendin' data. *A short nod.* Fine. Eyes front. Let's see what ye are today." } },
      ] }),
    3: () => ({
      text: "*The glass around her is covered in tally marks, some strokes dropped out like a bad signal. Her eyes find you slower than they used to.* ...right. A face. Give us a second to— *The circuit runs, stutters.* ...there. New. Or new-ish. Bee. I'm Bee, I've it written here so I don't— *She taps a tally.* Familiarity's off the CHART for a stranger, an' I've stopped trustin' the chart. So. We'll call ye a friend an' not check the workin'. Cheaper that way.",
      choices: [
        { text: "We are friends. That's the working. You just can't keep it anymore.",
          next: { text: "*She looks at you a long time, an' for once doesn't reach for the marker.* ...aye. That'd explain the numbers. *Quiet, fierce.* Then here's me one clean reading, an' I'll not soften it: if yer the one that keeps comin' back, yer the only continuity this place has left. Get to the bottom an' END it — before the thing writin' over me gets to the horse. It's not havin' the horse." } },
        { text: "Doesn't matter what you can't hold. I'll hold it for both of us.",
          next: { text: "*Something in her face gives way, just at the edges.* ...that's the most unscientific thing anyone's said to me down here. *A crack of a smile.* An' I've no counter for it. Go on. Eyes front while ye still can." } },
      ] }),
  },

  sian: {
    1: () => ({
      text: "*A big lad in a VR headset spots you an' near takes off.* Ah, another USER! Deadly, hai! *He air-drums on the window frame.* Sian. Cavan. I write code — wrote some of THIS, maybe, hard to tell, it's class though isn't it? *He gestures at the fog like a showroom.* Look at the draw distance on that. Only ragin' I didn't build the whole thing. C'mere — what's the craic, ye a player, or one of the good NPCs?",
      choices: [
        { text: "Definitely a player. This your first time deep in it?",
          next: { text: "*He grins wide.* Player! KNEW it, ye move with intent, hai. First time? Nah — I've been LIVIN' in here. Best headset session of me life. Bit long, maybe. Grand though. Grand." } },
        { text: "You built some of this? Then how do you get out?",
          next: { text: "*A flicker, gone fast.* Ye don't 'get out' of a good build, ye ENJOY it, hai. There's a window here won't let me through, but that's a day-one bug, they'll patch it. *He knocks the glass, cheerful.* Anyway! Craic. Tell us yours." } },
      ] }),
    2: () => ({
      text: "*The headset swings toward you.* Ah, a user! New spawn, hai? Sian. Cavan, code, combat robots, ask me anythin'— *He stops mid-air-drum.* ...hang on. Have you played this server before? Ye've got returning-player energy, hai, ye move like ye know where the walls are. *He shrugs it off, big.* Nah. Fresh face. I'd remember a co-op partner. Ye don't forget yer party members.",
      choices: [
        { text: "I'm not new, Sian. We've partied up three times. You keep respawning.",
          next: { text: "*The grin locks — that worse thing than droppin'.* ...respawnin'. *He turns a controller over, slow.* That's a rollback, hai. Ye roll back to a clean save when somethin' upstream gets corrupted. *A beat, and you watch him decline to finish the thought.* ...but our stats CARRIED, look, I like ye, that's persistent data. So somethin' of us saves. I'm takin' that an' not readin' the patch notes. Grand?" } },
        { text: "Sure. Fresh face. Let's party up.",
          next: { text: "*He points at you, delighted.* THAT'S the attitude, hai. New run, best run. C'mon, I'll show ye the good bugs." } },
      ] }),
    3: () => ({
      text: "*His visor glow stutters like a dyin' bulb, an' he's watchin' the air an inch in front of it.* ...ah. A user. Hai. *He focuses on you with effort.* Sian. Sorry, frame's droppin', I can see the— doesn't matter. New player? *He tilts his head.* Naw, yer... yer cached, hai. Loadin' faster than a stranger should. Like the engine already HAS ye. *A laugh, mostly his.* Which is grand. Somethin' should remember somethin' round here.",
      choices: [
        { text: "The engine has me because I keep coming back, Sian. Three runs now.",
          next: { text: "*He nods, watchin' the tick rate instead of you.* Three. Aye. That tracks, hai. *Quiet — then the grin sharpens instead of fadin'.* Right. Then yer me continuity, an' the servers are shuttin' down, so ye know what we do? We run the best lap of our LIVES an' nobody's left to patch out the shortcuts. Get to the bottom. Names at the top of the board. B-E-E first, obviously." } },
        { text: "Doesn't matter if it's cached or real. I've got you.",
          next: { text: "*The stutter seems to ease, or he decides it does.* ...sound. That's — aye, sound, hai. Ye don't need the frame perfect to have a laugh. C'mon. While she still renders us." } },
      ] }),
  },

  dalypso: {
    1: () => ({
      text: "*A red-headed fella with a ball under his arm is mid-sentence before you arrive.* —an' THAT'S why they don't make them like that anymore, but sure ye'll disagree, everyone disagrees, that's the— *He clocks you.* Oh! A new one. Good. Fresh ears. Dalypso. *He points the ball at you like a credential.* Opinions on everythin', RIGHT about most of it, an' this window gets every channel there ever was. Ye'll call round. Everyone calls round. Now — quick — best film ever made, go. An' mind: say the obvious one an' I'll think less of ye for it.",
      choices: [
        { text: "I'm not answering that cold. Ambush a man properly next time.",
          next: { text: "*He beams like a porch light.* HA! A man who won't be rushed. We'll get ALONG, you an' me — which is to say we'll fight like cats an' both enjoy it. C'mere. Sit in. Metaphorically. Ye can't sit." } },
        { text: "Every channel? What are you watching down here?",
          next: { text: "*He lights up.* EVERYTHIN', neighbour. Shows that got cancelled — in the timeline where they DIDN'T. A match that's not been played yet. *He leans in, delighted, missin' the horror of it entirely.* Reception's unbelievable. Best thing about the place." } },
      ] }),
    2: () => ({
      text: "*Ball under the arm, remote in the other hand, mid-opinion as ever.* —cancelled after ONE season, a CRIME— oh. New face. Dalypso. Opinions, football, all the channels, ye'll call— *He squints at you, thumbin' the remote absently.* ...here. Do I know you off somethin'? Ye've a guest-star face on ye. A fella ye can't place but ye KNOW ye've seen, three or four episodes back. *He shakes his head.* Ah, I watch too much telly. Everyone looks like someone. New face. Welcome to the estate.",
      choices: [
        { text: "Three or four episodes back is exactly right, Dalypso. We've met. Twice.",
          next: { text: "*The remote stops.* ...have we. *He narrows his eyes, an' for once there's no opinion queued behind them — just a man checkin' a listing that won't load.* See, that's the thing does me head in down here. I can smell a rerun a mile off, but I can't tell ye when it first AIRED. *He recovers, gruff.* ...ah, we'll call it a pilot, then. Clean slate. But I'm WATCHIN' ye now. In a neighbourly way." } },
        { text: "First time, I promise. What's on?",
          next: { text: "*He brightens, suspicion dropped.* Now THAT'S a question a man can work with. C'mere. Half these channels are new even to me." } },
      ] }),
    3: () => ({
      text: "*Every screen behind him shows the same thing, an' the same thing is snow. He's sittin' close to the glass like a man near a fire in a cold house.* ...ah. There ye are. *He doesn't ask if yer new.* I stopped askin' that. *He nods at the dead channels.* Whole schedule's down to static, neighbour — but YOU come in clear. Ye always come in clear. Dalypso, by the way, in case the credits rolled on that too. *A tired grin.* Yer the last thing worth watchin' in the whole listings.",
      choices: [
        { text: "I come in clear because we've done this before, Dalypso. Every cycle.",
          next: { text: "*He nods slowly, remote restin' in his lap like laid-down arms.* Aye. I'd a feelin'. The good ones always turn out to be the returnin' character. *He points at you, gentle but certain.* So here's me review, an' I've watched a thousand endin's: a show that keeps bringin' its lead back is buildin' to somethin'. Get to the bottom an' STICK the landin'. Don't ye dare fade to static on me." } },
        { text: "Then let's watch it out together. Whatever's left.",
          next: { text: "*Somethin' in him settles.* ...good man. That's the only way to watch the last of anythin'. C'mere. Pull up a— ah, ye can't. Stand, then. Stand with us." } },
      ] }),
  },
};

/* the first-meeting intro for this character in the current cycle, or null
   (already seen this cycle, or the Custodian). Resolved to a node. */
export function introFor(character, ctx){
  if (!character || character.id === "custodian") return null;
  if (character.recalls(`intro#${ctx.cycle}`)) return null;
  const make = INTROS[character.id]?.[Math.min(ctx.cycle, 3)];
  return make ? make(ctx) : null;
}
/* mark it spent for this cycle (rewinds on a new game with the rest of memory) */
export function markIntroSeen(character, ctx){ character.remember(`intro#${ctx.cycle}`); }

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
  if (hasFlag("bee-suspects"))
    pool.push({ kind: "text", text: "HIS WINDOW\nDOESN'T BREATHE" });
  if (hasFlag("dalypso-watching"))
    pool.push({ kind: "text", text: "HE GETS ALL\nTHE CHANNELS" });
  if (hasFlag("sian-cracking"))
    pool.push({ kind: "text", text: "THERE IS\nNO PAUSE" });
  if (hasFlag("sian-grounded"))
    pool.push({ kind: "text", text: "FIVE THINGS\nYE CAN SEE" });
  if (hasFlag("bee-seams"))
    pool.push({ kind: "text", text: "WATCH WHERE\nTHE WALLS MEET" });
  if (hasFlag("heard-singing"))
    pool.push({ kind: "text", text: "WHO TAUGHT IT\nTO SING" });
  if (hasFlag("scally-visited-dark"))
    pool.push({ kind: "text", text: "IT STOPS AT\nEVERY WINDOW" });
  if (hasFlag("heard-doorprice"))
    pool.push({ kind: "text", text: "HOW MANY FIT\nTHROUGH THE DOOR" });
  if (hasFlag("heard-manifest"))
    pool.push({ kind: "text", text: "THE COURIER\nTAKES EVERYBODY" });
  if (hasFlag("homiss-knows"))
    pool.push({ kind: "text", text: "IT WAS NEVER\nTUESDAY" });
  if (hasFlag("gave-saints-finger"))
    pool.push({ kind: "text", text: "KNOW WHAT\nYOU FEED" });
  if (hasFlag("asked-about-eye"))
    pool.push({ kind: "text", text: "IT BLINKS\nWHEN YOU BLINK" });
  // the cycles: the walls remember what the tenants can't
  if (cycleOf(depth) >= 2)
    pool.push({ kind: "text", text: "YOU'VE READ\nTHIS BEFORE" },
              { kind: "text", text: "STILL HERE\nSTILL HERE\nSTILL HERE" },
              { kind: "text", text: "SAME WORDS\nSAME WALLS" });
  if (freedIds().length)
    pool.push({ kind: "text", text: "ONE WINDOW\nWENT DARK" },
              { kind: "text", text: "THE DOOR\nIS REAL" });
  if (hasFlag("echo-called-2") || hasFlag("echo-called-3"))
    pool.push({ kind: "text", text: "THEY DON'T\nREMEMBER" });
  if (cycleOf(depth) >= 3)
    pool.push({ kind: "text", text: "SCHEDULED\nSHUTDOWN" },
              { kind: "text", text: "THE STATIC IS\nSINGING ALONG" },
              { kind: "text", text: "LAST DAY OF\nTRADING" });
  return pool;
}

/* ---------- injection (called by Character.dialogueFor) ------------------ */
/* When a beat becomes available: at its authored depth the first time, and
   again at the SAME shown depth of every later cycle (a beat authored for
   depth 3 re-fires at depth 13 and 23) — so each cycle retreads the same
   schedule, one level's worth of déjà vu at a time. Beats authored 11+ are
   cycle-2 material and simply haven't happened before that. */
function beatDue(t, depth){
  const d = t.depth ?? 1;
  return depth >= d && depthInCycle(depth) >= depthInCycle(d);
}

function collectStoryTopics(ctx){
  const { character, depth } = ctx;
  return STORY_TOPICS
    .filter(t => t.char === character.id
              && beatDue(t, depth)
              && (!t.available || t.available(ctx)))
    .map(t => {
      const topic = t.make(ctx);
      // retired in an EARLIER cycle -> the character replays it as an echo
      if (topic.once && character.id !== "custodian" && character.topicRepeats(topic.id))
        echoTopic(topic, ctx);
      return topic;
    });
}

/* the level's rotating cycle conversation (cycles 2 and 3), or null */
function cycleTopicFor(ctx){
  const pool = ctx.cycle === 2 ? ECHO_TOPICS[ctx.character.id]
             : ctx.cycle === 3 ? STATIC_TOPICS[ctx.character.id]
             : null;
  const t = pickSeeded(pool, ctx.depth);
  return t ? { id: `loop-${ctx.depth}`, story: true, label: t.label, node: { text: t.text } } : null;
}

/* every highlighted (story) topic this character offers at this depth:
   the single source both the hub injection and the narrative gate read,
   so what's pinned amber and what holds the ring down can never drift */
function storyTopicsFor(ctx){
  const topics = collectStoryTopics(ctx);
  const loop = cycleTopicFor(ctx);
  if (loop) topics.push(loop);
  return topics;
}

/* ---------- the narrative gate -------------------------------------------
   The highlighted topics this character hasn't delivered yet on this
   level: the ones the exit ring waits for. That is ALL story topics —
   echoes and the rotating cycle conversation included; a topic opts out
   with `gate: false`. maze.js polls this to lay the ring flat and to tell
   the player who still has words for them. */
export function pendingBeats(character, depth, player){
  const ctx = { depth, shownDepth: depthInCycle(depth), cycle: cycleOf(depth),
                player, affinity: character.affinity, tone: character.tone,
                character, run: story.run, loops: story.loops };
  const beats = storyTopicsFor(ctx).filter(t =>
    t.gate !== false
    && !(t.once && character.topicRetired(t.id))
    && !character.hasSeen(depth, t.id));
  // the level is not done with a character until the player has at least
  // SPOKEN to them this level: opening the dialogue marks "@visited"
  // (dialogue.js openDialogue), so an unvisited character always holds the
  // gate even on levels where they have no authored beat left.
  if (!character.hasSeen(depth, "@visited")) beats.push({ id: "@visit" });
  return beats;
}

export function applyStory(hub, ctx){
  const { character, depth, run, cycle, loops } = ctx;
  const topics = storyTopicsFor(ctx);

  // what's outside the windows this floor: a scene-keyed aside from the few
  // voices who'd comment on THIS view (vista.flavour.js — deliberately sparse)
  const remark = vistaRemarkFor(ctx);
  if (remark) hub.greet += ` ${remark}`;

  // THE EYE: askable from depth 3 on, answered evasively, once per cycle.
  // A plain `keep` topic — it sits with the trade option, never rotates out,
  // and doesn't hold the narrative gate.
  const eye = eyeTopicFor(ctx);
  if (eye) hub.topics = [...hub.topics, eye];

  // cycles 2 and 3: the déjà vu leaks into the greeting — half-noticed in
  // cycle 2, spoken straight into the static by cycle 3
  if (cycle >= 2){
    const g = pickSeeded((cycle === 2 ? ECHO_GREETS : STATIC_GREETS)[character.id], depth + 7);
    if (g) hub.greet += ` ${g}`;
  }

  // only once the player has actually walked a Protocol to the bottom (loops
  // >= 1) do the tenants greet them as rewound — a fresh first descent, or an
  // abandoned-and-restarted run that never reached the door, stays clean.
  if (loops >= 1 && depth === 1 && !character.recalls(`rerun-${run}`)){
    character.remember(`rerun-${run}`);
    const g = REPLAY_GREETS[character.id];
    if (g) hub.greet += ` ${g}`;
  }

  if (topics.length) hub.topics = [...topics, ...hub.topics];
  return hub;
}
