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
