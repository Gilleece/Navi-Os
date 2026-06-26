/* ============================================================
   MAZE.EXE — VR centre banner
   The DOM HUD isn't composited into an immersive-vr view, so messages
   like "ENTERED DEPTH 2" need to live in the world. This is a small
   canvas-textured plane parented to the camera, so it stays centred in
   the player's view, shown briefly on descent and then faded out.
   ============================================================ */

let banner = null;      // { canvas, ctx, tex, mesh, group }
let hideAt = 0;

export function initVRBanner(three, camera){
  const canvas = document.createElement("canvas");
  canvas.width = 1024; canvas.height = 256;
  const ctx = canvas.getContext("2d");

  const tex = new three.CanvasTexture(canvas);
  const mesh = new three.Mesh(
    new three.PlaneGeometry(1.2, 1.2 * canvas.height / canvas.width),
    new three.MeshBasicMaterial({ map: tex, transparent: true, fog: false, depthTest: false }));
  mesh.renderOrder = 999;               // draw over the world, not behind walls

  const group = new three.Group();
  group.add(mesh);
  group.position.set(0, 0.05, -2);      // straight ahead, head-locked
  group.visible = false;
  camera.add(group);

  banner = { canvas, ctx, tex, mesh, group };
}

/* show centred text for `ms` milliseconds */
export function showVRBanner(text, ms = 1800){
  if (!banner) return;
  const g = banner.ctx, W = banner.canvas.width, H = banner.canvas.height;
  g.clearRect(0, 0, W, H);
  g.textAlign = "center"; g.textBaseline = "middle";
  g.shadowColor = "#46ff8e"; g.shadowBlur = 24;
  g.fillStyle = "#46ff8e"; g.font = "120px 'VT323', monospace";
  g.fillText(text, W / 2, H / 2);
  g.shadowBlur = 0;
  banner.tex.needsUpdate = true;

  banner.group.visible = true;
  hideAt = performance.now() + ms;
}

/* call once per frame; hides the banner when its time is up */
export function updateVRBanner(){
  if (banner && banner.group.visible && performance.now() > hideAt)
    banner.group.visible = false;
}
