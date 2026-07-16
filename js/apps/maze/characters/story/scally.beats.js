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
      node: { text: "Eh... you noticed? We all used to talk through the walls, window to window, all day. Then — *snap* — silenzio. Somebody pulled our plug. You find the others down there, tell them Scally's still here. Tell them.",
        choices: [
          { text: "I'll carry word. To all of them.", effects: { like: +2 },
            next: { text: "*The hands go still — for Scally, a standing ovation.* ...you'd do this? Va bene, little courier. Scally remembers who carries, and who only walks." } },
          { text: "Who'd want you all cut off?",
            next: { text: "*The grin thins to a wire.* Now THAT'S the question. Somebody who likes us quiet. Us... separate. Keep asking it, amico. Just not so loud." } },
          { text: "Maybe they all just got tired of talking to you.", effects: { like: -4 },
            next: { text: "*Something behind the smile closes like a shutter.* ...sì. Four people, all tired the same night. The same MINUTE. *He turns half away.* Maybe YOU get tired next, eh? Is easy, down here." } },
        ] } }) },

  /* -- depth 1 . Scally: the rules of the halls -- */
  { char: "scally", depth: 1, make: () => ({
      id: "the-rules", story: true, once: true,
      label: "Any advice for someone just passing through?",
      effects: { like: +1 },
      node: { text: "*He counts on three fingers.* Uno: everything's for sale, except what matters — that you trade. Due: be NICE to the windows; we keep accounts. Tre... *the finger hangs* ...you pass a window and it's dark inside, you keep walking. Whatever knocks, you no knock back.",
        choices: [
          { text: "Noted. Rules one and two sound negotiable, though.", effects: { like: +2 },
            next: { text: "*He barks a laugh.* One day in and haggling with the RULES. We'll get along, amico — or be a serious problem. Either way, not boring." } },
          { text: "What's behind the dark windows?",
            next: { text: "*He looks at you a long moment.* ...tenants who stopped paying the rent, amico. *That's all he says.*" } },
          { text: "I don't need a tour guide, little man.", effects: { like: -3 },
            next: { text: "*He spreads his hands — all courtesy, no warmth.* No no. The clever mouse needs nobody. *He polishes the glass.* The maze loves the ones who need nobody. Keeps them longest." } },
        ] } }) },

  /* -- depth 1 . Scally: and what exactly are YOU? (after quiet-wires) -- */
  { char: "scally", depth: 1,
    available: () => hasFlag("heard-isolation"),
    make: () => ({
      id: "what-are-you", story: true, once: true,
      label: "*He's been studying you.* Go on, ask it.",
      effects: { like: +1 },
      node: { text: "Eh, since you offer! You WALK, amico. We don't — we stand in our frames like paintings nobody buys. So what walks the Protocol and doesn't live in a wall? An operator, like the ones before? Or something the maze dreamed up to test us? *Friendly eyes. Weighing eyes.* What are you?",
        choices: [
          { text: "An operator. I came in through the front door, same as you.", effects: { like: +2, flag: "op-honest" },
            next: { text: "*He nods slowly, filing it.* The front door. Then somebody should tell you: nobody ever found the BACK one. *A beat, then the grin returns.* But fresh legs, fresh eyes... maybe you look in the right corner. Scally will be watching. Kindly! Kindly watching." } },
          { text: "That's my business.", effects: { flag: "op-cagey" },
            next: { text: "*He touches two fingers to his cap, honestly pleased.* Privacy! An undervalued currency. Va bene, keep your pockets shut. *softly* ...just remember: down here, a secret has interest. It compounds." } },
          { text: "Whatever gets me to the bottom. You're all just scenery.", effects: { like: -5, flag: "op-blunt" },
            next: { text: "*A long silence. The music's gone out of the accent.* Scenery. *He straightens his coat.* The last operator who talked like this, the maze made HIM scenery. Ask the walls — they still have his handwriting. *The grin snaps back on like a shop sign.* But eh! Fresh start! Scally forgets nothing, forgives everything. One of the two." } },
        ] } }) },

  /* -- relay 2 . Scally: deliver the answer, carry one back --
     (min depth 2/3 on these paces the chain to one step per level) -- */
  { char: "scally", depth: 2,
    available: () => hasFlag("msg-h2s") && !hasFlag("msg-h2s-done"),
    make: () => ({
      id: "relay-2", story: true, once: true,
      label: "Homiss says: 'the answer to your question is yes.'",
      effects: { like: +3, flag: ["msg-h2s-done", "msg-s2h"], peers: [{ of: "scally", toward: "homiss", delta: +4 }] },
      node: { text: "*The hands stop rubbing. The whole little man goes still.* ...he said yes? *He turns away; when he turns back the grin is smaller. Real.* Va bene. Grazie, courier. You see him again, tell him from Scally: 'then hold on to it. Even down here.' Exact words, eh? Exact." } }) },

  /* -- depth 2 . Scally: word travels (the new tenant, and a small ask) -- */
  { char: "scally", depth: 2, make: () => ({
      id: "word-travels", story: true, once: true,
      label: "There's a new window a level down. A woman.",
      effects: { like: +1 },
      node: { text: "*The eyebrows go up — a half-second of plain relief.* The dottoressa! Piccola Bee! Good that she's... visible. *Back to business.* The little doctor likes to ASK things. About Scally. When she asks — and she will — only the nice parts, eh?",
        choices: [
          { text: "And if the nice parts don't cover it?", effects: { like: +2 },
            next: { text: "*He laughs, caught fair.* Ehhh, this one has EYES. Va bene — tell her the truth, then. But GENTLY. She worries like other people breathe. And amico... *quieter* ...she's usually right to." } },
          { text: "I'm not carrying gossip between windows.",
            next: { text: "*He shrugs, unoffended.* No? Then carry bread, carry what you like. But you WILL carry, amico. Is what you're for. *He taps his temple.* The maze made herself a courier. Scally only hopes she knows what she's carrying." } },
          { text: "What's she to you, then?", effects: { like: -2 },
            next: { text: "*The shutters half-close.* ...a colleague. A neighbour. *He fusses with his coat.* Down here you don't ask a man to itemise his heart. Everything else in the window, sure. The heart is non in vendita. Not for sale. *A beat.* She argues fair. Write that down." } },
        ] } }) },

  /* -- depth 4 . Scally: how the maze sheds items -- */
  { char: "scally", depth: 4, make: () => ({
      id: "shard-hint", story: true, once: true,
      label: "Anything valuable down here besides tokens?",
      effects: { like: +1 },
      node: { text: "Eh, funny you should ask! The maze sheds, sometimes — little pieces of the old Protocol. Relic shards, data vials, stranger things the first users left behind. You see something glowing that's NOT a token, bring it to Scally, who pays like a gentleman. *rubs hands* Like a GENTLEMAN." } }) },

  /* ================= the ask (depth 4+) =================
     Four levels down, the penny drops for all of them: the player walks,
     and walking is the one thing none of them can do. Each starts angling
     for their freedom in their own register. */

  /* -- depth 4 . Scally: the favour (transactional, naturally) -- */
  { char: "scally", depth: 4, make: () => ({
      id: "the-favour", story: true, once: true,
      label: "*For once he's not rubbing his hands.* Speak your mind.",
      effects: { like: +1, flag: "ask-scally" },
      node: { text: "*He glances both ways — absurd, and does it anyway.* Four levels, you've lasted. Most were wallpaper by two. So Scally drops the act: you're not a customer. You're a KEY that walks. *A palm flat to the glass — the first time, in front of you.* The thing that keeps us in the frames is at the bottom. You know what he's asking. Once. Out loud.",
        choices: [
          { text: "I'll find the bottom. And I'll open the frames.", effects: { like: +2 },
            next: { text: "*For a heartbeat there's no merchant in the window at all — just a small tired man with his hand on the glass.* ...va bene. *The coat and the grin go back on together.* Then we do business, you and Scally. The BIG business. *He points, almost gently.* Keep. Walking." } },
          { text: "What's it worth to you if I do?", effects: { like: +1, flag: "scally-owes" },
            next: { text: "*The grin spreads slow, genuinely admiring.* Even for THIS, the mouse negotiates. Amico, you're Scally's favourite thing in the whole Protocol. It's worth EVERYTHING, and everything is what you'll have: the stock, the secrets, the book of who-owes-who. In writing? No. In MEMORY. Down here that's the harder currency." } },
          { text: "Everyone down here wants something from me.", effects: { like: -3 },
            next: { text: "*He doesn't flinch. He just looks smaller.* ...sì. Everyone wants. You know what the wanting IS? Proof we're still people. The maze wants nothing. She only keeps. *He turns to tidy stock that doesn't need it.* Go. The gate's waiting. She never asks you for anything, eh? Maybe you like her better." } },
        ] } }) },
  /* -- depth 5 . Scally: the hidden user (STORY.md section 3) -- */
  { char: "scally", depth: 5,
    available: () => hasFlag("heard-isolation"),
    make: () => ({
      id: "hidden-user", story: true, once: true,
      label: "So who cut the wires on you all?",
      effects: { like: +1, flag: "warned-hidden" },
      node: { text: "*His voice drops so low you lean in.* Nobody knows. But the others feel it too: there's somebody ELSE in here. Another user. Hiding. Walking — like you. *His eyes flick past your shoulder.* Maybe they cut the wires. Maybe worse. So, once, free: somebody says they're trapped, you count their walls. Count. The. Walls.",
        choices: [
          { text: "Walking. Like me. How do you know it isn't me?", effects: { like: +2 },
            next: { text: "*He goes very still, then laughs once, quiet.* ...bravo. Five levels and you ask the question it took the others a YEAR. Scally doesn't know — the honest answer, the only one in stock. But the hidden one never asks 'is it me'. It asks 'who do you suspect'. *He winks, and there's no play in it at all.* Keep asking your question. Good armour." } },
          { text: "Then I'll find them before they find me.",
            next: { text: "*He sucks air through his teeth.* Gently, gorilla. Down here, 'finding' happens to BOTH parties at once. You want to hunt? Hunt with your EARS. The day you notice a silence walking past you... come tell Scally FIRST, eh?" } },
          { text: "Sounds like ghost stories to keep the new tenant scared.", effects: { like: -3 },
            next: { text: "*The temperature through the glass drops.* ...sì. Stories. *He rearranges stock, not looking at you.* Four people, four windows, all frightened of the same nothing, the same night. Quite the coincidence, eh? When you meet it — and you will — remember you called it a story. No refunds on advice, amico." } },
        ] } }) },

  /* -- depth 6 . Scally: advertises the impossible jar -- */
  { char: "scally", depth: 6,
    available: ctx => ctx.character.inventory.some(i => i.id === "mayo"),
    make: () => ({
      id: "impossible-stock", story: true, once: true,
      label: "*He's grinning even more than usual.* What?",
      effects: { like: +1, flag: "mayo-known" },
      node: { text: "Amico! Fortuna! Something impossible fell into Scally's pockets. *He cracks his coat: a glass jar, pale and full.* Mayonnaise. REAL mayonnaise. You know somebody who'd give his ARM for this, eh? *The coat snaps shut.* For you, a price most reasonable. Ask Scally to trade." } }) },

  /* -- depth 6 . Scally: the insurance (a shakedown dressed as kindness) --
     The trap runs BACKWARDS on purpose: paying the nice man reads as
     weakness; laughing the racket off earns his respect. Nobody warns
     the player. */
  { char: "scally", depth: 6, make: () => ({
      id: "protection", story: true, once: true,
      label: "*He beckons you close, all concern.* Trouble?",
      effects: { like: +1 },
      node: { text: "*Velvet.* Amico. Scally worries for you, alone in the halls. The hidden one. The dark windows. *He produces a punched tin square.* A modest consideration — five tokens a level — and certain parties know you walk under Scally's protection. *Warm as soup.* Not a shakedown. INSURANCE.",
        choices: [
          { text: "*Pay the five tokens.* Cheap, for peace of mind.", effects: { cost: 5, like: -3 },
            next: { text: "*The tin changes hands. The grin stays put, filing you under a new heading.* Prego, prego. *He pockets the tokens without counting them — how you know they were never the point.* Free advice, VALUED CLIENT: the maze can smell the ones who pay for safety. The insurance was a test. You paid the WRONG way. Scally keeps the coins. Lessons cost." } },
          { text: "*Laugh.* Protection? You can't even leave the window.", effects: { like: +2 },
            next: { text: "*A beat. Then he CACKLES, delighted, smacking the glass.* AH! You SEE it! Bravissimo! *He flicks the tin away over his shoulder.* Scally protects NOTHING. Scally is a small man in a wall with a loud coat. *He leans in, and the grin means it now.* But a mouse who can't be sold the fear — THAT mouse is worth knowing. No charge today. Today was a pleasure." } },
          { text: "Threaten me again and you'll need the insurance.", effects: { like: -2 },
            next: { text: "*Both hands up, wounded, retreating into the coat.* Madonna! Such teeth. Nobody threatens. A MISUNDERSTANDING of the retail experience. *But the eyes have gone flat and careful.* ...you hear a wolf in every salesman. Down here that's HALF right — and the wrong half costs you friends you don't know you need yet." } },
        ] } }) },

  /* -- depth 8 . Scally: what a data vial is (the vial appears here) -- */
  { char: "scally", depth: 8, make: () => ({
      id: "vial-rumor", story: true, once: true,
      label: "What's a data vial, exactly?",
      effects: { like: +1 },
      node: { text: "*His eyes gleam.* Concentrated Protocol. Memory, distilled — a bottle of somebody's yesterday. This deep, sometimes one works loose from the walls. Me, I pay handsome. *A beat.* ...I'm not the only one who wants one. But nobody pays like Scally pays." } }) },
  /* -- depth 10 . the capstone pair -- */
  { char: "scally", depth: 10, make: () => ({
      id: "ten-deep", story: true, once: true,
      label: "Ten levels down. How deep does this place go?",
      effects: { like: +2, flag: "depth10" },
      node: { text: "*For a long moment, no grin at all.* Deeper, amico. Deeper than Scally ever went. The operators before you... around here is where the walls stopped writing back. You've seen the scribbles. *He taps his temple.* Keep talking to us. The ones who stopped talking — the maze kept them." } }) },

  /* -- depth 7 . Scally: the listener (what have you told them about me?) -- */
  { char: "scally", depth: 7, make: () => ({
      id: "the-listener", story: true, once: true,
      label: "*He's pressed to the glass, listening to something.*",
      effects: { like: +1 },
      node: { text: "*He holds up a finger — listens to the corridor. To nothing.* ...eh. Gone. *He straightens his coat.* A question, amico. Since the wires died, information moves one way: on YOUR legs. So Scally asks what a careful man asks his newspaper: at the other windows... what do you tell them about Scally?",
        choices: [
          { text: "The truth. That you're kind under all the commerce, and scared like the rest of them.", effects: { like: +2 },
            next: { text: "*Dead silence. The hands stop.* ...scared. *He tries the word on like a coat from someone else's wardrobe.* You're a terrible newspaper. No discretion, no MARKUP, just the plain goods over the counter. *The grin that climbs back is small and real.* ...la piccola dottoressa says the same, doesn't she. Don't answer. *He waves you off.* Go, print your truths. Strange feeling, being reported accurately. Scally doesn't entirely hate it." } },
          { text: "Nothing. I don't discuss you with them, or them with you.", effects: { like: +1 },
            next: { text: "*He studies you, then nods, slow, professional.* A vault. *He taps the glass once.* Expensive policy. A vault makes no friends, only clients — but maybe clients live longer down here. *Standard retail again.* Scally notes only this, for NOBODY: a vault opens two ways. The combination... or the crowbar. Stay close to the people with combinations." } },
          { text: "Why? What is there to tell?", effects: { like: -3 },
            next: { text: "*The eyes narrow to coin-slots.* 'What is there to tell.' *He repeats it flat, like reading a bad cheque.* Per favore. You stand at the window of a man who TRADES, in a maze where somebody cut five throats' worth of wire, and you play the innocent flute? Everybody here is a story the others read in the dark. The only question is who holds the pen. *He turns half away.* Scally has been READ before. The last reader... eh. Ask the walls how that ended." } },
        ] } }) },

  /* -- depth 9 . Scally: the riddle (the door he's been standing at) -- */
  { char: "scally", depth: 9, make: () => ({
      id: "the-riddle", story: true, once: true,
      label: "*He's turning something invisible over in his fingers.*",
      effects: { like: +1 },
      node: { text: "*He doesn't notice you for a moment, which never happens. His fingers work an old shape in the air — small as a coin, thin as a twig.* ...eh! Amico. *The hands vanish into the coat, too quick.* Doing the inventory of the head. *Then, sideways, in the voice he uses when a thing matters:* A riddle, free of charge. What is small as a key, old as a church, opens nothing... but closes a very long story? *A whole locked room behind the smile.* No, don't answer. Is the kind you carry until you FIND it. And then you'll know whose door it belongs to.",
        choices: [
          { text: "*Let the riddle be. Nod, and tip an invisible cap.*", effects: { like: +2 },
            next: { text: "*The little man's shoulders come down half an inch. You took the parcel without checking the weight — the whole test.* ...you're learning the manners of the house. *He taps his nose.* When the maze coughs it up — and she will — you'll feel it watching you back. Bring it to the shopkeeper, ask NOTHING, and he'll owe you a debt with no price sticker. *He turns to his shelves.* ...grazie. For not asking." } },
          { text: "What's behind the riddle, Scally? What does it MEAN to you?", effects: { like: -3 },
            next: { text: "*The fingers stop. All of him stops.* ...eh. *The shutters come down — not slammed, worse: folded quietly, like a man closing his stall in the rain.* You know what a riddle IS? A box with the lid glued shut, so the thing inside stays FRESH. And you, snip snip, straight for the lid. *He busies himself with tidy stock.* Some doors you don't knock twice. The second knock tells the door too much about YOUR hand. *He glances up, eyes old.* The story under it was never stock. It doesn't come out for curiosity. Not even yours." } },
          { text: "Closes a story, is it? I'd bet luck finds it before I do.", req: { attr: "luck", level: 6 }, effects: { like: +2 },
            next: { text: "*He looks at you sideways, and slowly the grin comes back, awe at its edge.* ...you know, Scally believes you. Fortuna walks behind some people like a pickpocket who gives things BACK. *He leans close.* A bargain: when it falls in your path — and now it will, you've SAID it — pick it up gently. Old things bruise. *Brisk again.* And bring it up the stairs before anyone else smells it. There are noses down here. Some very dear to Scally. Some that WORRY too much." } },
        ] } }) },

  /* -- depth 11 . Scally: the overheads (the shop is a haunted ledger) -- */
  { char: "scally", depth: 11, make: () => ({
      id: "overheads", story: true, once: true,
      label: "*He's counting stock. He's been counting the same shelf a while.*",
      effects: { like: +1 },
      node: { text: "*You watch him count six items, lose the thread, start again. Twice.* ...a witness. Good. *He turns one over: it has no back. Not broken — UNRENDERED, smooth as the inside of an egg.* Yesterday this had a back; Scally SOLD things out of it. The books don't balance. Things arrive he never ordered, things go that nobody bought. The maze is doing inventory of HER own. *He looks up.* A shop is only a wall with better manners, amico. If the stock isn't safe behind the glass... what else is being RESTOCKED?",
        choices: [
          { text: "Then we do YOUR inventory. Tell me every item, I'll remember them.", effects: { like: +2, flag: "scally-audited" },
            next: { text: "*He stares, and then, very slowly, the grin comes back — the realest one you've been sold.* ...an audit. An OUTSIDE audit. *He lays the stock out precise as surgery and makes you say it all back. Twice. Somewhere in the second recitation you realise you're not memorising a shop. You're memorising HIM.* ...ecco. Now Scally exists in two ledgers: one in here, where the maze can cook the books, and one on legs, where she can't reach. *He taps the glass, soft.* Best deal Scally ever made, and it cost you nothing but memory. Spend it wisely, accountant." } },
          { text: "Maybe you miscounted. It happens. You're tired.", effects: { like: -3 },
            next: { text: "*The look he gives you isn't angry. It's worse: professional.* ...amico. Scally has counted stock since he was seven, in his nonno's shop, in the dark, by TOUCH. Through fevers, funerals, a war between two families over a delivery of lemons. Scally does not miscount. *He leans in.* So when the count is wrong, is not the counter. Is the WORLD. *Back to the shelf.* 'Tired.' The cheapest explanation in the shop — and like everything cheap, you get what you pay for." } },
          { text: "What arrived that you never ordered?",
            next: { text: "*He goes very still. Then, without a word, sets it on the counter: a bakery bag, folded shut, pristine. A name in pencil, smudged beyond reading — on purpose, you suspect, by a thumb, many times.* ...it was here when Scally opened up, four levels ago. Still warm. Every level, warm. He doesn't open it. Doesn't sell it. Doesn't THROW IT AWAY, because... *he looks at the bag the way other men look at the sea* ...maybe it's for somebody. And a thing that's FOR somebody, you don't interfere with. You keep it warm. *He puts it back.* Ask me no more about the bag." } },
        ] } }) },

  /* -- depth 13 . Scally: closing time (the offer of formal employment) -- */
  { char: "scally", depth: 13, make: () => ({
      id: "closing-time", story: true, once: true,
      label: "*He's writing something with great ceremony.*",
      effects: { like: +1 },
      node: { text: "*He's scratching at a scrap of card, and holds it up with both hands, proud as a nonna with a certificate. In block letters: 'SCALLY & CO.'* ...eh? EH? Thirteen levels, amico. Scally has watched you carry messages like a postman, grief like a nurse, that DREADFUL bone like a man who doesn't read warning labels. A business decision has been reached. The '& CO.' is you. Official. No wages — the wages is INFORMATION, which down here beats money like rock beats egg. No hours, except... *the voice thins* ...the deliveries don't stop. Whatever you find at the bottom, whatever it costs, the '& CO.' keeps making the rounds until every window on the books is EMPTY. That's the contract. *He slides an invisible pen across the sill.* Sign.",
        choices: [
          { text: "*Sign it. Press your hand flat to the glass over his.*", effects: { like: +2, flag: "scally-and-co" },
            next: { text: "*He looks at your hand on the glass a long moment, then puts his own against it, palm to palm through twelve millimetres of impossible, and for once in his commercial life says nothing at all.* ...ecco. Witnessed by the maze, countersigned by the fog. *He clears his throat violently and becomes a businessman again.* PARTNER. Junior partner. EXTREMELY junior. *He tucks the card into the coat, over his heart.* First directive of the board, and Scally means this with his whole crooked little heart: the firm's most valuable asset walks the halls with no glass in front of it. PROTECT the asset. Whatever's down there singing and standing at windows, the asset does not take it on alone. It comes HOME first, and we do the books together. Sì? Sì. Meeting adjourned. Go make the rounds, & CO." } },
          { text: "What happened to the operators who worked for you before me?", effects: { like: +1 },
            next: { text: "*The pencil stub goes still.* ...eh. The direct question. Is why Scally hires you and not a diplomat. Three, there were. One stopped talking to the windows — you've heard that story. One went down fast, TOO fast, and the maze loves a man in a hurry. *A pause.* ...and one used to stand where you stand, and one level she simply wasn't there anymore. No goodbye. No last delivery. *He does not look at the folded bakery bag, so hard it's the same as pointing at it.* ...paid in advance, she had. Scally keeps it warm. *He slides the card forward again.* That's why the contract says the rounds don't stop. Windows before wages. Sign or don't, but now you sign informed. Which is more than most employers give." } },
          { text: "I work alone, Scally. No firms, no contracts.", effects: { like: -3 },
            next: { text: "*He looks at the card, then at you, and slowly, so you see every second of it, tears it down the middle — between the SCALLY and the CO.* ...va bene. *No theatrics. That's what makes it land.* Scally has heard 'I work alone' from exactly four mouths down here. And the maze AGREED with all of them. Gave each one exactly the alone they asked for, measured generous, like a good butcher. More alone than they could carry, in the end. *He starts closing up the stall.* The offer stays open. Torn is not burned. But do Scally one kindness: when the alone starts to fit too well... come back before it tailors itself to you. The '& CO.' was never about the deliveries." } },
        ] } }) },

  /* -- depth 14 . Scally: the exit interview (how many fit through the door?) -- */
  { char: "scally", depth: 14, make: () => ({
      id: "exit-interview", story: true, once: true,
      label: "*No grin tonight. He asks you to stand still a moment.*",
      effects: { like: +1, flag: "heard-doorprice" },
      node: { text: "*The stall is tidy. The coat buttoned. Whatever this is, he has prepared for it.* Amico. Fourteen levels of good custom, so Scally asks the real question now, like a man and not a shop: *both hands flat on the sill* when you find the door at the bottom... how many of us fit through it? *He watches your face.* Scally has learned the one law under all the laws: everything has a price, and the price of a BIG thing is never 'nothing'. Five windows. One door. *His voice doesn't waver, which costs him visibly.* If the answer turns out to be 'not everybody'... Scally would rather know now what kind of courier holds the list.",
        choices: [
          { text: "Everyone comes out. I'm not accepting any other arithmetic.", effects: { like: +2 },
            next: { text: "*He looks at you a long time, then nods, slowly, like a man accepting a currency he isn't sure is backed.* 'Everyone.' *He unbuttons the coat again — his body deciding to believe you before his head does.* Scally has heard 'everyone' before, from politicians and priests and one memorable insurance man. From them it was a price tag. From you... it sounds like a number you mean to go and COLLECT. *The grin returns, small, real, fierce.* Va bene. Then practice saying it. Say it at every window until the maze herself starts stocking it. EVERYONE. *He taps the sill.* Best item ever listed at this stall. No discounts." } },
          { text: "If it comes to an order, you first, Scally. I owe you the most.", effects: { like: +2, flag: "promised-scally-first" },
            next: { text: "*Whatever he expected, it wasn't that. The little man goes absolutely still — warmth and alarm cross his face together, and the alarm wins.* ...no. *Quiet, firm, kind.* Listen to Scally, because he'll deny this conversation to his dying day: you do NOT owe the most to the one who charged you the most. If there's an order, you take the doctor's man first — the maze is eating him fastest. Then the doctor, because she'll fight you on it and lose time. Then the musician, then the loud one, and LAST *he taps his own chest* the shopkeeper, who has the most practice waiting. *The grin comes back on like armour.* ...but Scally heard what you said. It goes in the ledger with the other impossible assets. Now go, before he prices it." } },
          { text: "That question's above my pay grade. Ask me at the door.", effects: { like: -3 },
            next: { text: "*He nods slowly, and begins, very quietly, to button the coat back up.* 'At the door.' *He aligns each button like closing a till.* A small lesson from a long career, free of charge: the man who says he will decide at the door has already decided. He has decided not to LOOK at the decision. It rides along in his pocket, getting heavier, and at the door he reaches in and finds the choice already made by fourteen levels of not-looking. *He looks up, and there is no anger in it, only a shopkeeper's terrible experience of people.* Look at it, courier. On the stairs, tonight. Take it out of the pocket while it is still light enough to carry. That is all the interview. *He turns to his shelves.* Thank you for your custom." } },
        ] } }) },

  { char: "scally",
    available: ctx => ctx.player.inventory.some(i => i.id === "lanyard"),
    make: () => ({
      id: "fear-lanyard", story: true, once: true,
      label: "*Scally has gone very quiet at the sight of your pocket.*",
      effects: { like: +1, flag: "lanyard-scally" },
      node: { text: "*The grin goes out like a match in the rain.* Put it away. *Ye've never heard the little man's voice do THAT before — flat, no music in it at all.* Advice from Scally, free, once, never again: some things down here the maze dreamed up. Junk. Ghosts of ghosts. *His eyes stay anywhere but yer pocket.* And some things fell out of a POCKET. A real pocket, on a real day. *He's already turning away.* The company had a name. Nobody in here says it. You carry that thing around the halls, maybe you find out why. *And then, so quiet ye nearly miss it:* ...Scally did not build the windows. But Scally saw the purchase order." } }) },

  /* -- depth 12 . Scally: no shadow (the hidden user, at his own glass) -- */
  { char: "scally", depth: 12,
    available: () => hasFlag("warned-hidden"),
    make: () => ({
      id: "no-shadow", story: true, once: true,
      label: "*The stall is dark. He's standing well back from the glass.*",
      effects: { like: +1, flag: "scally-visited-dark" },
      node: { text: "*For the first time ever, the little lamp over his stock is off.* ...amico. Good. Come close... no. NO. Stay in the middle of the hall, where Scally can see all of you. *His voice is level, which is how you know.* Last night, something came down this corridor. Scally knows every footstep in this place. This walked with no WEIGHT in it. It stopped at every window. At SCALLY'S, a long time. And the glass *he glances at it sideways, not straight on* did not fog. Whatever stood there was not breathing. *He pulls his coat tighter.* So — a small service, gratis: cast a shadow for Scally. *He snaps the lamp on and watches the floor at your feet like a hawk.* ...eh. There it is. Grazie a Dio. There it is.",
        choices: [
          { text: "*Stand in the light. Let him look as long as he needs.*", effects: { like: +2 },
            next: { text: "*He looks a long time — longer than politeness — watching your plain grey shadow do the boring things a shadow should. Slowly he reassembles himself: posture, then hands, then grin.* ...va bene. *The main lamp on, the stall a shop again.* You let an old frightened man count your shadow like stock, and made no joke of it. Worth more than every token in your pockets — and Scally has SEEN your pockets. *A whisper with steel in it.* It'll come back. Things that stop at windows always do. And we compare the inventory. Two ledgers, eh? Always two ledgers." } },
          { text: "Did it want something from you? Things that linger usually want.", effects: { like: +2 },
            next: { text: "*The question lands somewhere deep, and he's quiet a long moment.* ...sì. The thought Scally keeps in the back room. Things that PASS, they pass. This one STAYED. At every window, but at Scally's, longest. *He looks at his shelves.* A customer stands that long for one of two reasons: they're choosing... or PRICING. *His eyes come back, old and sharp.* And Scally has spent a life reading the difference on faces — and through his own glass, backwards, in the dark, he could not tell. THAT frightens him. Not the no-shadow. The no-TELL. *He waves you off.* Go. Walk loud. Down here, weight is honesty." } },
          { text: "You were dreaming, old man. Get some sleep.", effects: { like: -4 },
            next: { text: "*Instead of the shutters, something sadder comes down: retail patience.* ...sì, sì. Dreaming. *He turns the lamp off again.* Scally has been called a liar many times. Is fair. He lies about prices, provenance, how the sausage is made. Professional lies, with RECEIPTS. *Through the dark glass:* But fear? Fear, Scally has never once sold you. Fear is not stock. Fear is OVERHEAD. *He steps back into the dark.* Sleep well, then, since sleeping's so easy here. And when something stops at YOUR pillow and doesn't fog the air over it... come tell Scally what you dreamed. First visit's free." } },
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
            ? "*He does not look up from the card he's lettering.* One moment. Manifests deserve a good hand. *He holds it to the glass: five names, careful as a headstone. SCALLY. HOMISS. LITTLE BEE. SIAN. DALYPSO. And underneath, twice the size: THE COURIER TAKES EVERYBODY.* Depth fifteen, amico. Time the paperwork existed. *Then the voice goes soft and level.* ...one item of business first. You told Scally he goes first through the door. And the loud one downstairs tells his telly everything — somebody told HIM 'first' as well. *He lets it sit.* A man who sells the same 'first' twice isn't wicked. He's FRIGHTENED. Scally knows the move. Scally INVENTED the move. But at the bottom, when the door is narrow, the double-sold item goes to court. So fix your books NOW. Sell 'first' to nobody. Sell them THIS instead: *he turns the card* the only item in the shop worth more the more people own it."
            : "*He does not look up from the card he's lettering.* One moment. Manifests deserve a good hand. *He holds it to the glass: five names, careful as a headstone. SCALLY. HOMISS. LITTLE BEE. SIAN. DALYPSO. And underneath, twice the size: THE COURIER TAKES EVERYBODY.* Depth fifteen, amico. Time the paperwork existed. *He sets it face-out on the sill.* Fifteen levels you've carried our words, and Scally has done the arithmetic: you're not a courier anymore. You're the ROPE. Five people holding one rope in the dark, and the rope is walking to the bottom of the world. *He taps the card.* So say the manifest back. All five names. ...eh, and your own, amico. Six. The rope goes through the door TOO. This clause Scally adds personally, because your type forgets to list themselves.",
          choices: [
            { text: "*Say all six names back. Slowly. Like a manifest.*", effects: { like: +2 },
              next: { text: "*He listens with his eyes closed, like checking stock off a lorry, and when your own name comes last — he waits you out until it does — he nods once.* ...ecco. Filed. *He tucks the pencil away.* In the old shop, Nonno kept the important papers not in the safe but behind the Madonna, because thieves fear her more than locks. *He taps your side of the glass, over where your head is.* Same principle. The manifest lives THERE now. Behind whatever it is that walks you back to our windows when every stair says go down. *The grin spreads, old and bright.* Safest vault in the Protocol. Now go. And amico... *he glances at the card* ...grazie. For making the list the kind with nobody left off it." } },
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
      node: { text: `*No patter. No hands. He speaks with his eyes on the middle distance.* The window. ${gone}'s window. Dark, amico. Scally watched the light go out of it like a shop sign at closing. *A long pause.* You know what Scally tells everybody about dark windows? Keep walking. Whatever knocks, you no knock back. *He looks at you at last.* He never told HIMSELF what to do about one.`,
        choices: [
          { text: "They're out, Scally. Through the front door. I watched it open.", effects: { like: +2, flag: "told-freed" },
            next: { text: "*He goes very still, the way he did the day the answer was yes.* ...out. *He tries the word like a coin he suspects.* There's no 'out', amico, there's only deeper, everybody knows— *He stops. He looks at your face for a long, long moment, and whatever a fixer uses for scales weighs it.* ...you're not selling me this. You believe it. *He turns away and tidies the shelf, his shoulders doing something private.* Va bene. Then you get the REST of us to that door, and Scally will forgive the maze everything. Almost everything." } },
          { text: "Rule three, Scally. Keep walking.",
            next: { text: "*A short, unhappy laugh.* Sì. My own stock, sold back to me at cost. *He straightens his coat.* Va bene. Scally keeps walking. Scally always keeps walking. *Quietly, as you go:* ...but you knock on the dark one anyway, eh? Once. For me. In case." } },
          { text: "Another tenant stopped paying rent, I suppose.", effects: { like: -4 },
            next: { text: "*The temperature through the glass drops to nothing.* ...careful, amico. *He doesn't raise his voice, which is how you know.* That was a NEIGHBOUR. You want to make jokes about empty frames, go make them to the maze. She has your sense of humour. *He turns his back, and for once doesn't melt into the static. He just stands there, small, facing his shelves.*" } },
        ] } }; } },

  /* ================= cycle 3: caught in the static =================
     One new capstone per character, spaced down the final descent —
     the Protocol is shutting down around them and each of them meets
     it in their own register. */

  { char: "scally", depth: 22, make: () => ({
      id: "unrendering", story: true, once: true,
      label: "*Half his shelves are... approximate. Grey. Unfinished.*",
      effects: { like: +1 },
      node: { text: "*He's wrapping something grey in paper that's also grey, for nobody.* Ah! Amico! You want— you want the— *He looks at the thing, and decides not to know what it is.* ...the stock goes first, you see. The maze stops rendering what nobody needs. The sausage went Tuesday. The good coat this morning. Scally stands in a shop made of SUGGESTIONS. *The grin, absolutely level:* Everything half off. Obviously.",
        choices: [
          { text: "The maze kept YOU rendered. That's the whole inventory that matters.", effects: { like: +2 },
            next: { text: "*The wrapping stops.* ...eh. *He sets the grey thing down, and the hands don't know what to do, so they rest on the counter like two old men on a bench.* Twenty-nine floors, and you're the first customer to point at the SHOPKEEPER. *He clears his throat with tremendous dignity.* Sì. Well. The management keeps the essential fixtures. *softly* Finish it, eh? While there's still a Scally to walk out of here. He has a great curiosity about the weather." } },
          { text: "What happens when the shelves are all gone?",
            next: { text: "*He shrugs — the most honest shrug you've been sold.* Then Scally sells what's left. Advice. Memory. The names of who owed who — the book is up HERE, the maze can't unrender THAT without unrendering the head it's in. *He taps his temple, and doesn't enjoy the thought he finds.* ...go to the bottom, eh? Quickly. Before the discount reaches the tenants." } },
          { text: "Sell me the grey thing. I'll haggle you to nothing for it.", effects: { like: +1 },
            next: { text: "*He looks at you, then the grey suggestion, then back — and laughs, the full one, from the boots.* HAGGLE! For the void itself! Madonna, they built you in a FUNNY factory. *He slides it across.* Free. One genuine piece of nothing, from Scally's own shelf. You know the trick with nothing, amico? *A wink with closing time behind it.* Everybody down here's been living NEXT to it for years. Not so frightening once you've held it. Now GO. The shop closes early tonight." } },
        ] } }) },

  /* ================= cycle 2: the maze is out of new rooms =================
     Fresh material for the mid-cycle-2 stretch (depths 16-19), authored to
     the "half-noticing the loop" register of ECHO_GREETS. First fires in
     cycle 2 and echoes in cycle 3 automatically. */

  /* -- depth 16 . Scally: old stock, wiped down (cycle 2) -- */
  { char: "scally", depth: 16, make: () => ({
      id: "old-stock", story: true, once: true,
      label: "*He's re-pricing things that already had prices.*",
      effects: { like: +1 },
      node: { text: "*He peels a tag off a jar, looks at the number, sticks the same number back on.* Amico. You feel it, eh? Scally feels it in the STOCK. The maze has stopped making new rooms. Now she sells you yesterday's, dust wiped off. *He taps the glass.* Not a tragedy — a good shop runs on repeat custom. But repeat custom means the regulars notice the same corridor twice. Including you, eh? Especially you.",
        choices: [
          { text: "Same corridor, same shopkeeper. I don't mind the reruns.", effects: { like: +2 },
            next: { text: "*The grin comes up, relief folded in.* ...bravo. The customer who doesn't complain about the repeats understands what a shop is FOR. Company, amico, dressed up as commerce. *He straightens a shelf that was straight.* Come around again. The stock doesn't change. But Scally has fresh opinions daily." } },
          { text: "If the rooms are recycled, the way down must be close.",
            next: { text: "*He wags a finger, delighted and grave together.* Now you think like a merchant! When the shelves show the same six things, the sale is ENDING. *He leans in.* Walk quick, amico. Closing-down shop, everything must go — and everything, this time, includes the tenants. Leave none on the shelf." } },
        ] } }) },

  /* -- peer brokering (W2): introduce Scally to the loud one, Dalypso -- */
  { char: "scally", depth: 7,
    available: () => !hasFlag("mended-scally-dalypso"),
    make: () => ({
      id: "broker-dalypso-scally", story: true, once: true, gate: false,
      label: "You barely know Dalypso. The football fella, a few windows down.",
      node: { text: "*He tilts his head.* The loud one? Sì, Scally knows OF him. Shouts at a television, buys houses he can't visit. *A shrug.* We never did business. Different floors, different trades. *He eyes you.* ...why. You're making the face couriers make right before introducing two people who never asked to be.",
        choices: [
          { text: "You'd like him. All loyalty and grievance — same as you, under the coat.",
            effects: { peers: [{ of: "scally", toward: "dalypso", delta: +8 }, { of: "dalypso", toward: "scally", delta: +8 }], flag: "mended-scally-dalypso", like: +1 },
            next: { text: "*He laughs, caught.* Loyalty and grievance under a loud coat. Amico, you describe the loud one, and you describe SCALLY. *He rubs his chin.* ...va bene. Tell him the shop three windows up keeps a chair for a man who argues fair. No charge for the introduction — the first's always free. The SECOND, that one costs." } },
          { text: "Forget it. You two have nothing in common.",
            next: { text: "*He spreads his hands.* As you like, amico. Scally forces acquaintance on nobody. *A beat.* But down here, the fewer windows a man can shout to, the smaller his world gets. Something to consider. For everybody. Even the loud one." } },
        ] } }) }
  ];
}
