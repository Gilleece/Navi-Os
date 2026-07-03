/* ============================================================
   MAZE.EXE - screensaver labyrinth (desktop / touch / WebXR)
   Main entry + orchestrator. Loads three.js, owns the engine
   state, builds the world up from its parts and runs the
   lifecycle and render loop.

   Parts:
     generator.js   : maze grid algorithm (no three.js)
     textures.js    : procedural wall / floor textures
     environment.js : fog, lights, floor, ceiling, walls
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
import { buildEnvironment, wallKey } from "./environment.js";
import { buildProps, updateProps } from "./props.js";
import { buildEntities, updateTokens } from "./entities.js";
import { themeFor, animate, liveScene } from "./palette.js";
import { genMaze, cellCenter, findGoalCell } from "./generator.js";
import { bindInput, updatePlayer } from "./player.js";
import { spawnCharacters, buildCharacters, recoverAffinity, updateCharacters, ROSTER } from "./characters/characters.js";
import { initDialogue, initPanel, openDialogue, updateInteractions, updateDialogueXR, closeDialogue } from "./dialogue.js";
import { applyLevelEvents, pendingBeats } from "./story.js";
import { player } from "./state.js";
import { saveGame, loadGame, resetGame, saveInfo, exportSave, importSave } from "./menu.js";
import { showCreation, hideCreation } from "./creation.js";
import { buildMinimap, updateMinimap } from "./minimap.js";
import { initDebugUI, initDebugPanel, updateDebugXR } from "./debug.js";
import { buildHands, updateHands } from "./hands.js";
import { initVRBanner, showVRBanner, updateVRBanner, initVRPrompt } from "./vrbanner.js";
import { initAudio } from "./audio.js";

const layer = $("#maze-layer");
let three = null;

function loadThree(){
  if (three) return Promise.resolve();
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    s.onload = () => { three = window.THREE; res(); };
    s.onerror = () => rej(new Error("three.js failed to load"));
    document.head.appendChild(s);
  });
}

/* --- engine state (rendering); the RPG game state lives in state.js --- */
const M = {
  N: 9, CELL: 4, WALL_H: 3.4, WALL_T: 0.5, R: 0.45,
  renderer:null, scene:null, camera:null, dolly:null,
  walls:[], goal:null, goalLight:null, spinners:[], depth:1, lamp:null, cyberMat:null,
  tokens:[], bursts:[], theme:null, ambient:null, paneMat:null, trimMat:null,
  props:[], propFx:null, grabs:null,
  npcs:[], nearCharacter:null, dialogueOpen:false, talk:false,
  // narrative gate: who still has unheard story beats (locks the exit ring),
  // the ring's rise animation state, and the recheck / message throttles
  gatePending:[], gateRise:1, gateTumble:{x:0,y:0}, gateT:0, gateMsgAt:0,
  runActive:false,
  controllers:null, grips:null, hands:null, prevTrigger:false,
  keys:{}, joy:{x:0,y:0}, look:{drag:false,lx:0,ly:0}, yaw:0, pitch:0,
  snapReady:true, inVR:false, clock:null,
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

function buildMaze(){
  // clear previous (the dolly survives rebuilds — its subtree, panel,
  // banner, hands and lamp included, must NOT be disposed)
  M.walls.length = 0;
  M.spinners.length = 0;
  while (M.scene.children.length){
    const child = M.scene.children[0];
    M.scene.remove(child);
    if (child !== M.dolly) disposeSubtree(child);
  }

  recoverAffinity();                       // enraged characters thaw a little each level
  applyLevelEvents(M.depth, ROSTER);       // one-time story mutations (e.g. Scally stocks the mayo)
  M.theme = themeFor(M.depth);             // walls / fog / lights recolour as you descend

  const cells = genMaze(M.N);
  const goalCell = findGoalCell(cells);   // furthest dead-end from start

  // decide where characters appear, then turn their host walls into windows
  const spawns = spawnCharacters(cells, goalCell, M.depth, M);
  const windows = new Set(spawns.map(s => wallKey(s.wall.x, s.wall.z, s.wall.alongX)));

  const { walls, cyberMat, paneMat, trimMat, ambient } = buildEnvironment(three, M.scene, M, cells, goalCell, windows);
  M.walls.push(...walls);
  M.cyberMat = cyberMat;
  M.paneMat = paneMat;
  M.trimMat = trimMat;
  M.ambient = ambient;

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

  const { goal, goalLight, spinners, tokens } = buildEntities(three, M.scene, M, goalCell);
  M.goal = goal;
  M.goalLight = goalLight;
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
  M.yaw = Math.PI; M.pitch = 0; // face into the maze
  $("#hud-top").innerHTML = `MAZE.EXE <b>// depth ${String(M.depth).padStart(2,"0")}</b>`;

  if (M.runActive) saveGame(M.depth);   // autosave: one slot, every level entered
}

/* debug-only: jump straight to the next level, skipping the goal */
function debugNextLevel(){
  if (M.dialogueOpen) return;
  M.depth++;
  buildMaze();
  if (M.inVR) showVRBanner(`ENTERED DEPTH ${M.depth}`);
}

/* centre-screen HUD flash (shared timer, so messages replace each other) */
function hudMsg(text, ms = 1600){
  const el = $("#hud-msg");
  if (!el) return;
  el.textContent = text; el.classList.add("show");
  clearTimeout(hudMsg._t);
  hudMsg._t = setTimeout(() => el.classList.remove("show"), ms);
}

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
    if (wasLocked && !M.gatePending.length && M.goal){
      hudMsg("THE WAY DOWN OPENS", 1800);
      if (M.inVR) showVRBanner("THE WAY DOWN OPENS", 1800);
    }
  }
  const target = M.gatePending.length ? 0 : 1;
  M.gateRise = Math.max(0, Math.min(1, M.gateRise + (target ? 1 : -1) * dt / 1.1));
  poseGate(dt);
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

function mazeLoop(){
  const dt = Math.min(M.clock.getDelta(), 0.1);

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
    }
  }

  updateProps(three, M, dt);      // motes + light wells always; grab/throw pauses during dialogue
  updateHands(M);                 // animate the VR hands + active-controller pointer (self-hides off-VR)
  updateVRBanner();               // hide the depth banner once its time is up
  updateMinimap(M);               // fog-of-war map, top-right (self-hides in VR)

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
          const who = `THE WAY DOWN IS NOT YET OPEN — SPEAK WITH ${M.gatePending.join(" & ")}`;
          hudMsg(who, 2800);
          if (M.inVR) showVRBanner(who, 2800);
        }
      } else {
        M.goal = null;
        hudMsg("GATE REACHED — DESCENDING", 1400);
        if (M.inVR) showVRBanner("GATE REACHED — DESCENDING", 1400);
        setTimeout(() => {
          M.depth++; buildMaze();
          if (M.inVR) showVRBanner(`ENTERED DEPTH ${M.depth}`);
        }, 1400);
      }
    }
  }
  M.renderer.render(M.scene, M.camera);
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
  catch(e){ btn.textContent = "[ LOAD FAILED — CHECK NET ]"; return; }
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
    bindInput(M, layer, exitMaze);
    initDialogue(M);                 // build the dialogue box DOM once
    initPanel(three, M.dolly);       // build the in-world VR dialogue panel
    initDebugUI(debugNextLevel);     // desktop/touch debug button (no-op unless DEBUG)
    initDebugPanel(three, M.dolly);  // in-world VR debug panel (no-op unless DEBUG)
    buildHands(three, M);            // VR hands on the grips + pointer rays on the controllers
    initVRBanner(three, M);          // head-locked banner ("ENTERED DEPTH N", "+N LT")
    initVRPrompt();                  // world-anchored "PULL TRIGGER — SPEAK WITH X" prompt
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

    if ("ontouchstart" in window || navigator.maxTouchPoints > 0) layer.classList.add("touch");
    if (layer.classList.contains("touch"))
      $("#maze-help").textContent = "joystick: move · drag screen: look · ⟲ ⟳: turn";
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
}

let refreshLauncher = null;   // set by initMaze; exitMaze refreshes the CONTINUE label

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
    if (info) btnCont.textContent = `[ CONTINUE — DEPTH ${String(info.depth).padStart(2, "0")} ]`;
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
