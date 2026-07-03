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
Homiss, CHA/INT with both). A new game starts at the **operator registration**
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

**TBD — the main plot spine.** The beat-by-beat story (who the hidden user is,
what changed to isolate the characters, what the rewrite actually requires, the
midpoint turn, the ending) is not yet decided. Depths 1–10 are authored (see
§6); the spine picks up from there.

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

> **Cross-character barter:** Homiss wants Scally's `sausage`; both want a
> `data-vial`. Barter paths only light up once the wanted item is actually in
> the player's inventory.

**Item sources (decided).** The once-TBD items now exist in the world
(`story.js WORLD_ITEMS` + `applyLevelEvents`); each is **one of a kind** —
once found it never respawns:

| Item id | Source | Notes |
|---|---|---|
| `relic-shard` | maze pickup, depth 4+ | pale solid shard among the tokens; barter fuel for Scally |
| `mayo` | **Scally's stock**, depth 6+ | he acquires it at depth 6 and sells it for **35 LT** — the first brokering play (buy from Scally, gift to Homiss) |
| `data-vial` | maze pickup, depth 8+ | both characters want it — the player must pick a side |
| `saints-finger` | maze pickup, depth 9+ | Scally's hidden desire; triggers his riddly swap |

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

| From → To | Affinity (0–100) | Note |
|---|---|---|
| Scally → Homiss | 58 | Knows him; cordial but always sizing him up. |
| Homiss → Scally | 64 | Likes the wee fixer; slightly warmer than it's returned. |

> **TODO (only 2 characters so far):** As each new character is added, fill in
> their pairings here **and** in `BASE_PEER_AFFINITY`. Deliberately leave **some
> pairs blank** (= they've never met) so "introducing" them becomes a player
> action (`meetPeer`). Decide the relay/brokering rules: how much relaying a
> message or moving an item shifts peer affinity, and whether peer affinity
> gates anything the player can do.

---

## 6. Levels 1–50 — significant events

The visual band for each level is fixed by the palette. Depths 1–10 are
**implemented** in `story.js` (`STORY_TOPICS`, `WORLD_ITEMS`,
`applyLevelEvents`); keep this table and that file in sync. A depth here
means "available FROM that depth" — story beats wait until the player next
talks to the character, so none are missable. 11+ remain **TBD**.

| Lvl | Visual band | Significant event |
|---|---|---|
| 1 | green (solid) | Meet Scally near the start. **"quiet-wires":** the windows went silent (`heard-isolation`). Relay step 1 (Homiss) opens the same level (see §3). |
| 2 | solid | Relay step 2 (Scally) unlocks from here (min-depth 2 — one relay step per level, so the narrative gate paces the chain). |
| 3 | solid | Relay step 3 (Homiss) unlocks from here (min-depth 3). |
| 4 | solid | `relic-shard` starts appearing in the maze. Scally "shard-hint": the maze sheds pieces of the old Protocol. |
| 5 | solid | Scally **"hidden-user"** warning: someone else walks the halls — *count the walls* (`warned-hidden`; unlocks graffiti). |
| 6 | gradient ×2 | Scally stocks the impossible **jar of mayonnaise** (35 LT) + advertises it ("impossible-stock"). The brokering play. |
| 7 | gradient ×2 | Homiss "pipes" (needs relay done): he used to hear the others through the walls. His denial thins. |
| 8 | gradient ×2 | `data-vial` starts appearing. Scally "vial-rumor". Both want it — the player picks a side. |
| 9 | gradient ×2 | `saints-finger` starts appearing. Homiss "bone-snap" if the player carries it. Scally's riddly swap awaits. |
| 10 | gradient ×2 | Capstones: Scally "ten-deep" (the operators who stopped talking; `depth10`), Homiss "ten-normal" (the grin doesn't reach the eyes). |
| 11 | gradient ×3 | TBD |
| 12 | gradient ×3 | TBD |
| 13 | gradient ×3 | TBD |
| 14 | gradient ×3 | TBD |
| 15 | gradient ×3 | TBD |
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
the same list, so they can never drift apart). Walking into the flat ring
says who still has words for you ("THE WAY DOWN IS NOT YET OPEN — SPEAK WITH
SCALLY"); once the level's story is done the ring rises and descending works
as ever. This includes the deep-zone loop conversations — below depth 30 the
maze only lets you descend if you keep talking, which is exactly what Scally
warned about at depth 10. A topic can opt out with `gate: false`. Relay
steps 2 and 3 carry min-depths 2 and 3 so the gate paces the exchange to one
step per level rather than demanding it all on depth 1.

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

General rules (enforced in `dialogue.js`; exceptions noted):

- **Conversational choices** move affinity **+1 to +3** (positive) and **down to
  −10** (negative) at most. A central clamp enforces this on any non-trade
  `like` effect, so individual choice values can't blow past it. Affinity should
  climb **slowly** — it takes several visits to move a character up a band.
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

### Story flags, beats & memory (`story.js` / `state.js`)

- **Flags** (`state.js setFlag/hasFlag`) are the global "this happened"
  record: relay steps, warnings heard, items found/bought/traded (trade
  choices stamp `bought-<id>` / `traded-<id>-to-<char>` automatically).
- **Story topics** are injected into a character's hub by
  `applyStory()` — pinned to the top and rendered amber (topic
  `story: true`). A topic with **`once: true`** retires for the whole game
  when selected (per-character `memory`); plain topics still refresh per
  level via `seen`.
- Topic/choice `effects` support two story keys beyond the usual:
  `flag: "id" | [ids]` sets global flags; `peers: [{ of, toward, delta,
  meet }]` shifts inter-character affinity (§5) — deliveries in the relay
  chain are what move those numbers.
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
7. Keep conversational `like` effects within **+1..+3 / −10**.
8. Wire them into the story: add their beats to `story.js` (`STORY_TOPICS`
   with `char: "<id>"`, plus `LOOP_GREETS` / `LOOP_TOPICS` / `REPLAY_GREETS`
   entries so the deep zone and replays don't fall silent around them), and
   decide which world items or relay messages route through them.
