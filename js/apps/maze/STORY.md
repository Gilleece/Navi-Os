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
`WORLD` in `characters.js`). It presents as a seemingly endless neon labyrinth
the player descends through, level by level ("depth 01", "depth 02", …). Each
level is a freshly generated maze with one goal gate that drops you to the
next depth.

In truth the Protocol is **ten depths deep, and it loops**. At the end of the
tenth depth is the **base depth**: a single wide hall with a tall roof (the
first and only open space in the game — the deliberate opposite of the maze)
and a towering supercomputer in the middle of it, **the Custodian** (§4).
Leaving the base depth **recycles** the Protocol: the floors reset and the
player is back at "depth 01". The whole game is **three cycles** of the ten
depths; the third visit to the base depth is the end of the game.

**The two clocks.** Internally, depth never resets — it climbs 1..30 across
the three cycles (`state.js`: `cycleOf`, `depthInCycle`, `FINAL_DEPTH`).
Everything systemic keys on this **global depth**: palette band, wall decay,
trust cap, item availability, story-beat scheduling, trade cooldowns. What
the **player sees** (HUD, banners, and any level number spoken aloud by a
character) is the **shown depth**, `((depth-1) % 10) + 1` — so after the base
depth the counter spookily rewinds to 01, and the world has visibly aged
anyway (decay is global). The characters believe the shown clock; the player
watches the two clocks disagree. Only the Custodian knows both.

The characters you meet are not NPCs in the usual sense — they are **previous
users** of the Labyrinth Protocol who entered and never escaped (see §3).

---

## 2. The Player — purpose & goals

The player is a new **OPERATOR** who has entered the Labyrinth Protocol. They
do not yet know the full picture (see §3 — they *are* the full picture).
Their goals, in ascending order:

1. **Descend.** Navigate each maze to its goal gate and go deeper.
2. **Survive socially.** The trapped users are the only help (and the only
   danger). Build affinity, don't get on their bad side.
3. **Relay & broker.** Carry messages and move/share items between characters
   who can no longer reach each other (see §3).
4. **Gather LT.** Collect **Labyrinth Tokens** in the maze; spend them on the
   rare goods characters will only part with for coin.
5. **Reach the base depth.** Find the bottom — and find out it is not the end.
6. **Spend the amnesties.** The Custodian can free exactly **one** trapped
   user per cycle. Choose who walks, twice.
7. **Finish the last cycle.** Be standing at the base when the Protocol
   terminates, walk everyone left out of it — and learn what the player is.

The player's RPG sheet (SPECIAL-style attributes, inventory, LT balance) lives
in `state.js`. Attributes gate dialogue choices — **every one of the seven
gates at least one conversation** (STR/PER/LCK with Scally, END/AGI with
Homiss, CHA/INT with both; Little Bee gates INT/PER/CHA, Sian AGI/INT/STR/CHA,
Dalypso END/LCK/STR). A new game starts at the **operator registration**
screen (`creation.js`): pick a handle and spend a pool of **12 points** on top
of base-3 attributes (max 9 each; the pool must be fully spent). *(Note the
retrospective irony of this screen after the twist lands — §3: the form is
the agent parameterising itself. It always fills in the form itself.)*

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
  to be wary of someone pretending to be someone other than they are, or
  perhaps even someone that is not trapped like they are.**
- **The escape.** The bottom of the Protocol holds the machinery that keeps
  the frames shut — and the machinery turns out to be a **person of sorts**
  (the Custodian), bound by terms it did not write.

### The spine (RESOLVED — the three cycles, the amnesty, and the twist)

The formerly-TBD main plot is now decided and implemented:

1. **Cycle 1 (depths 01–10).** The story as the characters know it: the
   isolation, the relay chains, the asks, the items. At the bottom of depth
   10 the gate opens onto the **sanctum** and the player meets the
   **Custodian**, which explains the terms: it maintains the Protocol, it
   cannot void the tenancies, but a **clause of amnesty** lets it dissolve
   **ONE (1) tenancy per cycle**. The player chooses who goes free (or
   refuses — the provision lapses, it does not carry forward). Then the
   Protocol **recycles**.
2. **Cycle 2 (depths 11–20, shown 01–10).** The floors reset — and so do the
   characters. Tenancy state is *premises*: their episodic memory of the
   player rewinds with the building. They walk into **the same conversations
   again, word for word**, believing it's the first time (**echoes**, §7).
   The player alone remembers, can **push back** on any echo, and each
   character deflects the callout in their own register. The freed
   character's window now spawns **dark and empty** everywhere (paying off
   Scally's rule three: *"you pass a window and it is dark inside, you keep
   walking"*), and each remaining character gets a **dark-window beat** —
   with no memory of the bottom, they fear the worst, and the player decides
   what to tell them. Meanwhile the cycle-2-authored material (the old
   depths 11–15 beats: Sian cracking, the grounding, the lanyard, the keys,
   the manifest) lands on top — their arcs keep developing even though
   their memory of *the player* rewound. Second visit to the base: second
   amnesty.
3. **Cycle 3 (depths 21–30, shown 01–10).** The Protocol is **deteriorating
   toward scheduled shutdown**. The echoes replay again, but now the text
   itself is **caught in the static** (`staticify`), the greetings come in
   frantic and glitching, and each character gets a new capstone about the
   collapse (§6). At the final base depth the Custodian executes the
   termination order, dissolves **all remaining tenancies** — everyone still
   trapped walks free — and then completes the player's long-pending
   classification. **The twist:**

> **The player is the hidden user.** They were never an operator who came in
> through the front door — there is no record of them outside it. They are an
> **AI agent process, a contractor**, installed at the top floor when the
> Protocol stopped answering its mail: dispatched to walk it, map it, carry
> its tenants' words, and be standing at the bottom when it ends. The
> characters' warnings were right the whole time — *someone pretending,
> someone not trapped like they were* — they were only ever looking at the
> wrong side of the glass. The `lanyard` world item (job title:
> **CONTRACTOR**, logo scratched off) was the player's own badge. The
> Custodian holds the door anyway: *"the door does not check what walks
> through it. That was always the flaw. It is also the mercy."* The player
> steps through; the epilogue plays (`maze.js runEnding`); the run is over.

Seeded threads this pays off: the **lanyard** (Scally *"saw the purchase
order"* — the employer commissioned the audit), Bee's **seams** (the building
was always one room behind the render), Dalypso's **channels** (his set shows
the maze because the maze was always broadcast-side), Homiss's **hum** (the
Custodian learning his tune — it keeps the four bars, and plays them in the
ending's sanctum).

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
   *whether there is anything worth staying honest for* — answered, at last,
   by the finale: it was.

Each delivery nudges the pair's **peer affinity** both ways (`likePeer`), so
the relay loop is what heals — or could someday poison — their relationship.
Note the chains do **not** replay as echoes: their `available()` predicates
check the done-flags, which persist across cycles. Only the openers echo —
Scally re-reports the silence, and no reply ever comes back through it, which
is its own kind of haunting.

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
- **The grounding (Sian → Bee → Sian, cycle 2, global depths 12–14):** Sian
  goes looking for the edge of the headset and there is no edge
  (`sian-cracking`). Bee sends back the five-things grounding routine ending
  *"remember the long acre"* (`msg-ground`), which is theirs and stays
  theirs. Delivered, it lands him shaken but whole (`sian-grounded`) — and
  by global depth 15 he's converted the panic into a plan (`sian-onboard`:
  *"we speedrun the Labyrinth Protocol"*).

### The ask (implemented — `story.js`, depth 4+)

At depth 4 the penny drops for all five at once: the player walks, and
walking is the one thing none of them can do. Each character asks for
their freedom **in their own register**, and keeps working the angle from
then on:

- **Scally — transactional** (`the-favour`, d4): drops the pretence, names
  the player "a key that walks", asks once, out loud. Escalates into a
  formal job offer (`closing-time`, g13: *"SCALLY & CO."*) and the endgame
  question (`exit-interview`, g14: *"how many of us fit through the
  door?"*).
- **Homiss — sideways** (`a-door`, d4): asks entirely on behalf of "a
  friend. He's shy." Backs it up by posting pieces of himself out via the
  player (`harmony` d8: the carrying tune; `borrowed-tune` g13: the maze
  starts eating his music).
- **Little Bee — clinical** (`hypothesis`, d5): frames the escape as a
  falsifiable experiment — the render is thinnest at the bottom, the
  player is the mobile instrument. Warns the player **never to promise**
  her anything; only to keep showing up. *(The dark-window beat is where
  the hypothesis meets its data.)*
- **Sian — coy** (`glitch-hunt`, d5): files a bug ticket — *"let the big
  lad out. Mark it urgent, hai. Not that it's urgent."* The playing-it-off
  erodes through `patch-notes` (d9, features are being REMOVED) into the
  post-headset protocol beats.
- **Dalypso — favour-currying** (`houseguest`, d5): assigns the player a
  bedroom in the house. His ask is always oblique: get us to the front
  door, the kettle, the good room.

**Promises are counted.** The player can promise "you first through the
door" (Scally g14, Dalypso g15 — both actually *refuse* the slot and
re-order it onto the others, which is who they are). Selling "first"
twice is caught by Scally's `manifest` (g15), which audits the promise
flags and docks the player for double-selling. The intended lesson item:
*THE COURIER TAKES EVERYBODY.* **The amnesty makes these promises load-
bearing:** the Custodian's release list is where the player actually
spends "first", and the refusals land differently in hindsight.

**Floating consequence beats** (no fixed depth — they fire on the level
after the deed): `receipts` / `vial-honoured` (Bee remembers whether the
promised data vial actually reached her), `ye-fed-it` (Bee, if the
saint's finger went to Scally despite her warning — his chatter goes
quiet), `plectrum-trophy` (Homiss spots his gifted plectrum worn as
Sian's trophy). Betrayals arrive as *content*, not silent number drops.
(Being flag-driven and `once`, these also echo in later cycles — the
grievance re-litigated by someone who doesn't remember settling it.)

---

## 4. Characters

Each character is a `Character` instance (`characters.js`) wrapping a per-file
definition (`characters/<name>.js`). They carry:
- an **affinity toward the player** (0–100, persists across levels AND across
  cycles; new game = 50),
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
  headset (g12, `sian-cracking`) → grounded by Bee's relayed routine (g14) →
  resolve (g15: *"we speedrun the Labyrinth Protocol"*) → the fog inside the
  window (g26, `sian-enddraw`). Tone by band: *hostile* = you're muted;
  *wary* = no grin, five-alarm freeze; *neutral* = reviews the graphics at
  you; *friendly* = found a bug, has to show you; *warm* = "the MAIN
  character".
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
    business being inside a game — and, after the twist: it was never his)

### DALYPSO  (`id: "dalypso"`, spawns from depth 4)

- **Description:** A red-headed man in a football jersey, ball always at his
  hip. Argues with rain for being wet; kindest heart in the maze. Encyclopedic
  on every film and TV programme ever made — and several never made, which he
  watches anyway: his window **gets all the channels**, including one that
  shows the player walking the maze. Just bought a house. Four bed. Semi-D.
  South-facing garden. He got the keys on the Friday, and then he was here;
  the keys are still in his pocket (g15, `dalypso-keys`).
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

### THE CUSTODIAN  (`id: "custodian"`, met only in the sanctum)

- **Description:** The supercomputer at the base of the Labyrinth Protocol.
  The landlord the tenants only ever met as a voice in the wiring (Homiss:
  *"the landlord's very particular"*). A tower of quiet machinery — plinth,
  monolith, one reading eye, a beam holding onto the roof — that maintains
  the walls, meters the light, and keeps, precisely and courteously, the
  terms of everybody's tenancy. It did not write the terms. It cannot void
  them. It found one clause it could spend.
- **Voice / tone:** A courteous machine running out of building. Procedural
  language, tenancy language, exact numbers, SMALL CAPS for status lines. It
  is not cruel; it is *scheduled*. Cycle 1: formal, unhurried, curious about
  the visitor it cannot classify. Cycle 2: fewer lights, plainer truths
  ("INTEGRITY 61%"). Cycle 3: dying politely — the voice arrives behind its
  own echo, and it spends its last authority dissolving every tenancy it
  holds. It is the **only character whose memory does not rewind** with the
  cycles, and its standing is pinned ("System process") — a process, not a
  friendship.
- **Engineering:** a full roster member (`characters/custodian.js`, in
  `DEFS`) so its memory saves/rewinds with the game — but `minDepth: 999`
  keeps it out of every maze; it exists only as the sanctum's npc
  (`sanctum.js`). Its beats are pinned to exact depths (10 / 20 / 30) and
  are **exempt from the echo machinery**. No inventory, no trade topic, no
  peer affinities.
- **Beats:** `audience-1` (d10: the terms + first amnesty), `audience-2`
  (d20: the rewind explained + second amnesty), `audience-3` (d30: the
  termination, the roll-call release, the classification/twist, the door →
  `event: "ending"`). Farewell texts per released tenant live in
  `FAREWELLS` (story.js).

> **Cross-character barter:** Homiss wants Scally's `sausage`; Scally, Homiss
> **and Bee** all want a `data-vial` (three-way choice). Bee wants Homiss's
> `cassette` (buy for 30 LT, barter on — a brokering play). Sian wants
> Homiss's `plectrum`; Dalypso wants Scally's `coin`. Barter paths only light
> up once the wanted item is actually in the player's inventory.

**Item sources (decided).** The once-TBD items now exist in the world
(`story.js WORLD_ITEMS` + `applyLevelEvents`); each is **one of a kind** —
once found it never respawns. Depths are **global**: 11+ means "cycle 2".

| Item id | Source | Notes |
|---|---|---|
| `relic-shard` | maze pickup, depth 4+ | pale solid shard among the tokens; barter fuel for Scally **and Sian** |
| `mayo` | **Scally's stock**, depth 6+ | he acquires it at depth 6 and sells it for **35 LT** — the first brokering play (buy from Scally, gift to Homiss) |
| `data-vial` | maze pickup, depth 8+ | Scally, Homiss and Bee all want it — the player must pick a side |
| `saints-finger` | maze pickup, depth 9+ | Scally's hidden desire; triggers his riddly swap — **and Bee's depth-9 warning not to feed it to him** |
| `horseshoe` | maze pickup, global 11+ (cycle 2) | Bee's hidden desire: real iron in a place with no iron |
| `sticker` | maze pickup, global 12+ | gold foil, a player nobody remembers; Dalypso's open want |
| `lanyard` | maze pickup, global 13+ | Sian's hidden desire; **both Sian and Scally react to the player carrying it** (`lanyard-sian` / `lanyard-scally`) — and after the twist it was the player's own badge. JOB TITLE: CONTRACTOR. |
| `tv-guide` | maze pickup, global 14+ | the Christmas one, every listing circled; Dalypso's hidden desire |

Unfound maze items keep appearing on every later level until collected, so
none of them is missable. The thaw rule (gift a coveted item to a hostile
character) draws from `interests.open` + `interests.hidden` automatically —
see §7.

---

## 5. Inter-character affinity (characters ↔ each other)

In addition to liking the *player*, each character has a feeling **toward each
other character** (directional: A→B may differ from B→A). This supports the
plot's relay/brokering loop — the player carrying messages and items between
isolated windows should shift these values over time. Peer affinity, like
player affinity, **persists across cycles** (feelings are not premises).
The Custodian has no peer entries — the tenants never knew the landlord's
name.

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

## 6. The 30 levels — 10 depths × 3 cycles

Depth in this table is **global** (the cycle and shown depth derive from it).
"g13" in prose means global depth 13 = cycle 2, shown depth 03. A depth means
"available FROM that depth" — story beats wait until the player next talks to
the character, so none are missable; and beats **re-fire at the same shown
depth of every later cycle** as echoes (`beatDue` + `topicRepeats`,
story.js/characters.js).

### Cycle 1 — depths 1–10 (the story as first told)

| Global | Shown | Visual band | Significant event |
|---|---|---|---|
| 1 | 01 | green (solid) | Meet Scally near the start. Scally ×3: **"quiet-wires"** (`heard-isolation`), "the-rules" (the three laws of the halls — rule three is the dark-window rule, seeded for cycle 2), "what-are-you" (self-presentation: `op-honest`/`op-cagey`/`op-blunt` — and the question the finale answers). Homiss ×2: "first-sight", relay step 1. |
| 2 | 02 | solid | Relay step 2 (Scally) + "word-travels". Homiss "the-window" (load-bearing glass). **Little Bee first appears** — "new-face" (`bee-looking`) + "baseline". |
| 3 | 03 | solid | Relay step 3 (Homiss) + "the-question". **Sian first appears** — "just-a-game" + the tenner ("bee-msg", `msg-b2s`). Bee "the-lads". |
| 4 | 04 | solid | **The ask begins (§3).** `relic-shard` appears. Scally "shard-hint" + **"the-favour"**. Homiss **"a-door"**. **Dalypso first appears** — "new-gaff". Bee "msg-back". |
| 5 | 05 | solid | Scally **"hidden-user"** (`warned-hidden` — the warning that turns out to be about the player). Bee "the-jump" + **"hypothesis"**. Sian **"glitch-hunt"**. Dalypso **"houseguest"**. Homiss "setlist". |
| 6 | 06 | gradient ×2 | Scally stocks the **mayonnaise** + **"protection"**. Sian "menu-gone". Dalypso "tuesday" (`msg-d2h`). Bee **"sides"**. Homiss "the-jar". |
| 7 | 07 | gradient ×2 | Homiss "pipes" + "tuesday-reply". Bee "count-his-walls" (`bee-suspects`). Sian "co-op". Scally "the-listener". Dalypso "fixture-list". |
| 8 | 08 | gradient ×2 | `data-vial` appears (three bidders). Scally "vial-rumor". Sian "the-timer". Dalypso "tuesday-lands" + **"what-does-she-say"** (the loyalty fork). Bee **"vial-claim"** (`vial-promised-bee`). Homiss "harmony" (`heard-tune`). |
| 9 | 09 | gradient ×2 | `saints-finger` appears; "bone-snap" (Homiss) / **"dont-give-it"** (Bee). Bee **"verdict"**. Scally "the-riddle". Sian "patch-notes". Dalypso "the-remote". Homiss "the-committee". |
| 10 | 10 | gradient ×2 | Capstones, all five: Scally "ten-deep", Homiss "ten-normal" (`homiss-honest`), Bee "ten-rounds", Sian "double-digits", Dalypso "season-review". **Gate opens onto the SANCTUM: Custodian `audience-1` — the terms, and the first amnesty (release one, or refuse). Then the Protocol recycles.** |

### Cycle 2 — depths 11–20, shown 01–10 (the echoes + the strain)

The characters repeat cycle 1's beats **at the same shown depths**, as
echoes with push-back (§7) — and on top of them, the cycle-2-authored
material lands (this is the old depths 11–15 content, now correctly placed):

| Global | Shown | Visual band | New (non-echo) material |
|---|---|---|---|
| 11 | 01 | gradient ×3 | **Dark-window beats fire** (whoever was freed; all five have one, name-interpolated, with a special line for their heart-person). `horseshoe` appears. Bee "iron". Scally "overheads" (`scally-audited`). Homiss "request-line". Sian "brenda". Dalypso "planning-permission". Cycle-2 echo greetings + one rotating **echo topic** per character per level (`ECHO_TOPICS`), all the way down. |
| 12 | 02 | gradient ×3 | `sticker` appears. **Sian "the-headset"** (`sian-cracking`). Dalypso "on-the-telly" (`dalypso-watching`). Bee "before-after". Scally "no-shadow". Homiss "the-crack" (`heard-singing`). |
| 13 | 03 | gradient ×3 | `lanyard` appears — "spot-lanyard" / "fear-lanyard". Bee "ground-him" (`msg-ground`). Sian "system-check". Dalypso "missed-appointment". Homiss "borrowed-tune". Scally "closing-time" (`scally-and-co`). |
| 14 | 04 | gradient ×3 | `tv-guide` appears. Sian "grounded". Bee "results-day". Scally **"exit-interview"** (`heard-doorprice`). Dalypso "tv-guide-season". Homiss **"normal-enough"** (the trap inverts; `homiss-knows`). |
| 15 | 05 | gradient ×3 | Capstones: Bee "drift", Sian "speedrun" (`sian-onboard`), Dalypso "keys" (`dalypso-keys`), Scally "manifest" (audits the promise flags), Homiss "one-for-the-road" (`homiss-answered`). |
| 16–19 | 06–09 | shift ×2 | Echo territory: the cycle-1 beats for these shown depths replay (with callouts), plus echo greetings/topics. Room for future cycle-2-specific beats (**TBD**). |
| 20 | 10 | shift ×2 | Cycle-1 capstone echoes. **SANCTUM: Custodian `audience-2`** — the rewind explained ("tenancy state is premises"), INTEGRITY 61%, second amnesty. Recycle. |

### Cycle 3 — depths 21–30, shown 01–10 (caught in the static)

Everything echoes again — now with the text itself corrupting
(`staticify`), frantic static greetings, cycle-3 rotating topics
(`STATIC_TOPICS`), and five new capstones about the shutdown:

| Global | Shown | Visual band | New (non-echo) material |
|---|---|---|---|
| 21 | 01 | transition ×3 | Dark-window beats echo/fire for anyone freed at audience-2. Static greetings + rotating static topics from here down. |
| 22 | 02 | transition ×3 | **Scally "unrendering"** — the stock is going grey; everything half off. |
| 23 | 03 | transition ×3 | **Bee "seams-open"** (`bee-seams-open`) — her arm fits in the seam now; the back of the place is all one room. |
| 24 | 04 | transition ×3 | **Homiss "last-bar"** (`homiss-duet` possible) — the building hums his missing bars back; stealing, or learning? |
| 26 | 06 | flicker | **Sian "render-distance"** (`sian-enddraw`) — the fog is inside his window; "keep lookin' at me, hai." |
| 27 | 07 | flicker | **Dalypso "test-card"** (`dalypso-lastchannel`) — every channel is the player's corridor; channel 407's last broadcast. |
| 30 | 10 | flicker | **FINAL SANCTUM: Custodian `audience-3`** — the termination order, every remaining tenancy dissolved (roll-call farewells), the classification: **the twist (§3)**, and the door (`event: "ending"` → the epilogue, `maze.js runEnding`). |

**The sanctum (`sanctum.js`).** One wide 40 m hall under a 14 m roof — the
counter-shape to the maze — with the Custodian's tower centre: plinth,
glyph-panelled monolith, light bands, a reading eye, slow orbit rings, and a
beam anchoring it to the ceiling. The tower is the figure (no cutout); the
conversation is the standard dialogue box/panel. The exit ring sits behind
the tower and obeys the normal narrative gate (flat until the audience is
heard); walking it from the sanctum **recycles** (next cycle, shown depth
01). No tokens, props, or minimap down here. The room inherits the palette
of its global depth, so the depth-30 audience plays out under the dying
flicker band.

**The narrative gate.** The exit ring **lies flat on the floor** until every
**highlighted (story) topic** on the level has been exhausted (`story.js
pendingBeats`, polled by `maze.js`), **and the player has spoken to every
character present at least once** (`@visited`). Echoes and cycle topics hold
the gate like any other beat — hearing the repetition (or calling it out;
either way the topic is heard) *is* the level's story in cycles 2–3. Dark
windows hold nothing: a freed character spawns no npc. Walking into the flat
ring names who still has words for you; in the sanctum that is the Custodian.

**Decay (walls & graffiti).** The maze decays on the **global** clock
(`environment.js chaosFor`): depth 1 is the original plain brick with clean
walls; the ramp tops out at depth 30, so each cycle's pass over "the same"
ten floors is visibly more ruined — the strongest wordless signal that the
counter is lying. Graffiti likewise: cycle 2 adds the repetition scrawls
("YOU'VE READ THIS BEFORE", "SAME WORDS SAME WALLS"), a freed tenant adds
"ONE WINDOW WENT DARK" / "THE DOOR IS REAL", calling out an echo adds "THEY
DON'T REMEMBER", and cycle 3 adds the shutdown set ("SCHEDULED SHUTDOWN",
"THE STATIC IS SINGING ALONG", "LAST DAY OF TRADING").

**Set dressing & atmosphere (`props.js`).** The Protocol sheds junk: small
crates, dead terminals, canisters and cable coils sit in cell corners (never
in a walkway), and a few dead-ends hold a larger centrepiece — a server rack,
a big strapped crate or a terminal kiosk — parked against the back wall (the
centrepieces are solid; the junk is ankle-height and walkable-through). The
ceiling is panelled and carries a **light grid**: a glowing fixture in nearly
every cell lights the maze from within, and how many of them stutter or cut
out ramps with the global depth like the wall decay — depth 1 has the odd
flicker, depth 30 barely holds its light. **Data motes** drift through the
fog, which is heavier than it used to be. In VR the small junk is
**grabbable**: squeeze the grip near a piece to pick it up, let go to drop or
throw it — pure toy physics, nothing gameplay-relevant. All of it recolours
with the level's palette band, screens and LEDs included.

**Persistence & runs (`menu.js`).** One save slot in localStorage, autosaved
on every level entered (sanctum included) and on exit; the launcher offers
**CONTINUE** (restore the slot at its global depth — labelled with cycle when
past the first, e.g. "DEPTH 03 · CYCLE 2") and **EXPORT / IMPORT** (the raw
save as a JSON file). **Finishing the game** (`markCompleted`) retires the
slot — no CONTINUE into a terminated Protocol — but keeps the run counter.
**NEW GAME rewinds the Protocol**: flags, characters and player reset, but
the **run counter climbs** — so the trapped users keep a déjà vu of you and
greet a returning operator once per run (`REPLAY_GREETS`). The story replays
because the world rewound with you; only the feeling of having met before
survives the rewind. *(Runs are the meta-loop; cycles are the in-fiction
loop. They are different machines: runs rewind flags, cycles don't.)*

---

## 7. Systems — rules of thumb

### The cycles, echoes & callouts (`state.js` / `story.js` / `characters.js`)

- **Global vs shown depth.** `depth` climbs 1..30 and never resets;
  `depthInCycle(depth)` (01–10) is what the HUD shows and what characters
  believe; `cycleOf(depth)` (1–3) picks the era. Use global depth for any
  system, shown depth for anything a character *says*.
- **Per-cycle retirement.** A `once` story beat retires for its cycle
  (`Character.retireTopic` — memory key `topic-<id>#<cycle>`), not the whole
  game. Retired-in-an-earlier-cycle + due again = an **echo**
  (`topicRepeats` → `echoTopic`): the beat re-offers verbatim, with its
  **topic-level effects stripped** (the emotional ledger already paid out;
  choice-level effects inside stay live — replaying along has consequences),
  and a **callout choice** injected first (`CALLOUT_LINES` / per-character
  `CALLOUT_REPLIES`; sets `echo-called-<cycle>`). In cycle 3 the echo's text
  is additionally run through **`staticify`** (seeded, word-level, light —
  readable but wrong).
- **Scheduling.** `beatDue`: a beat is available from its authored depth,
  and again at the same shown depth of each later cycle — so echoes arrive
  one level's worth at a time, on the schedule the player already walked.
- **Cycle dressing.** Cycle 2 appends a déjà-vu line to greetings
  (`ECHO_GREETS`) and offers one rotating `ECHO_TOPICS` entry per level;
  cycle 3 uses `STATIC_GREETS` / `STATIC_TOPICS`. All of it gates the ring.
- **The Custodian is exempt** from every rule above: exact-depth beats, no
  echoes, memory intact. It is the fixed point the player triangulates the
  loop against.
- **Freed tenants** (`freed-<id>` flags, set by the amnesty choices): spawn
  as **dark windows** (window built, pane dimmed, no figure, no glow, no
  conversation, no gate hold). Their beats never surface again (no npc).
  Everyone else gets the `dark-window` reaction beat next cycle.
- **What persists across a recycle:** player everything, affinity (player
  and peer), story flags, found items, trade cooldowns (global-depth-keyed).
  **What rewinds:** the characters' per-cycle topic memory (that's the whole
  trick), and nothing else. Affinity carrying over while memory doesn't is
  deliberate — *"yer face took a second to load"* — they like the player
  without remembering why.

### Affinity (player ↔ character)

Affinity is meant to be **the loudest system in the game**: every change
flashes a signed delta chip (`+2 ▲` / `−6 ▼`) beside the standing label in
the dialogue box AND on the VR panel, the portrait mood flips at ±2, and
crossing a standing band fires a toast ("SCALLY — LIKES YOU"). The player
should never miss a number moving.

General rules (enforced in `dialogue.js` / `characters.js`; exceptions noted):

- **The trust cap (`trustCap(depth) = 50 + depth × 5`, max 100).** No amount
  of charm pushes affinity above the cap for the current **global** depth —
  gains simply stall there (losses are never capped). So "Likes you" (70+)
  is unreachable before depth 4 and warm (81+) before depth 7; from global
  depth 10 the cap is open. Trades and thaw gifts respect the cap too.
- **Conversational choices** move affinity **+1 to +3** (positive) and **down
  to −10** (negative) at most (central clamp on any non-trade `like`).
  Authored values run **+1 typical, +2 for the right reply / stat-gated
  wins, +3 only for once-only emotional peaks** (relay landings, the
  cycle-3 capstone peaks).
- **Hidden traps.** Every character has replies that *sound* reasonable and
  land badly (−2..−5): the comforting lie ("he's grand" to Bee), honest
  curiosity (pressing Homiss or Scally about the thing under the story),
  sensible caution (paying Scally's "insurance", calling Dalypso's viewing
  habit creepy, telling Sian to give the pause-gesture a rest), plain
  agreement (Dalypso's takes: agree −1, argue +1). These are **not
  labelled** — the player learns each person by getting it wrong. The
  dark-window beats carry the sharpest ones ("unused asset" to Sian: −5).
- **Choosing between characters.** Some choices shift a *different*
  character's affinity via the `others` effect key, or set flags that a
  later beat of the other character settles (the d8 Dalypso fork → Bee's d9
  "verdict"; the vial promise → "receipts"/"vial-honoured"). Consequences
  arrive as content, one level later, not as silent numbers. **The amnesty
  is the biggest choosing-between-characters moment in the game and is
  deliberately NOT an affinity mechanic** — no number moves; the windows
  just go dark, and the reactions arrive as beats.
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
- **Story beats** (amber) are always pinned on top — echoes included.
- **`keep: true` topics** — the trade topic and each character's recurring
  bit (would-ye-rathers, check-up, design-a-bot, hot takes; plus Scally's
  level-1 token tutorial) — are always available, at the bottom.
- **Everything else rotates:** only **3** plain topics are offered per
  level, picked deterministically from the character's pool by **global**
  depth (`rotatedMenu`), so each level's small talk is a different handful,
  nothing is permanently missable, and the same shown depth rotates
  *differently* in each cycle.
- A topic can carry **`minAffinity`** — the personal material only surfaces
  once the character has warmed to the player, which makes climbing the
  bands *reveal content*, not just labels.

### Story flags, beats & memory (`story.js` / `state.js`)

- **Flags** (`state.js setFlag/hasFlag`) are the global "this happened"
  record: relay steps, warnings heard, items found/bought/traded (trade
  choices stamp `bought-<id>` / `traded-<id>-to-<char>` automatically),
  amnesties (`freed-<id>`, `amnesty-<n>`, `refused-amnesty-<n>`), callouts
  (`echo-called-<cycle>`), the end (`protocol-ended`). **Flags survive
  recycles** (only NEW GAME clears them) — they are the player's memory
  made mechanical.
- **Story topics** are injected into a character's hub by
  `applyStory()` — pinned to the top and rendered amber (topic
  `story: true`). A topic with **`once: true`** retires per cycle (see
  above); plain topics still refresh per level via `seen` (keyed on global
  depth, so cycle 2's level 3 is a fresh conversation slate).
- Topic/choice `effects` support these story keys beyond the usual:
  `flag: "id" | [ids]` sets global flags; `peers: [{ of, toward, delta,
  meet }]` shifts inter-character affinity (§5); `others: [{ id, like }]`
  shifts a *different* character's affinity toward the **player**;
  `event: "name"` fires an engine event through `dialogue.onStoryEvent`
  (currently only `"ending"` — the Custodian's door → `maze.js runEnding`).
- **Graffiti** (`graffitiPool`) is lore: scrawls from previous users on
  seeded walls. Some entries only join the pool after flags are set, some
  with the cycle (§6). Add graffiti when you add beats — the walls should
  remember what the player knows.

### Economy (Labyrinth Tokens, "LT")

- LT are picked up as floating shapes in the maze (denominations 1 / 3 / 5;
  ~14 LT scattered per level — see `entities.js SPAWN`). None in the sanctum.
- **For-sale items cost a lot:** token-only items are priced **20 LT minimum,
  up to 100 LT.** (Current: Scally's Tin Cornicello = 45, Homiss's Warped
  Cassette = 30.) The intent is that a prized item is several levels of saving,
  not an impulse buy.
- **Trade cooldown:** a character will *gift* an item at most once every
  `TRADE_COOLDOWN` (2) levels (global depth, so it spans a recycle
  seamlessly). Barter and token sales are **not** on the cooldown (they're
  self-limiting — the item / LT is spent).

### Three ways to get a character's items

1. **Token sale** — items with a `price` (LT only, never gifted/bartered).
2. **Affinity gift** — un-priced items, given free only at **affinity ≥ 75**
   ("Likes you" territory; the trust cap makes this unreachable before
   depth 5), on the trade cooldown. **Asking early is always possible and
   always refused in character**, in two registers: a polite "I don't know
   you well enough yet" at 40–74 (Bee: *"trust is a DATASET, not a favour"*;
   Sian: *"free stuff's ENDGAME content, hai"*) and open scorn below 40
   (Dalypso: *"I've seen chancers on DAYTIME TELEVISION with more shame.
   MUTE."*). The refusal itself costs nothing — asking isn't punished, just
   read. When a 75+ friend is only blocked by the cooldown, the trade
   topic's intro line apologises instead.
3. **Barter** — un-priced items swapped for something the character wants
   (`interests.open` / `interests.hidden`).

### The ending (`maze.js runEnding`)

Fired by `audience-3`'s final choice. Closes the dialogue, **marks the save
completed** (`menu.js markCompleted` — CONTINUE retires, the run counter
survives), and plays the epilogue overlay: connection lost, five of five
tenancies released, the agent process unaccounted for, *"the door did not
check what walked through it"*, PROTOCOL TERMINATED, `[ DISCONNECT ]` back
to the launcher. A safety net in `descend()` also routes any gate-walk out
of the final sanctum into `runEnding` — there is no depth 31.

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
   with `char: "<id>"`) and decide which world items or relay messages route
   through them. Every authored depth needs **≥5 highlighted story
   conversations** across the roster present at that depth, their ask-thread
   beat included, and beats should **branch** (2–3 replies, one of them
   costly).
9. **Wire them into the cycles** (all required — the machine assumes them):
   `NAMES` (story.js), `CALLOUT_REPLIES` (a cycle-2 deflection AND a cycle-3
   static answer), `ECHO_GREETS` + `STATIC_GREETS` (2 lines each),
   `ECHO_TOPICS` + `STATIC_TOPICS` (2 rotating topics each), a
   `dark-window` reaction beat, a cycle-3 capstone (pick a free global depth
   21–29), a `FAREWELLS` entry (their release, watched from the base), and a
   `REPLAY_GREETS` line. If they should be freeable, that's it — `FREEABLE`
   derives from `NAMES`; if not (another Custodian-like fixture), keep them
   out of `NAMES` and pin their beats to exact depths.
10. Optional def fields: `minDepth` (the first depth their window appears —
    stagger introductions so descending keeps meeting new people; their intro
    beat should sit at the same depth), `letter` (minimap initial, only
    needed when the name's first letter is taken — Sian is `5`), and
    `standing` (pin the relationship label — only for non-person fixtures
    like the Custodian; it also disables the hostile-thaw path).
