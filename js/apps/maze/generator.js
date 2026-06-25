/* ============================================================
   MAZE.EXE — maze generation
   Pure grid logic (no three.js). Recursive backtracker.
   ============================================================ */

/* world-space centre of grid cell `i`, given the cell size */
export const cellCenter = (i, cell) => (i + 0.5) * cell;

/* recursive backtracker — returns an n×n grid of cells, each
   carrying its four walls (N/S/E/W = 1 when present) */
export function genMaze(n){
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

/* path distance (in cells) from the start (0,0) to every cell,
   walking only through openings. Unreachable cells stay -1
   (can't happen in a perfect maze). Returns an n×n grid. */
export function bfsDistances(cells){
  const n = cells.length;
  const dist = Array.from({length:n}, () => Array(n).fill(-1));
  const DIRS = [["N",0,-1],["S",0,1],["E",1,0],["W",-1,0]];
  const q = [[0,0]]; dist[0][0] = 0;
  for (let head = 0; head < q.length; head++){
    const [x,y] = q[head];
    for (const [d,dx,dy] of DIRS){
      if (cells[y][x][d]) continue;            // wall present -> blocked
      const nx = x+dx, ny = y+dy;
      if (nx<0 || ny<0 || nx>=n || ny>=n || dist[ny][nx] !== -1) continue;
      dist[ny][nx] = dist[y][x] + 1;
      q.push([nx, ny]);
    }
  }
  return dist;
}

/* the sides of a cell that still have a wall, e.g. ["N","E"] */
export const solidSides = c => ["N","S","E","W"].filter(d => c[d]);

/* the sides of cell (x,y) that face outside the grid entirely —
   no neighbouring cell sits across that wall. The recursive
   backtracker only ever carves passages between in-bounds cells,
   so these walls are always solid, and they're the only walls
   whose far side is guaranteed unreachable by the player — safe
   to put a one-way window+character spawn on. */
export function exteriorSides(cells, x, y){
  const n = cells.length;
  const sides = [];
  if (y === 0)     sides.push("N");
  if (y === n - 1) sides.push("S");
  if (x === 0)     sides.push("W");
  if (x === n - 1) sides.push("E");
  return sides;
}

/* pick the goal cell: the dead-end (single opening) furthest by
   path distance from the start (0,0). A perfect maze always has
   at least one dead-end, so reaching the goal there leaves nowhere
   to go but back. Returns {x,y}. */
export function findGoalCell(cells){
  const n = cells.length;
  const dist = bfsDistances(cells);
  let best = {x:n-1, y:n-1}, bestD = -1;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++){
      if (x === 0 && y === 0) continue;        // never the start
      if (solidSides(cells[y][x]).length !== 3) continue;  // dead-end = one opening
      if (dist[y][x] > bestD){ bestD = dist[y][x]; best = {x, y}; }
    }
  return best;
}
