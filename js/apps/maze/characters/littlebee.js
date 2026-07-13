/* ============================================================
   MAZE.EXE — Little Bee
   A small, sharp Northern Irish neuroscientist who came into the
   Labyrinth Protocol ON PURPOSE — it was sold to her as the digital
   psychedelic, the trip of the century — and never got back out.
   Talks at a gallop, thinks faster than she talks, and will square
   up to anything in the maze without blinking. Under the flint is a
   ferocious softness: she runs little cognitive check-ups on the
   player every level because she cares, and would sooner die than
   say so. Loves Sian. Misses horses the way other people miss air.

   Like scally.js this file is data + drawing only: it exports a
   plain definition that characters.js wraps in a Character instance,
   so it stays free of any engine import (no module cycle). The figure
   is built from composable parts so it renders flat (dialogue box) or
   split across depth layers (the 2.5D in-world figure), and the face
   switches mood: "neutral" | "happy" | "angry" | "sad".
   ============================================================ */

/* drawing ink — defaults to amber, but every draw call is handed the current
   level's ink (see palette.characterInk / characters.js) so all characters
   render in one colour, like an old single-phosphor monitor. */
let LINE = "#ffc46b", FILL = "#33200c";
let GLOW0 = "rgba(255,196,107,.20)", GLOW1 = "rgba(255,196,107,0)";
function applyInk(ink){
  if (!ink) return;
  LINE = ink.line; FILL = ink.fill; GLOW0 = ink.glow0; GLOW1 = ink.glow1;
}

function beeGlow(g, w, h){
  const grd = g.createRadialGradient(w/2, h*0.6, 12, w/2, h*0.6, w*0.58);
  grd.addColorStop(0, GLOW0);
  grd.addColorStop(1, GLOW1);
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
}

/* she is SHORT — the whole figure sits lower in the frame than anyone
   else's, and slighter. A neat, slim jumper torso. */
function beeBody(g, w, h){
  g.lineJoin = "round"; g.lineCap = "round";
  g.strokeStyle = LINE; g.lineWidth = 3; g.fillStyle = FILL;
  const cx = w / 2;
  g.beginPath();
  g.moveTo(cx-46, h*0.97);
  g.bezierCurveTo(cx-54, h*0.72, cx-40, h*0.585, cx-16, h*0.565);
  g.bezierCurveTo(cx-5, h*0.555, cx+5, h*0.555, cx+16, h*0.565);
  g.bezierCurveTo(cx+40, h*0.585, cx+54, h*0.72, cx+46, h*0.97);
  g.closePath(); g.fill(); g.stroke();
  // round neckline + a knit rib either side
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(cx-14, h*0.585); g.quadraticCurveTo(cx, h*0.625, cx+14, h*0.585); g.stroke();
  g.beginPath(); g.moveTo(cx-34, h*0.80); g.lineTo(cx-30, h*0.94); g.stroke();
  g.beginPath(); g.moveTo(cx+34, h*0.80); g.lineTo(cx+30, h*0.94); g.stroke();
  beeHorseMotif(g, cx, h*0.745, w);
}

/* the horse jumper: a chunky knitted horse across the chest — her whole
   personality in one motif. Stroke-only so it reads as a pattern in the
   wool rather than a badge. */
function beeHorseMotif(g, mx, my, w){
  g.strokeStyle = LINE; g.lineCap = "round"; g.lineJoin = "round"; g.lineWidth = 2;
  // body: a plump little barrel
  g.beginPath(); g.ellipse(mx+7, my, w*0.085, w*0.048, 0, 0, Math.PI*2); g.stroke();
  // neck + head, reaching left
  g.beginPath();
  g.moveTo(mx-9, my-6);
  g.quadraticCurveTo(mx-20, my-14, mx-24, my-19);
  g.stroke();
  g.beginPath(); g.ellipse(mx-26, my-21, w*0.026, w*0.017, 0.55, 0, Math.PI*2); g.stroke();
  g.beginPath(); g.moveTo(mx-24, my-25); g.lineTo(mx-22, my-30); g.stroke();      // ear
  // mane: three flicks down the neck
  g.beginPath(); g.moveTo(mx-18, my-16); g.lineTo(mx-14, my-12); g.stroke();
  g.beginPath(); g.moveTo(mx-14, my-11); g.lineTo(mx-10, my-7);  g.stroke();
  // legs: four short strokes, mid-trot
  g.beginPath(); g.moveTo(mx-9,  my+9);  g.lineTo(mx-12, my+20); g.stroke();
  g.beginPath(); g.moveTo(mx-2,  my+11); g.lineTo(mx-1,  my+21); g.stroke();
  g.beginPath(); g.moveTo(mx+13, my+11); g.lineTo(mx+15, my+21); g.stroke();
  g.beginPath(); g.moveTo(mx+20, my+9);  g.lineTo(mx+24, my+19); g.stroke();
  // tail
  g.beginPath(); g.moveTo(mx+27, my-4); g.quadraticCurveTo(mx+36, my-2, mx+34, my+8); g.stroke();
}

/* long straight hair, centre-parted, falling in two curtains past the
   shoulders. Drawn in the head layer so it hangs over the jumper. */
function beeHair(g, hx, hy, hr, h){
  g.lineJoin = "round"; g.strokeStyle = LINE; g.lineWidth = 3; g.fillStyle = FILL;
  const fall = h*0.76;                      // hem of the hair, over the chest
  g.beginPath();
  g.moveTo(hx, hy-hr*1.12);                                       // the parting
  g.bezierCurveTo(hx-hr*0.9, hy-hr*1.10, hx-hr*1.25, hy-hr*0.45, hx-hr*1.22, hy+hr*0.4);
  g.quadraticCurveTo(hx-hr*1.3, fall - 14, hx-hr*1.05, fall);     // left curtain
  g.quadraticCurveTo(hx-hr*0.85, fall - 6, hx-hr*0.78, hy+hr*0.75);
  g.quadraticCurveTo(hx-hr*0.92, hy+hr*0.1, hx-hr*0.62, hy-hr*0.62);  // inner edge, clears the face
  g.quadraticCurveTo(hx-hr*0.2, hy-hr*0.86, hx, hy-hr*0.72);      // fringe dips at the parting
  g.quadraticCurveTo(hx+hr*0.2, hy-hr*0.86, hx+hr*0.62, hy-hr*0.62);
  g.quadraticCurveTo(hx+hr*0.92, hy+hr*0.1, hx+hr*0.78, hy+hr*0.75);
  g.quadraticCurveTo(hx+hr*0.85, fall - 6, hx+hr*1.05, fall);     // right curtain
  g.quadraticCurveTo(hx+hr*1.3, fall - 14, hx+hr*1.22, hy+hr*0.4);
  g.bezierCurveTo(hx+hr*1.25, hy-hr*0.45, hx+hr*0.9, hy-hr*1.10, hx, hy-hr*1.12);
  g.closePath(); g.fill(); g.stroke();
  // a couple of strands so it reads as hair, not a hood
  g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(hx-hr*1.0, hy+hr*0.2); g.quadraticCurveTo(hx-hr*1.08, fall-30, hx-hr*0.95, fall-8); g.stroke();
  g.beginPath(); g.moveTo(hx+hr*1.0, hy+hr*0.2); g.quadraticCurveTo(hx+hr*1.08, fall-30, hx+hr*0.95, fall-8); g.stroke();
}

function beeFace(g, hx, hy, hr, mood){
  g.strokeStyle = LINE; g.fillStyle = LINE; g.lineCap = "round"; g.lineJoin = "round";
  const ey = hy + hr*0.05, lx = hx - hr*0.3, rx = hx + hr*0.3;

  if (mood === "happy"){
    g.lineWidth = 2.2;                                      // brows up, delighted
    g.beginPath(); g.moveTo(hx-hr*0.5, hy-hr*0.34); g.quadraticCurveTo(hx-hr*0.3, hy-hr*0.46, hx-hr*0.1, hy-hr*0.34); g.stroke();
    g.beginPath(); g.moveTo(hx+hr*0.1, hy-hr*0.34); g.quadraticCurveTo(hx+hr*0.3, hy-hr*0.46, hx+hr*0.5, hy-hr*0.34); g.stroke();
    g.beginPath(); g.moveTo(lx-hr*0.12, ey); g.quadraticCurveTo(lx, ey-hr*0.16, lx+hr*0.12, ey); g.stroke();   // ^ ^ eyes
    g.beginPath(); g.moveTo(rx-hr*0.12, ey); g.quadraticCurveTo(rx, ey-hr*0.16, rx+hr*0.12, ey); g.stroke();
    g.lineWidth = 2.6;                                      // the grin she can't help
    g.beginPath(); g.moveTo(hx-hr*0.32, hy+hr*0.5); g.quadraticCurveTo(hx, hy+hr*0.82, hx+hr*0.32, hy+hr*0.5); g.stroke();
  } else if (mood === "angry"){
    // her signature weather. Brows like slammed doors, eyes gone to slits,
    // mouth a flat hard line — the quiet kind of furious.
    g.lineWidth = 2.8;
    g.beginPath(); g.moveTo(hx-hr*0.52, hy-hr*0.42); g.lineTo(hx-hr*0.08, hy-hr*0.16); g.stroke();
    g.beginPath(); g.moveTo(hx+hr*0.52, hy-hr*0.42); g.lineTo(hx+hr*0.08, hy-hr*0.16); g.stroke();
    g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(lx-hr*0.13, ey); g.lineTo(lx+hr*0.11, ey+hr*0.02); g.stroke();
    g.beginPath(); g.moveTo(rx-hr*0.11, ey+hr*0.02); g.lineTo(rx+hr*0.13, ey); g.stroke();
    g.lineWidth = 2.8;
    g.beginPath(); g.moveTo(hx-hr*0.26, hy+hr*0.56); g.lineTo(hx+hr*0.26, hy+hr*0.56); g.stroke();
  } else if (mood === "sad"){
    // the soft side, caught in the open: brows tilted in, eyes big
    g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(hx-hr*0.5, hy-hr*0.26); g.lineTo(hx-hr*0.12, hy-hr*0.4); g.stroke();
    g.beginPath(); g.moveTo(hx+hr*0.5, hy-hr*0.26); g.lineTo(hx+hr*0.12, hy-hr*0.4); g.stroke();
    g.lineWidth = 2;
    g.beginPath(); g.arc(lx, ey, hr*0.1, 0, Math.PI*2); g.stroke();
    g.beginPath(); g.arc(rx, ey, hr*0.1, 0, Math.PI*2); g.stroke();
    g.beginPath(); g.arc(lx, ey, hr*0.04, 0, Math.PI*2); g.fill();
    g.beginPath(); g.arc(rx, ey, hr*0.04, 0, Math.PI*2); g.fill();
    g.lineWidth = 2.6;
    g.beginPath(); g.moveTo(hx-hr*0.24, hy+hr*0.62); g.quadraticCurveTo(hx, hy+hr*0.44, hx+hr*0.24, hy+hr*0.62); g.stroke();
  } else {                                                  // neutral: quick, assessing
    g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(hx-hr*0.48, hy-hr*0.3); g.lineTo(hx-hr*0.1, hy-hr*0.32); g.stroke();   // one brow flat...
    g.beginPath(); g.moveTo(hx+hr*0.1, hy-hr*0.36); g.quadraticCurveTo(hx+hr*0.3, hy-hr*0.5, hx+hr*0.5, hy-hr*0.38); g.stroke();  // ...one arched
    g.beginPath(); g.arc(lx, ey, hr*0.065, 0, Math.PI*2); g.fill();       // steady dot eyes
    g.beginPath(); g.arc(rx, ey, hr*0.065, 0, Math.PI*2); g.fill();
    g.lineWidth = 2.6;                                      // a smirk with the handbrake on
    g.beginPath(); g.moveTo(hx-hr*0.22, hy+hr*0.56); g.quadraticCurveTo(hx+hr*0.06, hy+hr*0.66, hx+hr*0.3, hy+hr*0.5); g.stroke();
  }
}

function beeHead(g, w, h, mood){
  g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = LINE; g.fillStyle = FILL;
  const hx = w/2, hy = h*0.42, hr = w*0.125;
  beeHair(g, hx, hy, hr, h);
  g.lineWidth = 3;
  g.beginPath(); g.ellipse(hx, hy, hr*0.88, hr, 0, 0, Math.PI*2); g.fill(); g.stroke();   // face
  beeFace(g, hx, hy, hr, mood);
}

/* one hand up mid-point (she is always half-way through making a point),
   the other low and loosely fisted */
function beeHands(g, w, h){
  g.lineJoin = "round"; g.strokeStyle = LINE; g.lineWidth = 3; g.fillStyle = FILL;
  const cx = w/2;
  g.beginPath(); g.ellipse(cx+42, h*0.62, w*0.055, w*0.04, -0.5, 0, Math.PI*2); g.fill(); g.stroke();
  g.lineWidth = 2.4;                                                     // the raised finger
  g.beginPath(); g.moveTo(cx+48, h*0.605); g.lineTo(cx+54, h*0.565); g.stroke();
  g.lineWidth = 3;
  g.beginPath(); g.ellipse(cx-30, h*0.82, w*0.055, w*0.042, 0.4, 0, Math.PI*2); g.fill(); g.stroke();
}

/* full flat portrait — used by the dialogue box */
function drawBee(g, w, h, mood = "neutral", ink){
  applyInk(ink);
  g.clearRect(0, 0, w, h);
  beeGlow(g, w, h);
  beeBody(g, w, h);
  beeHead(g, w, h, mood);
  beeHands(g, w, h);
}

/* one depth layer of the figure — used for the 2.5D in-world build.
   0 = body/jumper (back), 1 = head/hair/face (mid), 2 = hands (front). */
function drawBeeLayer(g, w, h, mood, layer, ink){
  applyInk(ink);
  g.clearRect(0, 0, w, h);
  if (layer === 0){ beeGlow(g, w, h); beeBody(g, w, h); }
  else if (layer === 1){ beeHead(g, w, h, mood); }
  else { beeHands(g, w, h); }
}

/* ---------- the check-up ----------
   Every level, Bee runs the player through a rapid little cognitive
   battery — orientation, fluency, a trick question — timing the answers
   on a clock only she can see. It's science, and it's also the closest
   she comes to saying "I was worried about you." The answers genuinely
   don't matter; what she's measuring is that you can still answer.
   Built as nested `next` nodes like Homiss's would-ye-rathers. */
const CHECKUP = [
  { q: "Right, eyes front, this takes thirty seconds. What year is it? Don't think. SAY.",
    a: ["It's... whatever year it is outside.", "Time doesn't apply down here.", "You first."] },
  { q: "Grand. Five animals, quick as ye like. An' if the first one's 'horse' we can be friends.",
    a: ["Horse. Obviously.", "Dog, cat, fox, crow... eh...", "Does Scally count?"] },
  { q: "*She snorts despite herself.* Last one. My hand: how many fingers am I holdin' up? *She is not holding up any fingers.*",
    a: ["None. It's at your side.", "...four?", "Is this a trick?"] },
];

function checkupNode(i){
  const item = CHECKUP[i];
  const last = i === CHECKUP.length - 1;
  return {
    text: item.q,
    choices: [
      ...item.a.map(ans => ({ text: ans, next: last ? checkupClose() : checkupNode(i + 1) })),
      ...(i === 0 ? [{ text: "Bee, I really have to run." }] : []),   // bail early, once
    ],
  };
}
function checkupClose(){
  return {
    text: "*She nods slowly, filing it all somewhere behind her eyes.* Latency grand. Confabulation minimal. Pupils... *she leans in an inch, then back* ...fine. Yer still in there. *And quieter, like she's ticking a box on her own chart too:* Good. That's good. Same time next level.",
    choices: [{ text: "(Same time next level.)" }],
  };
}

/* Little Bee's dialogue hub. Same shape as the others: topics offered as
   choices, retired into `character.seen` per level, trade always open and
   built from the shared economy on the base class. What sets Bee apart:
     • she KNOWS she's trapped and says so plainly — no denial, no game;
       she talks about the Protocol like a phenomenon she's studying from
       the inside, because that's exactly what she's doing;
     • she talks FAST — dashes, pile-ups, no waiting for answers;
     • her hidden desire is an iron horseshoe (`hiddenDesire`): after all
       the digital transcendence, the thing she actually aches for is the
       smell of a yard. She would rather be trampled than admit it. */
function beeDialogue(ctx){
  const { depth, character, player } = ctx;

  const greet = {
    hostile:  "*She doesn't even turn her head.* Away on. I mean it. I've nothin' for ye an' less to say to ye.",
    wary:     "*Arms folded, one eyebrow already up.* Well. Look what the maze dragged in. Talk quick, I'm countin' somethin'.",
    neutral:  "Right, c'mere. Eyes front a second. *She studies yer pupils for exactly half a second.* ...grand, ye'll do. What?",
    friendly: "Ach, it's yerself! Good. I'd questions stackin' up an' nobody worth askin'. C'mere.",
    warm:     "*The whole face lights up, an' for once she doesn't bother hidin' it.* THERE ye are. C'mere to me. I've been keepin' things to tell ye an' they've been goin' off like milk. Sit. Stand. Whatever ye do.",
  }[character.tone];

  return {
    hub: true,
    level: depth,                 // conversations are tracked (and exhausted) per level
    greet,
    exhausted: "Right, that's yer lot. I've observations to write up an' no pen, so I'm memorisin' them. Go on. Mind the seams. *She's already somewhere else.* ...an' EAT somethin'!",
    hostile: "*She looks at ye the way she'd look at a lame stride.* No. Whatever it is: no. Come back when yer somebody else.",
    topics: [
      { id: "place", label: "What is this place, really?", effects: { like: +1 },
        node: { text: "Depends who ye ask, doesn't it. Scally'll tell ye it's the in-between, Homiss'll tell ye it's Tuesday, God love him, an' I'll tell ye what I can measure: it's a state, not a place. The Labyrinth Protocol runs on wetware. Yours. Mine. These walls are somebody's idea of walls, renderin' on the back of our brains like a borrowed screen. Which raises the question nobody down here wants me to finish askin': whose idea?" } },

      { id: "brains", label: "What is this place doing to our heads?", effects: { like: +1 },
        node: { text: "NOW yer askin' the right question. Stand still. Three observations, no extra charge. One: nobody down here gets hungry. Not properly. A body that forgets to want things is a body somethin' else is maintainin'. Two: time. Ask Homiss what day it is an' watch his face. The days don't FILE anymore, they just... stack. An' three, the one that keeps me up, if I even sleep: memory down here is too CRISP. No decay curve. That's not a gift, that's a filin' system with nobody emptyin' the bin. *She taps the glass, once per word.* So: talk to people. I mean it. Conversation's the one thing keepin' the pattern of ye coherent. It's why the maze feels quieter the deeper ye go. It's hopin' ye'll stop." } },

      { id: "horses", label: "What's with the horse on the jumper?", effects: { like: +1 },
        node: { text: "*The eyebrow goes up like a drawbridge.* Horses are the single best thing the physical world ever produced, is what's WITH it. Half a ton of flight animal that DECIDES, mind, to carry ye. D'ye know what dressage is? Two nervous systems agreein' with each other. That's neuroscience ye can RIDE. I'd a mare at home. Bramble. Contrary as sin, wouldn't load in a trailer for God himself. *Her voice does not change at all, which is how ye know.* Anyway. She'll be fat on spring grass by now. NEXT question.",
          choices: [
            { text: "Bramble. Tell me one Bramble story. The worst one.", effects: { like: +2 },
              next: { text: "*The drawbridge comes down, an' she doesn't even fight it.* The WORST one. Right. County show, mornin' of the workin' hunter class. Madam decides, at half six in the mornin', that the horsebox is a predator. TWO HOURS of negotiation, carrots, lungeing, prayer, an' one bribery apple that she took an' STILL didn't load. Missed the class entire. *She's grinnin' now, helpless against it.* An' then walked straight up the ramp at four o'clock, because the class was OVER, d'ye see. She didn't hate the box. She hated the SCHEDULE. *A beat.* ...smartest mammal I ever met, present company included, an' I've met NEUROSCIENTISTS. Next question." } },
            // the trap: a perfectly logical suggestion that treats the one
            // real thing she loves as replaceable with render
            { text: "Couldn't you just render a horse in here? Same neurons firing, surely.", effects: { like: -4 },
              next: { text: "*Everythin' about her stops. When she speaks it's with the terrible gentleness she'd use on a concussion patient.* ...same neurons. *She nods slowly.* Aye. An' a photograph of yer ma is the same PHOTONS, near enough. *The gentleness drops away all at once.* A rendered horse is a MIRROR with a pulse painted on. It doesn't decide. It doesn't refuse the trailer. It doesn't lean its half-ton head on yer chest at the end of a day that broke ye an' CHOOSE to stand there. Render can't consent, an' consent's the whole miracle. *She turns away, arms folded hard.* Ye've just told me ye can't tell love from playback. Down HERE. Where playback is what's eatin' us. Away an' think about what ye said." } },
          ] } },

      // the caring runs both ways: she checks on the player unprompted
      { id: "soft", label: "You keep checking on everyone, don't you?", minAffinity: 55, effects: { like: +1 },
        node: { text: "*A flat stare.* I keep DATA on everyone. It's not the same thing. *Pause.* ...Homiss hasn't asked me a would-ye-rather in a long while, which is like a canary shuttin' up. Scally's grin has four percent more tension in it than it did. Sian... *the voice catches on the name, barely, an' she runs straight over it* ...Sian's grand, Sian's Sian. An' you look like ye haven't slept since ye got here, which, fair. So. Somebody has to keep the charts. Doesn't mean anythin'. Stop lookin' at me like that or I'll start on YOUR levator muscles." } },

      // the recurring bit: her cognitive battery, fresh every level
      { id: "checkup", label: "Go on then. Run your tests.", oneShot: false, keep: true,
        effects: { like: +1 },
        node: () => checkupNode(0) },

      { id: "smart", label: "Is it the 5-HT2A receptor the Protocol binds to?",
        req: { attr: "intelligence", level: 6 }, effects: { like: +2 },
        node: { text: "*She goes completely still, the way a cat does before it's delighted.* ...say that again. Slower. No, don't, we'd be here til the walls rot. YES. Or the digital analogue of it, some agonist pattern in the render itself, has to be. It's the only thing that explains the geometry gettin' gorgeous when yer frightened. I've been down here HOW long with nobody to say '5-HT2A' to?! Right, yer promoted. Ye don't get a badge. The badge is I talk to ye now. Keep up." } },

      { id: "sharp", label: "Your pupils are blown wide. Are you alright?",
        req: { attr: "perception", level: 6 }, effects: { like: +2 },
        node: { text: "*For a second she looks properly caught. Then she laughs, short and real.* Well SPOTTED. They've been like that since the doors shut. Fixed mydriasis. The trip idles, even now. It's why I see the seams. *She taps beside her eye.* An' here's the thing about you clockin' that: nobody else has. Not one of them, in all this time. Either yer wired sharp... or yer lookin' at us the way I look at us. *The smirk comes back.* I'll be watchin' which." } },

      { id: "charm", label: "*Grin* You must be the most dangerous thing down here.",
        req: { attr: "charisma", level: 6 }, effects: { like: +2 },
        node: { text: "*She looks at ye for a long second, then barks a laugh that echoes off down the corridor.* Catch yerself ON. That's the sort of line ye'd buy off a market stall. *But she's still grinning.* ...it's also CORRECT, which is why ye get to keep yer kneecaps. Correct answers matter more than smooth ones. Remember that an' we'll get on famous." } },

      { id: "homiss-pal", label: "You and Homiss seem close.", minAffinity: 50, effects: { like: +1 },
        node: { text: "Ach, Homiss. *The whole face softens, an' she lets it this time.* Before the wires went quiet we'd sessions through the walls, him an' me. He'd play them long drones an' I'd tell him which brainwave band he was drivin'. Forty minutes of one note an' yer man asks, 'is it good though?' It's THETA, Homiss. It's a lullaby for the universe. Of course it's good. *A beat.* He asks ye impossible questions because the possible ones scare him. Answer the impossible ones. It helps him. Don't tell him I said that." } },

      { id: "scally-worry", label: "What do you make of Scally?", minAffinity: 50, effects: { like: +1 },
        node: { text: "*The answer comes slower than her usual gallop, which means she's been sittin' on it.* I like the wee man. That's not the same as trustin' the situation. He's dealin', all hours, like the maze is a market. But lately he's after things. Askin' after things. An' the grin's stretched that wee bit too tight, like a jump saddle on the wrong horse. *She looks at ye straight.* Keep an eye on him for me. Not ON him. FOR him. There's a difference an' I mean the second one." } },

      { id: "rude", label: "Horses. That's a bit sad, isn't it?", effects: { like: -10 },
        node: { text: "*Everything about her goes very quiet, which is far worse than loud.* ...sad. *She nods slowly, as if writin' it down.* Here's what's sad: I've met lab rats with more curiosity than you've just displayed, an' I LIKED them better. Away an' find the exit. I hope it's far." } },

      // Always askable. Built from the shared economy on the base class: a
      // coin-only sale, item-for-item barter, the riddly hidden-desire swap
      // (the horseshoe), and a free gift for friends on the trade cooldown.
      { id: "trade", label: "Have you anything to trade?", oneShot: false, keep: true,
        node: () => {
          const choices = [];

          // 1) everything priced, Labyrinth Tokens only (not on the cooldown)
          for (const sale of character.forSale)
            choices.push({ text: sale.id === "prism"
                             ? `Buy the ${sale.name}. *(She holds it like it might bite.)*`
                             : `Buy the ${sale.name}.`,
                           effects: { give: sale.id, cost: sale.price, like: +2,
                                      flag: `bought-${sale.id}` } });

          // 2) barter: hand over something she openly wants for a trinket
          const swapFor = character.giftable[0];
          for (const id of character.interestsOpen){
            const held = player.inventory.find(it => it.id === id);
            if (held && swapFor)
              choices.push({ text: `Trade your ${held.name} for the ${swapFor.name}.`,
                             effects: { take: held.id, give: swapFor.id, like: +6,
                                        flag: `traded-${held.id}-to-${character.id}` } });
          }

          // 3) the hidden desire — iron — only shows if the player holds it
          const secret = character.hiddenDesire && player.inventory.find(it => it.id === character.hiddenDesire);
          if (secret){
            const prize = character.giftable[0];
            choices.push({ text: `Offer the ${secret.name}. *(She has not taken her eyes off it.)*`,
              effects: { take: secret.id, give: prize?.id, like: +18, flag: "gave-horseshoe" },
              next: { text: "*She takes it in both hands, careful, like it might spook.* ...iron. Actual pitted iron, in a place with no iron in it. *She presses it flat to her cheek an' shuts her eyes, an' for one long second she is standin' somewhere with grass in it.* ...right. *One sniff. All business.* Ye didn't see that. Here, take this, an' if ye breathe a word to a livin' soul I'll have ye. *She hangs the shoe somewhere behind the glass, heels up. For the luck to pool in.*" } });
          }

          // 4) a free trinket for a friend — real generosity starts at 75.
          //    Asking earlier is allowed, and gets you read in-character:
          //    polite brush-off at 40..74, open scorn below 40.
          const freebie = character.giftable[0];
          if (freebie){
            if (character.affinity >= 75 && character.canTrade(depth))
              choices.push({ text: "Anything spare for a friend?",
                             effects: { give: freebie.id, like: +3, gift: true } });
            else if (character.affinity < 75)
              choices.push({ text: "Anything spare for a friend?",
                next: { text: character.affinity < 40
                  ? "*The look she gives ye could sterilise a ward.* A GIFT. To the likes of YOU. Wise up — I've CHARTED yer behaviour, courier, an' the chart says ye'd not get a used swab off me. Earn it or buy it. Them's the two doors."
                  : "Request logged. Denied. *She's not bein' cruel; she's readin' out a result.* Gift-givin's a trust behaviour, an' trust is a DATASET, not a favour ye ask for. Yours is trendin' upward — I'll grant ye that on the record. Keep showin' up at the window. Science'll tell ye when." } });
          }

          choices.push({ text: "(Maybe later.)" });

          // intro line: blunt when you're a stranger, brisk on cooldown, and
          // always one accidental hint about the thing she won't name
          let text;
          if (character.affinity < 40)
            text = "*She doesn't uncross her arms.* Trade? With YOU? Show us the tokens first. Trust is earned an' yer in arrears.";
          else if (character.affinity >= 75 && !character.canTrade(depth))
            text = "*She pats her pockets, businesslike.* Yer after cleanin' me out. Give it a level or two to forage. Coin still talks, mind. Coin always talks.";
          else
            text = "*She lays her few bits out quick an' neat, like tack before a hunt.* Right. Deal or don't, I've no patience for hagglin'. ...here. Random one. If ye ever find somethin' iron down there, curved, heavy, about the size of a smile, I'd... *she catches her own hands shapin' it in the air, an' snaps them flat* Nothin'. Forget it. NEXT.";

          return { text, choices };
        } },
    ],
  };
}

/* plain definition — characters.js wraps this in a Character instance */
export const littlebee = {
  id:   "littlebee",
  name: "LITTLE BEE",
  letter: "B",       // minimap initial ("L" would read as a wall; she's Bee)
  minDepth: 2,       // first window appears at depth 2
  description: "A small, sharp Northern Irish neuroscientist who dove into the Protocol chasing the digital psychedelic and never surfaced. Talks at a gallop, argues like a storm front, loves one lad in a headset and every horse alive. Runs check-ups on everyone because she cares, and will deny it under oath.",
  portrait: drawBee,
  drawLayer: drawBeeLayer,
  layerCount: 3,
  dialogue: beeDialogue,
  inventory: [
    { id: "sugarcube", name: "Sugar Cube",     desc: "A single white cube. 'For horses,' she says. It has a very faint watermark of a grinning sun." },
    { id: "horsehair", name: "Horsehair Plait",desc: "A bracelet woven from a chestnut tail. It smells faintly of rain and hay, even down here. Especially down here." },
    // her prized piece: Labyrinth Tokens only, never gifted (price = LT cost)
    { id: "prism",     name: "Prism Tab",      desc: "A wafer of pure code that dissolves on the mind's tongue. 'The trip of the century,' Bee says. 'Mind yerself with it.'", price: 60 },
  ],
  // what Bee wants from the player. `open` she'll barter for out loud — the
  // data-vial for the science (a third bidder against Scally and Homiss),
  // and Homiss's cassette because forty-minute drones are, in her words,
  // "theta entrainment ye can dance to". `hidden` is the horseshoe: after
  // all the digital transcendence, what she aches for is a yard. She will
  // never, ever say so.
  interests: {
    open:   ["data-vial", "cassette"],
    hidden: "horseshoe",
  },
};
