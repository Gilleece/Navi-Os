/* ============================================================
   MAZE.EXE — Sian's story beats
   The authored STORY_TOPICS entries for Sian, split out of
   story.js so each character's plot lives in one place. This is pure data:
   a factory handed the story engine's helpers (hasFlag, NAMES, freedIds, trappedIds, releaseChoices, refuseChoice, twistNode, FINAL_DEPTH)
   so it never has to import story.js — no module cycle. story.js merges the
   result back into STORY_TOPICS in the same per-character order, so the
   narrative gate and dialogue are unchanged. Beat IDs/flags must not change
   (existing saves key on them).
   ============================================================ */
export function sianBeats(H){
  const { hasFlag, NAMES, freedIds, trappedIds, releaseChoices, refuseChoice, twistNode, FINAL_DEPTH } = H;
  return [

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

  /* -- relay . Sian: five things (min-depth 14) -- */
  { char: "sian", depth: 14,
    available: () => hasFlag("msg-ground") && !hasFlag("sian-grounded"),
    make: () => ({
      id: "grounded", story: true, once: true,
      label: "Bee says: five things you can see. Four you can hear. And...",
      effects: { like: +3, flag: "sian-grounded", peers: [{ of: "sian", toward: "littlebee", delta: +4 }] },
      node: { text: "*He's on it before ye finish, like a drownin' man findin' the ladder.* Five things: the window. Your face. The fog. The wall. Me hands. *breath* Four I can hear: you. The hum. Me own heart. An' the maze doesn't ECHO, that's four, it should an' it doesn't, filin' that away. *breath* Three I can touch: glass. Frame. ...Brenda's servo, in me pocket. *The shoulders come down an inch at a time.* An' breathe. *He breathes.* ...an' remember the long acre. *The laugh that comes out of him is shaky an' real an' entirely his own.* Aye. The long acre. That's ours. Yez'll not be gettin' it out of me, so don't ask, hai. *He straightens up.* Tell her I'm grand. Tell her I'm GRAND. An' tell her the tenner's up to twelve fifty now, with the interest. She'll understand. It's a Cavan thing." } }) },
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

  { char: "sian", depth: 15,
    available: () => hasFlag("sian-grounded"),
    make: () => ({
      id: "speedrun", story: true, once: true,
      label: "How are you holding up, Sian?",
      effects: { like: +3, flag: "sian-onboard" },
      node: { text: "*He's waitin' for ye, planted, like a man over a workbench.* Been thinkin'. THINKIN' thinkin'. *A breath.* If it's a game, an' I'm not sayin' it is anymore, hai, it's got no pause, no timer, no logout. Whoever built it never meant for anyone to LEAVE by the front door. Bee'd call that a design decision. Scally'd call it a purchase order. I call it *the grin comes back, his own one, with somethin' new an' hard in it* a CHALLENGE RUN, hai. Any world with a bottom has a door at the bottom. Devs can't help themselves. I WAS one. So that's the plan: you, me, an' the rest of these eejits I love. We find the base level of the Labyrinth Protocol *first time he's ever said its name, an' he says it like a boss he intends to beat* an' we speedrun it to the credits. World record. No skips. Everybody comes." } }) },

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
        ] } }) }
  ];
}
