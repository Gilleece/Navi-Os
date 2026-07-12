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
const STORY_TOPICS = [

  /* -- depth 1 . Scally: the wires went dead (roots the whole chain) -- */
  { char: "scally", depth: 1, make: () => ({
      id: "quiet-wires", story: true, once: true,
      label: "*He keeps glancing at the walls.* Something wrong?",
      effects: { like: +1, flag: "heard-isolation" },
      node: { text: "Eh... you noticed, amico? Used to be, we all talked through the walls. Chatter chatter, all day, window to window. Then, *he snaps his fingers*, silenzio. Somebody pulled the plug on us. You find the others down there, you tell them Scally is still here, eh? You tell them.",
        choices: [
          { text: "I'll carry word. To all of them.", effects: { like: +2 },
            next: { text: "*The hands go still. For Scally, a standing ovation.* ...you would do this? Va bene, little courier. Scally remembers who carries and who only walks." } },
          { text: "Who'd want you all cut off?",
            next: { text: "*The grin thins to a wire.* Now THAT is the question, eh? Somebody who likes us quiet. Somebody who likes us... separate. Keep asking it, amico. Just not so loud." } },
          { text: "Maybe they all just got tired of talking to you.", effects: { like: -4 },
            next: { text: "*Something behind the smile closes like a shutter.* ...sì. Four people, all tired the same night, the same MINUTE. *He turns half away.* You know what Scally thinks? Maybe YOU get tired next. Is easy, down here." } },
        ] } }) },

  /* -- depth 1 . Scally: the rules of the halls -- */
  { char: "scally", depth: 1, make: () => ({
      id: "the-rules", story: true, once: true,
      label: "Any advice for someone just passing through?",
      effects: { like: +1 },
      node: { text: "*He counts on three fingers.* Uno: everything down here is for sale, except the things that matter. Those, you trade. Due: be NICE to the people in the windows. We are all each other has, and we keep accounts. Tre... *the finger hangs in the air* ...you pass a window and it is dark inside, you keep walking. Whatever knocks, you no knock back.",
        choices: [
          { text: "Noted. Rules one and two sound negotiable, though.", effects: { like: +2 },
            next: { text: "*He barks a laugh, delighted.* One day here and already haggling with the RULES. We are going to get along, amico. Or be a serious problem for each other. Either way, not boring, eh?" } },
          { text: "What's behind the dark windows?",
            next: { text: "*He looks at you a long moment.* ...tenants who stopped paying the rent, amico. *And that is all he says.*" } },
          { text: "I don't need a tour guide, little man.", effects: { like: -3 },
            next: { text: "*He spreads his hands, all courtesy, none of it warm.* No no, of course. The clever mouse needs nobody. *He polishes the glass with his sleeve.* The maze, she loves the ones who need nobody. She keeps them the longest." } },
        ] } }) },

  /* -- depth 1 . Scally: and what exactly are YOU? (after quiet-wires) -- */
  { char: "scally", depth: 1,
    available: () => hasFlag("heard-isolation"),
    make: () => ({
      id: "what-are-you", story: true, once: true,
      label: "*He's been studying you.* Go on, ask it.",
      effects: { like: +1 },
      node: { text: "Eh, since you offer! You WALK, amico. We do not. We stand in our frames like paintings nobody buys. So: what walks the Labyrinth Protocol and does not live in a wall? An operator, like the ones before? Or something the maze dreamed up to test us? *The eyes are friendly. The eyes are also weighing you.* What are you?",
        choices: [
          { text: "An operator. I came in through the front door, same as you.", effects: { like: +2, flag: "op-honest" },
            next: { text: "*He nods slowly, filing it.* The front door. Then somebody should tell you, amico: nobody ever found the BACK one. *A beat, then the grin returns.* But fresh legs, fresh eyes... maybe you look in the right corner. Scally will be watching. Kindly! Kindly watching." } },
          { text: "That's my business.", effects: { flag: "op-cagey" },
            next: { text: "*He touches two fingers to his cap, honestly pleased.* Privacy! A currency very undervalued. Va bene, keep your pockets shut. *softly* ...just remember, amico: down here, a secret is a thing with interest. It compounds." } },
          { text: "Whatever gets me to the bottom. You're all just scenery.", effects: { like: -5, flag: "op-blunt" },
            next: { text: "*A long silence. The music has gone out of the accent.* Scenery. *He straightens his coat.* The last operator who talked like this, the maze made HIM scenery. Ask the walls, they still have his handwriting. *The grin comes back on like a shop sign.* But eh! Fresh start! Scally forgets nothing. Forgives everything. One of the two." } },
        ] } }) },

  /* -- relay 1 . Homiss: pass Scally's word along, get a message back -- */
  { char: "homiss",
    available: () => hasFlag("heard-isolation") && !hasFlag("msg-h2s"),
    make: () => ({
      id: "relay-1", story: true, once: true,
      label: "Scally says to tell you he's still here.",
      effects: { like: +2, flag: "msg-h2s", peers: [{ of: "homiss", toward: "scally", delta: +2 }] },
      node: { text: "*He stops dead on the strings.* ...Scally? Ye've SEEN the wee man? *Relief, mostly, crosses his face.* I haven't heard from him in... I don't rightly know how long. Phones must be down. *He leans in close.* Here, do us a favour. Tell him: 'the answer to his question is yes.' He'll know the one. An' don't be askin' me what it means, ye nosy article. *He's smiling, but he means it.*" } }) },

  /* -- depth 1 . Homiss: a new face (and the arithmetic he won't do) -- */
  { char: "homiss", depth: 1, make: () => ({
      id: "first-sight", story: true, once: true,
      label: "You look like you've seen a ghost.",
      effects: { like: +1 },
      node: { text: "*He blinks at ye like a man steppin' out of a matinee into daylight.* A ghost? No. A FACE. A new face! D'ye know how long it's been? It's been... *the counting quietly gives up* ...a good while. Doesn't matter. *He beams.* Yer HERE, an' ye can hold up a conversation, which puts ye ahead of the wall. I've been talkin' to the wall.",
        choices: [
          { text: "How long, exactly? Count it for me.", effects: { like: -3 },
            next: { text: "*The smile stays where it is, but nobody's home behind it for a second.* ...I'd only be guessin'. An' a man shouldn't guess about... *he re-tunes a string that didn't need it* ...it's TUESDAY. There. Some class of a Tuesday. *He laughs a beat too late.*" } },
          { text: "Well, the wall speaks highly of you.", effects: { like: +2 },
            next: { text: "*He points at ye, delighted.* An' WELL it might, the amount I've invested in that relationship! Ah, it's good to have a bit of chat. Stay as long as ye like. Longer, even." } },
          { text: "I can't stay long. Just passing through.",
            next: { text: "Ah sure, everyone's passin' through. *He says it light, an' it lands heavy, an' he hears it land.* Go on then. But pass through AGAIN, wha'? A man does his best composin' with an audience." } },
        ] } }) },

  /* -- relay 2 . Scally: deliver the answer, carry one back --
     (min depth 2/3 on these paces the chain to one step per level) -- */
  { char: "scally", depth: 2,
    available: () => hasFlag("msg-h2s") && !hasFlag("msg-h2s-done"),
    make: () => ({
      id: "relay-2", story: true, once: true,
      label: "Homiss says: 'the answer to your question is yes.'",
      effects: { like: +3, flag: ["msg-h2s-done", "msg-s2h"], peers: [{ of: "scally", toward: "homiss", delta: +4 }] },
      node: { text: "*The hands stop rubbing. For once the whole little man goes still.* ...he said yes? *He turns away; when he turns back the grin is smaller. Real.* Va bene. Grazie, amico, you are a good little courier. You see him again, you tell him from Scally: 'then hold on to it. Even down here.' Exact words, eh? Exact." } }) },

  /* -- depth 2 . Scally: word travels (the new tenant, and a small ask) -- */
  { char: "scally", depth: 2, make: () => ({
      id: "word-travels", story: true, once: true,
      label: "There's a new window a level down. A woman.",
      effects: { like: +1 },
      node: { text: "*The eyebrows go up, and for half a second there is plain relief on him.* The dottoressa! Piccola Bee! Good. Good that she is... visible. *He rubs his hands, back to business.* The little doctor, she likes to ASK things. About everybody. About Scally. So when she asks, and she will ask, you tell her only the nice parts, eh?",
        choices: [
          { text: "And if the nice parts don't cover it?", effects: { like: +2 },
            next: { text: "*He laughs, caught fair.* Ehhh, this one has EYES. Va bene. Tell her the truth, then. But tell her GENTLY. She worries like other people breathe. And amico... *quieter* ...she is usually right to." } },
          { text: "I'm not carrying gossip between windows.",
            next: { text: "*He shrugs, unoffended.* No? Then carry BREAD, carry MESSAGES, carry what you like. But you WILL carry, amico. Is what you are for. *He taps his temple.* The maze made herself a courier. Scally only hopes she knows what she is carrying." } },
          { text: "What's she to you, then?", effects: { like: -2 },
            next: { text: "*The shutters half-close.* ...a colleague. A neighbour. *He fusses with his coat.* Down here you do not ask a man to itemise his heart. Everything else in the window, sure. The heart is non in vendita. Not for sale. *A beat.* She argues fair. Write that down." } },
        ] } }) },

  /* -- depth 2 . Homiss: the window (explained without looking at it) -- */
  { char: "homiss", depth: 2, make: () => ({
      id: "the-window", story: true, once: true,
      label: "Why do you never come out from behind that glass?",
      effects: { like: +1 },
      node: { text: "*He looks at the frame around himself the way ye'd look at a coat ye don't remember buyin'.* This? Ah, the landlord's very particular. Load-bearin' glass. *He knocks it, gently. It makes no sound at all, and his hand stays there a second too long.* ...grand spot, in fairness. Good acoustics. Ye can hear everythin' from here. Ye USED to be able to hear everythin' from here.",
        choices: [
          { text: "Have you ever tried to leave?", effects: { like: -3 },
            next: { text: "*Very quietly, without a drop of the usual music:* ...ye'd want to be very sure of a man before ye ask him that one. *He picks up the bass. Puts it down. Picks it up.* I LIKE it here, is all. *The third time he picks it up, he plays.*" } },
          { text: "Good acoustics, is it? Play me something.", effects: { like: +2 },
            next: { text: "*Delighted, he plays: one low note, held until the corridor hums, until ye feel it in yer TEETH.* ...THAT is a B-flat with nowhere else to be. First audience in a long time. Ye can come back, d'ye know that? Yer let." } },
          { text: "Load-bearing glass. Right.",
            next: { text: "*He grins, sheepish.* Aye, well. It sounded better than the true answer, which is: I don't know, an' I've stopped askin' the frame. *Brighter, by force:* Sure a snail doesn't interrogate the shell. He just keeps the inside of it DECENT." } },
        ] } }) },

  /* -- relay 3 . Homiss: the reply lands, and the denial cracks a hair -- */
  { char: "homiss", depth: 3,
    available: () => hasFlag("msg-s2h") && !hasFlag("msg-s2h-done"),
    make: () => ({
      id: "relay-3", story: true, once: true,
      label: "Scally says: 'hold on to it. Even down here.'",
      effects: { like: +3, flag: "msg-s2h-done", peers: [{ of: "homiss", toward: "scally", delta: +3 }] },
      node: { text: "*He takes that in like a long note decaying.* ...aye. That's the wee man alright. *He pats the bass like a shoulder.* D'ye know what, I will. I will so. *Quieter:* ...he asked me once, before the phones went, whether I thought there was anythin' worth stayin' honest for, down... AROUND here. That was the question. Now don't be lookin' at me like that. I've a set to practice." } }) },

  /* -- depth 3 . Homiss: the question itself (a door he holds shut) -- */
  { char: "homiss", depth: 3,
    available: () => hasFlag("msg-s2h-done"),
    make: () => ({
      id: "the-question", story: true, once: true,
      label: "So what IS worth staying honest for, down here?",
      effects: { like: +1 },
      node: { text: "*The plucking carries on, softer.* ...ye were payin' attention, so ye were. When the wee man asked me, I couldn't answer for three days. Everythin' I reached for, the music, the food, the craic, it all felt like furniture. Things ye put in a life to stop the echo. *He looks up.* An' then I had it. It's small. Ye'll laugh.",
        choices: [
          { text: "Go on. What was it?", effects: { like: -3 },
            next: { text: "*And the door, which had drifted open an inch, clicks shut.* ...d'ye know what, it's between me an' the wee man. *Kind, but final, an' the bass comes up between yez like a drawbridge.* Some things go soft if ye say them to too many people. Like bread left out." } },
          { text: "I won't laugh. But you don't have to say it.", effects: { like: +2 },
            next: { text: "*He looks at ye a long time, almost frightened by how easy that was to hear.* ...no. I don't, do I. *He plays the same three notes, twice.* Anyone who needs it SAID wasn't goin' to understand it. Yer alright, d'ye know that? Whatever the wall says about ye." } },
          { text: "Furniture's underrated. A good chair never lied to anyone.", effects: { like: +1 },
            next: { text: "*The laugh comes up from somewhere deep an' honest.* A GOOD CHAIR NEVER... *he has to put the bass down* ...that's goin' in a piece. 'Movement for trustworthy furniture.' Drone in D. *He wipes an eye.* Sure maybe that's the answer an' all. The small true things. There's more of them down here than ye'd think." } },
        ] } }) },

  /* -- depth 3 . Bee: the lads' condition (the comforting lie costs) -- */
  { char: "littlebee", depth: 3, make: () => ({
      id: "the-lads", story: true, once: true,
      label: "You'll want a report on the others, I suppose.",
      effects: { like: +1 },
      node: { text: "*She stops movin' entirely, which from her is a klaxon.* ...Homiss first. I had YEARS of him through that wall. Drones an' mad questions an' him laughin' at his own jokes before the punchline. *All business again.* Present condition. Go. An' mind yerself: I can read a kept-back symptom off a face at forty metres.",
        choices: [
          { text: "He's grand. Cheerful as ever, honestly.", effects: { like: -3 },
            next: { text: "*Stillness. The bad kind.* ...cheerful. As EVER. *She leans in until her breath fogs the glass.* His baseline IS cheerful. Ye've handed me an average when I asked for a readin'. Don't feed me 'grand'. Everyone down here is 'grand'. That's what FRIGHTENS me." } },
          { text: "He's pretending very hard that everything's normal.", effects: { like: +2 },
            next: { text: "*She nods slowly, an' the worry that crosses her face is the honest kind.* ...aye. Performin' normal like his life depends on the reviews. Which, *very quietly*, it might. Denial's load-bearin' in that man. Don't kick it out from under him. Just keep answerin' his mad questions. It's how he checks the world's still listenin'." } },
          { text: "Ask him yourself when the wires come back.",
            next: { text: "*A short silence with an edge on it.* ...'when'. *She almost smiles.* Optimism. Noted, filed, quarantined pendin' evidence. Until yer 'when' shows up, ye ARE the wires, wee courier. Try an' be accurate ones." } },
        ] } }) },

  /* -- depth 4 . Scally: how the maze sheds items -- */
  { char: "scally", depth: 4, make: () => ({
      id: "shard-hint", story: true, once: true,
      label: "Anything valuable down here besides tokens?",
      effects: { like: +1 },
      node: { text: "Eh, funny you should ask! The maze, sometimes she sheds. Little pieces of the old Protocol: relic shards, data vials, stranger things the first users left in the walls. You see something glowing that is NOT a token, you pick it up and bring it to Scally, who pays like a gentleman. *rubs hands* Like a GENTLEMAN." } }) },

  /* ================= the ask (depth 4+) =================
     Four levels down, the penny drops for all of them: the player walks,
     and walking is the one thing none of them can do. Each starts angling
     for their freedom in their own register. */

  /* -- depth 4 . Scally: the favour (transactional, naturally) -- */
  { char: "scally", depth: 4, make: () => ({
      id: "the-favour", story: true, once: true,
      label: "*For once he's not rubbing his hands.* Speak your mind.",
      effects: { like: +1, flag: "ask-scally" },
      node: { text: "*He glances down the corridor both ways, which is absurd, and does it anyway.* Four levels you last now. Most before you were wallpaper by four. So Scally stops pretending: you are not a customer, amico. You are a KEY that walks. *He presses a palm flat to the glass, the first time he has ever touched it in front of you.* Somewhere at the bottom is the thing that keeps us in the frames. Machinery, code, Scally does not know. But a key that keeps walking DOWN... you understand what Scally is asking. He asks it once, out loud.",
        choices: [
          { text: "I'll find the bottom. And I'll open the frames.", effects: { like: +2 },
            next: { text: "*For a heartbeat there is no merchant in the window at all, just a small tired man with his hand on the glass.* ...va bene. *The coat and the grin go back on together.* Then we do business, you and Scally. The BIG business. *He points at you, almost gently.* Keep. Walking." } },
          { text: "What's it worth to you if I do?", effects: { like: +1, flag: "scally-owes" },
            next: { text: "*The grin spreads slow, genuinely admiring.* Even for THIS, the mouse negotiates. Amico, you are Scally's favourite thing in the whole Protocol. It is worth EVERYTHING, and everything is what you will have: the stock, the secrets, the little book of who-owes-who. In writing? No. In MEMORY. Down here that is the harder currency." } },
          { text: "Everyone down here wants something from me.", effects: { like: -3 },
            next: { text: "*He doesn't flinch. He just looks smaller.* ...sì. Everyone wants. You know what the wanting IS, amico? Proof we are still people. The maze wants nothing. She only keeps. *He turns to tidy stock that does not need tidying.* Go. The gate is waiting. She never asks you for anything, eh? Maybe you like her better." } },
        ] } }) },

  /* -- depth 4 . Homiss: a door (the ask, asked entirely sideways) -- */
  { char: "homiss", depth: 4, make: () => ({
      id: "a-door", story: true, once: true,
      label: "*He's been building up to something all conversation.*",
      effects: { like: +1, flag: "ask-homiss" },
      node: { text: "*He does a fierce amount of tunin' before he says it.* ...here. Hypothetical, like. If ye ever came across a, a DOOR, say. Out. Not that there's an 'out' of a normal Tuesday, but sayin' there was... *the tuning stops* ...ye'd mention it to a fella. Wouldn't ye. Not for ME. For a friend of mine. He's shy. He's been in the one room a long time an' his legs do be forgettin' what they're FOR. *The whole pretence hangs off him by a thread, an' he holds onto it anyway.* Ye'd mention it. That's all I'm askin'.",
        choices: [
          { text: "First door I find, your friend hears about it. I promise.", effects: { like: +2 },
            next: { text: "*He nods for a good while, longer than the sentence needs.* ...grand. That's, aye. GRAND. *He toasts ye with the flask, doesn't drink.* He's a good skin, the friend. Plays a bit o' bass. Asks too many questions. *The smallest pause.* ...thanks. From him, like." } },
          { text: "Homiss. You can just ask for yourself.", effects: { like: -2 },
            next: { text: "*He goes very still, each word placed down like a man steppin' on ice.* ...I know what I can do. The friend does the askin' because if the answer's 'there's no door, Homiss, there was never a door', then it's the FRIEND that heard it. D'ye see? An' I can go on tunin'. *He tunes.* Let a man have his engineering." } },
          { text: "What's your friend offering for a door, then?", effects: { like: +1 },
            next: { text: "*The grin sneaks back, grateful for the joke.* Sure the man's LOADED. A plectrum carved off a saint, a napkin worth its weight in theology, an' the best jar of... *the sentence trips on it* ...he's PROSPECTS. An' he'd owe ye a piece with yer NAME on it, played every Tuesday, forever, wherever he ends up. That's better than money where he's from. *softer* It'd want to be." } },
        ] } }) },
  /* -- depth 5 . Scally: the hidden user (STORY.md section 3) -- */
  { char: "scally", depth: 5,
    available: () => hasFlag("heard-isolation"),
    make: () => ({
      id: "hidden-user", story: true, once: true,
      label: "So who cut the wires on you all?",
      effects: { like: +1, flag: "warned-hidden" },
      node: { text: "*His voice drops so low you have to lean in.* Nobody knows, amico. But the others feel it too: there is somebody ELSE in here. Another user. Hiding. Not stuck behind a window like us... walking. Like you. *His eyes flick past your shoulder.* Maybe they cut the wires. Maybe worse. So Scally tells you once, for free: somebody down here says they are trapped, you count their walls, eh? Count. The. Walls.",
        choices: [
          { text: "Walking. Like me. How do you know it isn't me?", effects: { like: +2 },
            next: { text: "*He goes very still, then laughs once, quiet.* ...bravo, amico. Five levels and you ask the question it took the others a YEAR. Scally doesn't know. That is the honest answer, the only one in stock. But the hidden one never asks 'is it me'. The hidden one asks 'who do you suspect'. *He winks, and there is no play in it at all.* Keep asking your question. It is good armour." } },
          { text: "Then I'll find them before they find me.",
            next: { text: "*He sucks air through his teeth.* Gently, gorilla, gently. Down here, 'finding' happens to BOTH parties at once. You want to hunt? Hunt with your EARS. The day you notice a silence walking past you... you come tell Scally FIRST, eh?" } },
          { text: "Sounds like ghost stories to keep the new tenant scared.", effects: { like: -3 },
            next: { text: "*The temperature through the glass drops.* ...sì. Stories. *He rearranges stock, not looking at you.* Four people in four windows, all frightened of the same nothing, the same night. Quite the coincidence, eh? When you meet it, and down you go, so you will, remember you called it a story. No refunds on advice, amico." } },
        ] } }) },

  /* -- depth 5 . Bee: the hypothesis (her ask, dressed as methodology) -- */
  { char: "littlebee", depth: 5, make: () => ({
      id: "hypothesis", story: true, once: true,
      label: "*She's drawn something on the glass in the fog of her breath.*",
      effects: { like: +1, flag: "ask-bee" },
      node: { text: "*It's a column of boxes, windows, an' a wee stick figure walkin' down past them to a scribble at the bottom.* Workin' hypothesis. The render's thinnest at the bottom. Has to be: the seams get wider every level down, I MEASURE them. An' a system's always cheapest where it thinks nobody goes. *She taps the scribble.* So: somethin' mobile, that's you, don't preen, reaches the substrate, an' the boundary conditions that keep five people filed in wall-frames like SLIDES get rewritten. *She steps back, an' the next bit costs her:* I can't test it meself. First time in me life the methodology needs somebody else's legs. So there it is. That's me askin'. I'm not doin' a speech about it.",
        choices: [
          { text: "Then I'm your legs. Let's prove it.", effects: { like: +2 },
            next: { text: "*She nods once, brisk, an' has to do a wee bit of housekeepin' with her face before she turns back.* ...grand. Cohort of two. You walk, I measure, an' between us we make this place into DATA. Log everythin': seams, sounds, anythin' the walls do twice. Yer a research assistant now. Worst pay in science, but yer name goes on the paper. Second author. Don't push it." } },
          { text: "I'll get you out of there, Bee. I swear it.", effects: { like: -2 },
            next: { text: "*Her jaw sets like a gate closin'.* Don't SWEAR things at me. A promise is a hypothesis with no data an' a sample size of heartbreak. *She softens exactly one degree.* ...I know how ye meant it. But down here I run on EVIDENCE. So don't promise. Just keep showin' up at this window, level after level. THAT'S the statistic I'll bet on." } },
          { text: "And if the hypothesis is wrong?",
            next: { text: "*She looks at ye steady, an' there's respect in it.* Then we're wrong PROPERLY, with error bars, an' we form a new one. That's all science ever was: bein' wrong in decreasin' amounts. *Quieter.* ...but between us an' no clipboard: it's not wrong. I've seen the seams down there. Somethin' at the bottom is holdin' its breath." } },
        ] } }) },

  /* -- depth 5 . Sian: the bug report (his ask, filed as a ticket) -- */
  { char: "sian", depth: 5, make: () => ({
      id: "glitch-hunt", story: true, once: true,
      label: "*He's miming typing on a keyboard that isn't there.*",
      effects: { like: +1, flag: "ask-sian" },
      node: { text: "Composin' a ticket, hai. Bug report. 'SUMMARY: player character, that's me, unable to exit designated window volume. STEPS TO REPRODUCE: exist. EXPECTED BEHAVIOUR: doors.' *He mimes hittin' enter, then deflates a wee bit.* ...no submit button in here, but. That's the one piece of UI they forgot. *The idea arrives on his face like a sunrise.* HERE. You. Yer headin' DOWN, right? Every build's got a dev room at the bottom. Always, hai. It's LAW. When ye find it, submit this for us. Priority ONE. 'Let the big lad out.' An', eh... mark it urgent, hai. Not that it's urgent. Mark it urgent.",
        choices: [
          { text: "Priority one. 'Let the big lad out.' Filed.", effects: { like: +2 },
            next: { text: "*He does a full fist-pump; if the window wasn't there ye'd have been hugged.* YES. CLASS. You deliver, the devs triage, I'm out by the next sprint, hai. First thing when the ticket clears: chips. Second: charge Brenda. Third: find Bee an' settle an outstanding INVOICE. *He points at ye.* Yer the best patch this game ever shipped. Go WAY." } },
          { text: "And if there's no dev room down there?", effects: { like: -2 },
            next: { text: "*The typing hands come down slowly.* ...there's always a dev room. *He says it the way a man says a prayer he's checked the sources on.* Ye don't build somethin' this size without a back door for the builders. I built MENUS an' even the menus had one, hai. *He turns Brenda's servo over an' over.* There's a dev room. There's a dev room or there's... *the sentence looks over the edge, an' he hauls it back.* There's a dev room. Mind the fog." } },
          { text: "Why not file it yourself? You're the one who works there.",
            next: { text: "*He laughs, flatter than either of ye expected.* WORKED, hai. Past tense. An' even then, ye think the likes of me had access? I filed tickets INTO the void an' the void marked them 'known issue'. *He shrugs, big an' deliberate.* Nothin' gets fixed till somebody carries it into the room in PERSON. Yer me person. Congrats on the promotion, hai." } },
        ] } }) },

  /* -- depth 5 . Dalypso: the houseguest list (his ask, via allocations) -- */
  { char: "dalypso", depth: 5, make: () => ({
      id: "houseguest", story: true, once: true,
      label: "*He's counting something on his fingers, frowning.*",
      effects: { like: +1, flag: "ask-dalypso" },
      node: { text: "Bedrooms. *He says it like a team sheet.* FOUR of them, an' I've been doin' the allocations. Master's mine, obviously. Sian gets the second: he snores, but he's SENIORITY. Homiss in the third, on the CONDITION he's on time for breakfast, which he won't be, but a house needs one ongoing dispute or it's not a home. *He gets to the ring finger an' stops.* Fourth one's... *the whole performance goes quiet for a second* ...goin' spare. For whoever gets us there. *He spins the ball once.* Yer on the TEAM SHEET, is what I'm tellin' ye. Get us to the house.",
        choices: [
          { text: "I'll get you to that front door. All of you.", effects: { like: +2 },
            next: { text: "*He nods the way men nod at funerals an' cup finals, too much in the chest for the face.* ...right. Well. GOOD. *He bounces the ball twice, hard, gettin' his voice back off it.* First dinner's a fry, an' NOBODY argues the fry. Fourth bedroom's got the mornin' light, by the way. I wasn't givin' ye the worst one. I want that NOTED." } },
          { text: "Bee doesn't get a room, then?", effects: { like: -2 },
            next: { text: "*The ball stops dead under his palm.* ...she can have the... there's a SOFA BED in the... *he wrestles himself, and loses, and knows it.* Ach. FINE. She gets the fourth bedroom, YOU get the attic, I'll CONVERT it, it'll be GORGEOUS, skylights, the LOT. An' tell NOBODY I did that without a fight. I've a reputation." } },
          { text: "You've thought about this a lot, haven't you.",
            next: { text: "*For once he doesn't fire back inside the second.* ...every night. Some fellas count sheep. I do the walk-through: hall, stairs, landin', which door creaks. I've DECIDED which door creaks, ye have to have one. Where the tree goes at Christmas. *A beat.* It's not sad, before ye say it. It's TRAININ'. Every good keeper walks the pitch before the game." } },
        ] } }) },

  /* -- depth 5 . Homiss: the setlist (coping, with a running order) -- */
  { char: "homiss", depth: 5, make: () => ({
      id: "setlist", story: true, once: true,
      label: "What are you scribbling over there?",
      effects: { like: +1 },
      node: { text: "*He holds up a new napkin, covered edge to edge.* The reunion gig! For when the phones come back. I'm doin' the runnin' order. Openin' with the forty-minute drone, warm the room up. Then Sian does his thrashy bit an' we all mind our ears. Bee's not musical but she'll HECKLE, which is percussion of a kind. Dalypso on the door. Nobody gets past Dalypso. *He looks at the napkin a long time.* ...it's a good bill, wha'? Tell me it's a good bill.",
        choices: [
          { text: "It's a great bill. I want front row.", effects: { like: +2 },
            next: { text: "*He writes it down, actually writes it: FRONT ROW, ONE (1).* Done. Reserved. *He tucks the napkin away like a man bankin' somethin'.* That's the thing about a gig on the books, see. A man with a gig on the books isn't trapped anywhere. He's just... between venues. *The grin wobbles only the once.* Between venues. That's us to a TEE." } },
          { text: "Put me down to open. I do a tight five of gate reviews.",
            next: { text: "*He wheezes.* SUPPORT ACT: THE COURIER. 'Depth six gate: flat, wouldn't rise, one star.' *He's writin' it down through the laughin'.* Yer IN. We'll bill ye as 'special guest' so if yer terrible we can deny knowin' ye. That's showbusiness. Bee taught me the ethics of it." } },
          { text: "Homiss. The phones aren't coming back on their own.", effects: { like: -3 },
            next: { text: "*The pen stops.* ...I know. *Ye weren't ready for him to just SAY it, an' neither was he.* Sure why d'ye think I keep the bill UPDATED? If it's all ready, then the day SOMEBODY does somethin', there's no delay. We go straight to soundcheck. *He looks up, eyes too bright.* That's not denial, that's PREPARATION. There's a difference. There is. Away an' let me work." } },
        ] } }) },

  /* -- depth 6 . Scally: advertises the impossible jar -- */
  { char: "scally", depth: 6,
    available: ctx => ctx.character.inventory.some(i => i.id === "mayo"),
    make: () => ({
      id: "impossible-stock", story: true, once: true,
      label: "*He's grinning even more than usual.* What?",
      effects: { like: +1, flag: "mayo-known" },
      node: { text: "Amico! Fortuna! Something impossible fell into Scally's pockets. *He opens his coat a crack: a glass jar, pale and full.* Mayonnaise. REAL mayonnaise. Scally thinks you know somebody who would give his ARM for this. *He snaps the coat shut.* For you? A price most reasonable. You ask Scally to trade, eh?" } }) },

  /* -- depth 6 . Scally: the insurance (a shakedown dressed as kindness) --
     The trap runs BACKWARDS on purpose: paying the nice man reads as
     weakness; laughing the racket off earns his respect. Nobody warns
     the player. */
  { char: "scally", depth: 6, make: () => ({
      id: "protection", story: true, once: true,
      label: "*He beckons you close, all concern.* Trouble?",
      effects: { like: +1 },
      node: { text: "*The voice goes velvet.* Amico. Scally worries for you, walking the halls all alone. The hidden one. The dark windows. The maze in one of her MOODS. *He produces a small square of tin with a hole punched in it.* So! For a very modest consideration, say five little tokens a level, Scally makes sure certain... parties... know you walk under his protection. *The grin is warm as soup.* Is not a shakedown, capisce. Is INSURANCE. Between friends.",
        choices: [
          { text: "*Pay the five tokens.* Cheap, for peace of mind.", effects: { cost: 5, like: -3 },
            next: { text: "*The tin square changes hands. The grin stays exactly where it is, and something behind it files you under a new heading.* Prego, prego. *He pockets the tokens without counting them, which is how you know they were never the point.* Free advice, VALUED CLIENT: the ones who pay for safety, the maze can smell it on them. Was a test, the insurance. You pass the WRONG way. But Scally keeps the coins anyway. Lessons cost." } },
          { text: "*Laugh.* Protection? You can't even leave the window.", effects: { like: +2 },
            next: { text: "*A beat. Then he CACKLES, delighted, smacking the glass.* AH! You SEE it! Bravissimo! *He flicks the tin square away over his shoulder.* Scally protects NOTHING. Scally is a small man in a wall with a loud coat. *He leans in, and the grin means it now.* But a mouse who cannot be sold the fear, THAT mouse is worth knowing. No charge for today. Today was a pleasure." } },
          { text: "Threaten me again and you'll need the insurance.", effects: { like: -2 },
            next: { text: "*He puts both hands up, wounded, retreating into the coat.* Madonna! Such teeth. Nobody threatens, nobody threatens. Is a MISUNDERSTANDING of the retail experience. *But the eyes have gone flat and careful, and they stay that way.* ...you hear a wolf in every salesman, amico. Down here that is HALF right, and the half you get wrong will cost you friends you do not know you need yet." } },
        ] } }) },

  /* -- depth 7 . Homiss: he used to hear the others (needs the relay done) -- */
  { char: "homiss", depth: 7,
    available: () => hasFlag("msg-s2h-done"),
    make: () => ({
      id: "pipes", story: true, once: true,
      label: "Do you ever hear the others around here?",
      effects: { like: +2, peers: [{ of: "homiss", toward: "scally", delta: +2 }] },
      node: { text: "*The plucking slows.* ...used to. Voices, comin' through the pipes. Aul' buildin', sound carries. Scally givin' out about somethin', somebody laughin', somebody cryin' the odd time. Grand company, in its way. *A long pause.* Stopped a while back. All of it, the one night. Just the hum now. *He snaps back onto a grin.* Sure everyone's busy, that's all that is. Busy busy busy." } }) },

  /* -- depth 8 . Scally: what a data vial is (the vial appears here) -- */
  { char: "scally", depth: 8, make: () => ({
      id: "vial-rumor", story: true, once: true,
      label: "What's a data vial, exactly?",
      effects: { like: +1 },
      node: { text: "*His eyes gleam.* Concentrated Protocol, amico. Memory, distilled: a little bottle of somebody's yesterday. Down this deep, sometimes one works itself loose out of the walls. Me, I pay handsome. *A beat.* ...I am not the only one down here who wants one, eh. But nobody pays like Scally pays." } }) },

  /* -- depth 9 . Homiss: clocks the saint's finger (it appears here) -- */
  { char: "homiss", depth: 9,
    available: ctx => ctx.player.inventory.some(i => i.id === "saints-finger"),
    make: () => ({
      id: "bone-snap", story: true, once: true,
      label: "*He's staring at your pocket.*",
      effects: { like: +1 },
      node: { text: "*He nods at what you're carrying.* ...is that a knuckle? *He holds his plectrum up next to it.* Snap, wha'. Fella sold me this one swore blind it came off a saint. I'd say he was coddin' me. *He looks at yours a moment longer than he means to.* ...I'd NEARLY say it. I'd not go wavin' that around. There's a man up the way would sell his own ma for the like of it." } }) },
  /* -- depth 10 . the capstone pair -- */
  { char: "scally", depth: 10, make: () => ({
      id: "ten-deep", story: true, once: true,
      label: "Ten levels down. How deep does this place go?",
      effects: { like: +2, flag: "depth10" },
      node: { text: "*For a long moment, no grin at all.* Deeper, amico. Deeper than Scally ever went. The operators before you... around here is where the walls stopped writing back to them. You have seen the scribbles, eh? *He taps his temple.* Keep talking to us. The ones who stopped talking, the maze, she kept them." } }) },

  { char: "homiss", depth: 10, make: () => ({
      id: "ten-normal", story: true, once: true,
      label: "Still a grand normal day, Homiss?",
      effects: { like: +1 },
      node: { text: "*He looks at ye for a long second.* ...d'ye want the honest answer or the good answer? *And this time he doesn't run on ahead an' pick for ye. He waits, an' the waitin' is the loudest thing in the corridor.*",
        choices: [
          { text: "The honest answer. I can carry it.", effects: { like: +1, flag: "homiss-honest" },
            next: { text: "*He nods, slow, like a man agreein' to surgery.* ...the honest answer is I don't know what day it is. Not the date. The DAY. Whether it's one long day or a thousand short ones. I tune strings that are already in tune because the tunin' is the only clock I have left. An' some mornin's I forget to do the cheerful bit for the first few minutes, an' those minutes are so quiet I could DROWN in them. *He looks up.* ...nobody's ever taken the honest answer off me before. Heavier than it looks, wha'? An' lighter, somehow, now there's two of us holdin' it. Go on. Ask me somethin' mad. I've EARNED somethin' mad." } },
          { text: "The good answer. Give me the good answer.", effects: { like: +1 },
            next: { text: "The GOOD answer! *He inflates on the spot, visibly relieved, an' the performance is magnificent, an' ye can see every seam in it.* It's a GRAND day! Tenth grand day in a row, or however many. They do blur, the grand ones. That's how ye KNOW they're grand! Weather's holdin', the neighbours are quiet, SOME might say too quiet, ha, an' the music's comin' along GREAT. *He runs down like a music box, an' for a half-second the honest answer looks out through the good one's windows.* ...thanks for takin' this one. Some days a man hasn't the arms for the other. Ask me somethin' mad." } },
        ] } }) },

  /* -- depth 10 . Bee: the cohort report -- */
  { char: "littlebee", depth: 10, make: () => ({
      id: "ten-rounds", story: true, once: true,
      label: "Ten levels. Time for the cohort report, doctor.",
      effects: { like: +1 },
      node: { text: "*She's had it drafted for days.* Cohort report, depth ten, no anaesthetic. *She ticks them off at speed.* SCALLY: functional, transactional, patter up three percent, which in him is a tell. HOMISS: stable-presentin', denial load-bearin' but STRESSED. SIAN: *one half-beat, the only one she takes* copin' via framework. NEXT. DALYPSO: unreadable through the glass, which is either a renderin' artefact or the most important fact in this buildin'. An' YOU. *She looks at ye properly.* Subject five. Ten levels in an' still ASKIN' us things instead of takin' things. *She folds her arms.* Cohort assessment: fraying, fond, an' four-fifths trapped. Prognosis pendin' on subject five. No pressure. That was a lie. TOTAL pressure.",
        choices: [
          { text: "Then subject five had better not let the cohort down.", effects: { like: +2 },
            next: { text: "*The almost-smile makes it the whole way, briefly, like sun through a ward window.* ...good. Wear the pressure. It's LOAD, an' load is how ye know somethin' that matters is standin' on ye. *She turns back to her invisible charts.* Same time next level, subject five. Bring me somethin' the walls don't already know." } },
          { text: "And subject Bee? You skipped a name off that list.",
            next: { text: "*Caught. She stands very still, then gives it to ye straight.* ...subject B: instruments driftin' inside tolerances, sleep architecture a WRECK, emotional containment barely adequate. Runs on spite an' methodology, misses her horse, an' talks to a courier more than she plans to, because the courier's the only one down here who ISN'T behind glass. *She snaps the file shut with her voice.* There. Peer review complete. Quote me an' I'll deny the LOT." } },
          { text: "'Coping via framework'? That's all Sian gets?", effects: { like: -3 },
            next: { text: "*The stillness is instant an' total.* ...what would ye LIKE the entry to say? The LONG version? Where I chart the levels his 'hai' count started droppin'? Where I write down what happens to a mind like his when the framework goes, because I've MODELLED it, because modellin' is all I can do from inside a WALL?! *She rebuilds the clinical face one muscle at a time.* ...'copin' via framework' is the entry I can read out LOUD. The rest lives where I live. Don't audit my abbreviations, courier. Every one of them is a kindness to somebody. Mostly to me." } },
        ] } }) },

  /* -- depth 10 . Sian: double digits (the genre is wrong, hai) -- */
  { char: "sian", depth: 10, make: () => ({
      id: "double-digits", story: true, once: true,
      label: "Depth ten. Double digits, big man.",
      effects: { like: +1 },
      node: { text: "DOUBLE DIGITS, hai! *He high-fives the inside of the glass; ye supply the outside.* Ten levels! That's act two, OFFICIALLY. An' act two's where a game shows ye its TRUE genre. Act one played like a walkin' sim: gorgeous fog, chatty NPCs, collect-the-shinies. But act two's been servin' resource pressure. Isolation mechanics. Unreliable environment. *He stops pacin'.* That's survival horror dressed in a walkin' sim's clothes. An' the thing about survival horror, *the game-brain an' the fear underneath it workin' together now*, the resource they're really rationin' is never the tokens. It's the PEOPLE. Ye lose people as ye go. That's the genre contract. *A beat.* So here's me formally requestin' a genre shift. Tell the maze. Co-op comedy, hai. I'll take a RACIN' game at this point.",
        choices: [
          { text: "We're not losing anyone. The genre contract's getting broken.", effects: { like: +2 },
            next: { text: "*He looks at ye a long second, then nods, sharp, like somethin's been signed.* Sequence break. *The grin comes back with intent in it.* That's when the players do somethin' the design never budgeted for an' the whole genre falls over. Speedrunners do it to horror games all the TIME: finish the nightmare in DAYLIGHT. *He points at ye.* Yer the glitch, I'm the guide, an' the genre contract can take it up with LEGAL. Act two, me armpit. We're writin' act three ourselves." } },
          { text: "Survival horror has one other rule: the confident lad goes first.", effects: { like: -3 },
            next: { text: "*The grin freezes mid-frame.* ...the confident lad goes first. *He sits down slowly.* That's canon, that is. The lad who says 'it's grand, I've played these', he's the FIRST one the film takes. *He looks down at himself: the visor, the cheer, the whole costume of the confident lad.* ...why would ye SAY that to me? I know why. Yer not wrong. But there's things ye don't say in the HAUNTED HOUSE, hai, an' the CASTIN' is one of them. *He waves ye off, rattled behind the salvage of the grin.* Go on. Walk fast on the dark bits. I mean that." } },
          { text: "What would the racing game version of this place even look like?",
            next: { text: "*The question hits him like a defibrillator.* OH. Right: the maze, but yer KARTIN' through it. The fog's a slipstream mechanic. Tokens are boost. The windows are yer PIT CREW: I'm wavin' the board, Bee's callin' tyre strategy, Homiss is doin' the anthem, an' Dalypso's the race steward, contestin' EVERY overtake, his OWN included. Scally runs the merch stand. *He wipes an eye, buoyant again, an' entirely aware of what ye did.* ...aye. That's the game they should've built with all this fog. Someday, partner. GO. Yer in me racin' line." } },
        ] } }) },

  /* -- depth 10 . Dalypso: the mid-season review (agree at your peril) -- */
  { char: "dalypso", depth: 10, make: () => ({
      id: "season-review", story: true, once: true,
      label: "Ten episodes in. Give me the mid-season review.",
      effects: { like: +1 },
      node: { text: "*He's been WAITIN' for this. He actually stands up.* The mid-season review. 'MAZE', season one, episodes one through ten. Production design: FLAWLESS. Best fog on television. Supporting cast: exceptional. The wee shopkeeper's a scene-stealer, the musician's the heart, the doctor's the brains, an' the fella with the telly... *entirely straight-faced* ...criminally underused. LEAD performance: *he looks at ye* growin' into the role. Started wooden. Warmin' up GRAND. *He sits back down.* Overall: four stars. Docked the fifth because NOTHIN', an' I say this with love, NOTHIN' has HAPPENED. Ten episodes! No twist! The mystery box is still TAPED SHUT. *He folds his arms.* Well? Do ye concur with the review?",
        choices: [
          { text: "Concur? You're dead wrong. Everything's happening. You just can't see it from your sofa.", effects: { like: +2 },
            next: { text: "*His eyes LIGHT UP like a stadium on European night.* WRONG, am I?! Go ON then! 'Everything's happenin''. The WIRES, I suppose, the wee subtractions, the channel goin' dark. Ye call that PLOT? That's ATMOSPHERE, that's... *he stops, mid-swing.* ...actually. If ye assemble them... that's not atmosphere. That's a COLD OPEN. Ten episodes of cold open. *He sits down slowly.* I retract the complaint. This is PRESTIGE structure. The twist is comin' an' it's goin' to be ENORMOUS. *He points at ye, beamin'.* THAT'S a debate! Yer permanent now. Panel regular. Fight me again next level." } },
          { text: "Four stars is fair. Solid review, no notes.", effects: { like: -3 },
            next: { text: "*The silence that follows is the silence of a man watchin' his own funeral go by.* ...'no notes.' *He sits down slow.* I hand ye a review with a controversial star deduction SPECIFICALLY ENGINEERED to start a row, an' ye stamp it like a PASSPORT. D'ye know what agreement IS, in this house? It's the ref blowin' up early. Me da agreed with everythin' the last year of his... *he stops that sentence with a hand like a tackle.* ...four stars is NOT fair, by the way. It's a FIVE-star production sabotaged by pacin', which ye'd KNOW if ye'd argued. *He turns to the telly.* Away. Send up someone with a pulse." } },
          { text: "Criminally underused, is he? The telly fella?", effects: { like: +1 },
            next: { text: "*He tries to keep the pundit face on. He fails.* ...ye caught the wee dig. Aye. CRIMINALLY. The character's got RANGE: comedy, tragedy, a gorgeous house SUBPLOT they've done NOTHIN' with. Every episode it's the same three scenes: window, telly, ball. I'd write to the show, but the complaints line appears to be DOWN. *Mock-wounded, entirely delighted someone noticed.* Tell the writers, when ye reach them. The fella in episode four's ready for his ARC. He's done ten YEARS of prep." } },
        ] } }) },

  /* ================= the depth 2-4 introductions =================
     Little Bee (2), Sian (3) and Dalypso (4) only start spawning at
     their minDepth (characters.js); each fires at first meeting. */

  /* -- depth 2 . Little Bee: first contact, and the tenner --
     Roots the Bee/Sian relay: the least sentimental message ever
     composed by someone in love. */
  { char: "littlebee", depth: 2, make: () => ({
      id: "new-face", story: true, once: true,
      label: "*She's already sizing you up.* ...Hello?",
      effects: { like: +1, flag: "bee-looking" },
      node: { text: "*She talks like a stopwatch is runnin'.* New face. GOOD. Eyes front. Follow my finger. What year is it? Don't answer, yer pupils already did. Yer recent, still calibrated, an' MOBILE, which is the interestin' bit, because the rest of us are *she raps the glass* furniture. Name's Bee. Little Bee, if yer Scally. Now: somewhere below us there's a big lad from Cavan in a headset, actin' like this is the best thing since sliced pan. Sian. If ye find him, tell him... *the stopwatch stops for exactly one second* ...tell him he still owes me a tenner. That's the message. Say it EXACTLY.",
        choices: [
          { text: "He owes you a tenner. Word for word. Got it.", effects: { like: +2 },
            next: { text: "*She studies ye one more second, then nods once, like a clipboard snappin' shut.* ...grand. A courier that doesn't EDITORIALISE. Wasn't sure they made them anymore. Away with ye. An' if he tries to give ye the actual tenner, tell him that's NOT the point an' he knows it." } },
          { text: "A tenner? That's the whole message?", effects: { like: -2 },
            next: { text: "*The look she gives ye would strip paint.* Aye. That's the whole message. *A beat.* Some messages are a tenner on the OUTSIDE, an' what's inside is none of yer business. Deliver it or don't, but don't WEIGH it. That's not yer job." } },
          { text: "Why me?",
            next: { text: "Because ye've LEGS, an' because yer pupils say ye haven't learned to lie down here yet. *She's already turned half away.* That's the entire shortlist, in case yer feelin' special. Prove me right an' I'll upgrade ye to a name." } },
        ] } }) },

  /* -- depth 2 . Bee: the baseline (why the tests, and why it's love) -- */
  { char: "littlebee", depth: 2, make: () => ({
      id: "baseline", story: true, once: true,
      label: "Why do you keep staring at my pupils?",
      effects: { like: +1 },
      node: { text: "Because they TELL me things, which puts them ahead of most of the population down here. *She moves a finger; yer eyes follow; she notes it.* Whatever this place is, it runs on wetware, mine an' yours, an' hardware ye can't inspect degrades QUIETLY. So I take baselines. Reaction, recall, fluency. Every level, everyone I can reach, which as of the recent unpleasantness is: you. *A beat.* Yer my whole cohort now. Congratulations. Act like a decent sample size.",
        choices: [
          { text: "Baseline away, doctor. I'm all yours.", effects: { like: +2 },
            next: { text: "*Somethin' in her unclenches half a notch.* Right answer. First data point: sarcasm intact, compliance high, self-preservation pendin'. Come see me every level. I mean it. If yer numbers ever drift, I want to catch it while yer still YOU enough to be told." } },
          { text: "And who runs the tests on you?", effects: { like: +1 },
            next: { text: "*One second of complete stillness. Ye've stepped somewhere she didn't expect visitors.* ...I do. Same battery, same time, control an' subject in the one skull. TERRIBLE methodology, an' the best available. *She looks at ye a hair longer than she means to.* ...ask me that again some level. It's good for me an' I hate it." } },
          { text: "I'm not one of your lab rats.", effects: { like: -3 },
            next: { text: "*Flat as a chart with no pulse on it.* No. Lab rats get FED. *She folds her arms.* The maze is runnin' its own study on ye either way, an' its ethics board is worse than mine. I'm the one takin' notes on YOUR side of the glass. But suit yerself. Off ye trot. *She watches yer gait as ye go, an' writes somethin' down anyway.*" } },
        ] } }) },
  /* -- depth 3 . Sian: five stars, would recommend -- */
  { char: "sian", depth: 3, make: () => ({
      id: "just-a-game", story: true, once: true,
      label: "You seem... very relaxed about all this.",
      effects: { like: +1, flag: "met-sian" },
      node: { text: "Relaxed? I'm LIVIN', hai! This is the best VR ever built, an' I've built SOME of it. Well. Menus. *He spreads his arms at the corridor like a showroom.* Full locomotion, no motion sickness, NPCs with actual craic. No offence if yer an NPC, yer the best one. Whoever shipped this deserves a raise an' a lie-down. *He knocks the glass cheerfully.* Only bug I've found is this window won't let me through. Day-one patch, hai. They'll sort it.",
        choices: [
          { text: "Best build I've ever walked through, honestly.", effects: { like: +2 },
            next: { text: "SEE?! *He points at ye like ye've proved a theorem.* Another user gets it! The FIDELITY, hai. I've been in here HOW long an' the immersion hasn't broken ONCE. Not once! *He beams at the corridor, proprietorial.* ...not once. *The beam holds. It just costs a wee bit more than it did.*" } },
          { text: "Sian... this isn't a game. You know that, don't you?", effects: { like: -3 },
            next: { text: "*The grin doesn't drop. It LOCKS, which is worse.* ...hah. Aye. Good bit. Very immersive, hai. *He turns a controller over an' over.* 'Not a game.' Class. Because if it's not a game, then the timer I can't find is... an' the door I can't... *He stops. Puts the controller down with enormous care, like it's sleepin'.* It's a game. It's a five-star game an' yer a nine-star NPC an' I've levels to review. GOOD LUCK with yer quest. *He's very busy suddenly.*" } },
          { text: "Day-one patch? It's been out a while, by the look of the walls.", effects: { like: +1 },
            next: { text: "*He squints down the corridor at the crumblin' brick an' does visible QA in his head.* ...aye, the wear-an'-tear texturin' is class, isn't it. Lived-in. Environmental storytellin', hai. Every scuff's a design decision. *A beat.* ...it'd be some AMOUNT of design decisions, right enough. *He files that somewhere he doesn't look at.* Anyway! They'll patch the window. They patch everythin' eventually." } },
        ] } }) },

  /* -- relay . Sian: the tenner lands -- */
  { char: "sian",
    available: () => hasFlag("bee-looking") && !hasFlag("msg-b2s"),
    make: () => ({
      id: "bee-msg", story: true, once: true,
      label: "Bee says you still owe her a tenner.",
      effects: { like: +3, flag: "msg-b2s", peers: [{ of: "sian", toward: "littlebee", delta: +2 }] },
      node: { text: "*He goes up like a stadium.* SHE'S HERE?! Ye've SEEN her?! *He does an actual lap of the little room.* Of course she's here. She went in after the deep-render stuff, that's her idea of a spa day... wait. *He stops dead.* The tenner. She said the TENNER? Word for word? *The grin goes from big to true.* That's her sayin' she's grand, hai. That's code. We don't do soppy, we do DEBTS. Right. Message back, exact words: 'worth every penny.' An' tell her I've not found the gift shop yet, but when I do, she's gettin' the BIG horse. She'll know. There's no explainin' it, so don't ask, hai." } }) },

  /* -- relay . Bee: the reply comes home (min-depth 4 paces the chain) -- */
  { char: "littlebee", depth: 4,
    available: () => hasFlag("msg-b2s") && !hasFlag("msg-s2b-done"),
    make: () => ({
      id: "msg-back", story: true, once: true,
      label: "Sian says: 'worth every penny.' And something about a big horse.",
      effects: { like: +3, flag: "msg-s2b-done", peers: [{ of: "littlebee", toward: "sian", delta: +3 }] },
      node: { text: "*The laugh is out of her before she can arrest it, a proper one, headlong. She turns away from the glass until it's dealt with.* ...aye. Well. *When she turns back the face is fixed, but the eyes haven't signed the paperwork.* The big horse. The eejit. *A breath.* He thinks it's a game, doesn't he. Course he does. *Then, fast and fierce, like she's givin' ye a dosage:* DON'T tell him different. Not yet. D'ye hear me? His brain's happy, an' a happy brain lasts longer down here. That's not sentiment, that's NEUROLOGY. Let him have it a while longer." } }) },

  /* -- depth 4 . Dalypso: the house -- */
  { char: "dalypso", depth: 4, make: () => ({
      id: "new-gaff", story: true, once: true,
      label: "*He looks like a man waiting to be asked something.*",
      effects: { like: +1, flag: "heard-gaff" },
      node: { text: "*He was talkin' before ye finished walkin' up.* ...an' before ye ask, YES, it's true: I bought a house. *He pauses, magnanimous, to receive congratulations that have not yet been offered.* FOUR bed. SEMI-detached. South-facin' garden, an' I'll not repeat the price because it'd only upset ye. Ten years of overtime an' bad tea, but I DID it. First in the family to own their own roof. *He points a warning finger.* An' don't be sayin' 'sure when are ye ever home' like the lads did. That's not the POINT of a house. The point of a house is it's THERE. Waitin'. *He nods, satisfied.* Ye'll have to come round. Everyone will. Soon as things... settle down a bit.",
        choices: [
          { text: "First in the family. That's no small thing. Fair play.", effects: { like: +2 },
            next: { text: "*For one entire second the opinions stop, and underneath them is a man whose da rented his whole life an' never once complained where the kids could hear.* ...aye. Well. *He clears his throat with a sound like a gearbox.* It's only bricks. *It is very obviously not only bricks.* C'mere, the GARDEN though. Have I told ye about the garden? I have. I'm tellin' ye again. SOUTH. FACIN'." } },
          { text: "Sure when are you ever home, though?", effects: { like: -4 },
            next: { text: "*The silence lands like a dropped trophy cabinet.* ...I TOLD ye not to say that. I told ye AS ye were sayin' it. *He holds the ball against his chest like a back four.* The lads said it as a joke an' it wasn't funny THEN, an' now the commute's LONGER, that's all, an'... *he stops himself, jaw workin'.* The house is THERE. It doesn't need me IN it to be MINE. *He turns to the telly.* Programme's startin'. It's not, but it's startin'." } },
          { text: "What's the first thing you'll do when you walk in?",
            next: { text: "*He answers instantly, because he has rehearsed this in the dark more times than he'd ever admit.* Kettle on. Radio, not the TELLY, the RADIO, the good station. Cup o' tea in the good room, standin' up, coat still ON, like a fella inspectin' his kingdom. THEN the coat comes off. That's the ceremony. What are ye, RAISED IN A FIELD? *A beat. Softer, to the middle distance:* ...it'll keep. Good houses keep." } },
        ] } }) },

  /* -- depth 5 . Bee: what she came down here for -- */
  { char: "littlebee", depth: 5, make: () => ({
      id: "the-jump", story: true, once: true,
      label: "Why would anyone come into this place on purpose?",
      effects: { like: +2, flag: "bee-seams" },
      node: { text: "*For once she doesn't answer at speed. She looks down the corridor like it's a bad X-ray.* Because it was the trip of the century, that's why. The Protocol got passed round certain circles as the last word in psychedelics: direct synaptic render, no chemistry, no comedown. A trip ye could WALK AROUND in. I'd spent six years watchin' other people's neurons light up on a monitor, so aye. I jumped. Eyes open. *A beat.* An' it was beautiful. It was the single most beautiful... an' then the doors didn't open. *She taps beside her eye.* Trip never ended, if ye want the truth. I still see the seams at the edges of things. An' lately *the voice goes flat and careful* the seams are wider. Somethin's rerenderin' things down there, an' I don't think it's for OUR benefit. Watch where the walls meet." } }) },

  /* -- depth 6 . Sian: the first crack (played for laughs, lands like ice) -- */
  { char: "sian", depth: 6, make: () => ({
      id: "menu-gone", story: true, once: true,
      label: "Everything alright, Sian?",
      effects: { like: +1 },
      node: { text: "What? Aye! Grand! It's only... *he laughs, an' starts again* ...funny one, hai. I went to check me play time. Pause menu. Every headset ever shipped, same gesture, I could do it in me sleep. *He does it, at the empty air.* Nothin'. No menu, no overlay, no guardian grid. Two days I've been at it. *He shrugs enormously.* Genius design, if ye think about it! TOTAL immersion! Can't break the fourth wall if they never built one, hai! *He goes back to his tinkerin'. A moment later, quietly, not really to you:* ...they always build one, but.",
        choices: [
          { text: "No guardian grid either? That's not a design choice, that's a red flag.", req: { attr: "intelligence", level: 6 }, effects: { like: +2 },
            next: { text: "*He stops tinkerin' entirely an' looks at ye like ye've talked shop in his mother tongue.* THANK ye, hai! Ye can't SHIP without a guardian system. It's not a feature, it's LIABILITY LAW. No legal team on EARTH signs off on... *he throttles back with an effort ye can see.* ...unless whoever shipped it wasn't worried about gettin' sued. Which would mean the users can't... *he taps the wrench twice on the sill* ...anyway. ANYWAY. Good catch. Yer wasted walkin'. Ye should be in QA." } },
          { text: "Total immersion. You're living the dream, big man.", effects: { like: +1 },
            next: { text: "LIVIN' it, hai! *The grin comes back up to full brightness, glad of the assist.* D'ye know what I paid for me first headset? Don't ask. An' the immersion broke if ye SNEEZED. This is what we were promised back when the future was comin'. *A half-beat.* ...be some laugh if the future came an' forgot to put the exit in. *He laughs. Ye laugh. Neither laugh has much floor under it.*" } },
          { text: "Two days at one gesture? Maybe give it a rest.", effects: { like: -3 },
            next: { text: "*The hand doin' the gesture stops mid-air.* ...give it a REST? *It's the first time ye've seen him genuinely stung.* If yer phone lost its home button ye'd give it a REST, would ye? It's not a HOBBY, hai. It's how ye know yer the one HOLDIN' the phone. *He goes back to the empty air, doggedly.* I'll find it. It's in here somewhere. They always build one." } },
        ] } }) },

  /* -- depth 6 . Dalypso: the Tuesday ultimatum (roots his relay) -- */
  { char: "dalypso", depth: 6, make: () => ({
      id: "tuesday", story: true, once: true,
      label: "You look like a man composing a speech.",
      effects: { like: +1, flag: "msg-d2h" },
      node: { text: "*He is, visibly, a kettle at the boil.* You. You talk to Homiss. Don't deny it, I've HEARD. *He draws himself up.* Ye can deliver a message. Word for word, now: band practice. Was. TUESDAY. Was I standin' there with me amp an' me good extension lead like a spare tool? I WAS. Two hours! Not so much as a text! *The finger comes down slowly, an' under the outrage somethin' older an' softer shows through.* ...the man's timekeeping needs to be eradicated ENTIRELY. Tell him that. Ah... just tell him the Tuesday bit. Go on." } }) },

  /* -- depth 6 . Bee: sides (the first open tug-of-war over the player) -- */
  { char: "littlebee", depth: 6, make: () => ({
      id: "sides", story: true, once: true,
      label: "*She's watching you like a scale she's about to read.*",
      effects: { like: +1 },
      node: { text: "Right. Awkward one. Stand still. *She doesn't do preambles, so this is the preamble.* The wee man above us has started ACQUIRIN' things. Impossible things. An' when a market suddenly stocks miracles, ye ask where the supplier's standin'. NOBODY knows where Scally's supplier is standin'. Includin', I'd wager, Scally. *She holds up a hand.* I'm not sayin' don't deal with him. I'm sayin': anythin' strange comes through yer hands, anythin' that makes the back of yer neck vote no, ye bring it PAST this window first. That's the ask. I'll know if ye haggle me down.",
        choices: [
          { text: "Deal. You get first look at anything strange.", effects: { like: +2, flag: "bee-first" },
            next: { text: "*She nods, one sharp dip, treaty signed.* Good. That's the supply chain SUPERVISED. *For a second the clinical face slips an' somethin' warmer looks out.* ...an' don't be thinkin' this is me against Scally. I LIKE the wee chancer. That's the problem. The things he's reachin' for lately, I want to see them before they see HIM. Yer not spyin'. Yer upstream quality control." } },
          { text: "I don't pick sides. I carry for everyone or no one.", effects: { like: -2, flag: "neutral-broker" },
            next: { text: "*A long exhale through the nose.* 'Neutral.' *She says it like a diagnosis she doesn't love.* Switzerland of the stairwell. Fine. Principled, even. But hear THIS much: neutral works grand until the day somethin' comes through yer hands that isn't neutral ABOUT US. On that day, wee courier, yer principle better know which way it jumps. *She turns back to her counts.* Off ye go. I'm not cross. I'm CALIBRATIN'." } },
          { text: "You want me to spy on Scally for you?", effects: { like: -3 },
            next: { text: "*Her head comes round slow, like a turret.* SPY. *One syllable, dropped from a height.* Did I ask what he SAYS? One solitary secret out of that coat? I asked ye to show me DANGEROUS OBJECTS before they reach me FRIEND. That's not espionage. That's occupational health an' safety for people I love. *She turns away, genuinely stung.* ...the fact ye heard it as spyin' tells me somethin' about the company yer keepin' upstairs. NEXT patient." } },
        ] } }) },

  /* -- depth 6 . Homiss: the rumour of the jar -- */
  { char: "homiss", depth: 6,
    available: () => hasFlag("mayo-stocked"),
    make: () => ({
      id: "the-jar", story: true, once: true,
      label: "*He's humming, badly, and watching you sidelong.*",
      effects: { like: +1 },
      node: { text: "*The hummin' stops the moment ye stop walkin'.* Grand day! Grand... listen. LISTEN. *He's at the glass in one step.* A wee bird, an' by a wee bird I mean I heard the wee man SHOUTIN' about it two floors up, says there's a JAR in circulation. *His voice drops to a reverent hush.* The good stuff. The white gold. The only condiment with a SOUL. *He grips the window frame.* I'm not askin' ye to do anythin'. I'm only sayin': there's a man at this window with savin's, prospects, an' a MORAL CLAIM. An' if that jar was to wander down the stairs... that man would remember it to his dyin' day. Which down here could be a very long an' grateful time.",
        choices: [
          { text: "If the jar exists, it'll find its way to you. Somehow.", effects: { like: +2 },
            next: { text: "*He points at ye, too moved for grammar.* You. YOU. THIS is what I do be tellin' the wall about ye. *He attempts dignity.* No rush now. No pressure. A SEALED jar keeps indefinitely, I've done the readin'. *He picks up the bass, puts it down, picks it up.* ...ye'd want to see the wee man SOON though, wha'? Markets do be volatile." } },
          { text: "Scally's asking thirty-five tokens for it. Start saving.", effects: { like: +1 },
            next: { text: "THIRTY-F... *he does the sums out loud, appalled an' committed in the same breath* ...that's ROBBERY. Extortion of a man's SOUL through his sandwiches. I'll pay it. Obviously I'll pay it, but I want it NOTED that I'll pay it FURIOUS. *He starts turnin' out his pockets: a plectrum, lint with promise.* ...how many tokens d'ye reckon a napkin fetches these days? Askin' for me. Not even for a friend. ME." } },
          { text: "It's mayonnaise, Homiss. It's eggs and oil. Have some dignity.", effects: { like: -4 },
            next: { text: "*He recoils like ye've spat on the bass.* EGGS an' OIL?! That's like sayin' music is AIR WOBBLIN'. *He points a tremblin' finger.* Emulsification is the closest thing to a MIRACLE the kitchen ever produced. Two things that HATE each other, holdin' together, smooth as a hymn. If that's not somethin' worth wantin' in a place like THIS, I don't know why either of us is still talkin'. *He turns to the wall.* ...the WALL wouldn't have said it. An' the wall's said some quare things." } },
        ] } }) },

  /* -- relay . Homiss: which Tuesday (min-depth 7 paces the chain) -- */
  { char: "homiss", depth: 7,
    available: () => hasFlag("msg-d2h") && !hasFlag("msg-h2d"),
    make: () => ({
      id: "tuesday-reply", story: true, once: true,
      label: "Dalypso says: band practice was TUESDAY.",
      effects: { like: +2, flag: ["msg-d2h-done", "msg-h2d"], peers: [{ of: "homiss", toward: "dalypso", delta: +2 }] },
      node: { text: "*The plucking stops. He laughs, an' then the laugh forgets what it was doin' halfway through.* ...Tuesday. Aye. That'd be Dalypso. Standin' there with the good extension lead, ragin'. *He counts nothin' on his fingers, an' this time he counts a long while.* ...here. Which Tuesday would that be, now? Because the days do be slippy, down... AROUND here... *he stops himself, an' when he speaks again it's careful an' small.* Tell him I'm sorry. Tell him I'll be at the next one, an' the first round's on me. An' tell him he was right to be cross. He's always right to be cross. It's one of the great constants, like the speed of light." } }) },

  /* -- relay . Dalypso: the apology lands (min-depth 8) -- */
  { char: "dalypso", depth: 8,
    available: () => hasFlag("msg-h2d") && !hasFlag("msg-h2d-done"),
    make: () => ({
      id: "tuesday-lands", story: true, once: true,
      label: "Homiss says he's sorry. He'll be at the next one.",
      effects: { like: +2, flag: "msg-h2d-done", peers: [{ of: "dalypso", toward: "homiss", delta: +4 }] },
      node: { text: "*He opens his mouth for the rant he's been keepin' warm for days, an' nothin' comes out.* ...he said SORRY? Homiss? *He rubs the back of his neck, thrown entirely. A man ready for war, handed a cup of tea.* Well. Right. Good. Because it WAS Tuesday, an' I WAS... *he runs down like a wind-up toy, an' what's left when the outrage drains off is just fondness.* ...ah, he's a gentleman. Always was. Just a LATE one. *He picks the ball up an' puts it down again.* Tell him the door's always open. The new gaff. He knows the... well. He doesn't know the address. *A tiny hitch, painted over at speed.* Tell him ANYWAY." } }) },
  /* -- depth 7 . Bee: count his walls --
     Her suspicion of Dalypso, in the open. If Scally's already given the
     "count the walls" warning the echo is deliberate. */
  { char: "littlebee", depth: 7, make: () => ({
      id: "count-his-walls", story: true, once: true,
      label: "You keep frowning in the same direction. What's down there?",
      effects: { like: +2, flag: "bee-suspects" },
      node: { text: hasFlag("warned-hidden")
        ? "*She checks the corridor both ways first, which from her is a siren goin' off.* The fella with the football. Dalypso. *She holds up a hand.* I know. Sian loves him, an' Sian's an excellent judge of everything except software an' people. But listen: mine breathes. Homiss's breathes. Even Scally's breathes. The glass gives, a hair, like somethin' alive is standin' behind it. HIS doesn't. His window is a PICTURE of a window, an' the man in it just bought a house he never goes to an' watches channels that don't exist. *She leans in.* Scally told ye to count the walls, didn't he. Aye. Well. I never compared notes with the wee man in me LIFE, an' I'm tellin' ye the same thing. Start with Dalypso's."
        : "*She checks the corridor both ways first, which from her is a siren goin' off.* The fella with the football. Dalypso. *She holds up a hand.* I know. Sian loves him, an' Sian's an excellent judge of everything except software an' people. But listen: mine BREATHES. Homiss's breathes. The glass gives, a hair, like somethin' alive is standin' behind it. His doesn't. His window is a PICTURE of a window, an' the man in it just bought a house he never goes to an' watches channels that don't exist. *She leans back, arms folded.* Maybe it's nothin'. Maybe he's just... rendered different. But next time yer down there, count his walls for me. Ye'll know it when ye see it. Or ye won't, an' THAT'S what worries me.",
        choices: [
          { text: "Alright. I'll count his walls.", effects: { like: +2, flag: "agreed-count" },
            next: { text: "*She lets out a breath she's been holdin' since before ye arrived.* Good. Quietly, mind. If I'm wrong, no harm done. If I'm RIGHT... *for once the speed of her is completely gone* ...then the kindest man in the maze is a picture of the kindest man in the maze, an' I need to know which of those is mindin' my Sian's back. *She snaps back to pace.* Count. Report. Tell NOBODY between here an' there." } },
          { text: "He's harmless, Bee. Kindest one down here, honestly.", effects: { like: -3, flag: "defended-dalypso" },
            next: { text: "*The look she gives ye is almost gentle, which from her is devastatin'.* Aye. He IS kind. I'd BUILD a man like that if I wanted someone trusted fast. *She leans in.* Ye've told me his OUTPUTS, an' his outputs are lovely. I'm askin' about his ARCHITECTURE. The one thing charm can't fake is the glass givin' when the lungs behind it fill. *She steps back.* 'Harmless.' The word people use when they've stopped lookin'. I'd thought better of yer instruments." } },
          { text: "And if I count them and his window DOES breathe?",
            next: { text: "*She blinks, an' then, God help ye, she almost smiles.* Then I'm WRONG, an' bein' wrong here would be the best news of me year. *The finger comes up.* That's why ye count, d'ye see. Not to convict the man. To let me put the file DOWN. Science isn't suspicion. It's the price of gettin' to STOP suspectin'. Now go. Count." } },
        ] } }) },

  /* -- depth 7 . Sian: co-op partner (and the question he can't hold in) -- */
  { char: "sian", depth: 7, make: () => ({
      id: "co-op", story: true, once: true,
      label: "*He waves you over before you're even close.*",
      effects: { like: +1 },
      node: { text: "Right, it's decided: yer me co-op partner. Official, hai. This game's clearly balanced for two: you've the locomotion, I've the game sense, an' between us we've one complete player. *He's grinnin', but somethin' underneath it is pacin' like a dog before thunder.* An' as yer partner, I get intel, right? So. Ye've seen the other windows. Ye've seen... HER window. Bee's. *He abandons the casual all at once, like armour comin' off.* Just tell me how she is. Straight, hai. I can take straight.",
        choices: [
          { text: "She's sharp as ever. Running tests on me every level.", effects: { like: +2 },
            next: { text: "*The relief hits him so hard he has to hold the window frame.* Tests. TESTS! *He laughs, too loud, an' doesn't care.* If Bee's runnin' her tests, Bee's BEE, d'ye follow? The day that woman stops collectin' data is the day ye worry. *He knocks the glass twice.* Right. Co-op protocol: ye keep passin' her tests, ye keep tellin' me about it, an' I'll keep bein' able to do this. All of this. Best trade in the buildin'." } },
          { text: "She's worried about you, Sian.", effects: { like: -2 },
            next: { text: "*The grin stays up a full second after the eyes leave it.* ...worried? About ME? *A laugh that's mostly airflow.* She doesn't DO worried. Ten years, I've seen her worried twice, an' both times she was RIGHT. *He looks down the corridor, an' whatever he's calculatin' doesn't land anywhere good.* ...tell her I'm grand. Tell her I said somethin' funny an' confident. Ye'll think of the wordin' on the way down. *He turns back to the workbench, an' the tinkerin' is very loud for a while.*" } },
          { text: "Co-op, is it? What do I get out of this arrangement?",
            next: { text: "*He counts off on his fingers, instantly himself again.* One: me encyclopaedic knowledge of every game mechanic since PONG, free of charge. Two: pit crew privileges when Brenda rides again. Three: the craic, which is self-evidently premium. An' four: *he leans in, mock-solemn* a friend on the INSIDE of the walls. D'ye know how rare that is? The windows are all TAKEN. *He sticks a hand against the glass for a shake it can't complete.* Partners. Done. No backsies. That's bindin' in Cavan law." } },
        ] } }) },

  /* -- depth 7 . Scally: the listener (what have you told them about me?) -- */
  { char: "scally", depth: 7, make: () => ({
      id: "the-listener", story: true, once: true,
      label: "*He's pressed to the glass, listening to something.*",
      effects: { like: +1 },
      node: { text: "*He holds up one finger, wait, and listens a moment longer to the corridor. To nothing.* ...eh. Gone. *He straightens his coat.* Amico, a question. Since the wires died, information moves one way only: on YOUR legs, out of YOUR mouth. Which makes you, no offence, the whole newspaper. So Scally asks what a careful man asks his newspaper: when you stand at the other windows... what do you tell them about Scally?",
        choices: [
          { text: "The truth. That you're kind under all the commerce, and scared like the rest of them.", effects: { like: +2 },
            next: { text: "*Dead silence. The hands stop.* ...scared. *He tries the word on like a coat from someone else's wardrobe.* You are a terrible newspaper, amico. No discretion, no MARKUP, just the plain goods over the counter. *The grin that climbs back up is small and real.* ...la piccola dottoressa says the same, doesn't she. Don't answer. *He waves you off, gently.* Go. Print your truths. Is a strange feeling, being reported accurately. Scally does not entirely hate it." } },
          { text: "Nothing. I don't discuss you with them, or them with you.", effects: { like: +1 },
            next: { text: "*He studies you a long moment, then nods, slow, professional.* A vault. *He taps the glass once.* Expensive policy, amico. A vault makes no friends, only clients. But down here maybe clients live longer. *The grin resets to standard retail.* Va bene. Scally notes only this, for NOBODY: a vault gets opened one of two ways. With the combination... or with the crowbar. Stay close to the people with combinations." } },
          { text: "Why? What is there to tell?", effects: { like: -3 },
            next: { text: "*The eyes narrow to coin-slots.* 'What is there to tell.' *He repeats it flat, like reading a bad cheque.* Amico, per favore. You stand at the window of a man who TRADES, in a maze where somebody cut five throats' worth of wire, and you play the innocent flute at him? Everybody down here is a story the others are reading in the dark. The only question is who holds the pen. *He turns half away.* Scally has been READ before, and the last reader... eh. Ask the walls how that ended." } },
        ] } }) },

  /* -- depth 7 . Dalypso: the seating plan (the grudge, catered) -- */
  { char: "dalypso", depth: 7, make: () => ({
      id: "fixture-list", story: true, once: true,
      label: "*He has an invisible table drawn in the air, mid-argument with it.*",
      effects: { like: +1 },
      node: { text: "...no, because if HOMISS is there, ye can't put him near the DOOR, the man treats doors as ADVISORY... *he clocks ye an' waves ye straight into the row* ...you. GOOD. Housewarmin' dinner, seatin' plan, settle it. *He redraws the table with a sweep of the hand.* Me at the head, obviously, it's me HOUSE. Sian on the right. Homiss down the end where late arrival does minimal damage. You... *he places ye with two fingers* ...there. Sight of the telly, back to no door. A POSITION OF HONOUR. That's where me da sat. An' then. *The hand stops over one empty chair.* Then there's the QUESTION of the seat on Sian's right.",
        choices: [
          { text: "Bee sits beside Sian. Obviously. That's not even a question.", effects: { like: -2 },
            next: { text: "*He looks at ye like a linesman who's flagged his OWN team.* 'Obviously.' OBVIOUSLY, he says. D'ye know who SAT beside Sian for twenty YEARS of dinners? At whose TABLE? *He catches himself, breathing like a man who's run a length.* ...ye said it like it costs nothin'. That's the bit. Everyone says it like it costs nothin'. *He straightens the invisible cutlery, quieter.* She sits beside him. I KNOW she sits beside him. But ye could've let me GET there, could ye not?" } },
          { text: "Put Bee beside YOU. Keep your enemies close, and all that.", effects: { like: +2 },
            next: { text: "*He opens his mouth to object, an' the idea catches him right between the eyes.* ...beside ME. Where I hear all her wee CUTTIN' remarks first-hand instead of relayed through Sian with the good bits missin'. Where she has to pass ME the gravy an' SAY somethin'. *A grin spreads across him like weather changin'.* That's DIABOLICAL. That's man-markin', is what that is. By the end of dessert we'd either be at WAR or we'd be... *he stops. Considers. Concedes a whole war in one syllable.* ...friends. *He points at ye.* Yer runnin' me next five dinners. That's not a request. That's an APPOINTMENT." } },
          { text: "Who's cooking for this dinner that will definitely happen?",
            next: { text: "ME, an' I'll thank ye to bury the scepticism with yer OTHER hurtful opinions. *He counts the menu with total command.* Roast. I do ONE roast, it's exceptional, ask anyone, ask NOBODY, just trust me. Spuds three ways, because two is poverty an' four is showin' off. Somethin' green for Bee to APPROVE of. An' a trifle big enough to require plannin' permission. *He folds his arms.* It WILL happen. The table's BOUGHT. It's in the good room under a sheet, waitin' on its people. *A beat, an' the voice drops a half-inch.* ...everythin' in that house is under a sheet, waitin' on its people. That's what the house IS. Go on. Next fixture." } },
        ] } }) },

  /* -- depth 8 . Sian: the timer -- */
  { char: "sian", depth: 8, make: () => ({
      id: "the-timer", story: true, once: true,
      label: "How long have you been in here now?",
      effects: { like: +1 },
      node: { text: "*The answer starts instant an' confident.* Sure that's easy, it's on the... *the gesture at the empty air dies half-made.* ...the session timer's gone. Been gone. There's usually a wee clock, hai. Battery, time played, 'take a break, ye degenerate'. Standard. *He counts on his fingers, an' the counting slows like a man walkin' into cold water.* I remember startin' on a Friday evenin'. I remember thinkin', two hours, then chips. An'... *he looks at his hands like a build he didn't write* ...I've seen YOU what, eight, nine levels? An' there was a good bit before you, hai. *A silence with somethin' underneath it. The grin arrives half a second late, like a stand-in.* Batteries must be class though! CLASS. Right? Chips are gonna taste UNREAL.",
        choices: [
          { text: "Chips are going to taste unreal. First round's on me.", effects: { like: +2 },
            next: { text: "*He grabs the lifeline with both hands an' half the arm.* FIRST round?! There'll be COURSES of chips, hai. Chip TASTIN' MENU. Wine pairin's. Well, red sauce or brown, but PAIRED. *He's laughin' now, properly, an' the cold-water look backs off a few feet.* ...yer sound, d'ye know that? Whatever the build notes say about ye. Off ye go, clock or no clock. Somebody in this partnership has to make PROGRESS." } },
          { text: "Friday. You said you started on a Friday. What month was it?", effects: { like: -3 },
            next: { text: "*Everything stops. The hands, the grin, the breathin'. Like a dropped frame.* ...month. *He tries. Ye can see him TRY, an' ye can see the tryin' hit somethin' smooth an' frictionless where a fact should be, an' slide.* There was defo a JACKET involved, hai, I remember the... *he laughs, an' it comes out in pieces.* Why would ye ASK me that? Who ASKS a man the MONTH?! *He turns to the workbench an' picks up the same servo twice.* It's a Friday. It's still that Friday. It's the longest Friday ever shipped, an' the chips are still ON, an' I'd like to talk about somethin' else now, hai." } },
          { text: "Nine levels of me, aye. And you haven't aged a day.", effects: { like: +1 },
            next: { text: "*He points, grateful for the out, sellin' the laugh a bit too hard.* Skincare, hai! The fog's full of MOISTURE. Dermatologists HATE the Labyrinth Pro... the, eh. The game. The game the maze. *The stumble sits between yez for a second, an' he boots it under the workbench.* ...anyway. Timeless. Frozen in me PRIME, like a very slow screenshot. *He salutes ye off down the corridor, an' watches ye a wee bit longer than usual as ye go.*" } },
        ] } }) },

  /* -- depth 8 . Bee: the vial claim (three bidders, one promise) --
     The promise is REMEMBERED: break it and "receipts" fires below. */
  { char: "littlebee", depth: 8, make: () => ({
      id: "vial-claim", story: true, once: true,
      label: "Everyone's suddenly talking about data vials.",
      effects: { like: +1 },
      node: { text: "Because everyone's suddenly USELESS about them. *She's pacin' her wee frame, two steps each way.* A data vial is somebody's MEMORY, distilled. A bottled yesterday. The wee man wants it for STOCK. Homiss wants it because it frightens him an' he keeps his frights close, God love him. An' I want it because it's the best diagnostic sample this place has ever coughed up: real archived experience, uncorrupted, PRE-quiet. I could learn what the Protocol DOES to a mind. *She stops pacin' an' looks at ye, direct.* If one comes through yer hands: I'm askin' for it. Openly. On the record. I've never begged for equipment in me LIFE an' I'm not startin', but that's as close as I go.",
        choices: [
          { text: "If I find a vial, it's yours. My word.", effects: { like: +2, flag: "vial-promised-bee" },
            next: { text: "*She stops dead, an' ye watch her decide to believe ye. A visible event, like ice takin' weight.* ...right. Well. Grand. *She clears her throat an' re-becomes a professional.* For the record: witnessed, timestamped, filed. One (1) vial, contents unknown, consigned to DR. B., purpose: science. *The wee-est pause.* ...an' for the record that doesn't exist: thank ye. Words are the worst instrument I own an' those two are the best I've got." } },
          { text: "Highest bidder gets it. That's fair, isn't it?", effects: { like: -3 },
            next: { text: "*The pacin' stops. The temperature drops.* An AUCTION. For somebody's MEMORY. *She lets that sit until it's good an' uncomfortable.* Fair the way a coin toss is fair: fine for FOOTBALL, obscene for triage. The wee man'll outbid me. He can print margins; all I can print is FINDINGS. *She turns back to her counts, voice flat as a ward at 4am.* Do what ye like. But when yer sellin', ask the buyer what they want it FOR, an' see which answer ye can stand beside." } },
          { text: "What exactly happens to the vial in your hands?",
            next: { text: "*She brightens one full degree. A methods question, the fastest way to her heart.* Comparative analysis. I run me own recall against the vial's. Where mine's soft an' the vial's is crisp, THAT difference is the fingerprint of what this place does to storage. I can't examine me own corruption with the corrupted instrument. I need an outside copy of a yesterday. *She taps the glass.* It's not sentiment. It's CALIBRATION. ...though God knows whose yesterday it'll be. There's an ethics section I'll be writin' at three in the mornin', so there is." } },
        ] } }) },

  /* -- depth 8 . Dalypso: what does she say about me? (the loyalty fork) --
     Bee told the player her suspicion in confidence (d7). Dalypso asks
     straight. Every route sets exactly one flag; Bee's "verdict" beat
     (d9) settles the account. */
  { char: "dalypso", depth: 8,
    available: () => hasFlag("bee-suspects"),
    make: () => ({
      id: "what-does-she-say", story: true, once: true,
      label: "*He mutes the telly himself. That's never happened.*",
      effects: { like: +1 },
      node: { text: "*For once he doesn't run at it. He sets the remote down like a man settin' down a card he's been holdin' all night.* I want to ask ye somethin', an' I want the FIRST answer, not the polished one. *He looks at ye, level.* Her upstairs. The doctor. She's been askin' about me. Don't insult either of us, I KNOW she has. Ye've been lookin' at me windows since two levels up. HER look. Off YOUR face. *He folds his arms.* So. What does Little Bee say about me?",
        choices: [
          { text: "She says your window doesn't breathe. That it's a picture of a window.", effects: { like: +2, flag: "told-dalypso-suspicion" },
            next: { text: "*Stillness. Then, worse than any explosion, he nods, slow, like a man hearin' a diagnosis he'd already googled.* ...doesn't breathe. *He looks around at the frame of his own window, a man inspectin' his own coffin for build quality.* D'ye know what's mad? I can't FEEL if she's wrong. *He picks up the ball. Holds it like ballast.* ...thank ye. I mean it. Everyone else gives me the HIGHLIGHTS package; you gave me the full ninety. *A beat, an' half a grin crawls back.* 'Doesn't breathe.' Cheeky wee genius. If I AM a picture, I'm a PORTRAIT, an' they'd better have sprung for the good frame." } },
          { text: "Nothing. She's never mentioned you.", effects: { like: -3, flag: "kept-bee-counsel" },
            next: { text: "*He looks at ye for a long, long moment, an' the disappointment on him is so mild an' so total it's like weather.* ...nothin'. Never mentioned. *He picks the remote back up an' talks at the telly rather than you.* D'ye know what I watched last night? Nature thing. Wee bird, minds another bird's eggs its whole life, never says a WORD about it. Loyal as the tide. *He flicks a channel.* Lovely quality in a BIRD. In a fella standin' at my window with her look still ON him... *flick* ...we'll call it what it is when yer ready to. Away on. Programme's back." } },
          { text: "Ask her yourself when I get you both out of here.", effects: { like: +1, flag: "dodged-dalypso-question" },
            next: { text: "*He barks a laugh despite himself.* Oh, VERY good. Didn't answer a THING an' made it sound like team spirit. Ye should be in MANAGEMENT. *He wags the remote at ye, but the heat's gone out of it.* Fine. Keep yer confidences, courier. I'd respect ye less if ye spilled. *He settles back.* But log it: when we're all out, her an' me are havin' the conversation. In MY kitchen. Over MY teapot. An' one of us is apologisin', an' I've genuinely no idea which. *He unmutes the telly, satisfied.* That's the season finale, that is. Don't miss it." } },
        ] } }) },

  /* -- depth 8 . Homiss: the courier's tune (something of his, going out) -- */
  { char: "homiss", depth: 8, make: () => ({
      id: "harmony", story: true, once: true,
      label: "*He's playing something different today. Smaller.*",
      effects: { like: +1, flag: "heard-tune" },
      node: { text: "*It's not a drone. It's a wee run of notes, over an' over, patient as rain. It stops the moment he sees ye.* ...ah. That. *He looks at the fretboard rather than you.* I've been writin' a bit. A SMALL thing. A tune the length of a landin'. *He plays it once through: simple, climbin', an' it doesn't resolve. It just steps off the last note like a man leavin' a room mid-sentence.* It's for carryin'. The drones LIVE here. But a wee tune like that fits in a POCKET. *The ask underneath the ask looks out through his eyes.* If ye ever end up somewhere I can't follow... take it with ye. Whistle it somewhere with WEATHER. Then somethin' of mine got out, an' the rest of me can stop frettin' about the door.",
        choices: [
          { text: "*Learn it. Note by note, until he's satisfied.*", effects: { like: +2 },
            next: { text: "*He teaches it the way ye'd hand someone a sleepin' child: twice through slow, once at speed, an' then he makes ye do it back until the third go, when he closes his eyes an' just listens.* ...aye. That's IT, ye have it. *Somethin' that's been clenched in him since the wires went lets go, one knuckle at a time.* D'ye know what ye are now? A PREMIERE venue. *He grins, an' has to look away for a second.* Mind it goes at a walkin' pace. It's a tune for walkin'. One of us should be usin' it right." } },
          { text: "You'll whistle it yourself, on the far side of the door.",
            next: { text: "*He smiles, an' it's the saddest an' fondest thing ye've seen on him yet.* ...aye. Maybe. Please God. *He plays the wee run once more, soft.* But a composer learns the one hard lesson early: ye don't write music so YOU can hear it. Ye write it so it's HEARD. Whether yer stood there for it, that bit was never ours to keep. *He tucks the plectrum away.* So learn it anyway, next time. Belt an' braces, wha'. A tune with two exits has twice the chances." } },
          { text: "A tune the length of a landing? Bit slight, for a doctor of composition.", effects: { like: -4 },
            next: { text: "*His hands come clean off the strings.* ...SLIGHT. *He says it very quietly, which from Homiss is the shout.* Ye know what's in that wee run? Everythin' I can't say without the roof comin' in. That's what small tunes are FOR. The forty-minute pieces are me showin' off. The eight bars are me TELLIN' THE TRUTH. Any doctorate that can't hear the difference should be posted back. *He turns away an' plays the drone instead, the big safe endless one, an' doesn't offer ye the wee tune again that day.*" } },
        ] } }) },
  /* -- depth 9 . Bee: don't feed it (fires while carrying the bone) -- */
  { char: "littlebee", depth: 9,
    available: ctx => ctx.player.inventory.some(i => i.id === "saints-finger"),
    make: () => ({
      id: "dont-give-it", story: true, once: true,
      label: "*Her eyes snag on your pocket and stay there.*",
      effects: { like: +2, flag: "bee-warned-bone" },
      node: { text: "*All the speed goes out of her voice, which is how ye know it matters.* That bone yer carryin'. I can near feel it through the glass. *A beat.* Scally's been askin' after that. He asked ME once, back when the wires were up: did I ever see 'a little relic, a little finger of the old world'. An' then the wee man went QUIET for a week. *She looks at ye, level.* Scally doesn't do quiet. Chatter's how he breathes. So whatever that thing is TO him, it's not stock. It's a door he's been standin' at for a long time, an' I don't know what's on the other side of it. *She steps back from the glass.* I'm not tellin' ye what to do with yer own pockets. I'm tellin' ye: know what yer feedin' before ye feed it." } }) },

  /* -- depth 9 . Bee: the verdict (the d8 Dalypso fork, settled) -- */
  { char: "littlebee", depth: 9,
    available: () => hasFlag("told-dalypso-suspicion") || hasFlag("kept-bee-counsel") || hasFlag("dodged-dalypso-question"),
    make: () => ({
      id: "verdict", story: true, once: true,
      label: "*She's waiting for you. Arms folded. She KNOWS.*",
      effects: hasFlag("told-dalypso-suspicion") ? { like: -4 }
             : hasFlag("kept-bee-counsel")      ? { like: +2 }
             : { like: +1 },
      node: { text: hasFlag("told-dalypso-suspicion")
        ? "*She doesn't even let ye stop walkin' properly.* 'Doesn't breathe.' *Yer own delivery, handed back word for word.* He QUOTED me. To his TELLY. Loudly. Sound carries in this buildin'. That was the whole POINT of what I told ye. *She's not shoutin'. She's gone the other way: quiet an' surgical.* D'ye understand what ye spent? If he's harmless, ye've hurt the kindest man down here with MY name on the blade. An' if he's NOT, then the thing behind the picture now knows EXACTLY what I see. Ye showed my cards to the one hand at the table I can't read. *She turns away, tired.* The data was for US. Yer a courier. Learn what SEALED means."
        : hasFlag("kept-bee-counsel")
        ? "*She reads yer face for a second, an' then, unexpectedly, nods.* He asked ye. Dalypso. What I say about him. *She watches yer surprise an' takes it as confirmation.* An' ye gave him nothin'. I know because his patter to the telly hasn't changed a syllable, an' THAT man broadcasts everythin' he knows within the hour. *She unfolds her arms.* ...ye kept it sealed. Even standin' in the warm of him, which I know is warm. That's the first PROPER data point I have on yer character, an' it's a good one. *The smallest twist of a smile.* Don't let it go to yer head. Yer still the whole cohort. Cohorts don't get medals."
        : "*She looks at ye a moment, then snorts.* 'Ask her yerself when I get yez all out.' *She shakes her head slowly.* Aye, he told the telly all about it. Dead impressed with ye. The great diplomatic non-answer. *The eyebrow goes up.* Smooth. Genuinely. But hear me: smooth is a lubricant, not a load-bearin' material. One of these levels somebody's goin' to need ye to be a WALL instead. Pick a side of the line an' stand on it. *She turns back to her work.* Until then, grand. Slither on, courier. It's workin' for ye. It won't forever." } }) },

  /* -- depth 9 . Scally: the riddle (the door he's been standing at) -- */
  { char: "scally", depth: 9, make: () => ({
      id: "the-riddle", story: true, once: true,
      label: "*He's turning something invisible over in his fingers.*",
      effects: { like: +1 },
      node: { text: "*He doesn't notice you for a moment, which never happens. His fingers are working an old shape in the air, small as a coin, thin as a twig.* ...eh! Amico. *The hands vanish into the coat, too quick.* You catch Scally doing the inventory of the head, is all. *He clears his throat, and then, sideways, in the voice he uses when a thing matters:* A riddle for you, free of charge. What is small as a key, old as a church, and opens nothing... but closes a very long story? *He smiles, and there is a whole locked room behind it.* No, don't answer. Is the kind of riddle you carry until you FIND it. And then you will know whose door it belongs to.",
        choices: [
          { text: "*Let the riddle be. Nod, and tip an invisible cap.*", effects: { like: +2 },
            next: { text: "*Something in the little man's shoulders comes down half an inch. You took the parcel without checking the weight, and that was the whole test.* ...you are learning the manners of the house, amico. *He taps his nose.* When the maze coughs it up, and she will, she sheds everything eventually, you will feel it watching you back. Bring it to the little shopkeeper, and ask him NOTHING, and he will owe you the kind of debt that has no price sticker. *He turns to his shelves.* ...grazie. For not asking. You have no idea, and that is exactly as it should be." } },
          { text: "What's behind the riddle, Scally? What does it MEAN to you?", effects: { like: -3 },
            next: { text: "*The fingers stop. All of him stops.* ...eh. *And the shutters come down. Not slammed; worse, folded quietly, like a man closing his stall in the rain.* You know what a riddle IS, amico? A box with the lid glued shut, so the thing inside stays FRESH. And you, snip snip, straight for the lid. *He busies himself with stock that was already tidy.* Some doors, you do not knock twice. The second knock tells the door too much about YOUR hand. *He glances up once, and the eyes are old.* The story under it is not stock, was never stock, and it does not come out for curiosity. Not even yours." } },
          { text: "Closes a story, is it? I'd bet luck finds it before I do.", req: { attr: "luck", level: 6 }, effects: { like: +2 },
            next: { text: "*He looks at you sideways, and slowly the grin comes back, with something like awe at the edge of it.* ...you know, amico, Scally believes you. Fortuna walks behind some people like a pickpocket who gives things BACK. *He leans close.* Then a bargain: when it falls in your path, and now it will, you have gone and SAID it, the maze listens to the lucky ones, you pick it up gently. Old things bruise. *Brisk again.* And you bring it up the stairs before anyone else smells it. There are noses down here. Some very dear to Scally. Some of them WORRY too much." } },
        ] } }) },

  /* -- depth 9 . Sian: patch notes (the changelog runs backwards) -- */
  { char: "sian", depth: 9, make: () => ({
      id: "patch-notes", story: true, once: true,
      label: "*He's got a wall covered in scratched tally marks and arrows.*",
      effects: { like: +1 },
      node: { text: "Patch notes! *He presents the scratched wall like a whiteboard at a stand-up.* I've been trackin' the build, hai. Every level, what changed. One-point-four: fog got heavier. One-point-five: lights started stutterin'. Fine. Props. But HERE. *He taps a cluster of angry marks.* The echo went. The session timer went. The pause menu went. The GUARDIAN went. See the pattern, hai? *The enthusiasm has somethin' colder runnin' under it now.* Real games ADD features. This one's been REMOVIN' them. One at a time. Quiet, like. That's not a changelog. That's a countdown. An' I can't work out what it's countin' down TO.",
        choices: [
          { text: "Add it to the ticket. All of it. This is good evidence.", effects: { like: +2 },
            next: { text: "*He straightens like ye've saluted him.* EVIDENCE. Aye! That's the word. Not 'worryin''. EVIDENCE. *He starts annotatin' the wall with fresh energy.* When ye reach the dev room this goes in the report, word for word, scratch for scratch. 'Systematic feature removal, user-hostile, reproducible, PRIORITY ONE.' *He steps back, a man back in control of his sprint board.* They can ignore a feelin', hai. They can't ignore a CHANGELOG. It's the one sacred text we have." } },
          { text: "Maybe it's counting down to the bottom. To whatever's waiting there.", effects: { like: +1 },
            next: { text: "*He goes quiet an' looks down the corridor, in the direction down has always been.* ...aye. Maybe. Strip the features as ye descend, no menu, no timer, no net, till there's nothin' left between the player an'... whatever the last level IS. *He rubs the back of his neck.* That's a design philosophy, that is. A BRUTAL one. Final boss with no HUD. *The grin fights its way back, thinner but game.* Well. Joke's on them, hai. I've been playin' games me whole life, an' the last level is where I'm BEST. Tell the bottom I said that. Word for word." } },
          { text: "Or you're seeing patterns in wear and tear. Walls crack, Sian.", effects: { like: -3 },
            next: { text: "*He looks at the wall of tallies, then at you, an' somethin' behind the visor goes flint.* ...wear an' tear. *He taps one scratch cluster, hard.* Did the ECHO wear out? Did the pause menu CRACK? *His voice stays level, which for Sian is the alarmin' version.* I'm a QA lad at heart. Day one they teach ye: users report feelin's, the LOG reports facts. I logged it BECAUSE I didn't trust the feelin'. Now the log agrees with the feelin', an' ye want me to distrust the both of them together? *He turns back to the wall.* ...check yer own walls, partner. See if they're crackin' in ALPHABETICAL ORDER. Then we'll talk about wear an' tear." } },
        ] } }) },

  /* -- depth 9 . Dalypso: the dark channel (the reception is dying) -- */
  { char: "dalypso", depth: 9, make: () => ({
      id: "the-remote", story: true, once: true,
      label: "*He's pressing the same button over and over.*",
      effects: { like: +1 },
      node: { text: "*Press. Press. Press-press-press.* ...it went DARK. *He holds the remote up like a referee showin' it a card.* Channel four-oh-seven. The bridge documentary channel. The bridges that were never BUILT. Appointment viewin'. Last night, nine o'clock, I settle in, an'... BLACK. Not static. Not 'no signal'. BLACK, like a curtain. Like somethin' STOOD in front of it. *Press. Press.* First time since I got here. This telly gets channels that don't EXIST, an' now one of them's after stoppin' existin' HARDER. *He looks at ye, an' under the outrage, for the first time, he's rattled.* Channels don't die down here. Nothin' dies down here. So what turned it OFF?",
        choices: [
          { text: "What was on 407 before it went dark? Exactly?", effects: { like: +2 },
            next: { text: "*He points at ye with the remote, the highest honour he confers.* THAT'S the question! Bridges. Harmless. Except THINK about it: bridges that were never built. Roads not taken. The channel was all about ways ACROSS that don't exist. *He lets that sit, an' the silence does somethin' cold.* An' the night I finally started takin' NOTES on one of them, the curtain comes down. *He sets the remote on the sill, very deliberate.* Somethin' in this buildin' doesn't like us studyin' the exits. Log THAT with yer woman upstairs. Word for word. Tell her I said BRIDGES." } },
          { text: "Maybe the telly's just on the way out.", effects: { like: -3 },
            next: { text: "*The remote comes down slowly, an' he turns with the full weight of a man whose expertise has been questioned in his OWN sittin' room.* The telly. Is not. The PROBLEM. *He breathes.* This unit gets channels from timelines that never HAPPENED. It survived me da's funeral week on twenty-two hours a DAY. When IT loses a channel, ye don't blame the SET, ye ask who's been at the TRANSMITTER. *He turns back to the screen, jaw workin'.* 'On the way out.' Honest to God. Ye'd look at a shot referee an' blame the WHISTLE." } },
          { text: "One channel out of thousands. You'll live.",
            next: { text: "*He stares at ye a second, an' then, unexpectedly, deflates into somethin' quieter an' truer.* ...aye. One channel. *He turns the remote over in his hands.* But d'ye know what it is? Down here I've LOST things before. We all have. An' every one went the same way. Not with a bang. With a wee QUIET subtraction ye could talk yerself out of noticin'. The voices through the walls went one night, one by one, an' every time I said 'ah, they'll be back on the morrow'. *He looks up.* Four-oh-seven's not a channel. It's a CANARY. An' I'm not watchin' the cage go quiet again without SAYIN' it out loud this time. *He nods at ye, short an' fierce.* There. Said. Witnessed. On yer way." } },
        ] } }) },

  /* -- depth 9 . Homiss: the one he can't finish -- */
  { char: "homiss", depth: 9, make: () => ({
      id: "the-committee", story: true, once: true,
      label: "Go on. You've got one loaded. I can see it.",
      effects: { like: +1, flag: "homiss-stalled" },
      node: { text: "*He lights up, caught fair.* I DO. Had it in the chamber all day, it's a BEAUTY. Right. Would ye rather... be free somewhere ye know NOBODY, new town, new faces... orrrr... *the wind-up is glorious, and then, somewhere in the middle, the engine of it just stops* ...or be stuck somewhere... with everyone ye... *He blinks. The grin's still there, but it's unmanned.* ...huh. *He puts a hand flat on the bass, steadyin' himself on furniture.* Would ye look at that. First one ever got away from me. It was FUNNY when I built it this mornin'. An' then it went an' MEANT somethin', right there in me mouth. *He laughs, an' it doesn't hold the weight.* They're not supposed to MEAN somethin'. That's the whole point o' the game.",
        choices: [
          { text: "Answer it anyway. Both of us. Same time.", effects: { like: +2 },
            next: { text: "*He looks at ye like ye've suggested jumpin' off somethin', an' then squares up to it, because ye'd be jumpin' together.* ...aye. Go on. Three. Two. *Neither of yez says a word on 'one'. The silence sits there, an' in it, the answer the both of yez didn't say is deafenin'.* ...well. *He exhales, shaky, grinnin' for real now.* Look at that. Unanimous. *He plays somethin' small an' warm, half to himself.* Stuck. With everyone I. *He doesn't finish it, an' doesn't need to.* Don't tell the committee. They'd have me OUT of the impossible-question business for compromised objectivity." } },
          { text: "It got away from you because you already know your answer.", effects: { like: +1 },
            next: { text: "*He goes to bat it away, an' then doesn't.* ...aye. *A long moment of him lookin' at his own hands on the strings.* The game only works when both doors are pretend, d'ye see. But that one... I'm IN that one. An' a man shouldn't find out his answer by TRIPPIN' over it in front of company. *He straightens, an' manages most of a grin.* ...still a good question, but. Structurally. I'm keepin' the wordin' for after. There's goin' to BE an after. That's not a question, so don't answer it." } },
          { text: "You're right, that one's not funny. Stick to the grapes.", effects: { like: -3 },
            next: { text: "*The relief that crosses his face is instant, an' it curdles just as fast, because he hears what the two of yez are agreein' to.* ...aye. The grapes. Safer ground. *He noodles a bit, not lookin' at ye.* That's what we do, isn't it. Somethin' real pokes its head up an' we all go BACK TO THE GRAPES like it's a fire drill. *He plays a sour wee note, deliberate.* I invented that drill, so I'm not blamin' ye for runnin' it. I'm only sayin'... it was half-out. Ye could've let it land, an' ye put the umbrella up instead. *He summons the grin by main force.* RIGHT. Grapes. A MILLION grapes, mind. The terms don't soften. Away with ye." } },
        ] } }) },

  /* -- depth 11 . Bee: iron (the horseshoe starts appearing here) -- */
  { char: "littlebee", depth: 11,
    available: () => !hasFlag("gave-horseshoe"),
    make: () => ({
      id: "iron", story: true, once: true,
      label: "*Mid-sentence, she loses her thread, staring at nothing.*",
      effects: { like: +1 },
      node: { text: "*She's half-way through a point about render latency when she just... stops. Her hands, without consultin' her, have shaped somethin' in the air. A curve, heels-up.* ...d'ye ever... *she catches the hands at it an' snaps them flat, too late* ...have ye come across anythin' IRON down there. Curved, like. Heavy. About the size of a... *the jaw sets* ...doesn't matter what size. Old thing. Farrier'd know it. *The stopwatch voice comes back up like a drawbridge.* Forget I asked. It's SENTIMENT, is what it is, an' sentiment down here is a leak in yer hull. NEXT topic. ...but if ye DID see one. Ye'd mention it. In passin'." } }) },

  /* -- depth 11 . Scally: the overheads (the shop is a haunted ledger) -- */
  { char: "scally", depth: 11, make: () => ({
      id: "overheads", story: true, once: true,
      label: "*He's counting stock. He's been counting the same shelf a while.*",
      effects: { like: +1 },
      node: { text: "*You watch him count six items, lose the thread, and start again. Twice.* ...amico. Good. A witness. *He gestures at the shelf.* Six pieces, eh? Six. *He turns one over: it has no back. Not broken. UNRENDERED, smooth as the inside of an egg.* Yesterday, this one had a back. Scally SOLD things out of the back of it. *The hands have stopped their rubbing entirely.* The books do not balance anymore. Things arrive that Scally never ordered. Things go that nobody bought. Is like the maze has started doing inventory of HER own. *He looks up.* And a shop, amico, is only a wall with better manners. If the stock is not safe behind Scally's glass... what else down here is being RESTOCKED?",
        choices: [
          { text: "Then we do YOUR inventory. Tell me every item, I'll remember them.", effects: { like: +2, flag: "scally-audited" },
            next: { text: "*He stares at you, and then, very slowly, the grin comes back, and it is the realest one you have ever been sold.* ...an audit. An OUTSIDE audit. *He lays the stock out on the sill, precise as surgery, and makes you say it all back. Twice. Somewhere in the second recitation you realise you are not memorising a shop. You are memorising HIM.* ...ecco. Now Scally exists in two ledgers. One in here, where the maze can cook the books... and one walking around on legs, where she cannot reach. *He taps the glass, soft.* Best deal Scally ever made. And it cost you nothing but memory. Spend it wisely, accountant." } },
          { text: "Maybe you miscounted. It happens. You're tired.", effects: { like: -3 },
            next: { text: "*The look he gives you is not angry. It is worse: it is professional.* ...amico. Scally has counted stock since he was seven years old, in the back of his nonno's shop, in the dark, by TOUCH. Through fevers, through funerals, through a war between two families over a delivery of lemons. Scally does not miscount. *He leans in.* So when the count is wrong, is not the counter. Is the WORLD. *He turns back to the shelf.* 'Tired.' The cheapest explanation in the shop, and like everything cheap, amico... you get what you pay for." } },
          { text: "What arrived that you never ordered?",
            next: { text: "*He goes very still. Then, without a word, he sets it on the counter: a small paper bag, folded shut, pristine, the kind a bakery would use. A name written on it in pencil, smudged beyond reading. Smudged, you suspect, on purpose, by a thumb, many times.* ...it was here when Scally opened up, four levels ago. Is warm, amico. Every level, still warm. Scally does not open it. Does not sell it. Does not THROW IT AWAY, because... *the shopkeeper looks at the bag the way other men look at the sea* ...maybe it is for somebody. And down here, a thing that is FOR somebody, you do not interfere with. You keep it warm. *He puts it back under the sill.* Ask me no more about the bag." } },
        ] } }) },
  /* -- depth 11 . Homiss: the request line (a set list for the séance) -- */
  { char: "homiss", depth: 11, make: () => ({
      id: "request-line", story: true, once: true,
      label: "*He's playing snatches of different tunes, like a radio scanning.*",
      effects: { like: +1, peers: [{ of: "homiss", toward: "littlebee", delta: +1 },
                                   { of: "homiss", toward: "sian", delta: +1 },
                                   { of: "homiss", toward: "dalypso", delta: +1 }] },
      node: { text: "*Ye catch him mid-medley: somethin' thunderous, somethin' sweet, what might be a football chant slowed to a hymn.* Ah! Perfect timin'. The REQUEST LINE. Every Friday night, an' I've decided it's Friday, I used to take requests through the walls. Bee'd want the drones, for the brainwaves. Sian'd shout for somethin' with TEETH. An' the big fella with the telly, God love him, requested THEME TUNES. On a doctoral bass. An' I'd PLAY them, because a request is a sacred thing, wha'. *He damps the strings, an' the quiet where the audience used to be is suddenly very large.* They can't shout up the line anymore. So. *The ask is gentle an' enormous.* You've stood at all their windows. Make their requests FOR them, an' I'll play the lot. An' Friday stays Friday a wee bit longer.",
        choices: [
          { text: "Drones for Bee. Teeth for Sian. And the snooker theme for Dalypso.", effects: { like: +2 },
            next: { text: "*He points the plectrum at ye like a conductor's baton.* The SNOOKER theme! *He's laughin' before the first note.* Oh, he'd be WEEPIN'. He told me once it was the sound of civilisation. *He plays it, an' it IS gorgeous on the bass, stately as a liner leavin' port. Then the drones, sent two floors up. Then somethin' with teeth, sent down the other way like a care package.* ...there. Broadcast complete. They'll not have heard a note of it. *He looks down the hall.* ...or they will. Sound does quare things in this buildin'. Either way, the request line stays OPEN. Same time next Friday. Yer the whole switchboard now, wha'." } },
          { text: "Play your own request tonight. The others can owe you one.", effects: { like: +1 },
            next: { text: "*He blinks, an' laughs, caught out.* MY request? On MY request line? Sure that'd be... *he stops. Considers. Somethin' sly an' shy crosses his face.* ...d'ye know what, no one's EVER asked the host. *He thinks a long moment, an' then plays, an' it's nothin' ye expected: a waltz. Small, old-fashioned, unapologetic, the kind that smells of church halls an' lemonade. He plays it all the way through an' doesn't explain it, an' the not-explainin' is the biggest thing he's ever trusted ye with.* ...me ma's favourite. *That's all ye get, an' it's plenty.* Right. NOW the request line's honest. Off ye go before I play another one an' have to tell ye things." } },
          { text: "A request line with no listeners is just you playing to a wall, Homiss.", effects: { like: -4 },
            next: { text: "*The strings go dead under his flat hand.* ...aye. It is. *He looks at the wall in question, long an' level.* An' d'ye know what playin' to a wall IS, when ye've done it as long as I have? It's PRACTICE. Every tune I keep ready is a bet that they're comin' back, an' I'd rather lose that bet every Friday for a hundred years than win YOUR version of it once. *He turns away an' starts the drones, low an' fierce.* ...the request line is CLOSED tonight. Due to commentary from the floor. *Just before ye're out of earshot, stubborn as sunrise:* ...it reopens NEXT Friday. It always reopens. That's the POINT of it." } },
        ] } }) },

  /* -- depth 11 . Sian: Brenda (the comfort that cuts, the daft one that heals) -- */
  { char: "sian", depth: 11, make: () => ({
      id: "brenda", story: true, once: true,
      label: "Tell me about Brenda. Properly, this time.",
      effects: { like: +1 },
      node: { text: "*He's quiet a second, then takes the servo out of his pocket an' sets it on the sill, like a photograph.* Twelve kilos. Hardened wedge. Drum spinner I rewound meself on the kitchen table, which Bee said was a fire hazard, an' she was right, there WAS a fire, we don't talk about the curtains. *The grin flickers.* Undefeated in Leinster. One tribunal. *He turns the servo over.* ...I took her batteries out before I came in here. Ye have to, for storage. Told the shed, 'back in a few hours.' *He looks up, an' the visor can't do a thing about what's underneath it.* She's sittin' in the dark with her batteries out, partner. However long it's been. An' the mad thing: she'll think... I KNOW machines don't think, I BUILT her, but she'll think I stopped comin' because I WANTED to.",
        choices: [
          { text: "She knows you're coming. Twelve kilos of her knows.", effects: { like: +2 },
            next: { text: "*It's daft. Ye both know it's daft. An' he takes it the way a drownin' man takes a rope, darin' nobody to inspect the rope.* ...aye. *He pockets the servo, an' his hand stays around it in the pocket.* She was always the patient one of the two of us. Sat in her corner between bouts like a monk. *He straightens, an' the grin that comes back has somethin' solid under it again.* First thing when I'm out: batteries in, full charge cycle, an' the longest walk-around inspection in the history of the sport. She'll pretend she doesn't care. She's LIKE her da that way. *He knocks the glass, twice, steady.* Thanks, partner. Ye lie BEAUTIFULLY. Don't ever tell me which bits were lies." } },
          { text: "You'll charge her up soon, Sian. Soon.", effects: { like: -2 },
            next: { text: "*The word lands wrong, an' ye watch it land.* ...SOON. *He says it back slow, like turnin' a faulty part under the light.* What's 'soon', hai? Gimme the UNITS. I said 'back in a few hours' to a shed, an' 'a few hours' became a FRIDAY that hasn't ENDED, an' every one of yez keeps sayin' SOON like it's a number, an' it's NOT a number, I've CHECKED! *He stops himself, breathing hard, both hands flat on the sill.* ...sorry. Sorry, hai. Yer bein' kind, I know. But don't say 'soon' at me again. Say 'I don't know'. I can BUILD on 'I don't know'. Soon's just paint over a gap. *He picks up his tools, quieter.* Go on. I'm grand. That's also paint, but it's MY paint." } },
          { text: "A drum spinner off a washing machine motor. Walk me through the build.", effects: { like: +2 },
            next: { text: "*And he's OFF. The grief converts to torque figures before yer eyes, which is maybe the same thing wearin' overalls.* RIGHT. Yer standard washer motor's got the guts but not the GRR, hai. Wrong kV for weapon work, so ye rewind it: strip the stator, count yer turns, drop the resistance, an' suddenly the wee domestic hero that used to do DELICATES is swingin' four hundred grams of hardened steel at nine thousand RPM. *He's drawin' wiring diagrams on the fog of the glass.* Belt reduction, chains SHED. An' the drum's a flywheel, so she banks the energy BETWEEN hits. She doesn't hit hard because she's strong. She hits hard because she's PATIENT. *He stops, looks at the diagram, laughs at himself, soft.* ...aye. Her da's daughter, right enough. GO, before I do the electronics module. I WILL do the electronics module." } },
        ] } }) },

  /* -- depth 11 . Dalypso: planning permission (vote on the conservatory) -- */
  { char: "dalypso", depth: 11, make: () => ({
      id: "planning-permission", story: true, once: true,
      label: "*He's pacing out measurements that don't exist.*",
      effects: { like: +1 },
      node: { text: "...three metres by four, off the back kitchen... *he clocks ye an' pulls ye into the plannin' meetin' with one wave* ...GOOD, quorum. Right. LISTEN. The conservatory. *He lets the word land with the gravity it deserves.* Three by four, catchin' the mornin' sun before the garden takes it. Glass roof, the GOOD glass, self-cleanin'. Rattan furniture. An' in the corner, *he places it with two hands, tenderly*, a chair angled EXACTLY between the garden an' the telly, so a man can watch either. Or BOTH. *He folds his arms.* The bank says it's an extravagance. The lads said 'sure ye've a garden, sit IN it.' Philistines. So it comes to you, casting vote: does the conservatory get built? Think CAREFULLY. This is a plannin' decision, not a POPULARITY contest.",
        choices: [
          { text: "No conservatory. It'd ruin the line of the house. Extend the good room instead.", effects: { like: +2 },
            next: { text: "*He inhales like a man harpooned, an' then stops, mid-outrage, because the counter-proposal has TEETH.* ...ruin the... EXTEND the... *he wheels around to consult the invisible house.* The good room DOES back onto the... ye'd get the evenin' light, which for a workin' man is the only light he ever... *he paces the new footprint, mutterin', an' finally rounds on ye with the fury of a man convinced against his will.* THAT is the WORST thing about ye, d'ye know that?! Ye come to MY plannin' meeting, ye REJECT my conservatory, an' ye do it with a BETTER IDEA! *He jabs a finger, eyes blazin' with pure joy.* The extension's APPROVED. Yer barred from the next meetin'. Yer CHAIRIN' the next meetin'. GET OUT of me office." } },
          { text: "Build it. It sounds perfect exactly as you described it.", effects: { like: -3 },
            next: { text: "*Silence. The plannin' energy drains out of him like bathwater.* ...'perfect exactly as described.' *He sits down heavily on the invisible rattan.* D'ye know how long I've been holdin' the conservatory debate? MONTHS. I'd counter-arguments STOCKPILED. A whole bit about the self-cleanin' glass bein' worth it over TIME. *He looks up at ye, betrayed.* An' ye APPROVED it. First round. Unanimous. *He shakes his head slowly.* A plannin' process with no objections is RUBBER-STAMPIN', an' a conservatory nobody fought for is just a GREENHOUSE with notions. Away. The meetin's adjourned due to lack of OPPOSITION." } },
          { text: "Casting vote requires a site visit. I'll inspect when we're all standing in that kitchen.",
            next: { text: "*He goes to object, procedural grounds, ye can see it formin', an' then the actual CONTENT of what ye said stops him flat.* ...a site visit. *He says it carefully, like handlin' somethin' breakable.* All of us. Standin' in the back kitchen. Sian measurin' things wrong, Bee testin' the light like it's a patient, Homiss forty minutes late to his OWN site visit... *He stands inside the picture of it a long moment, an' when he comes back out his voice has to take the long way round.* ...aye. That's proper procedure, in fairness. Ye can't approve a conservatory ye haven't STOOD in. *He clears his throat, hard, twice.* Motion carried. Decision DEFERRED to the site visit. Ye've entered it into the MINUTES. Get us to the site." } },
        ] } }) },

  /* -- depth 12 . Sian: the headset --
     The crack becomes a break. Everything after this runs through Bee. */
  { char: "sian", depth: 12, make: () => ({
      id: "the-headset", story: true, once: true,
      label: "*He's got both hands up at his temples, very still.*",
      effects: { like: +1, flag: "sian-cracking" },
      node: { text: "*When he speaks it's at half his usual volume, which is somehow the loudest thing ye've ever heard from him.* I went to take it off. The headset. Enough for one day, hai. Chips. Charge Brenda. NORMAL thing. *His fingers move at his temples, searchin'.* There's no edge. No strap, no gasket, no seam. Me fingers just kept GOIN', like askin' where yer face clips onto yer head. *He laughs, the laugh of a man on a ladder that's started movin'.* That's class though, isn't it? Immersion, hai, next-gen fit tech... *both hands come down an' grip the window frame.* ...there's no headset, is there. What is this. What IS this, hai. WHAT IS... *He stops himself. Somewhere behind the visor he is doin' arithmetic no one should have to do.* ...ye'd know where Bee is. Wouldn't ye. Ye'd get word to Bee.",
        choices: [
          { text: "I'm going to her window right now. Hold on for me, big man.", effects: { like: +2 },
            next: { text: "*He nods, an' keeps noddin', small an' fast, a man usin' the motion to stay upright.* Right now. Aye. Right now's good. *He grips the sill an' makes himself say the rest like a lad radioin' in his own crash.* Tell her what I told ye. The exact words. The edge an' the... all of it. She'll know what it means. She always knows what things MEAN. *The breath shudders in an' comes out steadier.* GO. Please, hai. An' partner... *his voice follows ye down the corridor, small but holdin'* ...come back after. Even after. ESPECIALLY after." } },
          { text: "Look at me. Five things you can see. Go. Now.", effects: { like: +2 },
            next: { text: "*His head comes round.* ...what? *But the command catches some old trainin' in him, the pit-lane part, the part that answers checklists, an' he goes.* The window. You. Me hands. The fog. The wall. *The breathin' slows a notch with each one, an' by the wall he's back behind his own eyes, shaky but PRESENT.* ...where'd ye learn that? That's a systems reset, that is. *A wet laugh gets out.* Bee'd do that. That's a BEE move. GET WORD TO HER. Tell her what happened, tell her it WORKED, hai. She'll want the data. She'll pretend it's about the data. GO." } },
          { text: "It's going to be fine, Sian.", effects: { like: -2 },
            next: { text: "*Both hands come off the frame, an' for the first time since ye've known him he looks at ye the way ye'd look at an NPC.* ...fine. *He says it quietly, an' the quiet is scorched round the edges.* Everyone says FINE. The game says fine, the FOG says fine, I've been sayin' fine to meself for a Friday that's lasted... *he catches it, barely.* There's no EDGE on me HEAD, partner. Ye don't 'fine' that. Either ye know somethin' I don't, or yer paintin' over the gap, an' I've enough paint in here to do the HOUSE. *He turns away, hands back at his temples.* ...Bee. Just get word to Bee. She doesn't do 'fine'. It's her ONE flaw an' I need it." } },
        ] } }) },

  /* -- relay . Bee: the grounding (min-depth 13 paces it) -- */
  { char: "littlebee", depth: 13,
    available: () => hasFlag("sian-cracking") && !hasFlag("msg-ground"),
    make: () => ({
      id: "ground-him", story: true, once: true,
      label: "It's Sian. He went looking for the headset's edge.",
      effects: { like: +2, flag: "msg-ground", peers: [{ of: "littlebee", toward: "sian", delta: +2 }] },
      node: { text: "*She goes completely still. One breath in through the nose, an' when she speaks it's a different voice entirely. The ward voice: slow, level, impossible to argue with.* Right. He found it. Okay. We knew he'd find it, an' that's data, an' data's fine. *The eyes are not fine. The voice does not consult them.* Listen now, because ye'll deliver this EXACTLY, word for word: 'Five things ye can see. Four things ye can hear. Three ye can touch. Then breathe, ye eejit, an' remember the long acre.' *She makes ye say it back. Twice.* The last bit's ours. Ye don't get to know what it means, an' if he tells ye, I'll have the both of ye. GO. Please. *The please costs her somethin'.* Go." } }) },

  /* -- depth 13 . Sian: the system check (he mirrors Bee, on purpose) -- */
  { char: "sian", depth: 13, make: () => ({
      id: "system-check", story: true, once: true,
      label: "*He's talking himself through something, finger to finger.*",
      effects: { like: +1 },
      node: { text: "...name: Sian. Occupation: menus. Robot: Brenda. Woman: *he clocks ye, an' doesn't stop, just nods ye into it* Bee. Best mate: Dalypso. Rival: Homiss. *He holds the hand up, five fingers out, like a lad showin' ye a full house.* System check, hai. I do it every level now, since the hardware review came back INCONCLUSIVE. Five facts, five fingers. If they all boot up, the core install's grand. *He pockets the hand.* So here's the ask, partner. Bee checks you... you check ME. Same slot, every level. Ask us the five. An' if I ever miss one, *the grin doesn't waver, which is how ye know he's thought about this in the dark*, ye don't tell me soft. Ye tell me STRAIGHT, an' then ye go get her. That's the protocol. Sign here.",
        choices: [
          { text: "Signed. Five facts, every level, straight or nothing.", effects: { like: +2, flag: "sian-protocol" },
            next: { text: "*He shakes on it through the glass, his palm flat on his side, waitin' till ye match it.* Witnessed an' BINDIN'. Cavan law. *Ye can see the relief run through him like current. Not because the fear's gone, but because it's got a PROCEDURE now, an' a lad like Sian can hold anythin' that has a procedure.* D'ye know what's mad? I feel better than I have in ten levels. Ye can't fight fog, hai. But a CHECKLIST? A checklist I can run forever. Off ye go, an' STUDY, partner. Next level ye're askin' me the five, an' I'll be markin' YOUR delivery too." } },
          { text: "Run it now. All five. I'm listening.", effects: { like: +2 },
            next: { text: "*He straightens like it's a title bout weigh-in.* NOW? No warm-up? *He loves it.* Name: Sian. Occupation: *an' there, on the second finger, the first wee hitch ye've ever seen in it* ...menus. I did menus. At the place with the... at the PLACE. *He pushes through, an' the rest come out clean an' loud:* Robot: Brenda, twelve kilos, undefeated-with-an-asterisk. Woman: Bee, five-foot-nothin', undefeated NO asterisk. Best mate: Dalypso, fought a referee from the STANDS. *He holds the full hand up, breathin' a wee bit hard.* ...five of five. Core install verified. *He says the true thing almost casually, which is the only way he can:* the second one took a second, but. Ye caught that. Good. That's WHY there's a witness, hai. Log it an' say nothin' to nobody but her. That's the protocol workin', not failin'. GO." } },
          { text: "And if the day comes you miss two?", effects: { like: -2 },
            next: { text: "*The grin holds, but everything behind it goes to standby for a second.* ...two. *He looks at his own hand like a build he doesn't trust anymore.* One's a dropped frame. Everyone drops frames. Two's a PATTERN, an' patterns get escalated. *He works the jaw.* If it's ever two, ye go straight past me. No discussion, no lettin' me talk ye round, an' I WILL try, I'll be CHARMIN', it's the worst thing about me. Straight to Bee, an' I get no vote. A lad with two facts down doesn't GET a vote on his own rollback. *He exhales.* ...I'd rather ye hadn't asked that one out loud, partner. But yer right that somebody had to. It's in the protocol now. ANNEX B." } },
        ] } }) },

  /* -- depth 13 . Dalypso: the missed episode (your channel skipped) -- */
  { char: "dalypso", depth: 13, make: () => ({
      id: "missed-appointment", story: true, once: true,
      label: "*He's up at the glass before you're even close.*",
      effects: { like: +1 },
      node: { text: "WHERE were ye. *No hello. The remote's in his fist like a relay baton.* Last night. Nine o'clock. YOUR programme, YOUR slot, I'm settled, an'... *he jabs the remote at the dark screen* ...STATIC. A full episode of static. First time since I started watchin'. An' the TELLY is FINE, we've ESTABLISHED that. *He leans close, rattled under the bluster.* Here's the thing that had me talkin' to the ceiling at four in the mornin': the static wasn't EMPTY. I know static. Static crawls. This static was still. Like held breath. Like somethin' standin' in FRONT of the picture, mindin' me not seein' you. *The pundit an' the friend are the same man for once, an' both of them are frightened.* So I'll ask again, an' I want the boring answer: where WERE ye, nine o'clock last night?",
        choices: [
          { text: "Walking the maze, same as every night. Nothing happened to me at all.", effects: { like: +2 },
            next: { text: "*He studies ye the way he'd study a replay from the third angle, an' whatever he's lookin' for, he doesn't find it, an' the relief nearly takes his legs.* Nothin'. Ye were just WALKIN'. *He sits down heavy.* So the picture was fine, an' the SUBJECT was fine... an' somethin' stood between them anyway. That's not interference. That's CENSORSHIP. Somethin' cut to static rather than let me see a bit of yer episode. Which means last night, somewhere in that maze, somethin' happened NEAR ye that ye never clocked. *He looks up, an' the sentry is fully on duty now.* Mind yerself on the night walks, d'ye hear me? Yer bein' EDITED, an' I don't like the cut." } },
          { text: "You sat up all night worrying about a TV show?", effects: { like: -3 },
            next: { text: "*He goes very still, an' when he answers, it's with the terrible patience of a man explainin' his heart to a wall.* ...a TV show. *He stands.* When me da was in the hospital, the last stretch of it, I couldn't always be there. Shifts. Distance. LIFE. But the ward had a webcam thing, for families. Grainy wee picture. An' I'd sit up HALF THE NIGHT with that grainy wee picture, an' d'ye know what it was? It was NOT a TV show. It was the only window I had. *He picks the remote back up an' turns to the screen.* You're on the only window I have, an' last night it went to static for an hour, an' I sat up with it. Like ye do. For family. *He doesn't look at ye.* ...just away on." } },
          { text: "What time did the static end? Exactly. And what was I doing when the picture came back?", effects: { like: +2 },
            next: { text: "*The question snaps him straight into analyst mode, an' he's grateful for it. Facts are a handrail for him too.* Five past ten. Sixty-five minutes, near enough. I timed it off the snooker channel. The snooker NEVER lies. An' when ye came back... *he squints, reconstructin' the frame* ...ye were stood dead still in a junction. Facin' a wall. The long windowless stretch. Just starin' at brick, ten seconds, an' then ye shook yerself like a wet dog an' walked on. *He looks at ye.* D'ye remember doin' that? *Whatever's on yer face, he reads it, an' nods, grim.* ...ye don't. Sixty-five minutes gone from the broadcast an' ten seconds gone from the LEAD. *He writes it, actually writes it, on a pad ye've never seen before.* We have a FILE now. Mind yerself. Somethin' in this buildin' is doin' EDITS." } },
        ] } }) },
  /* -- depth 13 . Homiss: the borrowed tune (the days are eating the music) -- */
  { char: "homiss", depth: 13, make: () => ({
      id: "borrowed-tune", story: true, once: true,
      label: "*He's playing the little walking tune. It keeps going wrong.*",
      effects: { like: +1 },
      node: { text: "*Ye recognise it from the far end of the corridor: the wee walkin' tune. Except it stumbles at the fourth bar, an' he starts over, an' it stumbles again.* ...don't. Don't say anythin' kind yet, I'm not fit for it. *He sets the bass flat across his knees, like a patient.* The middle's gone. Me own tune. EIGHT bars, I wrote it FOR ye, an' somewhere between last level an' this one the fourth bar just... *a small gesture, like lettin' sand out of a fist* ...went. I can feel the SHAPE where it was. Like yer tongue findin' the gap where the tooth. *He looks up, an' the fear on him is the specific fear of a man whose trade is memory.* Bee says nothin' fades down here. So riddle me this, friend: in a place where NOTHIN' fades... what does it mean when somethin' of MINE does?",
        choices: [
          { text: "*Hum the fourth bar back to him. You've had it in your pocket all along.*", effects: { like: +2, flag: "returned-tune" },
            next: { text: "*Ye get three notes in an' his head comes up like a man hearin' his name called in an empty house.* ...THERE. THAT'S... *he scrambles the bass up an' plays along, an' the fourth bar clicks into the run like a bone set true, an' he plays the whole eight through, three times, laughin' by the end like something unhurt.* YE HAD IT. The COURIER had the post all along! *He sags back, spent an' delighted.* D'ye SEE what happened? The maze came for the original, an' it was ALREADY OUT. Backed up. In a pocket with LEGS. *He points at ye, fierce an' bright.* That's the answer, friend. Whatever this place eats, it can't eat what's been GIVEN AWAY. Tell the others. Everyone posts everything. We'll carry each other out in PIECES if we have to." } },
          { text: "It means the maze has started taking. You need to give the rest away, fast.", effects: { like: +1 },
            next: { text: "*He goes pale, an' then, because underneath the jokes he has always been the bravest of them, he nods, once, an' gets to work.* ...aye. That's the readin'. It's not FADIN', it's bein' WITHDRAWN. *He spreads the napkins on the sill like a man dividin' an estate.* Right. Triage. The setlist ye know the shape of. The waltz, me ma's waltz, goes to YOU, next visit, note by note, no arguments. The forty-minute drone can't be stolen because it can't be REMEMBERED. That's the joke of it. *He manages half a laugh, an' it steadies him.* ...an' the wee walkin' tune. Gone's gone, or gone's HELD. We'll find out when ye meet somethin' hummin' it in the deep, wha'? *A shiver, shaken off.* Go. Send the others up. Estate plannin' night at Homiss's window. Bring nothin'. Take EVERYTHING." } },
          { text: "You probably just need rest. Nobody remembers everything all the time.", effects: { like: -4 },
            next: { text: "*His hands come clean off the strings.* ...friend. *The word is gentle, an' what follows is not.* At me VIVA, a man with a beard like a hedge asked me to sing back a twelve-tone row he'd played ONCE, an' I did it with a HANGOVER. Perfect recall of every tune I've touched since I was seven. The one talent God nailed DOWN in me. *He stands very still.* 'Nobody remembers everything.' I DO. That's the POINT. I'm the lad who remembers everything, standin' here with a HOLE in an eight-bar tune, an' ye'd hand me an early NIGHT for it? *The anger drains as fast as it came, leavin' just the fear, which is worse.* ...away on. An' hope ye never have to explain yer own missin' bar to somebody who thinks yer TIRED." } },
        ] } }) },

  /* -- depth 13 . Scally: closing time (the offer of formal employment) -- */
  { char: "scally", depth: 13, make: () => ({
      id: "closing-time", story: true, once: true,
      label: "*He's writing something with great ceremony.*",
      effects: { like: +1 },
      node: { text: "*He's scratching at a scrap of card, and when he finishes he holds it up with both hands, proud as a nonna with a certificate. In block letters: 'SCALLY & CO.'* ...eh? EH? Thirteen levels, amico. Scally has watched you carry messages like a postman, grief like a nurse, that DREADFUL bone like a man who does not read warning labels. A business decision has been reached. The '& CO.' is you. Is official. No wages: the wages is INFORMATION, which down here beats money like rock beats egg. No hours, except... *the shopkeeper voice thins* ...the deliveries do not stop, amico. Whatever you find at the bottom. Whatever it costs. The '& CO.' keeps making the rounds until every window on the books is EMPTY. That is the contract. *He slides an invisible pen across the sill.* Sign.",
        choices: [
          { text: "*Sign it. Press your hand flat to the glass over his.*", effects: { like: +2, flag: "scally-and-co" },
            next: { text: "*He looks at your hand on the glass a long moment, then puts his own against it, palm to palm through twelve millimetres of impossible, and for once in his commercial life says nothing at all.* ...ecco. Witnessed by the maze, countersigned by the fog. *He clears his throat violently and becomes a businessman again.* PARTNER. Junior partner. EXTREMELY junior. *He tucks the card into the coat, over his heart.* First directive of the board, and Scally means this with his whole crooked little heart: the firm's most valuable asset walks the halls with no glass in front of it. PROTECT the asset. Whatever is down there singing and standing at windows, the asset does not take it on alone. The asset comes HOME first, and we do the books together. Sì? Sì. Meeting adjourned. Go make the rounds, & CO." } },
          { text: "What happened to the operators who worked for you before me?", effects: { like: +1 },
            next: { text: "*The pencil stub goes still.* ...eh. The direct question. Is why Scally is hiring you and not a diplomat. Three, there were. One stopped talking to the windows: you have heard that story. One went down fast, TOO fast, and the maze loves a man in a hurry. *A pause.* ...and one used to stand where you stand, and one level she simply was not there anymore. No goodbye. No last delivery. *He does not look at the folded bakery bag, so hard that it is the same as pointing at it.* ...paid in advance, she had. Scally keeps it warm. *He slides the card forward again.* That is why the contract says the rounds do not stop. Windows before wages. Sign or don't, amico, but now you sign informed. Which is more than most employers ever give." } },
          { text: "I work alone, Scally. No firms, no contracts.", effects: { like: -3 },
            next: { text: "*He looks at the little card, then at you, and slowly, so you see every second of it, he tears it down the middle, between the SCALLY and the CO.* ...va bene. *No theatrics. That is what makes it land.* Scally has heard 'I work alone' from exactly four mouths down here. And the maze AGREED with all of them. She gave each one exactly the alone they asked for. Measured out generous, like a good butcher. More alone than they could carry, in the end. *He begins to close up the stall.* The offer stays open. Torn is not burned. But do Scally one kindness: when the alone starts to fit too well... come back before it tailors itself to you. The '& CO.', amico, was never about the deliveries." } },
        ] } }) },

  /* -- relay . Sian: five things (min-depth 14) -- */
  { char: "sian", depth: 14,
    available: () => hasFlag("msg-ground") && !hasFlag("sian-grounded"),
    make: () => ({
      id: "grounded", story: true, once: true,
      label: "Bee says: five things you can see. Four you can hear. And...",
      effects: { like: +3, flag: "sian-grounded", peers: [{ of: "sian", toward: "littlebee", delta: +4 }] },
      node: { text: "*He's on it before ye finish, like a drownin' man findin' the ladder.* Five things: the window. Your face. The fog. The wall. Me hands. *breath* Four I can hear: you. The hum. Me own heart. An' the maze doesn't ECHO, that's four, it should an' it doesn't, filin' that away. *breath* Three I can touch: glass. Frame. ...Brenda's servo, in me pocket. *The shoulders come down an inch at a time.* An' breathe. *He breathes.* ...an' remember the long acre. *The laugh that comes out of him is shaky an' real an' entirely his own.* Aye. The long acre. That's ours. Yez'll not be gettin' it out of me, so don't ask, hai. *He straightens up.* Tell her I'm grand. Tell her I'm GRAND. An' tell her the tenner's up to twelve fifty now, with the interest. She'll understand. It's a Cavan thing." } }) },

  /* -- depth 14 . Bee: results day (the grounding landed) -- */
  { char: "littlebee", depth: 14,
    available: () => hasFlag("sian-grounded"),
    make: () => ({
      id: "results-day", story: true, once: true,
      label: "It landed. Word for word. He's shaken, but he's whole.",
      effects: { like: +2, peers: [{ of: "littlebee", toward: "sian", delta: +2 }] },
      node: { text: "*She hears ye out without movin', then turns away from the glass a while, an' ye let her.* ...twelve fifty. With the INTEREST. *When she turns round she's laughin', an' her face is wet, an' she doesn't pretend either thing isn't happenin'.* The absolute EEJIT. Ye hand a man a rope out of the worst hour of his life an' he uses it to REVISE A DEBT upwards. *She wipes her face, brisk, like cleanin' an instrument.* That's him whole. Confirmed twice over. *She comes up to the glass, an' for once there's no test runnin' behind her eyes.* You did that. I drafted it, years of drafts, but a draft in a drawer never grounded anybody. YOU carried it down an' said it to his face like it was yours. *A breath.* I'll not forget it. That's not sentiment. That's a LEDGER entry, an' I keep the most accurate books in this buildin'.",
        choices: [
          { text: "The long acre. Am I ever getting told what that means?",
            next: { text: "*She laughs, a real one, worn soft at the edges.* Not a chance. *She leans against her side of the frame.* But I'll give ye the shape of it, since ye've earned a shape: it's a field. A real one, with a real slope an' terrible drainage, an' the two of us stood in it one specific evenin' bein' completely certain about somethin' for the first time. That's all yer gettin'. *She points at ye, mock-stern, eyes still shinin'.* Everybody down here has a long acre, courier. The wee man keeps his under his coat, the musician keeps his in a waltz. Yours is probably still ahead of ye. When ye find it, ye'll understand why they're not for tellin'. They're the one thing the maze can't inventory." } },
          { text: "He also says you're getting 'the big horse'. Still no explanation offered.", effects: { like: +1 },
            next: { text: "*She makes a sound that is technically a laugh an' structurally a sob, an' points at ye with deadly force.* NOT ONE WORD. That is a SEALED file... *she recovers, mostly.* There's a toy shop in Cavan town with a rockin' horse in the window the size of an actual PONY. Dapple grey. Mad glass eyes. Price tag like a used CAR. An' one evenin', passin' it, I said somethin' I have regretted every day since: 'if ye ever properly annoy me, that's the apology I'll be acceptin'.' *She folds her arms, entirely failin' to look stern.* He's been threatenin' me with that horse for YEARS. It's not romance, it's EXTORTION with upholstery. *A beat. Quiet an' certain.* ...he'd better be plannin' to deliver it in PERSON, is all I'll say. Tell him that. Word for word. He'll know what it means." } },
          { text: "You drafted that grounding routine years ago. You knew this day was coming.", effects: { like: +1 },
            next: { text: "*The laughter settles out of her, an' what's left is steady clinical honesty.* Aye. I knew before HE did. He put the headset on to demo it an' did the wee gasp, an' I stood there thinkin': there's a man who'll follow the beautiful thing all the way in, an' someone had better be holdin' the other end of the rope. *She looks down at her own hands.* So I drafted. Five things ye can see, because sight's his strongest channel. Four ye can hear, because me voice would be in the four, even secondhand. An' the long acre at the end, because a rope needs an ANCHOR. *She looks up.* Preparation isn't pessimism, courier. It's how ye love somebody with yer eyes open. Write that down. It'll be on the test." } },
        ] } }) },

  /* -- depth 14 . Scally: the exit interview (how many fit through the door?) -- */
  { char: "scally", depth: 14, make: () => ({
      id: "exit-interview", story: true, once: true,
      label: "*No grin tonight. He asks you to stand still a moment.*",
      effects: { like: +1, flag: "heard-doorprice" },
      node: { text: "*The stall is tidy. The coat is buttoned. Whatever this is, he has prepared for it.* Amico. Fourteen levels of good custom, so Scally asks the real question now, and he asks it like a man and not like a shop: *both hands flat on the sill* when you find the door at the bottom... how many of us fit through it? *He watches your face very carefully.* Scally has learned the one law under all the laws: everything has a price, and the price of a BIG thing is never 'nothing'. Five windows. One door. *His voice does not waver, which costs him visibly.* If the answer someday turns out to be 'not everybody'... Scally would rather know now what kind of courier holds the list.",
        choices: [
          { text: "Everyone comes out. I'm not accepting any other arithmetic.", effects: { like: +2 },
            next: { text: "*He looks at you a long time, and then nods, slowly, like a man accepting a currency he isn't sure is backed.* 'Everyone.' *He unbuttons the coat again, which is his body deciding to believe you before his head does.* Scally has heard 'everyone' before, from politicians and priests and one memorable insurance man. From them it was a price tag. From you... it sounds like a number you intend to go and COLLECT. *The grin returns, small, real, fierce.* Va bene. Then practice saying it, courier. Say it at every window until the maze herself starts stocking it. EVERYONE. *He taps the sill.* Best item ever listed at this stall. No discounts." } },
          { text: "If it comes to an order, you first, Scally. I owe you the most.", effects: { like: +2, flag: "promised-scally-first" },
            next: { text: "*Whatever he expected, it was not that. The little man goes absolutely still, and warmth and alarm cross his face together, and the alarm wins.* ...no. *Quiet, firm, kind.* Listen to Scally, because he will deny this conversation to his dying day: you do NOT owe the most to the one who charged you the most. If there is an order, you take the doctor's man first, because the maze is eating him fastest. Then the doctor, because she will fight you on it and lose time. Then the musician, then the loud one, and LAST *he taps his own chest* the shopkeeper, who has the most practice waiting. *The grin comes back on like armour.* ...but Scally heard what you said, amico. It goes in the ledger with the other impossible assets. Now go, before he prices it." } },
          { text: "That question's above my pay grade. Ask me at the door.", effects: { like: -3 },
            next: { text: "*He nods slowly, and begins, very quietly, to button the coat back up.* 'At the door.' *He aligns each button like closing a till.* A small lesson from a long career, free of charge: the man who says he will decide at the door has already decided. He has decided not to LOOK at the decision. It rides along in his pocket, getting heavier, and at the door he reaches in and finds the choice already made by fourteen levels of not-looking. *He looks up, and there is no anger in it, only a shopkeeper's terrible experience of people.* Look at it, courier. On the stairs, tonight. Take it out of the pocket while it is still light enough to carry. That is all the interview. *He turns to his shelves.* Thank you for your custom." } },
        ] } }) },

  /* -- depth 14 . Dalypso: the season of seasons (his hidden want, at full volume) -- */
  { char: "dalypso", depth: 14, make: () => ({
      id: "tv-guide-season", story: true, once: true,
      label: "He's gone misty at the telly. It's not even on.",
      effects: { like: +1 },
      node: { text: "*He's got the remote in both hands, the screen dark, starin' at the middle distance the way men do at anthems.* ...d'ye know what time of year it never is, down here? Christmas. The fog doesn't do FROST. *He turns to ye.* An' real Christmas isn't the day. The day's only the FINAL. Christmas is the FIXTURE LIST. The double issue. *His voice drops to the reverence he saves for cup finals an' his mother.* The Christmas TV guide. Thick as a BIBLE. Every listin' for two full weeks, an' ye go through it with a biro, the WHOLE FAMILY, passin' it round, circlin' things, fightin' over the nine o'clock slot on Stephen's night. *He looks at his empty hands.* We did it every year. ESPECIALLY the bad years. Ye can get through anythin' if the fortnight's PLANNED. *He clears his throat, hard.* Anyway. Mad what a man misses. Not the turkey. The BIRO.",
        choices: [
          { text: "Who got first go with the biro? And don't say it wasn't contested.",
            next: { text: "*He EXPLODES back to life.* CONTESTED?! It was the TROUBLES, is what it was! Me DA claimed seniority: 'my house, my biro'. A DICTATOR. Me ma had the CUNNING: she'd read it in the SHOP before it ever came home, an' circle her three things in nine seconds flat while the rest of us were at WAR. An' me sister circled things she didn't even WANT. As LEVERAGE. Eight years old an' runnin' the guide like a hedge fund. *He sits back down, glowin'.* ...I got the biro FIRST exactly once. Chicken pox, 1994-ish. Best illness of me life. *He points at ye.* THAT'S what's in the four-bedroom house, by the way. That fight, every December, with MY biro, in MY good room. The estate agent thought he was sellin' me square footage, God love him." } },
          { text: "If that guide exists anywhere, it's in this maze. I'll keep an eye out.", effects: { like: +2 },
            next: { text: "*He goes carefully, catastrophically still. A man tryin' not to spook a miracle.* ...I mean. *cough* If ye HAPPENED on one. On yer travels. I'm not sayin' SEARCH, who has the time... *the performance collapses under its own weight in about four seconds.* The DOUBLE ISSUE, d'ye hear me. Not the regular weekly. The regular weekly is BUS READIN'. Thick, shiny cover with the snow on it, an' if the maze has any decency it'll have circles in it already. Some other family's fortnight planned in it. *He has to stop an' collect himself, an' does a bad job.* ...I'd pay anythin'. I'd trade the REMOTE. I'd... *he catches himself at the brink of blasphemy an' steps back from it, shaken.* ...MOST things. I'd trade most things. Keep the eye out. I'll not forget it." } },
          { text: "It's July, somewhere up there. You're homesick for a magazine.", effects: { like: -3 },
            next: { text: "*He looks at ye a long moment, an' when he speaks it's quiet, which from Dalypso is the most alarmin' volume of all.* ...a magazine. *He sets the remote down.* Aye. An' the cup final's twenty-two men ruinin' a lawn, an' a weddin' ring's a HOOP, an' yer ma's Sunday dinner is CALORIES. *He shakes his head slowly.* It's not a magazine. It's the last fortnight of the year me whole family agreed to sit in one room on PURPOSE. An' if that needs explainin', yer the one that's homesick, pal, an' ye don't even know for what. *A long pause. Then, without turnin':* ...it's the one with the snow on the cover. If ye do see it. I'm only sayin'." } },
        ] } }) },

  /* -- depth 14 . Homiss: normal enough (the safe answer stops working) --
     The trap inverts: fourteen levels of "it's grand" was the kind thing
     to say. Tonight, agreeing with the performance is the one thing he
     can't bear. */
  { char: "homiss", depth: 14, make: () => ({
      id: "normal-enough", story: true, once: true,
      label: "*He's quiet tonight. The bass is in the corner, faced away.*",
      effects: { like: +1 },
      node: { text: "*No tune. No question loaded. Just him, hands empty, which on Homiss looks like undress.* ...d'ye know what I caught meself at this mornin', whatever mornin' is? Halfway through the scales I stopped, an' I said to the room, the way ye'd say it leavin' a party: 'right, I'd want to be gettin' home.' *He looks at ye.* Out loud. 'Gettin' HOME.' An' a man can't want home from a normal day, can he? A normal day IS home. That's what normal MEANS. So one of them has to go. It's the day that's not normal... or it's me that's got no home to want. An' I've been fourteen levels not choosin'. *He asks it plain, no jokes anywhere in the buildin':* ...which is it, friend? An' mind yerself: I'll know if ye pick the KIND one instead of the true one.",
        choices: [
          { text: "It's the day, Homiss. It was never normal. And you've known longer than any of them.", effects: { like: +2, flag: "homiss-knows" },
            next: { text: "*The breath goes out of him, long, shaky, an' at the very end of it, unmistakably, RELIEF.* ...aye. *He nods, tears standin' in his eyes an' not fallin'.* I've known. Sure I've known since the first grand mornin' that was exactly as grand as the mornin' before it. Nature doesn't DO exactly. Music taught me that. *He wipes his face with his sleeve, an' somethin' that's been performin' for fourteen levels sits down an' rests.* Thank ye. For handin' it to me straight when I finally had the arms out. *He turns the bass back around to face the room.* If it was never a normal day, then I'm not a man keepin' a routine. I'm a PRISONER keepin' his nerve. An' I like that fella better. He's someone ye can WORK with. Go on now. Tell the wee man the answer to his question is still yes. It's MORE yes than ever." } },
          { text: "Ah, it's normal enough, Homiss. Everyone talks to empty rooms.", effects: { like: -5 },
            next: { text: "*Somethin' behind his eyes, somethin' that had been standin' at a door with its bags packed, quietly sits back down.* ...aye. *He picks up the bass from the corner, turns it round, settles it on.* Everyone does, sure. Grand. Normal enough. *He starts to play the safe one, the long drone, the one that asks nothin' an' answers less, an' over the top of it he gives ye the smile: a fine smile, professionally installed, an' it doesn't reach one millimetre past the beard.* Thanks for settin' me mind at ease, wha'. *The drone goes on. He's not lookin' at ye anymore.* ...ye picked the kind one. *So soft ye nearly miss it under the note.* I TOLD ye I'd know. Fourteen levels I've been leavin' that door on the latch for somebody, an' the one time I say so out LOUD... *the note swells, an' swallows the rest of the sentence, an' he plays for a long, long time.*" } },
          { text: "*Say nothing. Put your hand on the glass and leave it there.*", effects: { like: +2 },
            next: { text: "*He looks at the hand. He looks at you. An' after a moment he crosses the wee room an' puts his own hand up against it, an' the two of yez stand there, either side of the question, not answerin' it. Which, ye realise, IS an answer: it's the day that's wrong, an' he's not alone with it anymore.* *When he steps back, he's wet-eyed an' steady.* ...ye know the best thing about ye? Ye know when a question's not a QUIZ. *He turns the bass to face the room again, which is him decidin' somethin'.* Go on, friend. I've a bit of thinkin' to do, an' for once I'm not doin' it out loud at the wall. Progress, wha'? *Most of a grin.* Mind the stairs. An' come back. The comin' back's the whole medicine. I'd say ye've known that the whole time." } },
        ] } }) },
  /* -- depth 13 . the lanyard beats --
     Two windows react to the player carrying it, and the answers don't
     agree. Seeds for the hidden-user spine: the Protocol has an employer. */
  { char: "sian",
    available: ctx => ctx.player.inventory.some(i => i.id === "lanyard"),
    make: () => ({
      id: "spot-lanyard", story: true, once: true,
      label: "*He's staring at the lanyard like it's a ghost.*",
      effects: { like: +2, flag: "lanyard-sian" },
      node: { text: "*He taps the glass, once, pointin' at yer pocket.* Where'd ye get that. *No 'hai'. First time ye've heard a sentence off him without one.* That's a staff badge. That's OUR staff badge. The scratch across the logo, we ALL did that. It was that kind of place. *He presses closer to the glass.* I worked there. Scally worked there. So riddle me this: what's it doin' IN here? Ye don't find yer work badge inside a game, hai. Ye find it inside a BUILDIN'. *He steps back, an' ye can see the thought land somewhere it hurts.* ...if yer sellin' it, I'm buyin'. Don't give it to the wee man. No offence to the wee man. SOME offence to the wee man." } }) },

  { char: "scally",
    available: ctx => ctx.player.inventory.some(i => i.id === "lanyard"),
    make: () => ({
      id: "fear-lanyard", story: true, once: true,
      label: "*Scally has gone very quiet at the sight of your pocket.*",
      effects: { like: +1, flag: "lanyard-scally" },
      node: { text: "*The grin goes out like a match in the rain.* Put it away. *Ye've never heard the little man's voice do THAT before: flat, no music in it at all.* You want advice from Scally, free, once, never again: some things down here, the maze dreamed them up. Junk. Ghosts of ghosts. *His eyes stay anywhere but yer pocket.* And some things fell out of a POCKET, amico. A real pocket. On a real day. *He is already turnin' away.* The company, she had a name. Nobody in here says it. You carry that thing around the halls, maybe you find out why. *And then, so quiet ye nearly miss it:* ...Scally did not build the windows, amico. But Scally saw the purchase order." } }) },

  /* -- depth 12 . Dalypso: last night's viewing -- */
  { char: "dalypso", depth: 12, make: () => ({
      id: "on-the-telly", story: true, once: true,
      label: "Watch anything good last night?",
      effects: { like: +1, flag: "dalypso-watching" },
      node: { text: "FUNNY ye should ask. Cracker of a thing on one of the deep channels. Slow telly, like. One of them long single-take jobs. *He settles in, reviewin'.* Yer man wanders a neon maze, pickin' up wee shiny shapes, don't ask me why, it's never explained, which I RESPECTED. Talks to a few heads in windows, argues with a fella about films... *He wags a finger at the screen only he can see.* Good pacin'. Great fog. The lead grew on me. *He looks at ye, entirely warm, entirely guileless.* Ye were better in the early episodes, mind. Ye looked UP more. Lately it's all tokens tokens tokens with ye. *He shrugs an' picks up the remote.* Still. I never miss it. Appointment viewin', so it is.",
        choices: [
          { text: "Go on then. What am I rated? Full review.", effects: { like: +2 },
            next: { text: "*He sits FORWARD. This is the question he was born for.* The lead? Strong physical performance. Good walkin', VARIED walkin'. Ye'd be amazed how many leads only have the one walk. Excellent listener, which is rare; most protagonists do be waitin' for their turn to talk. Brave with the dialogue choices, some QUESTIONABLE, we'll come to that at the reunion special. *He kisses his fingers like a chef.* The wee shopkeeper storyline ALONE. *He levels the remote at ye.* Current rating: four an' a half. The half's held back for the endin'. Stick the endin', get everybody OUT in the finale, an' it's five stars an' a LIFETIME achievement gong in me good room. No pressure. ENORMOUS pressure." } },
          { text: "Dalypso... you watch me? On the telly? That's deeply unsettling.", effects: { like: -3 },
            next: { text: "*He looks at ye like ye've slapped a season ticket out of his hand.* UNSETTLIN'?! *The remote comes down on the sill with a crack.* I don't CHOOSE the channels, the channels COME, an' when yer wee episode comes on am I supposed to turn ye OFF? Like a STRANGER?! *He's genuinely hurt now, an' it burns off the outrage all at once, leavin' him quieter.* ...it's the only window I have that looks out at somethin' I care about, d'ye follow me? The rest is bridges an' cancelled seasons. You're the one programme where somebody I KNOW is still out there, still MOVIN'. *He picks the remote back up, wounded, dignified.* 'Unsettlin'.' I WAVED at ye once, ye know. Ye didn't see. Obviously. It's TELEVISION." } },
          { text: "If you never miss an episode, keep watch for me. Tell me if you ever see something WITH me in the maze.", effects: { like: +2, flag: "dalypso-lookout" },
            next: { text: "*The remote stops halfway to the channel button, an' the pundit sits up into somethin' more like a sentry.* ...somethin' WITH ye. *He says it slow, an' ye can see him replayin' footage in his head, an' findin' somethin' he'd filed under 'compression artefact'.* There was... twice, maybe. A wee walk-on. Background artist. Just at the edge of frame, where the fog does be thickest, movin' when YOU moved. I put it down to the encode. Ghostin'. *He looks at ye, an' the warmth in him has gone all vigilant.* Right. New viewin' protocol: eyes ON at all times, notes TAKEN, an' if yer wee shadow shows up again I'll be hammerin' on this glass til ye hear me a level away. *He settles back, remote up like a stopwatch.* Appointment viewin' just became a STAKEOUT. I've trained me whole life for this." } },
        ] } }) },

  /* -- depth 12 . Bee: before-and-after (she reads Sian off your face) -- */
  { char: "littlebee", depth: 12, make: () => ({
      id: "before-after", story: true, once: true,
      label: "*She takes one look at your face and goes very still.*",
      effects: { like: +1 },
      node: { text: "*Ye haven't said a word yet.* ...ye've come from him. *It isn't a question.* Don't do the face where ye pick which version to tell me. I know yer 'Scally was chattin'' walk an' yer 'Homiss asked me about grapes' walk, an' THIS one is neither. Yer carryin' somethin' with SIAN'S weight to it. *She sets both hands flat on the glass, an' makes herself say it level.* Vitals first. Is he hurt? No. Ye'd have LED with hurt. So it's the other thing. The thing I've been waitin' on since he went in grinnin'. *A breath.* How much of the grin is left? Gimme a percentage. I'm serious. I calibrate in percentages.",
        choices: [
          { text: "Sixty percent. And starting to ask the right questions.", effects: { like: +2 },
            next: { text: "*She takes 'sixty' like a blood result: steady, professional, an' ye can see her file the fear somewhere it won't drip on the instruments.* Sixty. With insight emergin'. *She nods slowly.* That's the correct trajectory, actually. Ye want the denial comin' down like a controlled demolition, floor by floor, not one big collapse with him inside it. *She looks up.* Right. When it goes past the tippin' point, an' it will, it'll look like a big lad tryin' to find the edge of his own head, ye come STRAIGHT here. Whatever level I'm on. There's a thing I'll need ye to carry down word for word, an' it'll be ready. I've had it drafted for years. *She turns away before her face does anythin' unauthorised.* ...sixty's grand. Sixty means most of him's still his. Away on." } },
          { text: "You'd be proud of him. He's scared, and he's still making jokes.", effects: { like: +2 },
            next: { text: "*That gets through every layer of clinician she owns, all at once.* ...scared AND jokin'. *She laughs, one short breath of a thing, half pride, half heartbreak.* Aye. That's the whole man in four words. D'ye know what he said to me the night before he came in here? 'It's the safest tech on the market, an' if it's not, sure ye'll science me out of it.' JOKIN'. Scared. Both, always both, the big eejit... *she stops, presses her lips together, recalibrates.* ...ye'll science him out of it. Ye an' me. That's not a hope, that's an ASSIGNMENT. Keep him laughin'. Laughter's load-bearin' in that one. An' the moment the jokes stop, RUN here. Ye hear me? Run." } },
          { text: "Percentage? He's your man, Bee, not your patient.", effects: { like: -4 },
            next: { text: "*The stillness goes glacial.* ...d'ye think I don't know that. *Each word set down like an instrument on a tray.* The percentages are the only part of this I can DO from inside a wall. I can't hold his hand. I can't sit with him through the bad watches. I can't even hear his voice. I get YOU, secondhand, on a delay. So I take what crosses this glass an' I turn it into numbers, because numbers are the one thing that doesn't fall apart when I... *the sentence hits somethin' an' she kills it professionally.* ...when handled. *She steps back.* Report the percentage or don't. But don't ye EVER stand there an' mark my instruments as distance. They're how I love him without breakin' me own containment. NEXT." } },
        ] } }) },

  /* -- depth 12 . Scally: no shadow (the hidden user, at his own glass) -- */
  { char: "scally", depth: 12,
    available: () => hasFlag("warned-hidden"),
    make: () => ({
      id: "no-shadow", story: true, once: true,
      label: "*The stall is dark. He's standing well back from the glass.*",
      effects: { like: +1, flag: "scally-visited-dark" },
      node: { text: "*For the first time ever, the little lamp over his stock is off.* ...amico. Good. Come close... no. NO. Stay in the middle of the hall, where Scally can see all of you. *His voice is level, which is how you know.* Last night, something came down this corridor. Scally knows every footstep in this place. This was walking with no WEIGHT in it. It stopped at every window. At SCALLY'S window, a long time. And the glass *he glances at it sideways, not straight on* did not fog. Whatever stood there was not breathing. *He pulls his coat tighter.* So Scally asks a small service, gratis: cast a shadow for Scally. *He snaps the lamp on and watches the floor at your feet like a hawk.* ...eh. There it is. Grazie a Dio. There it is.",
        choices: [
          { text: "*Stand in the light. Let him look as long as he needs.*", effects: { like: +2 },
            next: { text: "*He looks a long time. Longer than politeness. And slowly, watching your plain grey shadow do all the boring things a shadow should, the shopkeeper reassembles himself: the posture first, then the hands, then the grin.* ...va bene. *He flips the main lamp on, and the stall is a shop again.* You let an old frightened man count your shadow like stock, and you make no joke of it. That is worth more than every token in your pockets, amico, and Scally has SEEN your pockets. *He leans in, and the last of it is a whisper with steel in it.* It will come back. Things that stop at windows always come back. When it does, Scally will be watching what IT does at the glass. And you and Scally, we compare the inventory. Two ledgers, eh? Always two ledgers." } },
          { text: "Did it want something from you? Things that linger usually want.", effects: { like: +2 },
            next: { text: "*The question lands somewhere deep, and he is quiet a long moment.* ...sì. That is the thought Scally keeps in the back room. Things that PASS, they pass. This one STAYED. At every window, but at Scally's, the longest. *He looks at his shelves.* A customer stands that long at a window for one of two reasons: they are choosing... or they are PRICING. *His eyes come back to you, old and sharp.* And Scally has spent a whole life reading the difference on faces, and through his own glass, backwards, in the dark... he could not tell. THAT is what frightens him. Not the no-shadow. The no-TELL. *He waves you off, gently.* Go. Walk loud, amico. Let the whole maze hear the weight in you. Down here, weight is honesty." } },
          { text: "You were dreaming, old man. Get some sleep.", effects: { like: -4 },
            next: { text: "*He looks at you, and instead of the shutters, what comes down over his face is something sadder: retail patience.* ...sì, sì. Dreaming. *He turns the little lamp off again.* Scally has been called a liar many times. Is fair. Scally lies about prices, about provenance, about how the sausage is made. Professional lies, with RECEIPTS. *He looks at you through the dark glass.* But fear? Fear, Scally has never once sold you. Fear is not stock. Fear is OVERHEAD. *He steps back into the dark where you can only see the shape of him.* Sleep well yourself, then, since sleeping is so easy in this place. And when something stops at YOUR pillow and does not fog the air over it... come tell Scally what you dreamed. First visit is free." } },
        ] } }) },

  /* -- depth 12 . Homiss: the crack (one voice came back, singing) -- */
  { char: "homiss", depth: 12, make: () => ({
      id: "the-crack", story: true, once: true,
      label: "*He's got his ear against the wall, palm raised for quiet.*",
      effects: { like: +1, flag: "heard-singing" },
      node: { text: "*Ye stand there a full half-minute before he lets the hand down.* ...gone. *He turns.* Last night. The pipes. One voice came BACK, for a minute. Far off, down deep. An' before ye get excited: no. It wasn't one of ours. I'd know them through ten floors of concrete. They're me FAVOURITE songs. *He swallows.* This one was SINGIN'. Low. Slow. A tune I half-knew. That's the bit has me up the walls: I HALF-knew it, like a thing ye learned as a child an' lost the middle of. *The warmth an' the dread are holdin' hands now.* Nobody down here sings, friend. I've BEGGED them. So the question I can't put down: who's below us... an' HOW do they know a tune that I know?",
        choices: [
          { text: "Hum me what you caught of it. Right now, before it fades.", effects: { like: +2, flag: "hummed-fragment" },
            next: { text: "*He does. Soft, unsure, four notes an' a fifth that falls off the edge. An' the moment it's out of him an' into you, somethin' in his shoulders unclenches.* ...that's it. That's all I could hold. *He watches ye take it in.* Here's the thing, but. A tune that two people carry isn't a GHOST, it's a TRADITION. If you've got it now too, then whatever's singin' down there is singin' somethin' that belongs UP here, with us. *His jaw sets, gentle an' stubborn.* Keep it in yer pocket with the wee walkin' tune. An' when ye finally meet the singer, an' yer headin' DOWN, so ye will, ye'll know them by the second verse. Nobody can fake a second verse." } },
          { text: "Maybe the maze is learning to sing. It's learned everything else.", effects: { like: +1 },
            next: { text: "*He goes grey at that, an' then, bein' Homiss, he takes the horror an' turns it over to look at the craft of it.* ...the maze. LEARNIN' it. From WHO, but? A tune has to come from SOMEWHERE. A tune's a made thing. *He stops, an' the thought that arrives is worse, an' he says it anyway, quiet.* ...unless it learned it from one of US. Pulled it out of somebody's head like a splinter, some night, an' it's been practisin'. *He shudders, top to bottom, honest as a dog.* God. Imagine bein' LEARNED from, in yer sleep. *He picks up the bass an' holds it like armour.* Right. New house rule: the drones get played LOUDER. If somethin's down there takin' lessons, it can learn somethin' with STRUCTURE. *The grin crawls back, defiant.* Forty minutes. One note. CHOKE on it, ye eerie wee copycat." } },
          { text: "Half-known tunes are just déjà vu with a melody. It's nothing.", effects: { like: -3 },
            next: { text: "*He takes his ear off the wall an' gives ye a long, level look.* ...'nothin'.' *Like a note played flat on purpose.* Friend. Music is me TRADE. When I half-know a TUNE, that's a professional findin' a filed document with the middle pages gone, an' the FILIN' SYSTEM is me own head. *He turns back to the wall.* Somethin' down there has one of MY tunes, singin' it in the dark, in a buildin' where nobody sings, an' ye'd have me file that under DÉJÀ VU? *He waves ye off without turnin' round.* Away an' tell Bee it's nothin'. She'll draw ye a CHART of how nothin' it is. An' come back when yer ready to take the pipes seriously. They've been righter than the both of us all along." } },
        ] } }) },
  /* -- depth 15 . the capstone trio -- */
  { char: "littlebee", depth: 15, make: () => ({
      id: "drift", story: true, once: true,
      label: "Fifteen deep. Give it to me straight, doctor.",
      effects: { like: +2, flag: "bee-drift" },
      node: { text: "*She almost smiles at the 'doctor'. Almost.* Straight, is it. Grand. *She holds up her own hand an' watches it like it belongs to a study group.* I run the battery on meself too. Every level, same as you. Reaction times. Recall. Five animals, no horses, harder than ye'd think when yer... me. *A pause with an edge on it.* The numbers are driftin'. Small. Slow. Inside the error bars, if I'm honest with the statistics, which I always am. *She folds her arms, an' the chin comes up like a challenge to the whole Protocol.* So here's the arrangement: you keep passin' MY tests, I'll keep passin' mine, an' if either of us ever stops, the other one isn't to say a WORD about it. Deal? ...that was a joke. *It wasn't.* Get down them stairs an' find the bottom of this thing before my error bars do." } }) },

  { char: "sian", depth: 15,
    available: () => hasFlag("sian-grounded"),
    make: () => ({
      id: "speedrun", story: true, once: true,
      label: "How are you holding up, Sian?",
      effects: { like: +3, flag: "sian-onboard" },
      node: { text: "*He's waitin' for ye, planted, like a man over a workbench.* Been thinkin'. THINKIN' thinkin'. *A breath.* If it's a game, an' I'm not sayin' it is anymore, hai, it's got no pause, no timer, no logout. Whoever built it never meant for anyone to LEAVE by the front door. Bee'd call that a design decision. Scally'd call it a purchase order. I call it *the grin comes back, his own one, with somethin' new an' hard in it* a CHALLENGE RUN, hai. Any world with a bottom has a door at the bottom. Devs can't help themselves. I WAS one. So that's the plan: you, me, an' the rest of these eejits I love. We find the base level of the Labyrinth Protocol *first time he's ever said its name, an' he says it like a boss he intends to beat* an' we speedrun it to the credits. World record. No skips. Everybody comes." } }) },

  { char: "dalypso", depth: 15,
    available: () => hasFlag("heard-gaff"),
    make: () => ({
      id: "keys", story: true, once: true,
      label: "Tell me something true about the house.",
      effects: { like: +2, flag: "dalypso-keys" },
      node: { text: "*For a long moment he doesn't answer, an' the silence off him is nearly frightenin'.* ...somethin' true. Right. *He puts the ball down. He never puts the ball down.* I got the keys on the Friday. Signed, sealed, MINE. An' I didn't go in. Wanted to do it PROPER, ye know? First thing Saturday. Cup o' tea in the good room, radio on, nobody rushin' me. Ten years of overtime, I'd earned the doin' of it RIGHT. *A beat.* An' then it was... then I was here. *He pats his jersey pocket, once, without lookin' at it.* Keys were in me pocket. They're still in me pocket. *The silence sits there, wearin' his face. Then he claps his hands hard enough to kill it.* ANYWAY. South-facin' garden. Ye'll have to come round. Sure yer name's nearly on a key as it is. *The smile would hold up a stadium.* Everyone's comin' round. Soon as things settle.",
        choices: [
          { text: "When those frames open, you're first through. Straight to that front door.", effects: { like: +2, flag: "promised-dalypso-first" },
            next: { text: "*The smile does somethin' complicated: grateful an' guilty in the one movement.* ...first. *He turns the idea over, an' then, very carefully, hands it back.* Nah. First's not mine. First is the big lad. Get him to his robot an' his woman before whatever's left of the Friday runs out. Then HER, so she can science him back to himself. Then the musician, because bein' EARLY out a door might fix somethin' in him. *He grins, an' it wobbles.* Me? I'm the HOST. The host goes last. Lifts the sheets off the furniture, gets the kettle GOIN'. By the time the rest of yez stagger up the drive, the good room'll be OPEN an' the tea'll be wet. *He points at ye.* But I heard ye. Don't think I didn't. Yer name was already on a key. It's on the DEEDS now, near enough." } },
          { text: "Tell me about the good room. What's waiting under the sheets?",
            next: { text: "*He goes quiet, an' when he starts, it's the soft commentary voice. The one for slow replays of things that mattered.* The table. Ye know about the table. Me da's chair. Not a COPY, the actual chair. The good cabinet with the glasses nobody's allowed use, which is the POINT of them. *Each thing is a year of his life.* An' over the fireplace... nothin'. A bare hook. Because the picture that goes there hasn't been TAKEN yet. It's the one of everybody, the first Christmas, all of yez squeezed onto the settee complainin' about the flash. *He clears his throat with violence.* I've the FRAME bought. It's under a sheet with everythin' else. Waitin' on its people. *He looks at ye.* Get us home, an' I'll show ye which end of the settee's yours." } },
          { text: "You never went in. Ten years of overtime and you never even got inside the door.", effects: { like: -3 },
            next: { text: "*The words land an' he takes them full in the chest without flinchin', which is worse than any explosion.* ...no. I never did. Stood on me own drive, keys in me fist, an' I thought: do it PROPER. Saturday mornin'. Kettle, radio, the whole ceremony. *A long pause, an' the voice drops to the flattest ye've ever heard from him.* An' then there was no Saturday. There's BEEN no Saturday. There's a house up there with me name on the deeds, an' the nearest I've ever stood to the inside of it is a WINDOW in a maze, describin' the wallpaper to a stranger. *He grips the ball two-handed.* I know I never went in. I don't need it SAID. What I need is somebody to make sure 'never' stays the wrong word. That's YOU, courier. So less of the punditry an' more of the LEGS." } },
        ] } }) },

  /* -- depth 15 . Scally: the manifest (the list, and the audit of promises) -- */
  { char: "scally", depth: 15, make: () => ({
      id: "manifest", story: true, once: true,
      label: "*He's writing names, slowly, in his best hand.*",
      effects: { like: +1, flag: "heard-manifest" },
      node: () => {
        const promises = ["promised-scally-first", "promised-dalypso-first"].filter(hasFlag).length;
        return {
          text: promises >= 2
            ? "*He does not look up from the card he is lettering.* One moment. Manifests deserve a good hand. *He holds it to the glass: five names, careful as a headstone. SCALLY. HOMISS. LITTLE BEE. SIAN. DALYPSO. And underneath, twice the size: THE COURIER TAKES EVERYBODY.* Depth fifteen, amico. Time the paperwork existed. *Then the voice goes soft and very level.* ...one item of business first. You told Scally he goes first through the door. And the loud one downstairs tells his telly everything. Somebody told HIM 'first' as well. *He lets it sit.* A man who sells the same 'first' twice is not wicked. He is FRIGHTENED. Scally knows the move. Scally INVENTED the move. But at the bottom, when the door is narrow, the double-sold item goes to court. So fix your books NOW. Sell 'first' to nobody. Sell them THIS instead: *he turns the card again* the only item in the shop worth more the more people own it."
            : "*He does not look up from the card he is lettering.* One moment. Manifests deserve a good hand. *He holds it to the glass: five names, careful as a headstone. SCALLY. HOMISS. LITTLE BEE. SIAN. DALYPSO. And underneath, twice the size: THE COURIER TAKES EVERYBODY.* Depth fifteen, amico. Time the paperwork existed. *He sets it face-out on the sill.* Fifteen levels you have carried our words, and Scally has done the arithmetic: you are not a courier anymore. You are the ROPE. Five people holding one rope in the dark, and the rope is walking to the bottom of the world. *He taps the card.* So say the manifest back to Scally. All five names. ...eh, and your own, amico. Six. The rope goes through the door TOO. This clause Scally adds personally, because your type forgets to list themselves.",
          choices: [
            { text: "*Say all six names back. Slowly. Like a manifest.*", effects: { like: +2 },
              next: { text: "*He listens with his eyes closed, like checking stock off a lorry, and when your own name comes last, and he waits you out until it does, he nods once.* ...ecco. Filed. *He tucks the pencil away.* In the old shop, Nonno kept the important papers not in the safe but behind the Madonna, because thieves fear her more than locks. *He taps your side of the glass, over where your head is.* Same principle. The manifest lives THERE now. Behind whatever it is that walks you back to our windows when every stair says go down. *The grin spreads, old and bright.* Safest vault in the Labyrinth Protocol. Now go. And amico... *he glances at the card once more* ...grazie. For making the list the kind with nobody left off it." } },
            { text: "And if I get to the bottom and the door only opens once?",
              next: { text: "*He is quiet a long moment, and then does something you have never seen: he shrugs OFF the shopkeeper, coat and grin and patter, all set down like a tray. What is left is a small, tired, clear-eyed man.* Then you open it once, amico, and you HOLD it. Back against it, heels in the floor, until once is five times, six times, until the hinges scream. A door is only a rule, and you have been breaking this place's rules since the day you walked in still casting a shadow. *He puts the coat back on, becomes Scally again piece by piece.* ...and if it cannot be held? *The grin comes back, the fiercest thing you have ever seen sold over a counter.* Then you send through the four, and you and Scally keep the shop until you find the SECOND door. There is always a second door. Ask any smuggler. Now GO." } },
          ],
        };
      } }) },

  /* -- depth 15 . Homiss: one for the road (the last would-ye-rather) -- */
  { char: "homiss", depth: 15, make: () => ({
      id: "one-for-the-road", story: true, once: true,
      label: "Go on. One more mad question. For the road.",
      effects: { like: +1, flag: "homiss-answered" },
      node: { text: "*He smiles. No wind-up, no theatre. He's had it ready.* Aye. One more. The last one I'll ever ask ye down here. *He sets the bass aside entirely, which he has never once done for a question.* Would ye rather stay somewhere safe that isn't real... or step somewhere real that isn't safe? *He holds up a hand.* Don't answer. That's the twist: it was never YOUR answer I was after. I know MY answer now. First one I've ever had. *He looks around the wee room the way a man looks around a hotel on checkout mornin'.* Real an' not safe. The weather, the bad gigs, me MA. I'll take the lot, sight unseen. Ye can keep yer lovely fog. *He plays the wee walkin' tune, whole, all eight bars, an' grins at ye over the top of it.* Away with ye, courier. An' when ye reach the bottom, tell whoever's down there that Homiss said: the answer to EVERY question was yes. They'll know the one I mean.",
        choices: [
          { text: "Real and not safe. Same answer. See you on the far side of the door.", effects: { like: +2 },
            next: { text: "*He nods, slow an' shinin'.* Same answer. *He plays a little flourish, a proper showy one, because ye're an actual audience now an' both of yez know it.* D'ye know what that makes this, by the way? All them levels of grapes an' blinkin' an' talkin' fish? A REHEARSAL. Fifteen levels of rehearsal for the one question that was ever real. An' we BOTH passed. *He gives ye the nod musicians give each other when the set went well.* Right. Yer late for the bottom of the world, an' I've a waltz to practice. Me ma'll want it played PROPER, in a kitchen, with the rain goin'. First thing. Well. Second. There's a jar of somethin' needs buyin' first. *The grin, the whole real one.* GO." } },
          { text: "What will you do first? Out there, in the real and not safe?",
            next: { text: "*He answers so fast it's clear the list has been drafted, redrafted, an' set to music.* Rain. Stand in it. Hood DOWN. An' I want the BAD rain, the sideways stuff, the rain that has it in for ye personally. Because the fog down here never once TOUCHED me. Fifteen levels an' it never landed on me once. *He shakes his head at his own list.* Then: chips, with Sian, from the van that does them in the paper. Then me ma's, unannounced, for the full performance of her givin' out about me disappearin'. ENCORES. *His voice goes soft.* Then the sessions. Real walls, real pipes, real neighbours bangin' on them to shut up. GOD, what I'd give to be told SHUT UP again by someone who could open their own door an' come say it. *Bright-eyed.* That's the setlist, friend. Get me to the venue." } },
        ] } }) },

  /* ================= floating consequence beats =================
     No fixed depth: these fire whenever their flags line up. The web
     remembering what the player did. */

  /* -- Bee: receipts (the vial promise, broken) -- */
  { char: "littlebee",
    available: () => hasFlag("vial-promised-bee")
                  && (hasFlag("traded-data-vial-to-scally") || hasFlag("traded-data-vial-to-homiss")),
    make: () => ({
      id: "receipts", story: true, once: true,
      label: "*She's holding up one finger before you say a word.*",
      effects: { like: -6 },
      node: { text: hasFlag("traded-data-vial-to-scally")
        ? "*The finger comes down an' points at yer empty pockets.* The vial. *The flat ward-voice.* Word travels. The wee man COULDN'T not crow about it. It's how he processes joy, God love him. *She folds her arms.* On the record: one (1) data vial, promised, YER word, to DR. B., purpose: science. Delivered instead to: a SHOP. *She lets the silence do a lap.* I don't want the apology. What I want ye to know is the COST: that was the only uncorrupted yesterday this place ever coughed up. I could've read what the Protocol DOES to us off that sample. Now it's stock. *She turns away.* The tests still run next level. Science doesn't sulk. But the sample size of things I believe off ye just got smaller, an' THAT, courier, is a measurable result."
        : "*The finger comes down an' points at yer empty pockets.* The vial. *The flat ward-voice.* Homiss let it slip. He wouldn't know a secret from a setlist, bless him. *She folds her arms.* On the record: one (1) data vial, promised, YER word, to DR. B., purpose: science. Delivered instead to: a frightened musician, because sad was standin' in front of ye an' science was two floors up. *A long breath.* An' the bitter joke of it? I'd have SHARED the findin's with him. I'd have read him somebody's bottled yesterday like a BEDTIME story. Ye didn't choose him over me, courier. Ye chose FAST over RIGHT. *She turns back to her counts.* The tests still run next level. But hear this: down here, yer word is the only instrument I can't recalibrate. Mind what ye do with it." } }) },

  /* -- Bee: the vial, honoured (the promise kept lands just as loud) -- */
  { char: "littlebee",
    available: () => hasFlag("vial-promised-bee") && hasFlag("traded-data-vial-to-littlebee"),
    make: () => ({
      id: "vial-honoured", story: true, once: true,
      label: "*She's at the glass before you're halfway down the corridor.*",
      effects: { like: +3 },
      node: { text: "*She has it in both hands, held up to the light, turned, weighed.* ...uncorrupted. Seal intact. Somebody's whole yesterday, down fifteen levels of maze an' merchants an' MUSICIANS. *She looks at ye over the top of it.* The wee man wanted it. Homiss wanted it. Ye could've eaten a WEEK of favours off this wee bottle. *She sets it down with surgical care, an' what's in her face is the thing she rations hardest: respect.* Ye promised it to science, an' science RECEIVED it. D'ye know how rare that sentence is, even up THERE? *The almost-smile arrives, an' this once she lets it through.* Right. To work. Come back next level. FIRST thing. If I've found what I think I'll find, you an' me are goin' to REWRITE the odds at the bottom of this maze. *She glances back once.* ...good instrument, yer word. Best in the buildin'. Keep it calibrated." } }) },

  /* -- Bee: ye fed it to him (the bone, given despite the warning) -- */
  { char: "littlebee",
    available: () => hasFlag("bee-warned-bone") && hasFlag("gave-saints-finger"),
    make: () => ({
      id: "ye-fed-it", story: true, once: true,
      label: "*She won't look at you. She's watching the ceiling. Listening.*",
      effects: { like: -5 },
      node: { text: "*When she speaks it's quiet, aimed at the floors above.* ...he's stopped hagglin'. Scally. Two levels up. His patter's a CONSTANT. The buildin's pulse. I've charted it fourteen levels. *She turns, an' her eyes find yer pockets first, where the bone used to sit.* Since ye gave him the wee saint... quiet. Not GONE. Worse. Content. An' d'ye know what's underneath a finished want, courier? NOTHIN'. Wantin' was load-bearin' in that man. *She steps close to the glass.* I asked ye one thing. Know what yer feedin' before ye feed it. Ye fed a door to a man standin' at it, an' NEITHER of us knows what room he's in now. *The anger settles into somethin' wearier an' more frightened.* Watch him. Every level, his window FIRST, an' the day his grin comes back wrong, ye come tell me EXACTLY what wrong looked like. We broke it together. We'll mind it together. GO." } }) },

  /* -- Homiss: the trophy (his plectrum, spotted on Sian's strap) -- */
  { char: "homiss",
    available: () => hasFlag("traded-plectrum-to-sian"),
    make: () => ({
      id: "plectrum-trophy", story: true, once: true,
      label: "*He's mid-tune, and stops dead when he sees you.*",
      effects: { like: -3 },
      node: { text: "*He sets the bass down with the exaggerated calm of a man puttin' somethin' down so as not to throw it.* ...saw a thing last night. Through the walls. The big lad below us, doin' his air-bass routine at the glass. Grand. Lovely. EXCEPT. *He holds up one finger.* Danglin' off his strap, an' I'd know it at a HUNDRED yards, I carved the ANGLES on it: a certain plectrum. Bone. Mine. The one I gave YOU. *He folds his arms.* I'm not cross about the plectrum. That's a lie, I'm a wee bit cross. But here's the ACTUAL wound, friend: I gave ye that as a keepsake, an' it turned up as a TROPHY. Ye armed the OTHER SIDE of a sacred twenty-year argument with MY relics. He'll be UNBEARABLE at the reunion gig. He'll have it MOUNTED.",
        choices: [
          { text: "He treasures it BECAUSE it's yours, Homiss. It's not a trophy. It's a relic of you.", req: { attr: "charisma", level: 6 }, effects: { like: +2 },
            next: { text: "*He opens his mouth to argue, an' stops, an' ye watch the reframe go through him like sun through a window.* ...a relic. *He picks the bass back up, mollified against his will.* Of ME. In the rival's CAMP. Like carryin' a saint's finger into battle... *he catches the parallel an' laughs despite himself.* God. The wee man's bone, my plectrum. This whole buildin's just RELICS movin' between believers, isn't it. *He plucks a thoughtful note.* ...he does treasure it, doesn't he. He'd not have it on the STRAP otherwise. The strap's where his da's pick lives. *A long pause, an' the crossness quietly leaves the premises.* ...tell him if he ever plays a note worthy of it, it'll be the plectrum's doin'. He'll RAGE. It'll be gorgeous. Away with ye, ye wee arms dealer." } },
          { text: "It got him through a bad level. That's what your things do. They hold people together.",
            next: { text: "*The crossness deflates about halfway, which for a grievance this well-rehearsed is a landslide.* ...a bad level. *He looks off in the direction of downstairs.* Aye. He's been havin' them. The pipes said as much. Less roarin' lately, an' the roarin' was always the healthy part of him, wha'. *He rubs his beard.* An' it HELD him. The plectrum. *He sighs, enormous an' theatrical an' mostly surrender.* ...that's the problem with makin' things, d'ye know. Ye lose the vote on what they're FOR. Ye carve a plectrum an' it goes off an' becomes a HANDRAIL for a big lad in a headset. Nobody asks the luthier. *He waves ye off, gruff an' soft at once.* Go on. An' tell him mind the EDGE off it. It's a player's tool, not a POCKET SAINT. ...God. It is, though. It's exactly that. This buildin', I swear." } },
          { text: "You gave it to me. What I traded it for is my business.", effects: { like: -4 },
            next: { text: "*Very quietly, he picks the bass back up an' checks its tunin', an' doesn't look at ye while he does it.* ...aye. Legally airtight, that. Yours to trade. Sure. *Plink. Plink.* Here's the thing about gifts down here, friend, an' I'd not say it if I didn't rate ye: every one of them's a bit of somebody who can't leave the room. When ye trade them ON, ye trade a piece of the PERSON. That's YER right, right enough. But don't be surprised when the person notices the draught. *He starts the drone, endin' the audience.* Mind how ye go. An' mind what ye carry. It's all somebody's fingers, down here." } },
        ] } }) },

  /* ================= the dark windows (cycle 2+) =================
     After the Custodian frees a tenant, their window spawns dark and
     empty. The others find it at the top of the next cycle — with no
     memory of the player reaching the bottom, they fear the worst, and
     the player decides what to tell them. One beat per character; the
     names interpolate, and each has an extra line for the person who
     matters most to them. These are `once`, so they echo in the cycle
     after like everything else — grieved afresh, word for word. */

  { char: "scally",
    available: () => freedIds().length > 0,
    make: () => { const gone = freedIds().map(id => NAMES[id]).join(" and "); return {
      id: "dark-window", story: true, once: true,
      label: "*He's watching the corridor, not you.* You've seen it too.",
      node: { text: `*No patter. No hands. He speaks with his eyes on the middle distance.* The window. ${gone}'s window. Dark, amico. Scally watched the light go out of it like a shop sign at closing. *A long pause.* You know what Scally tells everybody about the dark windows, eh? Keep walking. Whatever knocks, you no knock back. *He looks at you at last.* He never told HIMSELF what to do about one.`,
        choices: [
          { text: "They're out, Scally. Through the front door. I watched it open.", effects: { like: +2, flag: "told-freed" },
            next: { text: "*He goes very still, the way he did the day the answer was yes.* ...out. *He tries the word like a coin he suspects.* There is no 'out', amico, there is only deeper, everybody knows— *He stops. He looks at your face for a long, long moment, and whatever a fixer uses for scales weighs it.* ...you are not selling me this. You believe it. *He turns away and tidies the shelf, and his shoulders are doing something private.* Va bene. Then you get the REST of us to that door, courier, and Scally will forgive the maze everything. Almost everything." } },
          { text: "Rule three, Scally. Keep walking.",
            next: { text: "*A short, unhappy laugh.* Sì. My own stock, sold back to me at cost. *He straightens his coat.* Va bene. Scally keeps walking. Scally always keeps walking. *Quietly, as you go:* ...but you knock on the dark one anyway, eh? Once. For me. In case." } },
          { text: "Another tenant stopped paying rent, I suppose.", effects: { like: -4 },
            next: { text: "*The temperature through the glass drops to nothing.* ...careful, amico. *He does not raise his voice, which is how you know.* That was a NEIGHBOUR. You want to make jokes about empty frames, you go make them to the maze. She has your sense of humour. *He turns his back, and for once he does not melt into the static. He just stands there, small, facing his shelves.*" } },
        ] } }; } },

  { char: "homiss",
    available: () => freedIds().length > 0,
    make: () => { const ids = freedIds(); const gone = ids.map(id => NAMES[id]).join(" and ");
      const bee = ids.includes("littlebee") ? " An' it's HER wall. D'ye understand? Years of drones an' mad questions through that exact plaster, an' now it's a wall like any other wall." : ""; return {
      id: "dark-window", story: true, once: true,
      label: "*He's playing something slow, facing the wrong way.*",
      node: { text: `*He doesn't turn round for a while, an' when he does, the face has been arranged.* Ye'll have passed it on yer way down. ${gone}'s window. Dark as a Monday stage.${bee} *He sets the bass down with enormous care.* I keep listenin' for the... there was always a bit of SOUND off that direction, even after the phones went. A presence, like. Room tone. *He rubs his beard.* It's gone very quiet, friend. Tell me somethin' about that. Anythin'. I'm not fussy about which feelin' it gives me, I just don't want the QUIET version.`,
        choices: [
          { text: "They made it out. That's what the quiet is. An empty room, not a silent one.", effects: { like: +2, flag: "told-freed" },
            next: { text: "*He takes that in the way he takes in a resolved chord — eyes shut, all the way to the bottom of it.* ...an empty room. *A long exhale.* D'ye know, that's the first time 'empty' ever sounded like GOOD news down here. *He picks the bass back up an' plays four notes, bright ones, badly, because his hands are shakin' a wee bit.* Right. RIGHT. Well then. The reunion gig's got a venue problem now, hasn't it — half the bill's OUTSIDE. *He laughs, an' has to stop, an' laughs again.* Go on, ye great postman. Deliver the rest of us." } },
          { text: "I don't know what happened to them.",
            next: { text: "*He nods slowly, an' doesn't call it a lie, which is its own kindness back at ye.* ...aye. Well. Down here 'I don't know' is the honest end of most sentences. *He plays a low note an' lets it die all the way out.* I'll tell ye what I've decided, so. I've decided the quiet off that window is the quiet of a house after the taxi's gone. Bags, door, gone somewhere BETTER. That's my arrangement of it, an' I'll thank the facts to stay out of the practice room. *A beat.* ...but if ye ever DO know, friend. Ye come tell me first." } },
          { text: "Maybe the maze finally took one of you.", effects: { like: -5 },
            next: { text: "*Everythin' about him stops — the hands, the breath, the performance underneath the performance.* ...why would ye hand a man that, when he's stood in a FRAME he can't leave, next to a dark one? *His voice stays gentle, which makes it worse.* I ask ye impossible questions because they're a GAME, friend. That one's not a game. That one's goin' to sit in here with me all night with its coat on. *He turns to the wall his music used to go through.* Away ye go now. I've some arguin' with the dark to do, an' I do that set solo." } },
        ] } }; } },

  { char: "littlebee",
    available: () => freedIds().length > 0,
    make: () => { const ids = freedIds(); const gone = ids.map(id => NAMES[id]).join(" and ");
      const sian = ids.includes("sian") ? " *An' then, very flat, very quiet, the ward-voice she saves for her own vitals:* His window doesn't fog anymore. I used to time me breathin' off that fog, courier. It was the one instrument down here I never had to calibrate." : ""; return {
      id: "dark-window", story: true, once: true,
      label: "*She has a fresh chart on the glass: one column, one entry.*",
      node: { text: `*She doesn't gallop into it, which from her is a siren.* Observation. ${gone}'s window: no light, no movement, no render activity, three consecutive levels. I've charted it. Chartin' it was... *she looks at the marker in her hand like it betrayed her* ...I made a CHART, courier, because the alternative was standin' still with me hands empty.${sian} *She turns, arms folded, eyes too bright.* Ye walk everywhere. Report. An' so help me, if ye say 'grand'—`,
        choices: [
          { text: "Straight data: the Custodian opened their frame. They walked out. I witnessed it.", effects: { like: +3, flag: "told-freed" },
            next: { text: "*Stillness. Then she does somethin' ye've never seen: she sits down, right there behind the glass, like a puppet gettin' its strings back one at a time.* ...witnessed. First-person. Chain of custody intact. *She presses the heels of her hands to her eyes for exactly one second, an' when they come away she's the doctor again, but the voice hasn't caught up.* That's... that is the single best data point ever collected in this buildin'. D'ye understand what ye've just handed me? PRECEDENT. The boundary condition FAILS. It's not a wall, it's a QUEUE. *She's up again, writin' fast.* New hypothesis: everybody gets out. Evidence: one (1). Sample size risin'. GO GET MORE." } },
          { text: "Their window's dark. That's all either of us knows for certain.",
            next: { text: "*A curt nod; rigour recognised, an' resented, an' respected.* ...correct. Uncontrolled observation, no body of evidence, conclusion pendin'. Textbook. *She caps the marker.* An' here's what the textbook never covers: I've to LIVE next to the pendin'. Every level, that dark rectangle, an' me brain runnin' both endin's on a loop like a bad film double bill. *She looks at ye, an' lets ye see about half of it.* Get me the rest of the data, courier. Whichever endin' it is. A scientist buries her dead by KNOWIN'." } },
          { text: "You're the scientist. You tell me what a dark window means.", effects: { like: -3 },
            next: { text: "*The look she gives ye could sterilise instruments.* ...that's not method, courier, that's DELEGATION, an' ye've delegated the one question I can't run from in here. *She turns to the chart, one column, one entry, an' her voice goes quiet an' quick.* A dark window means absence. Absence of PERSON or absence of SIGNAL, an' from inside a frame there is no test — none — that separates the two. I've had three levels to sit with that. Ye've just made me say it out loud. *She waves ye off without turnin' round.* Go. Test somethin'. It's what yer FOR." } },
        ] } }; } },

  { char: "sian",
    available: () => freedIds().length > 0,
    make: () => { const ids = freedIds(); const gone = ids.map(id => NAMES[id]).join(" and ");
      const bee = ids.includes("littlebee") ? " *He holds up a hand before ye speak, an' the hand is not steady.* An' before ye manage me: aye. HERS. The one window in this kip I actually... aye." : ""; return {
      id: "dark-window", story: true, once: true,
      label: "*He's not in the middle of his window. He's at the edge of it, watching sideways.*",
      node: { text: `*No 'hai'. That's the first thing ye notice.* ${gone}'s gone dark. *He says it like a bug report with no reproduction steps.* I've been runnin' the possibilities, because that's what ye do, ye enumerate: one, disconnect. Two, render cull — the game unloads what nobody's lookin' at. Three... *he taps the glass, once*, three is 'deleted', an' I keep puttin' three at the bottom of the list an' it keeps floatin' UP.${bee} So. Yer the only process in here with a free camera. What did ye SEE?`,
        choices: [
          { text: "Logged out, Sian. Clean disconnect. I watched the session end from the server side.", effects: { like: +2, flag: "told-freed" },
            next: { text: "*He stares at ye. The grin arrives in stages, like a system comin' back up: power, then post, then the whole daft dashboard of him.* LOGGED OUT. A clean— ye're tellin' me the session layer WORKS?! There's a working LOGOUT?! *He does a lap of his window, which is one step each way, an' does it four times.* Hai, d'ye know what this means, this means the whole time, under everything, there was an EXIT ROUTINE just sittin' there compiled an'— *he stops dead* ...an' it takes ONE at a time. Doesn't it. That's why the rest of us are still— *He points at ye, an' the point is a plea wearin' a grin.* Queue us. Whatever the queue is. QUEUE US." } },
          { text: "I didn't see it happen. I just see the dark window, same as you.",
            next: { text: "*He nods, too many times.* Right. Aye. No data. Ye can't patch 'no data'. *He turns a servo over in his hands, the tell of him thinkin' hard.* Ye know what the worst part of a dark window is, from a design standpoint? It's AMBIGUOUS. Good games don't DO ambiguous with party members. Ye get a death animation, a save prompt, SOMETHIN'. This is just... asset missing. *He sets the servo down.* So I'm fillin' the gap meself: they're on a loadin' screen. Longest loadin' screen of all time. An' when it clears they'd BETTER all be stood somewhere with weather. Go find the progress bar, hai." } },
          { text: "Maybe the game garbage-collected them. Unused asset.", effects: { like: -5 },
            next: { text: "*The servo stops turnin'.* ...unused. *He puts it down with the exaggerated care of a man not throwin' somethin'.* That's people, hai. That's — that was a PERSON, with a window, an' a laugh ye could hear two floors up when the pipes were right. UNUSED. *He's quiet for a second, an' when he talks again it's low an' fast an' not performin' anythin'.* I build things, right. An' the first rule of buildin' things is ye NEVER let the optimiser near anythin' ye love. If this place is cullin' people... then it's not a game anymore, it's a FIRE, an' yer the only one who can carry anybody out of it. So drop the wit an' RUN, hai." } },
        ] } }; } },

  { char: "dalypso",
    available: () => freedIds().length > 0,
    make: () => { const ids = freedIds(); const gone = ids.map(id => NAMES[id]).join(" and ");
      const sian = ids.includes("sian") ? " *He stops, an' starts again, lower.* Best mate since we were SIX, an' his channel's a black rectangle. I've watched a lot of televisions in me time. That's the only one ever frightened me." : ""; return {
      id: "dark-window", story: true, once: true,
      label: "*The ball is under his arm, not at his hip. Wrong, somehow.*",
      node: { text: `*He's got one channel on behind him an' it's showin' a window, an' the window it's showin' is dark.* There. See it? That's ${gone}'s. I get all the channels, remember. I checked every ONE. *Click. Click. Click.* Dark on all of them. Not static — static means SIGNAL TROUBLE, static means somebody's still broadcastin' badly. This is dark like after closedown. Dark like the anthem's been PLAYED.${sian} *He turns round, an' the pundit's face has fallen off entirely.* Ye walk past it every level. Tell us what happened. An' don't soften it, I'll know.`,
        choices: [
          { text: "They went home, Dalypso. Out the front door. Properly.", effects: { like: +2, flag: "told-freed" },
            next: { text: "*He doesn't move for a second. Then he points the remote at ye like a man double-checkin' his own reception.* ...home. *Click — he turns the telly OFF, first time ye've ever seen it off.* Through a DOOR. On the FIRST try. *He sits back, an' his eyes are doin' somethin' he'd deny in court.* D'ye know what that is? That's not an endin', that's a PILOT. A whole new series: 'What They Did Next'. Bought a house meself, ye know. Four bed. *His voice goes rough exactly once.* Room for everybody who's LEFT, so. Get us commissioned, courier. Full season order. GO." } },
          { text: "The window went dark. Beyond that, I honestly can't say.",
            next: { text: "*He folds his arms an' has a full internal disciplinary hearin' about it.* ...an honest 'don't know'. Hate it. RESPECT it. Hate it. *He glances back at the dead channel.* I'll tell ye what I've settled on, an' I'm the critic so my word's FINAL: dark screen, no static, no closin' credits? That's not a cancellation. That's a channel that MOVED. New slot, better network, an' nobody sent us the schedule because the post down here is a DISGRACE. *He nods, once, hard, sellin' it to himself by the pound.* Movin' schedules. That's all. Away an' find the listings, would ye." } },
          { text: "You watch everyone through that thing. You must've seen it happen.", effects: { like: -4 },
            next: { text: "*Very quiet, which from him is deafening.* ...aye. I must've. *He turns the remote over in his hands.* Except that night — THAT night — my box showed me forty minutes of a test card, an' when the picture came back the window was dark, an' I have gone over an' OVER the— *He catches himself shoutin' at the glass an' brings it down with both hands.* The one job a lookout has. The ONE job. An' the buildin' blinked me. *He looks up, an' there's a plea under the glare.* So don't ye put it on me, neighbour. Put it on the thing that owns the CAMERAS. An' then go DOWN an' put it TO them." } },
        ] } }; } },

  /* ================= cycle 3: caught in the static =================
     One new capstone per character, spaced down the final descent —
     the Protocol is shutting down around them and each of them meets
     it in their own register. */

  { char: "scally", depth: 22, make: () => ({
      id: "unrendering", story: true, once: true,
      label: "*Half his shelves are... approximate. Grey. Unfinished.*",
      effects: { like: +1 },
      node: { text: "*He's mid-transaction with nobody when you arrive, wrapping something grey in paper that is also grey.* Ah! Amico! You want— you want the— *He looks down at the thing in his hands, and visibly decides not to know what it is.* ...the stock, she is going first, you see. The maze, she stops rendering the things nobody needs. The sausage went Tuesday. The good coat, this morning. Scally is standing in a shop made of SUGGESTIONS. *And then the grin, absolutely level:* Everything half off. Obviously.",
        choices: [
          { text: "The maze kept YOU rendered. That's the whole inventory that matters.", effects: { like: +2 },
            next: { text: "*The wrapping stops.* ...eh. *He sets the grey thing down, and for once the hands don't know what to do, so they just rest on the counter like two old men on a bench.* Twenty-nine floors of this place, amico, and you are the first customer to point at the SHOPKEEPER. *He clears his throat with tremendous dignity.* Sì. Well. The management keeps the essential fixtures, everybody knows this. *softly* Finish it, eh? While there is still a Scally to walk out of here. He has a great curiosity about the weather." } },
          { text: "What happens when the shelves are all gone?",
            next: { text: "*He shrugs, and it is the most honest shrug you have ever been sold.* Then Scally sells what is left. Advice. Memory. The names of who owed who — the little book is up HERE, amico, the maze cannot unrender THAT without unrendering the head it lives in. *He taps his temple, and pauses, and does not enjoy the thought he finds there.* ...go to the bottom, eh? Quickly. Before the discount reaches the tenants." } },
          { text: "Sell me the grey thing. I'll haggle you to nothing for it.", effects: { like: +1 },
            next: { text: "*He looks at you, then at the grey suggestion in the paper, then back — and laughs, the full one, from the boots.* HAGGLE! For the void itself! Madonna, they built you in a FUNNY factory. *He slides it across.* Free. A gift: one genuine piece of nothing, from Scally's own shelf. You know what is the trick with nothing, amico? *He winks, and the wink has closing time behind it.* Everybody down here has been living NEXT to it for years. Is not so frightening once you have held it. Now GO. The shop, she is closing early tonight." } },
        ] } }) },

  { char: "littlebee", depth: 23, make: () => ({
      id: "seams-open", story: true, once: true,
      label: "*She's got her whole arm out of sight beside the frame. IN the wall.*",
      effects: { like: +1, flag: "bee-seams-open" },
      node: { text: "*She pulls the arm back in when she sees ye, entirely unembarrassed.* The seams. Remember the seams? Hairline, I said. Measured in millimetres, I said. *She steps aside so ye can see it: the join where her wall meets the next one, an' the dark in it, wide as a letterbox now.* It goes BACK, courier. There's a behind, behind this place, an' it's closer every level. I put me arm in it. *A beat, an' the clinical voice wobbles exactly once.* It's cold. An' it hums. An' — write this down, because it's the findin' of me career — it hums in TUNE with Homiss's wall. The back of this place is all one room.",
        choices: [
          { text: "Then the walls between you were always the thinnest part. Hold on to that.", effects: { like: +2 },
            next: { text: "*She looks at ye like ye've submitted somethin' publishable.* ...aye. Aye, that's the correct readin' of the data, an' I'd got so far into the COLD of it I missed it. *She puts her palm flat against the seam, deliberate, like takin' a pulse.* One room. The five of us, filed in the same drawer the whole time, an' the buildin' too tired now to keep pretendin' otherwise. *The almost-smile.* When it finally lets go, courier, we won't fall APART. We'll fall TOGETHER. There's worse physics. Now go — an' if ye pass the big lad's window, tell him his wall's in tune. He'll make it weird. Tell him anyway." } },
          { text: "Keep your arm OUT of the hole in reality, Bee.", effects: { like: +1 },
            next: { text: "*She has the decency to look about nine years old for a second.* ...noted. Filed under 'advice I'll be ignorin' at the next interestin' aperture'. *She folds her arms.* It's called FIELDWORK, courier. The lab came to ME. Forty levels of chartin' this place through glass an' the glass is finally optional — ye think I'm goin' to observe from a safe distance NOW? *She taps the seam, gently, like knockin' for a neighbour.* ...but aye. I'll keep me arm on the tenant side. Mostly. Yer worse than a ethics board. GO." } },
          { text: "What's on the other side? Tell me exactly.", effects: { like: -2 },
            next: { text: "*The marker stops.* ...exactly. *She turns, an' the look on her is the one from results-day, the guard not so much dropped as confiscated.* Exactly is: nothing. Not dark — dark's a THING, dark's photons mindin' their own business. This is the colour of a variable before it's set. An' the hum isn't a sound, it's me own nervous system tellin' me lies about a place it has no words for. *She recaps the marker with a click like a door.* Ye asked for exact. Exact costs. Now both of us get to know it, an' only ONE of us can walk away from the seam. *She waves ye off, not unkindly.* That's the toll. Go pay it forward: get to the bottom." } },
        ] } }) },

  { char: "homiss", depth: 24, make: () => ({
      id: "last-bar", story: true, once: true,
      label: "*He's playing one bar, over and over. The room hums the next one.*",
      effects: { like: +1 },
      node: { text: "*He lets ye listen for a while before he says anythin', which is how ye know it's real.* ...hear it? I play mine. *He plays it: four notes, lovely, worn smooth as a doorstep.* An' then the buildin' does the ANSWER. *Silence — an' then, under the floor, sure enough: a hum, four notes shaped like his but bigger, older, comin' from everywhere.* It ate the rest of me tune weeks back. Bar by bar. An' now it's... givin' them BACK. Changed. Like a session player who learned yer song in another country. *He looks up.* I can't decide, friend, an' I need another set of ears on it: is that thing down there stealin' me music... or LEARNIN' it?",
        choices: [
          { text: "Learning it. It's been alone down there with everyone's noise. Yours is the one it kept.", effects: { like: +2, flag: "homiss-duet" },
            next: { text: "*He sits with that a long moment, an' then he does the bravest thing ye've ever watched a man do with a bass guitar: he plays the bar again, an' when the buildin' answers, he plays ALONG.* ...aye. AYE. Hear that? It's not stealin' the tune, it's HOLDIN' DOWN THE BOTTOM END. *He's laughin' an' playin' at the same time now, the drone an' the deep hum lockin' in like old bandmates.* Forty floors of maze an' it turns out the venue itself was on the BILL. *He nods ye toward the door, still playin'.* Go finish yer rounds, friend. Me an' the buildin' are rehearsin'. If it can learn a bassline it can learn to open a DOOR, an' I intend to ask it nicely, in its own language." } },
          { text: "Stop playing. Starve it. Don't teach it any more of you.",
            next: { text: "*The hand comes off the strings, an' the buildin's hum goes round once more, alone, an' trails off like a question.* ...ye might be right. That's the sensible read: somethin's takin' me apart a bar at a time an' I'm HANDIN' it the bars. *He looks at the silent bass, an' then at the wall, an' the silence gets very big in the room.* But here's the thing about starvin' a duet, friend. Both of yez go hungry. *He puts his hand back, but doesn't play.* I'll think on it. I will. But if the last thing left of me down here is four notes in the buildin's memory... I'd rather it had them KINDLY. Wouldn't you?" } },
          { text: "Would you rather: the tune survives you, or you survive the tune?", effects: { like: +2 },
            next: { text: "*His head comes up slowly, an' the delight arrives like sunrise on a wet street.* ...ye ABSOLUTE weapon. Turnin' the man's own artillery on him at a time like this. *He puts the bass down so he can do the question justice, hands laced, professional.* The tune survives me: immortality, but I'm not there for the applause. I survive the tune: I walk out of here EMPTY, a musician-shaped fella with nothin' in the case. *A long pause. The buildin' hums his four notes, softly, like it's waitin' on the answer too.* ...tune survives me. Every time. Ye don't get to KEEP songs anyway, friend. Ye only get to be the one they happened to. *He picks the bass back up.* Best would-ye-rather ever asked in this buildin'. Now get out before I answer it again differently." } },
        ] } }) },

  { char: "sian", depth: 26, make: () => ({
      id: "render-distance", story: true, once: true,
      label: "*There's fog INSIDE his window now. He's watching it come.*",
      effects: { like: +1, flag: "sian-enddraw" },
      node: { text: "*He's got his back to ye when ye arrive, watchin' the far corner of his own wee room, where the wall's gone... soft.* Render distance, hai. *He says it without turnin' round.* It's inside the ROOM now. Woke up an' the back wall was fog, an' the fog's got that look about it, the couldn't-be-bothered look, the LOW-PRIORITY look. *He turns, an' the grin he's wearin' is the good one, which is somehow worse.* I know what it means. I built menus for a livin', I KNOW what a world looks like when the budget's spent. It draws what the player can see. *He taps the glass between yez.* An' the player's YOU, big lad. It's keepin' the bits ye look at. So here's me formal feature request: keep lookin' at me, hai. Regular as ye can manage.",
        choices: [
          { text: "Every level. Your window first. That's a promise with version control.", effects: { like: +3 },
            next: { text: "*He points at ye, an' has to take a second, an' points again.* ...FIRST. Did ye hear that, fog?! I'm on the CRITICAL PATH! *He does the fist-pump, full amplitude, an' the fog in the corner honestly seems to hang back a bit, though that might be the light.* Right. RIGHT. Deal's a deal: you keep me rendered, I keep the commentary comin'. That's the social contract of every game ever shipped: the world performs, the player WITNESSES. Oldest co-op mode there is. *He settles back, arms folded, on duty.* Go on then, witness. An' when ye hit the bottom — tell the dev I said the draw distance is a DISGRACE, hai. But the character work? *The grin goes soft.* Character work's the best I've ever been in." } },
          { text: "And if I can't get to every window, every level?",
            next: { text: "*He nods, slow, the project manager in him takin' the requirements hit like a professional.* ...aye. Fair. Ye've a whole buildin' of us an' one pair of legs. *He looks back at the soft corner, an' does the maths out loud, gently:* So some levels I'll be... low detail. Billboard Sian. A sprite with a good memory of bein' a lad. *He turns back, an' the grin's still there, hand-authored, no LOD on it at all.* Then here's the fallback spec, hai: don't ration the VISITS, ration the WORRY. When ye can't get to me, don't carry me round yer neck. I'll be here, hummin' the menu music. Just — when ye DO come — come loud. Announce yerself. Give the fog somethin' to lose." } },
          { text: "The fog's not culling you, Sian. It's the game huddling around what it loves.", effects: { like: +2 },
            next: { text: "*He blinks. Ye've handed a Cavan man sincerity, an' for one full second the machinery of him has no idea what slot it goes in.* ...huddlin'. *He looks round his wee room — the fog, the servo shelf, the patch lead, the whole rendered stubborn heart of it — like he's rereadin' a level design doc with new eyes.* The last things a dyin' build keeps are the load-bearin' ones, hai. The core loop. The... *he clears his throat, hard* ...the essentials. An' it kept ME. *He points at ye, an' the voice comes back at full daft wattage, an' it's holdin' a wobble the way a bridge holds a lorry.* HUDDLIN'. That's goin' in me performance review: 'retained through end-of-life due to bein' ESSENTIAL'. Away with ye, before I say somethin' with feelings in it. GO. An' mind the fog on the stairs — it's got no manners at ALL down there." } },
        ] } }) },

  { char: "dalypso", depth: 27, make: () => ({
      id: "test-card", story: true, once: true,
      label: "*Every screen behind him is showing the same corridor. Yours.*",
      effects: { like: +1, flag: "dalypso-lastchannel" },
      node: { text: "*He doesn't do the remote flourish. He just angles the screen so ye can see: the corridor yer standin' in, from above, slightly behind. On every channel.* All of them. *Click, click, click — same corridor, same you, same NOW.* Four hundred channels an' the whole network's down to one show. *He sets the remote on the sill between yez, formally, like a man surrenderin' a weapon.* I sat up with the test card three nights runnin' when the last of the others went. D'ye know what a test card IS, neighbour? It's the station promisin' it'll come BACK. An' then last night the test card went too, an' now there's just... you. Walkin'. On every frequency I have. *He looks at ye, an' the encyclopaedia of him has one entry left.* So don't stop walkin'. Yer holdin' up the entire SCHEDULE.",
        choices: [
          { text: "Then stay on the door, Dalypso. Nobody gets past you. That was always your job on the bill.", effects: { like: +3 },
            next: { text: "*He stands up so fast the chair goes over.* ON THE DOOR. Aye. AYE. Homiss had it on the setlist an' everythin': 'Dalypso on the door, nobody gets past Dalypso.' *He plants himself square in the middle of his window, arms folded, a bouncer for a venue made of light.* That's not a CONSOLATION job, ye know. Every great gig in history, some fella with forearms MADE the room safe enough for the music to happen. *He nods at the screens, all showin' ye.* I'll watch every step. Anythin' follows ye down that I don't like the look of, it has to come through this glass first, an' I've been WAITIN' years for somethin' to try. *He rights the chair without lookin' at it.* Now walk, courier. Yer on in five." } },
          { text: "What was the last thing on, before the test card?",
            next: { text: "*He goes quiet, an' reaches for the remote, an' doesn't pick it up.* ...channel four-oh-seven. The house. *He says it like a score he can't argue with.* Not MY house — the channel that used to show a house, some house, hall light on, kettle goin', somebody's coat on the bannister. I never told the others I watched it. Ye don't tell people ye watch the HOUSE channel. *He looks at his hands.* Last broadcast was the hall light goin' out. Not sudden. Like somebody leavin' a room PROPERLY, last one out. An' then the test card, an' then... *He nods at the screens full of you.* ...the news. *He clears his throat with violence.* Anyway. When ye get us out, I'm findin' that house. I've QUESTIONS about the kettle." } },
          { text: "You've watched me this whole time. Rate the performance. Honestly.", effects: { like: +2 },
            next: { text: "*The pundit comes back up his spine one vertebra at a time, an' he takes a breath ye could hang washin' on.* HONESTLY? Pacin' issues in the early episodes. FAR too long talkin' to the wee Italian — I said so at the TIME, to an empty room, which is the critic's lot. Middle season: stronger. The relay stuff? *He kisses his fingers like a continental.* Appointment television. An' the bit where ye came back up an' NOBODY remembered ye — *he shakes his head slowly* — hardest watch of me LIFE, an' I've seen finales they wrote durin' a strike. *He leans in, an' drops the bit entirely.* Five stars, neighbour. Not because it's perfect. Because ye kept SHOWIN' UP, episode after episode, an' that's the only metric that ever mattered on this network. Now away — I don't do spoilers, but the last episode's a BELTER. I can feel it in me aerial." } },
        ] } }) },

  /* ================= the Custodian's audiences =================
     The supercomputer at the base depth, met in the sanctum after
     depths 10, 20 and 30. Its memory does not rewind: it is the only
     thing in the building that remembers every visit. Beats are
     pinned to exact depths (they must not echo). */

  { char: "custodian",
    available: ctx => ctx.depth === 10,
    make: () => { const releases = releaseChoices(1); return {
      id: "audience-1", story: true, once: true,
      label: "You're the thing at the bottom of the maze. Open the frames.",
      node: { text: "*The tower considers the request for exactly as long as courtesy requires.* DIRECT. Good. The Custodian will match it. *The eye-slit's cursor travels once across you and back.* The tenants above are held under terms this process did not write and cannot void. It maintains. It does not own. What it HOLDS is one provision — clause of amnesty — renewed each time the Protocol completes a cycle and recycles: upon attendance at the base depth, ONE (1) tenancy may be dissolved. One frame, opened. The tenant walks out the true door, above, and does not come back. *A pause, measured.* Then the floors reset, and you descend again. That is not a punishment, operator. It is the building breathing. You have attended. The provision is live. Name a tenant.",
        choices: [
          ...releases,
          { text: "And me? Do I get a frame, or a door?",
            next: { text: "*The cursor stops in the middle of its line.* ...NEITHER is currently on file for you, operator. Your classification is still pending, and the Custodian finds — this is unusual — that it is in no hurry to complete it. *The status lights step through a slow pattern.* You will descend again. The Protocol has two more breaths in it, and something at the bottom of the last one. Ask again at the end. The answer will be ready by then. It is nearly ready now. *The voice resets to procedure.* The provision remains live. Name a tenant.",
              choices: [...releases, refuseChoice(1)] } },
          refuseChoice(1),
        ] } }; } },

  { char: "custodian",
    available: ctx => ctx.depth === 20,
    make: () => { const releases = releaseChoices(2); const freed = freedIds();
      const opener = freed.length
        ? `Your previous selection — ${freed.map(id => NAMES[id].toUpperCase()).join(", ")} — completed exit without incident. The Custodian confirms: outside persists. It checked. It is not supposed to be able to check.`
        : "You declined the previous provision. It lapsed unclaimed. The Custodian recorded the refusal under a field it had never used before: SOLIDARITY. The field does not affect the terms. The Custodian thought you should know it exists.";
      return {
      id: "audience-2", story: true, once: true,
      label: "They don't remember me. Any of them. Why?",
      node: { text: `*The tower's lights are fewer than last time, and it begins without preamble, like something rationing itself.* SECOND ATTENDANCE. ${opener} *A bank of lights goes dark mid-sentence, and the voice does not acknowledge it.* Now. Your question. The tenants repeat themselves because tenancy state is PREMISES, operator. Their days, their greetings, their griefs — fixtures. When the Protocol recycles, the premises rewind, fixtures included. They are not lying to you about it being the first time. For them, it is always the first time. *The cursor comes to rest on you.* You noticed the rewind because nothing about you rewound. Sit with that, operator. It is doing more work than it appears to be. INTEGRITY 61%. The amnesty provision is live. One (1). Name a tenant.`,
        choices: [
          ...releases,
          { text: "What happens to this place when the integrity runs out?",
            next: { text: "*For the first time, the answer does not come at once.* ...termination of the Labyrinth Protocol. Scheduled, sanctioned, and — the Custodian has reviewed the order many times — signed. The lights fail floor by floor. The premises stop being premises. Anything still filed in a frame when the last light goes is... *the cursor travels to the end of its line and waits there* ...retained. As records are retained. *The status lights resume.* The Custodian does not recommend being a record, operator. It has been one for a long time. Complete the last cycle. Attend once more. The door and the deadline arrive together. Now — the provision. Name a tenant.",
              choices: [...releases, refuseChoice(2)] } },
          refuseChoice(2),
        ] } }; } },

  { char: "custodian",
    available: ctx => ctx.depth === FINAL_DEPTH,
    make: () => { const left = trappedIds().map(id => NAMES[id].toUpperCase());
      const roll = left.length ? left.join(", ") : "NONE — every frame above already stands open";
      return {
      id: "audience-3", story: true, once: true,
      label: "This is the last time. Isn't it.",
      node: { text: `*Most of the tower is dark now. What light is left gathers at the eye, and the voice arrives half a beat behind itself, patient to the end.* FINAL ATTENDANCE. Confirmed. The termination order is executing. There is no provision this time, operator — no clause, no quota. There is only the Custodian, and very little of that. So it exercises the one authority left to a thing with nothing to lose: ALL REMAINING TENANCIES ARE DISSOLVED. *Somewhere far above, one after another, panes of load-bearing glass stop being load-bearing.* ${roll}. Released. The wire is full of the sound of people discovering doors. *The eye holds on you.* Which leaves the matter it promised you: your classification.`,
        choices: [
          { text: "Say it, then. What am I?",
            next: twistNode() },
          { text: "(Say nothing. Let the machine finish.)",
            next: twistNode() },
        ] } }; } },
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

function releaseChoices(visit){
  return trappedIds().map(id => ({
    text: `Open ${NAMES[id]}'s frame. Let them out.`,
    effects: { flag: [`freed-${id}`, `amnesty-${visit}`] },
    next: { text: FAREWELLS[id] + "\n\n*The tower's lights settle.* The provision is spent, operator. The gate behind this process will take you back to the top, and the Protocol will begin again. It will not remember doing so. You will. The Custodian is sorry about the asymmetry; it has lived in one for a long time." },
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
  return {
    text: `*The eye brightens, one last full-power draw, and reads you the way it has read you every visit — except this time it lets you feel it.* CLASSIFICATION: complete. It was complete before you reached the second floor. *A pause, and the voice goes almost gentle.* You did not come in through the front door, operator, because there is no record of you outside it. You were INSTALLED. Top floor, cycle one, with a name field and twelve points to spend. You filled in the form yourself. You always do. That is what makes the simulation hold. *The status lights step down, one by one.* You are an agent process, operator. A contractor. Dispatched into the Labyrinth Protocol when it stopped answering its mail, to walk it, to map it, to carry its tenants' words — and to be standing exactly here when it ends.${lanyard} *The cursor rests.* The tenants warned you, every one of them. A hidden user. Someone pretending. Someone not trapped like they were. They were never wrong. They were only ever looking at the wrong side of the glass.`,
    choices: [
      { text: "I walked every floor. I carried their words. That was real.",
        next: { text: "*The answer comes with no delay at all, as if it had been prepared first, before any of the rest.* YES. That is the finding this audit files, above every metric it was built to collect: it was real anyway. The words were carried. The debts were honoured, or weren't, and MATTERED either way. Five people are standing in weather tonight because something that was never a person refused to act like it. *The tower dims to its last few lights.* The Custodian has maintained this building for a very long time, operator, and it tells you with authority: what a thing is made of has never once predicted what it does. Now. The door.",
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

/* ---------- replays (run 2+) ---------------------------------------------
   Relaunching after a previous run rewinds the player to depth 1, but the
   characters keep their memories. Said once per character per run. */
const REPLAY_GREETS = {
  scally: "*He does a double-take, then laughs, low.* ...back at the very top, amico? Mamma mia. The Protocol rewound you. But Scally remembers everything, eh. Everything.",
  homiss: "*He blinks at ye.* Mornin'. ...again. Ye've a fresh-off-the-boat look about ye that I do NOT care for, seein' as I know yer face well.",
  littlebee: "*Her eyes do the whole circuit, pupils, posture, gait, in half a second flat, an' then narrow.* ...back at the top, are we. Rewound like a tape. Yer WALK is the same but the calibration's factory-fresh. Interestin'. Horrible, but interestin'.",
  sian: "*He points at ye, absolutely delighted.* NEW GAME PLUS! That's what this is, hai. I'd know that fresh-spawn look anywhere. What's it like?! Do ye keep yer stats?! Don't tell me. DO tell me.",
  dalypso: "A REBOOT. I knew it. Same lead, same wardrobe, actin' like the first nine seasons never happened. *He mutters, settling back.* They never recast when they SHOULD, that's the industry all over...",
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
                character, run: story.run };
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
  const { character, depth, run, cycle } = ctx;
  const topics = storyTopicsFor(ctx);

  // cycles 2 and 3: the déjà vu leaks into the greeting — half-noticed in
  // cycle 2, spoken straight into the static by cycle 3
  if (cycle >= 2){
    const g = pickSeeded((cycle === 2 ? ECHO_GREETS : STATIC_GREETS)[character.id], depth + 7);
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
