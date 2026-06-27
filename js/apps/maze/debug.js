/* ============================================================
   MAZE.EXE — debug menu
   Dev-only "skip to next level" control, gated by the DEBUG flag
   below. Desktop/touch gets a persistent UI button; VR gets a
   floating panel that appears while holding the left controller
   trigger and is clicked by pointing the right controller at it
   and pulling its trigger.
   ============================================================ */
import { raycastPanel } from "./panel.js";

export const DEBUG = true;   // flip to true to enable the debug menu

const PANEL_W = 480, PANEL_H = 220;
const BTN = { x: 40, y: 76, w: PANEL_W - 80, h: 100 };

let onNextLevel = null;
let panel = null;             // VR floating panel { canvas, ctx, tex, mesh, group }
let rightTriggerPrev = false;

/* ---------- desktop / touch button ---------- */
export function initDebugUI(callback){
  onNextLevel = callback;
  const btn = document.querySelector("#btn-debug-next");
  if (!btn || !DEBUG) return;
  btn.hidden = false;
  btn.addEventListener("click", () => onNextLevel());
}

/* ---------- VR floating panel (built once, only if DEBUG) ---------- */
export function initDebugPanel(three, dolly){
  if (!DEBUG) return;
  const canvas = document.createElement("canvas");
  canvas.width = PANEL_W; canvas.height = PANEL_H;
  const ctx = canvas.getContext("2d");

  const tex = new three.CanvasTexture(canvas);
  const mesh = new three.Mesh(
    new three.PlaneGeometry(0.5, 0.5 * PANEL_H / PANEL_W),
    new three.MeshBasicMaterial({ map: tex, transparent: true, fog: false }));

  const group = new three.Group();
  group.add(mesh);
  group.position.set(0, 1.4, -1.3);   // in front of the dolly origin
  group.visible = false;
  dolly.add(group);

  panel = { canvas, ctx, tex, mesh, group };
  drawDebugPanel(false);
}

function hitButton(uv){
  if (!uv) return false;
  const x = uv.x * PANEL_W, y = uv.y * PANEL_H;
  return x > BTN.x && x < BTN.x + BTN.w && y > BTN.y && y < BTN.y + BTN.h;
}

function drawDebugPanel(hover){
  const g = panel.ctx, W = PANEL_W, H = PANEL_H;
  g.clearRect(0, 0, W, H);
  g.fillStyle = "rgba(8,18,15,0.96)"; g.fillRect(0, 0, W, H);
  g.strokeStyle = "#ff3b3b"; g.lineWidth = 3; g.strokeRect(4, 4, W - 8, H - 8);

  g.textAlign = "center";
  g.fillStyle = "#ff3b3b"; g.font = "26px 'VT323', monospace";
  g.fillText("DEBUG MENU", W / 2, 38);

  g.fillStyle = hover ? "rgba(70,255,142,0.3)" : "rgba(4,8,10,0.6)";
  g.fillRect(BTN.x, BTN.y, BTN.w, BTN.h);
  g.strokeStyle = "#46ff8e"; g.lineWidth = 2; g.strokeRect(BTN.x, BTN.y, BTN.w, BTN.h);

  g.fillStyle = "#cfffe0"; g.font = "28px 'Share Tech Mono', monospace";
  g.textBaseline = "middle";
  g.fillText("NEXT LEVEL ▸", W / 2, BTN.y + BTN.h / 2);

  g.textAlign = "left"; g.textBaseline = "alphabetic";
  panel.tex.needsUpdate = true;
}

/* ---------- VR per-frame input (called from the loop while in VR) ---------- */
export function updateDebugXR(M, three){
  if (!DEBUG || !panel) return;
  const session = M.renderer.xr.getSession && M.renderer.xr.getSession();
  if (!session){ panel.group.visible = false; return; }

  let leftTrigger = false, rightTrigger = false;
  for (const src of session.inputSources){
    const pressed = !!(src.gamepad && src.gamepad.buttons[0] && src.gamepad.buttons[0].pressed);
    if (src.handedness === "left")  leftTrigger  = pressed;
    if (src.handedness === "right") rightTrigger = pressed;
  }

  panel.group.visible = leftTrigger;
  if (!panel.group.visible){ rightTriggerPrev = rightTrigger; return; }

  const pointer = (M.controllers || []).find(c => c.userData.handedness === "right");
  const uv = pointer ? raycastPanel(three, panel, pointer) : null;
  const hover = hitButton(uv);

  if (rightTrigger && !rightTriggerPrev && hover) onNextLevel();
  rightTriggerPrev = rightTrigger;

  drawDebugPanel(hover);
}
