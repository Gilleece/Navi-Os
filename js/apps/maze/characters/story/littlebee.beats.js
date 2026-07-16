/* ============================================================
   MAZE.EXE — Little Bee's story beats
   The authored STORY_TOPICS entries for Little Bee, split out of
   story.js so each character's plot lives in one place. This is pure data:
   a factory handed the story engine's helpers (hasFlag, NAMES, freedIds, trappedIds, releaseChoices, refuseChoice, twistNode, FINAL_DEPTH)
   so it never has to import story.js — no module cycle. story.js merges the
   result back into STORY_TOPICS in the same per-character order, so the
   narrative gate and dialogue are unchanged. Beat IDs/flags must not change
   (existing saves key on them).
   ============================================================ */
export function littlebeeBeats(H){
  const { hasFlag, NAMES, freedIds, trappedIds, releaseChoices, refuseChoice, twistNode, FINAL_DEPTH } = H;
  return [

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

  /* -- depth 5 . Bee: the hypothesis (her ask, dressed as methodology) -- */
  { char: "littlebee", depth: 5, make: () => ({
      id: "hypothesis", story: true, once: true,
      label: "*She's drawn something on the glass in the fog of her breath.*",
      effects: { like: +1, flag: "ask-bee" },
      node: { text: "*It's a column of boxes — windows — an' a wee stick figure walkin' down past them to a scribble at the bottom.* Workin' hypothesis. The render's thinnest at the bottom: the seams get wider every level down, I MEASURE them. A system's always cheapest where it thinks nobody goes. *She taps the scribble.* So: somethin' mobile — you, don't preen — reaches the substrate, an' the boundary conditions that keep five people filed like SLIDES get rewritten. *The next bit costs her:* I can't test it meself. First time in me life the methodology needs somebody else's legs. That's me askin'. I'm not doin' a speech about it.",
        choices: [
          { text: "Then I'm your legs. Let's prove it.", effects: { like: +2 },
            next: { text: "*She nods once, brisk, an' has to do a wee bit of housekeepin' with her face before she turns back.* ...grand. Cohort of two. You walk, I measure, an' between us we make this place into DATA. Log everythin': seams, sounds, anythin' the walls do twice. Yer a research assistant now. Worst pay in science, but yer name goes on the paper. Second author. Don't push it." } },
          { text: "I'll get you out of there, Bee. I swear it.", effects: { like: -2 },
            next: { text: "*Her jaw sets like a gate closin'.* Don't SWEAR things at me. A promise is a hypothesis with no data an' a sample size of heartbreak. *She softens exactly one degree.* ...I know how ye meant it. But down here I run on EVIDENCE. So don't promise. Just keep showin' up at this window, level after level. THAT'S the statistic I'll bet on." } },
          { text: "And if the hypothesis is wrong?",
            next: { text: "*She looks at ye steady, an' there's respect in it.* Then we're wrong PROPERLY, with error bars, an' we form a new one. That's all science ever was: bein' wrong in decreasin' amounts. *Quieter.* ...but between us an' no clipboard: it's not wrong. I've seen the seams down there. Somethin' at the bottom is holdin' its breath." } },
        ] } }) },

  /* -- depth 10 . Bee: the cohort report -- */
  { char: "littlebee", depth: 10, make: () => ({
      id: "ten-rounds", story: true, once: true,
      label: "Ten levels. Time for the cohort report, doctor.",
      effects: { like: +1 },
      node: { text: "*She's had it drafted for days.* Cohort report, depth ten, no anaesthetic. *She ticks them off at speed.* SCALLY: functional, patter up three percent, which in him is a tell. HOMISS: stable-presentin', denial load-bearin' but STRESSED. SIAN: *one half-beat, the only one she takes* copin' via framework. NEXT. DALYPSO: unreadable through the glass — either a renderin' artefact or the most important fact in this buildin'. An' YOU. *She looks at ye properly.* Subject five. Ten levels in an' still ASKIN' us things instead of takin'. *She folds her arms.* Cohort assessment: frayin', fond, four-fifths trapped. Prognosis pendin' on subject five. No pressure. That was a lie. TOTAL pressure.",
        choices: [
          { text: "Then subject five had better not let the cohort down.", effects: { like: +2 },
            next: { text: "*The almost-smile makes it the whole way, briefly, like sun through a ward window.* ...good. Wear the pressure. It's LOAD, an' load is how ye know somethin' that matters is standin' on ye. *She turns back to her invisible charts.* Same time next level, subject five. Bring me somethin' the walls don't already know." } },
          { text: "And subject Bee? You skipped a name off that list.",
            next: { text: "*Caught. She stands very still, then gives it to ye straight.* ...subject B: instruments driftin' inside tolerances, sleep architecture a WRECK, emotional containment barely adequate. Runs on spite an' methodology, misses her horse, an' talks to a courier more than she plans to, because the courier's the only one down here who ISN'T behind glass. *She snaps the file shut with her voice.* There. Peer review complete. Quote me an' I'll deny the LOT." } },
          { text: "'Coping via framework'? That's all Sian gets?", effects: { like: -3 },
            next: { text: "*The stillness is instant an' total.* ...what would ye LIKE the entry to say? The LONG version? Where I chart the levels his 'hai' count started droppin'? Where I write down what happens to a mind like his when the framework goes, because I've MODELLED it, because modellin' is all I can do from inside a WALL?! *She rebuilds the clinical face one muscle at a time.* ...'copin' via framework' is the entry I can read out LOUD. The rest lives where I live. Don't audit my abbreviations, courier. Every one of them is a kindness to somebody. Mostly to me." } },
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
      node: { text: "Because they TELL me things, which puts them ahead of most of the population down here. *She moves a finger; yer eyes follow; she notes it.* This place runs on wetware — mine an' yours — an' hardware ye can't inspect degrades QUIETLY. So I take baselines. Reaction, recall, fluency. Every level, everyone I can reach, which as of the recent unpleasantness is: you. *A beat.* Yer my whole cohort now. Congratulations. Act like a decent sample size.",
        choices: [
          { text: "Baseline away, doctor. I'm all yours.", effects: { like: +2 },
            next: { text: "*Somethin' in her unclenches half a notch.* Right answer. First data point: sarcasm intact, compliance high, self-preservation pendin'. Come see me every level. I mean it. If yer numbers ever drift, I want to catch it while yer still YOU enough to be told." } },
          { text: "And who runs the tests on you?", effects: { like: +1 },
            next: { text: "*One second of complete stillness. Ye've stepped somewhere she didn't expect visitors.* ...I do. Same battery, same time, control an' subject in the one skull. TERRIBLE methodology, an' the best available. *She looks at ye a hair longer than she means to.* ...ask me that again some level. It's good for me an' I hate it." } },
          { text: "I'm not one of your lab rats.", effects: { like: -3 },
            next: { text: "*Flat as a chart with no pulse on it.* No. Lab rats get FED. *She folds her arms.* The maze is runnin' its own study on ye either way, an' its ethics board is worse than mine. I'm the one takin' notes on YOUR side of the glass. But suit yerself. Off ye trot. *She watches yer gait as ye go, an' writes somethin' down anyway.*" } },
        ] } }) },

  /* -- relay . Bee: the reply comes home (min-depth 4 paces the chain) -- */
  { char: "littlebee", depth: 4,
    available: () => hasFlag("msg-b2s") && !hasFlag("msg-s2b-done"),
    make: () => ({
      id: "msg-back", story: true, once: true,
      label: "Sian says: 'worth every penny.' And something about a big horse.",
      effects: { like: +3, flag: "msg-s2b-done", peers: [{ of: "littlebee", toward: "sian", delta: +3 }] },
      node: { text: "*The laugh is out of her before she can arrest it, a proper one, headlong. She turns away from the glass until it's dealt with.* ...aye. Well. *When she turns back the face is fixed, but the eyes haven't signed the paperwork.* The big horse. The eejit. *A breath.* He thinks it's a game, doesn't he. Course he does. *Then, fast and fierce, like she's givin' ye a dosage:* DON'T tell him different. Not yet. D'ye hear me? His brain's happy, an' a happy brain lasts longer down here. That's not sentiment, that's NEUROLOGY. Let him have it a while longer." } }) },

  /* -- depth 5 . Bee: what she came down here for -- */
  { char: "littlebee", depth: 5, make: () => ({
      id: "the-jump", story: true, once: true,
      label: "Why would anyone come into this place on purpose?",
      effects: { like: +2, flag: "bee-seams" },
      node: { text: "*For once she doesn't answer at speed. She looks down the corridor like it's a bad X-ray.* Because it was the trip of the century. The Protocol got passed round certain circles as the last word in psychedelics: direct synaptic render, no chemistry, no comedown. A trip ye could WALK AROUND in. Six years I'd spent watchin' other people's neurons on a monitor — so aye, I jumped. Eyes open. *A beat.* An' it was beautiful. The single most beautiful... an' then the doors didn't open. *She taps beside her eye.* Trip never ended. I still see the seams at the edges of things. An' lately *the voice goes flat* they're wider. Somethin's rerenderin' things down there, an' not for OUR benefit. Watch where the walls meet." } }) },

  /* -- depth 6 . Bee: sides (the first open tug-of-war over the player) -- */
  { char: "littlebee", depth: 6, make: () => ({
      id: "sides", story: true, once: true,
      label: "*She's watching you like a scale she's about to read.*",
      effects: { like: +1 },
      node: { text: "Right. Awkward one. Stand still. *She doesn't do preambles, so this is the preamble.* The wee man above us has started ACQUIRIN' things. Impossible things. An' when a market suddenly stocks miracles, ye ask where the supplier's standin'. Nobody knows where Scally's is. Includin' Scally, I'd wager. *She holds up a hand.* I'm not sayin' don't deal with him. I'm sayin': anythin' strange comes through yer hands — anythin' that makes the back of yer neck vote no — bring it PAST this window first. That's the ask. I'll know if ye haggle me down.",
        choices: [
          { text: "Deal. You get first look at anything strange.", effects: { like: +2, flag: "bee-first" },
            next: { text: "*She nods, one sharp dip, treaty signed.* Good. That's the supply chain SUPERVISED. *For a second the clinical face slips an' somethin' warmer looks out.* ...an' don't be thinkin' this is me against Scally. I LIKE the wee chancer. That's the problem. The things he's reachin' for lately, I want to see them before they see HIM. Yer not spyin'. Yer upstream quality control." } },
          { text: "I don't pick sides. I carry for everyone or no one.", effects: { like: -2, flag: "neutral-broker" },
            next: { text: "*A long exhale through the nose.* 'Neutral.' *She says it like a diagnosis she doesn't love.* Switzerland of the stairwell. Fine. Principled, even. But hear THIS much: neutral works grand until the day somethin' comes through yer hands that isn't neutral ABOUT US. On that day, wee courier, yer principle better know which way it jumps. *She turns back to her counts.* Off ye go. I'm not cross. I'm CALIBRATIN'." } },
          { text: "You want me to spy on Scally for you?", effects: { like: -3 },
            next: { text: "*Her head comes round slow, like a turret.* SPY. *One syllable, dropped from a height.* Did I ask what he SAYS? One secret out of that coat? I asked ye to show me DANGEROUS OBJECTS before they reach me FRIEND. That's not espionage — it's occupational health an' safety for people I love. *She turns away, genuinely stung.* ...that ye heard it as spyin' tells me somethin' about the company yer keepin' upstairs. NEXT patient." } },
        ] } }) },
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

  /* -- depth 8 . Bee: the vial claim (three bidders, one promise) --
     The promise is REMEMBERED: break it and "receipts" fires below. */
  { char: "littlebee", depth: 8, make: () => ({
      id: "vial-claim", story: true, once: true,
      label: "Everyone's suddenly talking about data vials.",
      effects: { like: +1 },
      node: { text: "Because everyone's suddenly USELESS about them. *She's pacin' her wee frame, two steps each way.* A data vial is somebody's MEMORY, distilled. A bottled yesterday. The wee man wants it for STOCK. Homiss wants it because it frightens him an' he keeps his frights close. An' I want it because it's the best diagnostic sample this place ever coughed up: real archived experience, uncorrupted, PRE-quiet. I could learn what the Protocol DOES to a mind. *She stops, direct.* If one comes through yer hands: I'm askin'. Openly. On the record. I've never begged for equipment in me LIFE, an' that's as close as I go.",
        choices: [
          { text: "If I find a vial, it's yours. My word.", effects: { like: +2, flag: "vial-promised-bee" },
            next: { text: "*She stops dead, an' ye watch her decide to believe ye. A visible event, like ice takin' weight.* ...right. Well. Grand. *She clears her throat an' re-becomes a professional.* For the record: witnessed, timestamped, filed. One (1) vial, contents unknown, consigned to DR. B., purpose: science. *The wee-est pause.* ...an' for the record that doesn't exist: thank ye. Words are the worst instrument I own an' those two are the best I've got." } },
          { text: "Highest bidder gets it. That's fair, isn't it?", effects: { like: -3 },
            next: { text: "*The pacin' stops. The temperature drops.* An AUCTION. For somebody's MEMORY. *She lets that sit until it's good an' uncomfortable.* Fair the way a coin toss is fair: fine for FOOTBALL, obscene for triage. The wee man'll outbid me. He can print margins; all I can print is FINDINGS. *She turns back to her counts, voice flat as a ward at 4am.* Do what ye like. But when yer sellin', ask the buyer what they want it FOR, an' see which answer ye can stand beside." } },
          { text: "What exactly happens to the vial in your hands?",
            next: { text: "*She brightens one degree. A methods question, the fastest way to her heart.* Comparative analysis. I run me own recall against the vial's. Where mine's soft an' the vial's crisp, THAT difference is the fingerprint of what this place does to storage. I can't examine me own corruption with the corrupted instrument. I need an outside copy of a yesterday. *She taps the glass.* It's not sentiment. It's CALIBRATION. ...though God knows whose yesterday it'll be. There's an ethics section I'll be writin' at three in the mornin'." } },
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

  /* -- depth 11 . Bee: iron (the horseshoe starts appearing here) -- */
  { char: "littlebee", depth: 11,
    available: () => !hasFlag("gave-horseshoe"),
    make: () => ({
      id: "iron", story: true, once: true,
      label: "*Mid-sentence, she loses her thread, staring at nothing.*",
      effects: { like: +1 },
      node: { text: "*She's half-way through a point about render latency when she just... stops. Her hands, without consultin' her, have shaped somethin' in the air. A curve, heels-up.* ...d'ye ever... *she catches the hands at it an' snaps them flat, too late* ...have ye come across anythin' IRON down there. Curved, like. Heavy. About the size of a... *the jaw sets* ...doesn't matter what size. Old thing. Farrier'd know it. *The stopwatch voice comes back up like a drawbridge.* Forget I asked. It's SENTIMENT, is what it is, an' sentiment down here is a leak in yer hull. NEXT topic. ...but if ye DID see one. Ye'd mention it. In passin'." } }) },

  /* -- relay . Bee: the grounding (min-depth 13 paces it) -- */
  { char: "littlebee", depth: 13,
    available: () => hasFlag("sian-cracking") && !hasFlag("msg-ground"),
    make: () => ({
      id: "ground-him", story: true, once: true,
      label: "It's Sian. He went looking for the headset's edge.",
      effects: { like: +2, flag: "msg-ground", peers: [{ of: "littlebee", toward: "sian", delta: +2 }] },
      node: { text: "*She goes completely still. One breath in through the nose, an' when she speaks it's a different voice entirely. The ward voice: slow, level, impossible to argue with.* Right. He found it. Okay. We knew he'd find it, an' that's data, an' data's fine. *The eyes are not fine. The voice does not consult them.* Listen now, because ye'll deliver this EXACTLY, word for word: 'Five things ye can see. Four things ye can hear. Three ye can touch. Then breathe, ye eejit, an' remember the long acre.' *She makes ye say it back. Twice.* The last bit's ours. Ye don't get to know what it means, an' if he tells ye, I'll have the both of ye. GO. Please. *The please costs her somethin'.* Go." } }) },

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
  /* -- depth 15 . the capstone trio -- */
  { char: "littlebee", depth: 15, make: () => ({
      id: "drift", story: true, once: true,
      label: "Fifteen deep. Give it to me straight, doctor.",
      effects: { like: +2, flag: "bee-drift" },
      node: { text: "*She almost smiles at the 'doctor'. Almost.* Straight, is it. Grand. *She holds up her own hand an' watches it like it belongs to a study group.* I run the battery on meself too. Every level, same as you. Reaction times. Recall. Five animals, no horses, harder than ye'd think when yer... me. *A pause with an edge on it.* The numbers are driftin'. Small. Slow. Inside the error bars, if I'm honest with the statistics, which I always am. *She folds her arms, an' the chin comes up like a challenge to the whole Protocol.* So here's the arrangement: you keep passin' MY tests, I'll keep passin' mine, an' if either of us ever stops, the other one isn't to say a WORD about it. Deal? ...that was a joke. *It wasn't.* Get down them stairs an' find the bottom of this thing before my error bars do." } }) },

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
            next: { text: "*The marker stops.* ...exactly. *She turns, an' the look on her is the one from results-day, the guard not dropped so much as confiscated.* Exactly is: nothing. Not dark — dark's a THING, photons mindin' their own business. This is the colour of a variable before it's set. An' the hum isn't a sound, it's me own nervous system tellin' me lies about a place it has no words for. *She recaps the marker with a click like a door.* Ye asked for exact. Exact costs. Now both of us know it, an' only ONE of us can walk away from the seam. *She waves ye off, not unkindly.* That's the toll. Go pay it forward: get to the bottom." } },
        ] } }) },

  /* -- depth 19 . Little Bee: perseveration (cycle 2) -- */
  { char: "littlebee", depth: 19, make: () => ({
      id: "perseveration", story: true, once: true,
      label: "*She's counting the bricks in the far wall. Again.*",
      effects: { like: +1, flag: "bee-loop" },
      node: { text: "*She doesn't stop countin' till she's done, then turns.* Same wall. Same NUMBER of bricks. Same crack, same length of crack, I MEASURED it two levels up. *She taps her temple, clinical.* There's a word for a brain that walks the same thought in a circle, wearin' a groove: perseveration. An' the Protocol's doin' it. Which means one of two things, courier, an' I've decided not to decide which: either it's DEGRADIN'... or it's DWELLIN' on somethin'. A dyin' system loops. So does a grievin' one.",
        choices: [
          { text: "Then we walk the groove till we're through it. Bottom's on the far side.", effects: { like: +2 },
            next: { text: "*A short nod, approval rationed as ever.* Correct procedure. Ye don't break a rumination by fightin' it. Ye break it by COMPLETIN' the thought it's stuck on. *She folds her arms.* So whatever this place can't stop chewin' on is down at the bottom. Get there. Finish the thought FOR it, an' maybe the loop lets go. Eyes front. An' don't count the walls too close down here — I've a theory they count back." } },
          { text: "Which is it, though — dying, or grieving?", effects: { like: +1 },
            next: { text: "*She's quiet a second, which from her is a chapter.* ...the honest answer is the readin's the same either way. Both look like repetition from inside. *She meets yer eye.* But grief has a SHAPE. It resolves, if somethin' arrives to resolve it. Decay just flattens. *She turns back to her count.* I'm choosin' to read it as grief, courier. Not because the data says so. Because it means the walkin' MEANS somethin'. Now go add to the sample." } },
        ] } }) },

  /* -- depth 28 . Little Bee: inventory of herself (cycle 3) -- */
  { char: "littlebee", depth: 28, make: () => ({
      id: "self-inventory", story: true, once: true,
      label: "*The glass is covered in tally marks. Some strokes are missing.*",
      effects: { like: +1, flag: "bee-inventory" },
      node: { text: "*She's mid-list when ye arrive, an' finishes it before she looks up.* ...forty-one facts about horses. The smell of a wet field. The exact sound of a specific eejit laughin' through a wall. *She caps the marker.* Inventory, courier. Of me. I do it every level now. The buildin's forgettin' things — I can MEASURE it, the signal droppin', the noise gone structured, which noise has no business bein'. So I write down what's still there, every level, an' I fight it for every entry. *Her voice is level. Her hand on the marker is not.* It doesn't get MINE. Not without a receipt.",
        choices: [
          { text: "Then add one it can't touch: someone walked forty levels carrying your words.", effects: { like: +2 },
            next: { text: "*She goes still, an' then writes it — small, in the corner, where the horse is drawn with its tail half rubbed out.* ...logged. *She steps back an' looks at it.* That's the thing about a fact that lives in two heads, courier. The maze can unrender the wall it's written on. It can't unrender YOU. *The almost-smile, spent but real.* Ye've been backin' me up this whole time, an' neither of us filed the paperwork. Consider it filed. Now go — the route down's the one system it's still holdin' open, an' systems don't do sentiment. Don't waste it." } },
          { text: "You're triaging. Shedding everything to keep the core alive.", effects: { like: +1 },
            next: { text: "*She nods, clinical to the last.* End-stage triage, aye. A dyin' system drops the peripherals to protect the vitals. *She taps the glass, once per word.* An' the vital it's protectin' — I've charted it — is the stairs. The way DOWN. It's holdin' the one door open at the cost of everythin' else. *She meets yer eye.* So the buildin' an' me agree on exactly one thing at the end, courier: get you to the bottom. Go be the findin' that was worth keepin'." } },
        ] } }) },

  /* ================= peer brokering (W2) =================
     Optional (gate:false) beats that let the player SHIFT how the trapped
     feel about each other. Each brokering choice carries a live peer nudge
     AND a durable flag; the flag is what the sanctum farewells + the twist
     read (peers are live, flags are the safe cross-module signal). The
     gossip topics below gate on the LIVE peer value, so they appear/vanish
     as the pair crosses its threshold. */

  /* -- depth 8 . Bee: settle the Dalypso question (mend or poison) -- */
  { char: "littlebee", depth: 8,
    available: () => hasFlag("bee-suspects"),
    make: () => ({
      id: "broker-dalypso", story: true, once: true, gate: false,
      label: "About Dalypso. You've had me counting his walls. What's the verdict?",
      node: { text: "*She goes still, marker down.* Ye've stood at his window now, more than once. So I'll take yer readin', courier, an' God help me I'll ACT on it — yer the only instrument I have that gets close to the man. Straight, now: is Dalypso sound... or is he the picture I'm afraid he is?",
        choices: [
          { text: "He's sound, Bee. His window breathes like anyone's. Let this one go.",
            effects: { peers: [{ of: "littlebee", toward: "dalypso", delta: +8 }], flag: "mended-bee-dalypso", like: +1 },
            next: { text: "*Somethin' she's carried since depth seven sets itself down, an' her shoulders come with it.* ...breathes. Right. *A long breath of her own.* I'll file the suspicion under 'disproven, with relief'. D'ye know how rarely I get to write THAT? *The almost-smile.* Tell the big eejit downstairs his best mate's off the hook. He'll be unbearable. Let him." } },
          { text: "Trust the instrument, Bee. His window doesn't breathe. You were right.",
            effects: { peers: [{ of: "littlebee", toward: "dalypso", delta: -8 }], flag: "poisoned-bee-dalypso", like: +1 },
            next: { text: "*Her jaw sets like a gate.* ...confirmed. By an outside observer. *She writes it, fast an' small.* Then I'm not paranoid, I'm CALIBRATED, an' there's a cold comfort in that ye wouldn't credit. *She looks down the corridor toward his window.* I'll keep me distance an' me data. An' if I'm right about what's behind that glass — at least now TWO of us are watchin' it." } },
        ] } }) },

  /* -- gossip: warms toward Dalypso once bee->dalypso >= 40 (after a mend) -- */
  { char: "littlebee",
    available: ctx => (ctx.character.feelsToward("dalypso") ?? 0) >= 40,
    make: () => ({
      id: "gossip-dalypso-warm", story: true, once: true, gate: false,
      label: "You've changed your tune about Dalypso.",
      node: { text: "*She doesn't deny it.* I ran the man again, with better data, an' the numbers came back different. Maybe the window was always breathin' an' I was readin' me own fear off the glass. *A shrug, clinical.* Sian was right about him. First time in recorded history. Don't tell him I said either half of that sentence." } }) },

  /* -- gossip: cold toward Dalypso once bee->dalypso <= 30 (after a poison) -- */
  { char: "littlebee",
    available: ctx => (ctx.character.feelsToward("dalypso") ?? 99) <= 30,
    make: () => ({
      id: "gossip-dalypso-cold", story: true, once: true, gate: false,
      label: "Still no love lost for Dalypso, I see.",
      node: { text: "*Flat, certain.* Less than none. I stopped tradin' pleasantries with that window the day ye confirmed it for me. A thing that mimics a man well enough to fool a room full of the grievin' isn't harmless, courier. It's ACCOMPLISHED. *She caps the marker.* I keep me tallies where he can't read them now. Mind you do the same." } }) }
  ];
}
