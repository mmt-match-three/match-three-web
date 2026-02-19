import type { Tile, Position, EffectOrientation } from "./types";
import {
    BOMB_VERTICAL,
    BOMB_HORIZONTAL,
    BOMB_AREA,
    SPRITE_CONFIG,
    TILE_SPRITE_POSITIONS,
    BOMB_SPRITE_POSITIONS,
    WOOD_NORMAL,
    WOOD_BROKEN,
    WOOD_SPRITE_POSITIONS,
    STONE_TILE,
    STONE_SPRITE_POSITIONS,
    EFFECT_SPRITE_SHEETS,
    EFFECT_SPRITE_REGIONS,
    type PackedSpriteRegion,
    GRID_PADDING,
    GRID_GAP,
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
    return tileType >= 100 && tileType < 200;
}

/**
 * Check if a tile type is a wooden tile
 */
export function isWoodenTile(tileType: number): boolean {
    return tileType === WOOD_NORMAL || tileType === WOOD_BROKEN;
}

/**
 * Check if a tile type is a stone tile
 */
export function isStoneTile(tileType: number): boolean {
    return tileType === STONE_TILE;
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
 * This is the simple version used during initial setup (left-to-right, top-to-bottom)
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
 * Check if placing a tile would create a match in ANY direction
 * This comprehensive version checks all possible match configurations
 */
export function wouldCreateMatchComplete(
    grid: number[][],
    row: number,
    col: number,
    tileType: number
): boolean {
    const rows = grid.length;
    const cols = grid[0]?.length || 0;

    // Helper to safely get tile type
    const getTile = (r: number, c: number): number => {
        if (r < 0 || r >= rows || c < 0 || c >= cols) return -1;
        return grid[r]?.[c] ?? -1;
    };

    // Check horizontal matches
    // Pattern: [X][X][new]
    if (col >= 2) {
        const left1 = getTile(row, col - 1);
        const left2 = getTile(row, col - 2);
        if (left1 === tileType && left2 === tileType && left1 !== -1) {
            return true;
        }
    }
    // Pattern: [X][new][X]
    if (col >= 1 && col < cols - 1) {
        const left1 = getTile(row, col - 1);
        const right1 = getTile(row, col + 1);
        if (left1 === tileType && right1 === tileType && left1 !== -1) {
            return true;
        }
    }
    // Pattern: [new][X][X]
    if (col < cols - 2) {
        const right1 = getTile(row, col + 1);
        const right2 = getTile(row, col + 2);
        if (right1 === tileType && right2 === tileType && right1 !== -1) {
            return true;
        }
    }

    // Check vertical matches
    // Pattern: [X][X][new] (vertically)
    if (row >= 2) {
        const up1 = getTile(row - 1, col);
        const up2 = getTile(row - 2, col);
        if (up1 === tileType && up2 === tileType && up1 !== -1) {
            return true;
        }
    }
    // Pattern: [X][new][X] (vertically)
    if (row >= 1 && row < rows - 1) {
        const up1 = getTile(row - 1, col);
        const down1 = getTile(row + 1, col);
        if (up1 === tileType && down1 === tileType && up1 !== -1) {
            return true;
        }
    }
    // Pattern: [new][X][X] (vertically)
    if (row < rows - 2) {
        const down1 = getTile(row + 1, col);
        const down2 = getTile(row + 2, col);
        if (down1 === tileType && down2 === tileType && down1 !== -1) {
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
    } else if (WOOD_SPRITE_POSITIONS[tileType]) {
        [spriteCol, spriteRow] = WOOD_SPRITE_POSITIONS[tileType];
    } else if (STONE_SPRITE_POSITIONS[tileType]) {
        [spriteCol, spriteRow] = STONE_SPRITE_POSITIONS[tileType];
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
 * Get CSS style for a packed visual-effect sprite.
 */
export function getPackedSpriteStyle(
    region: PackedSpriteRegion,
    renderWidth: number,
    renderHeight: number
): React.CSSProperties {
    const sheet = EFFECT_SPRITE_SHEETS[region.sheet];
    const scaleX = renderWidth / region.width;
    const scaleY = renderHeight / region.height;

    return {
        backgroundImage: `url('${sheet.imagePath}')`,
        backgroundPosition: `-${region.x * scaleX}px -${region.y * scaleY}px`,
        backgroundSize: `${sheet.width * scaleX}px ${sheet.height * scaleY}px`,
        backgroundRepeat: "no-repeat",
    };
}

export function getEffectSpriteStyle(
    effectType: keyof typeof EFFECT_SPRITE_REGIONS,
    renderWidth: number,
    renderHeight: number
): React.CSSProperties {
    return getPackedSpriteStyle(
        EFFECT_SPRITE_REGIONS[effectType],
        renderWidth,
        renderHeight,
    );
}

export type SwapTrailPlacement = {
    left: number;
    top: number;
    width: number;
    height: number;
    orientation: EffectOrientation;
};

/**
 * Compute stationary placement for the swap trail centered between two tiles.
 */
export function getSwapTrailPlacement(
    from: Position,
    to: Position,
    cellSize: number
): SwapTrailPlacement {
    const fromCenterX = GRID_PADDING + from.col * (cellSize + GRID_GAP) + cellSize / 2;
    const fromCenterY = GRID_PADDING + from.row * (cellSize + GRID_GAP) + cellSize / 2;
    const toCenterX = GRID_PADDING + to.col * (cellSize + GRID_GAP) + cellSize / 2;
    const toCenterY = GRID_PADDING + to.row * (cellSize + GRID_GAP) + cellSize / 2;

    const centerX = (fromCenterX + toCenterX) / 2;
    const centerY = (fromCenterY + toCenterY) / 2;
    const orientation: EffectOrientation =
        from.row === to.row ? "horizontal" : "vertical";

    const region = EFFECT_SPRITE_REGIONS.swapTrail;
    const scale = region.scale ?? 1;
    const spriteAspectRatio = region.width / region.height;
    const majorAxisLength = cellSize * 2 + GRID_GAP;
    const width = majorAxisLength * scale;
    const height = width / spriteAspectRatio;

    return {
        left: centerX - width / 2,
        top: centerY - height / 2,
        width,
        height,
        orientation,
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
 * Wooden and stone tiles stay in their positions, regular tiles fall through them
 */
export function applyGravity(tiles: Tile[], rows: number, cols: number): Tile[] {
    let updatedTiles = tiles.map((t) => ({ ...t, isNew: false }));

    for (let col = 0; col < cols; col++) {
        const tilesInCol = updatedTiles.filter((t) => t.col === col);
        
        // Separate immovable tiles (wooden and stone) from regular tiles
        const immovableTiles = tilesInCol.filter((t) => isWoodenTile(t.type) || isStoneTile(t.type));
        const regularTiles = tilesInCol.filter((t) => !isWoodenTile(t.type) && !isStoneTile(t.type));
        
        // Sort regular tiles from bottom to top
        regularTiles.sort((a, b) => b.row - a.row);
        
        // Get positions occupied by immovable tiles in this column
        const immovablePositions = new Set(immovableTiles.map((t) => t.row));
        
        // Fill regular tiles from bottom to top, skipping immovable tile positions
        let writeRow = rows - 1;
        regularTiles.forEach((tile) => {
            // Find next available position (skip immovable tiles)
            while (immovablePositions.has(writeRow) && writeRow >= 0) {
                writeRow--;
            }
            
            if (writeRow >= 0) {
                updatedTiles = updatedTiles.map((t) =>
                    t.id === tile.id ? { ...t, row: writeRow } : t
                );
                writeRow--;
            }
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

/**
 * Shuffle an array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Check if swapping two tiles would create a match
 * Helper function for hasValidMoves
 */
function wouldSwapCreateMatch(
    grid: number[][],
    row1: number,
    col1: number,
    row2: number,
    col2: number
): boolean {
    const rows = grid.length;
    const cols = grid[0]?.length || 0;
    
    // Swap the tiles temporarily
    const temp = grid[row1][col1];
    grid[row1][col1] = grid[row2][col2];
    grid[row2][col2] = temp;
    
    // Check if either position now has a match
    let hasMatch = false;
    
    // Check position 1
    const type1 = grid[row1][col1];
    if (type1 >= 0 && type1 < 100) {
        // Check horizontal
        let hCount = 1;
        // Count left
        for (let c = col1 - 1; c >= 0; c--) {
            if (grid[row1][c] === type1) hCount++;
            else break;
        }
        // Count right
        for (let c = col1 + 1; c < cols; c++) {
            if (grid[row1][c] === type1) hCount++;
            else break;
        }
        if (hCount >= 3) hasMatch = true;
        
        // Check vertical
        let vCount = 1;
        // Count up
        for (let r = row1 - 1; r >= 0; r--) {
            if (grid[r][col1] === type1) vCount++;
            else break;
        }
        // Count down
        for (let r = row1 + 1; r < rows; r++) {
            if (grid[r][col1] === type1) vCount++;
            else break;
        }
        if (vCount >= 3) hasMatch = true;
    }
    
    // Check position 2
    const type2 = grid[row2][col2];
    if (type2 >= 0 && type2 < 100) {
        // Check horizontal
        let hCount = 1;
        for (let c = col2 - 1; c >= 0; c--) {
            if (grid[row2][c] === type2) hCount++;
            else break;
        }
        for (let c = col2 + 1; c < cols; c++) {
            if (grid[row2][c] === type2) hCount++;
            else break;
        }
        if (hCount >= 3) hasMatch = true;
        
        // Check vertical
        let vCount = 1;
        for (let r = row2 - 1; r >= 0; r--) {
            if (grid[r][col2] === type2) vCount++;
            else break;
        }
        for (let r = row2 + 1; r < rows; r++) {
            if (grid[r][col2] === type2) vCount++;
            else break;
        }
        if (vCount >= 3) hasMatch = true;
    }
    
    // Swap back
    grid[row2][col2] = grid[row1][col1];
    grid[row1][col1] = temp;
    
    return hasMatch;
}

/**
 * Check if there are any valid moves available on the board
 * Returns true if at least one valid swap exists
 */
export function hasValidMoves(tiles: Tile[], rows: number, cols: number): boolean {
    const grid = tilesToGrid(tiles, rows, cols);
    
    // Check all possible adjacent swaps
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const tile = grid[row][col];
            
            // Skip empty tiles, wooden tiles, and bombs
            if (tile < 0 || tile >= 100) continue;
            
            // Check right swap
            if (col < cols - 1) {
                const rightTile = grid[row][col + 1];
                // Can only swap with regular tiles (not wooden or bombs)
                if (rightTile >= 0 && rightTile < 100) {
                    if (wouldSwapCreateMatch(grid, row, col, row, col + 1)) {
                        return true;
                    }
                }
            }
            
            // Check down swap
            if (row < rows - 1) {
                const downTile = grid[row + 1][col];
                // Can only swap with regular tiles (not wooden or bombs)
                if (downTile >= 0 && downTile < 100) {
                    if (wouldSwapCreateMatch(grid, row, col, row + 1, col)) {
                        return true;
                    }
                }
            }
        }
    }
    
    // Also check if there are any bombs on the board
    // Bombs can always be activated, so they count as valid moves
    for (const tile of tiles) {
        if (isBomb(tile.type)) {
            return true;
        }
    }
    
    return false;
}

/**
 * Reshuffle movable tiles (exclude wooden tiles, stone tiles, and bombs)
 * Returns new tiles array with reshuffled types
 */
export function reshuffleTiles(
    tiles: Tile[],
    rows: number,
    cols: number,
    availableTileTypes: number[],
    maxAttempts = 100
): Tile[] {
    // Separate movable tiles from immovable ones
    const movableTiles = tiles.filter(
        (t) => !isWoodenTile(t.type) && !isStoneTile(t.type) && !isBomb(t.type)
    );
    const immovableTiles = tiles.filter(
        (t) => isWoodenTile(t.type) || isStoneTile(t.type) || isBomb(t.type)
    );

    // If no movable tiles, return as is
    if (movableTiles.length === 0) {
        return tiles;
    }

    let attempts = 0;
    let reshuffledTiles: Tile[] = [];
    let success = false;

    while (attempts < maxAttempts && !success) {
        attempts++;
        
        // Create new types for each movable tile
        const newTypes: number[] = [];
        for (let i = 0; i < movableTiles.length; i++) {
            newTypes.push(getRandomTileType(availableTileTypes));
        }
        
        // Shuffle the types
        const shuffledTypes = shuffleArray(newTypes);
        
        // Create new tiles with shuffled types
        const newMovableTiles = movableTiles.map((tile, index) => ({
            ...tile,
            type: shuffledTypes[index],
        }));
        
        // Combine with immovable tiles
        reshuffledTiles = [...newMovableTiles, ...immovableTiles];
        
        // Check if this configuration has no immediate matches
        const grid = tilesToGrid(reshuffledTiles, rows, cols);
        let hasMatch = false;
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const tileType = grid[row][col];
                if (tileType < 0 || tileType >= 100) continue; // Skip empty or special tiles
                
                // Check horizontal match of 3+
                if (col <= cols - 3) {
                    if (
                        grid[row][col] === grid[row][col + 1] &&
                        grid[row][col] === grid[row][col + 2]
                    ) {
                        hasMatch = true;
                        break;
                    }
                }
                
                // Check vertical match of 3+
                if (row <= rows - 3) {
                    if (
                        grid[row][col] === grid[row + 1][col] &&
                        grid[row][col] === grid[row + 2][col]
                    ) {
                        hasMatch = true;
                        break;
                    }
                }
            }
            if (hasMatch) break;
        }
        
        if (!hasMatch) {
            success = true;
        }
    }
    
    return reshuffledTiles;
}
