/* ============================================================
   MAZE.EXE — screensaver labyrinth (desktop / touch / WebXR)
   Main entry + orchestrator: loads three.js, owns the engine
   state, composes the world from its parts, and runs the
   lifecycle and render loop.

   Parts:
     generator.js   — maze grid algorithm (no three.js)
     textures.js    — procedural wall / floor textures
     environment.js — fog, lights, floor, ceiling, walls
     entities.js    — goal gate + floating relics
     player.js      — movement, collision, camera, input
     characters.js  — Character class, roster, spawning
     dialogue.js    — portrait dialogue box + interaction prompt
     state.js       — player RPG state (attributes, inventory)
   Placeholder (structure only, not yet wired):
     menu.js        — save / load / settings
   ============================================================ */
import { $ } from "../../utils.js";
import { buildEnvironment, wallKey } from "./environment.js";
import { buildEntities } from "./entities.js";
import { genMaze, cellCenter, findGoalCell } from "./generator.js";
import { bindInput, updatePlayer } from "./player.js";
import { spawnCharacters, buildCharacters, recoverAffinity } from "./characters.js";
import { initDialogue, initPanel, openDialogue, updateInteractions, updateDialogueXR, closeDialogue } from "./dialogue.js";
import { rollStats } from "./state.js";
import { initDebugUI, initDebugPanel, updateDebugXR } from "./debug.js";

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
  walls:[], goal:null, spinners:[], depth:1, lamp:null, cyberMat:null,
  npcs:[], nearCharacter:null, dialogueOpen:false, talk:false,
  controllers:null, prevTrigger:false,
  keys:{}, joy:{x:0,y:0}, look:{drag:false,lx:0,ly:0}, yaw:0, pitch:0,
  snapReady:true, inVR:false, clock:null,
};

function buildMaze(){
  // clear previous
  M.walls.length = 0;
  M.spinners.length = 0;
  while (M.scene.children.length) M.scene.remove(M.scene.children[0]);

  recoverAffinity();                       // enraged characters thaw a little each level

  const cells = genMaze(M.N);
  const goalCell = findGoalCell(cells);   // furthest dead-end from start

  // decide where characters appear, then turn their host walls into windows
  const spawns = spawnCharacters(cells, goalCell, M.depth, M);
  const windows = new Set(spawns.map(s => wallKey(s.wall.x, s.wall.z, s.wall.alongX)));

  const { walls, cyberMat } = buildEnvironment(three, M.scene, M, cells, goalCell, windows);
  M.walls.push(...walls);
  M.cyberMat = cyberMat;

  // player lamp — travels with the dolly, persists across rebuilds
  if (!M.lamp){
    M.lamp = new three.PointLight(0x46ff8e, 1.1, 14);
    M.lamp.position.set(0, 2.2, 0);
    M.dolly.add(M.lamp);
  }
  M.scene.add(M.dolly);

  const { goal, spinners } = buildEntities(three, M.scene, M, goalCell);
  M.goal = goal;
  M.spinners.push(...spinners);

  // characters behind their windows
  M.npcs = buildCharacters(three, M.scene, spawns);
  M.nearCharacter = null;

  // player start
  M.dolly.position.set(cellCenter(0, M.CELL), 0, cellCenter(0, M.CELL));
  M.yaw = Math.PI; M.pitch = 0; // face into the maze
  $("#hud-top").innerHTML = `MAZE.EXE <b>// depth ${String(M.depth).padStart(2,"0")}</b>`;
}

/* debug-only: jump straight to the next level, skipping the goal */
function debugNextLevel(){
  if (M.dialogueOpen) return;
  M.depth++;
  buildMaze();
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
  if (M.dialogueOpen){            // freeze the world while a conversation is open
    if (M.inVR) updateDialogueXR(M, three, dt);
  } else {
    updatePlayer(three, M, dt);
    updateInteractions(M);
    if (M.inVR){                  // trigger near a character starts the conversation
      const t = triggerHeld();
      if (t && !M.prevTrigger && M.nearCharacter) openDialogue(M, M.nearCharacter.character);
      M.prevTrigger = t;
      updateDebugXR(M, three);    // left-trigger debug panel + right-trigger click
    }
  }

  // spinners + goal check
  for (const sp of M.spinners){ sp.rotation.y += dt*1.2; sp.rotation.x += dt*0.7; }
  // flicker the dissolving goal walls
  if (M.cyberMat) M.cyberMat.opacity = 0.55 + 0.35 * Math.sin(performance.now() * 0.004);
  if (M.goal && !M.dialogueOpen){
    const d = M.dolly.position.distanceTo(new three.Vector3(M.goal.position.x, 0, M.goal.position.z));
    if (d < 1.3){
      M.goal = null;
      const msg = $("#hud-msg");
      msg.textContent = "GATE REACHED — DESCENDING"; msg.classList.add("show");
      setTimeout(() => { msg.classList.remove("show"); M.depth++; buildMaze(); }, 1400);
    }
  }
  M.renderer.render(M.scene, M.camera);
}

/* --- lifecycle --- */
async function launchMaze(){
  $("#btn-launch-maze").textContent = "[ LOADING... ]";
  try { await loadThree(); }
  catch(e){ $("#btn-launch-maze").textContent = "[ LOAD FAILED — CHECK NET ]"; return; }
  $("#btn-launch-maze").textContent = "[ INITIALISE MAZE ]";

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
      // (left to summon, right to point/click) can tell them apart
      c.addEventListener("connected", e => { c.userData.handedness = e.data.handedness; });
    });
    M.clock  = new three.Clock();
    bindInput(M, layer, exitMaze);
    initDialogue(M);                 // build the dialogue box DOM once
    initPanel(three, M.dolly);       // build the in-world VR dialogue panel
    initDebugUI(debugNextLevel);     // desktop/touch debug button (no-op unless DEBUG)
    initDebugPanel(three, M.dolly);  // in-world VR debug panel (no-op unless DEBUG)
    rollStats();                     // randomise the player's attributes (placeholder for char creation)
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
  M.depth = 1;
  buildMaze();
  layer.classList.add("on");
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

function exitMaze(){
  const s = M.renderer && M.renderer.xr.getSession && M.renderer.xr.getSession();
  if (s) s.end();
  if (M.renderer) M.renderer.setAnimationLoop(null);
  if (M.dialogueOpen) closeDialogue(M);   // don't leave a conversation hanging
  $("#maze-prompt") && $("#maze-prompt").classList.remove("on");
  layer.classList.remove("on");
}

export function initMaze(){
  $("#btn-launch-maze").addEventListener("click", launchMaze);
}
