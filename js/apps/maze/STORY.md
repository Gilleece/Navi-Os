# MAZE.EXE — World, Characters & Systems Bible

This is the living design document for the maze game (`js/apps/maze/`). It is
the source of truth for **story, characters, tone, items, relationships, and
the affinity/economy rules**. Keep it in sync with the code: when you change a
character's items, a price, an affinity rule, or the plot, update this file in
the same change.

Status legend: **TBD** = not yet decided (placeholder to fill in over time).
**TODO** = a known task to do when the conditions are met.

---

## 1. The World — the Labyrinth Protocol

The game takes place inside a piece of cyberspace called the **Labyrinth
Protocol** (characters refer to it by that name; the constant lives at
`WORLD` in `characters.js`). It presents as seemingly endless neon labyrinth the
player descends through, level by level ("depth 01", "depth 02", …). Each
level is a freshly generated maze with one goal gate that drops you to the
next depth.

The characters you meet are not NPCs in the usual sense — they are **previous
users** of the Labyrinth Protocol who entered and never escaped (see §3).

---

## 2. The Player — purpose & goals

The player is a new **OPERATOR** who has entered the Labyrinth Protocol. They
do not yet know the full picture. Their goals, in ascending order:

1. **Descend.** Navigate each maze to its goal gate and go deeper.
2. **Survive socially.** The trapped users are the only help (and the only
   danger). Build affinity, don't get on their bad side.
3. **Relay & broker.** Carry messages and move/share items between characters
   who can no longer reach each other (see §3).
4. **Gather LT.** Collect **Labyrinth Tokens** in the maze; spend them on the
   rare goods characters will only part with for coin.
5. **Reach the base depth.** Find the bottom of the Labyrinth Protocol.
6. **Rewrite the code.** At the base, rewrite the Protocol's code to free the
   trapped characters — and themselves.

The player's RPG sheet (SPECIAL-style attributes, inventory, LT balance) lives
in `state.js`. Attributes gate dialogue choices — **every one of the seven
gates at least one conversation** (STR/PER/LCK with Scally, END/AGI with
Homiss, CHA/INT with both; Little Bee gates INT/PER/CHA, Sian AGI/INT/STR/CHA,
Dalypso END/LCK/STR). A new game starts at the **operator registration**
screen (`creation.js`): pick a handle and spend a pool of **12 points** on top
of base-3 attributes (max 9 each; the pool must be fully spent).

---

## 3. The Plot

> **Core premise.** Every character you meet is a former user of the Labyrinth
> Protocol who tried to navigate it and failed to escape. As a penalty / side
> effect, each is **trapped in their own "window"** — a pane in a maze wall they
> can stand behind and speak through, but never leave.

Established beats:

- **They used to talk to each other.** Until recently the trapped users could
  converse freely between their windows. **Something changed**, and now they
  are **isolated** — cut off from one another.
- **The player as go-between.** Because of that isolation, they ask the player
  to **relay messages** between them and to **move and share items** from one
  window to another. This is a central gameplay loop.
- **The hidden user.** They all sense there is **another user** in here who is
  **staying hidden**. They don't know whether this hidden user is responsible
  for them being trapped (and, more recently, isolated). They **warn the player
  to be wary of someone pretending to be someone other than they are. or perhaps 
  even someone that is not trapped like they are.**
- **The escape.** The ultimate goal is for the player to find their way to the
  **base depth** of the Labyrinth Protocol and **rewrite its code** so that the
  characters — and the player — can finally get out (players may end up only
  being able to save a few of the characters, this will depend on items traded,
  what items they have at the end and also their affinity with different characters).

### The relay chain (implemented — `story.js`)

The first concrete go-between quest, running across depths 1+ (each step
waits until the player next talks, so nothing is missable):

1. **Depth 1 — Scally, "quiet-wires":** Scally tells the player the windows
   went silent (flag `heard-isolation`). This roots the chain.
2. **Homiss, "relay-1":** hearing Scally is alive, Homiss sends back a
   message: *"the answer to his question is yes"* (flag `msg-h2s`).
3. **Scally, "relay-2":** the delivery lands hard; he sends a reply — *"hold
   on to it. Even down here"* (flags `msg-h2s-done`, `msg-s2h`).
4. **Homiss, "relay-3":** the reply cracks his denial a hair — he almost says
   "down here" (flag `msg-s2h-done`). What the question was stays unsaid:
   *whether there is anything worth staying honest for* — a thread for the
   plot spine to pick up later.

Each delivery nudges the pair's **peer affinity** both ways (`likePeer`), so
the relay loop is what heals — or could someday poison — their relationship.

### More go-between chains (implemented — `story.js`)

- **The tenner (Bee ⇄ Sian, depths 2–4):** Bee's first request is a message
  for Sian — *"he still owes me a tenner"* (`bee-looking` → `msg-b2s` →
  `msg-s2b-done`). They don't do soppy; they do debts. His reply ("worth
  every penny... she's getting the big horse") is the one time her guard
  drops, and she asks the player **not** to tell Sian he's trapped: a happy
  brain lasts longer down here.
- **Tuesday (Dalypso ⇄ Homiss, depths 6–8):** Dalypso's tardiness ultimatum
  (*"band practice was TUESDAY"*, `msg-d2h`) comes back as Homiss quietly
  failing to work out **which** Tuesday it was (`msg-h2d`) — an apology and
  an "I'll be at the next one" that lands on Dalypso like a dropped case
  (`msg-h2d-done`, *"tell him the door's always open"* — to a house with no
  address).
- **The grounding (Sian → Bee → Sian, depths 12–14):** Sian goes looking for
  the edge of the headset and there is no edge (`sian-cracking`). Bee sends
  back the five-things grounding routine ending *"remember the long acre"*
  (`msg-ground`), which is theirs and stays theirs. Delivered, it lands him
  shaken but whole (`sian-grounded`) — and by depth 15 he's converted the
  panic into a plan (`sian-onboard`: *"we speedrun the Labyrinth Protocol"*).

### The ask (implemented — `story.js`, depth 4+)

At depth 4 the penny drops for all five at once: the player walks, and
walking is the one thing none of them can do. Each character asks for
their freedom **in their own register**, and keeps working the angle from
then on:

- **Scally — transactional** (`the-favour`, d4): drops the pretence, names
  the player "a key that walks", asks once, out loud. Escalates into a
  formal job offer (`closing-time`, d13: *"SCALLY & CO."*) and the endgame
  question (`exit-interview`, d14: *"how many of us fit through the
  door?"*).
- **Homiss — sideways** (`a-door`, d4): asks entirely on behalf of "a
  friend. He's shy." Backs it up by posting pieces of himself out via the
  player (`harmony` d8: the carrying tune; `borrowed-tune` d13: the maze
  starts eating his music).
- **Little Bee — clinical** (`hypothesis`, d5): frames the escape as a
  falsifiable experiment — the render is thinnest at the bottom, the
  player is the mobile instrument. Warns the player **never to promise**
  her anything; only to keep showing up.
- **Sian — coy** (`glitch-hunt`, d5): files a bug ticket — *"let the big
  lad out. Mark it urgent, hai. Not that it's urgent."* The playing-it-off
  erodes through `patch-notes` (d9, features are being REMOVED) into the
  post-headset protocol beats.
- **Dalypso — favour-currying** (`houseguest`, d5): assigns the player a
  bedroom in the house. His ask is always oblique: get us to the front
  door, the kettle, the good room.

**Promises are counted.** The player can promise "you first through the
door" (Scally d14, Dalypso d15 — both actually *refuse* the slot and
re-order it onto the others, which is who they are). Selling "first"
twice is caught by Scally's `manifest` (d15), which audits the promise
flags and docks the player for double-selling. The intended lesson item:
*THE COURIER TAKES EVERYBODY.*

**Floating consequence beats** (no fixed depth — they fire on the level
after the deed): `receipts` / `vial-honoured` (Bee remembers whether the
promised data vial actually reached her), `ye-fed-it` (Bee, if the
saint's finger went to Scally despite her warning — his chatter goes
quiet), `plectrum-trophy` (Homiss spots his gifted plectrum worn as
Sian's trophy). Betrayals arrive as *content*, not silent number drops.

**TBD — the main plot spine.** The beat-by-beat story (who the hidden user is,
what changed to isolate the characters, what the rewrite actually requires, the
midpoint turn, the ending) is not yet decided. Depths 1–15 are authored (see
§6); the spine picks up from there. Threads already seeded for it: the
**lanyard** (the Protocol has an employer — Scally *"saw the purchase order"*),
Bee's **seams** ("somethin's rerenderin' things down there"), Dalypso's
**window that doesn't breathe** / the channels that show the maze, and his
house keys that never turned a lock.

Open questions to resolve (TBD):
- Who/what is the hidden user, and are they friend, foe, or the system itself?
- What "changed" to isolate the characters — and is it reversible mid-game?
- What does "rewriting the code" cost the player?

---

## 4. Characters

Each character is a `Character` instance (`characters.js`) wrapping a per-file
definition (`characters/<name>.js`). They carry:
- an **affinity toward the player** (0–100, persists across levels; new game = 50),
- a **tone** that shifts with that affinity,
- a procedurally drawn **portrait / 2.5D figure**,
- an **inventory** (some items for sale, some giftable/barterable),
- **interests** (items they want from the player: `open` = named openly,
  `hidden` = secretly craved, hinted in riddles),
- and an **affinity toward other characters** (§5).

### Affinity → tone bands (shared by all characters)

| Affinity | Tone key | Standing label(s) shown |
|---|---|---|
| 0–20 | `hostile` | "Wants to end you" / "Hates your guts" |
| 21–40 | `wary` | "Dislikes you" / "Wary of you" |
| 41–60 | `neutral` | "Suspicious of you" / "Neutral" |
| 61–80 | `friendly` | "Intrigued by you" / "Likes you" |
| 81–100 | `warm` | "Likes you a LOT" / "Adores you" / "Obsessed" |

Below `HOSTILE` (20) a character refuses normal conversation and must be
thawed (gift them something they covet).

---

### SCALLY  (`id: "scally"`)

- **Description:** A small, hunched Italian fixer who haunts the wired. Forever
  rubbing his hands and smiling like he knows something you don't. Honest, he
  swears.
- **Voice / tone:** A sly, fast-talking Italian fixer. Warm and matey on the
  surface, always angling. Spawns near the player's start on level 1
  (`firstLevelNearStart`). Tone by band: *hostile* = menacing, done with you;
  *wary* = clipped, suspicious; *neutral* = transactional, sizing you up;
  *friendly* = chummy, conspiratorial; *warm* = treats you like family (and
  still angling).
- **Inventory:**
  | Item id | Name | Type | Notes |
  |---|---|---|---|
  | `sausage` | Cured Sausage | giftable / barter | "Real Italiano." |
  | `coin` | Brass Token | giftable / barter | Stamped with a maze; opens something, somewhere. |
  | `charm` | Tin Cornicello | **for sale (LT only)** | Against the evil eye. **Price: 45 LT.** |
- **Wants from the player:**
  - `open`: `relic-shard`, `data-vial` (haggles for these out loud)
  - `hidden`: `saints-finger` (craves it; won't name it, hints in riddles)

### HOMISS  (`id: "homiss"`)

- **Description:** A warm, rumpled Irishman with a bass slung across him and a
  doctorate in composition. Endlessly friendly, forever asking impossible
  questions, and quietly terrified that none of this is real. Would commit
  unspeakable acts for a jar of mayonnaise.
- **Voice / tone:** Gentle, funny, philosophical Irish musician; an existential
  dread bubbling under the warmth. Loves "would-you-rather" questions. Tone by
  band: *hostile* = hurt, shut down; *wary* = guarded, deflecting with jokes;
  *neutral* = friendly but cautious; *friendly* = open, playful; *warm* =
  confides his fear that none of this is real.
- **Inventory:**
  | Item id | Name | Type | Notes |
  |---|---|---|---|
  | `plectrum` | Bone Plectrum | giftable / barter | Carved from… something. |
  | `napkin` | Scrawled Napkin | giftable / barter | Notation + "IS ANY OF THIS REAL". |
  | `cassette` | Warped Cassette | **for sale (LT only)** | "DREAD (live)". **Price: 30 LT.** |
- **Wants from the player:**
  - `open`: `sausage`, `data-vial`
  - `hidden`: `mayo` (a jar of mayonnaise — he won't name it, but he can't stop
    bringing the conversation around to it)

### LITTLE BEE  (`id: "littlebee"`, spawns from depth 2)

- **Description:** A small, sharp Northern Irish neuroscientist who dove into
  the Protocol on purpose, chasing the digital psychedelic — and never
  surfaced. The trip never fully ended: she sees the seams. Talks at a
  gallop, confrontational in a heartbeat, ferociously caring underneath.
  Wears a jumper with a horse on it; the horse is not negotiable.
- **Voice / tone:** Fast Belfast patter — dashes, pile-ups, no waiting for an
  answer. Runs a little cognitive test battery on the player (and, secretly,
  on herself) every level: it's science, and it's also love. Tone by band:
  *hostile* = cold, surgical dismissal; *wary* = clipped, arms folded;
  *neutral* = brisk, assessing; *friendly* = questions stacking up for you;
  *warm* = the guard drops and she doesn't bother hiding it.
- **Relationships:** in love with **Sian** (won't do soppy; does debts). Best
  pals with **Homiss** (pre-isolation wall-sessions: his drones, her EEG
  commentary). Fond of **Scally** but worried at what he's trading toward.
  Suspicious of **Dalypso** — *"his window doesn't breathe."*
- **Inventory:**
  | Item id | Name | Type | Notes |
  |---|---|---|---|
  | `sugarcube` | Sugar Cube | giftable / barter | "For horses." Faint watermark of a grinning sun. |
  | `horsehair` | Horsehair Plait | giftable / barter | Woven from a chestnut tail; smells of rain and hay. |
  | `prism` | Prism Tab | **for sale (LT only)** | A digital psychedelic wafer. **Price: 60 LT.** |
- **Wants from the player:**
  - `open`: `data-vial` (science — a third bidder against Scally and Homiss),
    `cassette` (Homiss's tape: "theta entrainment ye can dance to")
  - `hidden`: `horseshoe` (homesickness she will deny under oath)

### SIAN  (`id: "sian"`, spawns from depth 3, minimap letter `5`)

- **Description:** A tall, big-hearted lad from Cavan in a VR headset:
  programmer at the tech giant that shall not be named, combat-robot builder
  (Brenda, 12 kg, one tribunal), bass rival to Homiss. The mutual link —
  school with Dalypso, college with Homiss, work with Scally, love with Bee.
  Convinced the Protocol is the greatest VR experience ever shipped.
- **Voice / tone:** Cavan warmth, "hai" on the end of everything, charm and
  overreaction in equal measure. His **arc** is authored in `story.js`: five
  stars (d3) → no pause menu (d6) → no session timer (d8) → no edge to the
  headset (d12, `sian-cracking`) → grounded by Bee's relayed routine (d14) →
  resolve (d15: *"we speedrun the Labyrinth Protocol"* — the first time he
  says its name). Tone by band: *hostile* = you're muted; *wary* = no grin,
  five-alarm freeze; *neutral* = reviews the graphics at you; *friendly* =
  found a bug, has to show you; *warm* = "the MAIN character".
- **Inventory:**
  | Item id | Name | Type | Notes |
  |---|---|---|---|
  | `servo` | Combat Servo | giftable / barter | "Brenda's knee." |
  | `patchlead` | Frayed Patch Lead | giftable / barter | "The tone's IN the tape, hai." |
  | `battlebot` | Palm-Size Battlebot | **for sale (LT only)** | Hums near walls. **Price: 70 LT.** |
- **Wants from the player:**
  - `open`: `plectrum` (the rivalry demands a trophy), `relic-shard` (a
    programmer wants source to decompile)
  - `hidden`: `lanyard` (the one artifact of his old life that has no
    business being inside a game)

### DALYPSO  (`id: "dalypso"`, spawns from depth 4)

- **Description:** A red-headed man in a football jersey, ball always at his
  hip. Argues with rain for being wet; kindest heart in the maze. Encyclopedic
  on every film and TV programme ever made — and several never made, which he
  watches anyway: his window **gets all the channels**, including one that
  shows the player walking the maze. Just bought a house. Four bed. Semi-D.
  South-facing garden. He got the keys on the Friday, and then he was here;
  the keys are still in his pocket (d15, `dalypso-keys`).
- **Voice / tone:** Machine-gun opinions, contradicts you then concedes,
  relates everything to a match or a film. **Agreeing with him disappoints
  him** — in his recurring hot-takes bit, arguing back is what earns affinity.
  Tone by band: *hostile* = points the remote at you and presses mute;
  *wary* = folds his arms and settles in to disagree; *neutral* = mid-opinion
  already; *friendly* = three opinions saved up, two about you; *warm* =
  "me favourite neighbour".
- **Relationships:** **Sian** is his best mate since age six — and he thinks
  **Little Bee** took him, and is very nearly finished letting it go.
  **Homiss** is a gentleman with ONE flaw, and the tardiness *"needs to be
  eradicated entirely"* (the Tuesday relay). Doesn't really know **Scally**;
  respects a man with stock.
- **Inventory:**
  | Item id | Name | Type | Notes |
  |---|---|---|---|
  | `stub` | Cup Final Stub | giftable / barter | Row Z. Second greatest day of his life. |
  | `housekey` | Spare House Key | giftable / barter | Never turned in a lock. "GOOD ROOM — DO NOT LOSE". |
  | `remote` | Universal Remote | **for sale (LT only)** | Buttons for channels that don't exist. **Price: 55 LT.** |
- **Wants from the player:**
  - `open`: `sticker` (a collector completes the set), `coin` (Scally's brass
    token — "I respect a man with stock, an' I respect his memorabilia more")
  - `hidden`: `tv-guide` (the Christmas one; he hides this desire with the
    subtlety of a hand grenade)

> **Cross-character barter:** Homiss wants Scally's `sausage`; Scally, Homiss
> **and Bee** all want a `data-vial` (three-way choice). Bee wants Homiss's
> `cassette` (buy for 30 LT, barter on — a brokering play). Sian wants
> Homiss's `plectrum`; Dalypso wants Scally's `coin`. Barter paths only light
> up once the wanted item is actually in the player's inventory.

**Item sources (decided).** The once-TBD items now exist in the world
(`story.js WORLD_ITEMS` + `applyLevelEvents`); each is **one of a kind** —
once found it never respawns:

| Item id | Source | Notes |
|---|---|---|
| `relic-shard` | maze pickup, depth 4+ | pale solid shard among the tokens; barter fuel for Scally **and Sian** |
| `mayo` | **Scally's stock**, depth 6+ | he acquires it at depth 6 and sells it for **35 LT** — the first brokering play (buy from Scally, gift to Homiss) |
| `data-vial` | maze pickup, depth 8+ | Scally, Homiss and Bee all want it — the player must pick a side |
| `saints-finger` | maze pickup, depth 9+ | Scally's hidden desire; triggers his riddly swap — **and Bee's depth-9 warning not to feed it to him** |
| `horseshoe` | maze pickup, depth 11+ | Bee's hidden desire: real iron in a place with no iron |
| `sticker` | maze pickup, depth 12+ | gold foil, a player nobody remembers; Dalypso's open want |
| `lanyard` | maze pickup, depth 13+ | Sian's hidden desire; **both Sian and Scally react to the player carrying it** (`lanyard-sian` / `lanyard-scally`) — seeds the company thread |
| `tv-guide` | maze pickup, depth 14+ | the Christmas one, every listing circled; Dalypso's hidden desire |

Unfound maze items keep appearing on every later level until collected, so
none of them is missable. The thaw rule (gift a coveted item to a hostile
character) draws from `interests.open` + `interests.hidden` automatically —
see §7.

---

## 5. Inter-character affinity (characters ↔ each other)

In addition to liking the *player*, each character has a feeling **toward each
other character** (directional: A→B may differ from B→A). This supports the
plot's relay/brokering loop — the player carrying messages and items between
isolated windows should shift these values over time.

Representation (in `characters.js`): a base map `BASE_PEER_AFFINITY`, copied
onto each `Character` as `this.peers`. A **missing entry means they don't know
each other / have never met.** Accessors: `feelsToward(id)`, `likePeer(id, d)`,
`meetPeer(id, initial)`.

### Base values (mirror of the code)

Sian is the mutual link (school with Dalypso, college with Homiss, work with
Scally, love with Bee), so **every pair has at least met** — the thin pairing
is Scally↔Dalypso ("seems sound, sells things").

| From → To | Affinity (0–100) | Note |
|---|---|---|
| Scally → Homiss | 58 | Knows him; cordial but always sizing him up. |
| Scally → Little Bee | 62 | Respects the fight in her; she argues fair. |
| Scally → Sian | 60 | Knew him at "the company"; cagey about those days. |
| Scally → Dalypso | 52 | Barely knows "the loud one". |
| Homiss → Scally | 64 | Likes the wee fixer; slightly warmer than it's returned. |
| Homiss → Little Bee | 80 | His session partner through the walls. |
| Homiss → Sian | 68 | The rivalry is real and so is the fondness. |
| Homiss → Dalypso | 66 | Fond; guilty about all the Tuesdays. |
| Little Bee → Scally | 58 | Likes him; worried about what he's trading toward. |
| Little Bee → Homiss | 78 | Her best pal down here. |
| Little Bee → Sian | 92 | The whole heart. |
| Little Bee → Dalypso | 34 | Suspicious — "his window doesn't breathe." |
| Sian → Scally | 66 | Work pal ("nobody knew what Scally DID"). |
| Sian → Homiss | 72 | Rival, brother-in-arms. |
| Sian → Little Bee | 90 | The whole heart, minus what the headset hides. |
| Sian → Dalypso | 75 | Best mate since six. |
| Dalypso → Scally | 55 | "Seems sound. Sells things." Respects stock. |
| Dalypso → Homiss | 63 | A gentleman with ONE flaw. |
| Dalypso → Little Bee | 44 | She took nothing that was his to keep; very nearly finished letting it go. |
| Dalypso → Sian | 82 | Best mate FIRST. |

> **TODO:** with future characters, deliberately leave **some pairs blank**
> (= they've never met) so "introducing" them becomes a player action
> (`meetPeer`). Decide the relay/brokering rules: how much relaying a message
> or moving an item shifts peer affinity (current deliveries use ±2..4), and
> whether peer affinity gates anything the player can do.

---

## 6. Levels 1–50 — significant events

The visual band for each level is fixed by the palette. Depths 1–15 are
**implemented** in `story.js` (`STORY_TOPICS`, `WORLD_ITEMS`,
`applyLevelEvents`); keep this table and that file in sync. A depth here
means "available FROM that depth" — story beats wait until the player next
talks to the character, so none are missable. 16+ remain **TBD**.

Every authored depth (1–15) offers **at least five highlighted story
conversations** (some characters carry two on a level). Most story beats
now **branch** — 2–3 replies, including non-obvious traps (§7) — so the
table below names the beats; the branches live in `story.js`.

| Lvl | Visual band | Significant event |
|---|---|---|
| 1 | green (solid) | Meet Scally near the start. Scally ×3: **"quiet-wires"** (`heard-isolation`), "the-rules" (the three laws of the halls), "what-are-you" (self-presentation: `op-honest`/`op-cagey`/`op-blunt`). Homiss ×2: "first-sight" (the counting that gives up), relay step 1. |
| 2 | solid | Relay step 2 (Scally) + Scally "word-travels" (the new tenant). Homiss "the-window" (load-bearing glass). **Little Bee's window first appears** — "new-face" (`bee-looking`) + "baseline" (why the tests are love). |
| 3 | solid | Relay step 3 (Homiss) + Homiss "the-question" (pressing for the story behind the relay is a trap). **Sian's window first appears** — "just-a-game" + the tenner lands ("bee-msg", `msg-b2s`). Bee "the-lads" (the comforting lie about Homiss costs). |
| 4 | solid | **The ask begins (§3).** `relic-shard` appears. Scally "shard-hint" + **"the-favour"** (`ask-scally`). Homiss **"a-door"** (`ask-homiss`). **Dalypso's window first appears** — "new-gaff" (`heard-gaff`; the *"when are ye ever home"* trap is live). Bee "msg-back" (`msg-s2b-done`). |
| 5 | solid | Scally **"hidden-user"** (`warned-hidden`). Bee "the-jump" (`bee-seams`) + **"hypothesis"** (`ask-bee`; over-promising backfires). Sian **"glitch-hunt"** (`ask-sian`). Dalypso **"houseguest"** (`ask-dalypso`; the Bee-bedroom needle). Homiss "setlist" (the reunion gig). |
| 6 | gradient ×2 | Scally stocks the **mayonnaise** ("impossible-stock") + **"protection"** (the inverted shakedown: *paying* costs affinity, laughing it off earns it). Sian "menu-gone". Dalypso "tuesday" (`msg-d2h`). Bee **"sides"** (first look at strange goods — `bee-first` vs `neutral-broker`). Homiss "the-jar" (the moral claim on the mayo). |
| 7 | gradient ×2 | Homiss "pipes" + "tuesday-reply" (`msg-h2d`). Bee "count-his-walls" (`bee-suspects`; defending Dalypso is the trap, `defended-dalypso`/`agreed-count`). Sian "co-op" (asks after Bee; *"she's worried about you"* wounds him). Scally "the-listener" (what do you tell them about me?). Dalypso "fixture-list" (the seating plan; agree-shaped answers lose). |
| 8 | gradient ×2 | `data-vial` appears (three bidders). Scally "vial-rumor". Sian "the-timer" (asking *which month* is the cruel option). Dalypso "tuesday-lands" (`msg-h2d-done`) + **"what-does-she-say"** — the loyalty fork: betray Bee's confidence (`told-dalypso-suspicion`, Dalypso +), keep it (`kept-bee-counsel`, Dalypso −), or dodge (`dodged-dalypso-question`). Bee **"vial-claim"** (`vial-promised-bee` — the promise is REMEMBERED). Homiss "harmony" (`heard-tune`: the carrying tune). |
| 9 | gradient ×2 | `saints-finger` appears; conditional "bone-snap" (Homiss) / **"dont-give-it"** (Bee, `bee-warned-bone`). Bee **"verdict"** settles the d8 fork (−4 / +2 / +1). Scally "the-riddle" (pressing him is one knock too many). Sian "patch-notes" (the changelog runs backwards). Dalypso "the-remote" (channel 407 goes dark; *"maybe the telly's broken"* detonates). Homiss "the-committee" (the would-ye-rather he can't finish). |
| 10 | gradient ×2 | Capstones, all five: Scally "ten-deep" (`depth10`), Homiss "ten-normal" (**the player now chooses** honest vs good answer; `homiss-honest`), Bee "ten-rounds" (the cohort report; auditing her Sian entry is a trap), Sian "double-digits" (survival horror; *"the confident lad goes first"* wounds), Dalypso "season-review" (agreeing with the review is the losing move). |
| 11 | gradient ×3 | `horseshoe` appears. Bee "iron". Scally "overheads" (the unrendered stock, the warm bakery bag; `scally-audited`). Homiss "request-line" (peer nudges to all three). Sian "brenda" (*"soon" is the wounding word; the daft kindness heals*). Dalypso "planning-permission" (reject the conservatory WITH a better idea to win). |
| 12 | gradient ×3 | `sticker` appears. **Sian "the-headset"** (`sian-cracking`; *"it's going to be fine"* is the trap). Dalypso "on-the-telly" (`dalypso-watching`; calling it creepy wounds him — recruiting him as lookout sets `dalypso-lookout`). Bee "before-after" (reads Sian off the player's face). Scally "no-shadow" (`scally-visited-dark`; needs `warned-hidden`). Homiss "the-crack" (`heard-singing`: something below knows a tune he half-knows; `hummed-fragment`). |
| 13 | gradient ×3 | `lanyard` appears — conditional "spot-lanyard" / "fear-lanyard". Bee "ground-him" (`msg-ground`). Sian "system-check" (`sian-protocol`: five facts, five fingers). Dalypso "missed-appointment" (the player's channel went to *held-breath* static; sixty-five missing minutes). Homiss "borrowed-tune" (the maze ate his fourth bar — `returned-tune` if the player still carries it). Scally "closing-time" (`scally-and-co`; what happened to the three before you). |
| 14 | gradient ×3 | `tv-guide` appears. Sian "grounded" (`sian-grounded`). Bee "results-day" (the guard drops; the big horse decoded). Scally **"exit-interview"** (`heard-doorprice`; first "you first" promise possible, `promised-scally-first` — he refuses the slot). Dalypso "tv-guide-season" (the biro, the double issue). Homiss **"normal-enough"** — the trap INVERTS: agreeing it's all normal, the safe answer for 13 levels, now costs −5; the truth sets `homiss-knows`. |
| 15 | gradient ×3 | Capstones, all five: Bee "drift", Sian "speedrun" (`sian-onboard`), Dalypso "keys" (`dalypso-keys`; `promised-dalypso-first` possible — he re-orders the queue), Scally "manifest" (`heard-manifest`; **audits the promise flags** — double-sold "firsts" get docked), Homiss "one-for-the-road" (`homiss-answered`: real and not safe). |
| 16 | shift ×2 | TBD |
| 17 | shift ×2 | TBD |
| 18 | shift ×2 | TBD |
| 19 | shift ×2 | TBD |
| 20 | shift ×2 | TBD |
| 21 | transition ×3 | TBD |
| 22 | transition ×3 | TBD |
| 23 | transition ×3 | TBD |
| 24 | transition ×3 | TBD |
| 25 | transition ×3 | TBD |
| 26 | flicker | TBD |
| 27 | flicker | TBD |
| 28 | flicker | TBD |
| 29 | flicker | TBD |
| 30 | flicker | TBD |
| 31 | random | TBD |
| 32 | random | TBD |
| 33 | random | TBD |
| 34 | random | TBD |
| 35 | random | TBD |
| 36 | random | TBD |
| 37 | random | TBD |
| 38 | random | TBD |
| 39 | random | TBD |
| 40 | random | TBD |
| 41 | random | TBD |
| 42 | random | TBD |
| 43 | random | TBD |
| 44 | random | TBD |
| 45 | random | TBD |
| 46 | random | TBD |
| 47 | random | TBD |
| 48 | random | TBD |
| 49 | random | TBD |
| 50 | random | **Base depth? Rewrite the code / escape (TBD).** |

**The narrative gate.** The exit ring **lies flat on the floor** until every
**highlighted (story) topic** on the level has been exhausted (`story.js
pendingBeats`, polled by `maze.js` — the gate and the amber highlights read
the same list, so they can never drift apart), **and the player has spoken
to every character present on the level at least once** (opening the
dialogue marks `@visited` per level; an unvisited character holds the gate
even with no authored beat left — this keeps the once-per-level social
round alive on depths with no new story, e.g. 16–30). Walking into the flat
ring says who still has words for you ("THE WAY DOWN IS NOT YET OPEN —
SPEAK WITH SCALLY"); once the level's story is done the ring rises and
descending works as ever. This includes the deep-zone loop conversations —
below depth 30 the maze only lets you descend if you keep talking, which is
exactly what Scally warned about at depth 10. A topic can opt out with
`gate: false`. Relay steps 2 and 3 carry min-depths 2 and 3 so the gate
paces the exchange to one step per level rather than demanding it all on
depth 1. Beats whose `available()` turns true mid-level (e.g. Bee's
"results-day" after grounding Sian on the same level) re-lower the ring —
that's intended: the level isn't done until the new words are heard.

**The deep zone (31+).** The palette re-runs earlier looks and the
characters can feel it: greetings gain loop-aware lines and each level
offers one rotating loop topic per character (`story.js LOOP_GREETS` /
`LOOP_TOPICS`), so deep levels never go silent — and those conversations
hold the gate like any other story beat.

**Decay (walls & graffiti).** The maze decays as you descend
(`environment.js chaosFor`): depth 1 is the original plain brick with clean
walls; each level mixes in more wall variants (panels / vents / cracks) and
more graffiti, until depth 30 — the last level before the loop zone — is
fully chaotic (8–11 scrawls, walls a jumble). It stays that way below. The
dissolving cyber wall around the exit ring is always its own pattern,
untouched by the ramp.

**Set dressing & atmosphere (`props.js`).** The Protocol sheds junk: small
crates, dead terminals, canisters and cable coils sit in cell corners (never
in a walkway), and a few dead-ends hold a larger centrepiece — a server rack,
a big strapped crate or a terminal kiosk — parked against the back wall (the
centrepieces are solid; the junk is ankle-height and walkable-through). The
ceiling is panelled and carries a **light grid**: a glowing fixture in nearly
every cell lights the maze from within, and how many of them stutter or cut
out ramps with depth like the wall decay — depth 1 has the odd flicker, depth
30 barely holds its light. **Data motes** drift through the fog, which is
heavier than it used to be. In VR the small junk is **grabbable**: squeeze
the grip near a piece to pick it up, let go to drop or throw it — pure toy
physics, nothing gameplay-relevant. All of it recolours with the level's
palette band, screens and LEDs included.

**Persistence & runs (`menu.js`).** One save slot in localStorage, autosaved
on every level entered and on exit; the launcher offers **CONTINUE** (restore
the slot at its depth) and **EXPORT / IMPORT** (the raw save as a JSON file).
**NEW GAME rewinds the Protocol**: flags, characters and player reset, but
the **run counter climbs** — so the trapped users keep a déjà vu of you and
greet a returning operator once per run (`REPLAY_GREETS`). The story replays
because the world rewound with you; only the feeling of having met before
survives the rewind.

---

## 7. Systems — rules of thumb

### Affinity (player ↔ character)

Affinity is meant to be **the loudest system in the game**: every change
flashes a signed delta chip (`+2 ▲` / `−6 ▼`) beside the standing label in
the dialogue box AND on the VR panel, the portrait mood flips at ±2, and
crossing a standing band fires a toast ("SCALLY — LIKES YOU"). The player
should never miss a number moving.

General rules (enforced in `dialogue.js` / `characters.js`; exceptions noted):

- **The trust cap (`trustCap(depth) = 50 + depth × 5`, max 100).** No amount
  of charm pushes affinity above the cap for the current depth — gains
  simply stall there (losses are never capped). So "Likes you" (70+) is
  unreachable before **depth 4** and warm (81+) before **depth 7**, however
  well the player plays. Trades and thaw gifts respect the cap too.
- **Conversational choices** move affinity **+1 to +3** (positive) and **down
  to −10** (negative) at most (central clamp on any non-trade `like`).
  Authored values run **+1 typical, +2 for the right reply / stat-gated
  wins, +3 only for once-only emotional peaks** (relay landings etc.).
- **Hidden traps.** Every character has replies that *sound* reasonable and
  land badly (−2..−5): the comforting lie ("he's grand" to Bee), honest
  curiosity (pressing Homiss or Scally about the thing under the story),
  sensible caution (paying Scally's "insurance", calling Dalypso's viewing
  habit creepy, telling Sian to give the pause-gesture a rest), plain
  agreement (Dalypso's takes: agree −1, argue +1). These are **not
  labelled** — the player learns each person by getting it wrong.
- **Choosing between characters.** Some choices shift a *different*
  character's affinity via the `others` effect key, or set flags that a
  later beat of the other character settles (the d8 Dalypso fork → Bee's d9
  "verdict"; the vial promise → "receipts"/"vial-honoured"). Consequences
  arrive as content, one level later, not as silent numbers.
- **Passive recovery:** a near-murderous character (affinity < 10) warms by +5
  per level, capped at 10, so they can eventually be approached again
  (`recoverAffinity`).

**Exceptions (deliberate, kept outside the conversational clamp):**
- **Trades** (`give`/`take`/`cost` effects) may carry their own small affinity
  nudge as part of the exchange.
- **Coveted-gift thaw:** handing a hostile character an item they covet
  (`wants`) is a large one-time thaw — this is the intended way to recover a
  ruined relationship (`giftTo`). Unless a def overrides `wants`, it is
  derived automatically from `interests.open` + `interests.hidden`, so the
  thaw path always has fuel.

> When you add a special case (a quest beat that grants a big affinity swing),
> make it an explicit, documented exception here.

### The hub menu (pacing — `dialogue.js` renderHub)

A conversation is a few things deep, not a wall of choices:
- **Story beats** (amber) are always pinned on top.
- **`keep: true` topics** — the trade topic and each character's recurring
  bit (would-ye-rathers, check-up, design-a-bot, hot takes; plus Scally's
  level-1 token tutorial) — are always available, at the bottom.
- **Everything else rotates:** only **3** plain topics are offered per
  level, picked deterministically from the character's pool by depth
  (`rotatedMenu`), so each level's small talk is a different handful and
  nothing is permanently missable.
- A topic can carry **`minAffinity`** — the personal material (Bee on
  Homiss/Scally, Sian on Bee, Dalypso on Bee, Homiss's dread, Scally's
  window-eyes) only surfaces once the character has warmed to the player,
  which makes climbing the bands *reveal content*, not just labels.

### Story flags, beats & memory (`story.js` / `state.js`)

- **Flags** (`state.js setFlag/hasFlag`) are the global "this happened"
  record: relay steps, warnings heard, items found/bought/traded (trade
  choices stamp `bought-<id>` / `traded-<id>-to-<char>` automatically).
- **Story topics** are injected into a character's hub by
  `applyStory()` — pinned to the top and rendered amber (topic
  `story: true`). A topic with **`once: true`** retires for the whole game
  when selected (per-character `memory`); plain topics still refresh per
  level via `seen`.
- Topic/choice `effects` support three story keys beyond the usual:
  `flag: "id" | [ids]` sets global flags; `peers: [{ of, toward, delta,
  meet }]` shifts inter-character affinity (§5) — deliveries in the relay
  chain are what move those numbers; `others: [{ id, like }]` shifts a
  *different* character's affinity toward the **player** (clamped like
  conversation) — the fuel for choosing-between-characters moments.
- **Graffiti** (`graffitiPool`) is lore: scrawls from previous users on
  seeded walls. Some entries only join the pool after flags are set
  (`warned-hidden`) or in the deep zone (31+). Add graffiti when you add
  beats — the walls should remember what the player knows.

### Economy (Labyrinth Tokens, "LT")

- LT are picked up as floating shapes in the maze (denominations 1 / 3 / 5;
  ~14 LT scattered per level — see `entities.js SPAWN`).
- **For-sale items cost a lot:** token-only items are priced **20 LT minimum,
  up to 100 LT.** (Current: Scally's Tin Cornicello = 45, Homiss's Warped
  Cassette = 30.) The intent is that a prized item is several levels of saving,
  not an impulse buy.
- **Trade cooldown:** a character will *gift* an item at most once every
  `TRADE_COOLDOWN` (2) levels. Barter and token sales are **not** on the
  cooldown (they're self-limiting — the item / LT is spent).

### Three ways to get a character's items
1. **Token sale** — items with a `price` (LT only, never gifted/bartered).
2. **Affinity gift** — un-priced items, given free once liked enough (on the
   trade cooldown).
3. **Barter** — un-priced items swapped for something the character wants
   (`interests.open` / `interests.hidden`).

---

## 8. Adding a new character (checklist)

1. Create `characters/<name>.js` exporting a def (copy `scally.js`'s shape).
2. Import it and add to `DEFS` in `characters.js`.
3. Give one inventory item a `price` in **[20, 100]** LT.
4. Set `interests: { open: [...], hidden: "id" }` (these also fuel the
   hostile-thaw path automatically).
5. Add a §4 entry here (description, tone-by-band, item table, wants).
6. Add their **peer affinities** to `BASE_PEER_AFFINITY` and §5 — fill some,
   leave some blank (never met).
7. Keep conversational `like` effects within **+1..+3 / −10** — and use the
   house scale: +1 typical, +2 earned, +3 once-only peaks. Give them at
   least one **hidden trap** (a reasonable-sounding reply that lands −2..−5)
   and mark their recurring bit + trade topic **`keep: true`**; put
   **`minAffinity`** on the personal topics so warmth unlocks content.
8. Wire them into the story: add their beats to `story.js` (`STORY_TOPICS`
   with `char: "<id>"`, plus `LOOP_GREETS` / `LOOP_TOPICS` / `REPLAY_GREETS`
   entries so the deep zone and replays don't fall silent around them), and
   decide which world items or relay messages route through them. Every
   authored depth needs **≥5 highlighted story conversations** across the
   roster present at that depth, their ask-thread beat included, and beats
   should **branch** (2–3 replies, one of them costly).
9. Optional def fields: `minDepth` (the first depth their window appears —
   stagger introductions so descending keeps meeting new people; their intro
   beat should sit at the same depth) and `letter` (minimap initial, only
   needed when the name's first letter is taken — Sian is `5`).
