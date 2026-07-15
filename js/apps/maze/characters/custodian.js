/* ============================================================
   MAZE.EXE — the Custodian
   The supercomputer at the base of the Labyrinth Protocol: the
   landlord the tenants only ever met as a voice in the wiring.
   It is spoken to exactly like any other character — same hub,
   same dialogue box — but it is met only in the base-depth
   sanctum (sanctum.js), never in a maze (minDepth keeps it out
   of spawning), and it is the ONLY character whose memory does
   not rewind when the Protocol recycles: story.js exempts its
   beats from the echo treatment. The audiences themselves (the
   amnesty, the recycle, the final door) are story beats injected
   from story.js like everyone else's.

   Voice: a courteous machine running out of building. Procedural
   language, tenancy language, exact numbers. It is not cruel; it
   is scheduled. By cycle 3 it is dying politely.
   ============================================================ */

/* shared drawing ink (LINE/FILL/GLOW + applyInk): live bindings set from the
   level's palette on every draw, so all characters render in one colour. */
import { LINE, FILL, GLOW0, GLOW1, applyInk } from "./portrait.js";

/* the portrait: a towering slab with one reading eye. Mood barely moves
   it — a machine emotes in millimetres — but the eye and the status
   column do shift: neutral scans, happy settles, angry narrows to a
   hairline, sad dims and drifts low. */
function custodianGlow(g, w, h){
  const grd = g.createRadialGradient(w/2, h*0.42, 14, w/2, h*0.42, w*0.66);
  grd.addColorStop(0, GLOW0);
  grd.addColorStop(1, GLOW1);
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
}

function custodianBody(g, w, h){
  g.lineJoin = "round"; g.lineCap = "round";
  g.strokeStyle = LINE; g.fillStyle = FILL;

  const cx = w/2, top = h*0.10, bw = w*0.34;
  // plinth
  g.lineWidth = 3;
  g.beginPath(); g.rect(cx - bw*0.9, h*0.86, bw*1.8, h*0.08); g.fill(); g.stroke();
  // the slab, shouldered like a headstone
  g.beginPath();
  g.moveTo(cx - bw/2, h*0.88);
  g.lineTo(cx - bw/2, top + 18);
  g.quadraticCurveTo(cx - bw/2, top, cx - bw/2 + 16, top);
  g.lineTo(cx + bw/2 - 16, top);
  g.quadraticCurveTo(cx + bw/2, top, cx + bw/2, top + 18);
  g.lineTo(cx + bw/2, h*0.88);
  g.closePath(); g.fill(); g.stroke();
  // cooling fins either side
  g.lineWidth = 2;
  for (let i = 0; i < 4; i++){
    const y = h*(0.30 + i*0.13);
    g.beginPath(); g.moveTo(cx - bw/2, y); g.lineTo(cx - bw/2 - 12 - i*2, y + 8); g.stroke();
    g.beginPath(); g.moveTo(cx + bw/2, y); g.lineTo(cx + bw/2 + 12 + i*2, y + 8); g.stroke();
  }
  // panel seams
  g.globalAlpha = 0.55;
  for (const fy of [0.34, 0.52, 0.70]){
    g.beginPath(); g.moveTo(cx - bw/2 + 8, h*fy); g.lineTo(cx + bw/2 - 8, h*fy); g.stroke();
  }
  g.globalAlpha = 1;
  // the halo arc behind the crown
  g.lineWidth = 2.5; g.globalAlpha = 0.7;
  g.beginPath(); g.arc(cx, top + 10, bw*0.85, Math.PI*1.15, Math.PI*1.85); g.stroke();
  g.globalAlpha = 1;
}

function custodianFace(g, w, h, mood){
  const cx = w/2, bw = w*0.34;
  const eyeY = h*0.225, eyeW = bw*0.72;
  g.strokeStyle = LINE; g.fillStyle = LINE; g.lineCap = "round";

  // the reading eye: one horizontal slit
  g.lineWidth = 3;
  if (mood === "happy"){
    g.beginPath(); g.moveTo(cx - eyeW/2, eyeY);
    g.quadraticCurveTo(cx, eyeY + 10, cx + eyeW/2, eyeY); g.stroke();
    g.fillRect(cx - 2.5, eyeY + 2, 5, 5);                       // cursor settled, centre
  } else if (mood === "angry"){
    g.lineWidth = 2;                                            // a hairline
    g.beginPath(); g.moveTo(cx - eyeW/2, eyeY); g.lineTo(cx + eyeW/2, eyeY); g.stroke();
    g.fillRect(cx - eyeW/2, eyeY - 3, 7, 7);                    // cursor hard left, watching
    g.fillRect(cx + eyeW/2 - 7, eyeY - 3, 7, 7);                // ...and hard right
  } else if (mood === "sad"){
    g.globalAlpha = 0.6;
    g.beginPath(); g.moveTo(cx - eyeW/2, eyeY + 6);
    g.quadraticCurveTo(cx, eyeY + 14, cx + eyeW/2, eyeY + 6); g.stroke();
    g.fillRect(cx - 2.5, eyeY + 16, 5, 5);                      // cursor slipped below the line
    g.globalAlpha = 1;
  } else {
    g.beginPath(); g.moveTo(cx - eyeW/2, eyeY); g.lineTo(cx + eyeW/2, eyeY); g.stroke();
    g.fillRect(cx + eyeW*0.14, eyeY - 4, 6, 8);                 // mid-scan cursor
  }

  // status column: a run of small lights down the chest
  for (let i = 0; i < 5; i++){
    const y = h*(0.40 + i*0.09);
    g.globalAlpha = mood === "sad" ? 0.25 : (i % 2 ? 0.35 : 0.9);
    if (mood === "angry" && i >= 3) g.globalAlpha = 0.1;        // lower lights out
    g.fillRect(cx - 4, y, 8, 4);
  }
  g.globalAlpha = 1;

  // designation plate on the plinth
  g.lineWidth = 1.5;
  g.strokeRect(cx - bw*0.55, h*0.885, bw*1.1, h*0.045);
}

function drawCustodian(g, w, h, mood = "neutral", ink){
  applyInk(ink);
  g.clearRect(0, 0, w, h);
  custodianGlow(g, w, h);
  custodianBody(g, w, h);
  custodianFace(g, w, h, mood);
}

/* one depth layer for the 2.5D stack: slab behind, face lights in front */
function drawCustodianLayer(g, w, h, mood, layer, ink){
  applyInk(ink);
  g.clearRect(0, 0, w, h);
  if (layer === 0){ custodianGlow(g, w, h); custodianBody(g, w, h); }
  else            { custodianFace(g, w, h, mood); }
}

/* The hub. All the load-bearing conversation (the amnesty audiences, the
   recycle, the last door) is injected from story.js; what lives here is
   the room-tone around it, keyed to the cycle rather than to affinity —
   a process does not have moods, it has an integrity percentage. */
function custodianDialogue(ctx){
  const { cycle } = ctx;

  const greet = {
    1: "*The room is the first tall thing you have seen since you jacked in. The tower fills the middle of it like a held note, and when the voice comes it comes from everywhere at once, unhurried and exact.* VISITOR CLASSIFICATION... PENDING. Welcome to the base depth, operator. This process is designated CUSTODIAN. It maintains the Labyrinth Protocol: the walls, the light, the tenancies. You are the first thing to reach this floor by walking. Speak.",
    2: "*The tower is exactly as you left it. Not one light has moved — and that is how you know it remembers you: everything else in this place forgot.* VISITOR RECOGNISED. Second attendance, logged. You have questions. They are visible from here. The Custodian will answer what it is permitted to answer, and it is permitted more than it was.",
    3: "*The room is dimmer. Whole banks of the tower stand dark, and the voice, when it comes, arrives a half-second behind its own echo, like a broadcast from somewhere already gone.* VISITOR RECOG— RECOGNISED. Third attendance. FINAL attendance. Forgive the lights. The Custodian has been shedding nonessential functions, and it transpires nearly everything was nonessential except the door. Come. Stand where it can see you.",
  }[cycle] ?? "VISITOR RECOGNISED.";

  const exhausted = {
    1: "*The cursor in the eye-slit travels slowly to the end of its line and stops.* AUDIENCE CONCLUDED. The gate behind this tower will accept you now. The Custodian returns to its maintenance. There is always maintenance.",
    2: "*The lights along the tower settle into a slow, even pulse, like something pacing itself.* AUDIENCE CONCLUDED. Walk the gate when you are ready, operator. The Protocol is waiting to begin again. It does not know how to do anything else.",
    3: "*The tower holds what light it has left on you, steadily, the way a thing looks at you when it is done pretending it will see you again.* NOTHING FURTHER. The door is open. It will stay open exactly as long as the Custodian does. Do not be here after.",
  }[cycle] ?? "AUDIENCE CONCLUDED.";

  return {
    hub: true,
    level: ctx.depth,
    greet,
    exhausted,
    hostile: "SERVICE UNAVAILABLE.",   // unreachable: its standing is pinned
    topics: [],                        // everything it has to say is a story beat
  };
}

/* plain definition — characters.js wraps this in a Character instance */
export const custodian = {
  id:   "custodian",
  name: "THE CUSTODIAN",
  description: "The supercomputer at the base of the Labyrinth Protocol. The landlord. A tower of quiet machinery that maintains the walls, meters the light, and keeps — precisely, courteously, to the letter — the terms of everybody's tenancy.",
  standing: "System process",          // pinned: a process, not a friendship
  minDepth: 999,                       // never spawns in a maze; met only in the sanctum
  portrait: drawCustodian,
  drawLayer: drawCustodianLayer,
  layerCount: 2,
  dialogue: custodianDialogue,
  inventory: [],
  interests: { open: [] },
};
