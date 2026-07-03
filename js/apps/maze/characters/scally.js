/* ============================================================
   MAZE.EXE — Scally
   A small, sneaky, very Italian fixer. This file is data + drawing
   only: it exports a plain character definition that characters.js
   wraps in a Character instance. Keeping it import-free of the engine
   avoids any module cycle and keeps each character self-contained.

   The figure is drawn from composable parts so it can render as one
   flat portrait (for the dialogue box) or split across depth layers
   (for the 2.5D in-world figure), and so the face can switch between
   moods: "neutral" | "happy" | "angry" | "sad".
   ============================================================ */

/* drawing ink — defaults to the original green, but every draw call is handed
   the current level's ink (see palette.characterInk / characters.js) so all
   characters render in one colour, like an old single-phosphor monitor. */
let LINE = "#46ff8e", FILL = "#0c2b1a";
let GLOW0 = "rgba(70,255,142,.20)", GLOW1 = "rgba(70,255,142,0)";
function applyInk(ink){
  if (!ink) return;
  LINE = ink.line; FILL = ink.fill; GLOW0 = ink.glow0; GLOW1 = ink.glow1;
}

function scallyGlow(g, w, h){
  const grd = g.createRadialGradient(w/2, h*0.55, 12, w/2, h*0.55, w*0.62);
  grd.addColorStop(0, GLOW0);
  grd.addColorStop(1, GLOW1);
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
}

function scallyBody(g, w, h){
  g.lineJoin = "round"; g.lineCap = "round";
  g.strokeStyle = LINE; g.lineWidth = 3; g.fillStyle = FILL;
  const cx = w / 2;
  g.beginPath();
  g.moveTo(cx-58, h*0.96);
  g.bezierCurveTo(cx-82, h*0.62, cx-58, h*0.50, cx-18, h*0.47);
  g.bezierCurveTo(cx+48, h*0.47, cx+72, h*0.72, cx+58, h*0.96);
  g.closePath(); g.fill(); g.stroke();
}

function scallyMustache(g, hx, hy, hr, curl){   // curl > 0 = tips up (cheerful), < 0 = droop
  g.strokeStyle = LINE; g.lineCap = "round"; g.lineWidth = 4.5;
  const base = hy + hr*0.52, tip = hy + hr*(0.52 - 0.34*curl);
  g.beginPath();
  g.moveTo(hx+hr*0.12, base);
  g.quadraticCurveTo(hx-hr*0.55, hy+hr*0.6, hx-hr*0.62, tip);
  g.moveTo(hx+hr*0.12, base);
  g.quadraticCurveTo(hx+hr*0.75, hy+hr*0.6, hx+hr*0.82, tip);
  g.stroke();
}

function scallyFace(g, hx, hy, hr, mood){
  g.strokeStyle = LINE; g.lineCap = "round"; g.lineJoin = "round";
  if (mood === "happy"){
    g.lineWidth = 2.5;                                   // arched, smiling eyes ^ ^
    g.beginPath(); g.moveTo(hx-hr*0.46, hy+hr*0.02); g.quadraticCurveTo(hx-hr*0.26, hy-hr*0.22, hx-hr*0.06, hy+hr*0.02); g.stroke();
    g.beginPath(); g.moveTo(hx+hr*0.16, hy+hr*0.02); g.quadraticCurveTo(hx+hr*0.36, hy-hr*0.22, hx+hr*0.56, hy+hr*0.02); g.stroke();
    g.lineWidth = 3;                                     // big grin
    g.beginPath(); g.moveTo(hx-hr*0.4, hy+hr*0.42); g.quadraticCurveTo(hx+hr*0.1, hy+hr*0.92, hx+hr*0.6, hy+hr*0.42); g.stroke();
    scallyMustache(g, hx, hy, hr, 1);
  } else if (mood === "angry"){
    g.lineWidth = 3;                                     // brows furrowed down-and-in
    g.beginPath(); g.moveTo(hx-hr*0.52, hy-hr*0.28); g.lineTo(hx-hr*0.1, hy-hr*0.04); g.stroke();
    g.beginPath(); g.moveTo(hx+hr*0.58, hy-hr*0.28); g.lineTo(hx+hr*0.16, hy-hr*0.04); g.stroke();
    g.lineWidth = 2.5;                                   // glaring slits
    g.beginPath(); g.moveTo(hx-hr*0.42, hy+hr*0.08); g.lineTo(hx-hr*0.1, hy+hr*0.1); g.stroke();
    g.beginPath(); g.moveTo(hx+hr*0.16, hy+hr*0.1); g.lineTo(hx+hr*0.46, hy+hr*0.08); g.stroke();
    g.lineWidth = 3;                                     // bared grimace
    g.beginPath(); g.moveTo(hx-hr*0.34, hy+hr*0.62); g.quadraticCurveTo(hx+hr*0.1, hy+hr*0.34, hx+hr*0.54, hy+hr*0.64); g.stroke();
    scallyMustache(g, hx, hy, hr, -0.5);
  } else if (mood === "sad"){
    g.lineWidth = 2.5;                                   // brows raised at the inner corners
    g.beginPath(); g.moveTo(hx-hr*0.46, hy-hr*0.08); g.lineTo(hx-hr*0.1, hy-hr*0.3); g.stroke();
    g.beginPath(); g.moveTo(hx+hr*0.5, hy-hr*0.08); g.lineTo(hx+hr*0.14, hy-hr*0.3); g.stroke();
    g.beginPath(); g.arc(hx-hr*0.27, hy+hr*0.08, hr*0.07, 0, Math.PI*2); g.stroke();   // droopy eyes
    g.beginPath(); g.arc(hx+hr*0.3,  hy+hr*0.08, hr*0.07, 0, Math.PI*2); g.stroke();
    g.lineWidth = 3;                                     // downturned mouth
    g.beginPath(); g.moveTo(hx-hr*0.3, hy+hr*0.64); g.quadraticCurveTo(hx+hr*0.1, hy+hr*0.38, hx+hr*0.5, hy+hr*0.64); g.stroke();
    scallyMustache(g, hx, hy, hr, -0.7);
  } else {                                               // neutral, sly and sneaky
    g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(hx-hr*0.45, hy-hr*0.05); g.lineTo(hx-hr*0.08, hy+hr*0.04); g.stroke();
    g.beginPath(); g.moveTo(hx+hr*0.18, hy-hr*0.02); g.lineTo(hx+hr*0.5,  hy+hr*0.06); g.stroke();
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(hx-hr*0.35, hy+hr*0.5); g.quadraticCurveTo(hx+hr*0.1, hy+hr*0.82, hx+hr*0.6, hy+hr*0.38); g.stroke();
    scallyMustache(g, hx, hy, hr, 0.2);
  }
}

function scallyHead(g, w, h, mood){
  g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = LINE; g.fillStyle = FILL;
  const hx = w/2 + 12, hy = h*0.32, hr = w*0.16;
  g.lineWidth = 3;
  g.beginPath(); g.ellipse(hx, hy, hr*0.9, hr, 0, 0, Math.PI*2); g.fill(); g.stroke();   // head
  g.beginPath();                                                                         // flat cap
  g.moveTo(hx-hr*1.05, hy-hr*0.45);
  g.quadraticCurveTo(hx-hr*0.1, hy-hr*1.5, hx+hr*1.0, hy-hr*0.75);
  g.quadraticCurveTo(hx+hr*1.7, hy-hr*0.6, hx+hr*1.25, hy-hr*0.2);
  g.quadraticCurveTo(hx, hy-hr*0.5, hx-hr*1.05, hy-hr*0.45);
  g.closePath(); g.fill(); g.stroke();
  scallyFace(g, hx, hy, hr, mood);
}

function scallyHands(g, w, h){
  g.lineJoin = "round"; g.strokeStyle = LINE; g.lineWidth = 3; g.fillStyle = FILL;
  const px = w/2 + 16, py = h*0.68;
  g.beginPath(); g.ellipse(px-11, py,   w*0.075, w*0.05, -0.35, 0, Math.PI*2); g.fill(); g.stroke();
  g.beginPath(); g.ellipse(px+13, py+5, w*0.075, w*0.05,  0.35, 0, Math.PI*2); g.fill(); g.stroke();
}

/* full flat portrait — used by the dialogue box */
function drawScally(g, w, h, mood = "neutral", ink){
  applyInk(ink);
  g.clearRect(0, 0, w, h);
  scallyGlow(g, w, h);
  scallyBody(g, w, h);
  scallyHead(g, w, h, mood);
  scallyHands(g, w, h);
}

/* one depth layer of the figure — used for the 2.5D in-world build.
   0 = body (back), 1 = head/face (mid), 2 = hands (front, nearest). */
function drawScallyLayer(g, w, h, mood, layer, ink){
  applyInk(ink);
  g.clearRect(0, 0, w, h);
  if (layer === 0){ scallyGlow(g, w, h); scallyBody(g, w, h); }
  else if (layer === 1){ scallyHead(g, w, h, mood); }
  else { scallyHands(g, w, h); }
}

/* Scally's dialogue is a hub of topics. The dialogue engine shows the
   available topics as choices; once a topic is used it is recorded
   in `character.seen` and never offered again, and when nothing
   engageable is left the hub falls back to the `exhausted` line.

   A topic: { id, label, req?, effects?, oneShot?, available?, node }
     - req       gate on a player attribute (shown disabled if unmet)
     - effects   applied once, when the topic is selected (e.g. like)
     - oneShot   default true; false topics persist (driven by state)
     - available optional predicate that hides the topic until it's true
     - node      the line(s) Scally speaks; an object, or a function that
                 returns one (use a function when it depends on state)

   The "trade" topic stays open every level (oneShot:false, no `available`)
   and builds its choices from the shared economy on the base class (see
   characters.js): a token sale of his priced item, a barter for anything
   he covets that the player happens to be carrying, a riddly swap if they
   hold his hidden desire, and a free trinket for a friend (the only path
   on the trade cooldown). Scally is the casual sort and calls the tokens
   "LT"; the level-1 "tokens" topic is where he explains them. */
function scallyDialogue(ctx){
  const { depth, character, player } = ctx;

  const greet = {
    hostile:  "Eh. You again. Mamma mia... whaddya want?",
    wary:     "Mmm. Ciao. I am-a watching you, amico.",
    neutral:  "Ahh, ciao ciao! A little mouse, lost in the wires, eh?",
    friendly: "Amico! Bellissimo to see your face again!",
    warm:     "Mio caro amico! Come, come — Scally, he has been waiting for you!",
  }[character.tone];

  return {
    hub: true,
    level: depth,                 // conversations are tracked (and exhausted) per level
    greet: `${greet} Down here on level ${depth}, eh, is dangerous. But Scally, he knows-a things.`,
    exhausted: "Eh, amico — we have-a talked enough for now. Go, go! The maze, she is waiting. *Scally rubs his hands and melts back into the static.*",
    hostile: "*He turns his back, muttering in Italian.* Pah! I got nothing for you. You bring Scally something nice, eh — then maybe we talk again.",
    topics: [
      { id: "place", label: "Well met, friend — what is this place?", effects: { like: +3 },
        node: { text: "Heh — 'friend', he says. I like-a this one. They call her the Labyrinth Protocol, amico — the maze that is not a maze, the in-between. You walk, you talk to Scally, you no get lost. Capisce?" } },

      // level-1 only: the tutorial on Labyrinth Tokens (Scally calls them "LT")
      { id: "tokens", label: "Anything I should know while travelling through this place?",
        available: () => depth === 1, effects: { like: +3 },
        node: { text: "Ahh, smart, smart to ask! See the little shapes, floating, spinning in the halls? LT, amico — Labyrinth Tokens. The coin of this place! The big fat crystals, they are five LT each. The middle ones, three. The little ones, just one. You walk into them, *poof*, they are yours. And everybody down here wants LT — me, the others, all of us. Some things, amico, money is the only language they speak. So you grab every one you see, eh? Every. Single. One." } },

      { id: "others", label: "Who else wanders down here?",
        node: { text: "The others? Pfft. Things in the static, wearing faces, amico. Me — Scally — I am the only honest one. *grin*" } },

      { id: "charm", label: "*Flatter him* A man of your style must run this whole place.",
        req: { attr: "charisma", level: 6 }, effects: { like: +3 },
        node: { text: "*He puffs up, twirling the mustache.* Ahhh, you have-a the eye! Nothing it moves in these wires without Scally knowing. We are friends now, eh? And friends — friends help each other." } },

      { id: "smart", label: "This is a recursive lattice — where does it terminate?",
        req: { attr: "intelligence", level: 6 }, effects: { like: +2 },
        node: { text: "*Scally blinks, then cackles.* Clever mouse! It 'terminates' at the broken wall — where everything it falls into the static. Follow the glow, amico. And watch your step, eh." } },

      { id: "muscle", label: "*Rap your knuckles hard on the wall beside his window.*",
        req: { attr: "strength", level: 6 }, effects: { like: +1 },
        node: { text: "EH! Eh eh eh — careful, gorilla! *He watches a hairline crack spider up the brick, then looks you up and down with new respect.* ...Madonna. Va bene. Okay, strong mouse. You break-a nothing else, and we stay friends, sì? *You can hear him already scheming how to use you.*" } },

      { id: "sharp-eyes", label: "You can see out of there, can't you? More than you let on.",
        req: { attr: "perception", level: 6 }, effects: { like: +2 },
        node: { text: "*A long pause. The grin thins.* ...sharp eyes, amico. Sì. The window, she works both ways — Scally sees the halls. Scally sees who walks them. *He taps his nose.* And lately, somebody walks them who casts no shadow on the glass. Ask me no more tonight." } },

      { id: "fortuna", label: "That little horn of yours — does it actually work?",
        req: { attr: "luck", level: 6 }, effects: { like: +2 },
        node: { text: "*He looks at you sideways, then chuckles, low.* You would know better than Scally, eh? Fortuna, she follows some people like a little dog. The maze feels it too — for the lucky ones she leaves doors where there were no doors, coins where there were no coins. *He polishes the cornicello on his sleeve.* Stay lucky, amico. Down here is a bad place to run out." } },

      { id: "rude", label: "Get out of my way, little man.", effects: { like: -10 },
        node: { text: "*The smile stays, but his eyes go cold.* Tsk. So rude. Va bene." } },

      // Always askable. The menu is built from the shared economy on the
      // base class: a coin-only sale, item-for-item barter, the riddly
      // hidden-desire swap, and a free gift for friends (cooldown-limited).
      { id: "trade", label: "Do you want to trade?", oneShot: false,
        node: () => {
          const choices = [];

          // 1) everything priced, Labyrinth Tokens only (not on the cooldown).
          //    His stock can grow mid-game (the mayo arrives at depth 6).
          for (const sale of character.forSale)
            choices.push({ text: sale.id === "mayo"
                             ? `Buy the ${sale.name}. *(He shields it like contraband.)*`
                             : `Buy the ${sale.name}.`,
                           effects: { give: sale.id, cost: sale.price, like: +2,
                                      flag: `bought-${sale.id}` } });

          // 2) barter: hand over something he openly covets for a trinket
          const swapFor = character.giftable[0];
          for (const id of character.interestsOpen){
            const held = player.inventory.find(it => it.id === id);
            if (held && swapFor)
              choices.push({ text: `Trade your ${held.name} for the ${swapFor.name}.`,
                             effects: { take: held.id, give: swapFor.id, like: +6,
                                        flag: `traded-${held.id}-to-${character.id}` } });
          }

          // 3) the hidden desire: only shows if the player actually holds it
          const secret = character.hiddenDesire && player.inventory.find(it => it.id === character.hiddenDesire);
          if (secret){
            const prize = character.giftable[0];
            choices.push({ text: `Offer the ${secret.name}. *(He keeps stealing glances at it.)*`,
              effects: { take: secret.id, give: prize?.id, like: +18, flag: "gave-saints-finger" },
              next: { text: "*His hands tremble as he takes it, voice dropping to nothing.* ...the little saint, she comes home at last. You did not see this, eh? Here — take it, take it. Is the least Scally can do. *He will not meet your eyes.*" } });
          }

          // 4) a free trinket for a friend - the one path on the trade cooldown
          const freebie = character.giftable[0];
          if (character.affinity >= 55 && character.canTrade(depth) && freebie)
            choices.push({ text: "Anything spare for a friend?",
                           effects: { give: freebie.id, like: +3, gift: true } });

          choices.push({ text: "(Maybe later.)" });

          // intro line: cagey when you're poor company, apologetic when on
          // cooldown, and always dropping a riddle about the thing he craves
          let text;
          if (character.affinity < 40)
            text = "*He keeps the goods close to his chest.* Trade? With you, amico, only the coin talks. You show Scally the LT, eh?";
          else if (character.affinity >= 55 && !character.canTrade(depth))
            text = "*Scally pats his coat, apologetic.* Favours you must wait for, my friend — things are-a scarce in the Labyrinth Protocol right now. But coin? Coin always talks. *winks*";
          else
            text = "*He spreads his little wares.* Eh, let us deal! And... *his voice drops* ...if ever the maze gives up a little bone the old saints left behind, you bring it to Scally, eh? I ask-a no more. *He looks quickly away.*";

          return { text, choices };
        } },
    ],
  };
}

/* plain definition — characters.js wraps this in a Character instance */
export const scally = {
  id:   "scally",
  name: "SCALLY",
  description: "A small, hunched Italian fixer who haunts the wired. Forever rubbing his hands and smiling like he knows something you don't. Honest, he swears.",
  firstLevelNearStart: true,
  portrait: drawScally,
  drawLayer: drawScallyLayer,
  layerCount: 3,
  dialogue: scallyDialogue,
  inventory: [
    { id: "sausage", name: "Cured Sausage", desc: "Greasy, fragrant, faintly glowing. 'Real Italiano,' Scally insists." },
    { id: "coin",    name: "Brass Token",   desc: "A worn token stamped with a maze. Opens... something, somewhere." },
    // his prized piece: Labyrinth Tokens only, never gifted (price = LT cost)
    { id: "charm",   name: "Tin Cornicello",desc: "A little tin horn against the evil eye. Scally swears by it.", price: 45 },
  ],
  // what Scally wants from the player. `open` he'll haggle for out loud;
  // `hidden` he craves but won't name, and only hints at in riddles.
  // (These reference items future characters drop, so the barter paths
  //  light up once such an item is in the player's inventory.)
  interests: {
    open:   ["relic-shard", "data-vial"],
    hidden: "saints-finger",
  },
};
