/* ============================================================
   MAZE.EXE — Homiss
   A warm, rumpled Irish musician: bassist, PhD in composition,
   writer of forty-minute drones. Outgoing and kind, forever firing
   off ridiculous "would ye rather" questions and never once happy
   with the answer. Underneath the chat is a thrum of existential
   dread — he half-suspects none of this is real — which he buries
   the moment anyone agrees with him. He does not know he is in the
   Labyrinth Protocol; to Homiss this is just another normal day.
   He would trade his soul for a jar of mayonnaise.

   Like scally.js this file is data + drawing only: it exports a
   plain definition that characters.js wraps in a Character instance,
   so it stays free of any engine import (no module cycle). The figure
   is built from composable parts so it renders flat (dialogue box) or
   split across depth layers (the 2.5D in-world figure), and the face
   switches mood: "neutral" | "happy" | "angry" | "sad".
   ============================================================ */

/* drawing ink — defaults to violet, but every draw call is handed the current
   level's ink (see palette.characterInk / characters.js) so all characters
   render in one colour, like an old single-phosphor monitor. */
let LINE = "#b794ff", FILL = "#190f33";
let GLOW0 = "rgba(183,148,255,.20)", GLOW1 = "rgba(183,148,255,0)";
function applyInk(ink){
  if (!ink) return;
  LINE = ink.line; FILL = ink.fill; GLOW0 = ink.glow0; GLOW1 = ink.glow1;
}

function homissGlow(g, w, h){
  const grd = g.createRadialGradient(w/2, h*0.55, 12, w/2, h*0.55, w*0.62);
  grd.addColorStop(0, GLOW0);
  grd.addColorStop(1, GLOW1);
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
}

/* a cosy, upright torso — a big woolly jumper, friendlier than Scally's hunch */
function homissBody(g, w, h){
  g.lineJoin = "round"; g.lineCap = "round";
  g.strokeStyle = LINE; g.lineWidth = 3; g.fillStyle = FILL;
  const cx = w / 2;
  g.beginPath();
  g.moveTo(cx-62, h*0.97);
  g.bezierCurveTo(cx-76, h*0.66, cx-54, h*0.50, cx-26, h*0.47);
  g.bezierCurveTo(cx-8, h*0.45, cx+8, h*0.45, cx+26, h*0.47);
  g.bezierCurveTo(cx+54, h*0.50, cx+76, h*0.66, cx+62, h*0.97);
  g.closePath(); g.fill(); g.stroke();
  // collar + a couple of knit ribs for the woolly-jumper feel
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(cx-20, h*0.50); g.quadraticCurveTo(cx, h*0.56, cx+20, h*0.50); g.stroke();
  g.beginPath(); g.moveTo(cx-46, h*0.74); g.lineTo(cx-40, h*0.92); g.stroke();
  g.beginPath(); g.moveTo(cx+46, h*0.74); g.lineTo(cx+40, h*0.92); g.stroke();
}

/* a bass slung across the body — the figure's signature shape. Body of the
   instrument low and to the left, neck rising to the right toward a little
   headstock. Drawn behind the hands so the hands read as playing it. */
function homissBass(g, w, h){
  g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = LINE; g.fillStyle = FILL;
  const bx = w*0.34, by = h*0.78;        // instrument body
  const nx = w*0.74, ny = h*0.46;        // top of the neck

  // neck (a thick bar) running up to the right
  g.lineWidth = 9;
  g.beginPath(); g.moveTo(bx + w*0.04, by - w*0.05); g.lineTo(nx, ny); g.stroke();

  // body of the bass
  g.lineWidth = 3;
  g.beginPath(); g.ellipse(bx, by, w*0.165, w*0.125, -0.5, 0, Math.PI*2); g.fill(); g.stroke();
  g.beginPath(); g.arc(bx, by, w*0.03, 0, Math.PI*2); g.stroke();   // sound hole / pickup

  // headstock + four tuning pegs
  const ang = Math.atan2(ny - (by - w*0.05), nx - (bx + w*0.04));
  const hsx = nx + Math.cos(ang)*w*0.06, hsy = ny + Math.sin(ang)*w*0.06;
  g.beginPath(); g.ellipse(hsx, hsy, w*0.055, w*0.035, ang, 0, Math.PI*2); g.fill(); g.stroke();
  g.lineWidth = 2;                                    // four pegs stubbing out of the headstock
  for (let i = 0; i < 4; i++){
    const along = (i - 1.5) * w*0.022;                // spaced along the headstock's length
    const px = hsx + Math.cos(ang)*along, py = hsy + Math.sin(ang)*along;
    const ox = Math.cos(ang + Math.PI/2)*w*0.03, oy = Math.sin(ang + Math.PI/2)*w*0.03;
    g.beginPath(); g.moveTo(px, py); g.lineTo(px + ox, py + oy); g.stroke();
  }

  // four strings down the neck
  g.lineWidth = 1.2;
  for (let i = 0; i < 4; i++){
    const o = (i - 1.5) * 3;
    g.beginPath();
    g.moveTo(bx + w*0.04 - o*Math.sin(ang), by - w*0.05 + o*Math.cos(ang));
    g.lineTo(nx - o*Math.sin(ang), ny + o*Math.cos(ang));
    g.stroke();
  }
}

/* wild, curly hair across the crown */
function homissHair(g, hx, hy, hr){
  g.lineJoin = "round"; g.strokeStyle = LINE; g.lineWidth = 3; g.fillStyle = FILL;
  g.beginPath();
  g.moveTo(hx-hr*1.02, hy+hr*0.18);
  g.bezierCurveTo(hx-hr*1.28, hy-hr*0.75, hx-hr*0.75, hy-hr*1.20, hx-hr*0.30, hy-hr*1.05);
  g.bezierCurveTo(hx-hr*0.10, hy-hr*1.35, hx+hr*0.45, hy-hr*1.30, hx+hr*0.55, hy-hr*0.95);
  g.bezierCurveTo(hx+hr*1.00, hy-hr*1.10, hx+hr*1.30, hy-hr*0.55, hx+hr*1.02, hy+hr*0.18);
  // scalloped underside so it reads as locks, not a helmet
  g.bezierCurveTo(hx+hr*0.80, hy-hr*0.30, hx+hr*0.70, hy+hr*0.10, hx+hr*0.55, hy-hr*0.20);
  g.bezierCurveTo(hx+hr*0.30, hy+hr*0.05, hx+hr*0.20, hy-hr*0.25, hx, hy-hr*0.02);
  g.bezierCurveTo(hx-hr*0.20, hy-hr*0.28, hx-hr*0.34, hy+hr*0.04, hx-hr*0.55, hy-hr*0.22);
  g.bezierCurveTo(hx-hr*0.74, hy+hr*0.06, hx-hr*0.86, hy-hr*0.26, hx-hr*1.02, hy+hr*0.18);
  g.closePath(); g.fill(); g.stroke();
}

/* a full (but trim) beard: covers both cheeks, the jaw and chin, joins the
   sideburns up to the hair, with a moustache and a scrub of hair strokes so it
   reads as a proper beard rather than just a jawline. Drawn before the face,
   so the eyes/glasses and mouth sit clear on top. */
function homissBeard(g, hx, hy, hr){
  g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = LINE; g.fillStyle = FILL;

  // the beard mass: down one sideburn to the chin and up the other, then back
  // across the top of the cheeks, dipping under the nose for the upper lip
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(hx-hr*0.96, hy-hr*0.22);                                              // left sideburn (meets the hair)
  g.bezierCurveTo(hx-hr*1.04, hy+hr*0.55, hx-hr*0.62, hy+hr*1.18, hx, hy+hr*1.30);   // jaw down to the chin
  g.bezierCurveTo(hx+hr*0.62, hy+hr*1.18, hx+hr*1.04, hy+hr*0.55, hx+hr*0.96, hy-hr*0.22);  // up to the right sideburn
  g.bezierCurveTo(hx+hr*0.82, hy+hr*0.06, hx+hr*0.52, hy+hr*0.14, hx+hr*0.30, hy+hr*0.30);   // top of the right cheek
  g.quadraticCurveTo(hx+hr*0.16, hy+hr*0.44, hx, hy+hr*0.42);                    // dip under the nose
  g.quadraticCurveTo(hx-hr*0.16, hy+hr*0.44, hx-hr*0.30, hy+hr*0.30);
  g.bezierCurveTo(hx-hr*0.52, hy+hr*0.14, hx-hr*0.82, hy+hr*0.06, hx-hr*0.96, hy-hr*0.22);   // top of the left cheek
  g.closePath(); g.fill(); g.stroke();

  // moustache across the upper lip
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(hx, hy+hr*0.48);
  g.quadraticCurveTo(hx-hr*0.20, hy+hr*0.42, hx-hr*0.36, hy+hr*0.50);
  g.moveTo(hx, hy+hr*0.48);
  g.quadraticCurveTo(hx+hr*0.20, hy+hr*0.42, hx+hr*0.36, hy+hr*0.50);
  g.stroke();

  // short strokes raked through the beard so the fill reads as hair
  g.lineWidth = 1.6;
  const rake = [
    [-0.80, 0.18, -0.86, 0.46], [ 0.80, 0.18,  0.86, 0.46],
    [-0.60, 0.46, -0.66, 0.80], [ 0.60, 0.46,  0.66, 0.80],
    [-0.38, 0.66, -0.42, 1.02], [ 0.38, 0.66,  0.42, 1.02],
    [-0.14, 0.80, -0.16, 1.16], [ 0.14, 0.80,  0.16, 1.16],
  ];
  for (const [x1, y1, x2, y2] of rake){
    g.beginPath(); g.moveTo(hx+hr*x1, hy+hr*y1); g.lineTo(hx+hr*x2, hy+hr*y2); g.stroke();
  }
}

/* eye placement (no glasses) — sat a little closer together now they're not
   spread to fill lenses */
function homissEyes(hx, hy, hr){
  return { ey: hy + hr*0.04, lx: hx - hr*0.30, rx: hx + hr*0.30 };
}

function homissFace(g, hx, hy, hr, mood){
  const { ey, lx, rx } = homissEyes(hx, hy, hr);
  g.strokeStyle = LINE; g.fillStyle = LINE; g.lineCap = "round"; g.lineJoin = "round";

  if (mood === "happy"){
    g.lineWidth = 2.5;                                        // brows lifted, easy
    g.beginPath(); g.moveTo(hx-hr*0.56, hy-hr*0.30); g.quadraticCurveTo(hx-hr*0.36, hy-hr*0.40, hx-hr*0.16, hy-hr*0.30); g.stroke();
    g.beginPath(); g.moveTo(hx+hr*0.16, hy-hr*0.30); g.quadraticCurveTo(hx+hr*0.36, hy-hr*0.40, hx+hr*0.56, hy-hr*0.30); g.stroke();
    g.beginPath(); g.moveTo(lx-hr*0.12, ey+hr*0.02); g.quadraticCurveTo(lx, ey-hr*0.16, lx+hr*0.12, ey+hr*0.02); g.stroke();   // ^ ^ smiling eyes
    g.beginPath(); g.moveTo(rx-hr*0.12, ey+hr*0.02); g.quadraticCurveTo(rx, ey-hr*0.16, rx+hr*0.12, ey+hr*0.02); g.stroke();
    g.lineWidth = 3;                                          // big grin
    g.beginPath(); g.moveTo(hx-hr*0.34, hy+hr*0.56); g.quadraticCurveTo(hx, hy+hr*0.92, hx+hr*0.34, hy+hr*0.56); g.stroke();
  } else if (mood === "angry"){
    // Homiss doesn't do rage — "angry" reads as crestfallen, hurt
    g.lineWidth = 2.5;                                        // inner brows tugged up
    g.beginPath(); g.moveTo(hx-hr*0.56, hy-hr*0.22); g.lineTo(hx-hr*0.16, hy-hr*0.34); g.stroke();
    g.beginPath(); g.moveTo(hx+hr*0.56, hy-hr*0.22); g.lineTo(hx+hr*0.16, hy-hr*0.34); g.stroke();
    g.beginPath(); g.arc(lx, ey+hr*0.02, hr*0.06, 0, Math.PI*2); g.fill();
    g.beginPath(); g.arc(rx, ey+hr*0.02, hr*0.06, 0, Math.PI*2); g.fill();
    g.lineWidth = 3;                                          // flat, deflated mouth
    g.beginPath(); g.moveTo(hx-hr*0.26, hy+hr*0.66); g.lineTo(hx+hr*0.26, hy+hr*0.66); g.stroke();
  } else if (mood === "sad"){
    // the existential-dread face: brows up, eyes blown wide, a small open mouth
    g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(hx-hr*0.56, hy-hr*0.18); g.lineTo(hx-hr*0.16, hy-hr*0.36); g.stroke();
    g.beginPath(); g.moveTo(hx+hr*0.56, hy-hr*0.18); g.lineTo(hx+hr*0.16, hy-hr*0.36); g.stroke();
    g.lineWidth = 2;
    g.beginPath(); g.arc(lx, ey+hr*0.02, hr*0.11, 0, Math.PI*2); g.stroke();   // wide, staring
    g.beginPath(); g.arc(rx, ey+hr*0.02, hr*0.11, 0, Math.PI*2); g.stroke();
    g.fillStyle = LINE;
    g.beginPath(); g.arc(lx, ey+hr*0.02, hr*0.045, 0, Math.PI*2); g.fill();
    g.beginPath(); g.arc(rx, ey+hr*0.02, hr*0.045, 0, Math.PI*2); g.fill();
    g.lineWidth = 3;                                          // small worried "o"
    g.beginPath(); g.ellipse(hx, hy+hr*0.66, hr*0.13, hr*0.16, 0, 0, Math.PI*2); g.stroke();
  } else {                                                    // neutral — warm, open
    g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(hx-hr*0.56, hy-hr*0.26); g.lineTo(hx-hr*0.16, hy-hr*0.30); g.stroke();
    g.beginPath(); g.moveTo(hx+hr*0.56, hy-hr*0.26); g.lineTo(hx+hr*0.16, hy-hr*0.30); g.stroke();
    g.fillStyle = LINE;
    g.beginPath(); g.arc(lx, ey+hr*0.02, hr*0.07, 0, Math.PI*2); g.fill();     // friendly dot eyes
    g.beginPath(); g.arc(rx, ey+hr*0.02, hr*0.07, 0, Math.PI*2); g.fill();
    g.lineWidth = 3;                                          // gentle smile
    g.beginPath(); g.moveTo(hx-hr*0.26, hy+hr*0.60); g.quadraticCurveTo(hx, hy+hr*0.80, hx+hr*0.26, hy+hr*0.60); g.stroke();
  }
}

function homissHead(g, w, h, mood){
  g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = LINE; g.fillStyle = FILL;
  const hx = w/2, hy = h*0.30, hr = w*0.165;
  g.lineWidth = 3;
  g.beginPath(); g.ellipse(hx, hy, hr*0.92, hr, 0, 0, Math.PI*2); g.fill(); g.stroke();   // head
  homissHair(g, hx, hy, hr);
  homissBeard(g, hx, hy, hr);
  homissFace(g, hx, hy, hr, mood);
}

/* both hands on the bass — one fretting the neck, one plucking by the body */
function homissHands(g, w, h){
  g.lineJoin = "round"; g.strokeStyle = LINE; g.lineWidth = 3; g.fillStyle = FILL;
  g.beginPath(); g.ellipse(w*0.45, h*0.70, w*0.065, w*0.05,  0.35, 0, Math.PI*2); g.fill(); g.stroke();  // plucking
  g.beginPath(); g.ellipse(w*0.64, h*0.55, w*0.065, w*0.05, -0.55, 0, Math.PI*2); g.fill(); g.stroke();  // fretting
}

/* full flat portrait — used by the dialogue box */
function drawHomiss(g, w, h, mood = "neutral", ink){
  applyInk(ink);
  g.clearRect(0, 0, w, h);
  homissGlow(g, w, h);
  homissBody(g, w, h);
  homissBass(g, w, h);
  homissHead(g, w, h, mood);
  homissHands(g, w, h);
}

/* one depth layer of the figure — used for the 2.5D in-world build.
   0 = body + bass (back), 1 = head/face (mid), 2 = hands (front). */
function drawHomissLayer(g, w, h, mood, layer, ink){
  applyInk(ink);
  g.clearRect(0, 0, w, h);
  if (layer === 0){ homissGlow(g, w, h); homissBody(g, w, h); homissBass(g, w, h); }
  else if (layer === 1){ homissHead(g, w, h, mood); }
  else { homissHands(g, w, h); }
}

/* ---------- the "would ye rather" loop ----------
   Homiss fires off an absurd question, hears the player out, and is never,
   ever satisfied. Each answer just flusters him into the next question; the
   chain runs to the end and then he gives up in a huff, dropping the player
   back at the hub. Built as nested `next` nodes (see dialogue.js): every
   answer choice points at the following question, so the content of the
   pick doesn't matter — he rejects all of them the same. */
const WOULD_RATHER = [
  { q: "C'mere. Would ye rather eat a million grapes a day, every day til ye die, OR never be able to blink again? An' ye can't say neither, that's cheatin'.",
    a: ["The grapes, obviously.", "Never blink. I'd adapt.", "That's an impossible choice, Homiss."] },
  { q: "No, no, see, that's exactly what everyone says an' it's WRONG. *He waves it off.* Right, here's a better one. Would ye rather hear colours, or taste sound? Quick now, don't think...",
    a: ["Taste sound.", "Hear colours.", "What does that even mean?"] },
  { q: "Gah, ye're overthinkin' it, ye are. *He's pacing now.* Okay okay: would ye rather know the exact day ye die, or the exact way? Go on. GO on.",
    a: ["The day.", "The way.", "Neither, that's morbid."] },
  { q: "...no. That doesn't sit right with me at all. *He pinches the bridge of his nose.* Last one. I swear on me bass. Would ye rather talk to fish, but they're all desperate borin', or fly, but only ever two feet off the ground?",
    a: ["Flying, no contest.", "Talk to the boring fish.", "Can I phone a friend?"] },
];

function wrNode(i){
  const item = WOULD_RATHER[i];
  const last = i === WOULD_RATHER.length - 1;
  return {
    text: item.q,
    choices: [
      ...item.a.map(ans => ({ text: ans, next: last ? wrClose() : wrNode(i + 1) })),
      { text: "Homiss, I really have to get on." },        // bail out to the hub
    ],
  };
}
function wrClose(){
  return {
    text: "GAH! No! None of yez ever give a man a straight answer... *he throws his hands up, then deflates.* Ah, doesn't matter. Forget I asked. *He goes back to noodlin' on the bass, not really lettin' it go.*",
    choices: [{ text: "(Right so.)" }],
  };
}

/* Homiss's dialogue hub. Same shape as Scally's: a set of topics offered as
   choices, each retired into `character.seen` once used (per maze level), with
   the trade topic always open and built from the shared economy on the base
   class. Two things set Homiss apart in the data:
     • he has no idea he's in the Labyrinth Protocol, so nothing here speaks of
       levels, mazes or the world by name — to him it's just another normal day;
     • his hidden, riddly craving is plain mayonnaise (`hiddenDesire`), which he
       cannot find anywhere in here and will trade almost anything for. */
function homissDialogue(ctx){
  const { depth, character, player } = ctx;

  const greet = {
    hostile:  "*He keeps half-turned away, hurt.* ...oh. It's yourself. What is it ye want.",
    wary:     "Oh. Hello again. *a careful little nod*",
    neutral:  "Ah, howaya! Grand oul' day for it, wha'? Sure come here to me a minute.",
    friendly: "There ye are! I was hopin' I'd bump into ye again, so I was.",
    warm:     "Aaah, me favourite person in the whole wide world! C'mere to me, c'mere. Sit down, well, stand, ye know what I mean!",
  }[character.tone];

  return {
    hub: true,
    level: depth,                  // conversations are tracked (and exhausted) per level
    greet,                         // no maze/level talk — Homiss thinks this is an ordinary day
    exhausted: "Ah, don't be a stranger now, will ye? Sure I'll be here. ...I'm always here, amn't I. *a flicker of something behind the eyes, then the grin's back.* Go on, go on.",
    hostile: "*He won't quite meet your eye.* ...I think I'd sooner be on me own for a bit. If that's alright with ye.",
    topics: [
      { id: "hello", label: "Homiss, how's the day treating you?", effects: { like: +1 },
        node: { text: "Ah sure ye know yerself. Up early, bit o' brekkie, bit o' practice. Same as any day. *He says it like a man steadyin' himself.* Lovely an' normal. Just a normal day, like every other normal day. ...an' how's yourself? No, actually, *he's already somewhere else*, here, can I ask ye somethin' mad?" } },

      { id: "music", label: "So what is it you do?", effects: { like: +1 },
        node: { text: "I'm a bass man, mostly. Composition. Did the doctorate an' all, if ye can credit it. Experimental stuff: drones, detuned bits, a piece that's just the one note for forty minutes til ye start hearin' God in it. Not everyone's cup o' tea. *grins* Me ma still asks when I'll write a proper song.",
          choices: [
            { text: "Play me the forty-minute note sometime. Start to finish.", effects: { like: +2 },
              next: { text: "*He stares at ye.* ...start to FINISH? Nobody's ever asked for the whole... even at the PREMIERE they were checkin' their phones by minute six. *He's already reachin' for the bass, glowin'.* Right. Not tonight, ye've a maze, but yer BOOKED. Front row. Bring an open mind an' possibly a cushion. Minute thirty's where God shows up, an' ye want to be COMFORTABLE for that." } },
            // the trap: an honest, curious question that lands like a review
            { text: "Forty minutes of one note, though? Genuinely, how is that music?", effects: { like: -3 },
              next: { text: "*The grin holds its shape while the light goes out of it.* ...aye. 'How is that music.' *He nods slowly, the way a man nods at a familiar pothole.* That's word for word what the fella from the funding body said. An' me EXTERN. An' me da, God rest him, though he said it kinder. *He turns a tuning peg that doesn't need turnin'.* It's grand. Yer in the majority, sure. Lovely big roomy place to stand. *He plays somethin' short an' bruised.* ...it's the LISTENIN', for what it's worth. The note doesn't change. YOU do. That was always the whole trick of it. Ah, forget it." } },
          ] } },

      // the signature bit: a ridiculous question he'll never be happy with.
      // oneShot:false so he's always got another one in him.
      { id: "wouldrather", label: "Go on then. Ask me something mad.", oneShot: false, keep: true,
        node: () => wrNode(0) },

      { id: "dread", label: "You seem a little on edge.", minAffinity: 50, effects: { like: +1 },
        node: { text: "On edge? Ah no, I'm grand. It's only... *he leans in, drops his voice* ...do ye ever get the feelin' none of it's real? That there's somethin' on the far side of it all, just... watchin'? Readin' us, like? ...no? Just me, so. *a thin laugh* Just me." } },

      // the player breaks the fourth wall; Homiss freaks, then buries it
      { id: "real", label: "Homiss... do you not see we're in some strange digital place?",
        node: { text: "*The smile slips. For a second the colour goes right out of him.* ...what did ye... no. No, no, don't... *he laughs, far too loud.* Ahh, ye're takin' the mick, ye are! Good one. A 'digital place'. *He waves it away, but the hand is shaking.* Don't be doin' that to a man, now. That's not funny.",
          choices: [
            { text: "I'm serious. Look around you.", req: { attr: "intelligence", level: 7 }, effects: { like: -2 },
              next: { text: "*He won't look. He starts hummin' a bassline, low, then louder, drownin' ye out.* La la la. Can't hear ye. La. Grand weather we're havin', isn't it? Grand. Lovely. Normal. *Everything is normal. It has to be.*" } },
            { text: "Ha. Only messing. You're grand.", effects: { like: +2 },
              next: { text: "*The relief floods back into him.* Ye had me goin' there, ye divil! *He claps yer shoulder.* C'mere, never mind all that. Did I ever tell ye about me thesis?" } },
          ] } },

      { id: "charm", label: "*Warmly* There's a serious mind behind that bass.",
        req: { attr: "charisma", level: 6 }, effects: { like: +2 },
        node: { text: "*He goes pink to the very ears.* Ah, stop now, ye'll have me blushin'. But a fella likes to hear it, I'll not lie to ye. *beams* D'ye know what, I've a good feelin' about you. We're goin' to be great pals, you an' me. Great pals entirely." } },

      { id: "smart", label: "Is your tuning just intonation, or equal temperament?",
        req: { attr: "intelligence", level: 6 }, effects: { like: +2 },
        node: { text: "*His whole face lights up.* Oh ho, a head on ye! Just intonation, when I can get away with it. Let the harmonics fall where nature wants 'em, none o' yer tempered compromise. ...d'ye know, talkin' to you is the most real thing's happened to me all day. *a beat* ...all day. Funny, that. Anyway!" } },

      { id: "flask", label: "Got anything to drink back there?",
        req: { attr: "endurance", level: 6 }, effects: { like: +2 },
        node: { text: "*He waggles a battered flask through the gap.* Poitín. For the nerves. Go easy now, it's... *ye drain it in one, and hand it back without so much as a watering eye. He stares at ye, then at the flask, then at ye.* ...well HOLY God. I can barely LOOK at that stuff. Constitution of a cathedral on ye. Remind me never to get into a drinkin' match with yerself." } },

      { id: "catch", label: "*His plectrum slips. Snatch it out of the air.*",
        req: { attr: "agility", level: 6 }, effects: { like: +2 },
        node: { text: "*It never hits the ground. He looks at yer closed fist, delighted.* Reflexes like a cat, wha'! D'ye play? No, don't answer, ye SHOULD. Hands like that, wasted on all this... *he waves at the general everything* ...walkin' about. C'mere, I'll teach ye a run o' notes sometime, so I will." } },

      // ties into the economy: his hidden desire is mayonnaise
      { id: "mayo", label: "You keep glancing at my pockets...", effects: { like: +1 },
        node: { text: "...ye wouldn't happen to have any mayonnaise on ye, would ye? *Far too fast.* It's only... there's NONE. Nowhere. I've looked the whole day, an' sure a meal's only a tragedy without it, ye know yerself. A good dollop o' mayo'd set the whole world to rights. *deadly earnest* I'd do near anythin' for a jar. Anythin' at all." } },

      { id: "rude", label: "Nobody actually cares about your music, man.", effects: { like: -10 },
        node: { text: "*The grin drops clean off him.* ...right. No, that's fair, probably. Aye. *He turns back to the bass, gone quiet.* Sorry for botherin' ye." } },

      // Always askable. Built from the shared economy on the base class: a
      // coin-only sale, an item-for-item barter for things he wants, the
      // riddly hidden-desire swap (mayonnaise!), and a free gift for friends
      // on the trade cooldown. See characters.js for the full economy note.
      { id: "trade", label: "Got anything to trade?", oneShot: false, keep: true,
        node: () => {
          const choices = [];

          // 1) everything priced, Labyrinth Tokens only (he doesn't dwell on what they are)
          for (const sale of character.forSale)
            choices.push({ text: `Buy the ${sale.name}.`,
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

          // 3) the hidden desire — mayonnaise — only shows if the player holds it
          const secret = character.hiddenDesire && player.inventory.find(it => it.id === character.hiddenDesire);
          if (secret){
            const prize = character.giftable[0];
            choices.push({ text: `Offer the ${secret.name}. *(His eyes go wide as dinner plates.)*`,
              effects: { take: secret.id, give: prize?.id, like: +25, flag: "gave-mayo" },
              next: { text: "*He takes it in both hands like a holy relic, barely breathin'.* ...mayonnaise. Real, actual mayonnaise. *His voice cracks.* Ye beautiful, beautiful creature. Whatever ye need off me, ever, it's yours. I mean that now. I'll never forget this. *He's not letting go of the jar.*" } });
          }

          // 4) a free trinket for a friend — the one path on the trade cooldown
          const freebie = character.giftable[0];
          if (character.affinity >= 55 && character.canTrade(depth) && freebie)
            choices.push({ text: "Anything goin' spare for a pal?",
                           effects: { give: freebie.id, like: +3, gift: true } });

          choices.push({ text: "(Maybe later.)" });

          // intro line: shy when you're barely acquainted, mortified on cooldown,
          // and forever working the conversation back round to mayonnaise
          let text;
          if (character.affinity < 40)
            text = "*He holds his bits a bit closer.* Ah, I don't really know ye well enough to be handin' me things over, do I. No offence, like.";
          else if (character.affinity >= 55 && !character.canTrade(depth))
            text = "*He pats his empty pockets, mortified.* Ah, ye've fairly cleaned me out for now, pal. Give us a bit to scrounge somethin' together, wha'? *winks*";
          else
            text = "Go on so, let's see what we've got! *Then, casual as anythin', which is to say not at all:* ...an' ye'd tell me, sure ye would, if ye ever came across a drop o' mayonnaise out there? Ye'd tell me. That's all I ask.";

          return { text, choices };
        } },
    ],
  };
}

/* plain definition — characters.js wraps this in a Character instance */
export const homiss = {
  id:   "homiss",
  name: "HOMISS",
  description: "A warm, rumpled Irishman with a bass slung across him and a doctorate in composition. Endlessly friendly, forever asking impossible questions, and quietly terrified that none of this is real. Would commit unspeakable acts for a jar of mayonnaise.",
  portrait: drawHomiss,
  drawLayer: drawHomissLayer,
  layerCount: 3,
  dialogue: homissDialogue,
  inventory: [
    { id: "plectrum", name: "Bone Plectrum",  desc: "A worn bass plectrum carved from... something. Homiss won't be drawn on what." },
    { id: "napkin",   name: "Scrawled Napkin",desc: "A cafe napkin covered in frantic notation and, underlined three times, the words 'IS ANY OF THIS REAL'." },
    // his prized piece: Labyrinth Tokens only, never gifted (price = LT cost)
    { id: "cassette", name: "Warped Cassette", desc: "A home-dubbed tape of Homiss's experimental bass works. The label just reads 'DREAD (live)'.", price: 30 },
  ],
  // what Homiss wants from the player. `open` he'll barter for out loud — he's
  // a foodie and forever curious; `hidden` he craves but won't name outright,
  // hinting at it in his riddles: a simple jar of mayonnaise. (These reference
  // items other/future characters carry, so each barter path lights up only
  // once such an item is actually in the player's inventory — e.g. Scally's
  // cured sausage for the open trade.)
  interests: {
    open:   ["sausage", "data-vial"],
    hidden: "mayo",
  },
};
