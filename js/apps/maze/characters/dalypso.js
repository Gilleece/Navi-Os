/* ============================================================
   MAZE.EXE — Dalypso
   A red-headed man in a football jersey who will argue with rain
   for being wet, and would also carry that rain home if it looked
   tired. Encyclopedic on every film and TV programme ever made —
   and on several that were never made, which he watches anyway on
   a window that "gets all the channels". Just bought a house. He
   would like you to know about the house. He would like everyone
   to know about the house. Where the house is, exactly, is a
   question the maze prefers you didn't ask him.

   Like scally.js this file is data + drawing only: it exports a
   plain definition that characters.js wraps in a Character instance,
   so it stays free of any engine import (no module cycle). The figure
   is built from composable parts so it renders flat (dialogue box) or
   split across depth layers (the 2.5D in-world figure), and the face
   switches mood: "neutral" | "happy" | "angry" | "sad".
   ============================================================ */

/* drawing ink — defaults to red-orange (the hair insists), but every draw
   call is handed the current level's ink (see palette.characterInk /
   characters.js) so all characters render in one colour, like an old
   single-phosphor monitor. */
let LINE = "#ff8c5a", FILL = "#331409";
let GLOW0 = "rgba(255,140,90,.20)", GLOW1 = "rgba(255,140,90,0)";
function applyInk(ink){
  if (!ink) return;
  LINE = ink.line; FILL = ink.fill; GLOW0 = ink.glow0; GLOW1 = ink.glow1;
}

function dalGlow(g, w, h){
  const grd = g.createRadialGradient(w/2, h*0.55, 12, w/2, h*0.55, w*0.62);
  grd.addColorStop(0, GLOW0);
  grd.addColorStop(1, GLOW1);
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
}

/* a sturdy five-a-side build in a football jersey: V collar, club crest,
   two sponsor-less stripes, and the ball tucked against his hip */
function dalBody(g, w, h){
  g.lineJoin = "round"; g.lineCap = "round";
  g.strokeStyle = LINE; g.lineWidth = 3; g.fillStyle = FILL;
  const cx = w / 2;
  g.beginPath();
  g.moveTo(cx-64, h*0.97);
  g.bezierCurveTo(cx-76, h*0.66, cx-52, h*0.44, cx-22, h*0.415);
  g.bezierCurveTo(cx-8, h*0.405, cx+8, h*0.405, cx+22, h*0.415);
  g.bezierCurveTo(cx+52, h*0.44, cx+76, h*0.66, cx+64, h*0.97);
  g.closePath(); g.fill(); g.stroke();
  // the V collar
  g.lineWidth = 2.4;
  g.beginPath(); g.moveTo(cx-15, h*0.43); g.lineTo(cx, h*0.50); g.lineTo(cx+15, h*0.43); g.stroke();
  // club crest over the heart (a shield with one proud dot)
  g.beginPath();
  g.moveTo(cx-32, h*0.52);
  g.lineTo(cx-18, h*0.52); g.lineTo(cx-18, h*0.585);
  g.quadraticCurveTo(cx-25, h*0.615, cx-25, h*0.615);
  g.quadraticCurveTo(cx-32, h*0.585, cx-32, h*0.585);
  g.closePath(); g.stroke();
  g.fillStyle = LINE;
  g.beginPath(); g.arc(cx-25, h*0.555, 2.2, 0, Math.PI*2); g.fill();
  g.fillStyle = FILL;
  // two jersey stripes down the far side
  g.beginPath(); g.moveTo(cx+24, h*0.46); g.lineTo(cx+30, h*0.94); g.stroke();
  g.beginPath(); g.moveTo(cx+40, h*0.485); g.lineTo(cx+46, h*0.93); g.stroke();
  // hem
  g.beginPath(); g.moveTo(cx-56, h*0.93); g.quadraticCurveTo(cx, h*0.965, cx+56, h*0.93); g.stroke();
  dalBall(g, cx - 46, h*0.84, w);
}

/* the football, held against his hip — pentagon panel and spokes so it
   reads as a proper ball and not a balloon */
function dalBall(g, bx, by, w){
  const r = w*0.095;
  g.lineJoin = "round"; g.strokeStyle = LINE; g.lineWidth = 3; g.fillStyle = FILL;
  g.beginPath(); g.arc(bx, by, r, 0, Math.PI*2); g.fill(); g.stroke();
  // centre pentagon
  g.lineWidth = 2;
  const pr = r*0.38, pts = [];
  for (let i = 0; i < 5; i++){
    const a = -Math.PI/2 + i * (Math.PI*2/5);
    pts.push([bx + Math.cos(a)*pr, by + Math.sin(a)*pr]);
  }
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) g.lineTo(x, y);
  g.closePath(); g.stroke();
  // spokes out to the seam
  for (const [x, y] of pts){
    const dx = x - bx, dy = y - by, l = Math.hypot(dx, dy);
    g.beginPath(); g.moveTo(x, y); g.lineTo(bx + dx/l*r*0.92, by + dy/l*r*0.92); g.stroke();
  }
}

/* the red mop: a scruffy thatch with a jagged fringe, plus sideburns.
   In single-ink line art the RED is on trust — but the shape says it. */
function dalHair(g, hx, hy, hr){
  g.lineJoin = "round"; g.strokeStyle = LINE; g.lineWidth = 3; g.fillStyle = FILL;
  g.beginPath();
  g.moveTo(hx-hr*1.0, hy+hr*0.05);
  g.bezierCurveTo(hx-hr*1.15, hy-hr*0.6, hx-hr*0.8, hy-hr*1.1, hx-hr*0.45, hy-hr*1.02);
  // the jagged top — five unruly tufts
  g.lineTo(hx-hr*0.38, hy-hr*1.28);
  g.lineTo(hx-hr*0.18, hy-hr*1.02);
  g.lineTo(hx+hr*0.02, hy-hr*1.34);
  g.lineTo(hx+hr*0.2,  hy-hr*1.04);
  g.lineTo(hx+hr*0.42, hy-hr*1.26);
  g.lineTo(hx+hr*0.5,  hy-hr*0.98);
  g.bezierCurveTo(hx+hr*0.85, hy-hr*1.05, hx+hr*1.15, hy-hr*0.55, hx+hr*1.0, hy+hr*0.05);
  // scalloped underside across the forehead
  g.quadraticCurveTo(hx+hr*0.8, hy-hr*0.35, hx+hr*0.55, hy-hr*0.48);
  g.quadraticCurveTo(hx+hr*0.25, hy-hr*0.32, hx, hy-hr*0.5);
  g.quadraticCurveTo(hx-hr*0.25, hy-hr*0.32, hx-hr*0.55, hy-hr*0.48);
  g.quadraticCurveTo(hx-hr*0.8, hy-hr*0.35, hx-hr*1.0, hy+hr*0.05);
  g.closePath(); g.fill(); g.stroke();
  // sideburns
  g.lineWidth = 2.4;
  g.beginPath(); g.moveTo(hx-hr*0.92, hy+hr*0.02); g.lineTo(hx-hr*0.86, hy+hr*0.34); g.stroke();
  g.beginPath(); g.moveTo(hx+hr*0.92, hy+hr*0.02); g.lineTo(hx+hr*0.86, hy+hr*0.34); g.stroke();
}

function dalFace(g, hx, hy, hr, mood){
  g.strokeStyle = LINE; g.fillStyle = LINE; g.lineCap = "round"; g.lineJoin = "round";
  const ey = hy + hr*0.08, lx = hx - hr*0.3, rx = hx + hr*0.3;

  // freckles first, in every weather
  for (const [fx, fy] of [[-0.52, 0.36], [-0.42, 0.46], [-0.6, 0.48],
                           [0.52, 0.36], [0.44, 0.47], [0.61, 0.46]]){
    g.beginPath(); g.arc(hx + hr*fx, hy + hr*fy, hr*0.028, 0, Math.PI*2); g.fill();
  }

  if (mood === "happy"){
    g.lineWidth = 2.4;                                       // the full beam
    g.beginPath(); g.moveTo(hx-hr*0.52, hy-hr*0.22); g.quadraticCurveTo(hx-hr*0.32, hy-hr*0.34, hx-hr*0.12, hy-hr*0.22); g.stroke();
    g.beginPath(); g.moveTo(hx+hr*0.12, hy-hr*0.22); g.quadraticCurveTo(hx+hr*0.32, hy-hr*0.34, hx+hr*0.52, hy-hr*0.22); g.stroke();
    g.beginPath(); g.moveTo(lx-hr*0.13, ey); g.quadraticCurveTo(lx, ey-hr*0.16, lx+hr*0.13, ey); g.stroke();   // ^ ^ eyes
    g.beginPath(); g.moveTo(rx-hr*0.13, ey); g.quadraticCurveTo(rx, ey-hr*0.16, rx+hr*0.13, ey); g.stroke();
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(hx-hr*0.36, hy+hr*0.5); g.quadraticCurveTo(hx, hy+hr*0.88, hx+hr*0.36, hy+hr*0.5); g.stroke();
  } else if (mood === "angry"){
    // the referee special: full pantomime outrage, mouth mid-bellow
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(hx-hr*0.56, hy-hr*0.36); g.lineTo(hx-hr*0.1, hy-hr*0.08); g.stroke();
    g.beginPath(); g.moveTo(hx+hr*0.56, hy-hr*0.36); g.lineTo(hx+hr*0.1, hy-hr*0.08); g.stroke();
    g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(lx-hr*0.12, ey+hr*0.02); g.lineTo(lx+hr*0.12, ey+hr*0.04); g.stroke();
    g.beginPath(); g.moveTo(rx-hr*0.12, ey+hr*0.04); g.lineTo(rx+hr*0.12, ey+hr*0.02); g.stroke();
    g.lineWidth = 2.8;
    g.beginPath(); g.ellipse(hx, hy+hr*0.62, hr*0.24, hr*0.28, 0, 0, Math.PI*2); g.stroke();
  } else if (mood === "sad"){
    // hangdog — the kindness with nowhere to put itself
    g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(hx-hr*0.52, hy-hr*0.14); g.lineTo(hx-hr*0.12, hy-hr*0.3); g.stroke();
    g.beginPath(); g.moveTo(hx+hr*0.52, hy-hr*0.14); g.lineTo(hx+hr*0.12, hy-hr*0.3); g.stroke();
    g.beginPath(); g.arc(lx, ey, hr*0.06, 0, Math.PI*2); g.fill();
    g.beginPath(); g.arc(rx, ey, hr*0.06, 0, Math.PI*2); g.fill();
    g.lineWidth = 1.8;                                       // bags under the eyes
    g.beginPath(); g.moveTo(lx-hr*0.1, ey+hr*0.14); g.quadraticCurveTo(lx, ey+hr*0.2, lx+hr*0.1, ey+hr*0.14); g.stroke();
    g.beginPath(); g.moveTo(rx-hr*0.1, ey+hr*0.14); g.quadraticCurveTo(rx, ey+hr*0.2, rx+hr*0.1, ey+hr*0.14); g.stroke();
    g.lineWidth = 2.8;
    g.beginPath(); g.moveTo(hx-hr*0.28, hy+hr*0.66); g.quadraticCurveTo(hx, hy+hr*0.44, hx+hr*0.28, hy+hr*0.66); g.stroke();
  } else {                                                   // neutral: pre-loaded to disagree
    g.lineWidth = 2.4;                                       // brows in a mild pinch
    g.beginPath(); g.moveTo(hx-hr*0.5, hy-hr*0.26); g.lineTo(hx-hr*0.12, hy-hr*0.18); g.stroke();
    g.beginPath(); g.moveTo(hx+hr*0.5, hy-hr*0.26); g.lineTo(hx+hr*0.12, hy-hr*0.18); g.stroke();
    g.beginPath(); g.arc(lx, ey, hr*0.065, 0, Math.PI*2); g.fill();
    g.beginPath(); g.arc(rx, ey, hr*0.065, 0, Math.PI*2); g.fill();
    g.lineWidth = 2.8;                                       // mouth flat, one corner down: "go on. say it."
    g.beginPath(); g.moveTo(hx-hr*0.24, hy+hr*0.56); g.quadraticCurveTo(hx+hr*0.08, hy+hr*0.58, hx+hr*0.28, hy+hr*0.62); g.stroke();
  }
}

function dalHead(g, w, h, mood){
  g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = LINE; g.fillStyle = FILL;
  const hx = w/2, hy = h*0.27, hr = w*0.155;
  g.lineWidth = 3;
  g.beginPath(); g.ellipse(hx, hy, hr*0.92, hr, 0, 0, Math.PI*2); g.fill(); g.stroke();   // head
  dalHair(g, hx, hy, hr);
  dalFace(g, hx, hy, hr, mood);
}

/* one hand steadying the ball, the other up making a point that cannot wait */
function dalHands(g, w, h){
  g.lineJoin = "round"; g.strokeStyle = LINE; g.lineWidth = 3; g.fillStyle = FILL;
  const cx = w/2;
  g.beginPath(); g.ellipse(cx-46, h*0.755, w*0.06, w*0.046, 0.2, 0, Math.PI*2); g.fill(); g.stroke();   // on the ball
  g.beginPath(); g.ellipse(cx+52, h*0.57, w*0.058, w*0.044, -0.6, 0, Math.PI*2); g.fill(); g.stroke();  // mid-argument
  g.lineWidth = 2.4;                                                    // the point, being made
  g.beginPath(); g.moveTo(cx+58, h*0.552); g.lineTo(cx+66, h*0.512); g.stroke();
}

/* full flat portrait — used by the dialogue box */
function drawDalypso(g, w, h, mood = "neutral", ink){
  applyInk(ink);
  g.clearRect(0, 0, w, h);
  dalGlow(g, w, h);
  dalBody(g, w, h);
  dalHead(g, w, h, mood);
  dalHands(g, w, h);
}

/* one depth layer of the figure — used for the 2.5D in-world build.
   0 = body/jersey/ball (back), 1 = head/hair/face (mid), 2 = hands (front). */
function drawDalypsoLayer(g, w, h, mood, layer, ink){
  applyInk(ink);
  g.clearRect(0, 0, w, h);
  if (layer === 0){ dalGlow(g, w, h); dalBody(g, w, h); }
  else if (layer === 1){ dalHead(g, w, h, mood); }
  else { dalHands(g, w, h); }
}

/* ---------- the hot takes ----------
   Dalypso's recurring bit: three takes a level, delivered like penalty
   kicks. The trick of him: AGREE and he's disgusted — he'll swap sides on
   the spot to keep the row alive. ARGUE and he lights up (and awards ye
   affinity for it — the man scores debate like a match). Every route runs
   the chain to the end; each take carries its own reaction into the next
   question, so the conversation actually listens. */
const TAKES = [
  { q: "Right, settle somethin' for me: the sequel is better than the original. Ye know EXACTLY the one I mean. It just is.",
    agree: "You're right. The sequel's better.",
    argue: "The original. And it's not close.",
    agreeReact: "*He looks at ye, appalled.* ...what? No it ISN'T. The pacin' in the second act is all over the shop an' ye know it. Ye can't just AGREE with things, that's how civilisations fall. ANYWAY: ",
    argueReact: "*He lights up like a floodlit pitch.* WRONG. Wrong wrong wrong. The set pieces ALONE... okay. Okay. Strong position, well held, entirely incorrect. I respect it. NEXT: " },
  { q: "black an' white films are better than colour ones. All of them. Even the bad ones. ESPECIALLY the bad ones.",
    agree: "Honestly? Agreed. The shadows alone.",
    argue: "That's pure nostalgia and you know it.",
    agreeReact: "*Deep suspicion.* ...ye agreed very fast there. Ye can't just say 'the shadows', ye have to EARN the shadows. I'm docking ye a point I never gave ye. Right: ",
    argueReact: "NOSTALGIA?! Nostalgia is a... no. D'ye know what, that's the first intelligent wrong thing anyone's said to me all week. Final one, an' it's the big one: " },
  { q: "the greatest performance ever put to screen. Go on. YOU say. I'll wait. I won't wait long.",
    agree: "Whoever's in your favourite film, probably.",
    argue: "Someone you've never even heard of.",
    agreeReact: null,   // the last take goes straight to the close either way
    argueReact: null },
];

function takeNode(i, prefix){
  const t = TAKES[i];
  const last = i === TAKES.length - 1;
  const mk = (react) => last ? takeClose() : takeNode(i + 1, react);
  return {
    text: (prefix ?? "") + t.q,
    choices: [
      // agreeing DISAPPOINTS him — the polite option is the losing one
      { text: t.agree, effects: { like: -1 }, next: mk(t.agreeReact) },
      { text: t.argue, effects: { like: +1 }, next: mk(t.argueReact) },
      ...(i === 0 ? [{ text: "Dalypso, I haven't the time for this." }] : []),
    ],
  };
}
function takeClose(){
  return {
    text: "*Whatever ye said, he's already talkin' over it.* WRONG. It's a fella in a three-minute scene in a film ye've never seen, an' I'll die on this hill HAPPILY. *He exhales like a man steppin' off a rollercoaster, delighted with the both of ye.* THAT'S the stuff. D'ye know how long it's been since somebody argued BACK? Everyone down here either agrees with ye or asks ye mad questions about grapes. Call round again. I've takes ye haven't even HEARD yet.",
    choices: [{ text: "(Same time next level.)" }],
  };
}

/* Dalypso's dialogue hub. Same shape as the others: topics offered as
   choices, retired into `character.seen` per level, the trade topic always
   open and built from the shared economy on the base class. What sets
   Dalypso apart:
     • where he thinks he IS is never quite pinned down — he talks like a
       man in his own estate ("up the road", "the good room"), and his
       window "gets all the channels", some of which shouldn't exist. The
       story beats (story.js) walk the edge of that without settling it;
     • the argument is the love language: agreeing with him is the one
       thing that disappoints him;
     • his hidden desire is the Christmas TV guide (`hiddenDesire`), and
       he is catastrophically bad at hiding it. */
function dalypsoDialogue(ctx){
  const { depth, character, player } = ctx;

  const greet = {
    hostile:  "*He points the remote at ye an' presses mute.* ...doesn't work on ye. Worth a try. WHAT.",
    wary:     "Oh. You. *He folds his arms like a man settling in to disagree with the weather.* Go on, then.",
    neutral:  "Well! There y'are. I was JUST about to say somethin' about this place, an' ye'll probably disagree with it, which is grand, because yer wrong.",
    friendly: "Ah, good. Someone with a bit of sense about them. C'mere. I've been sittin' on three opinions since yesterday an' two of them are about you.",
    warm:     "*He beams like a porch light comin' on.* THERE'S me favourite neighbour! Look at ye. State of ye. DELIGHTED. C'mere til I tell ye somethin'. No, leave the maze. The maze'll keep. This is IMPORTANT.",
  }[character.tone];

  return {
    hub: true,
    level: depth,                  // conversations are tracked (and exhausted) per level
    greet,
    exhausted: "Go on away now. There's a thing startin' on the telly that I've seen forty times an' it doesn't watch itself. Sure, call round again. Yer always callin' round. It's like a soap, this. A good one. Mid-era.",
    hostile: "*He stares past ye at nothing, jaw set.* I've nothin' to say to ye. An' I'd a LOT to say to ye. I'd PREPARED things. That's how bad it is.",
    topics: [
      { id: "place", label: "What do you make of this place?", effects: { like: +1 },
        node: { text: "*He appraises the corridor like a man who has recently, an' he may have mentioned this, bought property.* Structurally? Sound. Walls like that'll outlast the both of us. Terrible natural light, mind. No storage. An' the LAYOUT: whoever designed this never once carried shoppin' through it. *He shakes his head.* Ye know what it's like? A show with great production design an' no script editor. Gorgeous. Goes nowhere. I'd give it three stars an' I'd keep watchin' it, which tells ye everythin' about me." } },

      { id: "house", label: "Tell me about the house.", effects: { like: +1 },
        node: { text: "*He straightens like a man called up for his country.* FOUR bed. SEMI-detached. South-facin' garden. D'ye know how rare that is at that price point? The estate agent said, an' I quote, 'you won't do better', an' for ONCE in his lyin' profession he was right. There's a good room. There's a UTILITY room. Separate! From the KITCHEN! *He counts rooms on his fingers with real love.* Gas boiler, two years old. Attic ye could convert. In any zombie film ye care to name, we're grand for a season an' a half minimum. *A small pause.* Ye'll have to come round. Everyone will. Soon as things... settle." } },

      { id: "telly", label: "What's on the telly down here?", effects: { like: +1 },
        node: { text: "Everythin'. That's the mad thing: this window gets ALL the channels. Channels I know, channels I don't, channels there's no NAME for. Last night I watched a documentary about a bridge I'm fairly sure was never built, an' it was CLASS. Third seasons of shows that got cancelled after one. The versions where they didn't cancel them, d'ye follow me? *He leans in, delighted, entirely unbothered by the implications.* The reception down here is unbelievable. It's the one thing I'd not change about the place." } },

      // the recurring bit: three hot takes a level, arguing back is the win
      { id: "takes", label: "Go on. Give us your takes.", oneShot: false, keep: true,
        effects: { like: +1 },
        node: () => takeNode(0, "") },

      { id: "sian-bee", label: "What's the story with you and Little Bee?", minAffinity: 55, effects: { like: +1 },
        node: { text: "*The arms fold. The jaw does a lap.* She's grand. She's GRAND. Smart as a whip an' she'd fight a bus for ye, an' Sian's happier than I've ever seen the man, so there's NOTHIN' to say, is there. *A beat. The honesty arrives like a late train.* ...he was MY best mate first, is all. Since we were six. An' there's no cup for BEST MATE FIRST. She didn't take anythin' that was mine to keep. I know that. I KNOW that. *He unfolds his arms, decision made for the hundredth time.* I'm lettin' it go. I'm very nearly finished lettin' it go." } },

      { id: "homiss-late", label: "Any thoughts on Homiss?", effects: { like: +1 },
        node: { text: "Homiss is a GENTLEMAN. Great head of ideas, plays the bass like the buildin's fallin' down in slow motion, an' I mean that as a compliment. One flaw. ONE. *He holds up a finger like a referee producin' a card.* The man has never once in his LIFE been on time. Weddin's, matches, his OWN gigs. Tardiness like that isn't a habit, it's a POLICY, an' it needs to be eradicated ENTIRELY. *He breathes.* ...I'd forgive him anythin', mind. But I'd forgive him fifteen minutes EARLIER if he'd only show up." } },

      { id: "scally-who", label: "Do you know Scally at all?", effects: { like: +1 },
        node: { text: "Not really, no. Seems sound. Sells things. *He nods slowly, granting this the weight of a match report.* I respect a man with STOCK. Ye know where ye stand with a fella who has stock. ...Sian knew him, back in the day. Worked together at the, eh, *he mouths the name of a tech giant with theatrical care*, an' Sian says nobody ever knew what the wee man's JOB was. Which in fairness is also true of half the lads I played football with, an' they were grand too." } },

      { id: "endure", label: "Go on then. Give me the full house tour.",
        req: { attr: "endurance", level: 6 }, effects: { like: +2 },
        node: { text: "*Forty-five minutes later, ye know the BTU rating of the boiler, the council's position on the hedge, the saga of the second stopcock, an' the orientation of every radiator in the buildin'. Ye are still standin'. Ye did not waver.* ...an' that's just the DOWNSTAIRS. *He looks at ye with sudden, genuine emotion.* D'ye know, Sian fell asleep STANDIN' UP durin' the utility room. You LISTENED. Ye asked about the FLASHIN'. *He grips the window frame.* Yer the first person to hear the whole tour. Ye magnificent creature. Yer gettin' a key. I've decided. Don't fight me on it. Actually no, DO fight me on it, but ye'll lose." } },

      { id: "lucky", label: "*He flips a coin at the window.* Call it in the air.",
        req: { attr: "luck", level: 6 }, effects: { like: +2 },
        node: { text: "*Ye call it before it leaves his thumb. It lands. Yer right. He flips it again, eyes narrowin'. Right again. A third. RIGHT AGAIN.* ...okay. Okay okay okay. *He pockets the coin like it's turned informant.* D'ye know the ODDS on that? I do, actually, an eighth, but it FELT like more, an' feel is everythin' in this game. Yer comin' to me next quiz night, whenever an' wherever quiz nights exist again, an' yer sittin' BESIDE me. That's not an invitation, that's a TRANSFER. I've signed ye." } },

      { id: "header", label: "*He punts the ball through the window. Head it back.*",
        req: { attr: "strength", level: 6 }, effects: { like: +2 },
        node: { text: "*How the ball comes through the glass is a question for a calmer moment. Ye rise an' meet it like a cannon, an' it thunders back past his ear into the dark behind him.* ...HOLY God. *A long silence, in which somewhere deep in his room somethin' falls over.* That's the hardest anyone's ever headed anythin' at me an' I played JUNIOR B. *He retrieves the ball, cradlin' it, starin' at ye with rearranged priorities.* Right. New topic: have ye ever considered centre half? Don't answer. Ye HAVE now." } },

      { id: "rude", label: "The house sounds like a shoebox, and your takes are basic.", effects: { like: -10 },
        node: { text: "*He opens his mouth for the counter-attack of his LIFE, and nothing comes out. He closes it. The finger he'd raised comes slowly down, like a flag.* ...the garden's south-facin', *he says quietly, to nobody, an' turns back to the telly.* Away ye go. Programme's startin'." } },

      // Always askable. Built from the shared economy on the base class: a
      // coin-only sale, item-for-item barter (he collects — the foil sticker,
      // Scally's brass token), the hidden-desire swap for the Christmas TV
      // guide, and a free gift for friends on the trade cooldown.
      { id: "trade", label: "Doing any business?", oneShot: false, keep: true,
        node: () => {
          const choices = [];

          // 1) everything priced, Labyrinth Tokens only (not on the cooldown)
          for (const sale of character.forSale)
            choices.push({ text: sale.id === "remote"
                             ? `Buy the ${sale.name}. *(He hesitates before naming a price.)*`
                             : `Buy the ${sale.name}.`,
                           effects: { give: sale.id, cost: sale.price, like: +2,
                                      flag: `bought-${sale.id}` } });

          // 2) barter: hand over something he openly wants for a trinket
          const swapFor = character.giftable[0];
          for (const id of character.interestsOpen){
            const held = player.inventory.find(it => it.id === id);
            if (held && swapFor)
              choices.push({ text: `Trade your ${held.name} for the ${swapFor.name}.`,
                             effects: { take: held.id, give: swapFor.id, like: +6,
                                        flag: `traded-${held.id}-to-${character.id}` } });
          }

          // 3) the hidden desire — the Christmas TV guide — only if the player holds it
          const secret = character.hiddenDesire && player.inventory.find(it => it.id === character.hiddenDesire);
          if (secret){
            const prize = character.giftable[0];
            choices.push({ text: `Offer the ${secret.name}. *(He has already extended both hands.)*`,
              effects: { take: secret.id, give: prize?.id, like: +20, flag: "gave-tv-guide" },
              next: { text: "*He holds it at arm's length like a newborn, then against his chest.* The Christmas one. THE Christmas one. *He opens it dead centre, an' his eyes are shinin'.* Look at it. Two full weeks where everythin' good is on an' nothin' bad can happen an' the whole COUNTRY is watchin' the same thing at the same time. That's not a magazine, that's a CEASEFIRE. *He tucks it somewhere safe below the window, an' when he straightens up he has to clear his throat.* Ye don't understand what ye've done. Come round to the house. I MEAN it. Yer name's goin' on a key." } });
          }

          // 4) a free trinket for a friend — the one path on the trade cooldown
          const freebie = character.giftable[0];
          if (character.affinity >= 55 && character.canTrade(depth) && freebie)
            choices.push({ text: "Anything spare for a good neighbour?",
                           effects: { give: freebie.id, like: +3, gift: true } });

          choices.push({ text: "(Maybe later.)" });

          // intro line: car-boot-sale rules — and a hidden desire hidden
          // with the subtlety of a hand grenade
          let text;
          if (character.affinity < 40)
            text = "Trade? I barely KNOW ye. That's how ye end up in a true-crime documentary, handin' yer valuables to strangers in corridors. Tokens up front or no deal.";
          else if (character.affinity >= 55 && !character.canTrade(depth))
            text = "Ye've had yer freebie. What is this, a supermarket sweep? Give us a couple of levels to restock the shelves. The GOOD shelves. *He gestures at shelves that may or may not exist.*";
          else
            text = "Go on, let's do business. An' I'll have ye know everythin' here is MINT condition, one careful owner. *Then, with the subtlety of a hand grenade:* ...also. Hypothetically. If a person were to find a magazine down there, thick one, comes out the once a year, all the listin's in it, maybe a festive cover, HYPOTHETICALLY, that person should bring it here IMMEDIATELY an' name their price. *He examines his nails.* Anyway. What'll it be?";

          return { text, choices };
        } },
    ],
  };
}

/* plain definition — characters.js wraps this in a Character instance */
export const dalypso = {
  id:   "dalypso",
  name: "DALYPSO",
  minDepth: 4,       // first window appears at depth 4
  description: "A red-headed man in a football jersey who argues with rain and means every kindness. Encyclopedic on every film and show ever made. His window gets all the channels, including several that shouldn't exist. Just bought a house. Four bed. Semi-D. South-facing garden. You'll have to come round.",
  portrait: drawDalypso,
  drawLayer: drawDalypsoLayer,
  layerCount: 3,
  dialogue: dalypsoDialogue,
  inventory: [
    { id: "stub",     name: "Cup Final Stub",  desc: "A ticket stub gone soft at the folds. Row Z. 'Greatest day of me life. Well, second. The house, like.'" },
    { id: "housekey", name: "Spare House Key", desc: "Brand new, never turned in a lock. The tag reads 'GOOD ROOM. DO NOT LOSE.'" },
    // his prized piece: Labyrinth Tokens only, never gifted (price = LT cost)
    { id: "remote",   name: "Universal Remote",desc: "Heavier than it should be. Some of the buttons are for channels that do not exist. All of them work, Dalypso swears.", price: 55 },
  ],
  // what Dalypso wants from the player. `open` he'll barter for out loud —
  // the gold foil sticker (a collector completes the set) and Scally's brass
  // token ("I respect a man with stock, an' I respect his memorabilia more").
  // `hidden` is the Christmas TV guide, and he is spectacularly bad at
  // keeping it hidden.
  interests: {
    open:   ["sticker", "coin"],
    hidden: "tv-guide",
  },
};
