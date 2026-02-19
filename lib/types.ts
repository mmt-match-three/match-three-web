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
    removalDelayMs?: number;
    isMergingToBomb?: boolean;
    mergeTargetRow?: number;
    mergeTargetCol?: number;
    isBombSpawning?: boolean;
    bombSpawnDelayMs?: number;
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
    woodenTiles?: Position[]; // Optional array of positions where wooden tiles spawn
    stoneTiles?: Position[]; // Optional array of positions where stone tiles spawn
    accidentalMatchesChance?: number; // Percentage chance of accidental matches (0-100)
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

export type EffectOrientation = "horizontal" | "vertical";

export type PackedSpriteRegionRef = {
    sheet: "tilesEffects" | "tilesExplosion";
    x: number;
    y: number;
    width: number;
    height: number;
};

export type SwapTrailEffectInstance = {
    id: string;
    type: "swapTrail";
    from: Position;
    to: Position;
    orientation: EffectOrientation;
    createdAt: number;
    durationMs: number;
    fadeInMs: number;
    fadeOutMs: number;
    maxOpacity: number;
};

export type TileBreakFragmentEffectInstance = {
    id: string;
    type: "tileBreakFragment";
    row: number;
    col: number;
    fragment: PackedSpriteRegionRef;
    launchAngleDeg: number;
    initialSpeedScale: number;
    spinDegPerSec: number;
    createdAt: number;
    maxOpacity: number;
};

export type TileBreakFlashEffectInstance = {
    id: string;
    type: "tileBreakFlash";
    row: number;
    col: number;
    rotationDeg: number;
    fadeInMs: number;
    fadeOutMs: number;
    maxOpacity: number;
};

export type AreaBombExplosionEffectInstance = {
    id: string;
    type: "areaBombExplosion";
    row: number;
    col: number;
    createdAt: number;
    frameCount: number;
    frameDurationMs: number;
    maxOpacity: number;
};

export type DirectionalBombPartEffectInstance = {
    id: string;
    type: "directionalBombPart";
    row: number;
    col: number;
    axis: "horizontal" | "vertical";
    directionSign: -1 | 1;
    speedScale: number;
    maxOpacity: number;
};

export type BombSpawnPreviewEffectInstance = {
    id: string;
    type: "bombSpawnPreview";
    row: number;
    col: number;
    bombType: number;
    delayMs: number;
};

export type BoardEffectType =
    | "swapTrail"
    | "tileBreakFragment"
    | "tileBreakFlash"
    | "areaBombExplosion"
    | "directionalBombPart"
    | "bombSpawnPreview";
export type BoardEffectInstance =
    | SwapTrailEffectInstance
    | TileBreakFragmentEffectInstance
    | TileBreakFlashEffectInstance
    | AreaBombExplosionEffectInstance
    | DirectionalBombPartEffectInstance
    | BombSpawnPreviewEffectInstance;
