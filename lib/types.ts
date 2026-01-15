// Position on the game board
export type Position = {
    row: number;
    col: number;
};

// Individual tile on the game board
export type Tile = {
    id: string;
    type: number; // 0-5 for regular tiles, 100+ for bombs
    baseType?: number; // Original tile type for bomb coloring (optional)
    row: number;
    col: number;
    isRemoving?: boolean;
    isNew?: boolean;
};

// Match information with direction for bomb creation
export type MatchInfo = {
    positions: Position[];
    direction: "horizontal" | "vertical";
    matchLength: number;
    tileType: number;
    // Store the full range for geometry-based L/T/cross detection
    startRow: number;
    endRow: number;
    startCol: number;
    endCol: number;
};

// Goal for a level (e.g., break 10 of tile type 0)
export type LevelGoal = {
    tileType: number;
    count: number;
};

// Level configuration
export type Level = {
    id: number;
    dimensions: { rows: number; cols: number };
    maxMoves: number;
    availableTileTypes: number[]; // e.g., [0, 1, 2] for easier, [0,1,2,3,4,5] for harder
    goals: LevelGoal[];
    starThresholds: [number, number, number]; // moves remaining for 1, 2, 3 stars
};

// Progress for a completed level
export type LevelProgress = {
    completed: boolean;
    stars: number; // 0-3
    bestMoves: number; // fewest moves used to complete
};

// Levels data structure from JSON
export type LevelsData = {
    levels: Level[];
};

// Game state during play
export type GameState = {
    tiles: Tile[];
    movesUsed: number;
    goalProgress: Record<number, number>; // tileType -> count destroyed
    isComplete: boolean;
    isFailed: boolean;
};

// Pointer/touch state for swipe handling
export type PointerState = {
    position: Position;
    clientX: number;
    clientY: number;
};

// Bomb creation request
export type BombCreation = {
    position: Position;
    bombType: number;
};
