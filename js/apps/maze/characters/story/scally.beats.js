/* ============================================================
   MAZE.EXE — Scally's story beats
   The authored STORY_TOPICS entries for Scally, split out of
   story.js so each character's plot lives in one place. This is pure data:
   a factory handed the story engine's helpers (hasFlag, NAMES, freedIds, trappedIds, releaseChoices, refuseChoice, twistNode, FINAL_DEPTH)
   so it never has to import story.js — no module cycle. story.js merges the
   result back into STORY_TOPICS in the same per-character order, so the
   narrative gate and dialogue are unchanged. Beat IDs/flags must not change
   (existing saves key on them).
   ============================================================ */
export function scallyBeats(H){
  const { hasFlag, NAMES, freedIds, trappedIds, releaseChoices, refuseChoice, twistNode, FINAL_DEPTH } = H;
  return [

  /* -- depth 1 . Scally: the wires went dead (roots the whole chain) -- */
  { char: "scally", depth: 1, make: () => ({
      id: "quiet-wires", story: true, once: true,
      label: "*He keeps glancing at the walls.* Something wrong?",
      effects: { like: +1, flag: "heard-isolation" },
      node: { text: "Eh... you noticed, amico? Used to be, we all talked through the walls. Chatter chatter, all day, window to window. Then, *he snaps his fingers*, silenzio. Somebody pulled the plug on us. You find the others down there, you tell them Scally is still here, eh? You tell them.",
        choices: [
          { text: "I'll carry word. To all of them.", effects: { like: +2 },
            next: { text: "*The hands go still. For Scally, a standing ovation.* ...you would do this? Va bene, little courier. Scally remembers who carries and who only walks." } },
          { text: "Who'd want you all cut off?",
            next: { text: "*The grin thins to a wire.* Now THAT is the question, eh? Somebody who likes us quiet. Somebody who likes us... separate. Keep asking it, amico. Just not so loud." } },
          { text: "Maybe they all just got tired of talking to you.", effects: { like: -4 },
            next: { text: "*Something behind the smile closes like a shutter.* ...sì. Four people, all tired the same night, the same MINUTE. *He turns half away.* You know what Scally thinks? Maybe YOU get tired next. Is easy, down here." } },
        ] } }) },

  /* -- depth 1 . Scally: the rules of the halls -- */
  { char: "scally", depth: 1, make: () => ({
      id: "the-rules", story: true, once: true,
      label: "Any advice for someone just passing through?",
      effects: { like: +1 },
      node: { text: "*He counts on three fingers.* Uno: everything down here is for sale, except the things that matter. Those, you trade. Due: be NICE to the people in the windows. We are all each other has, and we keep accounts. Tre... *the finger hangs in the air* ...you pass a window and it is dark inside, you keep walking. Whatever knocks, you no knock back.",
        choices: [
          { text: "Noted. Rules one and two sound negotiable, though.", effects: { like: +2 },
            next: { text: "*He barks a laugh, delighted.* One day here and already haggling with the RULES. We are going to get along, amico. Or be a serious problem for each other. Either way, not boring, eh?" } },
          { text: "What's behind the dark windows?",
            next: { text: "*He looks at you a long moment.* ...tenants who stopped paying the rent, amico. *And that is all he says.*" } },
          { text: "I don't need a tour guide, little man.", effects: { like: -3 },
            next: { text: "*He spreads his hands, all courtesy, none of it warm.* No no, of course. The clever mouse needs nobody. *He polishes the glass with his sleeve.* The maze, she loves the ones who need nobody. She keeps them the longest." } },
        ] } }) },

  /* -- depth 1 . Scally: and what exactly are YOU? (after quiet-wires) -- */
  { char: "scally", depth: 1,
    available: () => hasFlag("heard-isolation"),
    make: () => ({
      id: "what-are-you", story: true, once: true,
      label: "*He's been studying you.* Go on, ask it.",
      effects: { like: +1 },
      node: { text: "Eh, since you offer! You WALK, amico. We do not. We stand in our frames like paintings nobody buys. So: what walks the Labyrinth Protocol and does not live in a wall? An operator, like the ones before? Or something the maze dreamed up to test us? *The eyes are friendly. The eyes are also weighing you.* What are you?",
        choices: [
          { text: "An operator. I came in through the front door, same as you.", effects: { like: +2, flag: "op-honest" },
            next: { text: "*He nods slowly, filing it.* The front door. Then somebody should tell you, amico: nobody ever found the BACK one. *A beat, then the grin returns.* But fresh legs, fresh eyes... maybe you look in the right corner. Scally will be watching. Kindly! Kindly watching." } },
          { text: "That's my business.", effects: { flag: "op-cagey" },
            next: { text: "*He touches two fingers to his cap, honestly pleased.* Privacy! A currency very undervalued. Va bene, keep your pockets shut. *softly* ...just remember, amico: down here, a secret is a thing with interest. It compounds." } },
          { text: "Whatever gets me to the bottom. You're all just scenery.", effects: { like: -5, flag: "op-blunt" },
            next: { text: "*A long silence. The music has gone out of the accent.* Scenery. *He straightens his coat.* The last operator who talked like this, the maze made HIM scenery. Ask the walls, they still have his handwriting. *The grin comes back on like a shop sign.* But eh! Fresh start! Scally forgets nothing. Forgives everything. One of the two." } },
        ] } }) },

  /* -- relay 2 . Scally: deliver the answer, carry one back --
     (min depth 2/3 on these paces the chain to one step per level) -- */
  { char: "scally", depth: 2,
    available: () => hasFlag("msg-h2s") && !hasFlag("msg-h2s-done"),
    make: () => ({
      id: "relay-2", story: true, once: true,
      label: "Homiss says: 'the answer to your question is yes.'",
      effects: { like: +3, flag: ["msg-h2s-done", "msg-s2h"], peers: [{ of: "scally", toward: "homiss", delta: +4 }] },
      node: { text: "*The hands stop rubbing. For once the whole little man goes still.* ...he said yes? *He turns away; when he turns back the grin is smaller. Real.* Va bene. Grazie, amico, you are a good little courier. You see him again, you tell him from Scally: 'then hold on to it. Even down here.' Exact words, eh? Exact." } }) },

  /* -- depth 2 . Scally: word travels (the new tenant, and a small ask) -- */
  { char: "scally", depth: 2, make: () => ({
      id: "word-travels", story: true, once: true,
      label: "There's a new window a level down. A woman.",
      effects: { like: +1 },
      node: { text: "*The eyebrows go up, and for half a second there is plain relief on him.* The dottoressa! Piccola Bee! Good. Good that she is... visible. *He rubs his hands, back to business.* The little doctor, she likes to ASK things. About everybody. About Scally. So when she asks, and she will ask, you tell her only the nice parts, eh?",
        choices: [
          { text: "And if the nice parts don't cover it?", effects: { like: +2 },
            next: { text: "*He laughs, caught fair.* Ehhh, this one has EYES. Va bene. Tell her the truth, then. But tell her GENTLY. She worries like other people breathe. And amico... *quieter* ...she is usually right to." } },
          { text: "I'm not carrying gossip between windows.",
            next: { text: "*He shrugs, unoffended.* No? Then carry BREAD, carry MESSAGES, carry what you like. But you WILL carry, amico. Is what you are for. *He taps his temple.* The maze made herself a courier. Scally only hopes she knows what she is carrying." } },
          { text: "What's she to you, then?", effects: { like: -2 },
            next: { text: "*The shutters half-close.* ...a colleague. A neighbour. *He fusses with his coat.* Down here you do not ask a man to itemise his heart. Everything else in the window, sure. The heart is non in vendita. Not for sale. *A beat.* She argues fair. Write that down." } },
        ] } }) },

  /* -- depth 4 . Scally: how the maze sheds items -- */
  { char: "scally", depth: 4, make: () => ({
      id: "shard-hint", story: true, once: true,
      label: "Anything valuable down here besides tokens?",
      effects: { like: +1 },
      node: { text: "Eh, funny you should ask! The maze, sometimes she sheds. Little pieces of the old Protocol: relic shards, data vials, stranger things the first users left in the walls. You see something glowing that is NOT a token, you pick it up and bring it to Scally, who pays like a gentleman. *rubs hands* Like a GENTLEMAN." } }) },

  /* ================= the ask (depth 4+) =================
     Four levels down, the penny drops for all of them: the player walks,
     and walking is the one thing none of them can do. Each starts angling
     for their freedom in their own register. */

  /* -- depth 4 . Scally: the favour (transactional, naturally) -- */
  { char: "scally", depth: 4, make: () => ({
      id: "the-favour", story: true, once: true,
      label: "*For once he's not rubbing his hands.* Speak your mind.",
      effects: { like: +1, flag: "ask-scally" },
      node: { text: "*He glances down the corridor both ways, which is absurd, and does it anyway.* Four levels you last now. Most before you were wallpaper by four. So Scally stops pretending: you are not a customer, amico. You are a KEY that walks. *He presses a palm flat to the glass, the first time he has ever touched it in front of you.* Somewhere at the bottom is the thing that keeps us in the frames. Machinery, code, Scally does not know. But a key that keeps walking DOWN... you understand what Scally is asking. He asks it once, out loud.",
        choices: [
          { text: "I'll find the bottom. And I'll open the frames.", effects: { like: +2 },
            next: { text: "*For a heartbeat there is no merchant in the window at all, just a small tired man with his hand on the glass.* ...va bene. *The coat and the grin go back on together.* Then we do business, you and Scally. The BIG business. *He points at you, almost gently.* Keep. Walking." } },
          { text: "What's it worth to you if I do?", effects: { like: +1, flag: "scally-owes" },
            next: { text: "*The grin spreads slow, genuinely admiring.* Even for THIS, the mouse negotiates. Amico, you are Scally's favourite thing in the whole Protocol. It is worth EVERYTHING, and everything is what you will have: the stock, the secrets, the little book of who-owes-who. In writing? No. In MEMORY. Down here that is the harder currency." } },
          { text: "Everyone down here wants something from me.", effects: { like: -3 },
            next: { text: "*He doesn't flinch. He just looks smaller.* ...sì. Everyone wants. You know what the wanting IS, amico? Proof we are still people. The maze wants nothing. She only keeps. *He turns to tidy stock that does not need tidying.* Go. The gate is waiting. She never asks you for anything, eh? Maybe you like her better." } },
        ] } }) },
  /* -- depth 5 . Scally: the hidden user (STORY.md section 3) -- */
  { char: "scally", depth: 5,
    available: () => hasFlag("heard-isolation"),
    make: () => ({
      id: "hidden-user", story: true, once: true,
      label: "So who cut the wires on you all?",
      effects: { like: +1, flag: "warned-hidden" },
      node: { text: "*His voice drops so low you have to lean in.* Nobody knows, amico. But the others feel it too: there is somebody ELSE in here. Another user. Hiding. Not stuck behind a window like us... walking. Like you. *His eyes flick past your shoulder.* Maybe they cut the wires. Maybe worse. So Scally tells you once, for free: somebody down here says they are trapped, you count their walls, eh? Count. The. Walls.",
        choices: [
          { text: "Walking. Like me. How do you know it isn't me?", effects: { like: +2 },
            next: { text: "*He goes very still, then laughs once, quiet.* ...bravo, amico. Five levels and you ask the question it took the others a YEAR. Scally doesn't know. That is the honest answer, the only one in stock. But the hidden one never asks 'is it me'. The hidden one asks 'who do you suspect'. *He winks, and there is no play in it at all.* Keep asking your question. It is good armour." } },
          { text: "Then I'll find them before they find me.",
            next: { text: "*He sucks air through his teeth.* Gently, gorilla, gently. Down here, 'finding' happens to BOTH parties at once. You want to hunt? Hunt with your EARS. The day you notice a silence walking past you... you come tell Scally FIRST, eh?" } },
          { text: "Sounds like ghost stories to keep the new tenant scared.", effects: { like: -3 },
            next: { text: "*The temperature through the glass drops.* ...sì. Stories. *He rearranges stock, not looking at you.* Four people in four windows, all frightened of the same nothing, the same night. Quite the coincidence, eh? When you meet it, and down you go, so you will, remember you called it a story. No refunds on advice, amico." } },
        ] } }) },

  /* -- depth 6 . Scally: advertises the impossible jar -- */
  { char: "scally", depth: 6,
    available: ctx => ctx.character.inventory.some(i => i.id === "mayo"),
    make: () => ({
      id: "impossible-stock", story: true, once: true,
      label: "*He's grinning even more than usual.* What?",
      effects: { like: +1, flag: "mayo-known" },
      node: { text: "Amico! Fortuna! Something impossible fell into Scally's pockets. *He opens his coat a crack: a glass jar, pale and full.* Mayonnaise. REAL mayonnaise. Scally thinks you know somebody who would give his ARM for this. *He snaps the coat shut.* For you? A price most reasonable. You ask Scally to trade, eh?" } }) },

  /* -- depth 6 . Scally: the insurance (a shakedown dressed as kindness) --
     The trap runs BACKWARDS on purpose: paying the nice man reads as
     weakness; laughing the racket off earns his respect. Nobody warns
     the player. */
  { char: "scally", depth: 6, make: () => ({
      id: "protection", story: true, once: true,
      label: "*He beckons you close, all concern.* Trouble?",
      effects: { like: +1 },
      node: { text: "*The voice goes velvet.* Amico. Scally worries for you, walking the halls all alone. The hidden one. The dark windows. The maze in one of her MOODS. *He produces a small square of tin with a hole punched in it.* So! For a very modest consideration, say five little tokens a level, Scally makes sure certain... parties... know you walk under his protection. *The grin is warm as soup.* Is not a shakedown, capisce. Is INSURANCE. Between friends.",
        choices: [
          { text: "*Pay the five tokens.* Cheap, for peace of mind.", effects: { cost: 5, like: -3 },
            next: { text: "*The tin square changes hands. The grin stays exactly where it is, and something behind it files you under a new heading.* Prego, prego. *He pockets the tokens without counting them, which is how you know they were never the point.* Free advice, VALUED CLIENT: the ones who pay for safety, the maze can smell it on them. Was a test, the insurance. You pass the WRONG way. But Scally keeps the coins anyway. Lessons cost." } },
          { text: "*Laugh.* Protection? You can't even leave the window.", effects: { like: +2 },
            next: { text: "*A beat. Then he CACKLES, delighted, smacking the glass.* AH! You SEE it! Bravissimo! *He flicks the tin square away over his shoulder.* Scally protects NOTHING. Scally is a small man in a wall with a loud coat. *He leans in, and the grin means it now.* But a mouse who cannot be sold the fear, THAT mouse is worth knowing. No charge for today. Today was a pleasure." } },
          { text: "Threaten me again and you'll need the insurance.", effects: { like: -2 },
            next: { text: "*He puts both hands up, wounded, retreating into the coat.* Madonna! Such teeth. Nobody threatens, nobody threatens. Is a MISUNDERSTANDING of the retail experience. *But the eyes have gone flat and careful, and they stay that way.* ...you hear a wolf in every salesman, amico. Down here that is HALF right, and the half you get wrong will cost you friends you do not know you need yet." } },
        ] } }) },

  /* -- depth 8 . Scally: what a data vial is (the vial appears here) -- */
  { char: "scally", depth: 8, make: () => ({
      id: "vial-rumor", story: true, once: true,
      label: "What's a data vial, exactly?",
      effects: { like: +1 },
      node: { text: "*His eyes gleam.* Concentrated Protocol, amico. Memory, distilled: a little bottle of somebody's yesterday. Down this deep, sometimes one works itself loose out of the walls. Me, I pay handsome. *A beat.* ...I am not the only one down here who wants one, eh. But nobody pays like Scally pays." } }) },
  /* -- depth 10 . the capstone pair -- */
  { char: "scally", depth: 10, make: () => ({
      id: "ten-deep", story: true, once: true,
      label: "Ten levels down. How deep does this place go?",
      effects: { like: +2, flag: "depth10" },
      node: { text: "*For a long moment, no grin at all.* Deeper, amico. Deeper than Scally ever went. The operators before you... around here is where the walls stopped writing back to them. You have seen the scribbles, eh? *He taps his temple.* Keep talking to us. The ones who stopped talking, the maze, she kept them." } }) },

  /* -- depth 7 . Scally: the listener (what have you told them about me?) -- */
  { char: "scally", depth: 7, make: () => ({
      id: "the-listener", story: true, once: true,
      label: "*He's pressed to the glass, listening to something.*",
      effects: { like: +1 },
      node: { text: "*He holds up one finger, wait, and listens a moment longer to the corridor. To nothing.* ...eh. Gone. *He straightens his coat.* Amico, a question. Since the wires died, information moves one way only: on YOUR legs, out of YOUR mouth. Which makes you, no offence, the whole newspaper. So Scally asks what a careful man asks his newspaper: when you stand at the other windows... what do you tell them about Scally?",
        choices: [
          { text: "The truth. That you're kind under all the commerce, and scared like the rest of them.", effects: { like: +2 },
            next: { text: "*Dead silence. The hands stop.* ...scared. *He tries the word on like a coat from someone else's wardrobe.* You are a terrible newspaper, amico. No discretion, no MARKUP, just the plain goods over the counter. *The grin that climbs back up is small and real.* ...la piccola dottoressa says the same, doesn't she. Don't answer. *He waves you off, gently.* Go. Print your truths. Is a strange feeling, being reported accurately. Scally does not entirely hate it." } },
          { text: "Nothing. I don't discuss you with them, or them with you.", effects: { like: +1 },
            next: { text: "*He studies you a long moment, then nods, slow, professional.* A vault. *He taps the glass once.* Expensive policy, amico. A vault makes no friends, only clients. But down here maybe clients live longer. *The grin resets to standard retail.* Va bene. Scally notes only this, for NOBODY: a vault gets opened one of two ways. With the combination... or with the crowbar. Stay close to the people with combinations." } },
          { text: "Why? What is there to tell?", effects: { like: -3 },
            next: { text: "*The eyes narrow to coin-slots.* 'What is there to tell.' *He repeats it flat, like reading a bad cheque.* Amico, per favore. You stand at the window of a man who TRADES, in a maze where somebody cut five throats' worth of wire, and you play the innocent flute at him? Everybody down here is a story the others are reading in the dark. The only question is who holds the pen. *He turns half away.* Scally has been READ before, and the last reader... eh. Ask the walls how that ended." } },
        ] } }) },

  /* -- depth 9 . Scally: the riddle (the door he's been standing at) -- */
  { char: "scally", depth: 9, make: () => ({
      id: "the-riddle", story: true, once: true,
      label: "*He's turning something invisible over in his fingers.*",
      effects: { like: +1 },
      node: { text: "*He doesn't notice you for a moment, which never happens. His fingers are working an old shape in the air, small as a coin, thin as a twig.* ...eh! Amico. *The hands vanish into the coat, too quick.* You catch Scally doing the inventory of the head, is all. *He clears his throat, and then, sideways, in the voice he uses when a thing matters:* A riddle for you, free of charge. What is small as a key, old as a church, and opens nothing... but closes a very long story? *He smiles, and there is a whole locked room behind it.* No, don't answer. Is the kind of riddle you carry until you FIND it. And then you will know whose door it belongs to.",
        choices: [
          { text: "*Let the riddle be. Nod, and tip an invisible cap.*", effects: { like: +2 },
            next: { text: "*Something in the little man's shoulders comes down half an inch. You took the parcel without checking the weight, and that was the whole test.* ...you are learning the manners of the house, amico. *He taps his nose.* When the maze coughs it up, and she will, she sheds everything eventually, you will feel it watching you back. Bring it to the little shopkeeper, and ask him NOTHING, and he will owe you the kind of debt that has no price sticker. *He turns to his shelves.* ...grazie. For not asking. You have no idea, and that is exactly as it should be." } },
          { text: "What's behind the riddle, Scally? What does it MEAN to you?", effects: { like: -3 },
            next: { text: "*The fingers stop. All of him stops.* ...eh. *And the shutters come down. Not slammed; worse, folded quietly, like a man closing his stall in the rain.* You know what a riddle IS, amico? A box with the lid glued shut, so the thing inside stays FRESH. And you, snip snip, straight for the lid. *He busies himself with stock that was already tidy.* Some doors, you do not knock twice. The second knock tells the door too much about YOUR hand. *He glances up once, and the eyes are old.* The story under it is not stock, was never stock, and it does not come out for curiosity. Not even yours." } },
          { text: "Closes a story, is it? I'd bet luck finds it before I do.", req: { attr: "luck", level: 6 }, effects: { like: +2 },
            next: { text: "*He looks at you sideways, and slowly the grin comes back, with something like awe at the edge of it.* ...you know, amico, Scally believes you. Fortuna walks behind some people like a pickpocket who gives things BACK. *He leans close.* Then a bargain: when it falls in your path, and now it will, you have gone and SAID it, the maze listens to the lucky ones, you pick it up gently. Old things bruise. *Brisk again.* And you bring it up the stairs before anyone else smells it. There are noses down here. Some very dear to Scally. Some of them WORRY too much." } },
        ] } }) },

  /* -- depth 11 . Scally: the overheads (the shop is a haunted ledger) -- */
  { char: "scally", depth: 11, make: () => ({
      id: "overheads", story: true, once: true,
      label: "*He's counting stock. He's been counting the same shelf a while.*",
      effects: { like: +1 },
      node: { text: "*You watch him count six items, lose the thread, and start again. Twice.* ...amico. Good. A witness. *He gestures at the shelf.* Six pieces, eh? Six. *He turns one over: it has no back. Not broken. UNRENDERED, smooth as the inside of an egg.* Yesterday, this one had a back. Scally SOLD things out of the back of it. *The hands have stopped their rubbing entirely.* The books do not balance anymore. Things arrive that Scally never ordered. Things go that nobody bought. Is like the maze has started doing inventory of HER own. *He looks up.* And a shop, amico, is only a wall with better manners. If the stock is not safe behind Scally's glass... what else down here is being RESTOCKED?",
        choices: [
          { text: "Then we do YOUR inventory. Tell me every item, I'll remember them.", effects: { like: +2, flag: "scally-audited" },
            next: { text: "*He stares at you, and then, very slowly, the grin comes back, and it is the realest one you have ever been sold.* ...an audit. An OUTSIDE audit. *He lays the stock out on the sill, precise as surgery, and makes you say it all back. Twice. Somewhere in the second recitation you realise you are not memorising a shop. You are memorising HIM.* ...ecco. Now Scally exists in two ledgers. One in here, where the maze can cook the books... and one walking around on legs, where she cannot reach. *He taps the glass, soft.* Best deal Scally ever made. And it cost you nothing but memory. Spend it wisely, accountant." } },
          { text: "Maybe you miscounted. It happens. You're tired.", effects: { like: -3 },
            next: { text: "*The look he gives you is not angry. It is worse: it is professional.* ...amico. Scally has counted stock since he was seven years old, in the back of his nonno's shop, in the dark, by TOUCH. Through fevers, through funerals, through a war between two families over a delivery of lemons. Scally does not miscount. *He leans in.* So when the count is wrong, is not the counter. Is the WORLD. *He turns back to the shelf.* 'Tired.' The cheapest explanation in the shop, and like everything cheap, amico... you get what you pay for." } },
          { text: "What arrived that you never ordered?",
            next: { text: "*He goes very still. Then, without a word, he sets it on the counter: a small paper bag, folded shut, pristine, the kind a bakery would use. A name written on it in pencil, smudged beyond reading. Smudged, you suspect, on purpose, by a thumb, many times.* ...it was here when Scally opened up, four levels ago. Is warm, amico. Every level, still warm. Scally does not open it. Does not sell it. Does not THROW IT AWAY, because... *the shopkeeper looks at the bag the way other men look at the sea* ...maybe it is for somebody. And down here, a thing that is FOR somebody, you do not interfere with. You keep it warm. *He puts it back under the sill.* Ask me no more about the bag." } },
        ] } }) },

  /* -- depth 13 . Scally: closing time (the offer of formal employment) -- */
  { char: "scally", depth: 13, make: () => ({
      id: "closing-time", story: true, once: true,
      label: "*He's writing something with great ceremony.*",
      effects: { like: +1 },
      node: { text: "*He's scratching at a scrap of card, and when he finishes he holds it up with both hands, proud as a nonna with a certificate. In block letters: 'SCALLY & CO.'* ...eh? EH? Thirteen levels, amico. Scally has watched you carry messages like a postman, grief like a nurse, that DREADFUL bone like a man who does not read warning labels. A business decision has been reached. The '& CO.' is you. Is official. No wages: the wages is INFORMATION, which down here beats money like rock beats egg. No hours, except... *the shopkeeper voice thins* ...the deliveries do not stop, amico. Whatever you find at the bottom. Whatever it costs. The '& CO.' keeps making the rounds until every window on the books is EMPTY. That is the contract. *He slides an invisible pen across the sill.* Sign.",
        choices: [
          { text: "*Sign it. Press your hand flat to the glass over his.*", effects: { like: +2, flag: "scally-and-co" },
            next: { text: "*He looks at your hand on the glass a long moment, then puts his own against it, palm to palm through twelve millimetres of impossible, and for once in his commercial life says nothing at all.* ...ecco. Witnessed by the maze, countersigned by the fog. *He clears his throat violently and becomes a businessman again.* PARTNER. Junior partner. EXTREMELY junior. *He tucks the card into the coat, over his heart.* First directive of the board, and Scally means this with his whole crooked little heart: the firm's most valuable asset walks the halls with no glass in front of it. PROTECT the asset. Whatever is down there singing and standing at windows, the asset does not take it on alone. The asset comes HOME first, and we do the books together. Sì? Sì. Meeting adjourned. Go make the rounds, & CO." } },
          { text: "What happened to the operators who worked for you before me?", effects: { like: +1 },
            next: { text: "*The pencil stub goes still.* ...eh. The direct question. Is why Scally is hiring you and not a diplomat. Three, there were. One stopped talking to the windows: you have heard that story. One went down fast, TOO fast, and the maze loves a man in a hurry. *A pause.* ...and one used to stand where you stand, and one level she simply was not there anymore. No goodbye. No last delivery. *He does not look at the folded bakery bag, so hard that it is the same as pointing at it.* ...paid in advance, she had. Scally keeps it warm. *He slides the card forward again.* That is why the contract says the rounds do not stop. Windows before wages. Sign or don't, amico, but now you sign informed. Which is more than most employers ever give." } },
          { text: "I work alone, Scally. No firms, no contracts.", effects: { like: -3 },
            next: { text: "*He looks at the little card, then at you, and slowly, so you see every second of it, he tears it down the middle, between the SCALLY and the CO.* ...va bene. *No theatrics. That is what makes it land.* Scally has heard 'I work alone' from exactly four mouths down here. And the maze AGREED with all of them. She gave each one exactly the alone they asked for. Measured out generous, like a good butcher. More alone than they could carry, in the end. *He begins to close up the stall.* The offer stays open. Torn is not burned. But do Scally one kindness: when the alone starts to fit too well... come back before it tailors itself to you. The '& CO.', amico, was never about the deliveries." } },
        ] } }) },

  /* -- depth 14 . Scally: the exit interview (how many fit through the door?) -- */
  { char: "scally", depth: 14, make: () => ({
      id: "exit-interview", story: true, once: true,
      label: "*No grin tonight. He asks you to stand still a moment.*",
      effects: { like: +1, flag: "heard-doorprice" },
      node: { text: "*The stall is tidy. The coat is buttoned. Whatever this is, he has prepared for it.* Amico. Fourteen levels of good custom, so Scally asks the real question now, and he asks it like a man and not like a shop: *both hands flat on the sill* when you find the door at the bottom... how many of us fit through it? *He watches your face very carefully.* Scally has learned the one law under all the laws: everything has a price, and the price of a BIG thing is never 'nothing'. Five windows. One door. *His voice does not waver, which costs him visibly.* If the answer someday turns out to be 'not everybody'... Scally would rather know now what kind of courier holds the list.",
        choices: [
          { text: "Everyone comes out. I'm not accepting any other arithmetic.", effects: { like: +2 },
            next: { text: "*He looks at you a long time, and then nods, slowly, like a man accepting a currency he isn't sure is backed.* 'Everyone.' *He unbuttons the coat again, which is his body deciding to believe you before his head does.* Scally has heard 'everyone' before, from politicians and priests and one memorable insurance man. From them it was a price tag. From you... it sounds like a number you intend to go and COLLECT. *The grin returns, small, real, fierce.* Va bene. Then practice saying it, courier. Say it at every window until the maze herself starts stocking it. EVERYONE. *He taps the sill.* Best item ever listed at this stall. No discounts." } },
          { text: "If it comes to an order, you first, Scally. I owe you the most.", effects: { like: +2, flag: "promised-scally-first" },
            next: { text: "*Whatever he expected, it was not that. The little man goes absolutely still, and warmth and alarm cross his face together, and the alarm wins.* ...no. *Quiet, firm, kind.* Listen to Scally, because he will deny this conversation to his dying day: you do NOT owe the most to the one who charged you the most. If there is an order, you take the doctor's man first, because the maze is eating him fastest. Then the doctor, because she will fight you on it and lose time. Then the musician, then the loud one, and LAST *he taps his own chest* the shopkeeper, who has the most practice waiting. *The grin comes back on like armour.* ...but Scally heard what you said, amico. It goes in the ledger with the other impossible assets. Now go, before he prices it." } },
          { text: "That question's above my pay grade. Ask me at the door.", effects: { like: -3 },
            next: { text: "*He nods slowly, and begins, very quietly, to button the coat back up.* 'At the door.' *He aligns each button like closing a till.* A small lesson from a long career, free of charge: the man who says he will decide at the door has already decided. He has decided not to LOOK at the decision. It rides along in his pocket, getting heavier, and at the door he reaches in and finds the choice already made by fourteen levels of not-looking. *He looks up, and there is no anger in it, only a shopkeeper's terrible experience of people.* Look at it, courier. On the stairs, tonight. Take it out of the pocket while it is still light enough to carry. That is all the interview. *He turns to his shelves.* Thank you for your custom." } },
        ] } }) },

  { char: "scally",
    available: ctx => ctx.player.inventory.some(i => i.id === "lanyard"),
    make: () => ({
      id: "fear-lanyard", story: true, once: true,
      label: "*Scally has gone very quiet at the sight of your pocket.*",
      effects: { like: +1, flag: "lanyard-scally" },
      node: { text: "*The grin goes out like a match in the rain.* Put it away. *Ye've never heard the little man's voice do THAT before: flat, no music in it at all.* You want advice from Scally, free, once, never again: some things down here, the maze dreamed them up. Junk. Ghosts of ghosts. *His eyes stay anywhere but yer pocket.* And some things fell out of a POCKET, amico. A real pocket. On a real day. *He is already turnin' away.* The company, she had a name. Nobody in here says it. You carry that thing around the halls, maybe you find out why. *And then, so quiet ye nearly miss it:* ...Scally did not build the windows, amico. But Scally saw the purchase order." } }) },

  /* -- depth 12 . Scally: no shadow (the hidden user, at his own glass) -- */
  { char: "scally", depth: 12,
    available: () => hasFlag("warned-hidden"),
    make: () => ({
      id: "no-shadow", story: true, once: true,
      label: "*The stall is dark. He's standing well back from the glass.*",
      effects: { like: +1, flag: "scally-visited-dark" },
      node: { text: "*For the first time ever, the little lamp over his stock is off.* ...amico. Good. Come close... no. NO. Stay in the middle of the hall, where Scally can see all of you. *His voice is level, which is how you know.* Last night, something came down this corridor. Scally knows every footstep in this place. This was walking with no WEIGHT in it. It stopped at every window. At SCALLY'S window, a long time. And the glass *he glances at it sideways, not straight on* did not fog. Whatever stood there was not breathing. *He pulls his coat tighter.* So Scally asks a small service, gratis: cast a shadow for Scally. *He snaps the lamp on and watches the floor at your feet like a hawk.* ...eh. There it is. Grazie a Dio. There it is.",
        choices: [
          { text: "*Stand in the light. Let him look as long as he needs.*", effects: { like: +2 },
            next: { text: "*He looks a long time. Longer than politeness. And slowly, watching your plain grey shadow do all the boring things a shadow should, the shopkeeper reassembles himself: the posture first, then the hands, then the grin.* ...va bene. *He flips the main lamp on, and the stall is a shop again.* You let an old frightened man count your shadow like stock, and you make no joke of it. That is worth more than every token in your pockets, amico, and Scally has SEEN your pockets. *He leans in, and the last of it is a whisper with steel in it.* It will come back. Things that stop at windows always come back. When it does, Scally will be watching what IT does at the glass. And you and Scally, we compare the inventory. Two ledgers, eh? Always two ledgers." } },
          { text: "Did it want something from you? Things that linger usually want.", effects: { like: +2 },
            next: { text: "*The question lands somewhere deep, and he is quiet a long moment.* ...sì. That is the thought Scally keeps in the back room. Things that PASS, they pass. This one STAYED. At every window, but at Scally's, the longest. *He looks at his shelves.* A customer stands that long at a window for one of two reasons: they are choosing... or they are PRICING. *His eyes come back to you, old and sharp.* And Scally has spent a whole life reading the difference on faces, and through his own glass, backwards, in the dark... he could not tell. THAT is what frightens him. Not the no-shadow. The no-TELL. *He waves you off, gently.* Go. Walk loud, amico. Let the whole maze hear the weight in you. Down here, weight is honesty." } },
          { text: "You were dreaming, old man. Get some sleep.", effects: { like: -4 },
            next: { text: "*He looks at you, and instead of the shutters, what comes down over his face is something sadder: retail patience.* ...sì, sì. Dreaming. *He turns the little lamp off again.* Scally has been called a liar many times. Is fair. Scally lies about prices, about provenance, about how the sausage is made. Professional lies, with RECEIPTS. *He looks at you through the dark glass.* But fear? Fear, Scally has never once sold you. Fear is not stock. Fear is OVERHEAD. *He steps back into the dark where you can only see the shape of him.* Sleep well yourself, then, since sleeping is so easy in this place. And when something stops at YOUR pillow and does not fog the air over it... come tell Scally what you dreamed. First visit is free." } },
        ] } }) },

  /* -- depth 15 . Scally: the manifest (the list, and the audit of promises) -- */
  { char: "scally", depth: 15, make: () => ({
      id: "manifest", story: true, once: true,
      label: "*He's writing names, slowly, in his best hand.*",
      effects: { like: +1, flag: "heard-manifest" },
      node: () => {
        const promises = ["promised-scally-first", "promised-dalypso-first"].filter(hasFlag).length;
        return {
          text: promises >= 2
            ? "*He does not look up from the card he is lettering.* One moment. Manifests deserve a good hand. *He holds it to the glass: five names, careful as a headstone. SCALLY. HOMISS. LITTLE BEE. SIAN. DALYPSO. And underneath, twice the size: THE COURIER TAKES EVERYBODY.* Depth fifteen, amico. Time the paperwork existed. *Then the voice goes soft and very level.* ...one item of business first. You told Scally he goes first through the door. And the loud one downstairs tells his telly everything. Somebody told HIM 'first' as well. *He lets it sit.* A man who sells the same 'first' twice is not wicked. He is FRIGHTENED. Scally knows the move. Scally INVENTED the move. But at the bottom, when the door is narrow, the double-sold item goes to court. So fix your books NOW. Sell 'first' to nobody. Sell them THIS instead: *he turns the card again* the only item in the shop worth more the more people own it."
            : "*He does not look up from the card he is lettering.* One moment. Manifests deserve a good hand. *He holds it to the glass: five names, careful as a headstone. SCALLY. HOMISS. LITTLE BEE. SIAN. DALYPSO. And underneath, twice the size: THE COURIER TAKES EVERYBODY.* Depth fifteen, amico. Time the paperwork existed. *He sets it face-out on the sill.* Fifteen levels you have carried our words, and Scally has done the arithmetic: you are not a courier anymore. You are the ROPE. Five people holding one rope in the dark, and the rope is walking to the bottom of the world. *He taps the card.* So say the manifest back to Scally. All five names. ...eh, and your own, amico. Six. The rope goes through the door TOO. This clause Scally adds personally, because your type forgets to list themselves.",
          choices: [
            { text: "*Say all six names back. Slowly. Like a manifest.*", effects: { like: +2 },
              next: { text: "*He listens with his eyes closed, like checking stock off a lorry, and when your own name comes last, and he waits you out until it does, he nods once.* ...ecco. Filed. *He tucks the pencil away.* In the old shop, Nonno kept the important papers not in the safe but behind the Madonna, because thieves fear her more than locks. *He taps your side of the glass, over where your head is.* Same principle. The manifest lives THERE now. Behind whatever it is that walks you back to our windows when every stair says go down. *The grin spreads, old and bright.* Safest vault in the Labyrinth Protocol. Now go. And amico... *he glances at the card once more* ...grazie. For making the list the kind with nobody left off it." } },
            { text: "And if I get to the bottom and the door only opens once?",
              next: { text: "*He is quiet a long moment, and then does something you have never seen: he shrugs OFF the shopkeeper, coat and grin and patter, all set down like a tray. What is left is a small, tired, clear-eyed man.* Then you open it once, amico, and you HOLD it. Back against it, heels in the floor, until once is five times, six times, until the hinges scream. A door is only a rule, and you have been breaking this place's rules since the day you walked in still casting a shadow. *He puts the coat back on, becomes Scally again piece by piece.* ...and if it cannot be held? *The grin comes back, the fiercest thing you have ever seen sold over a counter.* Then you send through the four, and you and Scally keep the shop until you find the SECOND door. There is always a second door. Ask any smuggler. Now GO." } },
          ],
        };
      } }) },

  /* ================= the dark windows (cycle 2+) =================
     After the Custodian frees a tenant, their window spawns dark and
     empty. The others find it at the top of the next cycle — with no
     memory of the player reaching the bottom, they fear the worst, and
     the player decides what to tell them. One beat per character; the
     names interpolate, and each has an extra line for the person who
     matters most to them. These are `once`, so they echo in the cycle
     after like everything else — grieved afresh, word for word. */

  { char: "scally",
    available: () => freedIds().length > 0,
    make: () => { const gone = freedIds().map(id => NAMES[id]).join(" and "); return {
      id: "dark-window", story: true, once: true,
      label: "*He's watching the corridor, not you.* You've seen it too.",
      node: { text: `*No patter. No hands. He speaks with his eyes on the middle distance.* The window. ${gone}'s window. Dark, amico. Scally watched the light go out of it like a shop sign at closing. *A long pause.* You know what Scally tells everybody about the dark windows, eh? Keep walking. Whatever knocks, you no knock back. *He looks at you at last.* He never told HIMSELF what to do about one.`,
        choices: [
          { text: "They're out, Scally. Through the front door. I watched it open.", effects: { like: +2, flag: "told-freed" },
            next: { text: "*He goes very still, the way he did the day the answer was yes.* ...out. *He tries the word like a coin he suspects.* There is no 'out', amico, there is only deeper, everybody knows— *He stops. He looks at your face for a long, long moment, and whatever a fixer uses for scales weighs it.* ...you are not selling me this. You believe it. *He turns away and tidies the shelf, and his shoulders are doing something private.* Va bene. Then you get the REST of us to that door, courier, and Scally will forgive the maze everything. Almost everything." } },
          { text: "Rule three, Scally. Keep walking.",
            next: { text: "*A short, unhappy laugh.* Sì. My own stock, sold back to me at cost. *He straightens his coat.* Va bene. Scally keeps walking. Scally always keeps walking. *Quietly, as you go:* ...but you knock on the dark one anyway, eh? Once. For me. In case." } },
          { text: "Another tenant stopped paying rent, I suppose.", effects: { like: -4 },
            next: { text: "*The temperature through the glass drops to nothing.* ...careful, amico. *He does not raise his voice, which is how you know.* That was a NEIGHBOUR. You want to make jokes about empty frames, you go make them to the maze. She has your sense of humour. *He turns his back, and for once he does not melt into the static. He just stands there, small, facing his shelves.*" } },
        ] } }; } },

  /* ================= cycle 3: caught in the static =================
     One new capstone per character, spaced down the final descent —
     the Protocol is shutting down around them and each of them meets
     it in their own register. */

  { char: "scally", depth: 22, make: () => ({
      id: "unrendering", story: true, once: true,
      label: "*Half his shelves are... approximate. Grey. Unfinished.*",
      effects: { like: +1 },
      node: { text: "*He's mid-transaction with nobody when you arrive, wrapping something grey in paper that is also grey.* Ah! Amico! You want— you want the— *He looks down at the thing in his hands, and visibly decides not to know what it is.* ...the stock, she is going first, you see. The maze, she stops rendering the things nobody needs. The sausage went Tuesday. The good coat, this morning. Scally is standing in a shop made of SUGGESTIONS. *And then the grin, absolutely level:* Everything half off. Obviously.",
        choices: [
          { text: "The maze kept YOU rendered. That's the whole inventory that matters.", effects: { like: +2 },
            next: { text: "*The wrapping stops.* ...eh. *He sets the grey thing down, and for once the hands don't know what to do, so they just rest on the counter like two old men on a bench.* Twenty-nine floors of this place, amico, and you are the first customer to point at the SHOPKEEPER. *He clears his throat with tremendous dignity.* Sì. Well. The management keeps the essential fixtures, everybody knows this. *softly* Finish it, eh? While there is still a Scally to walk out of here. He has a great curiosity about the weather." } },
          { text: "What happens when the shelves are all gone?",
            next: { text: "*He shrugs, and it is the most honest shrug you have ever been sold.* Then Scally sells what is left. Advice. Memory. The names of who owed who — the little book is up HERE, amico, the maze cannot unrender THAT without unrendering the head it lives in. *He taps his temple, and pauses, and does not enjoy the thought he finds there.* ...go to the bottom, eh? Quickly. Before the discount reaches the tenants." } },
          { text: "Sell me the grey thing. I'll haggle you to nothing for it.", effects: { like: +1 },
            next: { text: "*He looks at you, then at the grey suggestion in the paper, then back — and laughs, the full one, from the boots.* HAGGLE! For the void itself! Madonna, they built you in a FUNNY factory. *He slides it across.* Free. A gift: one genuine piece of nothing, from Scally's own shelf. You know what is the trick with nothing, amico? *He winks, and the wink has closing time behind it.* Everybody down here has been living NEXT to it for years. Is not so frightening once you have held it. Now GO. The shop, she is closing early tonight." } },
        ] } }) }
  ];
}
