/* ============================================================
   MAZE.EXE - VR hands + pointer
   Gives the controllers a visible presence: a simple low-poly hand
   on each grip whose fingers curl with the trigger (index) and grip
   (the other fingers + thumb), in the usual VR way. A pointer ray
   comes out of whichever controller most recently pulled its
   trigger ("active"), to make aiming at the dialogue choices easier.

   Hands sit on the grip spaces (getControllerGrip). The pointer rides
   the target-ray spaces (getController) so it matches the panel
   raycast in panel.js. Everything self-hides when there's no XR
   session, so nothing shows on desktop.
   ============================================================ */

const NEON = 0x46ff8e;

function box(three, w, h, d, mat){ return new three.Mesh(new three.BoxGeometry(w, h, d), mat); }

/* a generic right-hand-shaped model; the left hand is mirrored at
   runtime (scale.x = -1) once we know each controller's handedness.
   Fingers point along +Z (out of the palm); curling rotates each
   knuckle about +X so the tips fold down toward the palm. */
function makeHand(three, mat){
  const group = new three.Group();                       // outer: mirrored per handedness
  // inner rig flipped 180° so the fingers point away from the wrist (grip
  // space +Z points back at the user, which is why they faced the body).
  const rig = new three.Group();
  rig.rotation.y = Math.PI;
  group.add(rig);
  rig.add(box(three, 0.09, 0.028, 0.10, mat));           // palm

  const fingers = [];
  const xs   = [-0.033, -0.011, 0.011, 0.033];          // index → pinky across the knuckles
  const lens = [ 0.050,  0.058, 0.052, 0.040];
  for (let i = 0; i < 4; i++){
    const knuckle = new three.Group();
    knuckle.position.set(xs[i], 0, 0.05);                // front edge of the palm
    const seg = box(three, 0.017, 0.017, lens[i], mat);
    seg.position.z = lens[i] / 2;
    knuckle.add(seg);
    rig.add(knuckle);
    fingers.push(knuckle);
  }

  const thumb = new three.Group();                       // off the side, angled across
  thumb.position.set(-0.05, 0, -0.005);
  thumb.rotation.z = 0.5;
  const tseg = box(three, 0.018, 0.018, 0.045, mat);
  tseg.position.z = 0.022;
  thumb.add(tseg);
  rig.add(thumb);

  return {
    group, fingers, thumb,
    /* trigger curls the index; grip curls the rest + thumb (0..1 each) */
    setCurl(trigger, grip){
      fingers[0].rotation.x = trigger * 1.6;
      for (let i = 1; i < 4; i++) fingers[i].rotation.x = grip * 1.6;
      thumb.rotation.x = grip * 1.1;
    },
  };
}

function makePointer(three){
  const group = new three.Group();
  const L = 3;
  // depthTest off + high renderOrder so the ray/cursor draw over the
  // (always-on-top) dialogue panel, giving clear aim feedback
  const ray = new three.Mesh(
    new three.CylinderGeometry(0.0035, 0.0035, L, 6),
    new three.MeshBasicMaterial({ color: NEON, transparent: true, opacity: 0.5, depthTest: false, depthWrite: false }));
  ray.rotation.x = Math.PI / 2;                          // lay the cylinder along -Z
  ray.position.z = -L / 2;
  ray.renderOrder = 1000;
  group.add(ray);
  const tip = new three.Mesh(
    new three.SphereGeometry(0.012, 10, 10),
    new three.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthTest: false, depthWrite: false }));
  tip.position.z = -L;
  tip.renderOrder = 1001;
  group.add(tip);
  group.visible = false;
  return group;
}

/* build the hands (on grips) and pointers (on controllers); stash on M.hands */
export function buildHands(three, M){
  const mat = new three.MeshBasicMaterial({
    color: NEON, transparent: true, opacity: 0.6, side: three.DoubleSide, depthWrite: false });

  const models   = (M.grips || []).map(g => { const h = makeHand(three, mat); h.group.visible = false; g.add(h.group); return h; });
  const pointers = (M.controllers || []).map(c => { const p = makePointer(three); c.add(p); return p; });

  M.hands = { models, pointers, active: 1, prev: [false, false] };
}

/* per-frame: curl fingers from the live gamepad, track the active
   controller (last trigger press), and show its pointer. Safe to call
   every frame, it hides everything when there's no XR session. */
export function updateHands(M){
  const H = M.hands;
  if (!H) return;
  const session = M.renderer.xr.getSession && M.renderer.xr.getSession();
  if (!session){
    H.models.forEach(h => h.group.visible = false);
    H.pointers.forEach(p => p.visible = false);
    return;
  }

  H.models.forEach(h => h.group.visible = false);        // show only hands we have input for

  for (const src of session.inputSources){
    const gp = src.gamepad; if (!gp) continue;
    const i = (M.controllers || []).findIndex(c => c.userData.handedness === src.handedness);
    if (i < 0) continue;

    const trigger = gp.buttons[0] ? (gp.buttons[0].value || (gp.buttons[0].pressed ? 1 : 0)) : 0;
    const grip    = gp.buttons[1] ? (gp.buttons[1].value || (gp.buttons[1].pressed ? 1 : 0)) : 0;

    const hand = H.models[i];
    if (hand){
      hand.group.visible = true;
      hand.group.scale.x = (src.handedness === "left") ? 1 : -1;   // mirror to the correct chirality
      hand.setCurl(trigger, grip);
    }

    const pressed = !!(gp.buttons[0] && gp.buttons[0].pressed);     // active = last trigger pull
    if (pressed && !H.prev[i]) H.active = i;
    H.prev[i] = pressed;
  }

  // pointer only appears while a conversation is open, on the active controller
  H.pointers.forEach((p, i) => { p.visible = (i === H.active && M.dialogueOpen); });
}
