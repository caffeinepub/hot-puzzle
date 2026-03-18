export const FRUITS = ["🍎", "🍊", "🍇", "🍌", "🍓", "🍉", "🍍", "🍒"];
export const FRUIT_COUNT = FRUITS.length;

export const FRUIT_BG = [
  "#a01020", // apple - red
  "#d45800", // orange - orange
  "#6b0d9e", // grape - purple
  "#c8a800", // banana - golden yellow
  "#c0104a", // strawberry - pink
  "#1a7a20", // watermelon - green
  "#b87800", // pineapple - golden
  "#6b0a0a", // cherry - dark red
];

export const FRUIT_SHADOW = [
  "#5a000e",
  "#7a3000",
  "#3d0060",
  "#7a6600",
  "#7a0030",
  "#0a4a10",
  "#705000",
  "#3d0000",
];

export function getGridSize(level: number): number {
  return Math.min(5 + Math.floor((level - 1) / 100), 10);
}

export function getMaxMoves(level: number): number {
  return Math.min(20 + level * 2, 60);
}

export function getLocalTargetScore(level: number, gridSize: number): number {
  return gridSize * gridSize * 10 * Math.max(1, Math.ceil(level / 5));
}

export function generateGrid(size: number): number[][] {
  const grid: number[][] = [];
  for (let r = 0; r < size; r++) {
    grid[r] = [];
    for (let c = 0; c < size; c++) {
      let fruit: number;
      let attempts = 0;
      do {
        fruit = Math.floor(Math.random() * FRUIT_COUNT);
        attempts++;
      } while (
        attempts < 50 &&
        ((c >= 2 && grid[r][c - 1] === fruit && grid[r][c - 2] === fruit) ||
          (r >= 2 && grid[r - 1][c] === fruit && grid[r - 2][c] === fruit))
      );
      grid[r][c] = fruit;
    }
  }
  return grid;
}

export function findMatchGroups(grid: number[][]): Array<[number, number][]> {
  const size = grid.length;
  const groups: Array<[number, number][]> = [];

  // Check rows
  for (let r = 0; r < size; r++) {
    let c = 0;
    while (c < size) {
      if (grid[r][c] < 0) {
        c++;
        continue;
      }
      let end = c;
      while (end + 1 < size && grid[r][end + 1] === grid[r][c]) end++;
      if (end - c + 1 >= 3) {
        const group: [number, number][] = [];
        for (let k = c; k <= end; k++) group.push([r, k]);
        groups.push(group);
      }
      c = end + 1;
    }
  }

  // Check cols
  for (let c = 0; c < size; c++) {
    let r = 0;
    while (r < size) {
      if (grid[r][c] < 0) {
        r++;
        continue;
      }
      let end = r;
      while (end + 1 < size && grid[end + 1][c] === grid[r][c]) end++;
      if (end - r + 1 >= 3) {
        const group: [number, number][] = [];
        for (let k = r; k <= end; k++) group.push([k, c]);
        groups.push(group);
      }
      r = end + 1;
    }
  }

  return groups;
}

export function scoreGroups(groups: Array<[number, number][]>): number {
  let score = 0;
  const counted = new Set<string>();
  for (const group of groups) {
    let unique = 0;
    for (const [r, c] of group) {
      const key = `${r},${c}`;
      if (!counted.has(key)) {
        counted.add(key);
        unique++;
      }
    }
    score += unique * 10;
    if (unique === 4) score += 50;
    else if (unique >= 5) score += 100;
  }
  return score;
}

export function getMatchedCells(
  groups: Array<[number, number][]>,
): Set<string> {
  const cells = new Set<string>();
  for (const group of groups) {
    for (const [r, c] of group) cells.add(`${r},${c}`);
  }
  return cells;
}

export function clearMatchedCells(
  grid: number[][],
  cells: Set<string>,
): number[][] {
  const newGrid = grid.map((row) => [...row]);
  for (const key of cells) {
    const [r, c] = key.split(",").map(Number);
    newGrid[r][c] = -1;
  }
  return newGrid;
}

export function applyGravity(grid: number[][]): number[][] {
  const size = grid.length;
  const newGrid: number[][] = Array.from({ length: size }, () =>
    Array(size).fill(0),
  );

  for (let c = 0; c < size; c++) {
    const col: number[] = [];
    // Collect non-empty cells from bottom up
    for (let r = size - 1; r >= 0; r--) {
      if (grid[r][c] >= 0) col.push(grid[r][c]);
    }
    // Fill empty spaces with new random fruits
    while (col.length < size) {
      col.push(Math.floor(Math.random() * FRUIT_COUNT));
    }
    // Place from bottom
    for (let r = 0; r < size; r++) {
      newGrid[r][c] = col[size - 1 - r];
    }
  }

  return newGrid;
}

export interface ProcessResult {
  grid: number[][];
  scoreGained: number;
  cleared: number;
}

export function processAllMatches(grid: number[][]): ProcessResult {
  let current = grid.map((r) => [...r]);
  let totalScore = 0;
  let totalCleared = 0;
  let iterations = 0;

  while (iterations < 20) {
    const groups = findMatchGroups(current);
    if (groups.length === 0) break;

    const cells = getMatchedCells(groups);
    totalCleared += cells.size;
    totalScore += scoreGroups(groups);
    current = clearMatchedCells(current, cells);
    current = applyGravity(current);
    iterations++;
  }

  return { grid: current, scoreGained: totalScore, cleared: totalCleared };
}

export function hasValidSwap(grid: number[][]): boolean {
  const size = grid.length;
  // Check horizontal swaps
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size - 1; c++) {
      const testGrid = grid.map((row) => [...row]);
      [testGrid[r][c], testGrid[r][c + 1]] = [
        testGrid[r][c + 1],
        testGrid[r][c],
      ];
      if (findMatchGroups(testGrid).length > 0) return true;
    }
  }
  // Check vertical swaps
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size; c++) {
      const testGrid = grid.map((row) => [...row]);
      [testGrid[r][c], testGrid[r + 1][c]] = [
        testGrid[r + 1][c],
        testGrid[r][c],
      ];
      if (findMatchGroups(testGrid).length > 0) return true;
    }
  }
  return false;
}
