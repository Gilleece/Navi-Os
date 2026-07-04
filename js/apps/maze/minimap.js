/* ============================================================
   MAZE.EXE — minimap (desktop / touch)
   A fog-of-war overview in the top-right corner: only corridors
   the player has actually seen are drawn (standing in a cell
   reveals it plus everything in a straight line down its open
   passages). The player is an arrow, characters appear as the
   first letter of their name (S = Scally, H = Homiss, …) once
   their window has been seen, and the exit ring shows once its
   cell is found — dim while the narrative gate holds it flat,
   bright orange when the way down is open.

   Drawn in the level's neon so it recolours with the palette.
   It's a DOM canvas, so it never shows inside immersive-vr —
   in-headset navigation stays by wits alone (by design).
   ============================================================ */
import { $ } from "../../utils.js";

const SIZE = 176;    // css pixels, square
const DPR  = 2;      // supersample for crisp lines

let canvas = null, g = null;
let cells = null, N = 0, CELL = 4, seen = null, goal = null;

export function buildMinimap(M, mazeCells, goalCell){
  if (!canvas){
    canvas = document.createElement("canvas");
    canvas.id = "maze-map";
    canvas.width = SIZE * DPR; canvas.height = SIZE * DPR;
    g = canvas.getContext("2d");
    $("#maze-layer").appendChild(canvas);
  }
  cells = mazeCells;
  N = cells.length;
  CELL = M.CELL;
  goal = goalCell;
  seen = Array.from({ length: N }, () => Array(N).fill(false));   // fresh fog per level
}

/* reveal the player's cell plus everything visible in a straight line
   down each open passage (corridors are one cell wide, so this is what
   the player can actually see from where they stand) */
function reveal(cx, cz){
  seen[cz][cx] = true;
  for (const [d, dx, dz] of [["N",0,-1],["S",0,1],["E",1,0],["W",-1,0]]){
    let x = cx, z = cz;
    while (!cells[z][x][d]){
      x += dx; z += dz;
      if (x < 0 || z < 0 || x >= N || z >= N) break;
      seen[z][x] = true;
    }
  }
}

const clampCell = v => Math.max(0, Math.min(N - 1, v | 0));

/* call once per frame; hides itself in VR and redraws in the level neon */
export function updateMinimap(M){
  if (!canvas || !seen) return;
  if (M.inVR){ canvas.style.display = "none"; return; }
  canvas.style.display = "block";

  const px = M.dolly.position.x, pz = M.dolly.position.z;
  reveal(clampCell(px / CELL), clampCell(pz / CELL));

  const s = (SIZE * DPR) / (N * CELL);            // world units -> canvas px
  const neon = M.theme.neon;
  const nr = (neon >> 16) & 255, ng = (neon >> 8) & 255, nb = neon & 255;

  g.clearRect(0, 0, SIZE * DPR, SIZE * DPR);
  g.fillStyle = "rgba(4,8,10,0.8)";
  g.fillRect(0, 0, SIZE * DPR, SIZE * DPR);

  // revealed floor, then the walls of every revealed cell (shared walls
  // simply draw twice — cheaper than deduping and invisible on screen)
  g.fillStyle = `rgba(${nr},${ng},${nb},0.08)`;
  for (let z = 0; z < N; z++)
    for (let x = 0; x < N; x++)
      if (seen[z][x]) g.fillRect(x * CELL * s, z * CELL * s, CELL * s, CELL * s);

  g.strokeStyle = `rgba(${nr},${ng},${nb},0.85)`;
  g.lineWidth = 2; g.lineCap = "square";
  g.beginPath();
  for (let z = 0; z < N; z++)
    for (let x = 0; x < N; x++){
      if (!seen[z][x]) continue;
      const c = cells[z][x];
      const x0 = x * CELL * s, z0 = z * CELL * s, x1 = (x + 1) * CELL * s, z1 = (z + 1) * CELL * s;
      if (c.N){ g.moveTo(x0, z0); g.lineTo(x1, z0); }
      if (c.S){ g.moveTo(x0, z1); g.lineTo(x1, z1); }
      if (c.W){ g.moveTo(x0, z0); g.lineTo(x0, z1); }
      if (c.E){ g.moveTo(x1, z0); g.lineTo(x1, z1); }
    }
  g.stroke();

  // the exit ring, once its cell has been seen: dim while the narrative
  // gate holds it flat, bright when the way down is open
  if (goal && seen[goal.y][goal.x]){
    const locked = M.gatePending && M.gatePending.length > 0;
    g.strokeStyle = locked ? "rgba(255,122,26,0.35)" : "#ff7a1a";
    g.lineWidth = 3;
    g.beginPath();
    g.arc((goal.x + 0.5) * CELL * s, (goal.y + 0.5) * CELL * s, CELL * s * 0.28, 0, Math.PI * 2);
    g.stroke();
  }

  // characters: first letter of the name, at their window, once seen
  g.font = `bold ${11 * DPR}px 'Share Tech Mono', monospace`;
  g.textAlign = "center"; g.textBaseline = "middle";
  for (const npc of M.npcs || []){
    if (!npc.cell || !seen[npc.cell.y][npc.cell.x]) continue;
    // nudge the letter off the window wall, into the cell it faces
    const lx = (npc.x * 0.6 + (npc.cell.x + 0.5) * CELL * 0.4) * s;
    const lz = (npc.z * 0.6 + (npc.cell.y + 0.5) * CELL * 0.4) * s;
    const letter = npc.character.letter ?? npc.character.name[0];
    g.fillStyle = "rgba(0,0,0,0.75)";
    g.fillRect(lx - 7 * DPR / 2, lz - 7 * DPR / 2, 7 * DPR, 7 * DPR);
    g.fillStyle = "#fff";
    g.fillText(letter, lx, lz + DPR);
  }

  // the player: an arrow at their position, pointing where they face
  // (forward in world space is (-sin yaw, -cos yaw) — see player.js)
  const cx = px * s, cz = pz * s, r = 6 * DPR;
  const dx = -Math.sin(M.yaw), dz = -Math.cos(M.yaw);
  g.fillStyle = "#fff";
  g.beginPath();
  g.moveTo(cx + dx * r, cz + dz * r);
  g.lineTo(cx - dx * r * 0.6 - dz * r * 0.55, cz - dz * r * 0.6 + dx * r * 0.55);
  g.lineTo(cx - dx * r * 0.6 + dz * r * 0.55, cz - dz * r * 0.6 - dx * r * 0.55);
  g.closePath();
  g.fill();
}
