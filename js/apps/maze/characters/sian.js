/* ============================================================
   MAZE.EXE — Sian
   A big, warm lad from Cavan: programmer by trade, bassist by
   rivalry, builder of combat robots by vocation. He is having the
   time of his LIFE, because he believes — genuinely, sunnily,
   completely — that the Labyrinth Protocol is a VR experience he'll
   take the headset off from any minute now. He is the mutual link
   between everyone down here: school with Dalypso, college with
   Homiss, worked with Scally at a tech giant that shall not be
   named, and in love with Little Bee. The story beats (story.js)
   walk him, level by level, toward the thing everyone else already
   knows — and what he does when he gets there.

   Like scally.js this file is data + drawing only: it exports a
   plain definition that characters.js wraps in a Character instance,
   so it stays free of any engine import (no module cycle). The figure
   is built from composable parts so it renders flat (dialogue box) or
   split across depth layers (the 2.5D in-world figure), and the face
   switches mood: "neutral" | "happy" | "angry" | "sad".
   ============================================================ */

/* shared drawing ink (LINE/FILL/GLOW + applyInk): live bindings set from the
   level's palette on every draw, so all characters render in one colour. */
import { LINE, FILL, GLOW0, GLOW1, applyInk } from "./portrait.js";

function sianGlow(g, w, h){
  const grd = g.createRadialGradient(w/2, h*0.5, 12, w/2, h*0.5, w*0.66);
  grd.addColorStop(0, GLOW0);
  grd.addColorStop(1, GLOW1);
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
}

/* he is TALL and a bit chubby — the figure fills the frame top to bottom,
   a big soft hoodie torso widest at the belly */
function sianBody(g, w, h){
  g.lineJoin = "round"; g.lineCap = "round";
  g.strokeStyle = LINE; g.lineWidth = 3; g.fillStyle = FILL;
  const cx = w / 2;
  g.beginPath();
  g.moveTo(cx-70, h*0.985);
  g.bezierCurveTo(cx-88, h*0.72, cx-66, h*0.42, cx-30, h*0.375);
  g.bezierCurveTo(cx-10, h*0.36, cx+10, h*0.36, cx+30, h*0.375);
  g.bezierCurveTo(cx+66, h*0.42, cx+88, h*0.72, cx+70, h*0.985);
  g.closePath(); g.fill(); g.stroke();
  // bunched hood around the neck
  g.lineWidth = 2.4;
  g.beginPath(); g.moveTo(cx-30, h*0.40); g.quadraticCurveTo(cx, h*0.455, cx+30, h*0.40); g.stroke();
  g.beginPath(); g.moveTo(cx-26, h*0.425); g.quadraticCurveTo(cx, h*0.475, cx+26, h*0.425); g.stroke();
  // drawstrings, uneven (one chewed, obviously)
  g.beginPath(); g.moveTo(cx-10, h*0.46); g.lineTo(cx-12, h*0.56); g.stroke();
  g.beginPath(); g.moveTo(cx+10, h*0.46); g.lineTo(cx+11, h*0.53); g.stroke();
  g.beginPath(); g.arc(cx-12, h*0.565, 2.4, 0, Math.PI*2); g.stroke();
  g.beginPath(); g.arc(cx+11, h*0.535, 2.4, 0, Math.PI*2); g.stroke();
  // the big front pocket
  g.beginPath(); g.moveTo(cx-34, h*0.80); g.quadraticCurveTo(cx, h*0.87, cx+34, h*0.80); g.stroke();
}

/* scruffy short hair poking up over the headset strap */
function sianHair(g, hx, hy, hr){
  g.strokeStyle = LINE; g.lineCap = "round"; g.lineWidth = 2.6;
  const top = hy - hr*0.98;
  for (const [dx, len, lean] of [[-0.55, 0.3, -0.12], [-0.28, 0.42, -0.05], [0, 0.46, 0.02],
                                  [0.28, 0.4, 0.08], [0.55, 0.3, 0.14]]){
    g.beginPath();
    g.moveTo(hx + hr*dx, top + hr*0.14);
    g.quadraticCurveTo(hx + hr*(dx + lean), top - hr*(len*0.6), hx + hr*(dx + lean*2), top - hr*len);
    g.stroke();
  }
}

/* the VR headset: a chunky visor across where the eyes would be, strap
   wrapping the head, one status LED. His whole face happens around it. */
function sianVisor(g, hx, hy, hr){
  g.lineJoin = "round"; g.strokeStyle = LINE; g.fillStyle = FILL;
  const vy = hy - hr*0.02, vw = hr*1.06, vh = hr*0.42, r = hr*0.16;
  // strap first, so the visor sits over it
  g.lineWidth = 4;
  g.beginPath(); g.moveTo(hx-vw, vy); g.lineTo(hx-hr*0.99, vy + hr*0.05); g.stroke();
  g.beginPath(); g.moveTo(hx+vw, vy); g.lineTo(hx+hr*0.99, vy + hr*0.05); g.stroke();
  // visor body (rounded slab)
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(hx-vw+r, vy-vh);
  g.lineTo(hx+vw-r, vy-vh); g.quadraticCurveTo(hx+vw, vy-vh, hx+vw, vy-vh+r);
  g.lineTo(hx+vw, vy+vh-r); g.quadraticCurveTo(hx+vw, vy+vh, hx+vw-r, vy+vh);
  g.lineTo(hx-vw+r, vy+vh); g.quadraticCurveTo(hx-vw, vy+vh, hx-vw, vy+vh-r);
  g.lineTo(hx-vw, vy-vh+r); g.quadraticCurveTo(hx-vw, vy-vh, hx-vw+r, vy-vh);
  g.closePath(); g.fill(); g.stroke();
  // a lens glint and the little status LED
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(hx-vw*0.55, vy-vh*0.3); g.lineTo(hx-vw*0.2, vy+vh*0.35); g.stroke();
  g.beginPath(); g.moveTo(hx-vw*0.32, vy-vh*0.3); g.lineTo(hx-vw*0.05, vy+vh*0.2); g.stroke();
  g.fillStyle = LINE;
  g.beginPath(); g.arc(hx+vw*0.78, vy-vh*0.45, hr*0.05, 0, Math.PI*2); g.fill();
}

/* with the eyes hidden, every mood lives in the brows (above the visor)
   and the mouth (below it) — which suits a man this expressive fine */
function sianFace(g, hx, hy, hr, mood){
  g.strokeStyle = LINE; g.fillStyle = LINE; g.lineCap = "round"; g.lineJoin = "round";
  const by = hy - hr*0.62;          // brow line, above the visor
  const my = hy + hr*0.62;          // mouth line, below it

  if (mood === "happy"){
    g.lineWidth = 2.6;                                       // brows launched
    g.beginPath(); g.moveTo(hx-hr*0.52, by); g.quadraticCurveTo(hx-hr*0.3, by-hr*0.18, hx-hr*0.08, by); g.stroke();
    g.beginPath(); g.moveTo(hx+hr*0.08, by); g.quadraticCurveTo(hx+hr*0.3, by-hr*0.18, hx+hr*0.52, by); g.stroke();
    g.lineWidth = 3;                                         // an enormous grin
    g.beginPath(); g.moveTo(hx-hr*0.42, my-hr*0.08); g.quadraticCurveTo(hx, my+hr*0.34, hx+hr*0.42, my-hr*0.08); g.stroke();
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(hx-hr*0.28, my+hr*0.09); g.quadraticCurveTo(hx, my+hr*0.22, hx+hr*0.28, my+hr*0.09); g.stroke();
  } else if (mood === "angry"){
    // the overreaction special: brows slammed, mouth mid-"WHAT?!"
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(hx-hr*0.55, by-hr*0.1); g.lineTo(hx-hr*0.08, by+hr*0.12); g.stroke();
    g.beginPath(); g.moveTo(hx+hr*0.55, by-hr*0.1); g.lineTo(hx+hr*0.08, by+hr*0.12); g.stroke();
    g.lineWidth = 2.6;
    g.beginPath(); g.ellipse(hx, my+hr*0.04, hr*0.2, hr*0.26, 0, 0, Math.PI*2); g.stroke();
  } else if (mood === "sad"){
    // the panic face: brows way up, a small unsteady mouth, one bead of
    // sweat by the temple. Immersion, hai. That's all it is. Immersion.
    g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(hx-hr*0.52, by+hr*0.04); g.lineTo(hx-hr*0.1, by-hr*0.16); g.stroke();
    g.beginPath(); g.moveTo(hx+hr*0.52, by+hr*0.04); g.lineTo(hx+hr*0.1, by-hr*0.16); g.stroke();
    g.lineWidth = 2.6;
    g.beginPath();
    g.moveTo(hx-hr*0.22, my+hr*0.06);
    g.quadraticCurveTo(hx-hr*0.08, my-hr*0.04, hx+hr*0.02, my+hr*0.06);
    g.quadraticCurveTo(hx+hr*0.12, my+hr*0.14, hx+hr*0.22, my+hr*0.04);
    g.stroke();
    g.lineWidth = 2;                                         // the sweat bead
    g.beginPath();
    g.moveTo(hx+hr*0.92, hy-hr*0.5);
    g.quadraticCurveTo(hx+hr*1.02, hy-hr*0.34, hx+hr*0.92, hy-hr*0.28);
    g.quadraticCurveTo(hx+hr*0.82, hy-hr*0.34, hx+hr*0.92, hy-hr*0.5);
    g.stroke();
  } else {                                                   // neutral: easy, sunny
    g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(hx-hr*0.5, by); g.quadraticCurveTo(hx-hr*0.3, by-hr*0.08, hx-hr*0.1, by); g.stroke();
    g.beginPath(); g.moveTo(hx+hr*0.1, by); g.quadraticCurveTo(hx+hr*0.3, by-hr*0.08, hx+hr*0.5, by); g.stroke();
    g.lineWidth = 2.8;                                       // a grin at rest
    g.beginPath(); g.moveTo(hx-hr*0.3, my); g.quadraticCurveTo(hx+hr*0.02, my+hr*0.2, hx+hr*0.34, my-hr*0.04); g.stroke();
  }
}

function sianHead(g, w, h, mood){
  g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = LINE; g.fillStyle = FILL;
  const hx = w/2, hy = h*0.20, hr = w*0.145;
  g.lineWidth = 3;
  g.beginPath(); g.ellipse(hx, hy, hr*0.95, hr*1.04, 0, 0, Math.PI*2); g.fill(); g.stroke();   // a big friendly head
  // a soft second chin — drawn kindly
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(hx-hr*0.4, hy+hr*0.92); g.quadraticCurveTo(hx, hy+hr*1.08, hx+hr*0.4, hy+hr*0.92); g.stroke();
  sianHair(g, hx, hy, hr);
  sianVisor(g, hx, hy, hr);
  sianFace(g, hx, hy, hr, mood);
}

/* both hands up holding VR controllers — a man mid-game, permanently */
function sianHands(g, w, h){
  g.lineJoin = "round"; g.strokeStyle = LINE; g.lineWidth = 3; g.fillStyle = FILL;
  const cx = w/2;
  for (const [px, py, tilt] of [[cx-58, h*0.64, -0.4], [cx+58, h*0.62, 0.4]]){
    // the tracking ring first, so the hand overlaps it
    g.lineWidth = 2.4;
    g.beginPath(); g.ellipse(px, py - w*0.045, w*0.052, w*0.028, tilt, 0, Math.PI*2); g.stroke();
    // hand wrapped around the grip
    g.lineWidth = 3;
    g.beginPath(); g.ellipse(px, py, w*0.062, w*0.048, tilt, 0, Math.PI*2); g.fill(); g.stroke();
  }
}

/* full flat portrait — used by the dialogue box */
function drawSian(g, w, h, mood = "neutral", ink){
  applyInk(ink);
  g.clearRect(0, 0, w, h);
  sianGlow(g, w, h);
  sianBody(g, w, h);
  sianHead(g, w, h, mood);
  sianHands(g, w, h);
}

/* one depth layer of the figure — used for the 2.5D in-world build.
   0 = body/hoodie (back), 1 = head/visor/face (mid), 2 = hands (front). */
function drawSianLayer(g, w, h, mood, layer, ink){
  applyInk(ink);
  g.clearRect(0, 0, w, h);
  if (layer === 0){ sianGlow(g, w, h); sianBody(g, w, h); }
  else if (layer === 1){ sianHead(g, w, h, mood); }
  else { sianHands(g, w, h); }
}

/* ---------- design-a-bot ----------
   Sian's recurring bit: he workshops his next combat robot with the
   player, one decision at a time, overruling every single choice with
   maximum volume and zero malice — and then falling in love with the
   design anyway. Nested `next` nodes, same machinery as Homiss's
   would-ye-rathers: the content of the pick doesn't matter, the CRAIC
   of the pick is everything. */
const BOT_STEPS = [
  { q: "YES. Right. Hypothetical bot: thirteen kilos, house rules, budget of whatever I find in these walls. First call: chassis. Wedge, walker, or somethin' the insurance fella can never know about?",
    a: ["Wedge. Reliable. Boring. Wins.", "Walker. Style points.", "The insurance one, obviously."] },
  { q: "*He explodes.* NO. No no n... actually. ACTUALLY. Hmm. Hai, that's not the worst call I've heard today. Right, it's your funeral: WEAPON. Spinner, flipper... or fire? Say fire. Don't say fire. Say it.",
    a: ["Spinner. Maximum chaos.", "Flipper. Dignity in victory.", "Fire. You said not to."] },
  { q: "*He grips the window frame like a corner man.* Ye absolute MENACE. I love it. It's banned in three counties an' I love it. LAST call, an' this one matters more than both the others: the name. Go.",
    a: ["Brenda II: The Reckoning.", "Something with 'Doom' in it.", "Name it after Bee. I dare you."] },
];

function botNode(i){
  const item = BOT_STEPS[i];
  const last = i === BOT_STEPS.length - 1;
  return {
    text: item.q,
    choices: [
      ...item.a.map(ans => ({ text: ans, next: last ? botClose() : botNode(i + 1) })),
      ...(i === 0 ? [{ text: "Sian, I've a maze to be getting on with." }] : []),
    ],
  };
}
function botClose(){
  return {
    text: "*He steps back from an invisible whiteboard, visibly moved.* ...it's beautiful, hai. It would be DISQUALIFIED, an' it's beautiful. Soon as I find the workshop level in this place, an' there's ALWAYS a workshop level, we're buildin' her. Shake on it. *Ye shake on it through the glass, somehow, which neither of ye questions.*",
    choices: [{ text: "(It's a deal.)" }],
  };
}

/* Sian's dialogue hub. Same shape as the others: topics offered as choices,
   retired into `character.seen` per level, the trade topic always open and
   built from the shared economy on the base class. What sets Sian apart:
     • he believes this is a VR EXPERIENCE — he reviews the graphics, hunts
       for collision bugs, calls the player "another user" and the LT
       "in-game currency". He is not in denial like Homiss; he is having
       FUN. The story beats in story.js are what slowly take that apart;
     • his hidden desire is a corporate lanyard (`hiddenDesire`) from the
       tech giant that shall not be named — the one thread of his old life
       he can't explain being here, and can't leave alone. */
function sianDialogue(ctx){
  const { depth, character, player } = ctx;

  const greet = {
    hostile:  "*He turns a controller over an' over in his hands, not lookin' at ye.* ...oh. It's you, hai. Sound. I'm busy.",
    wary:     "Alright. *A nod. No grin. From Sian that's a five-alarm freeze.* What's the craic.",
    neutral:  "Well HELLO, another user! What's the craic, hai? Some graphics in this place, aren't they? Look at the FOG. Ye couldn't render that fog on a work machine an' I'd know, hai, I've TRIED.",
    friendly: "Ah here, it's yerself! *He air-drums a little fill on the window frame.* C'mon over. I found a wall with a seam in it two corridors back. Ye HAVE to see it. First bug in the whole build.",
    warm:     "*He lights up like a loading screen finishing.* The MAIN character! I was only just sayin' to meself, I hope the game spawns more of that one, hai. Best NPC in the... yer not an NPC. Best WHATEVER in the build. C'mere.",
  }[character.tone];

  return {
    hub: true,
    level: depth,                  // conversations are tracked (and exhausted) per level
    greet,
    exhausted: "Right, I've to get back to it. That wall's got a collision bug an' I WILL clip through it before the day's out, hai. Go on. Come back when there's craic. There's always craic.",
    hostile: "*He pulls the visor down like a welding mask.* Nah. Yer muted, hai. MUTED. *He mimes pressing a button with enormous dignity.*",
    topics: [
      { id: "place", label: "So what do you make of all this?", effects: { like: +1 },
        node: { text: "Honestly? Five stars. FIVE, hai. The hand trackin' alone, look, *he wiggles his fingers at ye through the glass*, flawless. No jitter, no driftin', an' there's NO latency. I've shipped code, hai. This thing doesn't even HAVE a frame budget. Whoever built it is ten years ahead of anythin' I ever... *a tiny pause, the first one* ...anyway. Game of the year. Bit long, maybe." } },

      { id: "bass", label: "I hear you play bass.", effects: { like: +1 },
        node: { text: "I PLAY bass. Homiss OWNS a bass. There's a difference, hai. *He's grinnin' but he's up on his toes.* Yer man got a DOCTORATE in it. In BASS! Ye can't peer-review a groove, hai. Either the room moves or it doesn't. He plays one note for forty minutes an' calls it a piece; I play forty notes in one minute an' he calls it 'a panic attack in E'. *A beat. The grin softens.* ...he's better than me. Ye didn't hear that. He'd agree with ye an' that'd be worse." } },

      { id: "robots", label: "Tell me about the combat robots.", effects: { like: +1 },
        node: { text: "*He inhales like a man about to recite scripture.* Brenda. Twelve kilos, hardened steel wedge, drum spinner off a washin' machine motor I rewound MEself. Undefeated in Leinster, hai. Well. One loss. Disqualification. There was FIRE, the rules are VAGUE about fire, we've been over this at the tribunal. *He mimes her turnin' circles.* She's sittin' in me shed right now with her batteries out, like a knight in a tomb. First thing I'm doin' when I take this headset off is chargin' her up. First thing." } },

      // the recurring bit: workshop the next bot, fresh every level
      { id: "designbot", label: "Let's design your next bot.", oneShot: false, keep: true,
        effects: { like: +1 },
        node: () => botNode(0) },

      { id: "bee-love", label: "Little Bee. She's yours, then?", minAffinity: 55, effects: { like: +1 },
        node: { text: "*The grin goes soft at the edges, an' he doesn't fight it.* Aye. Met her at a robot fight, if ye can believe it. Brenda died mid-bout, servo went, an' this small FURIOUS genius leans over the barrier an' diagnoses it by EAR. Over the crowd! I was done for on the spot. Doctor of brains, rides horses, argues like a barrister with a wasp in her jacket... *He taps the glass, softer.* She's in here somewhere too. Went deep after the trippy stuff. That's her idea of a holiday. She can mind herself better than I can mind meself. But... ye'd tell me. If ye saw her. That she's grand. Ye'd tell me, hai." } },

      { id: "school", label: "You and Dalypso go way back?", effects: { like: +1 },
        node: { text: "Since we were six, hai! D'ye know he once fought the referee AND both managers at an under-12 match, from the STANDS? He was eleven. Escorted out of a game he wasn't even PLAYIN' in. *He wipes an eye.* Heart of gold on him, mind. He'd give ye his last euro an' then argue ye shouldn't spend it. The man would start a row with rain for bein' wet. But ye want him in yer corner. There's nobody better in yer corner." } },

      { id: "work", label: "You worked with Scally?", effects: { like: +1 },
        node: { text: "At the tech giant that shall not be named, hai. Aye. *He glances left an' right on reflex, which is mad, given.* Everyone knew Scally. NOBODY knew what Scally did. He wasn't on any org chart I ever saw, an' I looked. All ye knew was: whatever ye needed, a standin' desk, a graphics card, a fire exit that didn't set off the alarm, ye asked the wee man, an' it appeared, an' ye didn't ask a second question. *A beat.* Funny him bein' in here. In a... in the same game. Small world, hai.",
          choices: [
            { text: "A fire exit that didn't set off the alarm? Go on. Whose idea was that?", effects: { like: +2 },
              next: { text: "*He lights up like a man handed a match an' permission.* MINE, hai! Well. The NEED was mine. There was a roof. There was a sunset. There was a girl I was TEXTIN' about the sunset... *he waves it off, grinnin'.* I asked the wee man on the Monday, an' on the WEDNESDAY there's a fire door on floor four with a wee cornicello sticker on it, an' that door never made a sound again. No invoice. No questions. Just *he snaps his fingers* SORTED. *A beat, an' the grin goes fond.* Whole buildin' full of geniuses, an' the only man who could actually DO things wore a flat cap an' officially didn't exist. Says somethin', hai. I don't know WHAT. But it says it." } },
            // the trap: reasonable workplace paranoia, aimed at his mate
            { text: "No org chart, appears everywhere, knows everything? Sian, he was obviously surveillance.", effects: { like: -3 },
              next: { text: "*The grin stops movin'.* ...surveillance. *He sets the controller down, an' when he talks the warmth's been swapped out for somethin' careful.* Scally lent me his OWN coat one winter, hai. Off his back, in the car park, because I was after givin' mine to... doesn't matter. The wee man FED people. Half the graduate intake owed him their deposit money an' the other half owed him their JOBS. *He folds his arms.* An' I'm supposed to hear he was a CAMERA? *He shakes his head slowly.* Ye want to watch that, partner. Down here the theories do more damage than the MAZE does. He's me MATE. Find a different suspect, hai." } },
          ] } },

      { id: "agile", label: "*He tosses the battlebot at you without warning.*",
        req: { attr: "agility", level: 6 }, effects: { like: +2 },
        node: { text: "THINK FAST... *it's already in yer hand, spinner-side safely down, before he finishes the shout. He stares.* ...ye caught her. ONE-handed, on the ARMOURED side. D'ye know the reaction time on that? Frame-perfect, hai. *He points at ye like a manager who's just found a free agent.* Right, that's it, yer on pit crew. No arguments. Ye've the hands for it an' Dalypso's banned from three venues." } },

      { id: "smart", label: "What's this place's render pipeline like?",
        req: { attr: "intelligence", level: 6 }, effects: { like: +2 },
        node: { text: "*He lights up, a colleague!, an' then, halfway through the first sentence, dims.* Deferred, has to be, the light count alone... see, that's the thing though. I went lookin' for the framerate. Ye can always FEEL a framerate, hai. A dropped frame here an' there, like a heartbeat. *He taps the glass twice.* This has no heartbeat. It never drops. Not when the fog's thick, not with all the particles, never. Either it's runnin' on somethin' the size of a power station... or it's not renderin' the way renderin' works. *The grin comes back a half-second late.* Mad optimisation, hai. Fair play to them." } },

      { id: "strong", label: "*He can't get the chassis open. Put your hands to it.*",
        req: { attr: "strength", level: 6 }, effects: { like: +2 },
        node: { text: "It's seized, hai, don't bother, I've been at it an hour with... *the casing comes apart in yer hands with a bang like a shot. He looks at the two halves, then at you, then back.* ...HOLY God. That's torqued to forty newton-metres, that is. WAS. *He takes the halves back, reverent.* Right, new plan: yer not pit crew anymore, yer the WEAPON. We'll strap a wedge to ye. Thirteen-kilo class? Ye'd WALK it, hai." } },

      { id: "charm", label: "*Deadpan* You're the best craic in this whole maze.",
        req: { attr: "charisma", level: 6 }, effects: { like: +2 },
        node: { text: "*He clutches his chest like he's been flipped.* Now THAT is a review I'll be quotin'. 'Best craic in the maze', five stars, verified user. *He straightens up, mock-solemn.* I'd say yer only sayin' it, but here's the thing, hai: I've decided not to care. Flattery works on me a HUNDRED percent of the time an' I've made peace with it. C'mere, ye've unlocked the good stories now. Did I ever tell ye about the tribunal?" } },

      { id: "rude", label: "The robots are toys, and Homiss is the better bassist.", effects: { like: -10 },
        node: { text: "*He goes off like a car alarm.* TOYS?! Brenda is twelve KILOS of... an' HOMISS?! HOMISS is... *and then, all at once, the air goes out of him, which is far worse.* ...he is, actually. He's the better player. The robots bit was just mean, hai. *He picks up the controller an' turns away.* Game's more fun single-player anyway." } },

      // Always askable. Built from the shared economy on the base class: a
      // coin-only sale, item-for-item barter (he wants Homiss's plectrum —
      // the rivalry demands a trophy — and relic shards to decompile), the
      // hidden-desire swap for the lanyard, and a free gift for friends on
      // the trade cooldown. He thinks the LT is in-game currency and grinds
      // it with total joy.
      { id: "trade", label: "Open up the shop, so.", oneShot: false, keep: true,
        node: () => {
          const choices = [];

          // 1) everything priced, Labyrinth Tokens only (not on the cooldown)
          for (const sale of character.forSale)
            choices.push({ text: `Buy the ${sale.name}.`,
                           effects: { give: sale.id, cost: sale.price, like: +2,
                                      flag: `bought-${sale.id}` } });

          // 2) barter: hand over something he openly wants for a trinket
          for (const id of character.interestsOpen){
            const held = player.inventory.find(it => it.id === id);
            // the reward is chosen by WHAT you hand over (character.trades.barter),
            // not pocket order — so item-specific rewards land where the story wants
            const rewardId = held && character.barterRewardId(id);
            const reward = rewardId && character.inventory.find(it => it.id === rewardId);
            if (held && reward)
              choices.push({ text: id === "plectrum"
                               ? `Trade Homiss's ${held.name} for the ${reward.name}. *(He wants the trophy.)*`
                               : `Trade your ${held.name} for the ${reward.name}.`,
                             effects: { take: held.id, give: reward.id, like: +6,
                                        flag: `traded-${held.id}-to-${character.id}` } });
          }

          // 3) the hidden desire — the lanyard — only shows if the player holds it
          const secret = character.hiddenDesire && player.inventory.find(it => it.id === character.hiddenDesire);
          if (secret){
            const prizeId = character.hiddenPrizeId();
            const prize = prizeId && character.inventory.find(it => it.id === prizeId);
            choices.push({ text: `Offer the ${secret.name}. *(He has gone very still.)*`,
              effects: { take: secret.id, give: prize?.id, like: +18, flag: "gave-lanyard" },
              next: { text: "*He takes it an' turns it over, an' for a long moment he isn't playin' anything at all.* ...I had one of these. This exact lanyard. Same scratch where the logo goes. We all scratched it off. It was that kind of place. *He looks up at ye, an' the visor hides whatever his eyes are doin'.* This was WORK, hai. This was us. The Protocol isn't somebody's game. It's somebody's PRODUCT. Somebody stood up in a plannin' meetin' an' SHIPPED this. *He pockets it, an' the grin that comes back on is the one he used to wear to stand-ups.* Here. Take somethin' for it. An' keep yer save backed up, hai. I mean that as a friend." } });
          }

          // 4) a free trinket for a friend — real generosity starts at 75.
          //    Asking earlier is allowed, and gets you read in-character:
          //    polite brush-off at 40..74, open scorn below 40.
          const freebie = character.giftable[0];
          if (freebie){
            if (character.affinity >= 75 && character.canTrade(depth))
              choices.push({ text: "Anything going spare for the pit crew?",
                             effects: { give: freebie.id, like: +3, gift: true } });
            else if (character.affinity < 75)
              choices.push({ text: "Anything going spare for the pit crew?",
                next: { text: character.affinity < 40
                  ? "*He laughs once, flat, no 'hai' anywhere near it.* Free loot. For YOU. Big lad, yer reputation with this vendor is BOTTOMED OUT. Ye know how standin's work: ye grind them. Away an' grind."
                  : "Ah here — free stuff's ENDGAME content, hai. Loyalty rewards. You an' me are only mid-campaign: decent co-op, good banter, gift tier's not unlocked yet. *He taps an invisible progress bar between yez.* Few more levels o' this an' the drops start droppin'. I don't make the rules. I DO make the rules. The rules stand, hai." } });
          }

          choices.push({ text: "(Maybe later.)" });

          // intro line: a Cavan man runs a tight shop — cagey with strangers,
          // scandalised on cooldown, and always one odd request off the books
          let text;
          if (character.affinity < 40)
            text = "*He sucks his teeth.* Economy's rough, hai. Nothin' personal, but I don't know yer gamertag from Adam. Coin up front, an' count it where I can see ye.";
          else if (character.affinity >= 75 && !character.canTrade(depth))
            text = "Inventory's SPOKEN for, hai. I'm a Cavan man, we don't do 'spare'. *winks* Give it a level or two. The shop restocks. ...I assume the shop restocks.";
          else
            text = "Vendor mode: ENGAGED. *He mimes a till openin'.* Right, what are ye buyin', what are ye sellin'? ...oh, an' a random one, off the books: if ye ever come across a wee card on a string out there, plastic, photo on it, like a work badge, grab it for me. Don't ask why. *The grin doesn't move, but somethin' behind it does.* Just grab it, hai.";

          // carrying something he openly wants? he'll angle for it
          const eyeing = character.interestsOpen.map(id => player.inventory.find(it => it.id === id)).find(Boolean);
          if (eyeing && character.affinity >= 40 && character.giftable.length)
            text += ` ...an' is that a ${eyeing.name} yer carryin', hai? Askin' for a friend. I'm the friend.`;

          return { text, choices };
        } },
    ],
  };
}

/* plain definition — characters.js wraps this in a Character instance */
export const sian = {
  id:   "sian",
  name: "SIAN",
  letter: "5",       // minimap initial — "S" is Scally's; Sian tags himself 5IAN on every leaderboard anyway
  minDepth: 3,       // first window appears at depth 3
  description: "A big warm lad from Cavan in a VR headset: programmer, combat-robot builder, bass rival to Homiss and the mutual link between everyone down here. Convinced the Labyrinth Protocol is the greatest VR experience ever shipped. Five stars. Bit long, maybe.",
  portrait: drawSian,
  drawLayer: drawSianLayer,
  layerCount: 3,
  dialogue: sianDialogue,
  inventory: [
    { id: "servo",     name: "Combat Servo",     desc: "A stubby motor off a battlebot. 'Brenda's knee,' Sian says, as if that explains anything." },
    { id: "patchlead", name: "Frayed Patch Lead",desc: "A bass cable mended with a decade of electrical tape. 'The tone's IN the tape, hai.'" },
    // his prized piece: Labyrinth Tokens only, never gifted (price = LT cost)
    { id: "battlebot", name: "Palm-Size Battlebot", desc: "A tiny armoured wedge with an angry little spinner. It hums when you hold it near a wall, like it can smell one.", price: 70 },
  ],
  // what Sian wants from the player. `open` he'll barter for out loud —
  // Homiss's bone plectrum (the rivalry demands a trophy) and relic shards
  // (a programmer wants source code to pick apart). `hidden` is the
  // corporate lanyard: the one artifact of his old life that has no
  // business being inside a game, and the thread that unravels everything.
  interests: {
    open:   ["plectrum", "relic-shard"],
    hidden: "lanyard",
  },
  // per-path trade rewards (STORY.md §4/§7): barter rewards by what you give,
  // and the prized battlebot handed over free for the corporate lanyard.
  trades: {
    barter: { "plectrum": "servo", "relic-shard": "patchlead" },
    hiddenPrize: "battlebot",   // the palm-size battlebot, for the lanyard
  },
};
