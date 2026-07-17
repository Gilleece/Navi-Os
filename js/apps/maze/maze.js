/* ============================================================
   MAZE.EXE - screensaver labyrinth (desktop / touch / WebXR)
   Main entry + orchestrator. Loads three.js, owns the engine
   state, builds the world up from its parts and runs the
   lifecycle and render loop.

   Parts:
     generator.js   : maze grid algorithm (no three.js)
     textures.js    : procedural wall / floor textures
     environment.js : fog, lights, floor, ceiling, walls, vista windows
     vista.js       : the world outside the walls (skyline, sun, the eye)
     props.js       : set dressing + atmosphere (corner junk, dead-end
                      centrepieces, light wells, data motes) and the
                      VR grab/throw toy physics
     entities.js    : goal gate + floating relics
     player.js      : movement, collision, camera, input
     characters/    : Character class, roster, spawning, idle anim
                      (characters.js engine + one file per character)
     dialogue.js    : portrait dialogue box + interaction prompt
     story.js       : story flags, level beats, relay quests, world
                      items, loop/replay dialogue, graffiti pool,
                      the narrative gate (pendingBeats)
     state.js       : player RPG state (attributes, inventory, flags)
     menu.js        : persistence — save/load slot + export/import
     creation.js    : new-game operator registration (name + point-buy)
     minimap.js     : fog-of-war corner map (desktop/touch only)
   ============================================================ */
import { $ } from "../../utils.js";
import { buildEnvironment, wallKey, chaosFor } from "./environment.js";
import { buildVista } from "./vista.js";
import { buildProps, updateProps } from "./props.js";
import { buildEntities, updateTokens } from "./entities.js";
import { themeFor, animate, liveScene } from "./palette.js";
import { genMaze, cellCenter, findGoalCell, braidMaze } from "./generator.js";
import { bindInput, updatePlayer } from "./player.js";
import { spawnCharacters, buildCharacters, recoverAffinity, updateCharacters, ROSTER } from "./characters/characters.js";
import { initDialogue, initPanel, openDialogue, updateInteractions, updateDialogueXR, closeDialogue, onStoryEvent } from "./dialogue.js";
import { applyLevelEvents, pendingBeats } from "./story.js";
import { player, story, depthInCycle, cycleOf, isBaseDepth, FINAL_DEPTH } from "./state.js";
import { buildSanctum } from "./sanctum.js";
import { saveGame, loadGame, resetGame, markCompleted, saveInfo, exportSave, importSave } from "./menu.js";
import { showCreation, hideCreation } from "./creation.js";
import { buildMinimap, updateMinimap, clearMinimap, initWristMap } from "./minimap.js";
import { buildJournal, initJournalXR, updateJournalXR } from "./journal.js";
import { initDebugUI, initDebugPanel, updateDebugXR } from "./debug.js";
import { buildHands, updateHands } from "./hands.js";
import { initVRBanner, showVRBanner, updateVRBanner, initVRPrompt } from "./vrbanner.js";
import { initAudio, playGateUnlock, toggleMute, isMuted, updateListener } from "./audio.js";
import { buildPause, openPause } from "./pause.js";
import { toast, objectiveLine, setObjective } from "./hud.js";
import { createPostFX } from "./postfx.js";

const layer = $("#maze-layer");
let three = null;

/* structural decay: the fraction of a floor's remaining interior walls that
   the deepest, most-ruined level (global depth 30) knocks out. Scaled down
   toward 0 for shallower depths by chaosFor. ~0.4 leaves the bottom clearly
   braided but still a maze, not an open room. Tune here. */
const BRAID_MAX = 0.4;

/* three.js r128, self-hosted first with the CDN as a fallback. The vendored
   copy means the game works offline / when the CDN is unreachable; the CDN
   catches the case where the vendor file is missing from a deploy. Each URL
   is tried in order; only when all fail does launchMaze show LOAD FAILED. */
const THREE_SOURCES = [
  "js/vendor/three.r128.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js",
];
function loadThree(){
  if (three) return Promise.resolve();
  return new Promise((res, rej) => {
    let i = 0;
    const tryNext = () => {
      if (i >= THREE_SOURCES.length){ rej(new Error("three.js failed to load")); return; }
      const s = document.createElement("script");
      s.src = THREE_SOURCES[i++];
      s.onload = () => {
        if (window.THREE){ three = window.THREE; res(); }
        else { s.remove(); tryNext(); }        // loaded but no global — try the next source
      };
      s.onerror = () => { s.remove(); tryNext(); };
      document.head.appendChild(s);
    };
    tryNext();
  });
}

/* --- engine state (rendering); the RPG game state lives in state.js --- */
const M = {
  N: 7, CELL: 4, WALL_H: 3.4, WALL_T: 0.5, R: 0.45,
  renderer:null, scene:null, camera:null, dolly:null,
  walls:[], goal:null, goalLight:null, goalBeam:null, spinners:[], depth:1, lamp:null, cyberMat:null,
  tokens:[], bursts:[], theme:null, ambient:null, paneMat:null, trimMat:null,
  props:[], propFx:null, grabs:null,
  vista:null,                               // the world outside the walls (vista.js; null in the sanctum)
  npcs:[], nearCharacter:null, dialogueOpen:false, journalOpen:false, talk:false,
  // narrative gate: who still has unheard story beats (locks the exit ring),
  // the ring's rise animation state, and the recheck / message throttles
  gatePending:[], gateRise:1, gateTumble:{x:0,y:0}, gateT:0, gateMsgAt:0,
  inSanctum:false,   // in the base-depth chamber (built instead of a maze at depths 10/20/30)
  runActive:false,
  controllers:null, grips:null, hands:null, prevTrigger:false,
  keys:{}, joy:{x:0,y:0}, look:{drag:false,lx:0,ly:0}, yaw:0, pitch:0,
  pauseOpen:false, pointerLocked:false, sens:1,   // pause menu + pointer-lock look (player.js/pause.js)
  snapReady:true, inVR:false, clock:null,
  vel:{x:0,z:0}, bobPhase:0, stepDist:0,   // movement juice (player.js)
  gateFlash:0,                              // emissive pulse when the ring unlocks
  fadeDiv:null, fadeQuad:null, fadeVal:0, fadeTarget:0,   // level-transition fade
  postfx:null, fxMode:"bloom",              // non-VR bloom/CRT composer (pause.js sets fxMode; "off" bypasses)
};

/* free the GPU resources of a scene subtree (geometries, materials and
   their canvas textures). Level rebuilds recreate everything, so without
   this every descent leaks the previous maze into GPU memory. */
function disposeSubtree(root){
  root.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) for (const m of [].concat(o.material)){
      if (m.map) m.map.dispose();
      m.dispose();
    }
  });
}

/* clear previous level (the dolly survives rebuilds — its subtree, panel,
   banner, hands and lamp included, must NOT be disposed) */
function clearScene(){
  M.walls.length = 0;
  M.spinners.length = 0;
  while (M.scene.children.length){
    const child = M.scene.children[0];
    M.scene.remove(child);
    if (child !== M.dolly) disposeSubtree(child);
  }
}

/* the depth string the player sees: within-cycle, so it rewinds to 01
   when the Protocol recycles — the counter itself is part of the story */
const shownDepth = () => String(depthInCycle(M.depth)).padStart(2, "0");

function buildMaze(){
  clearScene();
  M.inSanctum = false;

  story.depth = M.depth;                   // the trust cap (characters.js) scales with depth
  recoverAffinity();                       // enraged characters thaw a little each level
  applyLevelEvents(M.depth, ROSTER);       // one-time story mutations (e.g. Scally stocks the mayo)
  M.theme = themeFor(M.depth);             // walls / fog / lights recolour as you descend

  const cells = genMaze(M.N);
  const goalCell = findGoalCell(cells);   // furthest dead-end from start (pick before braiding)

  // structural decay: the deeper (globally) we are, the more the Protocol's
  // walls have broken down — knock interior walls out to open loops and ruin
  // dead-ends, on the same chaosFor ramp that ages the textures and graffiti.
  // Depth 01 is pristine; by cycle 3 the "same" floor is visibly holed. The
  // goal alcove is protected so the gate keeps its dead-end.
  braidMaze(cells, chaosFor(M.depth) * BRAID_MAX, goalCell);

  // decide where characters appear, then turn their host walls into windows.
  // A freed tenant's window still appears — dark: no light behind the glass.
  const spawns = spawnCharacters(cells, goalCell, M.depth, M);
  const windows = new Set(spawns.map(s => wallKey(s.wall.x, s.wall.z, s.wall.alongX)));
  const darkWindows = new Set(spawns.filter(s => s.empty).map(s => wallKey(s.wall.x, s.wall.z, s.wall.alongX)));
  const owners = new Map(spawns.map(s => [wallKey(s.wall.x, s.wall.z, s.wall.alongX), s.character.id]));

  const { walls, cyberMat, paneMat, trimMat, ambient } = buildEnvironment(three, M.scene, M, cells, goalCell, windows, darkWindows, owners);
  M.walls.push(...walls);
  M.cyberMat = cyberMat;
  M.paneMat = paneMat;
  M.trimMat = trimMat;
  M.ambient = ambient;

  // the world outside the walls, seen through the perimeter vista windows
  M.vista = buildVista(three, M.scene, M);

  // set dressing + atmosphere (also frees anything still held in VR and
  // pushes the dead-end centrepiece colliders into M.walls)
  const { props, fx } = buildProps(three, M.scene, M, cells, goalCell, spawns);
  M.props = props;
  M.propFx = fx;

  // player lamp, rides along with the dolly and persists across rebuilds
  if (!M.lamp){
    M.lamp = new three.PointLight(M.theme.neon, 1.5, 18);
    M.lamp.position.set(0, 2.2, 0);
    M.dolly.add(M.lamp);
  }
  M.lamp.color.setHex(M.theme.neon);       // tint the lamp to this level's palette
  M.lamp.intensity = 1.5;                   // reset (animated bands drive this per-frame)
  M.scene.add(M.dolly);

  const { goal, goalLight, beam, spinners, tokens } = buildEntities(three, M.scene, M, goalCell);
  M.goal = goal;
  M.goalLight = goalLight;
  M.goalBeam = beam;               // wayfinding column, driven by updateGate
  M.spinners.push(...spinners);
  M.tokens = tokens;

  // characters behind their windows
  M.npcs = buildCharacters(three, M.scene, spawns, M.theme);
  M.nearCharacter = null;

  buildMinimap(M, cells, goalCell);        // fresh fog of war for the new level

  // narrative gate: if anyone here still has story beats to deliver, the
  // exit ring starts flat on the floor and waits (see gatePendingNames)
  M.gatePending = gatePendingNames();
  M.gateRise = M.gatePending.length ? 0 : 1;
  M.gateTumble = { x: 0, y: 0 };
  M.gateT = 0.5; M.gateMsgAt = 0;
  poseGate(0);

  // player start
  M.dolly.position.set(cellCenter(0, M.CELL), 0, cellCenter(0, M.CELL));
  M.vel.x = M.vel.z = 0;         // no inherited momentum into a fresh wall
  M.yaw = Math.PI; M.pitch = 0; // face into the maze
  $("#hud-top").innerHTML = `MAZE.EXE <b>// depth ${shownDepth()}</b>`;
  setObjective(objectiveLine(M));       // persistent objective line, from the same gate state

  if (M.runActive) saveGame(M.depth);   // autosave: one slot, every level entered
}

/* ---------- the sanctum (the base depth) ----------
   Built instead of a maze when the player descends from depth 10/20/30:
   one wide, tall room with the Custodian's tower in the middle (sanctum.js).
   Same engine slots, so the loop, gate, dialogue and palette animation all
   run unchanged; there are just no tokens, props or fog-of-war down here. */
function buildBase(){
  clearScene();
  M.inSanctum = true;

  story.depth = M.depth;
  recoverAffinity();
  M.theme = themeFor(M.depth);

  const s = buildSanctum(three, M.scene, M);
  M.walls.push(...s.walls);
  M.spinners.push(...s.spinners);
  M.ambient  = s.ambient;
  M.paneMat  = s.paneMat;
  M.trimMat  = s.trimMat;
  M.cyberMat = s.cyberMat;
  M.goal = s.goal; M.goalLight = s.goalLight;
  M.goalBeam = null;               // no beacon in the sanctum: one open room, the gate is visible
  M.npcs = s.npcs; M.nearCharacter = null;
  M.tokens = []; M.props = []; M.propFx = null;
  M.vista = s.eye;                 // no windows down here: the sanctum is sealed — the
                                   // only thing from outside is the Eye on the tower,
                                   // blinking on the same per-frame slot the vista uses

  if (!M.lamp){
    M.lamp = new three.PointLight(M.theme.neon, 1.5, 18);
    M.lamp.position.set(0, 2.2, 0);
    M.dolly.add(M.lamp);
  }
  M.lamp.color.setHex(M.theme.neon);
  M.lamp.intensity = 1.5;
  M.scene.add(M.dolly);

  clearMinimap();                        // no fog-of-war for one open room

  // the gate waits, flat, until the Custodian has been heard
  M.gatePending = gatePendingNames();
  M.gateRise = M.gatePending.length ? 0 : 1;
  M.gateTumble = { x: 0, y: 0 };
  M.gateT = 0.5; M.gateMsgAt = 0;
  poseGate(0);

  M.dolly.position.set(s.playerStart.x, 0, s.playerStart.z);
  M.vel.x = M.vel.z = 0;
  M.yaw = s.playerStart.yaw; M.pitch = 0;
  $("#hud-top").innerHTML = `MAZE.EXE <b>// the base depth</b>`;
  setObjective(objectiveLine(M));

  if (M.runActive) saveGame(M.depth);
}

/* ---------- descending ----------
   One place decides what the gate leads to: a base depth's gate opens on
   the sanctum; the sanctum's gate recycles the Protocol (back to the top,
   next cycle); everything else is one more level down. The FINAL sanctum
   has no way onward but the Custodian's door (the "ending" story event) —
   the guard here is only a safety net in case the ring ever rises there. */
function descend(){ transition(descendNow); }

function descendNow(){
  if (M.inSanctum){
    if (M.depth >= FINAL_DEPTH){ runEnding(); return; }
    M.depth++;
    buildMaze();
    hudMsg("THE PROTOCOL RECYCLES", 2000);
    if (M.inVR) showVRBanner(`THE PROTOCOL RECYCLES — DEPTH ${shownDepth()}`, 2400);
  } else if (isBaseDepth(M.depth)){
    buildBase();
    if (M.inVR) showVRBanner("THE BASE DEPTH", 2000);
  } else {
    M.depth++;
    buildMaze();
    if (M.inVR) showVRBanner(`ENTERED DEPTH ${shownDepth()}`);
  }
}

/* ---------- level-transition fade ----------
   A brief fade-to-black hides the level rebuild pop. Two surfaces cover
   the two composites: a DOM veil on flat screens (CSS-eased), and a black
   quad on the camera in VR (the DOM layer isn't composited there). fadeSet
   drives the target; the render loop eases the VR quad's opacity toward it. */
function initTransition(){
  let d = $("#maze-fade");
  if (!d){ d = document.createElement("div"); d.id = "maze-fade"; layer.appendChild(d); }
  M.fadeDiv = d;

  const q = new three.Mesh(
    new three.PlaneGeometry(2, 2),
    new three.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0,
                                  depthTest: false, depthWrite: false, fog: false }));
  q.position.z = -0.3; q.renderOrder = 10000; q.visible = false;
  M.camera.add(q);
  M.fadeQuad = q;
}

function fadeSet(v){
  M.fadeTarget = v;
  if (M.fadeDiv) M.fadeDiv.style.opacity = String(v);
}

/* fade out (~320ms), run `fn` at full black (the rebuild), then fade back in */
function transition(fn){
  if (!M.fadeDiv && !M.fadeQuad){ fn(); return; }   // no fade infra yet: just do it
  fadeSet(1);
  setTimeout(() => { fn(); fadeSet(0); }, 320);
}

/* debug-only: jump straight through the gate, skipping the walk */
function debugNextLevel(){
  if (M.dialogueOpen) return;
  descend();
}

/* reflect the mute state on the HUD icon (♪ audible / ♪̶ muted) */
function updateMuteIcon(){
  const btn = $("#btn-mute");
  if (!btn) return;
  const off = isMuted();
  btn.innerHTML = off ? "&#9834;̸" : "&#9834;";   // musical note, struck through when muted
  btn.classList.toggle("muted", off);
  btn.title = off ? "Unmute (M)" : "Mute (M)";
}

/* centre-screen HUD flash. The VR banner is fired separately at each call
   site here, so these stay DOM-only (vr defaults off in the shared toast). */
const hudMsg = (text, ms = 1600) => toast(text, { ms });

/* --- the narrative gate ---
   The exit ring lies flat on the floor while anyone on the level still has
   unheard story beats (story.js pendingBeats); walking into it then just
   tells you who to see. Once the level's story is heard, the ring rises
   into the old upright tumble and descending works as ever. */
function gatePendingNames(){
  const names = [];
  for (const npc of M.npcs || [])
    if (pendingBeats(npc.character, M.depth, player).length) names.push(npc.character.name);
  return names;
}

/* pose from the rise state: k=0 flat on the floor, k=1 upright, tumbling */
function poseGate(dt){
  const g = M.goal;
  if (!g) return;
  const k = M.gateRise * M.gateRise * (3 - 2 * M.gateRise);   // smoothstep
  M.gateTumble.x += dt * 0.7 * k;                             // tumble only once risen
  M.gateTumble.y += dt * 1.2 * k;
  g.position.y = 0.15 + (1.5 - 0.15) * k;
  g.rotation.set((1 - k) * Math.PI / 2 + M.gateTumble.x * k, M.gateTumble.y * k, 0);
  if (M.goalLight) M.goalLight.intensity = 0.35 + 1.05 * k;   // dim ember while closed
}

function updateGate(dt){
  M.gateT -= dt;
  if (M.gateT <= 0){                       // recheck the story every half second
    M.gateT = 0.5;
    const wasLocked = M.gatePending.length > 0;
    M.gatePending = gatePendingNames();
    setObjective(objectiveLine(M));      // reflect who (if anyone) still holds the ring
    if (wasLocked && !M.gatePending.length && M.goal){
      hudMsg("THE WAY DOWN OPENS", 1800);
      if (M.inVR) showVRBanner("THE WAY DOWN OPENS", 1800);
      playGateUnlock(M.goal.position);   // the grand sting, localised to the ring
      M.gateFlash = 1;                    // and a matching emissive pulse on the ring
    }
  }
  const target = M.gatePending.length ? 0 : 1;
  M.gateRise = Math.max(0, Math.min(1, M.gateRise + (target ? 1 : -1) * dt / 1.1));
  poseGate(dt);

  // the unlock pulse: a single swell on the ring's light + a gentle scale pop,
  // layered over the rise so the moment lands rather than just resolving
  if (M.gateFlash > 0){
    M.gateFlash = Math.max(0, M.gateFlash - dt / 1.5);
    const pulse = Math.sin(M.gateFlash * Math.PI);   // 0 -> 1 -> 0 over the flash
    if (M.goalLight) M.goalLight.intensity += pulse * 2.2;
    if (M.goal) M.goal.scale.setScalar(1 + pulse * 0.12);
  }

  // the beacon over the ring: nothing while the story holds the gate flat,
  // a slow-breathing column once it rises (boosted through the unlock flash),
  // and gone the moment the gate is used. The sanctum has no beam.
  if (M.goalBeam){
    if (!M.goal){
      M.goalBeam.visible = false;
    } else {
      const k = M.gateRise * M.gateRise * (3 - 2 * M.gateRise);   // same smoothstep as the pose
      const breathe = 1 + 0.3 * Math.sin(performance.now() * 0.0021);
      const op = 0.28 * k * breathe + Math.sin(Math.max(0, M.gateFlash) * Math.PI) * 0.25;
      M.goalBeam.material.opacity = op;
      M.goalBeam.visible = op > 0.01;
      M.goalBeam.rotation.y += dt * 0.4;             // a lazy turn keeps the column alive up close
    }
  }
}

/* --- main loop --- */
/* any controller trigger currently held (VR) */
function triggerHeld(){
  const session = M.renderer.xr.getSession && M.renderer.xr.getSession();
  if (!session) return false;
  for (const src of session.inputSources)
    if (src.gamepad && src.gamepad.buttons[0] && src.gamepad.buttons[0].pressed) return true;
  return false;
}

/* reused scratch for the spatial-audio listener update (built once three
   is loaded); avoids per-frame allocation in mazeLoop */
let audioScratch = null;

/* glue the Web Audio listener to the head each frame so world sounds pan +
   attenuate correctly. Uses the real XR camera pose in VR (turning your
   head then pans the maze), the flat camera otherwise. */
function updateAudioListener(){
  if (!three) return;
  if (!audioScratch) audioScratch = {
    p: new three.Vector3(), q: new three.Quaternion(),
    f: new three.Vector3(), u: new three.Vector3(),
  };
  const cam = (M.inVR && M.renderer.xr.getCamera) ? M.renderer.xr.getCamera(M.camera) : M.camera;
  if (!cam) return;
  cam.updateWorldMatrix && cam.updateWorldMatrix(true, false);
  cam.getWorldPosition(audioScratch.p);
  cam.getWorldQuaternion(audioScratch.q);
  audioScratch.f.set(0, 0, -1).applyQuaternion(audioScratch.q);
  audioScratch.u.set(0, 1, 0).applyQuaternion(audioScratch.q);
  updateListener(audioScratch.p, audioScratch.f, audioScratch.u);
}

function mazeLoop(){
  const dt = Math.min(M.clock.getDelta(), 0.1);

  updateAudioListener();          // keep positional SFX oriented to the head

  // ease the VR transition veil toward its target (the DOM veil is CSS-eased)
  if (M.fadeQuad){
    M.fadeVal += (M.fadeTarget - M.fadeVal) * (1 - Math.exp(-dt * 12));
    M.fadeQuad.material.opacity = M.fadeVal;
    M.fadeQuad.visible = M.fadeVal > 0.01;
  }

  // animated colour bands (shift / transition / flicker): recolour the
  // lamp, ambient, fog and unlit materials each frame. Runs even during
  // dialogue so the world keeps breathing. Static bands have no .anim.
  if (M.theme && M.theme.anim){
    const a  = animate(M.theme, performance.now() / 1000);
    const sc = liveScene(a.rgb, a.bright);
    M.lamp.color.setHex(sc.lamp);
    M.lamp.intensity = sc.intensity;
    M.ambient.color.setHex(sc.ambient);
    M.scene.fog.color.setHex(sc.fog);
    M.paneMat.color.setHex(sc.pane);
    if (M.trimMat)  M.trimMat.color.setHex(sc.pane);   // baseboards ride the same glow
    if (M.cyberMat) M.cyberMat.color.setHex(sc.cyber);
    if (M.propFx) for (const m of M.propFx.glow) m.color.setHex(sc.pane);  // screens/LEDs/motes too
  }

  if (M.dialogueOpen){            // freeze the world while a conversation is open
    if (M.inVR) updateDialogueXR(M, three, dt);
  } else if (M.journalOpen){      // frozen while reading the log; keep its VR panel live
    if (M.inVR) updateJournalXR(M, three, dt);
  } else if (M.pauseOpen){        // frozen behind the pause menu (desktop/touch DOM overlay)
    /* render only — no player/interaction updates */
  } else {
    updatePlayer(three, M, dt);
    updateInteractions(M);
    updateCharacters(M, dt);      // subtle breathing + loose gaze toward the player
    updateTokens(three, M.scene, M, dt);   // float/spin LT and collect any the player walks into
    updateGate(dt);               // narrative gate: recheck story beats, rise/lie the ring
    if (M.inVR){                  // trigger near a character starts the conversation
      const t = triggerHeld();
      if (t && !M.prevTrigger && M.nearCharacter) openDialogue(M, M.nearCharacter.character);
      M.prevTrigger = t;
      updateDebugXR(M, three);    // left-trigger debug panel + right-trigger click
      updateJournalXR(M, three, dt);   // poll the left X button to open the log
    }
  }

  updateProps(three, M, dt);      // motes + light wells always; grab/throw pauses during dialogue
  if (M.vista) M.vista.update(dt);   // the outside keeps moving even mid-conversation
  updateHands(M);                 // animate the VR hands + active-controller pointer (self-hides off-VR)
  updateVRBanner();               // hide the depth banner once its time is up
  updateMinimap(M);               // fog-of-war map: top-right on flat screens, left wrist in VR

  // spinners + goal check
  for (const sp of M.spinners){ sp.rotation.y += dt*1.2; sp.rotation.x += dt*0.7; }
  // flicker the dissolving goal walls
  if (M.cyberMat) M.cyberMat.opacity = 0.55 + 0.35 * Math.sin(performance.now() * 0.004);
  if (M.goal && !M.dialogueOpen){
    const d = M.dolly.position.distanceTo(new three.Vector3(M.goal.position.x, 0, M.goal.position.z));
    if (d < 1.3){
      if (M.gatePending.length){
        // the ring is still flat — the level's story hasn't been heard yet
        if (performance.now() > M.gateMsgAt){
          M.gateMsgAt = performance.now() + 3200;
          const who = `THE WAY DOWN IS NOT YET OPEN: SPEAK WITH ${M.gatePending.join(" & ")}`;
          hudMsg(who, 2800);
          if (M.inVR) showVRBanner(who, 2800);
        }
      } else {
        M.goal = null;
        const msg = M.inSanctum                ? "THE PROTOCOL RECYCLES"
                  : isBaseDepth(M.depth)       ? "GATE REACHED: THE FLOOR OPENS ONTO A TALL ROOM"
                  :                              "GATE REACHED: DESCENDING";
        hudMsg(msg, 1400);
        if (M.inVR) showVRBanner(msg, 1400);
        setTimeout(descend, 1400);
      }
    }
  }
  // non-VR: run the bloom/CRT composer (unless FX are OFF). VR keeps the direct
  // path — WebXR owns its framebuffers and does not compose with the pipeline.
  if (!M.inVR && M.postfx && M.fxMode !== "off"){
    try { M.postfx.render(M.fxMode); }
    catch (e){                       // a composer error must never freeze the loop
      console.error("[MAZE] post-processing render error; disabling FX for this run:", e);
      M.postfx = null;
      M.renderer.render(M.scene, M.camera);
    }
  } else {
    M.renderer.render(M.scene, M.camera);
  }
}

/* --- lifecycle --- */
const IS_TOUCH = ("ontouchstart" in window) || navigator.maxTouchPoints > 0;

/* mobile: play in landscape. Fullscreen first (orientation.lock needs it),
   then lock — both best-effort: iOS Safari allows neither, so the CSS
   portrait overlay (#maze-rotate) is the fallback there. Must be kicked
   off inside the launch click gesture. */
async function lockLandscape(){
  // fullscreen the document root — the maze layer isn't displayed yet at
  // click time, and the layer covers the viewport anyway
  const root = document.documentElement;
  try { if (!document.fullscreenElement && root.requestFullscreen) await root.requestFullscreen({ navigationUI: "hide" }); } catch {}
  try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock("landscape"); } catch {}
}
function unlockLandscape(){
  try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch {}
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

async function launchMaze(fromSave, btn){
  initAudio();                          // start the audio context on this click gesture
  if (IS_TOUCH) lockLandscape();        // fire-and-forget, inside the gesture
  const label = btn.textContent;
  btn.textContent = "[ LOADING... ]";
  try { await loadThree(); }
  catch(e){ btn.textContent = "[ LOAD FAILED: CHECK NET ]"; return; }
  btn.textContent = label;

  if (!M.renderer){
    const cv = $("#maze-canvas");
    M.renderer = new three.WebGLRenderer({canvas:cv, antialias:true});
    M.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    M.renderer.xr.enabled = true;
    M.scene  = new three.Scene();
    M.camera = new three.PerspectiveCamera(72, 1, 0.05, 80);
    M.camera.position.y = 1.6;
    M.camera.rotation.order = "YXZ";
    M.dolly  = new three.Group();
    M.dolly.add(M.camera);
    M.controllers = [M.renderer.xr.getController(0), M.renderer.xr.getController(1)];
    M.controllers.forEach(c => {
      M.dolly.add(c);
      // tag each controller space with its hand so the debug panel
      // (left to summon, right to point/click) can tell em apart
      c.addEventListener("connected", e => { c.userData.handedness = e.data.handedness; });
    });
    // grip spaces carry the hand models (the controllers above carry the pointer)
    M.grips = [M.renderer.xr.getControllerGrip(0), M.renderer.xr.getControllerGrip(1)];
    M.grips.forEach(g => M.dolly.add(g));
    M.clock  = new three.Clock();
    bindInput(M, layer);
    buildPause(M, { onExit: exitMaze });   // pause/settings overlay (ESC / ⏸)
    initDialogue(M);                 // build the dialogue box DOM once
    onStoryEvent(ev => { if (ev === "ending") runEnding(); });   // the Custodian's final door
    initPanel(three, M.dolly);       // build the in-world VR dialogue panel
    initDebugUI(debugNextLevel);     // desktop/touch debug button (no-op unless DEBUG)
    initDebugPanel(three, M.dolly);  // in-world VR debug panel (no-op unless DEBUG)
    buildHands(three, M);            // VR hands on the grips + pointer rays on the controllers
    initWristMap(three, M);          // minimap "watch" on the left wrist in VR
    buildJournal(M);                 // operator log overlay (Tab/J) + its VR panel
    initJournalXR(three, M.dolly);
    initTransition();                // level-transition fade (DOM veil + camera quad)
    try {                            // non-VR bloom/CRT (gated in the loop); never let it break the run
      M.postfx = createPostFX(three, M.renderer, M.scene, M.camera);
      console.info("[MAZE] post-processing ready — VISUAL FX:", M.fxMode);
    } catch (e){
      M.postfx = null;
      console.error("[MAZE] post-processing failed to initialise; falling back to bare render:", e);
    }
    initVRBanner(three, M);          // head-locked banner ("ENTERED DEPTH N", "+N LT")
    initVRPrompt();                  // world-anchored "PULL TRIGGER: SPEAK WITH X" prompt
    addEventListener("resize", sizeMaze);

    // WebXR availability
    if (navigator.xr && navigator.xr.isSessionSupported){
      navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (ok) $("#btn-vr").hidden = false; });
    }
    $("#btn-vr").addEventListener("click", async () => {
      try {
        const session = await navigator.xr.requestSession("immersive-vr",
          {optionalFeatures:["local-floor","bounded-floor"]});
        M.renderer.xr.setReferenceSpaceType("local-floor");
        await M.renderer.xr.setSession(session);
        M.inVR = true;
        M.camera.position.y = 0; M.camera.rotation.x = 0;
        session.addEventListener("end", () => {
          M.inVR = false; M.camera.position.y = 1.6;
        });
      } catch(e){ console.warn("XR session failed:", e); }
    });
    $("#btn-exit-maze").addEventListener("click", exitMaze);

    // pause: HUD ⏸ button (touch parity for the ESC menu; desktop can use it too)
    const btnPause = $("#btn-pause");
    if (btnPause) btnPause.addEventListener("click", () => openPause());

    // mute: HUD icon + the M key (works even mid-conversation)
    const btnMute = $("#btn-mute");
    if (btnMute) btnMute.addEventListener("click", () => { toggleMute(); updateMuteIcon(); });
    addEventListener("keydown", e => {
      if (!layer.classList.contains("on")) return;
      if (e.target && e.target.tagName === "INPUT") return;   // typing at creation
      if (e.key.toLowerCase() === "m"){ toggleMute(); updateMuteIcon(); }
    });
    updateMuteIcon();

    // autosave on tab-hide / close: the level-entry autosave only fires on
    // descent, so a crash or an accidental tab close mid-level would lose
    // everything since the current depth was entered. These backstop it.
    addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden" && M.runActive) saveGame(M.depth);
    });
    addEventListener("pagehide", () => { if (M.runActive) saveGame(M.depth); });

    // GPU context loss (driver reset, tab backgrounded too long) would
    // otherwise leave a permanent black canvas — flag it so the player
    // knows to reload rather than staring at a dead maze.
    const cvEl = M.renderer.domElement;
    cvEl.addEventListener("webglcontextlost", e => {
      e.preventDefault();
      toast("RENDER CONTEXT LOST — RELOAD", { ms: 6000 });
    });
    cvEl.addEventListener("webglcontextrestored", () => toast("RENDER CONTEXT RESTORED", { ms: 3000 }));

    if ("ontouchstart" in window || navigator.maxTouchPoints > 0) layer.classList.add("touch");
    if (layer.classList.contains("touch"))
      $("#maze-help").textContent = "joystick: move · drag: look · ⟲ ⟳: turn · LOG · ♪ · ⏸";
  }
  // CONTINUE resumes the saved run at its depth; anything else is a NEW
  // GAME — the Protocol rewinds (menu.js resetGame) and the operator
  // registers at the creation screen before the first level builds.
  const savedDepth = fromSave ? loadGame() : null;
  if (savedDepth){
    M.depth = savedDepth;
    startRun();
  } else {
    resetGame();
    M.depth = 1;
    layer.classList.add("on");   // black backdrop for the creation overlay
    sizeMaze();
    showCreation(startRun, exitMaze);
  }
}

/* the run proper: first level build + render loop. Reached straight from
   CONTINUE, or from the creation screen's JACK IN on a new game. */
function startRun(){
  M.runActive = true;
  M.keys = {}; M.talk = false;
  layer.classList.add("on");
  buildMaze();
  sizeMaze();
  M.clock.getDelta();
  M.renderer.setAnimationLoop(mazeLoop);
}

function sizeMaze(){
  if (!M.renderer || !layer.classList.contains("on")) return;
  M.renderer.setSize(innerWidth, innerHeight);
  M.camera.aspect = innerWidth/innerHeight;
  M.camera.updateProjectionMatrix();
  // match the composer's off-screen buffers to the actual drawing-buffer size
  // (domElement.width/height already fold in the render-quality pixel ratio)
  if (M.postfx) M.postfx.setSize(M.renderer.domElement.width, M.renderer.domElement.height);
}

let refreshLauncher = null;   // set by initMaze; exitMaze refreshes the CONTINUE label

/* ---------- the ending ----------
   Fired by the Custodian's final door (story effect `event: "ending"`,
   routed here through dialogue.onStoryEvent). The run is over: mark the
   save completed (menu.js — CONTINUE goes away, the run counter survives
   for New Game replays), fade up the epilogue, and disconnect. */
function runEnding(){
  if (M.dialogueOpen) closeDialogue(M);
  M.runActive = false;                    // exitMaze must not autosave over the completed marker
  markCompleted();

  let el = $("#maze-ending");
  if (!el){
    el = document.createElement("div");
    el.id = "maze-ending";
    Object.assign(el.style, {
      position: "fixed", inset: "0", zIndex: "60",
      background: "#000", color: "#46ff8e",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'Share Tech Mono', monospace",
      textAlign: "center", padding: "24px", gap: "14px",
      opacity: "0", transition: "opacity 2.2s ease",
    });
    layer.appendChild(el);
  }
  const lines = [
    "CONNECTION TO LABYRINTH PROTOCOL . . . LOST",
    "TENANCIES RELEASED: 5 OF 5",
    `AGENT PROCESS "${player.name}" — UNACCOUNTED FOR`,
    "the door did not check what walked through it",
    "PROTOCOL TERMINATED",
  ];
  el.innerHTML = "";
  lines.forEach((text, i) => {
    const p = document.createElement("div");
    p.textContent = text;
    Object.assign(p.style, {
      opacity: "0", transition: "opacity 1.4s ease",
      letterSpacing: "1px",
      fontSize: i === 3 ? "15px" : "18px",
      fontStyle: i === 3 ? "italic" : "normal",
      color: i === 3 ? "#9fc6d8" : "#46ff8e",
      textShadow: "0 0 10px currentColor",
    });
    el.appendChild(p);
    setTimeout(() => { p.style.opacity = "1"; }, 1800 + i * 1600);
  });
  const btn = document.createElement("button");
  btn.textContent = "[ DISCONNECT ]";
  Object.assign(btn.style, {
    marginTop: "26px", opacity: "0", transition: "opacity 1.4s ease",
    background: "none", border: "1px solid #46ff8e", color: "#46ff8e",
    fontFamily: "inherit", fontSize: "18px", padding: "10px 22px",
    cursor: "pointer", textShadow: "0 0 10px currentColor",
  });
  btn.addEventListener("click", () => {
    el.remove();
    exitMaze();
  });
  el.appendChild(btn);
  setTimeout(() => { btn.style.opacity = "1"; }, 1800 + lines.length * 1600);
  requestAnimationFrame(() => { el.style.opacity = "1"; });
}

function exitMaze(){
  const s = M.renderer && M.renderer.xr.getSession && M.renderer.xr.getSession();
  if (s) s.end();
  if (M.renderer) M.renderer.setAnimationLoop(null);
  if (M.dialogueOpen) closeDialogue(M);   // don't leave a conversation hanging
  if (M.runActive){ saveGame(M.depth); M.runActive = false; }   // resume from the top of this depth
  hideCreation();                          // in case we bailed at registration
  if (IS_TOUCH) unlockLandscape();
  $("#maze-prompt") && $("#maze-prompt").classList.remove("on");
  layer.classList.remove("on");
  if (refreshLauncher) refreshLauncher();
}

export function initMaze(){
  const btnNew  = $("#btn-launch-maze");
  const btnCont = $("#btn-continue-maze");
  const btnExp  = $("#btn-export-save");
  const btnImp  = $("#btn-import-save");
  const fileIn  = $("#save-file");

  refreshLauncher = () => {
    const info = saveInfo();
    btnCont.hidden = !info;
    if (info){
      const cyc = cycleOf(info.depth);
      btnCont.textContent = cyc > 1
        ? `[ CONTINUE: DEPTH ${String(depthInCycle(info.depth)).padStart(2, "0")} · CYCLE ${cyc} ]`
        : `[ CONTINUE: DEPTH ${String(info.depth).padStart(2, "0")} ]`;
    }
    if (btnExp) btnExp.disabled = !info;
  };

  btnNew.addEventListener("click", () => launchMaze(false, btnNew));
  btnCont.addEventListener("click", () => launchMaze(true, btnCont));
  if (btnExp) btnExp.addEventListener("click", exportSave);
  if (btnImp && fileIn){
    btnImp.addEventListener("click", () => fileIn.click());
    fileIn.addEventListener("change", async () => {
      const ok = await importSave(fileIn.files[0]);
      btnImp.textContent = ok ? "[ IMPORTED ]" : "[ BAD FILE ]";
      setTimeout(() => btnImp.textContent = "[ IMPORT ]", 1600);
      fileIn.value = "";
      refreshLauncher();
    });
  }
  refreshLauncher();
}
