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
   Placeholders (structure only, not yet wired):
     menu.js        — save / load / settings
     characters.js  — reusable Character class + dialogue
     state.js       — RPG game state (levels, skills, inventory)
   ============================================================ */
import { $ } from "../../utils.js";
import { buildEnvironment } from "./environment.js";
import { buildEntities } from "./entities.js";
import { genMaze, cellCenter, findGoalCell } from "./generator.js";
import { bindInput, updatePlayer } from "./player.js";

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
  keys:{}, joy:{x:0,y:0}, look:{drag:false,lx:0,ly:0}, yaw:0, pitch:0,
  snapReady:true, inVR:false, clock:null,
};

function buildMaze(){
  // clear previous
  M.walls.length = 0;
  M.spinners.length = 0;
  while (M.scene.children.length) M.scene.remove(M.scene.children[0]);

  const cells = genMaze(M.N);
  const goalCell = findGoalCell(cells);   // furthest dead-end from start

  const { walls, cyberMat } = buildEnvironment(three, M.scene, M, cells, goalCell);
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

  // player start
  M.dolly.position.set(cellCenter(0, M.CELL), 0, cellCenter(0, M.CELL));
  M.yaw = Math.PI; M.pitch = 0; // face into the maze
  $("#hud-top").innerHTML = `MAZE.EXE <b>// depth ${String(M.depth).padStart(2,"0")}</b>`;
}

/* --- main loop --- */
function mazeLoop(){
  const dt = Math.min(M.clock.getDelta(), 0.1);
  updatePlayer(three, M, dt);

  // spinners + goal check
  for (const sp of M.spinners){ sp.rotation.y += dt*1.2; sp.rotation.x += dt*0.7; }
  // flicker the dissolving goal walls
  if (M.cyberMat) M.cyberMat.opacity = 0.55 + 0.35 * Math.sin(performance.now() * 0.004);
  if (M.goal){
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
    M.clock  = new three.Clock();
    bindInput(M, layer, exitMaze);
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
  layer.classList.remove("on");
}

export function initMaze(){
  $("#btn-launch-maze").addEventListener("click", launchMaze);
}
