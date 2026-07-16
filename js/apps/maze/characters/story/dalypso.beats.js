/* ============================================================
   MAZE.EXE — Dalypso's story beats
   The authored STORY_TOPICS entries for Dalypso, split out of
   story.js so each character's plot lives in one place. This is pure data:
   a factory handed the story engine's helpers (hasFlag, NAMES, freedIds, trappedIds, releaseChoices, refuseChoice, twistNode, FINAL_DEPTH)
   so it never has to import story.js — no module cycle. story.js merges the
   result back into STORY_TOPICS in the same per-character order, so the
   narrative gate and dialogue are unchanged. Beat IDs/flags must not change
   (existing saves key on them).
   ============================================================ */
export function dalypsoBeats(H){
  const { hasFlag, NAMES, freedIds, trappedIds, releaseChoices, refuseChoice, twistNode, FINAL_DEPTH } = H;
  return [

  /* -- depth 5 . Dalypso: the houseguest list (his ask, via allocations) -- */
  { char: "dalypso", depth: 5, make: () => ({
      id: "houseguest", story: true, once: true,
      label: "*He's counting something on his fingers, frowning.*",
      effects: { like: +1, flag: "ask-dalypso" },
      node: { text: "Bedrooms. *He says it like a team sheet.* FOUR of them, an' I've done the allocations. Master's mine, obviously. Sian gets the second: snores, but SENIORITY. Homiss in the third, on the CONDITION he's on time for breakfast — which he won't be, but a house needs one ongoing dispute or it's not a home. *He gets to the ring finger an' stops.* Fourth one's... *the performance goes quiet a second* ...goin' spare. For whoever gets us there. *He spins the ball.* Yer on the TEAM SHEET. Get us to the house.",
        choices: [
          { text: "I'll get you to that front door. All of you.", effects: { like: +2 },
            next: { text: "*He nods the way men nod at funerals an' cup finals, too much in the chest for the face.* ...right. Well. GOOD. *He bounces the ball twice, hard, gettin' his voice back off it.* First dinner's a fry, an' NOBODY argues the fry. Fourth bedroom's got the mornin' light, by the way. I wasn't givin' ye the worst one. I want that NOTED." } },
          { text: "Bee doesn't get a room, then?", effects: { like: -2 },
            next: { text: "*The ball stops dead under his palm.* ...she can have the... there's a SOFA BED in the... *he wrestles himself, and loses, and knows it.* Ach. FINE. She gets the fourth bedroom, YOU get the attic, I'll CONVERT it, it'll be GORGEOUS, skylights, the LOT. An' tell NOBODY I did that without a fight. I've a reputation." } },
          { text: "You've thought about this a lot, haven't you.",
            next: { text: "*For once he doesn't fire back inside the second.* ...every night. Some fellas count sheep. I do the walk-through: hall, stairs, landin', which door creaks. I've DECIDED which door creaks, ye have to have one. Where the tree goes at Christmas. *A beat.* It's not sad, before ye say it. It's TRAININ'. Every good keeper walks the pitch before the game." } },
        ] } }) },

  /* -- depth 10 . Dalypso: the mid-season review (agree at your peril) -- */
  { char: "dalypso", depth: 10, make: () => ({
      id: "season-review", story: true, once: true,
      label: "Ten episodes in. Give me the mid-season review.",
      effects: { like: +1 },
      node: { text: "*He's been WAITIN' for this. He actually stands up.* The mid-season review. 'MAZE', season one, episodes one through ten. Production design: FLAWLESS. Best fog on television. Supportin' cast: exceptional. The shopkeeper's a scene-stealer, the musician's the heart, the doctor's the brains, an' the fella with the telly... *entirely straight-faced* ...criminally underused. LEAD: *he looks at ye* growin' into the role. Started wooden. Warmin' up GRAND. *He sits back down.* Overall: four stars. Docked the fifth because NOTHIN' has HAPPENED. Ten episodes, no twist! Mystery box still TAPED SHUT. *He folds his arms.* Well? Do ye concur?",
        choices: [
          { text: "Concur? You're dead wrong. Everything's happening. You just can't see it from your sofa.", effects: { like: +2 },
            next: { text: "*His eyes LIGHT UP like a stadium on European night.* WRONG, am I?! Go ON then! 'Everything's happenin''. The WIRES, the wee subtractions, the channel goin' dark. Ye call that PLOT? That's ATMOSPHERE, that's... *he stops, mid-swing.* ...actually. Assemble them, an' that's not atmosphere. That's a COLD OPEN. Ten episodes of cold open. *He sits down slowly.* I retract the complaint. This is PRESTIGE structure. The twist is comin' an' it's goin' to be ENORMOUS. *He points at ye, beamin'.* THAT'S a debate! Yer permanent now. Panel regular. Fight me again next level." } },
          { text: "Four stars is fair. Solid review, no notes.", effects: { like: -3 },
            next: { text: "*The silence that follows is the silence of a man watchin' his own funeral go by.* ...'no notes.' *He sits down slow.* I hand ye a review with a controversial star deduction SPECIFICALLY ENGINEERED to start a row, an' ye stamp it like a PASSPORT. D'ye know what agreement IS, in this house? It's the ref blowin' up early. Me da agreed with everythin' the last year of his... *he stops that sentence with a hand like a tackle.* ...four stars is NOT fair, by the way. It's a FIVE-star production sabotaged by pacin', which ye'd KNOW if ye'd argued. *He turns to the telly.* Away. Send up someone with a pulse." } },
          { text: "Criminally underused, is he? The telly fella?", effects: { like: +1 },
            next: { text: "*He tries to keep the pundit face on. He fails.* ...ye caught the wee dig. Aye. CRIMINALLY. The character's got RANGE: comedy, tragedy, a gorgeous house SUBPLOT they've done NOTHIN' with. Every episode, the same three scenes: window, telly, ball. I'd write to the show, but the complaints line's DOWN. *Mock-wounded, delighted someone noticed.* Tell the writers when ye reach them. The fella in episode four's ready for his ARC. Done ten YEARS of prep." } },
        ] } }) },

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

  /* -- depth 6 . Dalypso: the Tuesday ultimatum (roots his relay) -- */
  { char: "dalypso", depth: 6, make: () => ({
      id: "tuesday", story: true, once: true,
      label: "You look like a man composing a speech.",
      effects: { like: +1, flag: "msg-d2h" },
      node: { text: "*He is, visibly, a kettle at the boil.* You. You talk to Homiss. Don't deny it, I've HEARD. *He draws himself up.* Ye can deliver a message. Word for word, now: band practice. Was. TUESDAY. Was I standin' there with me amp an' me good extension lead like a spare tool? I WAS. Two hours! Not so much as a text! *The finger comes down slowly, an' under the outrage somethin' older an' softer shows through.* ...the man's timekeeping needs to be eradicated ENTIRELY. Tell him that. Ah... just tell him the Tuesday bit. Go on." } }) },

  /* -- relay . Dalypso: the apology lands (min-depth 8) -- */
  { char: "dalypso", depth: 8,
    available: () => hasFlag("msg-h2d") && !hasFlag("msg-h2d-done"),
    make: () => ({
      id: "tuesday-lands", story: true, once: true,
      label: "Homiss says he's sorry. He'll be at the next one.",
      effects: { like: +2, flag: "msg-h2d-done", peers: [{ of: "dalypso", toward: "homiss", delta: +4 }] },
      node: { text: "*He opens his mouth for the rant he's been keepin' warm for days, an' nothin' comes out.* ...he said SORRY? Homiss? *He rubs the back of his neck, thrown entirely. A man ready for war, handed a cup of tea.* Well. Right. Good. Because it WAS Tuesday, an' I WAS... *he runs down like a wind-up toy, an' what's left when the outrage drains off is just fondness.* ...ah, he's a gentleman. Always was. Just a LATE one. *He picks the ball up an' puts it down again.* Tell him the door's always open. The new gaff. He knows the... well. He doesn't know the address. *A tiny hitch, painted over at speed.* Tell him ANYWAY." } }) },

  /* -- depth 7 . Dalypso: the seating plan (the grudge, catered) -- */
  { char: "dalypso", depth: 7, make: () => ({
      id: "fixture-list", story: true, once: true,
      label: "*He has an invisible table drawn in the air, mid-argument with it.*",
      effects: { like: +1 },
      node: { text: "...no, because if HOMISS is there ye can't put him near the DOOR, the man treats doors as ADVISORY... *he clocks ye an' waves ye into the row* ...you. GOOD. Housewarmin' dinner, seatin' plan, settle it. *He redraws the table with a sweep.* Me at the head, it's me HOUSE. Sian on the right. Homiss down the end where late arrival does minimal damage. You... *he places ye with two fingers* ...there. Sight of the telly, back to no door. A POSITION OF HONOUR. That's where me da sat. An' then. *The hand stops over one empty chair.* Then there's the QUESTION of the seat on Sian's right.",
        choices: [
          { text: "Bee sits beside Sian. Obviously. That's not even a question.", effects: { like: -2 },
            next: { text: "*He looks at ye like a linesman who's flagged his OWN team.* 'Obviously.' OBVIOUSLY, he says. D'ye know who SAT beside Sian for twenty YEARS of dinners? At whose TABLE? *He catches himself, breathing like a man who's run a length.* ...ye said it like it costs nothin'. That's the bit. Everyone says it like it costs nothin'. *He straightens the invisible cutlery, quieter.* She sits beside him. I KNOW she sits beside him. But ye could've let me GET there, could ye not?" } },
          { text: "Put Bee beside YOU. Keep your enemies close, and all that.", effects: { like: +2 },
            next: { text: "*He opens his mouth to object, an' the idea catches him right between the eyes.* ...beside ME. Where I hear all her wee CUTTIN' remarks first-hand instead of relayed through Sian with the good bits missin'. Where she has to pass ME the gravy an' SAY somethin'. *A grin spreads across him like weather changin'.* That's DIABOLICAL. Man-markin', is what that is. By the end of dessert we'd either be at WAR or we'd be... *he stops. Considers. Concedes a whole war in one syllable.* ...friends. *He points at ye.* Yer runnin' me next five dinners. Not a request. An APPOINTMENT." } },
          { text: "Who's cooking for this dinner that will definitely happen?",
            next: { text: "ME, an' I'll thank ye to bury the scepticism with yer OTHER hurtful opinions. *He counts the menu with total command.* Roast. I do ONE roast, exceptional, ask anyone, ask NOBODY, just trust me. Spuds three ways, because two is poverty an' four is showin' off. Somethin' green for Bee to APPROVE of. An' a trifle big enough to require plannin' permission. *He folds his arms.* It WILL happen. The table's BOUGHT — in the good room under a sheet, waitin' on its people. *A beat, an' the voice drops a half-inch.* ...everythin' in that house is under a sheet, waitin' on its people. That's what the house IS. Go on. Next fixture." } },
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
      node: { text: "*For once he doesn't run at it. He sets the remote down like a card he's been holdin' all night.* I want to ask ye somethin', an' I want the FIRST answer, not the polished one. *Level.* Her upstairs. The doctor. She's been askin' about me. Don't insult either of us, I KNOW she has — ye've had HER look off YOUR face since two levels up. *He folds his arms.* So. What does Little Bee say about me?",
        choices: [
          { text: "She says your window doesn't breathe. That it's a picture of a window.", effects: { like: +2, flag: "told-dalypso-suspicion" },
            next: { text: "*Stillness. Then, worse than any explosion, he nods, slow, like a man hearin' a diagnosis he'd already googled.* ...doesn't breathe. *He looks around at the frame of his own window, a man inspectin' his own coffin for build quality.* D'ye know what's mad? I can't FEEL if she's wrong. *He picks up the ball. Holds it like ballast.* ...thank ye. I mean it. Everyone else gives me the HIGHLIGHTS package; you gave me the full ninety. *A beat, an' half a grin crawls back.* 'Doesn't breathe.' Cheeky wee genius. If I AM a picture, I'm a PORTRAIT, an' they'd better have sprung for the good frame." } },
          { text: "Nothing. She's never mentioned you.", effects: { like: -3, flag: "kept-bee-counsel" },
            next: { text: "*He looks at ye for a long, long moment, an' the disappointment on him is so mild an' so total it's like weather.* ...nothin'. Never mentioned. *He picks the remote back up an' talks at the telly rather than you.* D'ye know what I watched last night? Nature thing. Wee bird, minds another bird's eggs its whole life, never says a WORD about it. Loyal as the tide. *He flicks a channel.* Lovely quality in a BIRD. In a fella standin' at my window with her look still ON him... *flick* ...we'll call it what it is when yer ready to. Away on. Programme's back." } },
          { text: "Ask her yourself when I get you both out of here.", effects: { like: +1, flag: "dodged-dalypso-question" },
            next: { text: "*He barks a laugh despite himself.* Oh, VERY good. Didn't answer a THING an' made it sound like team spirit. Ye should be in MANAGEMENT. *He wags the remote at ye, but the heat's gone out of it.* Fine. Keep yer confidences, courier. I'd respect ye less if ye spilled. *He settles back.* But log it: when we're all out, her an' me are havin' the conversation. In MY kitchen. Over MY teapot. An' one of us is apologisin', an' I've genuinely no idea which. *He unmutes the telly, satisfied.* That's the season finale, that is. Don't miss it." } },
        ] } }) },

  /* -- depth 9 . Dalypso: the dark channel (the reception is dying) -- */
  { char: "dalypso", depth: 9, make: () => ({
      id: "the-remote", story: true, once: true,
      label: "*He's pressing the same button over and over.*",
      effects: { like: +1 },
      node: { text: "*Press. Press. Press-press-press.* ...it went DARK. *He holds the remote up like a referee showin' a card.* Channel four-oh-seven. The bridge documentary channel — bridges that were never BUILT. Appointment viewin'. Last night, nine o'clock, I settle in, an'... BLACK. Not static, not 'no signal'. BLACK, like a curtain. Like somethin' STOOD in front of it. *Press. Press.* First time since I got here. This telly gets channels that don't EXIST, an' now one of them's after stoppin' existin' HARDER. *Under the outrage, for the first time, he's rattled.* Nothin' dies down here. So what turned it OFF?",
        choices: [
          { text: "What was on 407 before it went dark? Exactly?", effects: { like: +2 },
            next: { text: "*He points at ye with the remote, the highest honour he confers.* THAT'S the question! Bridges. Harmless. Except THINK about it: bridges that were never built. Roads not taken. The channel was all about ways ACROSS that don't exist. *He lets that sit, an' the silence does somethin' cold.* An' the night I started takin' NOTES on one, the curtain comes down. *He sets the remote on the sill, deliberate.* Somethin' in this buildin' doesn't like us studyin' the exits. Log THAT with yer woman upstairs. Word for word. Tell her I said BRIDGES." } },
          { text: "Maybe the telly's just on the way out.", effects: { like: -3 },
            next: { text: "*The remote comes down slowly, an' he turns with the full weight of a man whose expertise's been questioned in his OWN sittin' room.* The telly. Is not. The PROBLEM. *He breathes.* This unit gets channels from timelines that never HAPPENED. Survived me da's funeral week on twenty-two hours a DAY. When IT loses a channel, ye don't blame the SET, ye ask who's been at the TRANSMITTER. *He turns back to the screen, jaw workin'.* 'On the way out.' Honest to God. Ye'd look at a shot referee an' blame the WHISTLE." } },
          { text: "One channel out of thousands. You'll live.",
            next: { text: "*He stares at ye a second, an' then, unexpectedly, deflates into somethin' quieter an' truer.* ...aye. One channel. *He turns the remote over in his hands.* But d'ye know what it is? Down here I've LOST things before. We all have. An' every one went the same way. Not with a bang. With a wee QUIET subtraction ye could talk yerself out of noticin'. The voices through the walls went one night, one by one, an' every time I said 'ah, they'll be back on the morrow'. *He looks up.* Four-oh-seven's not a channel. It's a CANARY. An' I'm not watchin' the cage go quiet again without SAYIN' it out loud this time. *He nods at ye, short an' fierce.* There. Said. Witnessed. On yer way." } },
        ] } }) },

  /* -- depth 11 . Dalypso: planning permission (vote on the conservatory) -- */
  { char: "dalypso", depth: 11, make: () => ({
      id: "planning-permission", story: true, once: true,
      label: "*He's pacing out measurements that don't exist.*",
      effects: { like: +1 },
      node: { text: "...three metres by four, off the back kitchen... *he clocks ye an' pulls ye into the meetin' with one wave* ...GOOD, quorum. LISTEN. The conservatory. *He lets the word land with gravity.* Three by four, catchin' the mornin' sun before the garden takes it. Glass roof, the GOOD glass, self-cleanin'. Rattan furniture. An' in the corner, *he places it tenderly*, a chair angled EXACTLY between the garden an' the telly, so a man can watch either. Or BOTH. *He folds his arms.* The bank says extravagance. The lads said 'sure ye've a garden, sit IN it.' Philistines. So it comes to you, castin' vote: does the conservatory get built? Think CAREFULLY. This is a plannin' decision, not a POPULARITY contest.",
        choices: [
          { text: "No conservatory. It'd ruin the line of the house. Extend the good room instead.", effects: { like: +2 },
            next: { text: "*He inhales like a man harpooned, an' then stops, mid-outrage, because the counter-proposal has TEETH.* ...ruin the... EXTEND the... *he wheels around to consult the invisible house.* The good room DOES back onto the... ye'd get the evenin' light, which for a workin' man is the only light he ever... *he paces the new footprint, mutterin', an' rounds on ye with the fury of a man convinced against his will.* THAT is the WORST thing about ye! Ye come to MY plannin' meetin', REJECT my conservatory, an' do it with a BETTER IDEA! *He jabs a finger, eyes blazin' with joy.* The extension's APPROVED. Yer barred from the next meetin'. Yer CHAIRIN' the next meetin'. GET OUT of me office." } },
          { text: "Build it. It sounds perfect exactly as you described it.", effects: { like: -3 },
            next: { text: "*Silence. The plannin' energy drains out of him like bathwater.* ...'perfect exactly as described.' *He sits down heavily on the invisible rattan.* D'ye know how long I've held the conservatory debate? MONTHS. Counter-arguments STOCKPILED. A whole bit about the self-cleanin' glass bein' worth it over TIME. *He looks up, betrayed.* An' ye APPROVED it. First round. Unanimous. *He shakes his head slowly.* A plannin' process with no objections is RUBBER-STAMPIN', an' a conservatory nobody fought for is just a GREENHOUSE with notions. Away. Meetin's adjourned due to lack of OPPOSITION." } },
          { text: "Casting vote requires a site visit. I'll inspect when we're all standing in that kitchen.",
            next: { text: "*He goes to object, procedural grounds, ye can see it formin', an' then the actual CONTENT of what ye said stops him flat.* ...a site visit. *He says it carefully, like handlin' somethin' breakable.* All of us. Standin' in the back kitchen. Sian measurin' things wrong, Bee testin' the light like it's a patient, Homiss forty minutes late to his OWN site visit... *He stands inside the picture of it a long moment, an' when he comes back out his voice has to take the long way round.* ...aye. That's proper procedure, in fairness. Ye can't approve a conservatory ye haven't STOOD in. *He clears his throat, hard, twice.* Motion carried. Decision DEFERRED to the site visit. Ye've entered it into the MINUTES. Get us to the site." } },
        ] } }) },

  /* -- depth 13 . Dalypso: the missed episode (your channel skipped) -- */
  { char: "dalypso", depth: 13, make: () => ({
      id: "missed-appointment", story: true, once: true,
      label: "*He's up at the glass before you're even close.*",
      effects: { like: +1 },
      node: { text: "WHERE were ye. *No hello. The remote's in his fist like a relay baton.* Last night. Nine o'clock. YOUR programme, YOUR slot, I'm settled, an'... *he jabs the remote at the dark screen* ...STATIC. A full episode of static. First time since I started watchin'. An' the TELLY is FINE, we've ESTABLISHED that. *He leans close, rattled under the bluster.* Here's the thing that had me talkin' to the ceiling at four in the mornin': the static wasn't EMPTY. I know static. Static crawls. This static was still. Like held breath. Like somethin' standin' in FRONT of the picture, mindin' me not seein' you. *The pundit an' the friend are the same man for once, an' both of them are frightened.* So I'll ask again, an' I want the boring answer: where WERE ye, nine o'clock last night?",
        choices: [
          { text: "Walking the maze, same as every night. Nothing happened to me at all.", effects: { like: +2 },
            next: { text: "*He studies ye the way he'd study a replay from the third angle, doesn't find what he's lookin' for, an' the relief nearly takes his legs.* Nothin'. Ye were just WALKIN'. *He sits down heavy.* So the picture was fine, the SUBJECT was fine... an' somethin' stood between them anyway. That's not interference. That's CENSORSHIP. Somethin' cut to static rather than let me see a bit of yer episode. Which means last night, somewhere in that maze, somethin' happened NEAR ye that ye never clocked. *The sentry's fully on duty now.* Mind yerself on the night walks. Yer bein' EDITED, an' I don't like the cut." } },
          { text: "You sat up all night worrying about a TV show?", effects: { like: -3 },
            next: { text: "*He goes very still, an' when he answers, it's with the terrible patience of a man explainin' his heart to a wall.* ...a TV show. *He stands.* When me da was in the hospital, the last stretch of it, I couldn't always be there. Shifts. Distance. LIFE. But the ward had a webcam thing, for families. Grainy wee picture. An' I'd sit up HALF THE NIGHT with that grainy wee picture, an' d'ye know what it was? It was NOT a TV show. It was the only window I had. *He picks the remote back up an' turns to the screen.* You're on the only window I have, an' last night it went to static for an hour, an' I sat up with it. Like ye do. For family. *He doesn't look at ye.* ...just away on." } },
          { text: "What time did the static end? Exactly. And what was I doing when the picture came back?", effects: { like: +2 },
            next: { text: "*The question snaps him straight into analyst mode, an' he's grateful for it. Facts are a handrail for him too.* Five past ten. Sixty-five minutes, near enough. I timed it off the snooker channel. The snooker NEVER lies. An' when ye came back... *he squints, reconstructin' the frame* ...ye were stood dead still in a junction. Facin' a wall. The long windowless stretch. Just starin' at brick, ten seconds, an' then ye shook yerself like a wet dog an' walked on. *He looks at ye.* D'ye remember doin' that? *Whatever's on yer face, he reads it, an' nods, grim.* ...ye don't. Sixty-five minutes gone from the broadcast an' ten seconds gone from the LEAD. *He writes it, actually writes it, on a pad ye've never seen before.* We have a FILE now. Mind yerself. Somethin' in this buildin' is doin' EDITS." } },
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

  /* -- depth 12 . Dalypso: last night's viewing -- */
  { char: "dalypso", depth: 12, make: () => ({
      id: "on-the-telly", story: true, once: true,
      label: "Watch anything good last night?",
      effects: { like: +1, flag: "dalypso-watching" },
      node: { text: "FUNNY ye should ask. Cracker of a thing on one of the deep channels. Slow telly, like. One of them long single-take jobs. *He settles in, reviewin'.* Yer man wanders a neon maze, pickin' up wee shiny shapes, don't ask me why, it's never explained, which I RESPECTED. Talks to a few heads in windows, argues with a fella about films... *He wags a finger at the screen only he can see.* Good pacin'. Great fog. The lead grew on me. *He looks at ye, entirely warm, entirely guileless.* Ye were better in the early episodes, mind. Ye looked UP more. Lately it's all tokens tokens tokens with ye. *He shrugs an' picks up the remote.* Still. I never miss it. Appointment viewin', so it is.",
        choices: [
          { text: "Go on then. What am I rated? Full review.", effects: { like: +2 },
            next: { text: "*He sits FORWARD. This is the question he was born for.* The lead? Strong physical performance. Good walkin', VARIED walkin' — ye'd be amazed how many leads only have the one walk. Excellent listener, which is rare; most protagonists do be waitin' for their turn to talk. Brave with the dialogue choices, some QUESTIONABLE, we'll come to that at the reunion special. *He kisses his fingers like a chef.* The wee shopkeeper storyline ALONE. *He levels the remote at ye.* Current rating: four an' a half. The half's held for the endin'. Stick it, get everybody OUT in the finale, an' it's five stars an' a LIFETIME achievement gong in me good room. No pressure. ENORMOUS pressure." } },
          { text: "Dalypso... you watch me? On the telly? That's deeply unsettling.", effects: { like: -3 },
            next: { text: "*He looks at ye like ye've slapped a season ticket out of his hand.* UNSETTLIN'?! *The remote comes down on the sill with a crack.* I don't CHOOSE the channels, the channels COME, an' when yer wee episode comes on am I supposed to turn ye OFF? Like a STRANGER?! *He's genuinely hurt now, an' it burns off the outrage all at once, leavin' him quieter.* ...it's the only window I have that looks out at somethin' I care about, d'ye follow me? The rest is bridges an' cancelled seasons. You're the one programme where somebody I KNOW is still out there, still MOVIN'. *He picks the remote back up, wounded, dignified.* 'Unsettlin'.' I WAVED at ye once, ye know. Ye didn't see. Obviously. It's TELEVISION." } },
          { text: "If you never miss an episode, keep watch for me. Tell me if you ever see something WITH me in the maze.", effects: { like: +2, flag: "dalypso-lookout" },
            next: { text: "*The remote stops halfway to the channel button, an' the pundit sits up into somethin' more like a sentry.* ...somethin' WITH ye. *He says it slow, an' ye can see him replayin' footage in his head, an' findin' somethin' he'd filed under 'compression artefact'.* There was... twice, maybe. A wee walk-on. Background artist. Just at the edge of frame, where the fog does be thickest, movin' when YOU moved. I put it down to the encode. Ghostin'. *He looks at ye, an' the warmth in him has gone all vigilant.* Right. New viewin' protocol: eyes ON at all times, notes TAKEN, an' if yer wee shadow shows up again I'll be hammerin' on this glass til ye hear me a level away. *He settles back, remote up like a stopwatch.* Appointment viewin' just became a STAKEOUT. I've trained me whole life for this." } },
        ] } }) },

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

  /* -- depth 17 . Dalypso: reruns, and he knows a rerun (cycle 2) -- */
  { char: "dalypso", depth: 17, make: () => ({
      id: "the-repeats", story: true, once: true,
      label: "*He's watching the corridor behind you, not the telly.*",
      effects: { like: +1 },
      node: { text: "*He mutes the set, which is serious.* Here. Neighbour. Forty years of television I've watched, an' if there's ONE thing I can smell through a wall, it's a REPEAT. This stretch? Seen it. The lightin's a shade off — they always drop the lightin' budget on reruns — but it's the same EPISODE. *He folds his arms, grim.* An' d'ye know when a channel wheels out the old ones, back to back? When the new stuff's stopped comin'. When somethin' upstairs has quietly pulled the plug on the season.",
        choices: [
          { text: "They only rerun the old ones when the ending's already written.", effects: { like: +2 },
            next: { text: "*He points at ye like ye've won the phone-in.* THERE it is. THAT'S the law of it. Nobody reruns a show that's still bein' WRITTEN. So somethin' down there already knows how this ends, an' it's just fillin' the schedule till we get to it. *He leans in.* So get to it, neighbour. I've a horrible feelin' about what happens if the broadcast catches up with us first." } },
          { text: "Every night the same, is it? Doesn't that get to you?",
            next: { text: "*He shrugs, an' it's almost peaceful.* Get to me? Sure that's half of LIVIN'. Same faces, same fixtures, the highlights at the same time of an evenin'. That's not a prison, that's a ROUTINE, an' there's a world of difference — the difference is WHO yer in it with. *He nods at ye.* Yer in mine now. No gettin' out of it. Onwards." } },
        ] } }) },

  /* -- depth 25 . Dalypso: the graveyard schedule (cycle 3) -- */
  { char: "dalypso", depth: 25, make: () => ({
      id: "graveyard-slot", story: true, once: true,
      label: "*He's flicking channels, and they're nearly all one colour.*",
      effects: { like: +1 },
      node: { text: "*Click. Click. Corridor. Static. Corridor. A channel that's just the colour blue. Click.* ...the GOOD stuff's gone, neighbour. All of it. We're into the graveyard schedule now — ye know the graveyard schedule? Small hours, the proper programmes done, an' it's all repeats an' the shoppin' channel an' a wee dot in the middle of the screen. *He sets the remote down, careful.* Except it's not the small hours. It's the small hours of the whole WORLD. The channels are goin' out one by one, an' I'm watchin' the lights go with them.",
        choices: [
          { text: "One channel left worth watching — the one where a courier walks everybody home.", effects: { like: +2 },
            next: { text: "*He looks at ye, an' the pundit falls away entirely, an' what's left is just the neighbour.* ...aye. That one's still on. *He turns the other channels off, one by one, till only that one's lit, an' he says it like layin' down a bet with his last coin.* Don't ye DARE get cancelled mid-season, d'ye hear me. Not now. Yer the only thing left on the whole network worth the licence fee. Walk on. I'll mind the schedule." } },
          { text: "Turn it off, Dalypso. You don't have to watch the lights go out.",
            next: { text: "*He shakes his head slow, an' there's steel in it.* Nah. Somebody should've sat up with me da's ward camera the whole last stretch, an' the nights that grainy wee window went unwatched — I've never forgave them. *He grips the remote.* So no. If a channel's goin' dark down here, it goes dark with somebody WATCHIN'. That's the only dignity the schedule has left. Away on. Give me somethin' to watch." } },
        ] } }) },

  /* -- peer brokering (W2): reconcile Dalypso and Homiss over the Tuesday -- */
  { char: "dalypso", depth: 9,
    available: () => hasFlag("msg-h2d-done") && !hasFlag("mended-homiss-dalypso"),
    make: () => ({
      id: "broker-homiss", story: true, once: true, gate: false,
      label: "Homiss and you — is the Tuesday thing squared, or still smouldering?",
      node: { text: "*He pauses the telly.* ...the Tuesday thing. *He turns the ball over.* He said sorry. I heard ye. An' I said the door's always open. But a grudge that size doesn't just switch OFF, neighbour — it wants a fella standin' between the two windows to say the words in the right order. That's you. So. Am I still cross at the man, or amn't I?",
        choices: [
          { text: "Let it go, Dalypso. He kept the seat warm for you every week. That's not a man who forgot you.",
            effects: { peers: [{ of: "dalypso", toward: "homiss", delta: +8 }, { of: "homiss", toward: "dalypso", delta: +8 }], flag: "mended-homiss-dalypso", like: +2 },
            next: { text: "*He's quiet a long moment, then nods, slow.* ...kept the seat warm. Aye. He would, the soft article. *He sets the ball down.* Right. It's squared. Tell him the amp's still tuned an' the good extension lead's HIS if he's ever on time again — which he won't be, an' that's — *his voice catches once* — that's the whole point of havin' him. Band's back on, courier. Put that in the minutes." } },
          { text: "Honestly? Stay a bit cross. It's the one fixture the two of you never miss.",
            effects: { like: +1 },
            next: { text: "*He barks a laugh.* HA! Now THAT'S a man who understands us. *He picks the ball back up.* Aye. A good grudge, well-maintained, is the longest-runnin' show on the bill. We'll square it at the reunion, in person, at VOLUME, an' it'll be GORGEOUS. Leave us our one dispute, courier. A house needs one, or it's not a home." } },
        ] } }) }
  ];
}
