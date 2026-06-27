/* ============================================================
   MAZE.EXE - VR in-world text
   The DOM HUD isn't composited into immersive-vr, so VR gets:
   - a head-locked BANNER for transient messages ("ENTERED DEPTH 2",
     "+1 LT") that stays centred in view, and
   - a world-anchored PROMPT ("PULL TRIGGER — SPEAK WITH X") that
     floats just below the character you're near.

   Both are parented to the dolly (which persists across level rebuilds)
   and placed each frame from the REAL XR camera pose (xr.getCamera),
   not by parenting to the camera — so they track correctly however the
   player moves or snap-turns. (Camera-parented HUDs follow the dolly's
   forward, not the head, and slide out of view under motion.)
   ============================================================ */

let three = null, M = null;
let banner = null, hideAt = 0;
let prompt = null, lastPromptText = null;
const scratch = {};

const BANNER_DIST = 2;     // metres ahead of the head
const PROMPT_Y    = 0.75;   // height below a character's window

function ensureScratch(){
  if (scratch.m) return;
  scratch.m  = new three.Matrix4();
  scratch.hp = new three.Vector3();   // head position (dolly-local)
  scratch.hq = new three.Quaternion();
  scratch.s  = new three.Vector3();
  scratch.a  = new three.Vector3();
  scratch.v  = new three.Vector3();
}

/* head pose in dolly-local space, from the real XR camera so it's correct
   under locomotion + snap-turn (the dolly itself is rotated by snap-turn). */
function headPose(){
  const xrCam = M.renderer.xr.getCamera ? M.renderer.xr.getCamera(M.camera) : M.camera;
  M.dolly.updateWorldMatrix(true, false);
  scratch.m.copy(M.dolly.matrixWorld).invert().multiply(xrCam.matrixWorld);
  scratch.m.decompose(scratch.hp, scratch.hq, scratch.s);
}

function makeTextPlane(planeW, canvasH, renderOrder = 999){
  const canvas = document.createElement("canvas");
  canvas.width = 1024; canvas.height = canvasH;
  const ctx = canvas.getContext("2d");
  const tex = new three.CanvasTexture(canvas);
  const mesh = new three.Mesh(
    new three.PlaneGeometry(planeW, planeW * canvasH / 1024),
    new three.MeshBasicMaterial({ map: tex, transparent: true, fog: false, depthTest: false }));
  mesh.renderOrder = renderOrder;
  const group = new three.Group();
  group.add(mesh);
  group.visible = false;
  M.dolly.add(group);                 // under the dolly -> survives level rebuilds
  return { canvas, ctx, tex, mesh, group };
}

/* classic-green glow text, auto-shrunk to fit long names */
function drawText(obj, text, baseSize){
  const g = obj.ctx, W = obj.canvas.width, H = obj.canvas.height;
  g.clearRect(0, 0, W, H);
  g.textAlign = "center"; g.textBaseline = "middle";
  let size = baseSize;
  g.font = `${size}px 'VT323', monospace`;
  while (g.measureText(text).width > W - 48 && size > 24){
    size -= 4; g.font = `${size}px 'VT323', monospace`;
  }
  g.shadowColor = "#46ff8e"; g.shadowBlur = 18;
  g.fillStyle = "#46ff8e";
  g.fillText(text, W / 2, H / 2);
  g.shadowBlur = 0;
  obj.tex.needsUpdate = true;
}

export function initVRBanner(threeRef, state){
  three = threeRef; M = state;
  ensureScratch();
  // renderOrder above the dialogue panel (999) so item/pickup messages
  // received mid-conversation aren't hidden behind the box
  banner = makeTextPlane(1.2, 256, 1010);
}

export function initVRPrompt(){
  prompt = makeTextPlane(1.4, 128);
}

/* show centred text for `ms` milliseconds */
export function showVRBanner(text, ms = 1800){
  if (!banner) return;
  drawText(banner, text, 120);
  banner.group.visible = true;
  hideAt = performance.now() + ms;
}

/* call once per frame; pins the banner in front of the head and hides it
   when its time is up */
export function updateVRBanner(){
  if (!banner || !banner.group.visible) return;
  if (performance.now() > hideAt){ banner.group.visible = false; return; }
  if (!M.inVR) return;                              // desktop reads the DOM HUD instead
  headPose();
  const fwd = scratch.a.set(0, 0, -1).applyQuaternion(scratch.hq).normalize();
  banner.group.position.copy(scratch.hp).addScaledVector(fwd, BANNER_DIST);
  banner.group.quaternion.copy(scratch.hq);        // glued square to the view
}

/* show/refresh the interaction prompt floating just below the character at
   world (wx,_,wz), billboarded to face the player. Pass falsy text to hide.
   Cheap to call every frame: the texture is only redrawn when text changes. */
export function setVRPrompt(text, wx, wz){
  if (!prompt) return;
  if (!text){ prompt.group.visible = false; lastPromptText = null; return; }
  if (text !== lastPromptText){ drawText(prompt, text, 64); lastPromptText = text; }

  headPose();                                      // refreshes the dolly matrix + head pos
  scratch.v.set(wx, PROMPT_Y, wz);
  M.dolly.worldToLocal(scratch.v);                 // world spot below the character -> dolly-local
  prompt.group.position.copy(scratch.v);
  // billboard around Y so the text stays upright and faces the head
  prompt.group.rotation.set(0, Math.atan2(scratch.hp.x - scratch.v.x, scratch.hp.z - scratch.v.z), 0);
  prompt.group.visible = true;
}
