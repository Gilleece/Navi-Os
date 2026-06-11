/* ============================================================
   MAZE.EXE — screensaver labyrinth (desktop / touch / WebXR)
   ============================================================ */
import { $ } from "../utils.js";

const layer = $("#maze-layer");
let three = null, maze = null;

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

/* --- procedural textures --- */
function brickTexture(){
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#06150c"; g.fillRect(0,0,256,256);
  const bw = 64, bh = 32;
  for (let y = 0; y < 256/bh; y++){
    const off = (y % 2) * bw/2;
    for (let x = -1; x < 256/bw + 1; x++){
      const shade = 8 + Math.random()*14 | 0;
      g.fillStyle = `rgb(${shade},${30+Math.random()*26|0},${shade+6})`;
      g.fillRect(x*bw + off + 2, y*bh + 2, bw - 4, bh - 4);
    }
  }
  g.strokeStyle = "rgba(70,255,142,.16)";
  for (let y = 0; y <= 256; y += bh){ g.beginPath(); g.moveTo(0,y); g.lineTo(256,y); g.stroke(); }
  const t = new three.CanvasTexture(c);
  t.wrapS = t.wrapT = three.RepeatWrapping;
  return t;
}
function floorTexture(){
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#020604"; g.fillRect(0,0,256,256);
  g.strokeStyle = "rgba(70,255,142,.25)"; g.lineWidth = 2;
  g.strokeRect(4,4,248,248);
  g.strokeStyle = "rgba(70,255,142,.08)";
  g.beginPath(); g.moveTo(128,0); g.lineTo(128,256); g.moveTo(0,128); g.lineTo(256,128); g.stroke();
  const t = new three.CanvasTexture(c);
  t.wrapS = t.wrapT = three.RepeatWrapping;
  return t;
}

/* --- maze generation: recursive backtracker --- */
function genMaze(n){
  const cells = Array.from({length:n}, () => Array.from({length:n}, () => ({N:1,S:1,E:1,W:1,v:0})));
  const stack = [[0,0]]; cells[0][0].v = 1;
  const DIRS = [["N",0,-1,"S"],["S",0,1,"N"],["E",1,0,"W"],["W",-1,0,"E"]];
  while (stack.length){
    const [x,y] = stack[stack.length-1];
    const opts = DIRS.filter(([,dx,dy]) => {
      const nx = x+dx, ny = y+dy;
      return nx>=0 && ny>=0 && nx<n && ny<n && !cells[ny][nx].v;
    });
    if (!opts.length){ stack.pop(); continue; }
    const [d,dx,dy,opp] = opts[Math.random()*opts.length|0];
    cells[y][x][d] = 0; cells[y+dy][x+dx][opp] = 0; cells[y+dy][x+dx].v = 1;
    stack.push([x+dx, y+dy]);
  }
  return cells;
}

/* --- maze world state --- */
const M = {
  N: 9, CELL: 4, WALL_H: 3.4, WALL_T: 0.5, R: 0.45,
  renderer:null, scene:null, camera:null, dolly:null,
  walls:[], goal:null, spinners:[], depth:1,
  keys:{}, joy:{x:0,y:0}, look:{drag:false,lx:0,ly:0}, yaw:0, pitch:0,
  snapReady:true, inVR:false, clock:null,
};
const cellCenter = i => (i + 0.5) * M.CELL;

function buildMaze(){
  // clear previous
  M.walls.length = 0;
  M.spinners.length = 0;
  while (M.scene.children.length) M.scene.remove(M.scene.children[0]);

  const { N, CELL, WALL_H, WALL_T } = M;
  const size = N * CELL;
  const cells = genMaze(N);

  M.scene.fog = new three.Fog(0x020604, 2, 26);
  M.scene.add(new three.AmbientLight(0x1a4d30, 0.9));
  if (!M.lamp){
    M.lamp = new three.PointLight(0x46ff8e, 1.1, 14);
    M.lamp.position.set(0, 2.2, 0);
    M.dolly.add(M.lamp);
  }
  M.scene.add(M.dolly);

  // floor + ceiling
  const fTex = floorTexture(); fTex.repeat.set(N, N);
  const floor = new three.Mesh(
    new three.PlaneGeometry(size, size),
    new three.MeshLambertMaterial({map:fTex}));
  floor.rotation.x = -Math.PI/2;
  floor.position.set(size/2, 0, size/2);
  M.scene.add(floor);
  const ceil = new three.Mesh(
    new three.PlaneGeometry(size, size),
    new three.MeshLambertMaterial({color:0x03130a}));
  ceil.rotation.x = Math.PI/2;
  ceil.position.set(size/2, WALL_H, size/2);
  M.scene.add(ceil);

  // walls
  const bTex = brickTexture(); bTex.repeat.set(1.4, 1);
  const wallMat = new three.MeshLambertMaterial({map:bTex});
  const geoH = new three.BoxGeometry(CELL + WALL_T, WALL_H, WALL_T); // runs along X
  const geoV = new three.BoxGeometry(WALL_T, WALL_H, CELL + WALL_T); // runs along Z
  function addWall(geo, x, z, alongX){
    const m = new three.Mesh(geo, wallMat);
    m.position.set(x, WALL_H/2, z);
    M.scene.add(m);
    const hx = alongX ? (CELL + WALL_T)/2 : WALL_T/2;
    const hz = alongX ? WALL_T/2 : (CELL + WALL_T)/2;
    M.walls.push({minX:x-hx, maxX:x+hx, minZ:z-hz, maxZ:z+hz});
  }
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++){
      const c = cells[y][x];
      if (y === 0 && c.N) addWall(geoH, cellCenter(x), 0, true);
      if (c.S)            addWall(geoH, cellCenter(x), (y+1)*CELL, true);
      if (x === 0 && c.W) addWall(geoV, 0, cellCenter(y), false);
      if (c.E)            addWall(geoV, (x+1)*CELL, cellCenter(y), false);
    }

  // goal gate — far corner
  const gate = new three.Mesh(
    new three.TorusGeometry(1.1, 0.12, 10, 32),
    new three.MeshBasicMaterial({color:0xff7a1a}));
  gate.position.set(cellCenter(N-1), 1.5, cellCenter(N-1));
  M.scene.add(gate);
  const gateLight = new three.PointLight(0xff7a1a, 1.4, 9);
  gateLight.position.copy(gate.position);
  M.scene.add(gateLight);
  M.goal = gate;
  M.spinners.push(gate);

  // floating relics (the old screensaver's spinning shapes)
  for (let i = 0; i < 3; i++){
    const s = new three.Mesh(
      new three.IcosahedronGeometry(0.55),
      new three.MeshBasicMaterial({color:0x46ff8e, wireframe:true}));
    s.position.set(cellCenter(1 + Math.random()*(N-2)|0), 1.6, cellCenter(1 + Math.random()*(N-2)|0));
    M.scene.add(s);
    M.spinners.push(s);
  }

  // player start
  M.dolly.position.set(cellCenter(0), 0, cellCenter(0));
  M.yaw = Math.PI; M.pitch = 0; // face into the maze
  $("#hud-top").innerHTML = `MAZE.EXE <b>// depth ${String(M.depth).padStart(2,"0")}</b>`;
}

function collides(x, z){
  const r = M.R;
  for (const w of M.walls)
    if (x > w.minX - r && x < w.maxX + r && z > w.minZ - r && z < w.maxZ + r) return true;
  return false;
}
function tryMove(dx, dz){
  const p = M.dolly.position;
  if (!collides(p.x + dx, p.z)) p.x += dx;
  if (!collides(p.x, p.z + dz)) p.z += dz;
}

/* --- input --- */
function bindMazeInput(){
  addEventListener("keydown", e => {
    if (!layer.classList.contains("on")) return;
    M.keys[e.key.toLowerCase()] = true;
    if (e.key === "Escape") exitMaze();
  });
  addEventListener("keyup", e => M.keys[e.key.toLowerCase()] = false);

  // drag to look (mouse or touch outside joystick)
  const cv = $("#maze-canvas");
  cv.addEventListener("pointerdown", e => {
    M.look.drag = true; M.look.lx = e.clientX; M.look.ly = e.clientY;
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener("pointermove", e => {
    if (!M.look.drag || M.inVR) return;
    M.yaw   -= (e.clientX - M.look.lx) * 0.005;
    M.pitch -= (e.clientY - M.look.ly) * 0.004;
    M.pitch = Math.max(-1.2, Math.min(1.2, M.pitch));
    M.look.lx = e.clientX; M.look.ly = e.clientY;
  });
  cv.addEventListener("pointerup", () => M.look.drag = false);

  // virtual joystick
  const joy = $("#joy"), nub = joy.querySelector(".nub");
  let jid = null;
  const setNub = (dx,dy) => { nub.style.left = 36+dx+"px"; nub.style.top = 36+dy+"px"; };
  joy.addEventListener("pointerdown", e => {
    jid = e.pointerId; joy.setPointerCapture(jid); joyMove(e);
  });
  joy.addEventListener("pointermove", e => { if (e.pointerId === jid) joyMove(e); });
  const joyEnd = e => { if (e.pointerId === jid){ jid = null; M.joy.x = M.joy.y = 0; setNub(0,0); } };
  joy.addEventListener("pointerup", joyEnd); joy.addEventListener("pointercancel", joyEnd);
  function joyMove(e){
    const r = joy.getBoundingClientRect();
    let dx = e.clientX - (r.left + 60), dy = e.clientY - (r.top + 60);
    const len = Math.hypot(dx,dy), max = 40;
    if (len > max){ dx *= max/len; dy *= max/len; }
    setNub(dx,dy);
    M.joy.x = dx/max; M.joy.y = dy/max;
  }

  // touch turn buttons
  $("#turn-l").addEventListener("click", () => M.yaw += Math.PI/6);
  $("#turn-r").addEventListener("click", () => M.yaw -= Math.PI/6);
}

/* --- main loop --- */
function mazeLoop(){
  const dt = Math.min(M.clock.getDelta(), 0.1);
  const speed = 3.2;

  // VR controller sticks
  if (M.inVR){
    const session = M.renderer.xr.getSession();
    let mvx = 0, mvy = 0;
    if (session) for (const src of session.inputSources){
      const a = src.gamepad && src.gamepad.axes;
      if (!a) continue;
      const sx = a[2] !== undefined ? a[2] : a[0] || 0;
      const sy = a[3] !== undefined ? a[3] : a[1] || 0;
      if (src.handedness === "right"){
        if (Math.abs(sx) > 0.7 && M.snapReady){ M.yaw -= Math.sign(sx)*Math.PI/6; M.snapReady = false; }
        if (Math.abs(sx) < 0.3) M.snapReady = true;
      } else { mvx += sx; mvy += sy; }
    }
    if (Math.abs(mvx) > 0.12 || Math.abs(mvy) > 0.12){
      const q = new three.Quaternion();
      M.renderer.xr.getCamera(M.camera).getWorldQuaternion(q);
      const fwd = new three.Vector3(0,0,-1).applyQuaternion(q); fwd.y = 0; fwd.normalize();
      const rgt = new three.Vector3(1,0,0).applyQuaternion(q);  rgt.y = 0; rgt.normalize();
      tryMove((fwd.x*-mvy + rgt.x*mvx) * speed * dt, (fwd.z*-mvy + rgt.z*mvx) * speed * dt);
    }
    M.dolly.rotation.y = M.yaw;
  } else {
    // keyboard + joystick
    let f = 0, s = 0;
    if (M.keys["w"] || M.keys["arrowup"])    f += 1;
    if (M.keys["s"] || M.keys["arrowdown"])  f -= 1;
    if (M.keys["a"])                          s -= 1;
    if (M.keys["d"])                          s += 1;
    if (M.keys["arrowleft"])  M.yaw += 1.8*dt;
    if (M.keys["arrowright"]) M.yaw -= 1.8*dt;
    if (M.keys["q"]) M.yaw += 1.8*dt;
    if (M.keys["e"]) M.yaw -= 1.8*dt;
    f += -M.joy.y; s += M.joy.x;
    const len = Math.hypot(f,s);
    if (len > 1){ f/=len; s/=len; }
    if (f || s){
      const sin = Math.sin(M.yaw), cos = Math.cos(M.yaw);
      tryMove((-sin*f + cos*s) * speed * dt, (-cos*f - sin*s) * speed * dt);
    }
    M.dolly.rotation.y = M.yaw;
    M.camera.rotation.x = M.pitch;
  }

  // spinners + goal check
  for (const sp of M.spinners){ sp.rotation.y += dt*1.2; sp.rotation.x += dt*0.7; }
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
    bindMazeInput();
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
