/* ============================================================
   MAZE.EXE — player
   Movement, wall collision, camera control, and all input
   (keyboard, drag-look, virtual joystick, VR controller sticks).
   Operates on the shared engine state object `M`.
   ============================================================ */
import { $ } from "../../utils.js";

const SPEED = 3.2;

/* --- collision + movement --- */
export function collides(M, x, z){
  const r = M.R;
  for (const w of M.walls)
    if (x > w.minX - r && x < w.maxX + r && z > w.minZ - r && z < w.maxZ + r) return true;
  return false;
}
export function tryMove(M, dx, dz){
  const p = M.dolly.position;
  if (!collides(M, p.x + dx, p.z)) p.x += dx;
  if (!collides(M, p.x, p.z + dz)) p.z += dz;
}

/* --- input wiring (call once) --- */
export function bindInput(M, layer, onExit){
  addEventListener("keydown", e => {
    if (!layer.classList.contains("on")) return;
    if (M.dialogueOpen) return;                 // dialogue owns input while open
    if (e.target && e.target.tagName === "INPUT") return;   // typing (creation screen), not playing
    M.keys[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === "f") M.talk = true;
    if (e.key === "Escape") onExit();
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

/* --- per-frame movement + camera, called from the main loop --- */
export function updatePlayer(three, M, dt){
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
      tryMove(M, (fwd.x*-mvy + rgt.x*mvx) * SPEED * dt, (fwd.z*-mvy + rgt.z*mvx) * SPEED * dt);
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
      tryMove(M, (-sin*f + cos*s) * SPEED * dt, (-cos*f - sin*s) * SPEED * dt);
    }
    M.dolly.rotation.y = M.yaw;
    M.camera.rotation.x = M.pitch;
  }
}
