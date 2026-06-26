/* ============================================================
   MAZE.EXE - 3D dialogue panel (VR)
   The DOM dialogue box isn't composited into an immersive-vr view,
   so in VR the same conversation gets drawn onto a canvas textured
   onto a plane that floats in front of the player. This module owns
   the mesh / texture and the controller raycast. dialogue.js draws
   the UI into `panel.ctx` and maps ray hits to choices.
   ============================================================ */

export const PANEL_W = 1024, PANEL_H = 576;   // canvas resolution

/* build the panel object (hidden until a conversation opens in VR).
   Add `panel.group` under the dolly so it tracks the player. */
export function createPanel(three){
  const canvas = document.createElement("canvas");
  canvas.width = PANEL_W; canvas.height = PANEL_H;
  const ctx = canvas.getContext("2d");

  const tex = new three.CanvasTexture(canvas);
  const mesh = new three.Mesh(
    new three.PlaneGeometry(1.3, 1.3 * PANEL_H / PANEL_W),
    // depthTest off + high renderOrder: the panel always draws on top, so it
    // can't be obscured by a wall or window it happens to overlap
    new three.MeshBasicMaterial({ map: tex, transparent: true, fog: false, depthTest: false, depthWrite: false }));
  mesh.renderOrder = 999;

  const group = new three.Group();
  group.add(mesh);
  group.position.set(0, 1.45, -1.6);   // in front of, and slightly above, the dolly origin
  group.visible = false;

  return { canvas, ctx, tex, mesh, group };
}

/* cast the controller's pointing ray at the panel; returns the hit
   UV in canvas space {x:0..1 from left, y:0..1 from top} or null. */
export function raycastPanel(three, panel, controller, _ray = new three.Raycaster()){
  const origin = new three.Vector3();
  const dir = new three.Vector3(0, 0, -1);
  controller.getWorldPosition(origin);
  dir.applyQuaternion(controller.getWorldQuaternion(new three.Quaternion()));
  _ray.set(origin, dir);
  const hit = _ray.intersectObject(panel.mesh, false)[0];
  if (!hit || !hit.uv) return null;
  return { x: hit.uv.x, y: 1 - hit.uv.y };   // flip V so y runs top->bottom like the canvas
}
