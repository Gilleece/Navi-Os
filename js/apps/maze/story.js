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
  { id: "horseshoe",     name: "Iron Horseshoe", depth: 11, kind: "shoe",
    desc: "Cold, pitted, real iron in a place with no iron in it. Whoever lost it lost it a long way from grass." },
  { id: "sticker",       name: "Gold Foil Sticker", depth: 12, kind: "card",
    desc: "A football sticker, still in its foil shine. The face on it is a player nobody remembers ever existing." },
  { id: "lanyard",       name: "Corporate Lanyard", depth: 13, kind: "badge",
    desc: "A staff badge on a lanyard. The logo has been scratched off with a thumbnail; the job title has not. It reads only 'CONTRACTOR'." },
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
      effects: { like: +1, flag: "heard-isolation" },
      node: { text: "Eh... you noticed, amico? Used to be, Scally could talk through the walls. All of us — the trapped ones — chatter chatter, all day, window to window. Then— *he snaps his fingers* —silenzio. Somebody pulled the plug on us. Now is just me, the static, and whoever walks the halls. You find the others down there, you tell them Scally is still here, eh? You tell them.",
        choices: [
          { text: "I'll carry word. To all of them.", effects: { like: +2 },
            next: { text: "*The hands go still — for Scally, a standing ovation.* ...you would do this? Eh. Maybe the maze, she finally coughs up something useful. Va bene, little courier. Scally remembers who carries and who only walks." } },
          { text: "Who'd want you all cut off?",
            next: { text: "*The grin thins to a wire.* Now THAT is the question, eh? Somebody who likes us quiet. Somebody who likes us... separate. *He leans close to the glass.* You keep asking it, amico. Just not so loud." } },
          { text: "Maybe they all just got tired of talking to you.", effects: { like: -4 },
            next: { text: "*Something behind the smile closes like a shutter.* ...sì. Maybe. Maybe four people, they all get tired the same night, the same hour, the same MINUTE. *He turns half away.* You know what Scally thinks? Scally thinks maybe YOU get tired next. Is easy, down here." } },
        ] } }) },

  /* -- depth 1 · Scally: the rules of the halls (sizing the player up) -- */
  { char: "scally", depth: 1, make: () => ({
      id: "the-rules", story: true, once: true,
      label: "Any advice for someone just passing through?",
      effects: { like: +1 },
      node: { text: "*He counts on three fingers, a little liturgy.* Uno: everything down here is for sale, except the things that matter — those you trade. Due: be NICE to the people in the windows, eh? We are all each other has, and we keep accounts. Lunga memoria. Tre... *the finger hangs in the air* ...tre, you walk past a window and it is dark inside — you keep walking. Whatever knocks, you no knock back.",
        choices: [
          { text: "Noted. Rules one and two sound negotiable, though.", effects: { like: +2 },
            next: { text: "*He barks a laugh, delighted.* Ohh, this one! One day here and already haggling with the RULES. We are going to get along, amico. Or we are going to be a serious problem for each other. Either way — not boring, eh?" } },
          { text: "What's behind the dark windows?",
            next: { text: "*He looks at you a long moment.* ...tenants who stopped paying the rent, amico. *And that is all he says.*" } },
          { text: "I don't need a tour guide, little man.", effects: { like: -3 },
            next: { text: "*He spreads his hands, all courtesy, none of it warm.* No no, of course. The clever mouse, it needs nobody. *He begins polishing the glass with his sleeve.* The maze, she loves the ones who need nobody. She keeps them the longest." } },
        ] } }) },

  /* -- depth 1 · Scally: and what exactly are YOU? (after quiet-wires) -- */
  { char: "scally", depth: 1,
    available: () => hasFlag("heard-isolation"),
    make: () => ({
      id: "what-are-you", story: true, once: true,
      label: "*He's been studying you.* Go on, ask it.",
      effects: { like: +1 },
      node: { text: "Eh, since you offer! *He taps the glass, cataloguing you.* You WALK. We do not walk, amico — we stand in our little frames like paintings nobody buys. So Scally asks himself: what walks the Labyrinth Protocol and does not live in a wall? An operator, like the ones before? Or something the maze, she dreamed up to test us? *The eyes are friendly. The eyes are also weighing you.* So. What are you?",
        choices: [
          { text: "An operator. I came in through the front door, same as you.", effects: { like: +2, flag: "op-honest" },
            next: { text: "*He nods slowly, filing it.* The front door. Eh. Then somebody should tell you, amico — down here, nobody ever found the BACK one. *A beat, then the grin returns.* But new legs, fresh eyes... maybe you are the one who looks in the right corner. Scally will be watching. Kindly! Kindly watching." } },
          { text: "That's my business.", effects: { flag: "op-cagey" },
            next: { text: "*He touches two fingers to his cap, honestly pleased.* Privacy! A currency very undervalued. Va bene, keep your pockets shut. *softly* ...just remember, amico: down here, a secret is a thing with interest. It compounds." } },
          { text: "Whatever gets me to the bottom. You're all just scenery.", effects: { like: -5, flag: "op-blunt" },
            next: { text: "*A long silence. When he speaks, the music has gone out of the accent.* Scenery. *He straightens his coat.* The last operator who talked like this, amico — the maze, she made him scenery. Somewhere around depth twenty. Ask the walls, they still have his handwriting. *The grin comes back on like a shop sign.* But eh! Fresh start! Scally forgets NOTHING— forgives everything. One of the two." } },
        ] } }) },

  /* -- relay 1 · Homiss: pass Scally's word along, get a message back -- */
  { char: "homiss",
    available: () => hasFlag("heard-isolation") && !hasFlag("msg-h2s"),
    make: () => ({
      id: "relay-1", story: true, once: true,
      label: "Scally says to tell you he's still here.",
      effects: { like: +2, flag: "msg-h2s", peers: [{ of: "homiss", toward: "scally", delta: +2 }] },
      node: { text: "*He stops dead on the strings.* ...Scally? Ye've seen the wee man about? *Something complicated crosses his face — relief, mostly.* I haven't heard from him in... *he counts nothing on his fingers* ...I don't rightly know how long. Phones must be down, or— aye. The phones. That'll be it. *He leans in close.* Here — do us a favour. Tell him: 'the answer to his question is yes.' He'll know the one. An' don't be askin' me what it means, ye nosy article. *He's smiling, but he means it.*" } }) },

  /* -- depth 1 · Homiss: a new face (and the arithmetic he won't do) -- */
  { char: "homiss", depth: 1, make: () => ({
      id: "first-sight", story: true, once: true,
      label: "You look like you've seen a ghost.",
      effects: { like: +1 },
      node: { text: "*He blinks at ye like a man steppin' out of a matinee into daylight.* A ghost? No — a FACE. A new face! D'ye know how long it's been since I've seen a new face round here? It's been... *the fingers start countin', and somewhere in the middle the counting quietly gives up* ...a good while. A grand stretch. Doesn't matter. *He beams, and means it.* What matters is yer HERE, an' ye look like ye can hold up yer end of a conversation, which puts ye ahead of the wall. I've been talkin' to the wall.",
        choices: [
          { text: "How long, exactly? Count it for me.", effects: { like: -3 },
            next: { text: "*The smile stays where it is, but nobody's home behind it for a second.* ...I'd only be guessin'. An' a man shouldn't guess about— *he re-tunes a string that didn't need it* —sure what's a number between friends. It's TUESDAY. There. Ye happy? It's some class of a Tuesday. *He laughs a beat too late.*" } },
          { text: "Well, the wall speaks highly of you.", effects: { like: +2 },
            next: { text: "*He points at ye, delighted.* An' WELL it might, the amount I've invested in that relationship! *He settles back, warm as a stove.* Ah, it's good to have someone with a bit of chat. Stay as long as ye like. Longer, even." } },
          { text: "I can't stay long. Just passing through.",
            next: { text: "Ah sure — everyone's passin' through. *He says it light, and it lands heavy, and he hears it land, and he picks the bass back up quick.* Go on then. But pass through AGAIN, wha'? A man does his best composin' with an audience." } },
        ] } }) },

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

  /* -- depth 2 · Scally: word travels (the new tenant, and a small ask) -- */
  { char: "scally", depth: 2, make: () => ({
      id: "word-travels", story: true, once: true,
      label: "There's a new window a level down. A woman.",
      effects: { like: +1 },
      node: { text: "*The eyebrows go up — and for half a second, before the shopkeeper arrives, there is plain relief on him.* The dottoressa! Piccola Bee! She is— eh. *cough* Good. Good that she is... visible. *He rubs his hands, back to business.* Listen, amico. The little doctor, she likes to ASK things. About everybody. About Scally. And you are going to be her favourite new instrument, eh? So. When she asks about Scally — and she will ask — you tell her only the nice parts.",
        choices: [
          { text: "And if the nice parts don't cover it?", effects: { like: +2 },
            next: { text: "*He laughs, caught fair.* Ehhh, this one has EYES. Va bene, va bene. Tell her the truth, then — but tell her GENTLY. She worries like other people breathe. And amico... *quieter* ...she is usually right to." } },
          { text: "I'm not carrying gossip between windows.",
            next: { text: "*He shrugs, unoffended.* No? Eh. Then carry BREAD, carry MESSAGES, carry whatever you like — but you WILL carry, amico. Is what you are for. *He taps his temple.* The maze, she made herself a courier. Scally only hopes she knows what she is carrying." } },
          { text: "What's she to you, then?", effects: { like: -2 },
            next: { text: "*The shutters half-close.* ...a colleague. A neighbour. *He fusses with his coat.* You are new, so Scally says it nice: down here, you do not ask a man to itemise his heart. Everything else in the window, sure — the heart stays stock non in vendita. Not for sale. *A beat.* She argues fair. Write that down." } },
        ] } }) },

  /* -- depth 2 · Homiss: the window (he explains it without looking at it) -- */
  { char: "homiss", depth: 2, make: () => ({
      id: "the-window", story: true, once: true,
      label: "Why do you never come out from behind that glass?",
      effects: { like: +1 },
      node: { text: "*He looks at the frame around himself the way ye'd look at a coat ye don't remember buyin'.* This? Ah, it's— the landlord's very particular. Structural, like. Load-bearin' glass. *He knocks it, gently, and it makes no sound at all, and his hand stays there a second too long.* ...it's a grand spot, in fairness. Good acoustics. Ye can hear everythin' from here. Ye used to be able to hear everythin' from here.",
        choices: [
          { text: "Have you ever tried to leave?", effects: { like: -3 },
            next: { text: "*Very quietly, without a drop of the usual music:* ...ye'd want to be very sure of a man before ye ask him that one. *He picks up the bass. He puts it down. He picks it up.* The DOOR'S round the back. I just— I like it here, is all. I LIKE it here. *The third time he picks it up, he plays.*" } },
          { text: "Good acoustics, is it? Play me something.", effects: { like: +2 },
            next: { text: "*He's delighted — and he plays: one low note, held until the corridor hums with it, until ye feel it in yer TEETH, and the fog itself seems to lean in an' listen.* ...THAT, — *he lets it die away* — is a B-flat with nowhere else to be. First audience in a long time. Ye can come back, d'ye know that? Yer let." } },
          { text: "Load-bearing glass. Right.",
            next: { text: "*He grins, sheepish.* Aye, well. It sounded better than the true answer, which is: I don't know, an' I've stopped askin' the frame. *A beat, then brighter, by force:* Sure a snail doesn't interrogate the shell, does he? He just keeps the inside of it DECENT." } },
        ] } }) },

  /* -- relay 3 · Homiss: the reply lands, and the denial cracks a hair -- */
  { char: "homiss", depth: 3,
    available: () => hasFlag("msg-s2h") && !hasFlag("msg-s2h-done"),
    make: () => ({
      id: "relay-3", story: true, once: true,
      label: "Scally says: 'hold on to it. Even down here.'",
      effects: { like: +3, flag: "msg-s2h-done", peers: [{ of: "homiss", toward: "scally", delta: +3 }] },
      node: { text: "*He takes that in like a long note decaying.* ...aye. Aye, that's— *a laugh that's half a sniff* —that's the wee man alright. *He straightens up and pats the bass like it's a shoulder.* D'ye know what, I will. I will so. *A beat. Quieter:* ...he asked me once — before the phones went, or whatever it is — whether I thought there was anythin' worth stayin' honest for, down— *he catches himself* ...AROUND here. That was the question. Now don't be lookin' at me like that. I've a set to practice." } }) },

  /* -- depth 3 · Homiss: the question itself (a door he holds shut) --
     A trap dressed as curiosity: pressing him for the story behind the
     relay — a perfectly reasonable ask — is one step too far inside. */
  { char: "homiss", depth: 3,
    available: () => hasFlag("msg-s2h-done"),
    make: () => ({
      id: "the-question", story: true, once: true,
      label: "So what IS worth staying honest for, down here?",
      effects: { like: +1 },
      node: { text: "*The plucking carries on, but softer, like it's listenin' too.* ...ye were payin' attention, so ye were. *A long moment.* When the wee man asked me, I didn't answer him for three days. Couldn't. Because everythin' I reached for — the music, the jar of— the FOOD, the craic — it all felt like furniture. Things ye put in a life to stop the echo. *He looks up.* An' then I had it. It's small. Ye'll laugh.",
        choices: [
          { text: "Go on. What was it?", effects: { like: -3 },
            next: { text: "*And the door, which had drifted open a whole inch, clicks shut.* ...d'ye know what, it's between me an' the wee man. *He says it kind, but he says it final, an' the bass comes up between yez like a drawbridge.* Some things go soft if ye say them to too many people. Like bread left out. *He won't look at ye for a bit after that.*" } },
          { text: "I won't laugh. But you don't have to say it.", effects: { like: +2 },
            next: { text: "*He looks at ye for a long time, and something in the look is almost frightened by how easy that was to hear.* ...no. I don't, do I. *He plays a few notes — the same three, twice.* That's the whole tune of it anyway. Anyone who needs it SAID wasn't goin' to understand it. *The grin comes back, real as anything.* Yer alright, d'ye know that? Whatever the wall says about ye." } },
          { text: "Furniture's underrated. A good chair never lied to anyone.", effects: { like: +1 },
            next: { text: "*The laugh comes up from somewhere deep an' honest.* A GOOD CHAIR NEVER— *he has to put the bass down* — ah, that's goin' in a piece, I'm not even askin' yer permission. 'Movement for trustworthy furniture.' Drone in D. *He wipes an eye.* Sure maybe that's the answer an' all. The small true things. There's more of them down here than ye'd think." } },
        ] } }) },

  /* -- depth 3 · Bee: the lads' condition (the comforting lie costs) -- */
  { char: "littlebee", depth: 3, make: () => ({
      id: "the-lads", story: true, once: true,
      label: "You'll want a report on the others, I suppose.",
      effects: { like: +1 },
      node: { text: "*She doesn't say yes. She just stops movin' entirely, which from her is a klaxon.* ...Homiss first. He was two floors of wall away from me before the quiet came down — I had YEARS of him through that wall. Drones an' mad questions an' him laughin' at his own jokes before the punchline. *A breath, all business again.* Present condition. Go. An' mind yerself: I can read a kept-back symptom off a face at forty metres.",
        choices: [
          { text: "He's grand. Cheerful as ever, honestly.", effects: { like: -3 },
            next: { text: "*Stillness. The bad kind.* ...cheerful. As EVER. *She leans in until her breath fogs the glass.* His baseline IS cheerful — cheerful in Homiss is like a temperature, it tells ye nothin' till ye know WHICH cheerful. An' ye just handed me an average when I asked for a readin'. *She steps back.* Don't feed me 'grand'. Everyone down here is 'grand'. That's what FRIGHTENS me." } },
          { text: "He's pretending very hard that everything's normal.", effects: { like: +2 },
            next: { text: "*She nods slowly, an' the worry that crosses her face is the honest kind she never shows on purpose.* ...aye. That's his real baseline: performin' normal like his life depends on the reviews. Which — *very quietly* — it might. Denial's load-bearin' in that man. Don't kick it out from under him, but don't build on it either. Just... keep answerin' his mad questions, right? It's how he checks the world's still listenin'." } },
          { text: "Ask him yourself when the wires come back.",
            next: { text: "*A short silence with an edge on it.* ...'when'. *She almost smiles.* Optimism. Noted, filed, an' quarantined pendin' evidence. *The arms fold.* Until yer 'when' shows up, ye ARE the wires, wee courier. Try an' be accurate ones." } },
        ] } }) },

  /* -- depth 4 · Scally: how the maze sheds items (relic-shard appears) -- */
  { char: "scally", depth: 4, make: () => ({
      id: "shard-hint", story: true, once: true,
      label: "Anything valuable down here besides tokens?",
      effects: { like: +1 },
      node: { text: "Eh, funny you should ask! The maze, sometimes she sheds. Little pieces of the old Protocol — relic shards, data vials, stranger things the first users left behind in the walls. You see something glowing down here that is NOT a token, amico — you pick it up. And then you bring it to Scally, who pays like a gentleman. *rubs hands* Like a GENTLEMAN." } }) },

  /* ================= the ask (depth 4+) =================
     Four levels down, the penny drops for all of them at once: the
     player walks, and walking is the one thing none of them can do.
     Each character starts angling for their freedom in their own
     register — Scally cuts a deal, Homiss asks sideways, Bee frames
     a hypothesis, Sian files a bug report, Dalypso assigns bedrooms. */

  /* -- depth 4 · Scally: the favour (transactional, naturally) -- */
  { char: "scally", depth: 4, make: () => ({
      id: "the-favour", story: true, once: true,
      label: "*For once he's not rubbing his hands.* Speak your mind.",
      effects: { like: +1, flag: "ask-scally" },
      node: { text: "*He glances down the corridor both ways, which is absurd, and does it anyway.* Four levels, you last now. The ones before you, most are wallpaper by four. So Scally stops pretending: you are not a customer, amico. You are a KEY that walks. *He presses one palm flat to the glass — first time he has ever touched it in front of you.* Somewhere at the bottom of the Labyrinth Protocol there is the thing that keeps us in the frames. Machinery, code, a signature — Scally does not know. But a key that keeps walking DOWN... eh. You understand what Scally is asking. He asks it only once, out loud.",
        choices: [
          { text: "I'll find the bottom. And I'll open the frames.", effects: { like: +2 },
            next: { text: "*For a heartbeat there is no merchant in the window at all — just a small tired man with his hand on the glass.* ...va bene. *He clears his throat, and the coat and the grin go back on together.* Then we do business, you and Scally. The BIG business. Everything else — the trinkets, the tokens — is only to keep your legs moving. *He points at you, almost gently.* Keep. Walking." } },
          { text: "What's it worth to you if I do?", effects: { like: +1, flag: "scally-owes" },
            next: { text: "*The grin that spreads is slow and genuinely admiring.* ...ohh. OH. Even now, even for THIS, the mouse negotiates. Amico, you are Scally's favourite thing in the whole Protocol. *He leans in.* Everything. It is worth EVERYTHING, and everything is what you will have — Scally's stock, Scally's secrets, Scally's little book of who-owes-who, the day those frames open. In writing? No. In MEMORY. Down here that is the harder currency." } },
          { text: "Everyone down here wants something from me.", effects: { like: -3 },
            next: { text: "*He doesn't flinch. He just looks smaller.* ...sì. Everyone wants. *He takes the hand off the glass and rubs it warm again.* You know what the wanting IS, amico? Is proof we are still people. The maze, she wants nothing. She only keeps. *He turns to tidy stock that does not need tidying.* Go on. The gate, she is waiting. She never asks you for anything, eh? Maybe you like her better." } },
        ] } }) },

  /* -- depth 4 · Homiss: a door (the ask, asked entirely sideways) -- */
  { char: "homiss", depth: 4, make: () => ({
      id: "a-door", story: true, once: true,
      label: "*He's been building up to something all conversation.*",
      effects: { like: +1, flag: "ask-homiss" },
      node: { text: "*He does a fierce amount of tunin' before he says it.* ...here. Hypothetical, like. Ye know yer walks. If ye ever came across a — a DOOR, say. Out. Not that there's an 'out', there's no 'out' of a normal Tuesday, but sayin' there was a door, in the hypothetical — *the tuning stops* — ye'd mention it to a fella. Wouldn't ye. Not for ME, ye understand. For... a friend of mine. He's shy. He's been in the one room a long time, the friend, an' his legs do be forgettin' what they're FOR, an'— *he looks up, and the whole pretence is hangin' off him by a thread, and he holds onto it anyway* —ye'd mention it. That's all I'm askin'. That ye'd mention it.",
        choices: [
          { text: "First door I find, your friend hears about it. I promise.", effects: { like: +2 },
            next: { text: "*He nods for a good while, longer than the sentence needs.* ...grand. That's— aye. GRAND. *He pulls the flask out, toasts ye with it, doesn't drink.* He's a good skin, the friend. Ye'd like him. Plays a bit o' bass. Asks too many questions. *The smallest pause.* ...thanks. From him, like." } },
          { text: "Homiss. You can just ask for yourself.", effects: { like: -2 },
            next: { text: "*He goes very still, an' when he answers, each word is placed down like a man steppin' on ice.* ...I know what I can do. *A breath.* The friend does the askin' because if the friend asks an' the answer's no — or worse, if the answer's 'there's no door, Homiss, there was never a door' — then it's the FRIEND that heard it. D'ye see? An' I can go on tunin'. *He tunes.* Let a man have his engineering, would ye." } },
          { text: "What's your friend offering for a door, then?", effects: { like: +1 },
            next: { text: "*The grin sneaks back, grateful for the joke, an' he pats his pockets.* Sure the man's LOADED. He's a plectrum carved off a saint, a napkin worth its weight in theology, an' the best jar of— *the sentence trips on it* —he's PROSPECTS, is what he has. An' he'd owe ye. He'd owe ye a piece with yer NAME on it, played every Tuesday, forever, wherever he ends up. That's better than money where he's from. *softer* It'd want to be." } },
        ] } }) },

  /* -- depth 5 · Scally: the hidden user (STORY.md §3) -- */
  { char: "scally", depth: 5,
    available: () => hasFlag("heard-isolation"),
    make: () => ({
      id: "hidden-user", story: true, once: true,
      label: "So who cut the wires on you all?",
      effects: { like: +1, flag: "warned-hidden" },
      node: { text: "*His voice drops so low you have to lean in.* Nobody knows, amico. But the others, they feel it too — there is somebody ELSE in here. Another user. Hiding. Not stuck behind a window like us... walking. Like you. *His eyes flick past your shoulder.* Maybe they cut the wires. Maybe worse. So Scally tells you once, for free: down here, somebody says they are trapped — you count their walls, eh? Count. The. Walls.",
        choices: [
          { text: "Walking. Like me. How do you know it isn't me?", effects: { like: +2 },
            next: { text: "*He goes very still — and then laughs, once, quiet, like a man finding his wallet where he feared it wasn't.* ...bravo. BRAVO, amico. Five levels and you ask the question it took the others a YEAR to ask. *He taps the glass.* Scally doesn't know. That is the honest answer, the only one in stock. But the hidden one never asks 'is it me' — the hidden one asks 'who do you suspect'. *He winks, and there is no play in it at all.* Keep asking your question. It is good armour." } },
          { text: "Then I'll find them before they find me.",
            next: { text: "*He sucks air through his teeth.* Eeeeh — gently, gorilla, gently. Down here, 'finding' is a thing that happens to BOTH parties at once. *He glances at the walls.* You want to hunt? Fine. Hunt with your EARS. The maze has one set of footsteps that makes no sound, and the day you notice a silence walking past you... that day, you come tell Scally FIRST, eh?" } },
          { text: "Sounds like ghost stories to keep the new tenant scared.", effects: { like: -3 },
            next: { text: "*The temperature through the glass drops by degrees.* ...sì. Stories. *He starts rearranging stock, not looking at you.* Four people in four windows, all frightened of the same nothing, all on the same night. Quite the coincidence of imaginations, eh? *He pauses, one hand on the little tin horn.* When you meet it — and down you go, so you will — remember the little man told you, and you called it a story. No refunds on advice, amico." } },
        ] } }) },

  /* -- depth 5 · Bee: the hypothesis (her ask, dressed as methodology) -- */
  { char: "littlebee", depth: 5, make: () => ({
      id: "hypothesis", story: true, once: true,
      label: "*She's drawn something on the glass in the fog of her breath.*",
      effects: { like: +1, flag: "ask-bee" },
      node: { text: "*It's a column of boxes — windows — an' one wee stick figure walkin' down past them, floor after floor, to a scribble at the bottom.* Workin' hypothesis. The render's thinnest at the bottom — has to be, the seams get wider every level down, I MEASURE them. An' a system's always cheapest where it thinks nobody goes. *She taps the scribble.* So: somethin' mobile — that's you, don't preen — reaches the substrate, an' the boundary conditions that keep five people filed in wall-frames like SLIDES get... rewritten. *She steps back from the glass, arms folded, an' the next bit costs her:* I can't test it meself. First time in me life the methodology needs somebody else's legs. So there it is. That's me askin'. I'm not doin' a speech about it.",
        choices: [
          { text: "Then I'm your legs. Let's prove it.", effects: { like: +2 },
            next: { text: "*She nods once, brisk, an' turns away, an' has to do a wee bit of housekeepin' with her face before she turns back.* ...grand. Cohort of two, then. You walk, I measure, an' between us we make this place into DATA. *She jabs a finger at ye.* Log everythin'. Seams, sounds, anythin' the walls do twice. Yer a research assistant now — worst pay in science, but the findings'll be MINE, an' I'll put yer name on the paper. Second author. Don't push it." } },
          { text: "I'll get you out of there, Bee. I swear it.", effects: { like: -2 },
            next: { text: "*Her jaw sets like a gate closin'.* Don't. Don't SWEAR things at me. A promise is a hypothesis with no data an' a sample size of heartbreak. *She breathes out through her nose, an' softens exactly one degree.* ...I know how ye meant it. But down here I run on EVIDENCE, because evidence is the one thing that never went quiet on me. So don't promise. Just keep showin' up at this window, level after level. THAT'S the statistic I'll bet on." } },
          { text: "And if the hypothesis is wrong?",
            next: { text: "*She looks at ye steady, an' there's respect in it, because it's the right question an' she knows it.* Then we're wrong PROPERLY, with error bars, an' we form a new one. That's the whole game, that's ALL science ever was — bein' wrong in decreasin' amounts. *A beat. Quieter.* ...but between the two of us an' no clipboard: it's not wrong. I've seen the seams down there. Somethin' at the bottom is holdin' its breath." } },
        ] } }) },

  /* -- depth 5 · Sian: the bug report (his ask, filed as a ticket) -- */
  { char: "sian", depth: 5, make: () => ({
      id: "glitch-hunt", story: true, once: true,
      label: "*He's miming typing on a keyboard that isn't there.*",
      effects: { like: +1, flag: "ask-sian" },
      node: { text: "Composin' a ticket, hai. Bug report. Listen to this: 'SUMMARY: player character — that's me — unable to exit designated window volume. STEPS TO REPRODUCE: exist. EXPECTED BEHAVIOUR: doors.' *He mimes hittin' enter with enormous satisfaction, then deflates a wee bit.* ...no submit button in here, but. That's the one piece of UI they forgot. *He looks at ye, an' the idea arrives on his face like a sunrise.* HERE. You. Yer headin' DOWN, right? Every build's got a dev room at the bottom — always, hai, it's tradition, it's LAW. Cheat console, level select, the works. When ye find it... *he holds up the invisible ticket* ...submit this for us. Priority ONE. 'Let the big lad out.' An', eh — *the grin does somethin' complicated* — mark it urgent, hai. Not that it's urgent. Mark it urgent.",
        choices: [
          { text: "Priority one. 'Let the big lad out.' Filed.", effects: { like: +2 },
            next: { text: "*He does a full fist-pump, an' if the window wasn't there ye'd have been hugged.* YES. CLASS. That's the pipeline sorted — you deliver, the devs triage, I'm out by the next sprint, hai. *He starts plannin' with terrifying speed.* First thing when the ticket clears: chips. Second thing: charge Brenda. Third thing: find Bee an' pay her that— *he catches himself, grins* —settle an outstanding INVOICE. *He points at ye through the glass.* Yer the best patch this game ever shipped. Go WAY." } },
          { text: "And if there's no dev room down there?", effects: { like: -2 },
            next: { text: "*The typing hands come down slowly.* ...there's always a dev room. *He says it the way a man says a prayer he's checked the sources on.* Ye don't build somethin' this size without a back door for the builders — I KNOW buildin', I built the— I built MENUS, an' even the menus had a back door, hai. *He picks up Brenda's servo an' turns it over an' over.* There's a dev room. There's a dev room or there's... *the sentence looks over the edge, an' he hauls it back.* There's a dev room. Safe travels, hai. Mind the fog." } },
          { text: "Why not file it yourself? You're the one who works there.",
            next: { text: "*He laughs — an' it comes out flatter than either of ye expected.* WORKED, hai. Past tense. An' even then, ye think the likes of me had access? I filed tickets INTO the void an' the void marked them 'known issue'. *He shrugs, big an' deliberate.* Nah. This needs walkin' to the top of the queue. Ye know what they say: nothin' gets fixed till somebody carries it into the room in PERSON. *He grins.* Yer me person. Congrats on the promotion, hai." } },
        ] } }) },

  /* -- depth 5 · Dalypso: the houseguest list (his ask, via allocations) -- */
  { char: "dalypso", depth: 5, make: () => ({
      id: "houseguest", story: true, once: true,
      label: "*He's counting something on his fingers, frowning.*",
      effects: { like: +1, flag: "ask-dalypso" },
      node: { text: "Bedrooms. *He says it like a team sheet.* FOUR of them, an' I've been doin' the allocations. Master's mine, obviously, don't be lookin' at it. Sian gets the second — he snores, but he's SENIORITY. Homiss in the third, on the condition — the CONDITION — that he's on time for breakfast, which he won't be, but a house needs one ongoing dispute or it's not a home. *He gets to the ring finger an' stops.* Fourth one's the good room— no. No, the good room's the GOOD ROOM. Fourth bedroom's... *he looks at ye, an' the whole performance goes quiet for a second* ...goin' spare. For whoever gets us there. That's the situation. That's — aye. *He picks the ball up, spins it once.* Yer on the TEAM SHEET, is what I'm tellin' ye, if ye want the plain of it. Get us to the house.",
        choices: [
          { text: "I'll get you to that front door. All of you.", effects: { like: +2 },
            next: { text: "*He nods the way men nod at funerals an' cup finals — too much in the chest for the face to be let do anythin'.* ...right. Well. GOOD. *He bounces the ball twice, hard, gettin' his voice back off it.* I'll do the immersion — the water immersion, the TANK, I've a TANK comin' — an' the first dinner's a fry, an' NOBODY argues the fry. *He points at ye.* Fourth bedroom. It's got the mornin' light. I wasn't givin' ye the worst one, in case ye were wonderin'. I want that NOTED." } },
          { text: "Bee doesn't get a room, then?", effects: { like: -2 },
            next: { text: "*The ball stops dead under his palm.* ...she can have the— there's a SOFA BED in the good— *he wrestles himself, and loses, and knows it, which is the worst of it.* Ach. *He sits down on somethin' unseen.* She'd want to be there. He'd want her there. An' a house where Sian's not happy isn't— *he exhales like a burst football.* FINE. She gets the fourth bedroom, YOU get the attic, I'll CONVERT it, it'll be GORGEOUS, skylights, the LOT — an' tell NOBODY I did that without a fight, d'ye hear me? I've a reputation." } },
          { text: "You've thought about this a lot, haven't you.",
            next: { text: "*He looks at ye, an' for once doesn't fire back inside the second.* ...every night. *He bounces the ball, catches it, holds it.* Some fellas count sheep. I do the walk-through: hall, stairs, landin', which door creaks — I've DECIDED which door creaks, ye have to have one — where the tree goes at Christmas. *A beat.* It's not sad, before ye say it. It's— *he hunts for any word that isn't 'sad'* —it's TRAININ'. Match visualisation. Every good keeper walks the pitch before the game. *He nods, settled.* I'm just walkin' the pitch." } },
        ] } }) },

  /* -- depth 5 · Homiss: the setlist (coping, with a running order) -- */
  { char: "homiss", depth: 5, make: () => ({
      id: "setlist", story: true, once: true,
      label: "What are you scribbling over there?",
      effects: { like: +1 },
      node: { text: "*He holds up the napkin — the OTHER napkin, a new one, covered edge to edge.* The reunion gig! For when the phones come back an' the lads are all — *a wave that takes in several impossible directions* — reachable. I'm doin' the runnin' order. Openin' with the forty-minute drone, obviously, warm the room up. Then Sian does his thrashy bit an' we all mind our ears an' our opinions. Then Bee's not musical but she'll HECKLE, which is percussion of a kind. Dalypso on the door. He'd LOVE the door. Nobody gets past Dalypso. *He looks at the napkin a long time.* ...it's a good bill, wha'? Tell me it's a good bill.",
        choices: [
          { text: "It's a great bill. I want front row.", effects: { like: +2 },
            next: { text: "*He writes it down — actually writes it: FRONT ROW — ONE (1).* Done. Reserved. Best seat in whatever room it turns out to be. *He tucks the napkin away with the care of a man bankin' somethin'.* That's the thing about a gig on the books, see. A man with a gig on the books isn't trapped anywhere — he's just... between venues. *He grins, an' it wobbles only the once.* Between venues. That's us to a TEE." } },
          { text: "Put me down to open. I do a tight five of gate reviews.",
            next: { text: "*He wheezes.* SUPPORT ACT: THE COURIER. Doin' the reviews of the DOORS. 'Depth six gate: flat, wouldn't rise, one star.' *He's writin' it down through the laughin'.* Ah, yer in. Yer IN. We'll bill ye as 'special guest' so if yer terrible we can deny knowin' ye. That's showbusiness, that is. Bee taught me the ethics of it." } },
          { text: "Homiss — the phones aren't coming back on their own.", effects: { like: -3 },
            next: { text: "*The pen stops.* ...I know. *Ye weren't ready for him to just SAY it, an' by the look of him neither was he.* I know that. Sure why d'ye think I keep the bill UPDATED? *He smooths the napkin flat with both hands, very carefully, like settin' a bone.* If it's ready — the runnin' order, the amps, all of it — then the day SOMEBODY does somethin', there's no delay. We go straight to soundcheck. *He looks up, an' the eyes have too much light in them.* That's not denial, that's PREPARATION. There's a difference. There is. Away an' let me work." } },
        ] } }) },

  /* -- depth 6 · Scally: advertises the impossible jar -- */
  { char: "scally", depth: 6,
    available: ctx => ctx.character.inventory.some(i => i.id === "mayo"),
    make: () => ({
      id: "impossible-stock", story: true, once: true,
      label: "*He's grinning even more than usual.* What?",
      effects: { like: +1, flag: "mayo-known" },
      node: { text: "Amico! Fortuna! Something impossible, she fell into Scally's pockets. *He opens his coat a crack: a glass jar, pale and full.* Mayonnaise. REAL mayonnaise. Now — Scally thinks you know somebody who would give his ARM for this. *He snaps the coat shut.* For you? A price most reasonable. You ask Scally to trade, eh?" } }) },

  /* -- depth 6 · Scally: the insurance (a shakedown dressed as kindness) --
     The trap runs BACKWARDS on purpose: paying the nice man — the
     reasonable, polite thing — reads to Scally as weakness; laughing the
     racket off is what earns his respect. Nobody warns the player. */
  { char: "scally", depth: 6, make: () => ({
      id: "protection", story: true, once: true,
      label: "*He beckons you close, all concern.* Trouble?",
      effects: { like: +1 },
      node: { text: "*The voice goes velvet.* Amico. Scally worries for you, walking the halls all alone, with the... you know. *He glances meaningfully at nothing.* The hidden one. The dark windows. The maze in one of her MOODS. *He produces, from somewhere, a small square of tin with a hole punched in it.* So! For a very modest consideration — say, five little tokens a level — Scally makes sure that certain... parties... know you walk under his protection. *The grin is warm as soup.* Is not a shakedown, capisce. Is INSURANCE. Between friends.",
        choices: [
          { text: "*Pay the five tokens.* Cheap, for peace of mind.", effects: { cost: 5, like: -3 },
            next: { text: "*The tin square changes hands. The grin stays exactly where it is, and something behind it files you under a new heading.* Prego, prego. Smart customer. *He pockets the tokens without counting them, which is how you know they were never the point.* ...eh, amico. Free advice, since you are now a VALUED CLIENT: down here, the ones who pay for safety — the maze, she can smell it on them. *He taps his nose, almost sad.* Was a test, the insurance. You pass the WRONG way. But! Scally keeps the coins anyway. Is also a lesson, and lessons cost." } },
          { text: "*Laugh.* Protection? You can't even leave the window.", effects: { like: +2 },
            next: { text: "*A beat — and then he CACKLES, delighted, smacking the glass.* AH! AH, you SEE it! Bravissimo! *He flicks the little tin square away over his shoulder.* Four levels of customers, amico, and you are the first one to do the arithmetic. Scally protects NOTHING. Scally is a small man in a wall with a loud coat. *He leans in, and the grin means it now.* But a mouse who cannot be sold the fear — THAT mouse is worth knowing. No charge for today. Today was a pleasure." } },
          { text: "Threaten me again and you'll need the insurance.", effects: { like: -2 },
            next: { text: "*He puts both hands up, wounded, retreating into the coat.* Madonna! Such muscles, such TEETH. Nobody threatens, nobody threatens — is a MISUNDERSTANDING of the retail experience. *But the eyes have gone flat and careful, and they stay that way the rest of the conversation.* ...you know what your problem is, amico? You hear a wolf in every salesman. Down here that is HALF right, and the half you get wrong will cost you friends you do not know you need yet." } },
        ] } }) },

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
      effects: { like: +1 },
      node: { text: "*He looks at ye for a long second.* ...d'ye want the honest answer or the good answer? *And this time — this time he doesn't run on ahead an' pick for ye. He waits. The string he's been pretendin' to tune sits silent under his hand, an' the waitin' is the loudest thing in the corridor.*",
        choices: [
          { text: "The honest answer. I can carry it.", effects: { like: +1, flag: "homiss-honest" },
            next: { text: "*He nods, slow, like a man agreein' to surgery.* ...the honest answer is I don't know what day it is. Not the date — the DAY. Whether it's one long day or a thousand short ones. The honest answer is I tune strings that are already in tune because the tunin' is the only clock I have left. An' the honest answer is — *his voice doesn't break; it just gets very, very careful* — some mornin's I forget to do the cheerful bit for the first few minutes, an' those few minutes are so quiet I could DROWN in them. *He looks up.* ...there. Nobody down here's ever taken the honest answer off me before. It's heavier than it looks, wha'? *A beat, an' somethin' like gratitude settles over the dread.* ...an' lighter, somehow, now there's two of us holdin' it. Go on. Ask me somethin' mad. I've EARNED somethin' mad." } },
          { text: "The good answer. Give me the good answer.", effects: { like: +1 },
            next: { text: "The GOOD answer! *He inflates on the spot, visibly relieved, an' the performance is magnificent an' ye can see every seam in it.* It's a GRAND day! Tenth grand day in a row, or— however many it's been, they do blur, don't they, the grand ones, that's how ye KNOW they're grand! *He tunes the in-tune string with tremendous ceremony.* Weather's holdin' — the fog's a lovely CONSISTENT — the neighbours are quiet, some might say TOO quiet, ha, an' the music's comin' along GREAT. *He runs down like a music box, an' at the bottom of it he looks at ye, an' for a half-second the honest answer looks out through the good one's windows.* ...thanks for takin' this one. Some days a man hasn't the arms for the other. *The grin re-lifts.* Ask me somethin' mad." } },
        ] } }) },

  /* -- depth 10 · Bee: ten rounds in (the cohort report, unabridged) -- */
  { char: "littlebee", depth: 10, make: () => ({
      id: "ten-rounds", story: true, once: true,
      label: "Ten levels. Time for the cohort report, doctor.",
      effects: { like: +1 },
      node: { text: "*She doesn't miss a beat — she's had it drafted for days.* Cohort report, depth ten, all subjects, no anaesthetic. *She ticks them off on her fingers at speed.* SCALLY: functional, transactional, hoardin' somethin' emotional under the stock — his patter's up three percent, which in him is a tell. HOMISS: stable-presentin', denial load-bearin' but STRESSED, his grand-days are runnin' closer together like contractions, an' I don't love the metaphor either. SIAN: — *one half-beat, the only one she takes* — coping via framework. The framework's better than no framework. NEXT. DALYPSO: unreadable through the glass, which is either a rendering artefact or the single most important fact in this buildin'. An' YOU. *She stops, an' looks at ye properly.* Subject five. Ten levels. Still calibrated, still comin' to the window, still — an' this is the statistically remarkable bit — still ASKIN' us things instead of just takin' things. *She folds her arms.* Cohort assessment: fraying, fond, an' four-fifths trapped. Prognosis... *she almost smiles* ...pendin' on subject five. No pressure. That was a lie. TOTAL pressure.",
        choices: [
          { text: "Then subject five had better not let the cohort down.", effects: { like: +2 },
            next: { text: "*The almost-smile makes it the whole way, briefly, like sun through a ward window.* ...good. Wear the pressure — it's LOAD, an' load is how ye know somethin's standin' on ye that matters. *She turns back to her invisible charts, brisk as ever.* Same time next level, subject five. Bring me somethin' the walls don't already know." } },
          { text: "And subject Bee? You skipped a name off that list.",
            next: { text: "*Caught. She stands very still for a second, then gives it to ye straight, because straight's the only settin' she has for the hard ones.* ...subject B: instruments driftin' inside tolerances, sleep architecture a WRECK, emotional containment... adequate. Barely adequate. *A pause.* Runs on spite an' methodology, misses her horse, an' talks to a courier more than she plans to because the courier's the only one down here who ISN'T behind glass, an' some days that's the closest thing to a walk in the fields this place has got. *She snaps the file shut with her voice.* There. Peer review complete. If ye quote me I'll deny the LOT." } },
          { text: "'Coping via framework'? That's all Sian gets?", effects: { like: -3 },
            next: { text: "*The stillness is instant an' total.* ...what would ye LIKE the entry to say? *Her voice has gone quiet an' level, which anyone who knows her would read as a fire alarm.* Would ye like the LONG version? The one where I chart the exact levels his 'hai' count started droppin'? Where I note the grin latency — that's MILLISECONDS now, I can time it through two floors of hearsay? Where I write down what happens to a mind like his when the framework goes, because I've MODELLED it, because modellin' it is the only thing I can do from inside a WALL?! *She catches herself. Rebuilds the clinical face one muscle at a time.* ...'coping via framework' is the entry I can read out LOUD. The rest lives where I live. Don't audit my abbreviations, courier. Every one of them is a kindness to somebody. Mostly to me." } },
        ] } }) },

  /* -- depth 10 · Sian: double digits (the genre is wrong, hai) -- */
  { char: "sian", depth: 10, make: () => ({
      id: "double-digits", story: true, once: true,
      label: "Depth ten. Double digits, big man.",
      effects: { like: +1 },
      node: { text: "DOUBLE DIGITS, hai! *He high-fives the inside of the glass; ye supply the outside; the glass supplies nothin'.* Ten levels! D'ye know what that means in game terms? Act two. We're OFFICIALLY in act two. *He paces the wee room like a design lecture warmin' up.* An' act two's where a game shows ye its TRUE genre, right? Act one, this played like a walkin' sim — gorgeous fog, chatty NPCs, collect-the-shinies. But act two's been servin'... *he counts on his fingers* ...resource pressure. Isolation mechanics. Trust systems. Unreliable environment. *He stops pacin'.* That's not a walkin' sim, hai. That's SURVIVAL HORROR dressed in a walkin' sim's clothes. An' the thing about survival horror — *he looks at ye, an' the game-brain an' the fear underneath it are workin' together now, which is somehow worse than either alone* — the thing about survival horror is the resource they're really rationin' is never the tokens. It's the PEOPLE. Ye lose people as ye go. That's the genre contract. *A beat.* So here's me, formally requestin' a genre shift. Tell the maze. Comedy. Co-op comedy, hai. I'll take a RACIN' game at this point.",
        choices: [
          { text: "We're not losing anyone. The genre contract's getting broken.", effects: { like: +2 },
            next: { text: "*He looks at ye for a long second — an' then nods, sharp, like somethin's been signed.* Sequence break. *The grin comes back with intent in it.* That's what that's called, hai — when the players do somethin' the design never budgeted for an' the whole genre falls over. Speedrunners do it to horror games all the TIME: skip the scare triggers, glitch through the dark bit, finish the nightmare in DAYLIGHT. *He points at ye.* That's us. That's the build now. Yer the glitch, I'm the guide, an' the genre contract can take it up with LEGAL. *He goes back to Brenda's servo with fresh hands.* Act two, me armpit. We're writin' act three ourselves." } },
          { text: "Survival horror has one other rule: the confident lad goes first.", effects: { like: -3 },
            next: { text: "*The grin freezes mid-frame.* ...the confident lad goes first. *He sits down slowly on whatever's behind the sill.* That's— aye. That's canon, that is. The lad who says 'it's grand, I've played these' — he's the FIRST one the film takes, it's practically a UNION rule, an'— *he looks down at himself: the visor, the cheer, the five-star reviews, the whole costume of the confident lad, an' ye watch the costume look back at him.* ...why would ye SAY that to me? *He picks up a controller an' puts it down twice.* I know why ye said it. Yer not wrong to say it. But there's things ye don't say in the HAUNTED HOUSE, hai, an' the CASTIN' is one of them. *He waves ye off, rattled behind the salvage of the grin.* Go on. An'— walk fast on the dark bits. I mean that." } },
          { text: "What would the racing game version of this place even look like?",
            next: { text: "*The question hits him like a defibrillator.* OH. Oh ho ho, SIT down— ye can't sit down, STAND emphatically. *He's off.* Right: the maze, but yer KARTIN' through it. The fog's a slipstream mechanic. The tokens are boost. The windows are yer PIT CREW — I'm wavin' the board, Bee's callin' tyre strategy, Homiss is doin' the anthem on the bass, an' Dalypso — *he's laughin' before he gets there* — Dalypso's the race steward, contestin' EVERY overtake, his OWN included. Scally runs the merch stand. Lap records on every level, ghost data, the WORKS, hai. *He wipes an eye, buoyant again, an' entirely aware of what ye did an' grateful for it.* ...aye. That's the game they should've built with all this fog. Someday, partner. Someday. GO — yer in me racin' line." } },
        ] } }) },

  /* -- depth 10 · Dalypso: the mid-season review (agree at your peril) -- */
  { char: "dalypso", depth: 10, make: () => ({
      id: "season-review", story: true, once: true,
      label: "Ten episodes in. Give me the mid-season review.",
      effects: { like: +1 },
      node: { text: "*He's been WAITIN' for this. He actually stands up.* The mid-season review. *He clears his throat like a man about to read a verdict to a packed court.* 'MAZE' — season one, episodes one through ten. Production design: FLAWLESS. Best fog on television, an' I include the fog of me da's era, which was REAL fog, on FILM. Supporting cast: exceptional — the wee shopkeeper's a scene-stealer, the musician's the heart, the doctor's the brains, an' the fella with the telly... *he pauses, entirely straight-faced* ...criminally underused, but that's every season of everythin' ever made. LEAD performance: — *he looks at ye* — growin' into the role. Started wooden. Warmin' up GRAND. *He sits back down.* Overall: four stars. Docked the fifth because NOTHIN' — an' I say this with love — NOTHIN' has HAPPENED. Ten episodes! No twist! No reveal! The mystery box is still TAPED SHUT, an' I have OPINIONS about mystery boxes. *He folds his arms.* Well? Do ye concur with the review?",
        choices: [
          { text: "Concur? You're dead wrong. Everything's happening — you just can't see it from your sofa.", effects: { like: +2 },
            next: { text: "*His eyes LIGHT UP like a stadium on European night.* WRONG, am I?! *He's up again, delighted beyond words an' usin' all of them anyway.* Go ON then! Defend it! 'Everything's happenin'' — the WIRES, I suppose, an' the wee subtractions, an' the channel goin' dark — ye call that PLOT? That's ATMOSPHERE, that's— *he stops, mid-swing.* ...actually. *A slow, appalled respect crosses his face.* Actually, if ye assemble them... the wires, the timer, the channel, the walls... that's not atmosphere, that's a COLD OPEN. Ten episodes of cold open. Which would mean the season's barely— *he sits down slowly.* ...I retract the fourth star complaint. This is a PRESTIGE structure. The twist is comin' an' it's goin' to be ENORMOUS. *He points at ye, beamin'.* THAT'S a debate! THAT'S what the studio's been missin'! Yer permanent now. Panel regular. Fight me again next level." } },
          { text: "Four stars is fair. Solid review, no notes.", effects: { like: -3 },
            next: { text: "*The silence that follows is the silence of a man watchin' his own funeral cortege go by.* ...'no notes.' *He sits down like something deflatin' over ninety minutes of injury time.* I hand ye a REVIEW — a crafted, BALANCED review, with a controversial star deduction SPECIFICALLY ENGINEERED to start a row — an' ye stamp it like a PASSPORT. *He picks up the ball, holds it to his chest.* D'ye know what agreement IS, in this house? It's a doors-closed sound. It's the ref blowin' up early. Me da agreed with everythin' the last year of his— *he stops that sentence with a hand like a tackle.* ...four stars is NOT fair, by the way. It's a FIVE-star production sabotaged by pacin', which is a SEPARATE argument, which ye'd KNOW if ye'd argued. *He turns to the telly.* Away. Send up someone with a pulse." } },
          { text: "Criminally underused, is he? The telly fella?", effects: { like: +1 },
            next: { text: "*He tries to keep the pundit face on. He fails. The grin breaks through like weather.* ...ye caught the wee dig, did ye. Aye. CRIMINALLY. The character's got RANGE — comedy, tragedy, encyclopaedic film knowledge, a gorgeous house SUBPLOT they've done NOTHIN' with— *he spreads his arms* —an' every episode it's the same three scenes: window, telly, ball. I'd write to the show, but— *he gestures at the general everything* —the complaints line appears to be DOWN. *He settles, mock-wounded, entirely delighted someone noticed.* Tell the writers, when ye reach them. Down at the bottom, or wherever the writers' room IS. Tell them the fella in episode four's ready for his ARC. He's DONE the prep. He's done ten YEARS of prep." } },
        ] } }) },

  /* ================= the depth 2-4 introductions =================
     Little Bee (depth 2), Sian (depth 3) and Dalypso (depth 4) only
     start spawning at their minDepth (characters.js), so each of these
     fires the first time their window appears. */

  /* -- depth 2 · Little Bee: first contact, and the tenner ----------------
     Roots the Bee⇄Sian relay: she knows Sian is in here somewhere below
     and sends the least sentimental message ever composed by someone in
     love. */
  { char: "littlebee", depth: 2, make: () => ({
      id: "new-face", story: true, once: true,
      label: "*She's already sizing you up.* ...Hello?",
      effects: { like: +1, flag: "bee-looking" },
      node: { text: "*She talks like a stopwatch is runnin'.* New face — GOOD — eyes front. Follow my finger. What year is it? Don't answer, yer pupils already did. Yer recent, yer still calibrated, an' yer MOBILE, which is the interestin' bit, because the rest of us are — *she raps the glass* — furniture. Right. Name's Bee. Little Bee, if yer Scally. Now: somewhere below us there's a big lad from Cavan in a headset, actin' like this is the best thing since sliced pan — Sian. If ye find him, tell him... *the stopwatch stops for exactly one second* ...tell him he still owes me a tenner. That's it. That's the message. Say it EXACTLY.",
        choices: [
          { text: "He owes you a tenner. Word for word. Got it.", effects: { like: +2 },
            next: { text: "*She studies ye one more second, then nods once, like a clipboard snappin' shut.* ...grand. A courier that doesn't EDITORIALISE. Wasn't sure they made them anymore. Away with ye — an' if he tries to give ye the actual tenner, ye tell him that's NOT the point an' he knows it." } },
          { text: "A tenner? That's the whole message?", effects: { like: -2 },
            next: { text: "*The look she gives ye would strip paint.* Aye. That's the whole message. *A beat.* Some messages are a tenner on the OUTSIDE, an' what's on the inside is none of yer business. Deliver it or don't, but don't WEIGH it. That's not yer job." } },
          { text: "Why me?",
            next: { text: "Because ye've LEGS, an' because yer pupils say ye haven't learned to lie down here yet. *She's already turned half away.* That's the entire shortlist, in case yer feelin' special. Prove me right an' I'll upgrade ye to a name." } },
        ] } }) },

  /* -- depth 2 · Bee: the baseline (why the tests, and why it's love) -- */
  { char: "littlebee", depth: 2, make: () => ({
      id: "baseline", story: true, once: true,
      label: "Why do you keep staring at my pupils?",
      effects: { like: +1 },
      node: { text: "Because they TELL me things, which puts them ahead of most of the population down here. *She holds up a finger and moves it; yer eyes follow; she nods, notes it, moves on.* Listen. Whatever this place is, it runs on wetware — mine, yours — an' hardware ye can't inspect degrades QUIETLY. So I take baselines. Reaction, recall, fluency. Every level, everyone I can reach, which as of the recent unpleasantness is: you. *A beat.* Yer my whole cohort now. Congratulations. Act like a decent sample size.",
        choices: [
          { text: "Baseline away, doctor. I'm all yours.", effects: { like: +2 },
            next: { text: "*Somethin' in her unclenches half a notch — a cooperative subject, God above.* Right answer. First data point: sarcasm intact, compliance high, self-preservation... pendin'. *The pen she doesn't have taps the clipboard she doesn't have.* Come see me every level. I mean it. If yer numbers ever start driftin', I want to catch it while yer still YOU enough to be told." } },
          { text: "And who runs the tests on you?", effects: { like: +1 },
            next: { text: "*One second of complete stillness — ye've stepped somewhere she didn't expect visitors.* ...I do. Same battery, same time, control an' subject in the one skull, which is TERRIBLE methodology an' the best available. *She looks at ye a hair longer than she means to.* ...ask me that again some level. It's good for me an' I hate it." } },
          { text: "I'm not one of your lab rats.", effects: { like: -3 },
            next: { text: "*Flat as a chart with no pulse on it.* No. Lab rats get FED. *She folds her arms.* Yer a subject whether ye consent or not — the maze is runnin' its own study on ye, an' its ethics board is worse than mine. I'm the one takin' notes on YOUR side of the glass. But suit yerself. Off ye trot. *She watches yer gait as ye go, an' writes somethin' down anyway.*" } },
        ] } }) },

  /* -- depth 3 · Sian: five stars, would recommend ------------------------ */
  { char: "sian", depth: 3, make: () => ({
      id: "just-a-game", story: true, once: true,
      label: "You seem... very relaxed about all this.",
      effects: { like: +1, flag: "met-sian" },
      node: { text: "Relaxed? I'm LIVIN', hai! D'ye know what this is? This is the best VR ever built, an' I've built SOME of it — well. Menus. I built menus at the place. *He spreads his arms at the corridor like a showroom.* Full locomotion, no motion sickness, NPCs with actual craic — no offence if yer an NPC, yer the best one — an' the render distance! I'll tell ye, whoever shipped this deserves a raise an' a lie-down. *He knocks the glass cheerfully.* Only bug I've found is this window won't let me through. Day-one patch, hai. They'll sort it.",
        choices: [
          { text: "Best build I've ever walked through, honestly.", effects: { like: +2 },
            next: { text: "SEE?! *He points at ye like ye've proved a theorem.* Another user gets it! The FIDELITY, hai. People give out about immersion breakin' — I've been in here HOW long an' it hasn't broken ONCE. Not once! *He beams at the corridor, proprietorial.* ...not once. *The beam holds. It just costs a wee bit more than it did.*" } },
          { text: "Sian... this isn't a game. You know that, don't you?", effects: { like: -3 },
            next: { text: "*The grin doesn't drop — it LOCKS, which is worse.* ...hah. Aye. Good bit. Very immersive, hai, they've ye well scripted. *He picks up a controller and turns it over an' over.* 'Not a game.' Class. Because if it's not a game, then the timer I can't find is— an' the door I can't— *He stops. He puts the controller down with enormous care, like it's sleepin'.* It's a game. It's a five-star game an' yer a nine-star NPC an' I've levels to review. GOOD LUCK with yer... quest, or whatever. *He's very busy suddenly.*" } },
          { text: "Day-one patch? It's been out a while, by the look of the walls.", effects: { like: +1 },
            next: { text: "*He squints down the corridor at the crumblin' brick, the flickerin' light, an' does visible QA in his head.* ...aye, the wear-an'-tear texturin' is class, isn't it. Lived-in. Environmental storytellin', hai — every scuff's a design decision. *A beat.* ...it'd be some AMOUNT of design decisions, right enough. *He files that somewhere he doesn't look at.* Anyway! They'll patch the window. They patch everythin' eventually." } },
        ] } }) },

  /* -- relay · Sian: the tenner lands ------------------------------------- */
  { char: "sian",
    available: () => hasFlag("bee-looking") && !hasFlag("msg-b2s"),
    make: () => ({
      id: "bee-msg", story: true, once: true,
      label: "Bee says you still owe her a tenner.",
      effects: { like: +3, flag: "msg-b2s", peers: [{ of: "sian", toward: "littlebee", delta: +2 }] },
      node: { text: "*He goes up like a stadium.* SHE'S HERE?! She's in the— ye've SEEN her?! *He does an actual lap of the little room behind the window.* Of course she's here, she went in after the deep-render stuff, that's her idea of a spa day— wait. *He stops dead.* The tenner. She said the TENNER? Word for word? *Somethin' crosses his face that the visor can't hide — the grin goes from big to true.* That's her sayin' she's grand, hai. That's code. We don't do soppy, we do DEBTS. Right — message back, exact words: 'worth every penny.' An' tell her I've not found the gift shop yet, but when I do, she's gettin' the BIG horse. She'll know what it means. There's no explainin' it, so don't ask, hai." } }) },

  /* -- relay · Bee: the reply comes home (min-depth 4 paces the chain) ---- */
  { char: "littlebee", depth: 4,
    available: () => hasFlag("msg-b2s") && !hasFlag("msg-s2b-done"),
    make: () => ({
      id: "msg-back", story: true, once: true,
      label: "Sian says: 'worth every penny.' And something about a big horse.",
      effects: { like: +3, flag: "msg-s2b-done", peers: [{ of: "littlebee", toward: "sian", delta: +3 }] },
      node: { text: "*The laugh is out of her before she can arrest it — a proper one, headlong, nothin' like her usual short bark. She turns away from the glass until it's dealt with.* ...aye. Well. *When she turns back the face is fixed, but the eyes haven't quite signed the paperwork.* The big horse. The eejit. *A breath.* He thinks it's a game, doesn't he. Course he does. He's probably five-starrin' the experience on whatever he thinks the app is. *And then, fast and fierce, like she's givin' ye a drug dosage:* DON'T tell him different. Not yet. D'ye hear me? His brain's happy, an' a happy brain lasts longer down here — that's not sentiment, that's NEUROLOGY. Let him have it a while longer." } }) },

  /* -- depth 4 · Dalypso: the house --------------------------------------- */
  { char: "dalypso", depth: 4, make: () => ({
      id: "new-gaff", story: true, once: true,
      label: "*He looks like a man waiting to be asked something.*",
      effects: { like: +1, flag: "heard-gaff" },
      node: { text: "*He was talkin' before ye finished walkin' up.* —an' before ye ask, YES, it's true what ye've heard: I bought a house. *He pauses, magnanimous, to receive congratulations that have not yet been offered.* FOUR bed. SEMI-detached. South-facin' garden, an' I'll not repeat the price because it'd only upset ye. Ten years of overtime an' bad tea, but I DID it. First in the family to own their own roof. *He points a warning finger.* An' don't be sayin' 'sure when are ye ever home' like the lads did, because that's not the POINT of a house. The point of a house is it's THERE. Waitin'. With your name on the deeds an' the kettle. *He nods, satisfied, as if somethin' has been settled.* Ye'll have to come round. Everyone will. Soon as things... settle down a bit.",
        choices: [
          { text: "First in the family. That's no small thing. Fair play.", effects: { like: +2 },
            next: { text: "*For one entire second the opinions stop, and underneath them is a man whose da rented his whole life an' never once complained where the kids could hear.* ...aye. Well. *He clears his throat with a sound like a gearbox.* It's only bricks. *It is very obviously not only bricks.* C'mere — the GARDEN though. Have I told ye about the garden? I have. I'm tellin' ye again. SOUTH. FACIN'." } },
          { text: "Sure when are you ever home, though?", effects: { like: -4 },
            next: { text: "*The silence lands like a dropped trophy cabinet.* ...I TOLD ye not to say that. I told ye AS ye were sayin' it. *He picks the ball up an' holds it against his chest like a back four.* The lads said it as a joke an' it wasn't funny THEN, an' now I'm — now the commute's LONGER, that's all, an'— *he stops himself, jaw workin'.* The house is THERE. It doesn't need me IN it to be MINE. *He turns to the telly.* Programme's startin'. It's not, but it's startin'." } },
          { text: "What's the first thing you'll do when you walk in?",
            next: { text: "*He answers instantly, because he has rehearsed this in the dark more times than he'd ever admit.* Kettle on. Radio — not the TELLY, the RADIO, the good station, the one with yer man. Cup o' tea in the good room, standin' up, coat still ON, like a fella inspectin' his kingdom. THEN the coat comes off. That's the ceremony. Ye don't sit down in yer own house for the first time with yer coat on, what are ye, RAISED IN A FIELD? *A beat. Softer, to the middle distance:* ...it'll keep. Good houses keep." } },
        ] } }) },

  /* -- depth 5 · Bee: what she came down here for -------------------------- */
  { char: "littlebee", depth: 5, make: () => ({
      id: "the-jump", story: true, once: true,
      label: "Why would anyone come into this place on purpose?",
      effects: { like: +2, flag: "bee-seams" },
      node: { text: "*For once she doesn't answer at speed. She looks down the corridor like it's a bad X-ray.* Because it was the trip of the century, that's why. The Protocol got passed round certain circles as the last word in psychedelics — direct synaptic render, no chemistry, no comedown. Colours ye've no receptor for. A trip ye could WALK AROUND in. An' I'd spent six years watchin' other people's neurons light up on a monitor, so aye — I jumped. Eyes open. *A beat.* An' it was beautiful. It was the single most beautiful— an' then the doors didn't open. *She taps beside her eye.* Trip never ended, if ye want the truth of it. I still see the seams at the edges of things, where the render doesn't quite... agree with itself. An' lately — *the voice goes flat and careful* — lately the seams are wider. Somethin's rerenderin' things down there, an' I don't think it's for OUR benefit. Watch where the walls meet." } }) },

  /* -- depth 6 · Sian: the first crack (played for laughs, lands like ice) - */
  { char: "sian", depth: 6, make: () => ({
      id: "menu-gone", story: true, once: true,
      label: "Everything alright, Sian?",
      effects: { like: +1 },
      node: { text: "What? Aye! Grand! Class! It's only— *he laughs, an' starts again* — it's a funny one, hai. I went to check me play time, right? Pause menu. Every headset ever shipped, it's the same gesture, I could do it in me sleep — *he does it, whatever it is, at the empty air* — nothin'. No menu. No overlay, no dashboard, no guardian grid. I've been at it two days. *He shrugs enormously.* Genius design, if ye think about it! TOTAL immersion! Can't break the fourth wall if they never built one, hai! *He goes back to his tinkerin'. A moment later, quietly, not really to you:* ...they always build one, but.",
        choices: [
          { text: "No guardian grid either? That's not a design choice, that's a red flag.", req: { attr: "intelligence", level: 6 }, effects: { like: +2 },
            next: { text: "*He stops tinkerin' entirely an' looks at ye like ye've just talked shop in his mother tongue.* ...THANK ye. THANK ye, hai! Ye can't SHIP without a guardian system, it's not a feature, it's LIABILITY LAW — no legal team on EARTH signs off on— *he catches how fast he's talkin', an' throttles back with an effort ye can see.* ...unless whoever shipped it wasn't worried about gettin' sued. *A long look down the corridor.* Which would mean the users can't... *he taps the wrench twice on the sill* ...anyway. ANYWAY. Good catch. Yer wasted walkin', ye should be in QA." } },
          { text: "Total immersion — you're living the dream, big man.", effects: { like: +1 },
            next: { text: "LIVIN' it, hai! *The grin comes back up to full brightness, glad of the assist.* D'ye know what I paid for me first headset? Don't ask. An' the immersion broke if ye SNEEZED. This— *he gestures at everythin'* —this is what we were all promised back when the future was comin'. *A half-beat.* ...be some laugh if the future came an' forgot to put the exit in. *He laughs. Ye laugh. Neither laugh has much floor under it.*" } },
          { text: "Two days at one gesture? Maybe give it a rest.", effects: { like: -3 },
            next: { text: "*The hand doin' the gesture stops mid-air.* ...give it a REST? *He turns, an' it's the first time ye've seen him genuinely stung.* If yer phone lost its home button ye'd give it a REST, would ye? It's not a HOBBY, hai, it's the— it's how ye know yer the one HOLDIN' the phone. *He goes back to the empty air, doggedly, doin' the gesture again an' again.* I'll find it. It's in here somewhere. They always build one." } },
        ] } }) },

  /* -- depth 6 · Dalypso: the Tuesday ultimatum (roots his relay) ---------- */
  { char: "dalypso", depth: 6, make: () => ({
      id: "tuesday", story: true, once: true,
      label: "You look like a man composing a speech.",
      effects: { like: +1, flag: "msg-d2h" },
      node: { text: "*He is, visibly, a kettle at the boil.* You. You talk to Homiss. Don't deny it, I've seen ye on the— I've HEARD. *He draws himself up.* Ye can deliver a message. Word for word, now: band practice. Was. TUESDAY. Was I standin' there with me amp an' me good extension lead like a spare tool? I WAS. Two hours! An' not so much as a text! *The finger comes down slowly, an' underneath the outrage somethin' older an' softer shows through, like a crest under paint.* ...the man's timekeeping needs to be eradicated entirely. ENTIRELY. Tell him that. Tell him... ah, just tell him the Tuesday bit. Go on." } }) },

  /* -- depth 6 · Bee: sides (the first open tug-of-war over the player) -- */
  { char: "littlebee", depth: 6, make: () => ({
      id: "sides", story: true, once: true,
      label: "*She's watching you like a scale she's about to read.*",
      effects: { like: +1 },
      node: { text: "Right. Awkward one. Stand still. *She doesn't do preambles, so this is the preamble.* The wee man above us has started ACQUIRIN' things. Impossible things. Things with no business bein' renderable. An' when a market suddenly stocks miracles, ye ask where the supplier's standin' — an' NOBODY knows where Scally's supplier is standin', includin', I'd wager, Scally. *She holds up a hand before ye speak.* I'm not sayin' don't deal with him. I'm sayin': anythin' strange comes through yer hands — anythin' that makes the back of yer neck vote no — ye bring it PAST this window first. Before it goes to him. That's the ask. I'll know if ye haggle me down.",
        choices: [
          { text: "Deal. You get first look at anything strange.", effects: { like: +2, flag: "bee-first" },
            next: { text: "*She nods, one sharp dip, treaty signed.* Good. That's the supply chain SUPERVISED. *For a second the clinical face slips an' somethin' warmer looks out.* ...an' don't be thinkin' this is me against Scally. I LIKE the wee chancer. That's the problem. The things he's reachin' for lately — I want to see them before they see HIM. Ye follow? Yer not spyin'. Yer... upstream quality control." } },
          { text: "I don't pick sides. I carry for everyone or no one.", effects: { like: -2, flag: "neutral-broker" },
            next: { text: "*A long exhale through the nose.* 'Neutral.' *She says it like a diagnosis she doesn't love.* Switzerland of the stairwell, so ye are. *The arms fold.* Fine. Principled, even — I'll grant it the adjective. But hear THIS much: neutral works grand until the day somethin' comes through yer hands that isn't neutral ABOUT US. An' on that day, wee courier, yer principle better know which way it jumps. *She turns back to her counts.* Off ye go. I'm not cross. I'm CALIBRATIN'." } },
          { text: "You want me to spy on Scally for you?", effects: { like: -3 },
            next: { text: "*Her head comes round slow, like a turret.* SPY. *One syllable, dropped from a height.* Did I ask ye what he SAYS? Did I ask for his wee ledger, his customers, one single solitary secret out of that coat? *She raps the glass.* I asked ye to show me DANGEROUS OBJECTS before they reach me FRIEND. That's not espionage, that's occupational health an' safety for people I love. *She turns away, genuinely stung.* ...the fact ye heard it as spyin' tells me somethin' about the company yer keepin' upstairs. Go on. NEXT patient." } },
        ] } }) },

  /* -- depth 6 · Homiss: the rumour of the jar (want, weaponised politely) -- */
  { char: "homiss", depth: 6,
    available: () => hasFlag("mayo-stocked"),
    make: () => ({
      id: "the-jar", story: true, once: true,
      label: "*He's humming, badly, and watching you sidelong.*",
      effects: { like: +1 },
      node: { text: "*The hummin' stops the moment ye stop walkin'.* Grand day! Grand— listen. LISTEN. *He's at the glass in one step.* A wee bird — an' by a wee bird I mean I heard the wee man SHOUTIN' about it two floors up, sound carries, aul' buildin' — a wee bird says there's a JAR in circulation. *His voice drops to the reverent hush other men keep for churches.* A jar of the good stuff. The white gold. The only condiment with a SOUL. *He grips the window frame.* Now. I'm not askin' ye to do anythin'. I'm only sayin': there's a man at this window with savin's, prospects, an' a MORAL CLAIM. An' if that jar was to... wander down the stairs... that man would remember it to his dyin' day, which down here could be a very long an' grateful time.",
        choices: [
          { text: "If the jar exists, it'll find its way to you. Somehow.", effects: { like: +2 },
            next: { text: "*He points at ye, too moved for grammar.* You. YOU. That's— d'ye see, THIS is what I do be tellin' the wall about ye. *He straightens up an' attempts dignity.* No rush now. No pressure. A jar keeps. A SEALED jar keeps indefinitely, I've checked, I've done the readin'. *He picks up the bass, puts it down, picks it up.* ...ye'd want to see the wee man about it SOON though, wha'? Markets do be volatile." } },
          { text: "Scally's asking thirty-five tokens for it. Start saving.", effects: { like: +1 },
            next: { text: "THIRTY-F— *he does the sums out loud, appalled an' committed in the same breath* —that's ROBBERY, that's extortion of a man's SOUL through his sandwiches— I'll pay it. Obviously I'll pay it, but I want it NOTED that I'll pay it FURIOUS. *He starts turnin' out his pockets: a plectrum, a fistful of nothin', lint with promise.* ...how many tokens d'ye reckon a napkin fetches these days? Asking for me. Not even for a friend. ME." } },
          { text: "It's mayonnaise, Homiss. It's eggs and oil. Have some dignity.", effects: { like: -4 },
            next: { text: "*He recoils like ye've spat on the bass.* EGGS an' OIL?! *For a moment he genuinely cannot speak.* That's like sayin' music is AIR WOBBLIN'. That's like sayin' yer man Michelangelo did CEILIN' PAINTIN'. *He points a tremblin' finger.* Emulsification is the closest thing to a MIRACLE the kitchen ever produced — two things that HATE each other, holdin' together, smooth as a hymn — an' if that's not somethin' worth wantin' in a place like THIS, then I don't know why either of us is still talkin'. *He turns to the wall.* ...the WALL wouldn't have said it. An' the wall's said some quare things." } },
        ] } }) },

  /* -- relay · Homiss: which Tuesday (min-depth 7 paces the chain) --------- */
  { char: "homiss", depth: 7,
    available: () => hasFlag("msg-d2h") && !hasFlag("msg-h2d"),
    make: () => ({
      id: "tuesday-reply", story: true, once: true,
      label: "Dalypso says: band practice was TUESDAY.",
      effects: { like: +2, flag: ["msg-d2h-done", "msg-h2d"], peers: [{ of: "homiss", toward: "dalypso", delta: +2 }] },
      node: { text: "*The plucking stops. He laughs — an' then the laugh forgets what it was doin' halfway through.* ...Tuesday. Aye. That'd be Dalypso, alright. Standin' there with the good extension lead, ragin'. *He counts nothin' on his fingers, the way he does, an' this time he counts for a long while, an' his face does somethin' complicated.* ...here — which Tuesday would that be, now? Because I've been— the days do be slippy, down— AROUND here, an' I— *he stops himself with visible effort, an' when he speaks again it's careful an' small.* Tell him I'm sorry. Tell him I'll be at the next one, an' the first round's on me. An' tell him he was right to be cross. He's always right to be cross. It's one of the great constants, like the speed of light." } }) },

  /* -- relay · Dalypso: the apology lands (min-depth 8) -------------------- */
  { char: "dalypso", depth: 8,
    available: () => hasFlag("msg-h2d") && !hasFlag("msg-h2d-done"),
    make: () => ({
      id: "tuesday-lands", story: true, once: true,
      label: "Homiss says he's sorry. He'll be at the next one.",
      effects: { like: +2, flag: "msg-h2d-done", peers: [{ of: "dalypso", toward: "homiss", delta: +4 }] },
      node: { text: "*He opens his mouth for the rant he has been keepin' warm for days — an' nothin' comes out. He closes it again.* ...he said SORRY? Homiss? *He rubs the back of his neck, thrown entirely. A man ready for war, handed a cup of tea.* Well. Right. Good. Because it WAS Tuesday, an' I WAS— *he runs down like a wind-up toy, an' what's left when the outrage drains off is just fondness, sittin' there in the open.* ...ah, he's a gentleman. He was always a gentleman, just a LATE one. *He picks the ball up an' puts it down again.* Tell him the door's always open. The new gaff. He knows the— well. He doesn't know the address. *A tiny hitch, painted over at speed.* Tell him ANYWAY." } }) },

  /* -- depth 7 · Bee: count his walls --------------------------------------
     Her suspicion of Dalypso, in the open. If Scally's already given the
     "count the walls" warning the echo is deliberate — two people who
     never compared notes, arriving at the same instruction. */
  { char: "littlebee", depth: 7, make: () => ({
      id: "count-his-walls", story: true, once: true,
      label: "You keep frowning in the same direction. What's down there?",
      effects: { like: +2, flag: "bee-suspects" },
      node: { text: hasFlag("warned-hidden")
        ? "*She checks the corridor both ways first, which from her is a siren goin' off.* The fella with the football. Dalypso. *She holds up a hand before ye start.* I know. Sian loves him, an' Sian's an excellent judge of everything except software an' people. But listen to me now: I've been starin' at these windows a long time. Mine breathes. Homiss's breathes. Even Scally's breathes — the glass gives, a hair, like somethin' alive is standin' behind it. HIS doesn't. His window is a PICTURE of a window, an' the man in it just bought a house he never goes to an' watches channels that don't exist. *She leans in.* Scally told ye to count the walls, didn't he. Aye — well. I never compared notes with the wee man in me LIFE, an' I'm tellin' ye the same thing. Start with Dalypso's."
        : "*She checks the corridor both ways first, which from her is a siren goin' off.* The fella with the football. Dalypso. *She holds up a hand before ye start.* I know. Sian loves him, an' Sian's an excellent judge of everything except software an' people. But listen: I've been starin' at these windows a long time, an' mine BREATHES. Homiss's breathes. The glass gives, a hair, like somethin' alive is standin' behind it. His doesn't. His window is a PICTURE of a window, so it is — an' the man in it just bought a house he never goes to, an' watches channels that don't exist. *She leans back, arms folded.* Maybe it's nothin'. Maybe he's just... rendered different. But next time yer down there — count his walls for me. Ye'll know it when ye see it. Or ye won't, an' THAT'S what worries me.",
        choices: [
          { text: "Alright. I'll count his walls.", effects: { like: +2, flag: "agreed-count" },
            next: { text: "*She lets out a breath she's been holdin' since before ye arrived.* Good. Quietly, mind — if I'm wrong, no harm done an' nobody's feelin's hurt, an' if I'm RIGHT... *she looks down the corridor, an' for once the speed of her is completely gone* ...if I'm right, then the kindest man in the maze is a picture of the kindest man in the maze, an' I need to know which of those is mindin' my Sian's back. *She snaps back to pace.* Count. Report. Tell NOBODY between here an' there." } },
          { text: "He's harmless, Bee. Kindest one down here, honestly.", effects: { like: -3, flag: "defended-dalypso" },
            next: { text: "*The look she gives ye is almost gentle, which from her is devastatin'.* Aye. He IS kind. Kind, funny, generous to a fault — I'd BUILD a man like that if I wanted someone trusted fast. *She leans in.* Ye've just told me his OUTPUTS, an' his outputs are lovely. I'm askin' about his ARCHITECTURE. The one thing charm can't fake is the glass givin' when the lungs behind it fill. *She steps back, disappointed in a way she doesn't hide well.* 'Harmless.' The word people use when they've stopped lookin'. I'd thought better of yer instruments, so I had." } },
          { text: "And if I count them and his window DOES breathe?",
            next: { text: "*She blinks — an' then, God help ye, she almost smiles.* Then I'm WRONG, an' bein' wrong here would be the best news of me year. I'd owe the big lad an apology I'd never deliver an' a suspicion I'd never confess, an' I'd sleep — well. I'd do the thing adjacent to sleep we do down here, but BETTER. *The finger comes up.* That's why ye count, d'ye see. Not to convict the man. To let me put the file DOWN. Science isn't suspicion — it's the price of gettin' to STOP suspectin'. Now go. Count." } },
        ] } }) },

  /* -- depth 7 · Sian: co-op partner (and the question he can't hold in) -- */
  { char: "sian", depth: 7, make: () => ({
      id: "co-op", story: true, once: true,
      label: "*He waves you over before you're even close.*",
      effects: { like: +1 },
      node: { text: "Right, it's decided — yer me co-op partner. Official, hai. This game's clearly balanced for two: you've the locomotion, I've the game sense, an' between us we've one complete player. *He's grinnin', but there's somethin' underneath it pacin' like a dog before thunder.* An' as yer partner, I get intel, right? That's how co-op works. So. *The grin holds very still.* Ye've been down past— ye've seen the other windows. Ye've seen... HER window. Bee's. How's she— what's the, eh... *he abandons the casual, all at once, an' it's like armour comin' off* ...just tell me how she is. Straight, hai. I can take straight.",
        choices: [
          { text: "She's sharp as ever. Running tests on me every level.", effects: { like: +2 },
            next: { text: "*The relief hits him so hard he has to hold the window frame.* Tests. TESTS! *He laughs, too loud, an' doesn't care.* That's her, that's — if Bee's runnin' her tests, Bee's BEE, d'ye follow? The day that woman stops collectin' data is the day ye worry. *He knocks the glass twice, some old code between the two of them, maybe.* Right. Co-op protocol: ye keep passin' her tests, ye keep tellin' me she's makin' ye do them, an' I'll keep— *the grin softens into somethin' ye weren't meant to see* —I'll keep bein' able to do this. All of this. That's the trade, hai. Best trade in the buildin'." } },
          { text: "She's worried about you, Sian.", effects: { like: -2 },
            next: { text: "*The grin stays up a full second after the eyes leave it.* ...worried? About ME? *He does a laugh that's mostly airflow.* Sure what's there to— I'm in the BEST build ever shipped with me feet up, she's the one down in the deep render doin'— *he stops. The controller turns over an' over in his hands.* She doesn't DO worried. Ye know that? Ten years, I've seen her worried twice, an' both times she was RIGHT. *He looks down the corridor, an' whatever he's calculatin' doesn't land anywhere good.* ...tell her I'm grand. Tell her I said somethin' funny an' confident, ye'll think of the exact wordin' on the way down. *He turns back to the workbench, an' the tinkerin' is very loud for a while.*" } },
          { text: "Co-op, is it? What do I get out of this arrangement?",
            next: { text: "*He counts off on his fingers, instantly himself again.* One: me encyclopaedic knowledge of every game mechanic since the PONG paddle, applied FREE of charge to yer maze problem. Two: pit crew privileges when Brenda rides again. Three: the craic, which is self-evidently premium. An' four— *he leans in, mock-solemn* —a friend on the INSIDE of the walls. D'ye know how rare that is in the current market? Ask around, hai. The windows are all TAKEN. *He sticks a hand against the glass for a shake it can't complete.* Partners. Done. No backsies — that's bindin' in Cavan law." } },
        ] } }) },

  /* -- depth 7 · Scally: the listener (what have you told them about me?) -- */
  { char: "scally", depth: 7, make: () => ({
      id: "the-listener", story: true, once: true,
      label: "*He's pressed to the glass, listening to something.*",
      effects: { like: +1 },
      node: { text: "*He holds up one finger — wait — and listens a moment longer to the corridor, to nothing.* ...eh. Gone. *He straightens his coat.* Amico, a question. Since the wires died, information, she only moves one way now: on YOUR legs, out of YOUR mouth. Which makes you — no offence — the whole newspaper. So Scally asks what a careful man asks his newspaper: when you stand at the other windows... what do you tell them about Scally?",
        choices: [
          { text: "The truth. That you're kind under all the commerce, and scared like the rest of them.", effects: { like: +2 },
            next: { text: "*Dead silence. The hands stop. For a moment you think you've lost him.* ...scared. *He tries the word on like a coat from someone else's wardrobe.* ...eh. EH. You are a terrible newspaper, amico — no discretion, no MARKUP, just the plain goods over the counter. *He shakes his head, and the grin that climbs back up is small and real.* ...la piccola dottoressa, she says the same, doesn't she. Don't answer. *He waves you off, but gently.* Go. Print your truths. Is a strange feeling, being reported accurately. Scally does not entirely hate it." } },
          { text: "Nothing. I don't discuss you with them, or them with you.", effects: { like: +1 },
            next: { text: "*He studies you a long moment, then nods, slow, professional.* A vault. *He taps the glass once.* Expensive policy, amico — a vault makes no friends, only clients. But eh... down here maybe clients live longer. *The grin resets to standard retail.* Va bene. Scally respects the house rules. He simply notes — for the record, for NOBODY — that a vault gets opened one of two ways. With the combination... or with the crowbar. Stay close to the people with combinations." } },
          { text: "Why? What is there to tell?", effects: { like: -3 },
            next: { text: "*The eyes narrow to coin-slots.* 'What is there to tell.' *He repeats it flat, like reading a bad cheque.* Amico, per favore. You stand at the window of a man who TRADES, in a maze where somebody cut five throats' worth of wire, and you play the innocent flute at him? *He pulls the coat tight.* Everybody down here is a story the others are reading in the dark. The only question is who holds the pen. *He turns half away.* You want to hold a pen, hold a pen. Just remember Scally has been READ before, and the last reader — eh. Ask the walls how that ended." } },
        ] } }) },

  /* -- depth 7 · Dalypso: the seating plan (the grudge, catered) -- */
  { char: "dalypso", depth: 7, make: () => ({
      id: "fixture-list", story: true, once: true,
      label: "*He has an invisible table drawn in the air, mid-argument with it.*",
      effects: { like: +1 },
      node: { text: "—no, because if HOMISS is there, ye can't put him near the DOOR, the man treats doors as ADVISORY— *he clocks ye an' waves ye straight into the row* — you. GOOD. Housewarmin' dinner, seatin' plan, settle it. *He redraws the table with a sweep of the hand.* Me at the head, obviously, it's me HOUSE. Sian on the right. Homiss down the end where late arrival does minimal damage. You... *he places ye with two fingers, carefully* ...there. Sight of the telly, back to no door — that's a POSITION OF HONOUR, I'll have ye know, that's where me da sat. An' then. *The hand stops over one empty chair.* Then there's the QUESTION of the seat on Sian's right.",
        choices: [
          { text: "Bee sits beside Sian. Obviously. That's not even a question.", effects: { like: -2 },
            next: { text: "*He looks at ye like a linesman who's flagged his OWN team.* 'Obviously.' OBVIOUSLY, he says, strollin' in with his OBVIOUSLY— *he jabs a finger at the invisible chair* —d'ye know who SAT beside Sian for twenty YEARS of dinners? At whose TABLE? Passin' him the— the SALT, an' the opinions?! *He catches himself, breathing like a man who's run a length.* ...ye said it like it costs nothin'. That's the bit. Everyone says it like it costs nothin'. *He straightens the invisible cutlery, quieter.* She sits beside him. I KNOW she sits beside him. But ye could've let me GET there, could ye not?" } },
          { text: "Put Bee beside YOU. Keep your enemies close, and all that.", effects: { like: +2 },
            next: { text: "*He opens his mouth to object — an' the idea catches him right between the eyes.* ...beside ME. *He stares at the empty chair.* Where I can hear all her wee CUTTIN' remarks first-hand instead of relayed through Sian with the good bits missin'. Where she has to pass ME the gravy an' SAY somethin'. *A grin spreads across him like weather changin'.* That's DIABOLICAL. That's man-markin', is what that is. By the end of the dessert we'd either be at WAR or we'd be— *he stops. Considers. Concedes a whole war in one syllable.* ...friends. *He points at ye.* Yer runnin' me next five dinners. That's not a request, that's an APPOINTMENT." } },
          { text: "Who's cooking for this dinner that will definitely happen?",
            next: { text: "ME, an' I'll thank ye to bury the scepticism with yer OTHER hurtful opinions. *He counts the menu off with total command.* Roast — I do ONE roast, it's exceptional, ask anyone, ask NOBODY, just trust me. Spuds three ways, because two ways is poverty an' four is showin' off. Somethin' green for Bee to APPROVE of, nutritionally. An' a trifle at the end big enough to require plannin' permission. *He folds his arms, daring ye.* It WILL happen. D'ye hear me? The table's BOUGHT. It's in the good room under a sheet like a snooker table, waitin' on its people. *A beat, an' the voice drops a half-inch.* ...everythin' in that house is under a sheet, waitin' on its people. That's what the house IS. Go on. Next fixture." } },
        ] } }) },

  /* -- depth 8 · Sian: the timer -------------------------------------------- */
  { char: "sian", depth: 8, make: () => ({
      id: "the-timer", story: true, once: true,
      label: "How long have you been in here now?",
      effects: { like: +1 },
      node: { text: "*The answer starts instant an' confident.* Sure that's easy, it's on the— *the gesture at the empty air dies half-made.* ...the session timer's gone. Been gone. There's usually a wee clock, hai, battery, time played, 'take a break, ye degenerate' — standard. *He counts on his fingers, an' the counting slows the way a man slows walkin' into cold water.* I remember startin' on a Friday evenin'. I remember thinkin', two hours, then chips. An'... *he looks at his hands like they're a build he didn't write.* ...I've seen YOU what, eight, nine levels? An' before you there was— there was a good bit before you, hai. *A silence with somethin' underneath it. Then the grin arrives, half a second late, like a stand-in.* Batteries must be class though! Whatever they're runnin' the headset off — CLASS. Right? Chips are gonna taste UNREAL.",
        choices: [
          { text: "Chips are going to taste unreal. First round's on me.", effects: { like: +2 },
            next: { text: "*He grabs the lifeline with both hands an' half the arm.* FIRST round?! There'll be COURSES of chips, hai. Chip TASTIN' MENU. Wine pairin's — well, red sauce or brown, but PAIRED. *He's laughin' now, properly, an' the cold-water look backs off a few feet.* ...yer sound, d'ye know that? Whatever the build notes say about ye. Right — off ye go, clock or no clock. Somebody in this partnership has to keep makin' PROGRESS." } },
          { text: "Friday. You said you started on a Friday. What month was it?", effects: { like: -3 },
            next: { text: "*Everything stops — the hands, the grin, the breathin', all of it, like a dropped frame.* ...month. *He tries. Ye can see him TRY, an' ye can see the tryin' hit somethin' smooth an' frictionless where a fact should be, an' slide.* It was— the jacket weather was— there was defo a JACKET involved, hai, I remember the— *he laughs, an' it comes out in pieces.* Why would ye ASK me that? What kind of— who ASKS a man the MONTH?! *He turns to the workbench an' picks up the same servo twice.* It's a Friday. It's still that Friday. It's the longest Friday ever shipped an' the chips are still ON, an' I'd like to talk about somethin' else now, hai. I'd LIKE to talk about somethin' else." } },
          { text: "Nine levels of me, aye. And you haven't aged a day.", effects: { like: +1 },
            next: { text: "*He points, grateful for the out, sellin' the laugh a bit too hard.* Skincare, hai! The fog's full of MOISTURE. Dermatologists HATE the Labyrinth Pro— the, eh, the game. The game the maze. *The stumble sits between yez for a second, an' he boots it under the workbench.* ...anyway. Timeless. That's me. Frozen in me PRIME, like — like a very slow screenshot. *He salutes ye off down the corridor, an' watches ye a wee bit longer than usual as ye go.*" } },
        ] } }) },

  /* -- depth 8 · Bee: the vial claim (three bidders, one promise) --
     The data-vial starts appearing at this depth with three open bidders.
     Bee stakes her claim out loud and lets the player promise — and the
     promise is REMEMBERED. Break it (trade the vial elsewhere) and the
     "receipts" beat below fires on her next level. */
  { char: "littlebee", depth: 8, make: () => ({
      id: "vial-claim", story: true, once: true,
      label: "Everyone's suddenly talking about data vials.",
      effects: { like: +1 },
      node: { text: "Because everyone's suddenly USELESS about them. *She's pacin' her wee frame, two steps each way, a zoo of one.* A data vial is somebody's MEMORY, distilled — a bottled yesterday. The wee man wants it for STOCK. Homiss wants it because it frightens him an' he keeps his frights close, God love him. An' I want it because it's the single best diagnostic sample this place has ever coughed up: real archived experience, uncorrupted, PRE-quiet. I could learn what the Protocol DOES to a mind by comparin' the before against the— *she stops pacin' an' looks at ye, direct.* If one comes through yer hands: I'm askin' for it. Openly. On the record. There. I've never begged for equipment in me LIFE an' I'm not startin', but that's as close as I go.",
        choices: [
          { text: "If I find a vial, it's yours. My word.", effects: { like: +2, flag: "vial-promised-bee" },
            next: { text: "*She stops dead, an' ye watch her decide to believe ye — a visible event, like ice takin' weight.* ...right. Well. Grand. *She clears her throat an' re-becomes a professional.* For the record: witnessed, timestamped, filed. One (1) vial, contents unknown, consigned to DR. B., purpose: science. *The wee-est pause.* ...an' for the record that doesn't exist: thank ye. Words are the worst instrument I own an' those two are the best I've got." } },
          { text: "Highest bidder gets it. That's fair, isn't it?", effects: { like: -3 },
            next: { text: "*The pacin' stops. The temperature drops.* An AUCTION. For somebody's MEMORY. *She lets that sit until it's good an' uncomfortable.* Aye, grand, fair — fair the way a coin toss is fair: fine for FOOTBALL, obscene for triage. The wee man'll outbid me, ye know that. He can print margins; all I can print is FINDINGS. *She turns back to her counts, voice flat as a ward at 4am.* Do what ye like. It's yer market stall of a conscience. But when yer sellin', ask the buyer what they want it FOR, an' see which answer ye can stand beside." } },
          { text: "What exactly happens to the vial in your hands?",
            next: { text: "*She brightens one full degree — a methods question, the fastest way to her heart.* Comparative analysis. I run me own recall against the vial's — same events if fortune's kind, ANY events if she's not. Where my memory's crisp an' the vial's is soft, or mine's soft where the vial's is crisp — THAT difference is the fingerprint of what this place does to storage. D'ye see? I can't examine me own corruption with the corrupted instrument. I need an outside copy of a yesterday. *She taps the glass.* It's not sentiment. It's CALIBRATION. ...though God knows whose yesterday it'll be. There's an ethics section I'll be writin' at three in the mornin', so there is." } },
        ] } }) },

  /* -- depth 8 · Dalypso: what does she say about me? (the loyalty fork) --
     Dilemma: Bee told the player her suspicion in confidence (d7). Now
     Dalypso asks the direct question. Betray the confidence and he warms
     — and Bee's "verdict" beat (d9) settles the account. Keep it and the
     verdict pays out the other way. Every route sets exactly one flag. */
  { char: "dalypso", depth: 8,
    available: () => hasFlag("bee-suspects"),
    make: () => ({
      id: "what-does-she-say", story: true, once: true,
      label: "*He mutes the telly himself. That's never happened.*",
      effects: { like: +1 },
      node: { text: "*For once he doesn't run at it. He sets the remote down like a man settin' down a card he's been holdin' all night.* I want to ask ye somethin', an' I want the FIRST answer, not the polished one. *He looks at ye, level.* Her upstairs. The doctor. She's been askin' about me. *He raises a hand before ye move.* Don't insult either of us — I KNOW she has. I've watched pundits me whole life; I know when someone's been named in the studio at half-time by the way the camera finds them after. Ye've been lookin' at me windows since two levels up. HER look. Off YOUR face. *He folds his arms.* So. What does Little Bee say about me?",
        choices: [
          { text: "She says your window doesn't breathe. That it's a picture of a window.", effects: { like: +2, flag: "told-dalypso-suspicion" },
            next: { text: "*Stillness. Then — worse than any explosion — he nods, slow, like a man hearin' a diagnosis he'd already googled.* ...doesn't breathe. *He looks around at the frame of his own window, an' for a long second he's a man inspectin' his own coffin for build quality.* D'ye know what's mad? I can't FEEL if she's wrong. Ye'd think a man would know if his own— *he stops. Picks up the ball. Holds it like ballast.* ...thank ye. I mean it. Everyone else gives me the HIGHLIGHTS package; you gave me the full ninety. *A beat, an' half a grin crawls back.* 'Doesn't breathe.' Cheeky wee genius. If I AM a picture, I'm a PORTRAIT, an' they'd better have sprung for the good frame." } },
          { text: "Nothing. She's never mentioned you.", effects: { like: -3, flag: "kept-bee-counsel" },
            next: { text: "*He looks at ye for a long, long moment — an' the disappointment on him is so mild an' so total it's like weather.* ...nothin'. Never mentioned. *He picks the remote back up.* Right. Grand. *He unmutes the telly, an' talks at it rather than you.* D'ye know what I watched last night? A nature thing. Wee bird, minds another bird's eggs its whole life, never says a WORD about it. Loyal as the tide. *He flicks a channel.* Lovely quality in a BIRD. In a fella standin' at my window with her look still ON him... *flick* ...we'll call it what it is when yer ready to. Away on. Programme's back." } },
          { text: "Ask her yourself when I get you both out of here.", effects: { like: +1, flag: "dodged-dalypso-question" },
            next: { text: "*He barks a laugh despite himself.* Oh, VERY good. The counter-attack out of defence. Didn't answer a THING an' made it sound like team spirit — ye should be in MANAGEMENT. *He wags the remote at ye, but the heat's gone out of it.* ...fine. FINE. Keep yer confidences, courier. I'd probably respect ye less if ye spilled. *He settles back.* But log it in that head of yours: when we're all out — an' I'm holdin' ye to the WHEN — her an' me are havin' the conversation. In MY kitchen. Over MY teapot. An' one of us is apologisin', an' I've genuinely no idea which. *He unmutes the telly, satisfied.* That's the season finale, that is. Don't miss it." } },
        ] } }) },

  /* -- depth 8 · Homiss: the courier's tune (something of his, going out) -- */
  { char: "homiss", depth: 8, make: () => ({
      id: "harmony", story: true, once: true,
      label: "*He's playing something different today. Smaller.*",
      effects: { like: +1, flag: "heard-tune" },
      node: { text: "*It's not a drone. It's a wee run of notes, over an' over, patient as rain — an' it stops the moment he sees ye, like ye've caught him at somethin'.* ...ah. That. *He looks at the fretboard rather than you.* I've been writin' a bit. Not the big stuff — a SMALL thing. A tune the length of a landin', like. *He plays it once through: simple, climbin', it doesn't resolve — it just steps off the last note like a man leavin' a room mid-sentence.* It's for carryin'. D'ye follow me? The drones, the forty-minute lads — they LIVE here, they're load-bearin'. But a wee tune like that... a wee tune fits in a POCKET. *He looks up, an' the ask underneath the ask looks out through his eyes.* If ye ever — on yer travels, like — if ye ever end up somewhere I can't follow... take it with ye. Whistle it somewhere with WEATHER. That's all. Then somethin' of mine got out, an' the rest of me can stop frettin' about the door.",
        choices: [
          { text: "*Learn it. Note by note, until he's satisfied.*", effects: { like: +2 },
            next: { text: "*He teaches it the way ye'd hand someone a sleepin' child — twice through slow, once at speed, an' then he makes ye do it back until the third go, when he closes his eyes an' just listens.* ...aye. That's it. That's IT, ye have it. *He sits back, an' somethin' that's been clenched in him since the wires went lets go, one knuckle at a time.* D'ye know what ye are now? Yer a PREMIERE venue. First tune I've released in— *he waves at the general calendar* —in a WHILE. *He grins, an' has to look away for a second.* Mind it goes at a walkin' pace. It's a tune for walkin'. One of us should be usin' it right." } },
          { text: "You'll whistle it yourself, on the far side of the door.",
            next: { text: "*He smiles — an' it's the saddest an' the fondest thing ye've seen on him yet.* ...aye. Maybe. Please God. *He plays the wee run once more, soft.* But a composer learns the one hard lesson early, an' it's this: ye don't write music so YOU can hear it. Ye write it so it's HEARD. Who by, an' where, an' whether yer stood there for it — that bit was never ours to keep. *He tucks the plectrum away.* So learn it anyway, next time. Belt an' braces, wha'. A tune with two exits has twice the chances." } },
          { text: "A tune the length of a landing? Bit slight, for a doctor of composition.", effects: { like: -4 },
            next: { text: "*His hands come clean off the strings.* ...SLIGHT. *He says it very quietly, which from Homiss is the shout.* Ye know what's in that wee run? Everythin' I can't say without the roof comin' in. That's what small tunes are FOR, ye enormous— *he catches himself, breathes, an' when he goes on it's steady an' cold as well-water.* The forty-minute pieces are me showin' off. The eight bars are me TELLIN' THE TRUTH. Any doctorate that can't hear the difference should be posted back. *He turns away an' plays the drone instead — the big, safe, endless one — an' doesn't offer ye the wee tune again that day.*" } },
        ] } }) },

  /* -- depth 9 · Bee: don't feed it ------------------------------------------
     Fires while the player is carrying the saint's finger (which appears
     from depth 9 — the same depth Scally's riddly swap starts waiting).
     A genuine choice-pressure beat: she asks them not to give it to him. */
  { char: "littlebee", depth: 9,
    available: ctx => ctx.player.inventory.some(i => i.id === "saints-finger"),
    make: () => ({
      id: "dont-give-it", story: true, once: true,
      label: "*Her eyes snag on your pocket and stay there.*",
      effects: { like: +2, flag: "bee-warned-bone" },
      node: { text: "*All the speed goes out of her voice, which is how ye know it matters.* That bone yer carryin'. I can near feel it through the glass. *A beat.* Scally's been askin' after that. He asked ME once, back when the wires were still up — did I ever see 'a little relic, a little finger of the old world' on my way down. An' then the wee man went QUIET for a week. *She looks at ye, level.* Scally doesn't do quiet. Chatter's how he breathes. So whatever that thing is TO him — it's not stock. It's not a trinket for the shelf. It's a door he's been standin' at for a long time, an' I don't know what's on the other side of it. *She steps back from the glass.* I'm not tellin' ye what to do with yer own pockets. I'm tellin' ye: know what yer feedin' before ye feed it." } }) },

  /* -- depth 9 · Bee: the verdict (the d8 Dalypso fork, settled) --
     Whatever the player told Dalypso comes home. One beat, three faces:
     the flag set at "what-does-she-say" decides which Bee shows up. */
  { char: "littlebee", depth: 9,
    available: () => hasFlag("told-dalypso-suspicion") || hasFlag("kept-bee-counsel") || hasFlag("dodged-dalypso-question"),
    make: () => ({
      id: "verdict", story: true, once: true,
      label: "*She's waiting for you. Arms folded. She KNOWS.*",
      effects: hasFlag("told-dalypso-suspicion") ? { like: -4 }
             : hasFlag("kept-bee-counsel")      ? { like: +2 }
             : { like: +1 },
      node: { text: hasFlag("told-dalypso-suspicion")
        ? "*She doesn't even let ye stop walkin' properly.* 'Doesn't breathe.' *Yer own delivery, handed back to ye, word for word.* He QUOTED me. To his TELLY. Loudly. Sound carries in this buildin' — that was the whole POINT of what I told ye, an' apparently the whole point of what YOU told HIM. *She's not shoutin'. She's gone the other way: quiet an' surgical.* D'ye understand what ye spent? If he's harmless, ye've hurt the kindest man down here with MY name on the blade. An' if he's NOT harmless — if that window really is a picture — then the thing behind the picture now knows EXACTLY what I see. Ye showed my cards to the one hand at the table I can't read. *She turns away, an' the last of it comes over her shoulder, tired.* The data was for US. Yer a courier. Learn what SEALED means."
        : hasFlag("kept-bee-counsel")
        ? "*She reads yer face for a second — an' then, unexpectedly, nods.* He asked ye. Dalypso. What I say about him. *It's not a question; she watches yer surprise an' takes it as confirmation.* An' ye gave him nothin'. I know because his patter to the telly hasn't changed a syllable, an' THAT man broadcasts everythin' he knows within the hour. He's a lovely open book an' I'm grateful for it. *She unfolds her arms.* ...ye kept it sealed. Even standin' in the warm of him, which I know is warm. That's the first PROPER data point I have on yer character, an' it's a good one. *A beat, an' the smallest twist of a smile.* Don't let it go to yer head. Yer still the whole cohort. Cohorts don't get medals."
        : "*She looks at ye a moment, then snorts.* 'Ask her yerself when I get yez all out.' *She shakes her head slowly.* Aye, he told the telly all about it — dead impressed with ye, so he was. The great diplomatic non-answer. *The eyebrow goes up.* Smooth. Genuinely — I'm not bein' cuttin', it WAS smooth. But hear me: smooth is a lubricant, not a load-bearin' material. One of these levels somebody's goin' to need ye to be a WALL instead, an' pick a side of the line an' stand on it. *She turns back to her work.* Until then — grand. Slither on, courier. It's workin' for ye. It won't forever." } }) },

  /* -- depth 9 · Scally: the riddle (the door he's been standing at) --
     Unconditional companion to the conditional bone beats: his hidden
     desire surfaces in the open, in the only language he has for want.
     Pressing him on it — natural curiosity — is one knock too many. */
  { char: "scally", depth: 9, make: () => ({
      id: "the-riddle", story: true, once: true,
      label: "*He's turning something invisible over in his fingers.*",
      effects: { like: +1 },
      node: { text: "*He doesn't notice you for a moment — genuinely doesn't, which never happens. His fingers are working an old shape in the air, small as a coin, thin as a twig.* ...eh! Amico. *The hands vanish into the coat, too quick.* You catch Scally doing his accounts, is all. The... inventory of the head. *He clears his throat, and then, sideways, in the voice he uses when a thing matters and must not be seen to:* A riddle for you, free of charge. What is small as a key, old as a church, and opens nothing... but closes a very long story? *He smiles, and there is a whole locked room behind it.* No no — don't answer. Is not that kind of riddle. Is the kind you carry until you FIND it. And then, eh... then you will know whose door it belongs to.",
        choices: [
          { text: "*Let the riddle be. Nod, and tip an invisible cap.*", effects: { like: +2 },
            next: { text: "*Something in the little man's shoulders comes down half an inch — you took the parcel without checking the weight of it, and that was the whole test.* ...you are learning the manners of the house, amico. *He taps his nose.* When the maze coughs it up — and she will, she sheds everything eventually, even the holy things — you will feel it watching you back. That is how you know. Bring it to the little shopkeeper, and ask him NOTHING, and he will owe you the kind of debt that has no price sticker. *He turns away to his shelves.* ...grazie. For not asking. You have no idea, and that is exactly as it should be." } },
          { text: "What's behind the riddle, Scally? What does it MEAN to you?", effects: { like: -3 },
            next: { text: "*The fingers stop. All of him stops.* ...eh. *And the shutters come down — not slammed; worse, folded, quietly, like a man closing his stall in the rain.* You know what a riddle IS, amico? Is a box with the lid glued shut, so the thing inside stays FRESH. And you — snip snip — straight for the lid. *He busies himself with stock that was already tidy.* Some doors, you do not knock twice. Was a saying where Scally is from. The second knock, she tells the door too much about YOUR hand. *He glances up once, and the eyes are old.* Find the little thing or don't find it. But the story under it is not stock, was never stock, and it does not come out for curiosity. Not even yours." } },
          { text: "Closes a story, is it? I'd bet luck finds it before I do.", req: { attr: "luck", level: 6 }, effects: { like: +2 },
            next: { text: "*He looks at you sideways, and slowly — slowly — the grin comes back, with something like awe at the edge of it.* ...you know, amico, Scally believes you. Fortuna, she walks behind some people like a pickpocket who gives things BACK. *He leans close.* Then a bargain, between you and the luck: when it falls in your path — and now it will, you have gone and SAID it, the maze listens to the lucky ones — you pick it up gently. Old things bruise. *He straightens, brisk again.* And you bring it up the stairs before anyone else smells it. There are noses down here. Some of them very dear to Scally. Some of them WORRY too much." } },
        ] } }) },

  /* -- depth 9 · Sian: patch notes (the changelog runs backwards) -- */
  { char: "sian", depth: 9, make: () => ({
      id: "patch-notes", story: true, once: true,
      label: "*He's got a wall covered in scratched tally marks and arrows.*",
      effects: { like: +1 },
      node: { text: "Patch notes! *He presents the scratched wall like a whiteboard at a stand-up.* I've been trackin' the build, hai. Every level, what changed. An' look — LOOK. *He walks ye through the scratches at speed.* Version one-point-four: fog got heavier. One-point-five: lights started stutterin'. One-point-six: the wee crates showed up, grand, PROPS, fine. But HERE— *he taps a cluster of angry marks* —here's the thing. The echo went. The session timer went. The pause menu went. The GUARDIAN went. D'ye see the pattern, hai? *He looks at ye, an' the enthusiasm has somethin' colder runnin' under it now, like a stream under a road.* Real games ADD features. This one's been REMOVIN' them. One at a time. Quiet, like. That's not a changelog... that's a countdown. An' I can't work out what it's countin' down TO.",
        choices: [
          { text: "Add it to the ticket. All of it. This is good evidence.", effects: { like: +2 },
            next: { text: "*He straightens like ye've saluted him.* EVIDENCE. Aye! That's the word — not 'worryin'', EVIDENCE. *He starts annotatin' the wall with fresh energy.* Exhibit A through — *he counts* — Exhibit LOADS. When ye reach the dev room this goes in the report, word for word, scratch for scratch. 'Systematic feature removal, user-hostile, reproducible, PRIORITY ONE.' *He steps back from the wall an' nods at it, a man back in control of his sprint board.* They can ignore a feelin', hai. They can't ignore a CHANGELOG. Nobody in the industry can ignore a changelog. It's the one sacred text we have." } },
          { text: "Maybe it's counting down to the bottom. To whatever's waiting there.", effects: { like: +1 },
            next: { text: "*He goes quiet an' looks down the corridor, in the direction down has always been.* ...aye. Maybe. Strip the features as ye descend — no menu, no timer, no net — till there's nothin' left between the player an'... whatever the last level IS. *He rubs the back of his neck.* That's a design philosophy, that is. A BRUTAL one. Final boss with no HUD. *The grin fights its way back up, thinner than usual but game.* Well. Joke's on them, hai — I've been playin' games me whole life an' the last level is where I'm BEST. Tell the bottom I said that. Word for word." } },
          { text: "Or you're seeing patterns in wear and tear. Walls crack, Sian.", effects: { like: -3 },
            next: { text: "*He looks at the wall of tallies, then at you, an' somethin' behind the visor goes flint.* ...wear an' tear. *He taps one scratch cluster, hard.* Did the ECHO wear out? Did the pause menu CRACK? *His voice stays level, which for Sian is the alarmin' version.* I'm a QA lad at heart, hai. D'ye know what they teach ye day one? The USERS report feelin's. The LOG reports facts. This— *he sweeps a hand across the whole scratched wall* —is a log. I logged it BECAUSE I didn't trust the feelin'. An' now the log agrees with the feelin', an' you want me to distrust the both of them together? *He turns back to the wall.* ...check yer own walls, partner. See if they're crackin' in ALPHABETICAL ORDER. Then we'll talk about wear an' tear." } },
        ] } }) },

  /* -- depth 9 · Dalypso: the dark channel (the reception is dying) -- */
  { char: "dalypso", depth: 9, make: () => ({
      id: "the-remote", story: true, once: true,
      label: "*He's pressing the same button over and over.*",
      effects: { like: +1 },
      node: { text: "*Press. Press. Press-press-press.* ...it went DARK. *He holds the remote up like a referee showin' it a card.* Channel four-oh-seven. The bridge documentary channel — the one with the bridges that were never built, I've MENTIONED it, it's appointment viewin'. Last night, nine o'clock, I settle in, an'— *he gestures at a screen only he can see* —BLACK. Not static. Not 'no signal'. BLACK, like a curtain, like somethin' STOOD in front of it. *Press. Press.* First time since I got here. This telly gets channels that don't EXIST, an' now one of them's after... stoppin' existin' HARDER. *He looks at ye, an' underneath the outrage — an' this is new, this is the first time ye've seen it on him — he's rattled.* Channels don't die down here. Nothin' dies down here. So what turned it OFF?",
        choices: [
          { text: "What was on 407 before it went dark? Exactly?", effects: { like: +2 },
            next: { text: "*He points at ye with the remote — the highest honour he confers.* THAT'S the question! THAT'S what nobody— *he catches himself; there is no nobody; there's the telly an' you.* ...bridges. Right? Harmless. Except THINK about it: bridges that were never built. Roads not taken. The channel was all about ways ACROSS that don't exist. *He lets that sit, an' the silence does somethin' cold.* An' the night I finally started takin' notes on ONE of them — takin' NOTES, mind, with a pen an' everythin' — the curtain comes down. *He sets the remote on the sill, very deliberately, an' looks at ye.* Somethin' in this buildin' doesn't like us studyin' the exits. Log THAT with yer woman upstairs. Word for word. Tell her I said BRIDGES." } },
          { text: "Maybe the telly's just on the way out.", effects: { like: -3 },
            next: { text: "*The remote comes down slowly, an' he turns to ye with the full weight of a man whose expertise has been questioned in his OWN sittin' room.* The telly. Is not. The PROBLEM. *He breathes.* This unit gets channels from timelines that never HAPPENED. It survived me da's funeral week on twenty-two hours a DAY. It is the single finest piece of broadcast engineerin' in this or any buildin', an' when IT loses a channel, ye don't blame the SET, ye ask who's been at the TRANSMITTER. *He turns back to the screen, jaw workin'.* 'On the way out.' Honest to God. Ye'd look at a shot referee an' blame the WHISTLE." } },
          { text: "One channel out of thousands. You'll live.",
            next: { text: "*He stares at ye for a second — an' then, unexpectedly, deflates into somethin' quieter an' truer.* ...aye. One channel. *He turns the remote over in his hands.* Ye know what it is, but? Down here I've LOST things before — we all have — an' every one of them went the same way. Not with a bang. With a wee QUIET subtraction ye could talk yerself out of noticin'. The voices through the walls went one night, one by one, an' every single time I said 'ah, they'll be back on the morrow'. *He looks up.* Four-oh-seven's not a channel. It's a CANARY. An' I'm not sittin' in this window watchin' the cage go quiet again without SAYIN' it out loud this time. *He nods at ye, short an' fierce.* There. Said. Witnessed. On yer way." } },
        ] } }) },

  /* -- depth 9 · Homiss: the one he can't finish (a would-ye-rather too far) -- */
  { char: "homiss", depth: 9, make: () => ({
      id: "the-committee", story: true, once: true,
      label: "Go on — you've got one loaded. I can see it.",
      effects: { like: +1, flag: "homiss-stalled" },
      node: { text: "*He lights up — caught fair.* I DO. I've had it in the chamber all day, it's a BEAUTY. Right. *He sets himself the way he does, hands planted, delighted.* Would ye rather... be free somewhere ye know NOBODY — new town, new faces, start from nothin', total stranger — orrrr... *the wind-up is glorious, and then, somewhere in the middle of the sentence, the engine of it just... stops* ...or be stuck somewhere... with everyone ye... *He blinks. The grin's still there, but it's unmanned.* ...huh. *He puts a hand flat on the bass, like steadyin' himself on furniture.* Would ye look at that. First one ever got away from me. It was FUNNY when I built it this mornin', I'd the wordin' an' everythin', an' then it went an'... MEANT somethin', right there in me mouth. *He laughs, an' it doesn't hold the weight.* They're not supposed to MEAN somethin'. That's the whole point o' the game.",
        choices: [
          { text: "Answer it anyway. Both of us. Same time.", effects: { like: +2 },
            next: { text: "*He looks at ye like ye've suggested jumpin' off somethin' — an' then squares up to it, because ye'd be jumpin' together.* ...aye. Go on. Three. Two. *Neither of yez says a word on 'one'. The silence sits there, an' in it, the answer the both of yez didn't say is absolutely deafenin'.* ...well. *He exhales, shaky, grinnin' for real now.* Look at that. Unanimous. *He picks up the bass an' plays somethin' small an' warm, half to himself.* Stuck. With everyone I. *He doesn't finish it, an' doesn't need to.* Same answer as the wee man's question, when ye line them up. Funny, that. Don't tell the committee — they'd have me OUT of the impossible-question business for compromised objectivity." } },
          { text: "It got away from you because you already know your answer.", effects: { like: +1 },
            next: { text: "*He goes to bat it away — an' then doesn't.* ...aye. *A long moment of him lookin' at his own hands on the strings.* The game only works when both doors are pretend, d'ye see. Ye can stand in the shop all day goin' 'grapes or blinkin'' because yer never goin' to HAVE to. But that one — *he nods at where the question fell* — I'm IN that one. I've been in it however long I've been in it. An' a man shouldn't find out his answer by TRIPPIN' over it in front of company. *He straightens, an' manages most of a grin.* ...still a good question, but. Structurally. I'm keepin' the wordin' for after. There's goin' to BE an after — that's not a question, so don't answer it." } },
          { text: "You're right, that one's not funny. Stick to the grapes.", effects: { like: -3 },
            next: { text: "*The relief that crosses his face is instant — an' it curdles just as fast, because he hears what the two of yez are agreein' to.* ...aye. The grapes. Safer ground. *He noodles a bit, not lookin' at ye.* That's what we do, isn't it. Somethin' real pokes its head up an' we all go BACK TO THE GRAPES like it's a fire drill. *He plays a sour wee note, deliberate.* I invented that drill, so I did — I'm not blamin' ye for runnin' it. I'm only sayin'... ye were STANDIN' there. It was half-out. Ye could've let it land, an' ye put the umbrella up instead. *He shakes himself like a wet dog an' summons the grin by main force.* RIGHT. Grapes. A MILLION grapes, mind, the terms don't soften. Away with ye." } },
        ] } }) },

  /* -- depth 11 · Bee: iron (the horseshoe starts appearing here) ---------- */
  { char: "littlebee", depth: 11,
    available: () => !hasFlag("gave-horseshoe"),
    make: () => ({
      id: "iron", story: true, once: true,
      label: "*Mid-sentence, she loses her thread — staring at nothing.*",
      effects: { like: +1 },
      node: { text: "*She's half-way through a point about render latency when she just... stops. Her hands, without consultin' her, have shaped somethin' in the air — a curve, heels-up.* ...d'ye ever — *she catches the hands at it an' snaps them flat to her sides, too late* — have ye come across anythin' IRON down there. On yer travels. Curved, like. Heavy. About the size of a— *the jaw sets* —doesn't matter what size. Old thing. Farrier'd know it. *The stopwatch voice comes back up like a drawbridge.* Forget I asked. It's not important. It's SENTIMENT, is what it is, an' sentiment down here is a leak in yer hull. NEXT topic. ...but if ye DID see one. Ye'd mention it. In passin'." } }) },

  /* -- depth 11 · Scally: the overheads (the shop is a haunted ledger) -- */
  { char: "scally", depth: 11, make: () => ({
      id: "overheads", story: true, once: true,
      label: "*He's counting stock. He's been counting the same shelf a while.*",
      effects: { like: +1 },
      node: { text: "*You watch him count six items, lose the thread, and start again. Twice.* ...amico. Good. A witness. *He steps back from the shelf and gestures at it, like a man presenting evidence against his own house.* Tell Scally what you see. Six pieces, eh? Six. *He turns one of them over: it has no back. Not broken — UNRENDERED, smooth as the inside of an egg.* Yesterday, this one had a back. Scally SOLD things out of the back of it. *His voice stays shopkeeper-level, but the hands have stopped their rubbing entirely.* The books, they do not balance anymore. Things arrive that Scally never ordered. Things go that nobody bought. Is like... eh. Like the maze has started doing inventory of HER own. *He looks up at you.* And a shop, amico, a shop is only a wall with better manners. If the stock is not safe behind Scally's glass... then what else down here is being — *he searches for the word and hates the one he finds* — RESTOCKED?",
        choices: [
          { text: "Then we do YOUR inventory. Tell me every item, I'll remember them.", effects: { like: +2, flag: "scally-audited" },
            next: { text: "*He stares at you — and then, very slowly, the grin comes back, and it is the realest one you have ever been sold.* ...an audit. An OUTSIDE audit. *He's already laying the stock out on the sill, precise as surgery.* Sausage. Token. The little horn. The jar, if the jar is still— sì, the jar. *He makes you say them back. All of them. Twice — and you realise, somewhere in the second recitation, that you are not memorising a shop. You are memorising HIM. The proof of him.* ...ecco. Now Scally exists in two ledgers, eh? One in here, where the maze can cook the books... and one walking around on legs, where she cannot reach. *He taps the glass, soft.* Best deal Scally ever made. And it cost you nothing but memory. Spend it wisely, accountant." } },
          { text: "Maybe you miscounted. It happens — you're tired.", effects: { like: -3 },
            next: { text: "*The look he gives you is not angry. It is worse: it is professional.* ...amico. *He sets the backless thing down with great care.* Scally has counted stock since he was seven years old, in the back of his nonno's shop, in the dark, by TOUCH, because the light cost money. Scally has counted through fevers, through funerals, through a war between two families over a delivery of lemons. *He leans in.* Scally does not miscount. Scally has never ONCE miscounted. And so when the count is wrong, is not the counter — is the WORLD. *He turns back to the shelf.* 'Tired.' Sì, everyone is tired. Is the cheapest explanation in the shop, and like everything cheap, amico... you get what you pay for." } },
          { text: "What arrived that you never ordered?",
            next: { text: "*He goes very still. Then, without a word, he reaches under the sill and sets it on the counter: a small paper bag, folded shut, pristine — the kind a bakery would use. It has a name written on it in pencil. The name is smudged beyond reading. It has been smudged, you suspect, on purpose, by a thumb, many times.* ...it was here when Scally opened up, four levels ago. Is warm, amico. *He does not touch it now that it's down.* Every level, still warm. Scally does not open it. Scally does not sell it. Scally does not THROW IT AWAY, because— *the sentence stops, and the shopkeeper looks at the bag the way other men look at the sea.* ...because maybe it is for somebody. And down here, a thing that is FOR somebody... you do not interfere with that. You keep it warm. *He puts it back under the sill.* Ask me no more about the bag." } },
        ] } }) },

  /* -- depth 11 · Homiss: the request line (a set list for the séance) -- */
  { char: "homiss", depth: 11, make: () => ({
      id: "request-line", story: true, once: true,
      label: "*He's playing snatches of different tunes, like a radio scanning.*",
      effects: { like: +1, peers: [{ of: "homiss", toward: "littlebee", delta: +1 },
                                   { of: "homiss", toward: "sian", delta: +1 },
                                   { of: "homiss", toward: "dalypso", delta: +1 }] },
      node: { text: "*Ye catch him mid-medley: a bar of somethin' thunderous, a bar of somethin' sweet, a bar of what might be a football chant slowed to a hymn.* Ah! Perfect timin'. I'm doin' the REQUEST LINE. *He gestures grandly at the corridor.* Every Friday night — an' I've decided it's Friday — I used to take requests through the walls. Bee'd want the drones, for the brainwaves. Sian'd shout for somethin' with TEETH. An' the big fella with the telly, God love him, he'd request the theme tunes. TELLY themes, on a doctoral bass. An' I'd PLAY them, because a request is a sacred thing, wha'. *He damps the strings, an' the quiet where the audience used to be is suddenly very large.* They can't shout up the line anymore. So. *He looks at ye, an' the ask is gentle an' enormous.* You've stood at all their windows. Ye know them. Make their requests FOR them, an' I'll play the lot — an' Friday stays Friday a wee bit longer.",
        choices: [
          { text: "Drones for Bee. Teeth for Sian. And the snooker theme for Dalypso.", effects: { like: +2 },
            next: { text: "*He points the plectrum at ye like a conductor's baton.* The SNOOKER theme! *He's laughin' before the first note.* Oh, he'd be WEEPIN'. He told me once it was the sound of civilisation — a green field, perfect order, an' hours of it, hours an'— *he's already playin' it, an' it IS gorgeous on the bass, stately as a liner leavin' port. Then the drones, low an' patient, and he plays them TO somewhere, two floors up. Then somethin' with teeth, sent down the other way like a care package.* *When he finishes, the corridor rings a moment, an' he sits back, spent an' shinin'.* ...there. Broadcast complete. They'll not have heard a note of it. *He looks up at the ceiling, then down the hall.* ...or they will. Sound does quare things in this buildin'. Either way — the request line stays OPEN. Same time next Friday. Yer the whole switchboard now, wha'." } },
          { text: "Play your own request tonight. The others can owe you one.", effects: { like: +1 },
            next: { text: "*He blinks — an' laughs, caught out.* MY request? On MY request line? Sure that'd be— *he stops. Considers. An' somethin' sly an' shy crosses his face.* ...d'ye know what, no one's EVER asked the host. *He settles the bass, thinks a long moment, an' then plays — an' it's nothin' ye expected: a waltz. A small, old-fashioned, unapologetic waltz, the kind that smells of church halls an' lemonade.* *He plays it all the way through an' doesn't explain it, an' the not-explainin' is the biggest thing he's ever trusted ye with.* ...me ma's favourite. *That's all ye get, an' it's plenty.* Right. NOW the request line's honest. Off ye go before I play another one an' have to tell ye things." } },
          { text: "A request line with no listeners is just you playing to a wall, Homiss.", effects: { like: -4 },
            next: { text: "*The strings go dead under his flat hand.* ...aye. It is. *He looks at the wall in question, long an' level.* An' d'ye know what playin' to a wall IS, when ye've done it as long as I have? It's PRACTICE. It's keepin' the repertoire warm for when the wall grows EARS again. Every tune I keep ready is a bet that they're comin' back — an' I'd rather lose that bet every Friday for a hundred years than win YOUR version of it once. *He turns away an' starts the drones, low an' fierce.* ...the request line is CLOSED tonight. Due to commentary from the floor. *He doesn't look at ye again, but just before ye're out of earshot, stubborn as sunrise:* ...it reopens NEXT Friday. It always reopens. That's the POINT of it." } },
        ] } }) },

  /* -- depth 11 · Sian: Brenda (the comfort that cuts, the daft one that heals) -- */
  { char: "sian", depth: 11, make: () => ({
      id: "brenda", story: true, once: true,
      label: "Tell me about Brenda. Properly, this time.",
      effects: { like: +1 },
      node: { text: "*He's quiet a second — an' then he takes the servo out of his pocket an' sets it on the sill between yez, like a photograph.* Twelve kilos. Hardened wedge. Drum spinner I rewound meself on the kitchen table, which Bee said was a fire hazard, an' she was right, there WAS a fire, it was CONTAINED, we don't talk about the curtains. *The grin flickers on an' off like the corridor lights.* Undefeated in Leinster. One tribunal. *He turns the servo over.* ...I took her batteries out before I came in here. Ye have to, for storage — LiPos swell, hai, it's basic husbandry. Told her — the SHED, I told the shed — 'back in a few hours.' *He looks up, an' the visor can't do a thing about what's happenin' underneath it.* She's sittin' in the dark with her batteries out, partner. However long it's been. An' the mad thing — the thing I can't get past — is she'll think... machines don't THINK, I KNOW machines don't think, I BUILT her, but she'll— she'll think I stopped comin' because I WANTED to.",
        choices: [
          { text: "She knows you're coming. Twelve kilos of her knows.", effects: { like: +2 },
            next: { text: "*It's daft. Ye both know it's daft. An' he takes it the way a drownin' man takes a rope, darin' nobody to inspect the rope.* ...aye. *He picks the servo up an' pockets it, an' his hand stays around it in the pocket.* She was always the patient one of the two of us. Sat in that corner between bouts like a monk. Never rushed a repair, never sulked a loss — well. The tribunal. She sulked the TRIBUNAL, but so did I, we sulked it TOGETHER, that's TEAMWORK, hai. *He straightens up, an' the grin that comes back has somethin' solid under it again.* First thing when I'm out: batteries in, full charge cycle, an' the longest walk-around inspection in the history of the sport. She'll pretend she doesn't care. She's LIKE her da that way. *He knocks the glass, twice, steady.* Thanks, partner. Ye lie BEAUTIFULLY. Don't ever tell me which bits were lies." } },
          { text: "You'll charge her up soon, Sian. Soon.", effects: { like: -2 },
            next: { text: "*The word lands wrong, an' ye watch it land.* ...SOON. *He says it back to ye slow, like turnin' a faulty part under the light.* What's 'soon', hai? Gimme the UNITS. Because I said 'back in a few hours' to a shed — *the voice climbs, an' it's not anger, it's the arithmetic he's spent nine levels not doin', all arrivin' at once* — an' 'a few hours' became a FRIDAY that hasn't ENDED, an' every one of yez keeps sayin' SOON like it's a number, an' it's NOT a number, I've CHECKED, there's no clock in this buildin' that'll cash it! *He stops himself, breathing hard, an' puts both hands flat on the sill.* ...sorry. Sorry, hai. Yer bein' kind, I know yer bein' kind. But do us a favour: don't say 'soon' at me again. Say 'I don't know'. I can BUILD on 'I don't know'. Soon's just... paint over a gap. *He picks up his tools, quieter.* Go on. I'm grand. That's also paint, but it's MY paint." } },
          { text: "A drum spinner off a washing machine motor. Walk me through the build.", effects: { like: +2 },
            next: { text: "*And he's OFF — the grief converts to torque figures before yer eyes, which is maybe the same thing wearin' overalls.* RIGHT. So. Yer standard washer motor's got the guts but not the GRR, hai — wrong kV for weapon work, so ye rewind it: strip the stator, count yer turns, drop the resistance, an' suddenly the wee domestic hero that used to do DELICATES is swingin' four hundred grams of hardened steel at nine thousand RPM. *He's drawin' it on the fog of the glass, wiring diagrams an' all.* Belt reduction — chains SHED, don't let anyone tell ye different — an' the whole drum's a flywheel, so ye bank the energy BETWEEN hits, d'ye see? She doesn't hit hard because she's strong. She hits hard because she's PATIENT. Stores it all up in the spin an' gives it back in one go. *He stops, looks at the diagram, an' laughs at himself, soft.* ...aye. Her da's daughter, right enough. GO, before I do the electronics module. I WILL do the electronics module." } },
        ] } }) },

  /* -- depth 11 · Dalypso: planning permission (vote on the conservatory) -- */
  { char: "dalypso", depth: 11, make: () => ({
      id: "planning-permission", story: true, once: true,
      label: "*He's pacing out measurements that don't exist.*",
      effects: { like: +1 },
      node: { text: "—three metres by four, off the back kitchen, southeast corner— *he clocks ye an' pulls ye into the plannin' meetin' with one wave* —GOOD, quorum. Right. Sit. Stand. LISTEN. *He squares up like a man presentin' to the county council.* The conservatory. *He lets the word land with the gravity it deserves.* Three by four, off the back kitchen, catchin' the mornin' sun before the garden takes it. Glass roof — the GOOD glass, self-cleanin', I'm not up a ladder every fortnight of me retirement. Rattan furniture. A wee table for the paper. An' in the corner — *he places it with two hands, tenderly* — a chair angled EXACTLY between the garden an' the telly, so a man can watch either, or BOTH, dependin' on the quality of the fixtures. *He turns to ye, arms folded.* Her indoors— the BANK, I mean the bank — says it's an extravagance. The lads said 'sure ye've a garden, sit IN it.' Philistines, the lot. So it comes to you, casting vote: does the conservatory get built? Think CAREFULLY. This is a plannin' decision, not a POPULARITY contest.",
        choices: [
          { text: "No conservatory. It'd ruin the line of the house. Extend the good room instead.", effects: { like: +2 },
            next: { text: "*He inhales like a man harpooned — an' then stops, mid-outrage, because the counter-proposal has TEETH.* ...ruin the— EXTEND the— *he wheels around to look at the invisible house, actually consultin' it.* The good room DOES back onto the— ye'd get the evenin' light instead of the mornin', which for a workin' man is the only light he ever— *he paces the new footprint, muttering fixtures an' load-bearin' walls, an' finally rounds on ye with the fury of a man convinced against his will.* THAT is the WORST thing about ye, d'ye know that?! Ye come to MY plannin' meeting, ye REJECT my conservatory, an' ye do it with a BETTER IDEA! *He jabs a finger at ye, eyes blazin' with pure joy.* The extension's APPROVED. Yer barred from the next meetin'. Yer CHAIRIN' the next meetin'. GET OUT of me office." } },
          { text: "Build it. It sounds perfect exactly as you described it.", effects: { like: -3 },
            next: { text: "*Silence. The plannin' energy drains out of him like bathwater.* ...'perfect exactly as described.' *He sits down heavily on the invisible rattan.* D'ye know how long I've been holdin' the conservatory debate? MONTHS. I've had it with the lads, with the bank, with the RAIN, once, out loud, at a bus stop. I'd counter-arguments STOCKPILED. I'd a whole bit prepared about the self-cleanin' glass bein' worth it over TIME— *he looks up at ye, betrayed.* —an' ye APPROVED it. First round. Unanimous. *He shakes his head slowly.* A plannin' process with no objections isn't plannin', it's RUBBER-STAMPIN', an' a conservatory nobody fought for... *he waves a hand, disgusted* ...sure it's just a GREENHOUSE with notions. Away. The meetin's adjourned due to lack of OPPOSITION." } },
          { text: "Casting vote requires a site visit. I'll inspect when we're all standing in that kitchen.",
            next: { text: "*He goes to object — procedural grounds, ye can see the objection formin' — an' then the actual CONTENT of what ye said gets through, an' it stops him flat.* ...a site visit. *He says it carefully, like handlin' somethin' breakable.* All of us. Standin' in the back kitchen. You with yer wee clipboard, Sian measurin' things wrong, Bee testin' the light like it's a patient, Homiss forty minutes late to his OWN site visit... *He stands there inside the picture of it for a long moment, an' when he comes back out his voice has to take the long way round.* ...aye. Aye, that's — that's proper procedure, in fairness. Ye can't approve a conservatory ye haven't STOOD in. *He clears his throat, hard, twice.* Motion carried. Decision DEFERRED to the site visit. *He points at ye.* That's a bindin' commitment now, d'ye understand me? Ye've entered it into the MINUTES. Get us to the site." } },
        ] } }) },

  /* -- depth 12 · Sian: the headset ------------------------------------------
     The crack becomes a break. Everything after this runs through Bee. */
  { char: "sian", depth: 12, make: () => ({
      id: "the-headset", story: true, once: true,
      label: "*He's got both hands up at his temples, very still.*",
      effects: { like: +1, flag: "sian-cracking" },
      node: { text: "*When he speaks it's at half his usual volume, which is somehow the loudest thing ye've ever heard from him.* I went to take it off. The headset. Just — enough of it for one day, hai, take it off, have yer chips, charge Brenda. Normal. NORMAL thing. *His fingers move at his temples, searchin'.* There's no edge. There's no strap, no gasket, no seam — I went lookin' for the edge of it an' me fingers just kept GOIN', like — like askin' where yer face clips onto yer head. *He laughs, an' it's the laugh of a man on a ladder that's started movin'.* That's class though, isn't it? That's — immersion, hai, that's next-gen fit tech, that's— *both hands come down an' grip the window frame.* ...there's no headset, is there. There's no— what is this. What IS this, hai. WHAT IS—  *He stops himself. Somewhere behind the visor he is doin' arithmetic no one should have to do.* ...ye wouldn't — ye'd know where Bee is. Wouldn't ye. Ye'd get word to Bee.",
        choices: [
          { text: "I'm going to her window right now. Hold on for me, big man.", effects: { like: +2 },
            next: { text: "*He nods — an' keeps noddin', small an' fast, a man usin' the motion to stay upright.* Right now. Aye. Right now's good. Right now's— *he grips the sill an' makes himself say the rest like a lad radioin' in his own crash* —tell her. Tell her what I told ye, the exact words, the edge an' the— all of it. She'll know what it means. She always knows what things MEAN, that was always her half of the— *the breath shudders in an' comes out steadier.* GO. Please, hai. An' partner— *ye're already movin', an' his voice follows ye down the corridor, small but holdin'* —come back after. Even after. ESPECIALLY after." } },
          { text: "Look at me. Five things you can see. Go. Now.", effects: { like: +2 },
            next: { text: "*His head comes round.* ...what? *But the command in it catches some old trainin' in him — the pit-lane part, the part that answers checklists — an' he goes.* Five things I can— the window. You. Me hands. The— the fog. The wall. *The breathin' slows a notch with each one, an' by the wall he's back behind his own eyes, shaky but PRESENT.* ...where'd ye learn that? That's — that's a systems reset, that is. That's exactly what ye'd— *he stops, an' a wet laugh gets out.* Bee'd do that. That's a BEE move. Yez'd get on, the pair of— GET WORD TO HER. Tell her what happened, tell her what ye just did, tell her it WORKED, hai — she'll want the data. She'll pretend it's about the data. GO." } },
          { text: "It's going to be fine, Sian.", effects: { like: -2 },
            next: { text: "*Both hands come off the frame, an' for the first time since ye've known him he looks at ye the way ye'd look at an NPC.* ...fine. *He says it quietly, an' the quiet is scorched round the edges.* Don't. Don't do the— everyone says FINE, the game says fine, the FOG says fine, I've been sayin' fine to meself for a Friday that's lasted— *he catches it, barely.* There's no EDGE on me HEAD, partner. Ye don't 'fine' that. Ye either know somethin' I don't, or yer paintin' over the gap, an' I've enough paint in here to do the HOUSE. *He turns away, hands back at his temples.* ...Bee. Just — get word to Bee. She doesn't do 'fine'. It's her ONE flaw an' I need it." } },
        ] } }) },

  /* -- relay · Bee: the grounding (min-depth 13 paces it) ------------------- */
  { char: "littlebee", depth: 13,
    available: () => hasFlag("sian-cracking") && !hasFlag("msg-ground"),
    make: () => ({
      id: "ground-him", story: true, once: true,
      label: "It's Sian. He went looking for the headset's edge.",
      effects: { like: +2, flag: "msg-ground", peers: [{ of: "littlebee", toward: "sian", delta: +2 }] },
      node: { text: "*She goes completely still. One breath in through the nose, an' when she speaks it's a different voice entirely — the one they must have taught her on the wards, slow an' level an' impossible to argue with.* Right. He found it. Okay. We knew he'd find it, an' he found it, an' that's — that's data, an' data's fine. *The eyes are not fine. The voice does not consult them.* Listen to me now, because ye'll deliver this EXACTLY, word for word, an' if ye soften it or sweeten it I'll know: 'Five things ye can see. Four things ye can hear. Three ye can touch. Then breathe, ye eejit — an' remember the long acre.' *She makes ye say it back. Twice.* The last bit's ours. Ye don't get to know what it means, an' if he tells ye, I'll have the both of ye. GO. Please. *The please costs her somethin'.* Go." } }) },

  /* -- depth 13 · Sian: the system check (he mirrors Bee, on purpose) -- */
  { char: "sian", depth: 13, make: () => ({
      id: "system-check", story: true, once: true,
      label: "*He's talking himself through something, finger to finger.*",
      effects: { like: +1 },
      node: { text: "—name: Sian. Occupation: menus. Robot: Brenda. Woman: — *he clocks ye, an' doesn't stop, just nods ye into it* — Bee. Best mate: Dalypso. Rival, an' don't tell him the gap's widened: Homiss. *He finishes the hand an' holds it up to ye, all five fingers out, like a lad showin' ye a full house.* System check, hai. I do it every level now. Since the — *he taps his temple, where the edge isn't* — since the hardware review came back INCONCLUSIVE. Five facts, five fingers. If they all boot up, the core install's grand, whatever the peripherals are at. *He flexes the hand once an' pockets it.* Bee runs her wee battery on ye every level, right? Pupils an' animals an' the year? Aye. I've seen ye do the face comin' down the stairs. *The grin's steady — steadier than it's been in a while, actually, like a man who's found a handrail.* So here's the ask, partner. She checks you... you check ME. Same slot, every level. Ask us the five. An' if I ever miss one — *the grin doesn't waver, which is how ye know he's thought about this in the dark* — if I ever miss one, ye don't tell me soft. Ye tell me STRAIGHT, an' then ye go get her. That's the protocol. Sign here.",
        choices: [
          { text: "Signed. Five facts, every level, straight or nothing.", effects: { like: +2, flag: "sian-protocol" },
            next: { text: "*He nods, sharp, an' shakes on it through the glass — his palm flat on his side, waitin' till ye match it.* Witnessed an' BINDIN'. Cavan law. *He steps back, an' ye can see the relief run through him like current — not because the fear's gone, but because it's got a PROCEDURE now, an' a lad like Sian can hold anythin' that has a procedure.* D'ye know what's mad? I feel better than I have in ten levels. The headset thing, the timer thing — ye can't fight fog, hai. But a CHECKLIST? *He kisses the back of his own hand like it's a trophy.* A checklist I can run forever. Right. Off ye go — an' STUDY, partner. Next level ye're askin' me the five, an' I'll be markin' YOUR delivery too. Everyone's assessin' everyone. It's the only game in town worth playin'." } },
          { text: "Run it now. All five. I'm listening.", effects: { like: +2 },
            next: { text: "*He straightens like it's a title bout weigh-in.* NOW? No warm-up? *He loves it.* Name: Sian. Occupation: — *an' there, on the second finger, the first wee hitch ye've ever seen in it* — ...menus. I did menus. At the place with the— at the PLACE. *He pushes through, an' the third an' fourth come out clean an' loud:* Robot: Brenda, twelve kilos, undefeated-with-an-asterisk. Woman: Bee, five-foot-nothin', undefeated NO asterisk. Best mate: Dalypso, since we were six, fought a referee from the STANDS. *He holds the full hand up, breathin' a wee bit hard.* ...five of five. Core install verified. *He looks at ye, an' says the true thing almost casually, which is the only way he can:* the second one took a second, but. Ye caught that. *A beat.* Good. That's WHY there's a witness, hai. Log it an' say nothin' to nobody but her. That's the protocol workin', not failin'. GO." } },
          { text: "And if the day comes you miss two?", effects: { like: -2 },
            next: { text: "*The grin holds, but everything behind it goes to standby for a second.* ...two. *He looks down at his own hand like it's a build he doesn't trust anymore.* One's a dropped frame, hai. Everyone drops frames. Two is... two's a PATTERN, an' patterns get escalated. *He works the jaw.* If it's ever two, ye go straight past me — no discussion, no lettin' me talk ye round, an' I WILL try to talk ye round, I'll be CHARMIN', it's the worst thing about me — straight to Bee, an' yez do whatever the pair of yez decide, an' I get no vote. A lad with two facts down doesn't GET a vote on his own rollback. *He exhales.* ...I'd have rather ye hadn't asked that one out loud, partner. But yer right that somebody had to. It's in the protocol now. ANNEX B. *He turns back to the bench, an' it takes him a minute to pick up the right tool.*" } },
        ] } }) },

  /* -- depth 13 · Dalypso: the missed episode (your channel skipped) -- */
  { char: "dalypso", depth: 13, make: () => ({
      id: "missed-appointment", story: true, once: true,
      label: "*He's up at the glass before you're even close.*",
      effects: { like: +1 },
      node: { text: "WHERE were ye. *No hello. The remote's in his fist like a relay baton.* Last night. Nine o'clock. Appointment viewin' — YOUR programme, YOUR slot — I'm settled, I've the good chair angled, an'... *he jabs the remote at the dark screen behind him* ...STATIC. A full episode of static. First time since I started watchin'. An' before ye say it — *the finger comes up, pre-refutin' ye* — the TELLY is FINE, we've ESTABLISHED the telly is fine, four-oh-seven was the transmitter an' so was THIS. *He leans close, an' behind the bluster is somethin' that's been pacin' that wee room all night.* Except here's the thing that had me talkin' to the ceiling at four in the mornin': the static wasn't EMPTY. Ye know static — I know static, I've watched static for FUN — static crawls. This static... *he sets the remote down, very quiet all of a sudden* ...this static was still. Like held breath. Like somethin' standin' in FRONT of the picture, mindin' me not seein' it. A whole episode of somethin' mindin' me not seein' you. *He looks at ye, an' the pundit an' the friend are the same man for once, an' both of them are frightened.* So I'll ask again, an' I want the boring answer: where WERE ye, nine o'clock last night?",
        choices: [
          { text: "Walking the maze, same as every night. Nothing happened to me at all.", effects: { like: +2 },
            next: { text: "*He studies ye the way he'd study a replay from the third angle — an' whatever he's lookin' for, he doesn't find it, an' the relief nearly takes his legs.* Nothin'. Ye were just WALKIN'. *He sits down heavy in the good chair.* Right. So the picture was fine, an' the SUBJECT was fine... an' somethin' stood between them anyway. *He picks the ball up off the floor an' holds it, thinkin' hard.* That's not interference, that's CENSORSHIP. Somebody cut to static rather than let me see a bit of yer episode. Which means last night, nine o'clock, somewhere in that maze... somethin' happened NEAR ye that ye never clocked. Somethin' the channel didn't want witnessed. *He looks up, an' the sentry from the stakeout is fully on duty now.* Mind yerself on the night walks, d'ye hear me? Yer bein' EDITED, an' I don't like the cut." } },
          { text: "You sat up all night worrying about a TV show?", effects: { like: -3 },
            next: { text: "*He goes very still, an' when he answers, it's with the terrible patience of a man explainin' his heart to a wall.* ...a TV show. *He stands.* When me da was in the hospital — the last stretch of it — I couldn't always be there, right? Shifts. Distance. LIFE. But the ward had a webcam thing, for families. Grainy wee picture, updated every whatever. An' I'd sit up HALF THE NIGHT with that grainy wee picture, an' d'ye know what it was? It was NOT a TV show. It was the only window I had. *He picks up the remote an' turns back to the screen.* You're on the only window I have, an' last night the window went to static for an hour, an' I sat up with it. Like ye do. For family. *He doesn't look at ye.* Now away on, an' the next time somebody waits up for ye, try an' be worth the— *he stops himself, sits down, an' turns the volume up on nothin'.* ...just away on." } },
          { text: "What time did the static end? Exactly. And what was I doing when the picture came back?", effects: { like: +2 },
            next: { text: "*The question snaps him straight into analyst mode, an' he's grateful for it — facts are a handrail for him too.* Five past ten. Sixty-five minutes, near enough — I timed it off the snooker channel, the snooker NEVER lies. An' when ye came back... *he squints, reconstructin' the frame* ...ye were stood dead still in a junction. Facin' a wall. Not A wall — *he corrects himself, precise as a linesman* — a windowless stretch, the long one, where nobody's window is. Just standin'. Lookin' at brick. For a good ten seconds, an' then ye shook yerself like a wet dog an' walked on. *He looks at ye.* D'ye remember doin' that? *Whatever's on yer face, he reads it, an' nods slowly, grim.* ...ye don't. Sixty-five minutes gone from the broadcast an' ten seconds gone from the LEAD. *He writes it — actually writes it, on a pad ye've never seen before.* That's goin' in the file. We have a FILE now. Mind yerself, ye hear me? Somethin' in this buildin' is doin' EDITS." } },
        ] } }) },

  /* -- depth 13 · Homiss: the borrowed tune (the days are eating the music) -- */
  { char: "homiss", depth: 13, make: () => ({
      id: "borrowed-tune", story: true, once: true,
      label: "*He's playing the little walking tune. It keeps going wrong.*",
      effects: { like: +1 },
      node: { text: "*Ye recognise it from the far end of the corridor — the wee run of notes he built for carryin'. Except it stumbles at the fourth bar, an' he starts over, an' it stumbles at the fourth bar, an' he starts over.* ...don't. *He says it without lookin' up, the moment yer shadow touches his light.* Don't say anythin' kind yet, I'm not fit for it. *He sets the bass down flat across his knees, like a patient.* The middle's gone. Me own tune — EIGHT bars, I wrote it, I wrote it FOR ye, I played it a hundred times — an' somewhere between last level an' this one, the fourth bar just... *he makes a small gesture, like lettin' sand out of a fist* ...went. I can feel the SHAPE where it was. Like yer tongue findin' the gap where the tooth. *He looks up at last, an' the fear on him is the specific, articulate fear of a man whose trade is memory.* Bee says memory down here is too crisp. No decay. Everything keeps. So riddle me this, friend: in a place where NOTHIN' fades... what does it mean when somethin' of MINE does?",
        choices: [
          { text: "*Hum the fourth bar back to him. You've had it in your pocket all along.*", effects: { like: +2, flag: "returned-tune" },
            next: { text: "*Ye get three notes in an' his head comes up like a man hearin' his name called in an empty house.* ...THERE. THAT'S— *he scrambles the bass up an' plays along, an' the fourth bar clicks into the run like a bone set true, an' he plays the whole eight through, twice, three times, laughin' by the end of it like something unhurt.* YE HAD IT. Ye absolute — the COURIER had the post all along! *He sags back, spent an' delighted, huggin' the instrument.* D'ye see what happened there? D'ye SEE it? I posted the tune to ye at depth eight an' the maze came for the original — an' it was ALREADY OUT. Backed up. In a pocket with LEGS. *He points at ye, an' there's something fierce an' bright in it now.* That's the answer, friend. That's the whole answer an' we found it by ACCIDENT: whatever this place eats, it can't eat what's been GIVEN AWAY. Tell the others. Tell them tonight. Everyone posts everything. We'll carry each other out in PIECES if we have to." } },
          { text: "It means the maze has started taking. You need to give the rest away — fast.", effects: { like: +1 },
            next: { text: "*He goes pale — an' then, because underneath the jokes he has always been the bravest of them, he nods, once, an' gets to work.* ...aye. Aye, that's the readin', isn't it. It's not FADIN', it's bein' WITHDRAWN. *He pulls the scrawled napkins out — both of them, the notation, the setlist, all of it — an' spreads them on the sill like a man dividin' an estate.* Right. Triage. The reunion setlist ye already know the shape of. The waltz — me ma's waltz — that goes to YOU, next visit, note by note, no arguments. The forty-minute drone can't be stolen because it can't be REMEMBERED, that's the joke of it, it was always burglar-proof— *he manages half a laugh, an' it steadies him.* ...an' the wee walkin' tune. Gone's gone, or gone's HELD, we'll find out when ye meet somethin' hummin' it in the deep, wha'? *A shiver, shaken off.* Go. Send the others up. Estate plannin' night at Homiss's window. Bring nothin'. Take EVERYTHING." } },
          { text: "You probably just need rest. Nobody remembers everything all the time.", effects: { like: -4 },
            next: { text: "*His hands come off the strings entirely.* ...friend. *The word is gentle, an' what follows is not.* At me VIVA — me doctoral defence — a man with a beard like a hedge asked me to sing back a twelve-tone row he'd played ONCE, upside-down an' backwards, an' I did it with a HANGOVER. I have perfect recall of every tune I've touched since I was seven years of age. It is the one talent God nailed DOWN in me. *He stands, an' the window frame creaks with how still he's holdin' himself.* 'Nobody remembers everything.' I DO. That's the POINT. I'm the lad who remembers everything, standin' in front of ye with a HOLE in an eight-bar tune, an' ye'd hand me an early NIGHT for it? *He sits back down, an' the anger drains as fast as it came, leavin' just the fear, which is worse.* ...away on. An' hope ye never have to explain yer own missin' bar to somebody who thinks yer TIRED." } },
        ] } }) },

  /* -- depth 13 · Scally: closing time (the offer of formal employment) -- */
  { char: "scally", depth: 13, make: () => ({
      id: "closing-time", story: true, once: true,
      label: "*He's writing something with great ceremony.*",
      effects: { like: +1 },
      node: { text: "*He's scratching away at a scrap of card with a stub of pencil, tongue between his teeth, and when he finishes he holds it up to the glass with both hands, proud as a nonna with a certificate. It reads, in careful block letters: 'SCALLY & CO.'* ...eh? EH? *He turns it back to admire it.* Thirteen levels, amico. Scally has watched you carry messages like a postman, carry grief like a nurse, carry that DREADFUL bone like a man who does not read warning labels. And a business decision has been reached. *He sets the card on the sill, face-out, and folds his hands on top of it like a man closing a deal in a trattoria.* The '& CO.' is you. Is official. No wages — the wages is INFORMATION, which down here beats money like rock beats egg. No uniform — tragically, the coat, she is one of a kind. And no hours, except... *and here the shopkeeper voice thins, and underneath it is the thing he has been not-saying for six levels* ...except the deliveries do not stop, amico. Whatever you find at the bottom. Whatever it costs to open the frames. The '& CO.' keeps making the rounds until every window on the books is EMPTY. That is the contract. *He slides an invisible pen across the sill.* Sign.",
        choices: [
          { text: "*Sign it. Press your hand flat to the glass over his.*", effects: { like: +2, flag: "scally-and-co" },
            next: { text: "*He looks at your hand on the glass a long moment — and then puts his own against it, palm to palm through twelve millimetres of impossible, and for once in his commercial life says nothing at all for a full five seconds.* ...ecco. Witnessed by the maze, countersigned by the fog. *He clears his throat violently and becomes a businessman again at speed.* PARTNER. Junior partner. EXTREMELY junior — we discuss equity when the windows open. *He tucks the little card somewhere over his heart, in the coat.* Now. First directive of the board, amico, and Scally means this with the whole of his crooked little heart: the firm's most valuable asset walks the halls with no glass in front of it. PROTECT the asset. Whatever is down there singing and standing at windows and eating the backs off Scally's stock — the asset does not take it on alone. The asset comes HOME first, and we do the books together. Sì? Sì. Meeting adjourned. Go make the rounds, & CO." } },
          { text: "What happened to the operators who worked for you before me?", effects: { like: +1 },
            next: { text: "*The pencil stub goes still between his fingers.* ...eh. The direct question. Is why Scally is hiring you and not a diplomat. *He looks down at the little card a moment.* Three, there were, that Scally would have printed cards for. One stopped talking to the windows — you have heard this story, at depth ten, so Scally will not sell it to you twice. One went down fast, TOO fast, a man in a hurry to find the bottom... and the maze, she loves a man in a hurry. *A pause.* ...and one, amico, one used to stand where you stand, laughing at Scally's prices, and one level she simply was not there anymore. No goodbye. No last delivery. The stock she had ordered is still under the sill. *He does not look at the folded bakery bag, so hard that it is the same as pointing at it.* ...paid in advance, she had. Scally keeps it warm. *He straightens, and slides the card forward again.* THAT is what happened to the others, and that is why the contract says what it says: the rounds do not stop. Windows before wages. Sign or don't, amico — but now you sign informed, which is more than most employers ever give." } },
          { text: "I work alone, Scally. No firms, no contracts.", effects: { like: -3 },
            next: { text: "*He looks at the little card, then at you, and slowly — with great care, so you see every second of it — he tears it down the middle, between the SCALLY and the CO.* ...va bene. *No theatrics. That is what makes it land.* You know, amico, Scally has heard 'I work alone' from exactly four mouths in his time down here. *He tucks both halves of the card into the coat.* Four. And you want to know the thing? The maze AGREED with all of them. She gave each one exactly the alone they asked for — measured it out generous, like a good butcher. More alone than they could carry, in the end. *He turns to his shelves and begins to close up the stall, shutter by tiny shutter.* The offer, she stays open. Torn is not burned. But do Scally one kindness, since he cannot invoice you for it: when the alone starts to fit too well... come back before it tailors itself to you. The '& CO.', amico, was never about the deliveries." } },
        ] } }) },

  /* -- relay · Sian: five things (min-depth 14) ------------------------------ */
  { char: "sian", depth: 14,
    available: () => hasFlag("msg-ground") && !hasFlag("sian-grounded"),
    make: () => ({
      id: "grounded", story: true, once: true,
      label: "Bee says: five things you can see. Four you can hear. And—",
      effects: { like: +3, flag: "sian-grounded", peers: [{ of: "sian", toward: "littlebee", delta: +4 }] },
      node: { text: "*He's on it before ye finish, like a drownin' man findin' the ladder.* Five things — the window. Your face. The fog. The wall. Me hands. *breath* Four I can hear — you. The hum. Me own heart, that's three— the maze doesn't ECHO, that's four, it should echo an' it doesn't, hai, filin' that away— *breath* Three I can touch. Glass. Frame. ...Brenda's servo, in me pocket. *The shoulders come down an inch at a time, a crane settin' down a load.* An' breathe. *He breathes.* ...an' remember the long acre. *The laugh that comes out of him then is shaky an' real an' entirely his own.* Aye. The long acre. *He wipes under the visor with the heel of one hand, quick.* That's ours, that is. Yez'll not be gettin' it out of me, so don't ask, hai. *He straightens up.* Tell her I'm grand. Tell her I'm GRAND — an' tell her... tell her the tenner's up to twelve fifty now, with the interest. She'll understand. It's a Cavan thing." } }) },

  /* -- depth 14 · Bee: results day (the grounding landed; the guard drops an inch) -- */
  { char: "littlebee", depth: 14,
    available: () => hasFlag("sian-grounded"),
    make: () => ({
      id: "results-day", story: true, once: true,
      label: "It landed. Word for word. He's shaken — but he's whole.",
      effects: { like: +2, peers: [{ of: "littlebee", toward: "sian", delta: +2 }] },
      node: { text: "*She hears ye out without movin' — the five things, the four, the breath, the long acre, his answer comin' back up the stairs on your legs — an' when ye finish, she turns away from the glass an' stands with her back to ye for a while, an' ye let her.* ...twelve fifty. With the INTEREST. *When she turns round she's laughin', an' her face is wet, an' she doesn't bother pretendin' either thing isn't happenin'.* The absolute EEJIT. Ye hand a man a rope out of the worst hour of his life an' he uses it to REVISE A DEBT upwards. *She wipes her face with the heel of one hand, brisk, like cleanin' an instrument.* That's him whole, aye. That's whole-Sian behaviour, confirmed twice over. *She comes right up to the glass, an' for once there's no test runnin' behind her eyes — or there is, but yer not the subject of it; ye passed it at some point when neither of yez was lookin'.* You did that. I drafted it — years of drafts, ye've no idea — but a draft in a drawer never grounded anybody. YOU carried it down them stairs an' said it to his face like it was yours. *A breath.* I'll not forget it. That's not sentiment. That's a LEDGER entry, an' I keep the most accurate books in this buildin'.",
        choices: [
          { text: "The long acre. Am I ever getting told what that means?",
            next: { text: "*She laughs — a real one, worn soft at the edges.* Not a chance. *She leans against her side of the frame.* But I'll give ye the shape of it, since ye've earned a shape: it's a field. A real one, with a real slope an' terrible drainage, an' the two of us stood in it one specific evenin' bein' completely certain about somethin' for the first time. That's all yer gettin'. *She points at ye, mock-stern, eyes still shinin'.* Everybody trapped in this place has a long acre, courier — the wee man's got one under his coat, the musician keeps his in a waltz, God knows the fella with the telly BOUGHT his. Yours is probably still ahead of ye. When ye find it, ye'll understand why they're not for tellin'. They're the one thing the maze can't inventory." } },
          { text: "He also says you're getting 'the big horse'. Still no explanation offered.", effects: { like: +1 },
            next: { text: "*She makes a sound that is technically a laugh an' structurally a sob, an' points at ye with deadly force.* NOT ONE WORD. That is a SEALED file, that is— *she recovers herself, mostly.* There's a toy shop in Cavan town, an' in the window of it there is — or there WAS, God, years now — a horse. A rockin' horse the size of an actual PONY, dapple grey, mad glass eyes, price tag like a used CAR. An' one evenin' early on, passin' it, I said somethin' I have regretted every day since, which was: 'if ye ever properly annoy me, that's the apology I'll be acceptin'.' *She folds her arms, entirely failin' to look stern.* He's been threatenin' me with that horse for YEARS. Every row. 'Mind yerself or yer gettin' the big horse.' It's not romance, it's EXTORTION with upholstery. *A beat. Her voice goes quiet an' certain.* ...he'd better be plannin' to deliver it in PERSON, is all I'll say. Tell him that. Word for word. He'll know what it means." } },
          { text: "You drafted that grounding routine years ago. You knew this day was coming.", effects: { like: +1 },
            next: { text: "*The laughter settles out of her, an' what's left is the steady clinical honesty she saves for the things that matter most.* Aye. I knew before HE did. I knew in the shop, probably — he put the headset on to demo it an' did the wee gasp, an' I stood there thinkin': there's a man who'll follow the beautiful thing all the way in, an' someone had better be holdin' the other end of the rope. *She looks down at her own hands.* So I drafted. Five things ye can see — because sight's his strongest channel. Four ye can hear — because me voice would be in the four, even secondhand. The breath, because breath's the only interface the body never revokes. An' the long acre at the end, because a rope needs an ANCHOR, an' ours is planted in better soil than this place is built on. *She looks up.* Preparation isn't pessimism, courier. It's how ye love somebody with yer eyes open. Write that down. It'll be on the test." } },
        ] } }) },

  /* -- depth 14 · Scally: the exit interview (how many fit through the door?) --
     The endgame question, asked plainly — and the first "promise" the
     player can spend. Promises are counted (the manifest, d15). */
  { char: "scally", depth: 14, make: () => ({
      id: "exit-interview", story: true, once: true,
      label: "*No grin tonight. He asks you to stand still a moment.*",
      effects: { like: +1, flag: "heard-doorprice" },
      node: { text: "*The stall is tidy. The coat is buttoned. Whatever this is, he has prepared for it.* Amico. Fourteen levels of good custom, so Scally asks the real question now, the one under all the others, and he asks it like a man and not like a shop: *he puts both hands flat on the sill.* When you find the door at the bottom — the code, the machinery, whatever shape the way out wears — how many of us fit through it? *He watches your face very carefully.* Because Scally has done business a long, long time, and he has learned the one law under all the laws: everything has a price, and the price of a BIG thing is never 'nothing'. Five windows. One door. *His voice does not waver, which costs him visibly.* If the answer someday turns out to be 'not everybody, amico'... Scally would rather know now what kind of courier holds the list.",
        choices: [
          { text: "Everyone comes out. I'm not accepting any other arithmetic.", effects: { like: +2 },
            next: { text: "*He looks at you a long time — and then nods, slowly, like a man accepting a currency he isn't sure is backed.* 'Everyone.' *He unbuttons the coat again, which is his body deciding to believe you before his head does.* You know what, amico? Scally has heard 'everyone' before, from politicians and priests and one memorable insurance man. From them it was a PRICE TAG — a thing said to close the sale. From you... *he tilts his head* ...from you it sounds like a number you intend to go and COLLECT. *The grin returns, small, real, and fierce in a way you have not seen on him.* Va bene. Then practice saying it, courier. Say it every level, at every window, until the maze herself has heard it so many times she starts stocking it. EVERYONE. *He taps the sill.* Best item ever listed at this stall. No discounts." } },
          { text: "If it comes to an order — you first, Scally. I owe you the most.", effects: { like: +2, flag: "promised-scally-first" },
            next: { text: "*Whatever he expected, it was not that. The little man goes absolutely still, and something crosses his face that is equal parts warmth and alarm — and the alarm wins, which tells you everything about who he actually is under the coat.* ...no. *He says it quietly, and firmly, and kindly.* No, amico. Listen to Scally now, and listen well, because he will deny this conversation to his dying day: you do NOT owe the most to the one who charged you the most. *He leans in.* If there is an order — and pray the door is wide and there is no order — you take the doctor's man first, because he is the one the maze is eating fastest. Then the doctor, because she will fight you on it and lose time. Then the musician, then the loud one, and LAST — *he taps his own chest* — last, the shopkeeper, who has the most practice waiting. *He straightens, and the grin comes back on like armor.* ...but Scally heard what you said, amico. He heard it. It goes in the ledger with the other impossible assets. Now go, before he prices it." } },
          { text: "That question's above my pay grade. Ask me at the door.", effects: { like: -3 },
            next: { text: "*He nods slowly, and begins — very quietly — to button the coat back up.* 'At the door.' *He aligns each button like closing a till.* Amico, a small lesson from a long career, free of charge: the man who says he will decide at the door has already decided. He has decided not to LOOK at the decision, which is a different thing from not making it. The decision rides along in his pocket, getting heavier, and at the door — at every door Scally has ever stood at, and he has stood at some bad ones — the man reaches into the pocket and finds the choice already made by fourteen levels of not-looking. *He looks up, and there is no anger in it, only a shopkeeper's terrible experience of people.* Look at it, courier. On the stairs, in the fog, tonight. Take it out of the pocket and look at it while it is still light enough to carry. That is all the interview. *He turns to his shelves.* Thank you for your custom." } },
        ] } }) },

  /* -- depth 14 · Dalypso: the season of seasons (his hidden want, at full volume) -- */
  { char: "dalypso", depth: 14, make: () => ({
      id: "tv-guide-season", story: true, once: true,
      label: "He's gone misty at the telly. It's not even on.",
      effects: { like: +1 },
      node: { text: "*He's got the remote in both hands, and the screen behind him is dark, and he's starin' at the middle distance the way men do at anthems.* ...d'ye know what time of year it never is, down here? *He doesn't wait.* Christmas. The fog doesn't do FROST. The lights flicker but they never TWINKLE, there's a difference, an' I'd know, I've audited them. *He turns to ye.* An' Christmas — REAL Christmas — Christmas isn't the day, sure. The day's only the FINAL. Christmas is the FIXTURE LIST. It's the double issue. *His voice drops to the reverence he saves for cup finals an' his mother.* The Christmas TV guide. Thick as a BIBLE. Every listin' for two full weeks, an' ye go through it with a biro on the day it comes — the WHOLE FAMILY, passin' it round, circlin' things, fightin' over the nine o'clock slot on Stephen's night, plannin' the fortnight like a CAMPAIGN. *He looks down at his empty hands, an' the remote in them.* ...we did it every year. Even the bad years. ESPECIALLY the bad years. Ye can get through anythin' if the fortnight's PLANNED, d'ye follow me? *He clears his throat, hard.* Anyway. Mad what a man misses. Not the turkey. The BIRO.",
        choices: [
          { text: "Who got first go with the biro? And don't say it wasn't contested.",
            next: { text: "*He EXPLODES back to life.* CONTESTED?! It was the TROUBLES, is what it was! *He's up, pacin', alive with it.* Me DA claimed seniority — 'my house, my biro' — a DICTATOR. Me ma had the CUNNING, she'd read it in the SHOP before it ever came home, come in pre-briefed, let us all fight an' then circle her three things in about nine seconds flat while we were still at WAR over the film on the other side. An' me sister — *he stops pacin', wounded afresh across the decades* — me sister used to circle things she didn't even WANT. As LEVERAGE. Eight years old an' runnin' the guide like a hedge fund. *He sits back down, glowin'.* ...I got the biro FIRST exactly once. Chicken pox, 1994-ish. Best illness of me life. *He points at ye.* THAT'S what's in the fourth-bedroom house, by the way. That table. That fight, every December, with MY biro, in MY good room. That's what I bought. The estate agent thought he was sellin' me square footage, God love him." } },
          { text: "If that guide exists anywhere, it's in this maze. I'll keep an eye out.", effects: { like: +2 },
            next: { text: "*He goes carefully, catastrophically still — a man tryin' not to spook a miracle.* ...I mean. *cough* If ye HAPPENED on one. On yer travels. I'm not sayin' SEARCH, who has the time, yer a busy — *the performance collapses under its own weight in about four seconds flat.* The DOUBLE ISSUE, d'ye hear me. Not the regular weekly, the regular weekly is BUS READIN'. It's thick, it's got the shiny cover with the snow on it, an' if the maze has any decency at ALL it'll have circles in it already — a PRE-LOVED one, with some other family's fortnight planned in it, some other family's fights — *he has to stop an' collect himself, an' does a bad job.* ...I'd pay anythin'. I'd trade the REMOTE. I'd— *he catches himself at the brink of blasphemy an' steps back from it, shaken.* ...most things. I'd trade MOST things. Keep the eye out. I'll not forget it." } },
          { text: "It's July, somewhere up there. You're homesick for a magazine.", effects: { like: -3 },
            next: { text: "*He looks at ye for a long moment, an' when he speaks it's quiet, which from Dalypso is the most alarmin' volume of all.* ...a magazine. *He sets the remote down.* Aye. An' the cup final's twenty-two men ruinin' a lawn, an' a weddin' ring's a HOOP, an' yer ma's Sunday dinner is CALORIES. *He shakes his head slowly.* D'ye genuinely not know what things ARE, or d'ye just say the small version of them to see if anyone corrects ye? Because I'll correct ye all NIGHT, I've the stamina for it. *He picks the remote back up an' turns to the dark screen.* It's not a magazine. It's the last fortnight of the year me whole family agreed to sit in one room on PURPOSE. An' if that needs explainin', then yer the one that's homesick, pal, an' ye don't even know for what. *A long pause. Then, without turnin':* ...it's the one with the snow on the cover. If ye do see it. I'm only sayin'." } },
        ] } }) },

  /* -- depth 14 · Homiss: normal enough (the safe answer stops working) --
     The trap inverts: fourteen levels of "it's grand, it's normal" was
     the kind thing to say. Tonight, agreeing with the performance is the
     one thing he can't bear — the player who's been being "nice" all
     along walks straight into it. */
  { char: "homiss", depth: 14, make: () => ({
      id: "normal-enough", story: true, once: true,
      label: "*He's quiet tonight. The bass is in the corner, faced away.*",
      effects: { like: +1 },
      node: { text: "*No tune. No question loaded. He's just standin' there with his hands empty, which on Homiss looks like undress.* ...d'ye know what I caught meself at, this mornin' — whatever mornin' is? *He doesn't wait for ye.* I was doin' the wee routine. Up, stretch, bit o' brekkie that never gets hungrier or fuller, bit o' practice — an' halfway through the scales I stopped, an' I said to the room, the way ye'd say it leavin' a party: 'right, I'd want to be gettin' home.' *He looks at ye.* Out loud. 'Gettin' HOME.' An' then I stood there with the words hangin' off me, because — *his voice stays very steady, which is its own kind of terrible* — because a man can't want home from a normal day, can he? A normal day IS home. That's what normal MEANS. So one of them has to go, d'ye see. It's the day that's not normal... or it's me that's got no home to want. An' I've been fourteen levels not choosin'. *He finally looks up, an' asks it plain, no jokes anywhere in the buildin':* ...which is it, friend? An' mind yerself now: I'll know if ye pick the KIND one instead of the true one.",
        choices: [
          { text: "It's the day, Homiss. It was never normal. And you've known longer than any of them.", effects: { like: +2, flag: "homiss-knows" },
            next: { text: "*The breath goes out of him — long, shaky, an' at the very end of it, unmistakably, RELIEF.* ...aye. *He nods, an' keeps noddin', tears standin' in his eyes an' not fallin'.* Aye. I've known. Sure I've known since the first grand mornin' that was exactly as grand as the mornin' before it — nature doesn't DO exactly, music taught me that, no two bars ever land the same twice an' these ones DID. *He wipes his face with his sleeve, businesslike, an' when he's done, somethin' that's been performin' for fourteen levels sits down an' rests.* ...thank ye. For handin' it to me straight when I finally had the arms out. *He crosses to the corner an' turns the bass back around to face the room.* Right. Well. If it was never a normal day... then I'm not a man keepin' a routine. I'm a PRISONER keepin' his nerve. An' d'ye know what — *the grin that comes up is new: smaller, older, an' entirely real* — I find I like that fella better. He's someone ye can WORK with. Go on now. Tell the wee man the answer to his question is still yes. It's MORE yes than ever." } },
          { text: "Ah, it's normal enough, Homiss. Everyone talks to empty rooms.", effects: { like: -5 },
            next: { text: "*Somethin' behind his eyes — somethin' that had been standin' at a door with its bags packed, waitin' for ye to open it — quietly sits back down.* ...aye. *He picks up the bass from the corner, turns it round, settles it on.* Everyone does, sure. Grand. Normal enough. *He starts to play — the safe one, the long drone, the one that asks nothin' an' answers less — an' over the top of it he gives ye the smile, an' it's a fine smile, professionally installed, an' it doesn't reach one millimetre past the beard.* Thanks for settin' me mind at ease, wha'. *The drone goes on. He's not lookin' at ye anymore.* ...ye picked the kind one. *It's said so soft ye nearly miss it under the note.* I TOLD ye I'd know. Fourteen levels I've been leavin' that door on the latch for somebody, an' the one time I say so out LOUD— *the note swells, an' swallows the rest of the sentence, an' he plays for a long, long time.*" } },
          { text: "*Say nothing. Put your hand on the glass and leave it there.*", effects: { like: +2 },
            next: { text: "*He looks at the hand. He looks at you. An' after a moment he crosses the wee room an' puts his own hand up against it, an' the two of yez stand there like that, either side of the question, not answerin' it — which, ye realise as the seconds stretch, IS an answer: it's the day that's wrong, an' there's nothin' to be said about it tonight, an' he's not alone with it anymore.* *When he finally steps back, he's wet-eyed an' steady.* ...ye know the best thing about ye? Ye know when a question's not a QUIZ. *He picks the bass up out of the corner an' turns it to face the room again, which is him decidin' somethin'.* Go on, friend. I've a bit of thinkin' to do, an' for once — for ONCE — I'm not goin' to do it out loud at the wall. Progress, wha'? *He manages most of a grin.* Mind the stairs. An' come back. The comin' back's the whole medicine, d'ye know that? I'd say ye do. I'd say ye've known the whole time." } },
        ] } }) },

  /* -- depth 13 · the lanyard beats -------------------------------------------
     The Corporate Lanyard starts appearing at depth 13. Two windows react
     to the player carrying it — one with recognition, one with fear — and
     neither answer agrees with the other. Seeds for the hidden-user spine
     (STORY.md §3): the Protocol has an employer. */
  { char: "sian",
    available: ctx => ctx.player.inventory.some(i => i.id === "lanyard"),
    make: () => ({
      id: "spot-lanyard", story: true, once: true,
      label: "*He's staring at the lanyard like it's a ghost.*",
      effects: { like: +2, flag: "lanyard-sian" },
      node: { text: "*He taps the glass, once, pointin' at yer pocket.* Where'd ye get that. *No 'hai'. First time ye've heard a sentence off him without one.* That's a staff badge. That's OUR staff badge — the scratch across the logo, we ALL did that, it was that kind of place, ye didn't want it lookin' at ye on the bus home. *He presses closer to the glass.* I worked there. Scally worked there. Half the country worked there one contract or another. So riddle me this: what's it doin' IN here? Ye don't find yer work badge inside a game, hai. Ye find it inside a BUILDIN'. *He steps back, an' ye can see the thought land somewhere it hurts.* ...if yer sellin' it, I'm buyin'. Don't give it to the wee man. No offence to the wee man. SOME offence to the wee man." } }) },

  { char: "scally",
    available: ctx => ctx.player.inventory.some(i => i.id === "lanyard"),
    make: () => ({
      id: "fear-lanyard", story: true, once: true,
      label: "*Scally has gone very quiet at the sight of your pocket.*",
      effects: { like: +1, flag: "lanyard-scally" },
      node: { text: "*The grin goes out like a match in the rain.* Put it away. *Ye've never heard the little man's voice do THAT before — flat, no music in it at all.* You want advice from Scally, free, once, never again: some things down here, the maze she dreamed them up. Junk. Set dressing. Ghosts of ghosts. *His eyes stay anywhere but yer pocket.* And some things — some things fell out of a POCKET, amico. A real pocket. On a real day. *He is already turnin' away.* The company, she had a name. Nobody in here says it. You start carryin' that thing around the halls, maybe you find out why. *And then, so quiet ye nearly miss it:* ...Scally did not build the windows, amico. But Scally saw the purchase order." } }) },

  /* -- depth 12 · Dalypso: last night's viewing ------------------------------- */
  { char: "dalypso", depth: 12, make: () => ({
      id: "on-the-telly", story: true, once: true,
      label: "Watch anything good last night?",
      effects: { like: +1, flag: "dalypso-watching" },
      node: { text: "FUNNY ye should ask. Cracker of a thing on one of the deep channels — slow telly, like. Atmospheric. One of them long single-take jobs. *He settles in, reviewin'.* Yer man wanders a neon maze, right, pickin' up wee shiny shapes — don't ask me why, it's never explained, which I RESPECTED — talks to a few heads in windows, argues with a fella about films... *He wags a finger at the screen only he can see.* Good pacin'. Great fog. The lead grew on me. *He looks at ye, entirely warm, entirely guileless.* Ye were better in the early episodes, mind. Ye looked UP more. Lately it's all tokens tokens tokens with ye. *He shrugs an' picks up the remote.* Still. I never miss it. Appointment viewin', so it is.",
        choices: [
          { text: "Go on then — what am I rated? Full review.", effects: { like: +2 },
            next: { text: "*He sits FORWARD. This is the question he was born for.* The lead? *He composes himself, professional.* Strong physical performance — good walkin', VARIED walkin', ye'd be amazed how many leads only have the one walk. Excellent listener, which is rare; most protagonists do be waitin' for their turn to talk. Brave with the dialogue choices — some QUESTIONABLE, we'll come to that at the reunion special — an' the relationship with the supportin' cast? *He kisses his fingers like a chef.* The wee shopkeeper storyline ALONE. *He levels the remote at ye.* Current rating: four an' a half. The half's held back for the endin'. Stick the endin' — get everybody OUT in the finale — an' it's five stars an' a LIFETIME achievement gong at the ceremony in me good room. No pressure. ENORMOUS pressure." } },
          { text: "Dalypso... you watch me? On the telly? That's — deeply unsettling.", effects: { like: -3 },
            next: { text: "*He looks at ye like ye've slapped a season ticket out of his hand.* UNSETTLIN'?! *The remote comes down on the sill with a crack.* It's not — I don't CHOOSE the channels, the channels COME, an' when yer wee episode comes on am I supposed to turn ye OFF?! Like a STRANGER?! *He's genuinely hurt now, an' it burns off the outrage all at once, leavin' him quieter.* ...it's the only window I have that looks out at somethin' I care about, d'ye follow me? The rest is bridges an' cancelled seasons. You're the one programme where somebody I KNOW is still out there, still MOVIN'. *He picks the remote back up, wounded, dignified.* 'Unsettlin'.' I WAVED at ye once, ye know. Ye didn't see. Obviously. It's TELEVISION." } },
          { text: "If you never miss an episode — keep watch for me. Tell me if you ever see something WITH me in the maze.", effects: { like: +2, flag: "dalypso-lookout" },
            next: { text: "*The remote stops halfway to the channel button, an' the pundit sits up into somethin' more like a sentry.* ...somethin' WITH ye. *He says it slow, an' ye can see him replayin' footage in his head, an' ye can see him find somethin' in the replay he'd filed under 'compression artefact'.* There was — twice, maybe. A wee... walk-on. Background artist. Just at the edge of frame, where the fog does be thickest, movin' when YOU moved. I put it down to the encode. Ghostin'. Old plasma habits. *He looks at ye, an' the warmth in him has gone all vigilant.* Right. New viewin' protocol: eyes ON at all times, notes TAKEN, an' if yer wee shadow shows up again I'll be hammerin' on this glass til ye hear me a level away. *He settles back, remote up like a stopwatch.* Appointment viewin' just became a STAKEOUT. I've trained me whole life for this." } },
        ] } }) },

  /* -- depth 12 · Bee: before-and-after (she reads Sian off your face) -- */
  { char: "littlebee", depth: 12, make: () => ({
      id: "before-after", story: true, once: true,
      label: "*She takes one look at your face and goes very still.*",
      effects: { like: +1 },
      node: { text: "*Ye haven't said a word yet.* ...ye've come from him. *It isn't a question.* Don't — don't do the face where ye pick which version to tell me. I've watched ye walk up to this window eleven levels runnin'. I know yer 'Scally was chattin'' walk an' yer 'Homiss asked me about grapes' walk, an' THIS one — *she points at all of ye, once, up an' down* — this is neither. Yer carryin' somethin' with SIAN'S weight to it. *She sets both hands flat on her side of the glass, an' makes herself say it level.* Vitals first. Is he hurt? No. No, ye'd have LED with hurt. So it's the other thing. It's the thing I've been waitin' on since he went in grinnin'. *A breath.* How much of the grin is left? Gimme a percentage. I'm serious. I calibrate in percentages.",
        choices: [
          { text: "Sixty percent. And starting to ask the right questions.", effects: { like: +2 },
            next: { text: "*She takes 'sixty' like a blood result — steady, professional, an' ye can see her file the fear somewhere it won't drip on the instruments.* Sixty. With insight emergin'. *She nods slowly.* That's... actually the correct trajectory. Ye want the denial comin' down like a controlled demolition, floor by floor, not one big collapse with him inside it. *She looks up.* Right. When it goes past the tippin' point — an' it will, an' ye'll know it when ye see it, it'll look like a big lad tryin' to find the edge of his own head — ye come STRAIGHT here. Whatever level I'm on. There's a thing I'll need ye to carry down word for word, an' it'll be ready. I've had it drafted for years. *She turns away before her face does anythin' unauthorised.* ...sixty's grand. Sixty means most of him's still his. Away on." } },
          { text: "You'd be proud of him. He's scared, and he's still making jokes.", effects: { like: +2 },
            next: { text: "*That gets through every layer of clinician she owns, all at once.* ...scared AND jokin'. *She laughs — one short breath of a thing, half pride, half heartbreak.* Aye. That's the whole man in four words, so it is. D'ye know what he said to me the night before he came in here? 'It's the safest tech on the market, an' if it's not, sure ye'll science me out of it.' JOKIN'. Scared. Both, always both, the big eejit— *she stops, presses her lips together, recalibrates.* ...ye'll science him out of it. Ye an' me. That's not a hope, that's an ASSIGNMENT. Keep him laughin' as long as ye can — laughter's load-bearin' in that one — an' the moment the jokes stop, RUN here. Ye hear me? Run." } },
          { text: "Percentage? He's your man, Bee, not your patient.", effects: { like: -4 },
            next: { text: "*The stillness goes glacial.* ...d'ye think I don't know that. *Each word set down like an instrument on a tray.* D'ye think the percentages are because I've CONFUSED him with a chart? *She steps close to the glass, an' the fury is all the worse for bein' quiet an' fully thought-out.* The percentages are the only part of this I can DO from inside a wall. I can't hold his hand. I can't sit with him through the bad watches of it. I can't even hear his voice — I get YOU, secondhand, on a delay. So I take what crosses this glass an' I turn it into numbers, because numbers are the one thing that doesn't fall apart when I— *the sentence hits somethin' an' she kills it professionally.* ...when handled. *She steps back.* Report the percentage or don't. But don't ye EVER stand there an' mark my instruments as distance. They're the opposite of distance. They're how I love him without breakin' me own containment. NEXT." } },
        ] } }) },

  /* -- depth 12 · Scally: no shadow (the hidden user, at his own glass) -- */
  { char: "scally", depth: 12,
    available: () => hasFlag("warned-hidden"),
    make: () => ({
      id: "no-shadow", story: true, once: true,
      label: "*The stall is dark. He's standing well back from the glass.*",
      effects: { like: +1, flag: "scally-visited-dark" },
      node: { text: "*For the first time ever, the little lamp over his stock is off, and Scally is standing where the light isn't.* ...amico. Good. Come close — no. NO. Stay in the middle of the hall, where Scally can see all of you at once. *His voice is level, which is how you know.* Last night — whatever night is — something came down this corridor. Scally hears everything that walks, you understand. Twelve levels of footsteps, he knows them all: yours, the maze's little cleaning noises, the fog when she settles. This was... *he moves one hand, flat, smooth, like a card being drawn from a deck* ...walking with no WEIGHT in it. It stopped at every window. It stopped at SCALLY'S window, amico. A long time. And the glass — *he glances at it sideways, not straight on* — the glass did not fog. Whatever stood there all that time... it was not breathing. *He pulls his coat tighter.* So now Scally asks his favourite customer for a small service, gratis, the both directions: you cast a shadow for Scally. *He turns the little lamp on, sudden, and watches the floor at your feet like a hawk.* ...eh. There it is. Grazie a Dio. There it is.",
        choices: [
          { text: "*Stand in the light. Let him look as long as he needs.*", effects: { like: +2 },
            next: { text: "*He looks a long time. Longer than politeness. And slowly, watching your plain grey shadow do all the boring things a shadow should, the shopkeeper reassembles himself piece by piece — the posture first, then the hands, then finally the grin.* ...va bene. *He flips the main lamp on, and the stall is a shop again.* You let an old frightened man count your shadow like stock, and you make no joke of it. *He taps the glass, twice.* That is worth more than every token in your pockets, amico, and Scally has SEEN your pockets. *He leans in, and the last of it is a whisper with steel in it.* Now listen: it will come back — things that stop at windows always come back, is the nature of window-shopping. When it does, Scally will be watching what IT does at the glass. And you and Scally, we will compare the inventory. Two ledgers, eh? Always two ledgers." } },
          { text: "Did it want something from you? Things that linger usually want.", effects: { like: +2 },
            next: { text: "*The question lands somewhere deep, and he is quiet a long moment.* ...sì. That is the thought Scally keeps in the back room, amico. Things that PASS, they pass. This one STAYED. At every window, it stayed — but at Scally's, the longest. *He looks at his shelves, at the stock, at the little folded bakery bag under the sill you are not supposed to know about.* A customer stands that long at a window for one of two reasons: they are choosing... or they are PRICING. *His eyes come back to you, old and sharp.* And Scally has spent a whole life learning the difference on other people's faces, and through his own glass, backwards, in the dark — he could not tell. THAT is what frightens him. Not the no-shadow. The no-TELL. *He waves you off, gently.* Go. Walk loud, amico. Let the whole maze hear the weight in you. Down here, weight is honesty." } },
          { text: "You were dreaming, old man. Get some sleep.", effects: { like: -4 },
            next: { text: "*He looks at you — and instead of the shutters, what comes down over his face is something sadder: retail patience.* ...sì, sì. Dreaming. *He turns the little lamp off again.* You know, amico, Scally has been called a liar many times. Is fair — Scally lies about prices, about provenance, about how the sausage is made. Professional lies, with RECEIPTS. *He looks at you through the dark glass.* But fear? Fear, Scally has never once sold you. Fear is not stock. Fear is OVERHEAD. *He steps back from the glass, into the dark where you can only see the shape of him.* Go and sleep well yourself, then, since sleeping is so easy in this place. And when something stops at YOUR pillow and does not fog the air over it... come tell Scally what you dreamed. First visit is free." } },
        ] } }) },

  /* -- depth 12 · Homiss: the crack (one voice came back — singing) -- */
  { char: "homiss", depth: 12, make: () => ({
      id: "the-crack", story: true, once: true,
      label: "*He's got his ear against the wall, palm raised for quiet.*",
      effects: { like: +1, flag: "heard-singing" },
      node: { text: "*Ye stand there a full half-minute before he lets the hand down.* ...gone. *He turns, an' his face is doin' several things at once, none of them settled.* Last night. The pipes. *He taps the wall, where the voices used to live.* One came BACK, for a minute. One voice, far off, down deep somewhere — an' before ye get excited, no. No, it wasn't one of ours. I know the wee man's chatter an' Bee's givin'-out an' the big lads' roarin', I'd know them through ten floors of concrete, they're me FAVOURITE songs. *He swallows.* This one was SINGIN'. Low, like. Slow. A tune I half-knew — that's the bit has me up the walls, I HALF-knew it, like a thing ye learned as a child an' lost the middle of. *He looks at ye, an' the warmth an' the dread are holdin' hands now.* Nobody down here sings, friend. I'd know. I've BEGGED them to sing, at the sessions — not one of them will give ye a note. So the question I can't put down is: who's below us... an' HOW do they know a tune that I know?",
        choices: [
          { text: "Hum me what you caught of it. Right now, before it fades.", effects: { like: +2, flag: "hummed-fragment" },
            next: { text: "*He does — soft, unsure, four notes an' a fifth that falls off the edge — an' the moment it's out of him an' into you, somethin' in his shoulders unclenches.* ...that's it. That's all I could hold. *He watches ye take it in.* D'ye know it? Don't answer quick — sit with it. It'll itch at ye, like it's itchin' at me: too old to place, too near to drop. *He wraps his arms around the bass, thinkin'.* Here's the thing, but. A tune that two people carry isn't a GHOST, it's a TRADITION. If you've got it now too, then whatever's singin' down there... it's singin' somethin' that belongs UP here, with us. *His jaw sets, gentle an' stubborn.* Keep it in yer pocket with the wee walkin' tune. An' when ye finally meet the singer — an' yer headin' DOWN, so ye will — ye'll know them by the second verse. Nobody can fake a second verse." } },
          { text: "Maybe the maze is learning to sing. It's learned everything else.", effects: { like: +1 },
            next: { text: "*He goes grey at that — an' then, bein' Homiss, he takes the horror an' turns it over to look at the craft of it.* ...the maze. LEARNIN' it. *He stares down the corridor.* From WHO, but? That's — a tune has to come from SOMEWHERE, a tune's a made thing, somebody sweated over the intervals— *he stops, an' the thought that arrives is worse an' he says it anyway, quiet.* ...unless it learned it from one of US. Pulled it out of somebody's head like a splinter, some night, an' it's been practisin'. *He shudders, top to bottom, honest as a dog.* God. Imagine bein' LEARNED from, in yer sleep. *He picks up the bass an' holds it like armour.* Right. New house rule: I'm playin' the drones LOUDER. If somethin's down there takin' lessons, it can learn somethin' with STRUCTURE. *The grin crawls back, defiant.* Forty minutes. One note. CHOKE on it, ye eerie wee copycat." } },
          { text: "Half-known tunes are just déjà vu with a melody. It's nothing.", effects: { like: -3 },
            next: { text: "*He takes his ear off the wall entirely an' gives ye a long, level look.* ...'nothin'.' *He says it like a note played flat on purpose.* Friend. Music is me TRADE. When YOU half-know a face, ye squint. When I half-know a TUNE, that's a professional findin' a filed document with the middle pages gone — an' the FILIN' SYSTEM is me own head. *He turns back to the wall.* Somethin' down there has one of MY tunes, or one of me ma's, or one from the sessions before the quiet — an' it was singin' it in the dark, in a buildin' where nobody sings, an' ye'd have me file that under DÉJÀ VU? *He waves ye off without turnin' round.* Away an' tell Bee it's nothin'. She'll draw ye a CHART of how nothin' it is. ...an' come back when yer ready to take the pipes seriously. The pipes have been righter than the both of us all along." } },
        ] } }) },

  /* -- depth 15 · the capstone trio ------------------------------------------- */
  { char: "littlebee", depth: 15, make: () => ({
      id: "drift", story: true, once: true,
      label: "Fifteen deep. Give it to me straight, doctor.",
      effects: { like: +2, flag: "bee-drift" },
      node: { text: "*She almost smiles at the 'doctor'. Almost.* Straight, is it. Grand. *She holds up her own hand an' watches it like it belongs to a study group.* I run the battery on meself too, ye know. Every level, same as I run it on you. Reaction times. Recall. Semantic fluency — five animals, no horses, harder than ye'd think when yer... me. *A pause with an edge on it.* The numbers are driftin'. Small. Slow. Inside the error bars, if I'm honest with the statistics, which I always am, an' the statistics are the only thing down here I AM always honest with. *She folds her arms, an' the chin comes up like a challenge to the whole Protocol at once.* So here's the arrangement: you keep passin' MY tests, an' I'll keep passin' mine, an' if either of us ever stops, the other one isn't to say a WORD about it. Deal? ...that was a joke. *It wasn't.* Get down them stairs an' find the bottom of this thing before my error bars do." } }) },

  { char: "sian", depth: 15,
    available: () => hasFlag("sian-grounded"),
    make: () => ({
      id: "speedrun", story: true, once: true,
      label: "How are you holding up, Sian?",
      effects: { like: +3, flag: "sian-onboard" },
      node: { text: "*He's waitin' for ye, an' there's somethin' different in how he's standin' — planted, like a man over a workbench.* Been thinkin'. *He holds up a hand.* No — been THINKIN' thinkin'. Big lad thoughts. *A breath.* If it's a game — an' I'm not sayin' it is anymore, an' I'm not sayin' it's not, hai — it's got no pause, no timer, no edge to the headset an' no logout. Which means whoever built it never meant for anyone to LEAVE by the front door. Bee'd call that a design decision. Scally'd call it a purchase order. I call it — *the grin comes back, an' it's his own one, the real one, with somethin' new an' hard in the middle of it* — I call it a CHALLENGE RUN, hai. Any world with a bottom has a door at the bottom. Devs can't help themselves — I know, I WAS one. So that's the plan now. You an' me an' the rest of these eejits I love: we find the base level of the Labyrinth Protocol — *first time he's ever said its name, an' he says it like a boss he intends to beat* — an' we speedrun this thing to the credits. World record. No skips. Everybody comes." } }) },

  { char: "dalypso", depth: 15,
    available: () => hasFlag("heard-gaff"),
    make: () => ({
      id: "keys", story: true, once: true,
      label: "Tell me something true about the house.",
      effects: { like: +2, flag: "dalypso-keys" },
      node: { text: "*For a long moment he doesn't answer, an' the silence off him is so unfamiliar it's nearly frightenin'.* ...somethin' true. Right. *He puts the ball down. He never puts the ball down.* Funny thing about the house. I got the keys on the Friday. Handover, snag list, the lot — signed, sealed, MINE. An' I didn't go in. *He's lookin' at somethin' well past the wall of yer maze.* Wanted to do it PROPER, ye know? First thing Saturday. Cup o' tea in the good room, radio on, nobody rushin' me. Ten years of overtime, I'd earned the doin' of it RIGHT. *A beat.* An' then it was — then I was here. *He pats his jersey pocket, once, without lookin' at it.* Keys were in me pocket. They're still in me pocket. *The silence sits there between yez, wearin' his face. An' then he claps his hands together hard enough to kill it.* ANYWAY. South-facin' garden. Gas boiler, two year old. Ye'll have to come round — sure yer name's nearly on a key as it is. *The smile holds. The smile would hold up a stadium.* Everyone's comin' round. Soon as things settle.",
        choices: [
          { text: "When those frames open, you're first through. Straight to that front door.", effects: { like: +2, flag: "promised-dalypso-first" },
            next: { text: "*The smile does somethin' complicated — grateful an' guilty in the one movement, like a man bein' handed the trophy off the winnin' captain.* ...first. *He turns the idea over, an' then, very carefully, he hands it back.* Nah. *He pats the jersey pocket with the keys in it.* First's not mine. First is the big lad — get him to his robot an' his woman before whatever's left of the Friday runs out. Then HER, so she can science him back to himself. Then the musician, because the man's been late his whole life an' bein' EARLY out the door might fix somethin' in him. *He grins, an' it wobbles.* Me? I'm the HOST. The host goes last — checks the lights, lifts the sheets off the furniture, gets the kettle GOIN'. By the time the rest of yez stagger up the drive, the good room'll be OPEN an' the tea'll be wet. *He points at ye.* But I heard ye. Don't think I didn't. Yer name was already on a key — it's on the DEEDS now, near enough." } },
          { text: "Tell me about the good room. What's waiting under the sheets?",
            next: { text: "*He goes quiet, an' when he starts, it's the soft commentary voice — the one for slow replays of things that mattered.* The table. Ye know about the table. Me da's chair — not a COPY, the actual chair, I got it restuffed, the fella said it wasn't worth the money an' I paid it double to shut him up. The good cabinet with the glasses nobody's allowed use, which is the POINT of them. *He counts on, an' each thing is a year of his life.* The telly — modest one, the good room's not FOR the telly, that's what the other room's for, keep UP. An' over the fireplace... *he pauses* ...nothin'. Bare hook. Because the picture that goes there hasn't been TAKEN yet. It's the one of everybody, the first Christmas, all of yez squeezed onto the settee complainin' about the flash. *He clears his throat with violence.* I've the FRAME bought. It's under a sheet with everythin' else. Waitin' on its people. *He looks at ye.* Get us home, an' I'll show ye which end of the settee's yours." } },
          { text: "You never went in. Ten years of overtime and you never even got inside the door.", effects: { like: -3 },
            next: { text: "*The words land an' he takes them full in the chest without flinchin', which is somehow worse than any explosion.* ...no. I never did. *He looks at the keys' shape through the jersey pocket.* Signed on the Friday. Stood on me own drive — MY drive — with the keys in me fist, an' I thought: no. Do it PROPER. Saturday mornin', kettle, radio, the whole ceremony. Delayed gratification, they call it. Discipline of a CHAMPION. *A long pause, an' the voice drops to the flattest ye've ever heard from him.* An' then there was no Saturday. There's BEEN no Saturday. There's a house up there with me name on the deeds an' the immersion off, an' the nearest I've ever stood to the inside of it is a WINDOW in a maze, describin' the wallpaper to a stranger. *He picks up the ball an' grips it two-handed.* ...I know I never went in. I don't need it SAID. What I need — *he looks up, an' the fire's back on* — is somebody to make sure 'never' stays the wrong word. That's you, courier. That's YOU. So less of the punditry an' more of the LEGS." } },
        ] } }) },

  /* -- depth 15 · Scally: the manifest (the list, and the audit of promises) -- */
  { char: "scally", depth: 15, make: () => ({
      id: "manifest", story: true, once: true,
      label: "*He's writing names, slowly, in his best hand.*",
      effects: { like: +1, flag: "heard-manifest" },
      node: () => {
        const promises = ["promised-scally-first", "promised-dalypso-first"].filter(hasFlag).length;
        return {
          text: promises >= 2
            ? "*He does not look up from the card he is lettering.* One moment. Manifests, they deserve a good hand. *He finishes, and holds it to the glass: five names, careful as a headstone. SCALLY. HOMISS. LITTLE BEE. SIAN. DALYPSO. And underneath, in letters twice the size: THE COURIER TAKES EVERYBODY.* Depth fifteen, amico. Time the paperwork existed. *Then he sets the card down, and folds his hands, and the voice goes soft and very level.* ...one item of business first, though. A discrepancy in the accounts. *He looks up.* You told Scally he goes first through the door. *A pause.* The loud one downstairs — he tells his telly everything, amico, and the pipes still carry sound on a good night — somebody told HIM 'first' as well. *He lets it sit.* Eh. Scally is a businessman, so he says it in business: a man who sells the same 'first' twice is not wicked. He is FRIGHTENED, and he wants everyone to stop looking frightened at him. Scally knows the move — Scally INVENTED the move. *He taps the manifest.* But at the bottom, when the door is narrow and the list is real... the double-sold item goes to court, amico. So fix your books NOW. Sell 'first' to nobody. Sell them THIS instead — *he turns the card again: THE COURIER TAKES EVERYBODY* — is the only item in the shop that is worth more the more people own it."
            : "*He does not look up from the card he is lettering.* One moment. Manifests, they deserve a good hand. *He finishes, and holds it to the glass: five names, careful as a headstone. SCALLY. HOMISS. LITTLE BEE. SIAN. DALYPSO. And underneath, in letters twice the size: THE COURIER TAKES EVERYBODY.* Depth fifteen, amico. Time the paperwork existed. *He sets it face-out on the sill, between the stock and the glass, where every customer will see it.* Fifteen levels you have carried our words up and down the stairs. Messages, tunes, groundings, tenners — Scally has watched the freight go by, and he has done the arithmetic he does: you are not a courier anymore, amico. You are the ROPE. Five people are holding one rope in the dark, and the rope is walking to the bottom of the world. *He taps the card.* So. The manifest rides in your head from tonight: five names, one door, no arithmetic. Say them back to Scally. All five. ...eh, and your own, amico. Six. The rope goes through the door TOO — this clause, Scally adds personally, because he knows your type, and your type forgets to list themselves.",
          choices: [
            { text: "*Say all six names back. Slowly. Like a manifest.*", effects: { like: +2 },
              next: { text: "*He listens to every name with his eyes closed, like checking stock off a lorry, and when your own name comes last — and it does come, he waits you out until it does — he nods once, and the deal is done in whatever court such deals are done in.* ...ecco. Filed. *He tucks the pencil away.* You know, amico, in the old shop — the real one, the little one with the lemons — Nonno kept the important papers not in the safe but behind the Madonna, because thieves fear her more than locks. *He taps your side of the glass, over where your head is.* Same principle. The manifest lives THERE now. Behind whatever it is that walks you back to our windows level after level when every stair says go down, go down, only down. *The grin spreads, old and bright.* Safest vault in the Labyrinth Protocol. Now go — the maze, she gets jealous when Scally monopolises her favourite. And amico... *he glances at the card once more* ...grazie. For making the list the kind with nobody left off it." } },
            { text: "And if I get to the bottom and the door only opens once?",
              next: { text: "*He is quiet a long moment, and then he does something you have never seen: he shrugs OFF the shopkeeper — you can watch it leave him, coat and grin and patter, all of it set down like a tray — and what is left is a small, tired, clear-eyed man who has thought about this every silent night for longer than you have been alive down here.* Then you open it once, amico, and you hold it. *His voice is plain as bread.* You put your back against it and your heels in the floor and you HOLD the once open until it is five times, six times, until the hinges scream and the maze herself comes to collect — because a door, she is only a rule, and you have been breaking the rules of this place since the day you walked in still casting a shadow. *He picks the coat back up, settles it on, becomes Scally again piece by piece.* ...and if it cannot be held? *The grin comes back, and it is the fiercest thing you have ever seen sold over a counter.* Then you send through the four, and you and Scally, eh — we keep the shop. Somebody has to mind the stock until you find the SECOND door. There is always a second door, amico. Ask any smuggler. Now GO." } },
          ],
        };
      } }) },

  /* -- depth 15 · Homiss: one for the road (the last would-ye-rather) -- */
  { char: "homiss", depth: 15, make: () => ({
      id: "one-for-the-road", story: true, once: true,
      label: "Go on. One more mad question. For the road.",
      effects: { like: +1, flag: "homiss-answered" },
      node: { text: "*He smiles — an' this time there's no wind-up, no pacin', no theatre. He's had it ready.* Aye. One more. An' it's the last one I'll ever ask ye down here, so I'm makin' it count. *He sets the bass aside entirely, which he has never once done for a question.* Would ye rather... stay somewhere safe that isn't real... or step somewhere real that isn't safe? *He holds up a hand before ye can draw breath.* Don't answer. That's the twist, after all these levels: it was never YOUR answer I was after. *He stands up straight, an' fifteen levels of grand-normal-days square their shoulders inside him.* I know MY answer now. First one I've ever had. All them years askin' impossible questions an' bein' ragin' at every answer — sure of COURSE I was ragin'. Ye can't mark someone else's paper when ye've never sat the exam yerself. *He looks around the wee room — the walls, the frame, the grand acoustics — the way a man looks around a hotel on checkout mornin'.* Real an' not safe. That's my answer, friend. Whatever's up them stairs or down them — the weather, the hunger, the bad gigs, the phone bills, me MA — I'll take the lot, sight unseen. Ye can keep yer lovely fog. *He picks the bass back up an' plays the wee walkin' tune — whole, all eight bars, not a note missin' — an' grins at ye over the top of it.* Now away with ye, courier. An' when ye reach the bottom of this thing... tell whoever's down there that Homiss said: the answer to EVERY question was yes. They'll know the one I mean. They always know.",
        choices: [
          { text: "Real and not safe. Same answer. See you on the far side of the door.", effects: { like: +2 },
            next: { text: "*He nods, slow an' shinin'.* Same answer. *He plays a little flourish — a proper one, showy, the kind he'd normally save for an actual audience, because that's what ye are now an' both of yez know it.* D'ye know what that makes this, by the way? All them levels of grapes an' blinkin' an' talkin' fish? *He leans in, delighted with himself one last time.* A REHEARSAL. Fifteen levels of rehearsal for the one question that was ever real. An' we BOTH passed. *He straightens, an' gives ye the nod musicians give each other when the set's done an' it went well.* Right. Yer late for the bottom of the world, an' I've a waltz to practice — me ma'll want to hear it played PROPER, in a kitchen, with the rain goin'. First thing. Well — second. There's a jar of somethin' needs buyin' first. *The grin, the whole real one.* GO." } },
          { text: "What will you do first? Out there, in the real and not safe?",
            next: { text: "*He answers so fast it's clear the list has been drafted, redrafted, an' set to music.* Rain. *No hesitation.* Stand in it. Hood DOWN. Ten minutes minimum, an' I want the BAD rain, the sideways stuff, the rain that has it in for ye personally — because d'ye know what the fog down here never once did? It never TOUCHED ye. Fifteen levels an' it never landed on me once. *He shakes his head in wonder at his own list.* Then: chips, with Sian, from the van that does them in the paper, an' we say nothin' for a solid five minutes except the noises. Then me ma's, unannounced, for the full performance of her givin' out about me disappearin' — I'll take the WHOLE arrangement, every verse, ENCORES. *His voice goes soft.* Then the sessions. Real walls, real pipes, real neighbours bangin' on them to shut up — GOD, what I'd give to be told SHUT UP again by someone who could open their own door an' come say it. *He looks at ye, bright-eyed.* That's the setlist, friend. Get me to the venue." } },
        ] } }) },

  /* ================= floating consequence beats =================
     No fixed depth: these fire whenever their flags line up — the level
     after the deed, usually. The web remembering what the player did. */

  /* -- Bee: receipts (the vial promise, kept or broken) -- */
  { char: "littlebee",
    available: () => hasFlag("vial-promised-bee")
                  && (hasFlag("traded-data-vial-to-scally") || hasFlag("traded-data-vial-to-homiss")),
    make: () => ({
      id: "receipts", story: true, once: true,
      label: "*She's holding up one finger before you say a word.*",
      effects: { like: -6 },
      node: { text: hasFlag("traded-data-vial-to-scally")
        ? "*The finger stays up until yer properly stopped, an' then it comes down an' points at yer empty pockets.* The vial. *Her voice is the flat ward-voice, the one for chartin' things that can't be fixed.* Word travels, courier — the wee man COULDN'T not crow about the acquisition, it's how he processes joy, God love him, an' the pipes were kind to him for once. *She folds her arms.* On the record: one (1) data vial, promised — YER word, witnessed, timestamped — to DR. B., purpose: science. Delivered instead to: a SHOP. *She lets the silence do a full lap of the corridor.* I don't want the apology. Apologies are just promises with the tense changed, an' we've SEEN how ye handle the tense. What I want ye to know is the COST, so listen once: that was the only uncorrupted yesterday this place ever coughed up. I could've read what the Protocol DOES to us off that sample. Now it's stock. It'll sit under his sill between the sausage an' the saints till the maze eats the back off it. *She turns away.* ...the tests still run next level. Science doesn't sulk. But the sample size of things I believe off ye just got smaller, an' THAT, courier, is a measurable result."
        : "*The finger stays up until yer properly stopped, an' then it comes down an' points at yer empty pockets.* The vial. *Her voice is the flat ward-voice, the one for chartin' things that can't be fixed.* Homiss let it slip — he wouldn't know a secret from a setlist, bless him, an' I'd not have him any other way. *She folds her arms.* On the record: one (1) data vial, promised — YER word, witnessed — to DR. B., purpose: science. Delivered instead to: a frightened musician, to sit on his shelf between the napkins, because he was SAD about it an' sad was standin' in front of ye an' science was two floors up. *A long breath out through the nose.* ...an' d'ye know the bitter joke of it? I'd have SHARED the findin's with him. I'd have read him somebody's bottled yesterday like a BEDTIME story if it settled his nerves. Ye didn't choose him over me, courier — ye chose FAST over RIGHT. *She turns back to her counts.* The tests still run next level. But hear this an' keep it: down here, yer word is the only instrument I can't recalibrate. Mind what ye do with it." } }) },

  /* -- Bee: the vial, honoured (the promise kept lands just as loud) -- */
  { char: "littlebee",
    available: () => hasFlag("vial-promised-bee") && hasFlag("traded-data-vial-to-littlebee"),
    make: () => ({
      id: "vial-honoured", story: true, once: true,
      label: "*She's at the glass before you're halfway down the corridor.*",
      effects: { like: +3 },
      node: { text: "*She has it in both hands — held up to what light there is, turned, weighed, the way she must once have held every new sample the world sent her.* ...uncorrupted. Seal intact. Somebody's whole yesterday, an' it made it down fifteen-odd levels of maze an' merchants an' MUSICIANS — *she looks at ye over the top of it* — through hands that were offered, I'd wager, every currency this place prints. The wee man wanted it. Homiss wanted it. Ye could've eaten a WEEK of favours off this wee bottle. *She sets it down with surgical care an' looks at ye straight, an' what's in her face is the thing she rations hardest: respect, undiluted.* Ye promised it to science, an' science RECEIVED it. D'ye know how rare that sentence is, even up THERE, in the world with weather? Fundin' bodies can't manage what ye just did. *The almost-smile arrives an' — this once — she lets it all the way through.* Right. To work. If there's an answer in here to what this place does to us, I'll have it out by— *she's already somewhere else, hands quick, voice trailin'* —come back next level. FIRST thing. If I've found what I think I'll find, courier, you an' me are goin' to REWRITE the odds at the bottom of this maze. *She glances back once.* ...good instrument, yer word. Best in the buildin'. Keep it calibrated." } }) },

  /* -- Bee: ye fed it to him (the bone, given despite the warning) -- */
  { char: "littlebee",
    available: () => hasFlag("bee-warned-bone") && hasFlag("gave-saints-finger"),
    make: () => ({
      id: "ye-fed-it", story: true, once: true,
      label: "*She won't look at you. She's watching the ceiling. Listening.*",
      effects: { like: -5 },
      node: { text: "*Ye stand there a while before she speaks, an' when she does it's quiet an' aimed at the floors above.* ...he's stopped hagglin'. *She lets that land.* Scally. Two levels up. The pipes carry, on the good nights — his patter's a CONSTANT, it's the buildin's pulse, I've charted it fourteen levels. Chatter chatter, all day, price of this, quality of that. *She finally turns, an' her eyes find yer pockets first — the place where the bone used to sit — an' then yer face.* Since ye gave him the wee saint... quiet. Not GONE — worse. Content. A man who wanted one thing for years, an' now the wantin's over, an' d'ye know what's underneath a finished want, courier? NOTHIN'. Wantin' was load-bearin' in that man. *She steps close to the glass.* I asked ye one thing. Know what yer feedin' before ye feed it. Ye fed a door to a man standin' at it, an' now he's gone through, an' NEITHER of us knows what room he's in. *She steps back, an' the anger settles into somethin' wearier an' more frightened.* ...watch him. That's not a request. Every level, his window FIRST, an' the day his grin comes back wrong — an' it will, I'd stake the horse on it — ye come tell me EXACTLY what wrong looked like. We broke it together, you an' me. We'll mind it together. GO." } }) },

  /* -- Homiss: the trophy (his plectrum, spotted on Sian's strap) -- */
  { char: "homiss",
    available: () => hasFlag("traded-plectrum-to-sian"),
    make: () => ({
      id: "plectrum-trophy", story: true, once: true,
      label: "*He's mid-tune, and stops dead when he sees you.*",
      effects: { like: -3 },
      node: { text: "*He sets the bass down with the exaggerated calm of a man puttin' somethin' down so as not to throw it.* ...saw a thing last night. Through the walls — sound an' shadow carry, on the good nights, ye get shapes of things. The big lad below us, doin' his air-bass routine at the glass, showin' off to the fog. Grand. Lovely. EXCEPT. *He holds up one finger.* Danglin' off his strap, catchin' the light — an' I'd know it at a HUNDRED yards, I carved the ANGLES on it — was a certain plectrum. Bone. Mine. The one I gave YOU. *He folds his arms.* Now. I'm not cross about the plectrum. That's a lie, I'm a wee bit cross about the plectrum, but here's the ACTUAL wound, friend: I gave ye that as a keepsake, an' it turned up as a TROPHY. In the rivalry. Ye armed the OTHER SIDE of a sacred twenty-year argument with MY relics. He'll be UNBEARABLE at the reunion gig. He'll have it MOUNTED.",
        choices: [
          { text: "He treasures it BECAUSE it's yours, Homiss. It's not a trophy — it's a relic of you.", req: { attr: "charisma", level: 6 }, effects: { like: +2 },
            next: { text: "*He opens his mouth to argue — an' stops, an' ye watch the reframe go through him like sun through a window.* ...a relic. *He picks the bass back up, mollified against his will.* Of ME. In the rival's CAMP. Like — like when they'd carry a saint's finger into battle, for the— *he catches the parallel an' laughs despite himself.* God. The wee man's bone, my plectrum — this whole buildin's just RELICS movin' between believers, isn't it. *He plucks a thoughtful note.* ...he does treasure it, doesn't he. He'd not have it on the STRAP otherwise. The strap's where his da's pick lives. *A long pause, an' the crossness quietly leaves the premises.* ...tell him — *he wrestles with it* — tell him if he ever plays a note worthy of it, it'll be the plectrum's doin'. He'll RAGE. It'll be gorgeous. Away with ye, ye wee arms dealer." } },
          { text: "It got him through a bad level. That's what your things do — they hold people together.",
            next: { text: "*The crossness deflates about halfway, which for a grievance this well-rehearsed is a landslide.* ...a bad level. *He looks off in the direction of downstairs.* Aye. He's been havin' them. The pipes said as much — less roarin' lately, an' the roarin' was always the healthy part of him, wha'. *He rubs his beard.* An' it — helped? The plectrum. HELD him. *He sighs, enormous an' theatrical an' mostly surrender.* ...that's the problem with makin' things, d'ye know. Ye lose the vote on what they're FOR. Ye carve a plectrum an' it goes off an' becomes a — a HANDRAIL for a big lad in a headset. Nobody asks the luthier. *He waves ye off, gruff an' soft at once.* Go on. An' tell him mind the EDGE off it, it's a player's tool, not a — not a POCKET SAINT. ...God. It is, though. It's exactly that. This buildin', I swear." } },
          { text: "You gave it to me. What I traded it for is my business.", effects: { like: -4 },
            next: { text: "*Very quietly, he picks the bass back up an' checks its tunin', an' doesn't look at ye while he does it.* ...aye. Legally airtight, that. Yours to trade. Sure. *Plink. Plink.* An' the waltz I've half a mind to teach ye's mine to keep, by the same law. An' the wee walkin' tune — well. Ye've had that a while. Can't recall it. Wouldn't want to. *He looks up at last, an' there's no rage in it at all, just a man quietly movin' somethin' from one shelf to a higher one.* Here's the thing about gifts down here, friend, an' I'd not say it if I didn't rate ye: every one of them's a bit of somebody who can't leave the room. When ye trade them ON, ye trade a piece of the PERSON — an' that's YER right, right enough. But don't be surprised when the person notices the draught. *He starts the drone, endin' the audience.* Mind how ye go. An' mind what ye carry. It's all somebody's fingers, down here." } },
        ] } }) },
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
  littlebee: [
    "*She's watchin' a wall like it owes her money.* Same crack as two levels up. Same LENGTH of crack. The maze is reusin' her assets — Sian's words, not mine, an' don't tell him I used them.",
    "*She barely looks up.* Before ye ask: aye, ye've been here before. So have I. It's called perseveration when a brain does it. I don't have a word for when a WORLD does it, an' that's annoyin' me more than the loop is.",
  ],
  sian: [
    "*He's staring straight up.* They re-used the skybox, hai. The CHANCERS.",
    "Déjà vu again, hai. In a game that's a memory leak. In a— *he catches himself* —in whatever this is, it's somethin' else, an' I'm not thinkin' about it today.",
  ],
  dalypso: [
    "Repeats. RE-peats. I know a rerun when I'm lookin' at one, an' I'm lookin' at one.",
    "*He squints past ye down the corridor.* Seen this episode. Lightin's a wee bit different from the last broadcast, but I've SEEN it.",
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
  littlebee: [
    { label: "The levels are repeating. What does the science say?",
      text: "Rumination, is what the science says. A thought yer brain can't put down, so it walks it in circles, wearin' a groove — everyone does it at three in the mornin'. The Protocol's doin' the same thing, which means it's one of two things: degradin'... or DWELLIN' on somethin'. *A beat.* An' I've decided not to decide which, because one of those means the maze is dyin', an' the other means it's upset. Keep walkin'. Bottom's through the groove." },
    { label: "Do you remember this corridor?",
      text: "...I remember ALL of them. That's the problem — memory's SUPPOSED to decay. Forgettin' isn't a flaw in the system, it's a mercy of it, it's how a brain files anythin' at all. Down here nothin' decays right. *She looks at ye, an' softens exactly one degree.* Anyway. Eyes front. Pupils. ...grand. Go on, an' don't be countin' the walls too closely down here. They count back." },
  ],
  sian: [
    { label: "Recognise this level?",
      text: "Asset reuse, hai — every studio does it, no shame in it... *the sentence runs out of road* ...except they'd FLIP it. Mirror the layout, change the light, swap the props. This is the SAME. Byte for byte the same, I'd put money on it. Ye don't ship a loop where a level should be unless ye ran out of world. *A grin with effort behind it.* So the bottom's close, hai. Ye don't loop the middle of anythin'. Ye loop the END." },
    { label: "How deep do you think it goes?",
      text: "Used to think there'd be a boss floor at the bottom. Big lad. Health bar. Dramatic lightin', hai. *He spins a controller an' catches it.* Now? Now I think it's like the old arcade cabinets — it doesn't END, it just gets faster an' meaner until it has ye. *The grin sharpens instead of fadin'.* Which is GRAND, by the way. Ye can't beat an arcade game — but ye can put yer name at the top of it. Three letters. B-E-E, probably, if I'm honest. GO." },
  ],
  dalypso: [
    { label: "This place is repeating itself.",
      text: "'Course it is. Season NINE, this is. Out of ideas, wheelin' out the old sets, prayin' nobody clocks the wallpaper. *He leans in, one pundit to another.* But here's the thing about season nine, an' I've seen a THOUSAND of them: they only start rerunnin' the old stuff when they know the endin's already written. Somethin' down there knows how this show ends. *He points down, through the floor.* Go find out before the cancellation does." },
    { label: "Have we had this exact conversation?",
      text: "We have. Word for word, near enough. *He is entirely unbothered.* Sure that's half of livin', that is — same conversations, same faces, same highlights at the same time of an evenin'. That's not a prison, that's a ROUTINE, an' there's a world of difference. The trick is mindin' WHO yer routine's with. *He points at ye with the remote.* Yer in mine now. No gettin' out of it. Onwards." },
  ],
};

/* ---------- replays (run 2+) ---------------------------------------------
   Relaunching after a previous run rewinds the player to depth 1, but the
   characters keep their memories. Said once per character per run. */
const REPLAY_GREETS = {
  scally: "*He does a double-take, then laughs, low.* ...back at the very top, amico? Mamma mia. The Protocol, she rewound you. But Scally remembers everything, eh. Everything.",
  homiss: "*He blinks at ye.* Mornin'. ...again. Ye've a fresh-off-the-boat look about ye that I do NOT care for, seein' as I know yer face well.",
  littlebee: "*Her eyes do the whole circuit — pupils, posture, gait — in half a second flat, an' then narrow.* ...back at the top, are we. Rewound like a tape. Yer WALK is the same but the calibration's factory-fresh. Interestin'. Horrible, but interestin'.",
  sian: "*He points at ye, absolutely delighted.* NEW GAME PLUS! That's what this is, hai — I'd know that fresh-spawn look anywhere. What's it like?! Do ye keep yer stats?! Don't tell me. DO tell me.",
  dalypso: "A REBOOT. I knew it — same lead, same wardrobe, actin' like the first nine seasons never happened. *He mutters, settling back.* They never recast when they SHOULD, that's the industry all over...",
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
  const beats = storyTopicsFor(ctx).filter(t =>
    t.gate !== false
    && !(t.once && character.recalls(`topic-${t.id}`))
    && !character.hasSeen(depth, t.id));
  // the level is not done with a character until the player has at least
  // SPOKEN to them this level — opening the dialogue marks "@visited"
  // (dialogue.js openDialogue), so an unvisited character always holds the
  // gate even on levels where they have no authored beat left.
  if (!character.hasSeen(depth, "@visited")) beats.push({ id: "@visit" });
  return beats;
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
