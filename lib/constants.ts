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
    [0, 0], // Type 0: Column 1, Row 1 (blue mug)
    [0, 2], // Type 1: Column 1, Row 3 (green ball)
    [0, 3], // Type 2: Column 1, Row 4 (pink pillow)
    [0, 4], // Type 3: Column 1, Row 5 (red bag)
    [0, 5], // Type 4: Column 1, Row 6 (purple bag)
    [0, 6], // Type 5: Column 1, Row 7 (yellow armchair)
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

// Packed sprite-sheet metadata for visual effects
export const EFFECT_SPRITE_SHEETS = {
    tilesEffects: {
        imagePath: "/tiles-effects.png",
        width: 689,
        height: 128,
    },
    tilesExplosion: {
        imagePath: "/tiles-explotion.png",
        width: 2560,
        height: 256,
    },
} as const;

// Packed sprite regions (pixel coordinates) for each effect
export const EFFECT_SPRITE_REGIONS = {
    swapTrail: {
        sheet: "tilesEffects",
        x: 162,
        y: 0,
        width: 288,
        height: 66,
        scale: 1.35,
        maxOpacity: 0.5,
    },
    tileBreakFlash: {
        sheet: "tilesEffects",
        x: 0,
        y: 0,
        width: 102,
        height: 102,
    },
    directionalBombPart: {
        sheet: "tilesEffects",
        x: 102,
        y: 0,
        width: 60,
        height: 76,
    },
    directionalBombTrail: {
        sheet: "tilesEffects",
        x: 450,
        y: 3,
        width: 63,
        height: 61,
    },
} as const;

export type PackedSpriteRegion = {
    sheet: keyof typeof EFFECT_SPRITE_SHEETS;
    x: number;
    y: number;
    width: number;
    height: number;
};

// Tile-type specific packed fragments for tile break burst effect
export const TILE_BREAK_FRAGMENT_SPRITES: Record<number, PackedSpriteRegion[]> =
    {
        0: [
            { sheet: "tilesEffects", x: 520, y: 2, width: 24, height: 30 },
            { sheet: "tilesEffects", x: 119, y: 99, width: 24, height: 26 },
            { sheet: "tilesEffects", x: 401, y: 102, width: 20, height: 16 },
            { sheet: "tilesEffects", x: 481, y: 66, width: 16, height: 16 },
            { sheet: "tilesEffects", x: 674, y: 2, width: 11, height: 12 },
        ],
        1: [
            { sheet: "tilesEffects", x: 552, y: 2, width: 24, height: 30 },
            { sheet: "tilesEffects", x: 251, y: 66, width: 24, height: 26 },
            { sheet: "tilesEffects", x: 598, y: 80, width: 20, height: 16 },
            { sheet: "tilesEffects", x: 532, y: 108, width: 16, height: 16 },
            { sheet: "tilesEffects", x: 674, y: 38, width: 11, height: 12 },
        ],
        2: [
            { sheet: "tilesEffects", x: 553, y: 38, width: 24, height: 30 },
            { sheet: "tilesEffects", x: 303, y: 66, width: 24, height: 26 },
            { sheet: "tilesEffects", x: 615, y: 43, width: 20, height: 16 },
            { sheet: "tilesEffects", x: 586, y: 108, width: 16, height: 16 },
            { sheet: "tilesEffects", x: 674, y: 56, width: 11, height: 12 },
        ],
        3: [
            { sheet: "tilesEffects", x: 584, y: 2, width: 24, height: 30 },
            { sheet: "tilesEffects", x: 329, y: 66, width: 24, height: 26 },
            { sheet: "tilesEffects", x: 648, y: 8, width: 20, height: 16 },
            { sheet: "tilesEffects", x: 606, y: 105, width: 16, height: 16 },
            { sheet: "tilesEffects", x: 624, y: 70, width: 11, height: 12 },
        ],
        4: [
            { sheet: "tilesEffects", x: 568, y: 74, width: 24, height: 30 },
            { sheet: "tilesEffects", x: 355, y: 66, width: 24, height: 26 },
            { sheet: "tilesEffects", x: 648, y: 41, width: 20, height: 16 },
            { sheet: "tilesEffects", x: 665, y: 72, width: 16, height: 16 },
            { sheet: "tilesEffects", x: 624, y: 88, width: 11, height: 12 },
        ],
        5: [
            { sheet: "tilesEffects", x: 585, y: 38, width: 24, height: 30 },
            { sheet: "tilesEffects", x: 381, y: 66, width: 24, height: 26 },
            { sheet: "tilesEffects", x: 641, y: 74, width: 20, height: 16 },
            { sheet: "tilesEffects", x: 665, y: 90, width: 16, height: 16 },
            { sheet: "tilesEffects", x: 624, y: 110, width: 11, height: 12 },
        ],
        [WOOD_NORMAL]: [
            { sheet: "tilesEffects", x: 521, y: 38, width: 24, height: 30 },
            { sheet: "tilesEffects", x: 229, y: 96, width: 24, height: 26 },
            { sheet: "tilesEffects", x: 348, y: 102, width: 20, height: 16 },
            { sheet: "tilesEffects", x: 499, y: 66, width: 16, height: 16 },
            { sheet: "tilesEffects", x: 674, y: 20, width: 11, height: 12 },
        ],
        [WOOD_BROKEN]: [
            { sheet: "tilesEffects", x: 521, y: 38, width: 24, height: 30 },
            { sheet: "tilesEffects", x: 229, y: 96, width: 24, height: 26 },
            { sheet: "tilesEffects", x: 348, y: 102, width: 20, height: 16 },
            { sheet: "tilesEffects", x: 499, y: 66, width: 16, height: 16 },
            { sheet: "tilesEffects", x: 674, y: 20, width: 11, height: 12 },
        ],
    };

export const TILE_BREAK_FRAGMENT_CONFIG = {
    minFragments: 2,
    maxFragments: 5,
    fragmentScale: 0.7,
    minInitialSpeedScale: 3,
    maxInitialSpeedScale: 5,
    gravityScale: 25,
    minSpinDegPerSec: -520,
    maxSpinDegPerSec: 520,
    maxOpacity: 0.9,
} as const;

export const TILE_BREAK_FLASH_CONFIG = {
    startScale: 0.4,
    endScale: 1.7,
    fadeInMs: 20,
    fadeOutMs: 200,
    maxOpacity: 0.4,
} as const;

export const AREA_BOMB_EXPLOSION_CONFIG = {
    frameWidth: 256,
    frameHeight: 256,
    frameCount: 10,
    frameDurationMs: 20,
    sizeScale: 13,
    maxOpacity: 0.95,
} as const;

export const DIRECTIONAL_BOMB_BURST_CONFIG = {
    sizeScale: 0.95,
    speedScale: 15,
    maxOpacity: 1,
    trailThicknessScale: 0.62,
    trailMaxLengthScale: 3,
    trailGrowDurationMs: 180,
    trailOpacity: 1,
} as const;

// Animation timings (in milliseconds)
export const ANIMATION = {
    SWAP_DURATION: 110,
    SWAP_SETTLE: 150,
    INVALID_SWAP_DURATION: 150,
    REMOVAL_DURATION: 150,
    FALL_DURATION: 280,
    FALL_SETTLE: 300,
    FRAME_DELAY: 20,
    SWAP_TRAIL_FADE_IN: 10,
    SWAP_TRAIL_DURATION: 250,
    TILE_BREAK_FRAGMENT_SPAWN_DELAY: 15,
    DIRECTIONAL_BOMB_TILE_HIT_STEP_MS: 70,
};

export const BOMB_MERGE_EFFECT_CONFIG = {
    durationMs: ANIMATION.REMOVAL_DURATION,
    tileFadeOutDurationMs: 80,
    bombStartOpacity: 0,
    bombEndOpacity: 1,
    bombStartRotationDeg: 180,
    bombEndRotationDeg: 0,
    bombStartScale: 1.2,
    bombEndScale: 1,
    easing: "ease-out",
} as const;

// Swipe detection threshold (in pixels)
export const MIN_SWIPE_DISTANCE = 25;

// Points per tile removed
export const POINTS_PER_TILE = 10;

// Grid visual configuration
export const GRID_GAP = 4; // Gap between tiles in pixels
export const GRID_PADDING = 8; // Padding inside game board
