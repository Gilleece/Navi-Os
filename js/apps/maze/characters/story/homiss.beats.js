/* ============================================================
   MAZE.EXE — Homiss's story beats
   The authored STORY_TOPICS entries for Homiss, split out of
   story.js so each character's plot lives in one place. This is pure data:
   a factory handed the story engine's helpers (hasFlag, NAMES, freedIds, trappedIds, releaseChoices, refuseChoice, twistNode, FINAL_DEPTH)
   so it never has to import story.js — no module cycle. story.js merges the
   result back into STORY_TOPICS in the same per-character order, so the
   narrative gate and dialogue are unchanged. Beat IDs/flags must not change
   (existing saves key on them).
   ============================================================ */
export function homissBeats(H){
  const { hasFlag, NAMES, freedIds, trappedIds, releaseChoices, refuseChoice, twistNode, FINAL_DEPTH } = H;
  return [

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

  /* -- depth 7 . Homiss: he used to hear the others (needs the relay done) -- */
  { char: "homiss", depth: 7,
    available: () => hasFlag("msg-s2h-done"),
    make: () => ({
      id: "pipes", story: true, once: true,
      label: "Do you ever hear the others around here?",
      effects: { like: +2, peers: [{ of: "homiss", toward: "scally", delta: +2 }] },
      node: { text: "*The plucking slows.* ...used to. Voices, comin' through the pipes. Aul' buildin', sound carries. Scally givin' out about somethin', somebody laughin', somebody cryin' the odd time. Grand company, in its way. *A long pause.* Stopped a while back. All of it, the one night. Just the hum now. *He snaps back onto a grin.* Sure everyone's busy, that's all that is. Busy busy busy." } }) },

  /* -- depth 9 . Homiss: clocks the saint's finger (it appears here) -- */
  { char: "homiss", depth: 9,
    available: ctx => ctx.player.inventory.some(i => i.id === "saints-finger"),
    make: () => ({
      id: "bone-snap", story: true, once: true,
      label: "*He's staring at your pocket.*",
      effects: { like: +1 },
      node: { text: "*He nods at what you're carrying.* ...is that a knuckle? *He holds his plectrum up next to it.* Snap, wha'. Fella sold me this one swore blind it came off a saint. I'd say he was coddin' me. *He looks at yours a moment longer than he means to.* ...I'd NEARLY say it. I'd not go wavin' that around. There's a man up the way would sell his own ma for the like of it." } }) },

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

  /* -- depth 18 . Homiss: da capo (cycle 2) -- */
  { char: "homiss", depth: 18, make: () => ({
      id: "da-capo", story: true, once: true,
      label: "*He plays a phrase, stops, and plays the exact same phrase.*",
      effects: { like: +1 },
      node: { text: "*He doesn't look up from the fretboard.* ...here. Ye'll think I'm astray. I've played this exact bar, in this exact SPOT, before. Not a bar like it. IT. *He sets the bass down across his knees.* D'ye know the mark on a sheet — D.C., da capo? 'Back to the top, play it again.' The whole corridor's got a da capo on it, friend. Round we go. An' every time round, somethin's a hair off. A note bent. A wall a foot to the left. Small enough ye'd talk yerself out of it. Big enough it's eatin' at me.",
        choices: [
          { text: "If it's a loop, it's a loop with me in it. That's better than before.", effects: { like: +2 },
            next: { text: "*That lands somewhere warm, an' he plays four bright notes on the strength of it.* ...aye. It is, isn't it. The loops BEFORE ye came were the bad kind — just me an' the hum, round an' round. *He grins, tired an' true.* A da capo's only a prison if yer playin' it alone. With an audience it's an ENCORE. Come back round, friend. I'll be here. Apparently I'm always here." } },
          { text: "Then play it forward. Skip to the last verse.",
            next: { text: "*He huffs a laugh.* Can't skip a da capo, friend — that's the whole cruelty of the notation. Ye've to play the WHOLE thing back before ye reach the codas. *He picks the bass up.* But there IS a coda. A wee sign, further down the page: 'jump HERE, an' finish.' *He nods downward, through the floor.* Somebody has to walk to the coda an' play the endin'. Faster than the hummin' does. Away with ye. Mind the repeats." } },
        ] } }) },

  /* -- depth 29 . Homiss: the building winding down (cycle 3) -- */
  { char: "homiss", depth: 29, make: () => ({
      id: "resolving-note", story: true, once: true,
      label: "*He stops playing so you can hear the floor. It's humming.*",
      effects: { like: +1, flag: "homiss-resolving" },
      node: { text: "*He holds a finger up, an' under everythin' there's a long low tone, patient as weather.* ...hear it? The buildin's note. It was always there — ye'd catch it between songs, like a fridge in another room. But it's LOUDER now, friend, an' d'ye know what it's DOIN'? It's resolvin'. Fallin' toward the root, the way a tune does when it's endin'. *He picks the bass back up, gentle.* A thing that hums like that isn't windin' up. It's windin' DOWN. We're near the last bar. I can feel the double line comin'.",
        choices: [
          { text: "Then somebody should be at the bottom to catch the last note.", effects: { like: +2 },
            next: { text: "*He nods, eyes shut, all the way to the bottom of the chord.* ...aye. Ye don't let a tune end into an empty room. Somebody stands there for the last note, or it was never really PLAYED. *He plays four soft notes, an' the floor hums the answer.* Go on, friend. Be at the bottom when it lands. Me an' the buildin', we'll play it down to ye. An' when it resolves — mind — a resolved chord isn't a death. It's a HOME. Get us to it." } },
          { text: "Play against it. Don't let it wind all the way down.",
            next: { text: "*He considers that, hand flat on the strings.* ...I could. Play SHARP against the root, keep the tension up, hold the song open by main force. *He shakes his head slow.* But ye can't hold a note forever, friend. Ye'd only be delayin' the same last bar, an' delayin' an endin' is just a longer way of dreadin' it. *He plays WITH the hum instead of against it.* Better to play it true, an' walk out on the resolution. Away down. I'll keep the tune goin' till ye reach the end of it." } },
        ] } }) }
  ];
}
