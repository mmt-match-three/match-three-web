// Default grid size (can be overridden by level config)
export const DEFAULT_GRID_ROWS = 8;
export const DEFAULT_GRID_COLS = 8;

// Number of regular tile types available
export const TILE_TYPES_COUNT = 6;

// Bomb types (stored in tile.type)
export const BOMB_VERTICAL = 100; // Clears entire column
export const BOMB_HORIZONTAL = 101; // Clears entire row
export const BOMB_AREA = 102; // Clears 5x5 area

// Wooden tile types (stored in tile.type)
export const WOOD_NORMAL = 200; // Normal wooden tile
export const WOOD_BROKEN = 201; // Broken wooden tile

// Stone tile type (stored in tile.type)
export const STONE_TILE = 300; // Indestructible stone tile

// Sprite sheet configuration
export const SPRITE_CONFIG = {
    cols: 4,
    rows: 9,
    sizeScale: 1.02, // Slightly increased to crop edges and prevent bleeding
};

// Sprite positions for regular tiles [col, row] in 0-indexed
export const TILE_SPRITE_POSITIONS: [number, number][] = [
    [0, 0], // Type 0: Column 1, Row 1 (yellow chair)
    [0, 2], // Type 1: Column 1, Row 3 (green ball)
    [0, 3], // Type 2: Column 1, Row 4 (tennis ball)
    [0, 4], // Type 3: Column 1, Row 5 (pink pillow)
    [0, 5], // Type 4: Column 1, Row 6 (red bag)
    [0, 6], // Type 5: Column 1, Row 7 (purple bag)
];

// Sprite positions for bombs [col, row] in 0-indexed
export const BOMB_SPRITE_POSITIONS: Record<number, [number, number]> = {
    [BOMB_VERTICAL]: [2, 8], // Column 3, Row 9
    [BOMB_HORIZONTAL]: [2, 7], // Column 3, Row 8
    [BOMB_AREA]: [0, 7], // Column 1, Row 8
};

// Sprite positions for wooden tiles [col, row] in 0-indexed
export const WOOD_SPRITE_POSITIONS: Record<number, [number, number]> = {
    [WOOD_NORMAL]: [0, 1], // Column 1, Row 2 (normal wooden tile)
    [WOOD_BROKEN]: [1, 1], // Column 2, Row 2 (broken wooden tile)
};

// Sprite positions for stone tiles [col, row] in 0-indexed
export const STONE_SPRITE_POSITIONS: Record<number, [number, number]> = {
    [STONE_TILE]: [3, 7], // Column 4, Row 8 in 1-indexed
};

// Animation timings (in milliseconds)
export const ANIMATION = {
    SWAP_DURATION: 180,
    SWAP_SETTLE: 200,
    INVALID_SWAP_DURATION: 150,
    REMOVAL_DURATION: 140,
    FALL_DURATION: 280,
    FALL_SETTLE: 300,
    FRAME_DELAY: 20,
};

// Swipe detection threshold (in pixels)
export const MIN_SWIPE_DISTANCE = 25;

// Points per tile removed
export const POINTS_PER_TILE = 10;

// Grid visual configuration
export const GRID_GAP = 4; // Gap between tiles in pixels
export const GRID_PADDING = 8; // Padding inside game board
