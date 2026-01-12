import type { Tile, Position } from "./types";
import {
    BOMB_VERTICAL,
    BOMB_HORIZONTAL,
    BOMB_AREA,
    SPRITE_CONFIG,
    TILE_SPRITE_POSITIONS,
    BOMB_SPRITE_POSITIONS,
} from "./constants";

// Counter for generating unique tile IDs
let tileIdCounter = 0;

/**
 * Reset the tile ID counter (useful for testing or game restart)
 */
export function resetTileIdCounter(): void {
    tileIdCounter = 0;
}

/**
 * Create a new tile with a unique ID
 */
export function createTile(
    type: number,
    row: number,
    col: number,
    isNew = false
): Tile {
    return {
        id: `tile-${tileIdCounter++}`,
        type,
        row,
        col,
        isNew,
    };
}

/**
 * Check if a tile type is a bomb
 */
export function isBomb(tileType: number): boolean {
    return tileType >= 100;
}

/**
 * Convert tiles array to a 2D grid for match finding
 */
export function tilesToGrid(
    tiles: Tile[],
    rows: number,
    cols: number
): number[][] {
    const grid: number[][] = Array(rows)
        .fill(null)
        .map(() => Array(cols).fill(-1));

    tiles.forEach((tile) => {
        if (
            tile.row >= 0 &&
            tile.row < rows &&
            tile.col >= 0 &&
            tile.col < cols &&
            !tile.isRemoving
        ) {
            grid[tile.row][tile.col] = tile.type;
        }
    });

    return grid;
}

/**
 * Get tile at a specific position
 */
export function getTileAt(
    tiles: Tile[],
    row: number,
    col: number
): Tile | undefined {
    return tiles.find((t) => t.row === row && t.col === col && !t.isRemoving);
}

/**
 * Check if placing a tile would create a match during grid initialization
 */
export function wouldCreateMatch(
    grid: number[][],
    row: number,
    col: number,
    tileType: number
): boolean {
    // Check horizontal (left 2 tiles)
    if (col >= 2) {
        const left1 = grid[row]?.[col - 1];
        const left2 = grid[row]?.[col - 2];
        if (left1 === tileType && left2 === tileType) {
            return true;
        }
    }

    // Check vertical (up 2 tiles)
    if (row >= 2) {
        const up1 = grid[row - 1]?.[col];
        const up2 = grid[row - 2]?.[col];
        if (up1 === tileType && up2 === tileType) {
            return true;
        }
    }

    return false;
}

/**
 * Get all positions affected by a bomb explosion
 */
export function getBombExplosionPositions(
    tile: Tile,
    rows: number,
    cols: number
): Position[] {
    const positions: Position[] = [];

    if (tile.type === BOMB_HORIZONTAL) {
        // Clear entire row
        for (let col = 0; col < cols; col++) {
            positions.push({ row: tile.row, col });
        }
    } else if (tile.type === BOMB_VERTICAL) {
        // Clear entire column
        for (let row = 0; row < rows; row++) {
            positions.push({ row, col: tile.col });
        }
    } else if (tile.type === BOMB_AREA) {
        // Clear 5x5 area
        for (let r = tile.row - 2; r <= tile.row + 2; r++) {
            for (let c = tile.col - 2; c <= tile.col + 2; c++) {
                if (r >= 0 && r < rows && c >= 0 && c < cols) {
                    positions.push({ row: r, col: c });
                }
            }
        }
    }

    return positions;
}

/**
 * Get CSS style for a tile's sprite
 */
export function getTileSpriteStyle(tileType: number): React.CSSProperties {
    const { cols, rows, sizeScale } = SPRITE_CONFIG;

    let spriteCol: number;
    let spriteRow: number;

    if (BOMB_SPRITE_POSITIONS[tileType]) {
        [spriteCol, spriteRow] = BOMB_SPRITE_POSITIONS[tileType];
    } else {
        // Regular tiles
        [spriteCol, spriteRow] = TILE_SPRITE_POSITIONS[tileType] || [0, 0];
    }

    // Calculate position using the step approach
    const xPercent = spriteCol * (100 / (cols - 1));
    const yPercent = spriteRow * (100 / (rows - 1));

    return {
        backgroundImage: "url('/tiles.png')",
        backgroundSize: `${cols * 100 * sizeScale}% ${rows * 100 * sizeScale}%`,
        backgroundPosition: `${xPercent}% ${yPercent}%`,
    };
}

/**
 * Check if two positions are adjacent (horizontally or vertically)
 */
export function areAdjacent(pos1: Position, pos2: Position): boolean {
    return (
        (Math.abs(pos1.row - pos2.row) === 1 && pos1.col === pos2.col) ||
        (Math.abs(pos1.col - pos2.col) === 1 && pos1.row === pos2.row)
    );
}

/**
 * Apply gravity to tiles - returns new tiles array with updated positions
 */
export function applyGravity(tiles: Tile[], rows: number, cols: number): Tile[] {
    let updatedTiles = tiles.map((t) => ({ ...t, isNew: false }));

    for (let col = 0; col < cols; col++) {
        const tilesInCol = updatedTiles
            .filter((t) => t.col === col)
            .sort((a, b) => b.row - a.row); // Sort from bottom to top

        let writeRow = rows - 1;
        tilesInCol.forEach((tile) => {
            updatedTiles = updatedTiles.map((t) =>
                t.id === tile.id ? { ...t, row: writeRow } : t
            );
            writeRow--;
        });
    }

    return updatedTiles;
}

/**
 * Generate a random tile type from available types
 */
export function getRandomTileType(availableTypes: number[]): number {
    return availableTypes[Math.floor(Math.random() * availableTypes.length)];
}
