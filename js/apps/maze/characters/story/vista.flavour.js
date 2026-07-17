/* ============================================================
   MAZE.EXE — vista flavour + THE EYE
   The tenants are aware of what's outside the windows. Two kinds
   of colour, both injected by story.js applyStory:

     • vistaRemarkFor(ctx) — a scene-keyed aside appended to the
       greeting: how THIS character reads THIS floor's outside
       world (vista.js scenes, keyed by depthInCycle). Coverage is
       deliberately sparse — a couple of voices per floor, not
       everyone everywhere — so the remarks stay remarks and never
       become a checklist.

     • eyeTopicFor(ctx) — "What's that eye out there?", offerable
       from depth 3 on (the player has had two floors to clock it
       first). Everyone is uncomfortable and evasive about it in
       their own register — except Sian, who thinks it's a
       gorgeous piece of skybox art, because of course he does.
       One ask per character per cycle (`once`); their episodic
       memory rewinds with the building, so cycle 2 squirms
       through it fresh.

   Pure data + lookups: no engine imports beyond state.js, so it
   slots in beside the *.beats.js files without any module cycle.
   ============================================================ */
import { depthInCycle } from "../../state.js";

/* ---------- what's outside THIS floor ------------------------------------
   Keyed by scene (depthInCycle 1..10 — see vista.js's table), then by
   character id. Appended to the hub greeting, so each reads as an aside
   mid-hello: present tense, one breath, about the view. */
const VISTA_REMARKS = {
  /* 01 · the city — the only floor above ground */
  1: {
    scally: "*He tips his head at the window, at the city burning gold out there.* Some view they give us, eh? Penthouse prices. *He rubs two fingers together, slower than usual.* You notice nobody ever comes BACK from that skyline, amico. Scally notices.",
    sian: "*He nods past ye at the skyline without waitin' to be asked.* State o' that sunset, hai. Volumetric EVERYTHIN'. If I ever meet the fella who lit that scene I'll shake his hand — an' then ask him why we're on the wrong side of the glass.",
  },

  /* 02 · the nightclub */
  2: {
    homiss: "*He's playin' along with somethin', an' ye realise it's the club out the window.* D'ye hear it? There's a session goin' on out there — I've been sittin' in all day. Whoever's on the desk keeps the one tempo FOREVER. Man's either a genius or a machine, an' down here I've stopped assumin' there's a difference.",
    dalypso: "*He jerks a thumb at the nightclub sprawlin' past the glass.* Look at them. Dancin'. Same crowd since I got here, same song, an' NOBODY'S gone to the bar. Worst episode of anythin' I've ever watched, neighbour, an' I can't turn it off.",
  },

  /* 03 · the works (factory) */
  3: {
    scally: "*He nods at the furnaces glowing out the window.* A factory with no workers, amico. Furnaces lit, nobody stoking. And Scally does not ask himself 'where is everybody'. He asks: what is it MAKING. *He goes back to his shelves a little too quickly.*",
    sian: "*He's got his face against the glass, watchin' the pistons.* Been countin' the strokes, hai. That big fella out there hasn't missed a beat since I reached this floor. No jitter, no WEAR. Machines wear, that's half the job... *he pulls back from the glass* ...unless nothin' out there weighs anythin'. Anyway! Gorgeous factory. Ten outta ten.",
  },

  /* 04 · the stacks (warehouse) */
  4: {
    scally: "*For once he is not looking at you; he is looking past you, at the racks going back forever.* ...do you know what Scally would GIVE for one hour in that stockroom. One hour and a trolley. *He presses a palm to the glass.* Somebody shelved all of that and never came back for it. Merchants do not abandon stock, amico. They get abandoned WITH it. *A pause.* ...eh. Forget Scally said that.",
    dalypso: "*He nods at the warehouse beyond the glass.* Them wee drones out there. Up an' down the same aisles all day, checkin' shelves nobody's touched in years. *He settles back, grimly satisfied.* Middle management. Even down HERE. Some things survive anythin'.",
  },

  /* 05 · the chapel */
  5: {
    homiss: "*His voice has gone church-quiet, an' he keeps glancin' past ye at the arches.* I played a cathedral once. The note goes up an' it comes BACK changed — best acoustic of me life. *A nod at the glass.* That one out there'd beat it. An' the congregation never showed, an' the light stays on the altar anyway. Waste of a good room, friend. Or it's waitin' on somebody. One or the other.",
    dalypso: "*He's angled his chair away from the window, an' notices ye noticin'.* The church? Aye. Lovely. Very production values. *A beat.* Me ma had mass on the telly every Sunday of me life, an' I know a BROADCAST from a SERVICE, neighbour. That out there's a broadcast. Nobody's listenin' back. *He turns the telly up a notch.*",
  },

  /* 06 · the crypt (server catacombs) */
  6: {
    littlebee: "*She's been watchin' the racks out the window, an' she talks without turnin'.* Server crypt. Aye. I counted the wee lights last night — the pattern's not random, courier. It's REM. The pattern of a thing DREAMIN'. *She finally looks at ye.* I've decided not to wonder what about, an' I'd thank ye to help me not.",
    sian: "*He taps the glass toward the racks.* That's a data centre, hai. A proper one — I've stood in them, the cold aisles, the hum ye feel in yer teeth. *The grin dips for one frame.* Whole cathedral of compute down there, hostin' SOMETHIN'... an' the only thing runnin' that I know of is us. *He polishes the visor on his sleeve.* Grand. Anyway. GRAND.",
  },

  /* 07 · the scrap sea */
  7: {
    sian: "*He's quiet a second, lookin' at the scrap ranges — screens still glintin' in the heaps.* ...that's where builds go when they're done, hai. Every rig out there was somebody's whole weekend once. *He knocks the glass, gentle, like a man at a wake.* Mind Brenda for me if I ever end up in a heap like that. She's the wedge-shaped one.",
    scally: "*He watches a searchlight sweep the junk ranges, and for once the patter is quiet.* You see the lights, amico? Still SEARCHING. All that stock written off, and something out there is still doing the inventory. *He wags a finger.* Respect. And also: run from anything that counts like that.",
  },

  /* 08 · the geode */
  8: {
    littlebee: "*She's got a diagram on the glass: the crystal field outside, annotated.* Look at the growth patterns out there, courier. Crystals grow along stress lines — that whole cave is a MAP of what hurt the rock. *She caps the marker.* A trauma record ye can walk around in. Gorgeous one. I'd publish it if there were anyone left to reject it.",
    homiss: "*He plays a note, an' waits, an' out in the cavern ye'd swear one of the crystal points answers it.* ...d'ye hear that? The whole floor's TUNED, friend. Every spike out there rings a different pitch. Somebody grew themselves an instrument the size of a county, an' I can't get AT it. *He sets the bass down with enormous restraint.* That's the cruellest thing this buildin's done yet.",
  },

  /* 09 · the terminus */
  9: {
    dalypso: "*The ghost train goes by outside, an' his eyes follow it the whole way round, like a man at a match.* Every few minutes, that fella. Lit up, seats empty, stops for NOBODY. *He points the remote at it, uselessly.* I've seen every episode of everythin', neighbour, an' I'm tellin' ye: a train that regular isn't goin' anywhere. It's a SCREENSAVER. Don't be gettin' on it.",
    homiss: "*He's watchin' the platform out the window, the boards flickin' over.* I busked a station like that for two winters, so I did. Best room in the world for it — everybody's leavin', everybody's soft about it. *A pause.* That one's had no crowd since I came. The boards keep updatin' though. Departures only — did ye notice? Not one arrival on them. *He picks a slow tune ye half-recognise.*",
  },

  /* 10 · the abyss */
  10: {
    littlebee: "*She's watchin' the water column past the glass, the god-rays wheelin' in it.* Pressure at this depth would fold a hull like a chip bag, before ye ask. An' the fish school WRONG — a real school has an edge to it, a panic budget. Those ones have never been hunted. *A beat, as the big shadow slides past and the shoal scatters.* ...recalibratin' that theory now, so. Wouldn't stand near the glass on the hour, courier.",
    sian: "*He's flat against the glass like a child at an aquarium.* The WATER, hai. D'ye know how hard water is to render?! Refraction, caustics, the light shafts... *the leviathan's shadow slides past, an' his voice drops to pure reverence* ...an' then there's HIMSELF. Whoever modelled yer man out there wasn't paid enough. *He knocks the glass, soft.* We're at the bottom of somethin', big lad. Even the game's sayin' it now.",
  },
};

/* the scene-keyed aside for this character on this floor, or null */
export function vistaRemarkFor(ctx){
  return VISTA_REMARKS[depthInCycle(ctx.depth)]?.[ctx.character.id] ?? null;
}

/* ---------- THE EYE ------------------------------------------------------
   Not offered before depth 3 (global depth, so it never re-locks in later
   cycles — by then the player has been stared at for twenty floors). Every
   answer is a refusal wearing the character's own clothes; the one push-back
   choice buys a single crack of candour, never an explanation. Sian alone
   is delighted: to him it's a hero prop in a skybox, textbook billboarding,
   and the blink is just good craft. */
const EYE_MIN_DEPTH = 3;

const EYE_NODES = {
  scally: {
    text: "*The hands stop washing themselves. In a shop full of patter, you appear to have found the one item with no price on it.* ...eh. *He does not look at the window. He looks at his shelves, which is how you know he knows exactly where it is.* In the old country, amico, you pass a certain house, you do not ask whose house. You cross the street. You keep your eyes in your pockets. *He moves stock that does not need moving.* It looks at the shop. The shop does not look back. That is the whole arrangement, and Scally did not negotiate it. Ask him anything else. Ask him about MAYONNAISE.",
    choices: [
      { text: "You're scared of it. You, Scally.",
        next: { text: "*He laughs, and it is the least convincing product he has ever sold you.* Scared! Scally! *The laugh runs out.* ...a fixer knows every angle, amico. Every door, every price, every man's weakness. Forty years. *He glances toward the glass once, quick, like a man checking traffic.* That thing has no angle. Nothing it wants, nothing to sell to. You cannot DEAL with it. *He shivers his shoulders back into the coat.* And now we are done, and we are talking about anything else, forever. Sì? Sì." } },
      { text: "(Leave it.)" },
    ],
  },

  homiss: {
    text: "*The strings go quiet under his hand, an' he doesn't look at the window. Ye notice the bass is angled so the headstock sits between him an' the glass, an' ye'd swear he doesn't know he's done it.* ...ye've seen it, so. Aye. *A long breath.* I'll tell ye the one thing I know about it, friend, an' then we're playin' somethin', agreed? Everythin' down here HUMS. The walls, the light, the floor — all sittin' on the one note, near enough. I'd know. I've tuned to it. *A pause.* That thing is the only thing in the whole buildin' that makes no sound at all. It's not IN the chord. It's the fella at the back of the session who's only listenin'. *He counts himself in, too quick.* Right! Somethin' in G. G's a safe... G's grand.",
    choices: [
      { text: "Why does that scare you? The quiet?",
        next: { text: "*He keeps his eyes on the strings.* Because everythin' that BELONGS in a room is part of the room's sound, friend. Yer breath, yer weight on the boards, the hum of ye. Everythin' real rings. *The chord goes round again.* So what am I to make of a thing that big, that close... that the room doesn't ring off? *He shakes his head once.* No. No, we're in G now. Stay in G with me like a good man." } },
      { text: "(Leave it.)" },
    ],
  },

  littlebee: {
    text: "*She doesn't answer straight away. She flips the marker an' points at a corner of the glass ye'd taken for tallies: rows of intervals, logged tight, most of them struck through.* Blink intervals. Three hundred an' six observations, timestamped. *She caps the marker with a click.* Ye want the finding? The finding is that I STOPPED. I don't stop loggin' things, courier — loggin' is the last load-bearin' wall I have. An' I stopped the night I noticed the intervals were... *the sentence is inspected, and shut down* ...unsuitable for publication. *She turns her back on the window, which from her is a full retreat.* Next question. I mean it. Next question.",
    choices: [
      { text: "Finish the sentence, Bee. The intervals were what?",
        next: { text: "*A long stillness — the clinician deciding whether the subject can take the reading.* ...synchronised. *She doesn't turn round.* Not to a clock, courier. To ME. It blinks when I blink. Started the night I started loggin' it, like it noticed me noticin'. *The marker goes down on the sill, very gently, an' her voice comes out at lab temperature.* Observer effect. Every instrument disturbs what it measures. I'd just never once, in me whole career, had the measurement disturb BACK. *A beat.* An' now: NEXT. QUESTION." } },
      { text: "(Leave it.)" },
    ],
  },

  sian: {
    text: "*He follows yer point, an' where anyone else down here would flinch, he lights UP.* The big eye?! Class, isn't it! That's yer hero prop, hai — every skybox has one. Ye anchor the whole composition with a big landmark asset: cheap geometry, always faces the camera... *he mimes a flat hand trackin' ye* ...billboardin'. Textbook. The blink's the clever bit — ye put a blink on it so the users FEEL watched. Presence, they call it. Sells the whole immersion for about zero polys. *He gives the eye a big friendly wave, an' means it.* Ten outta ten, whoever made ye, big fella. Bit unsettlin', maybe. That's CRAFT, hai.",
    choices: [
      { text: "It's not an asset, Sian. It follows me. Floor after floor.",
        next: { text: "*He nods along, delighted, missin' the point at full speed.* That's PERSISTENCE, hai! Same asset instanced on every level — dead giveaway it's engine-level, part of the core scene graph. An' it follows ye because it's billboarded to the active camera. YER the active camera, big lad! *He taps his temple.* Ye know what it'd take for that thing to actually be watchin' ye? Input capture, gaze trackin', a whole analytics pipeli— *the sentence stops walkin', for one step, somewhere out past the visor* —...which they'd never ship. Too heavy. *The grin re-renders.* It's paint, hai. Gorgeous, nosy paint. Wave at it. Wavin's free." } },
      { text: "(Leave it.)" },
    ],
  },

  dalypso: {
    text: "*For once in his life, the remote goes DOWN.* We don't talk about that thing. *A beat. But because he's Dalypso, the not-talkin' arrives with full commentary:* I know every camera ever pointed at anybody, neighbour. Studio rig, handheld, the wee dome over the shop door that's only there so ye BEHAVE. Cameras point where the director says. *He picks the remote back up an' aims it past ye, at nothin', clickin' it like a man coverin' a silence.* That one points where IT says. There's no director. I've checked the credits. *He turns the telly up two bars.* New topic. I've a schedule.",
    choices: [
      { text: "You've checked the credits? You've been watching it back?",
        next: { text: "*Caught. He mutes the telly, which is as serious as he gets.* ...every day since I noticed it, aye. Ye watch the watcher — that's just TELLY, that's basic. *He leans close to the glass, voice down.* So here's what I have, an' then this is over: everythin' on every channel behind me LOOPS. I'd know. I've seen every episode of everythin' twice. *One finger, slowly, toward the window.* That thing has never once repeated itself. Whatever it's watchin', it's watchin' it LIVE. *He sits back an' un-mutes.* An' the only live show down here, neighbour, is us. Schedule. NOW." } },
      { text: "(Leave it.)" },
    ],
  },
};

/* the eye topic for this character at this depth, or null. `keep` so it
   never rotates out of the menu; `once` so each character squirms through
   it a single time per cycle (their memory of asking rewinds, the player's
   doesn't). The flag feeds graffitiPool. */
export function eyeTopicFor(ctx){
  const node = EYE_NODES[ctx.character.id];
  if (!node || ctx.depth < EYE_MIN_DEPTH) return null;
  return {
    id: "the-eye", label: "What's that eye out there?", keep: true, once: true,
    effects: { flag: "asked-about-eye", ...(ctx.character.id === "sian" ? { like: +1 } : {}) },
    node,
  };
}
