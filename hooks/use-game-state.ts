import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import type { Tile, Position, MatchInfo, LevelGoal, BombCreation } from "@/lib/types";
import {
    createTile,
    getTileAt,
    wouldCreateMatch,
    isBomb,
    getBombExplosionPositions,
    applyGravity,
    getRandomTileType,
    resetTileIdCounter,
    isWoodenTile,
} from "@/lib/game-utils";
import {
    BOMB_VERTICAL,
    BOMB_HORIZONTAL,
    BOMB_AREA,
    ANIMATION,
    POINTS_PER_TILE,
    WOOD_NORMAL,
    WOOD_BROKEN,
} from "@/lib/constants";
import { useMatchDetection } from "./use-match-detection";

type UseGameStateProps = {
    rows: number;
    cols: number;
    availableTileTypes: number[];
    goals: LevelGoal[];
    maxMoves: number;
    woodenTilePositions?: Position[];
    onTilesDestroyed?: (destroyed: Record<number, number>) => void;
    onMoveComplete?: () => void;
};

export function useGameState({
    rows,
    cols,
    availableTileTypes,
    goals,
    maxMoves,
    woodenTilePositions = [],
    onTilesDestroyed,
    onMoveComplete,
}: UseGameStateProps) {
    const [tiles, setTiles] = useState<Tile[]>([]);
    const [score, setScore] = useState(0);
    const [movesUsed, setMovesUsed] = useState(0);
    const [goalProgress, setGoalProgress] = useState<Record<number, number>>({});
    const [selectedTile, setSelectedTile] = useState<Position | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [isFailed, setIsFailed] = useState(false);
    
    // Track if goals were met during animation - will be checked after animations settle
    const goalsMetDuringAnimation = useRef(false);

    // Enhance goals with wooden tiles if present - memoized to prevent infinite loops
    const enhancedGoals = useMemo(() => {
        const enhanced = [...goals];
        if (woodenTilePositions.length > 0) {
            // Check if wooden tile goal already exists
            const hasWoodenGoal = enhanced.some((g) => g.tileType === WOOD_NORMAL);
            if (!hasWoodenGoal) {
                enhanced.push({
                    tileType: WOOD_NORMAL,
                    count: woodenTilePositions.length,
                });
            }
        }
        return enhanced;
    }, [goals, woodenTilePositions.length]);

    const { findMatches, isValidSwap } = useMatchDetection({ rows, cols });

    // Check if all goals are met
    const checkGoalsComplete = useCallback(
        (progress: Record<number, number>) => {
            return enhancedGoals.every((goal) => {
                const current = progress[goal.tileType] || 0;
                return current >= goal.count;
            });
        },
        [enhancedGoals]
    );

    // Initialize the grid
    const initializeGrid = useCallback(() => {
        resetTileIdCounter();
        const initialTiles: Tile[] = [];
        const grid: number[][] = [];

        // Create set of wooden tile positions for quick lookup
        const woodenPositionsSet = new Set(
            woodenTilePositions.map((pos) => `${pos.row},${pos.col}`)
        );

        // Fill grid with regular tiles (wooden tiles will be placed on top)
        for (let row = 0; row < rows; row++) {
            grid[row] = [];
            for (let col = 0; col < cols; col++) {
                // Skip wooden tile positions when creating regular tiles
                if (woodenPositionsSet.has(`${row},${col}`)) {
                    grid[row][col] = -1; // Mark as occupied by wooden tile
                    continue;
                }

                let tileType: number;
                let attempts = 0;
                do {
                    tileType = getRandomTileType(availableTileTypes);
                    attempts++;
                    if (attempts > 50) break;
                } while (wouldCreateMatch(grid, row, col, tileType));

                grid[row][col] = tileType;
                initialTiles.push(createTile(tileType, row, col));
            }
        }

        // Add wooden tiles at their specified positions
        woodenTilePositions.forEach((pos) => {
            initialTiles.push(createTile(WOOD_NORMAL, pos.row, pos.col));
        });

        // Add wooden tiles to goals automatically
        const updatedGoalProgress: Record<number, number> = {};
        if (woodenTilePositions.length > 0) {
            updatedGoalProgress[WOOD_NORMAL] = 0;
        }

        setTiles(initialTiles);
        setScore(0);
        setMovesUsed(0);
        setGoalProgress(updatedGoalProgress);
        setSelectedTile(null);
        setIsAnimating(false);
        setIsComplete(false);
        setIsFailed(false);
        goalsMetDuringAnimation.current = false;
    }, [rows, cols, availableTileTypes, woodenTilePositions]);

    // Initialize on mount
    useEffect(() => {
        initializeGrid();
    }, [initializeGrid]);

    // Update goal progress when tiles are destroyed
    const updateGoalProgress = useCallback(
        (destroyedTiles: Tile[]) => {
            const destroyed: Record<number, number> = {};

            destroyedTiles.forEach((tile) => {
                if (!isBomb(tile.type)) {
                    destroyed[tile.type] = (destroyed[tile.type] || 0) + 1;
                }
            });

            setGoalProgress((prev) => {
                const updated = { ...prev };
                Object.entries(destroyed).forEach(([type, count]) => {
                    const tileType = parseInt(type);
                    updated[tileType] = (updated[tileType] || 0) + count;
                });

                // Track if goals are met - but don't complete yet, wait for animations to finish
                if (checkGoalsComplete(updated)) {
                    goalsMetDuringAnimation.current = true;
                }

                return updated;
            });

            if (onTilesDestroyed) {
                onTilesDestroyed(destroyed);
            }
        },
        [checkGoalsComplete, onTilesDestroyed]
    );

    // Trigger bomb explosion at position
    const triggerBombAtPosition = useCallback(
        async (bombTile: Tile) => {
            setIsAnimating(true);

            const currentTiles = await new Promise<Tile[]>((resolve) => {
                setTiles((prev) => {
                    resolve(prev);
                    return prev;
                });
            });

            const matchedPositions = new Set<string>();
            const processedBombs = new Set<string>();
            const bombQueue = [bombTile];

            // Process bomb chain reactions
            while (bombQueue.length > 0) {
                const bomb = bombQueue.shift()!;
                if (processedBombs.has(bomb.id)) continue;
                processedBombs.add(bomb.id);

                const explosionPositions = getBombExplosionPositions(bomb, rows, cols);
                explosionPositions.forEach((pos) => {
                    matchedPositions.add(`${pos.row},${pos.col}`);

                    const tileAtPos = getTileAt(currentTiles, pos.row, pos.col);
                    if (
                        tileAtPos &&
                        isBomb(tileAtPos.type) &&
                        !processedBombs.has(tileAtPos.id)
                    ) {
                        bombQueue.push(tileAtPos);
                    }
                });
            }

            // Calculate score
            const roundScore = matchedPositions.size * POINTS_PER_TILE;
            setScore((prev) => prev + roundScore);

            // Handle wooden tile damage from adjacent bomb explosions
            const woodenTilesToDamage = new Map<string, Tile>();
            const adjacentOffsets = [
                { row: -1, col: 0 }, // up
                { row: 1, col: 0 },  // down
                { row: 0, col: -1 }, // left
                { row: 0, col: 1 },  // right
            ];

            matchedPositions.forEach((posKey) => {
                const [matchRow, matchCol] = posKey.split(",").map(Number);
                
                // Check all 4 adjacent positions
                adjacentOffsets.forEach(({ row: offsetRow, col: offsetCol }) => {
                    const adjRow = matchRow + offsetRow;
                    const adjCol = matchCol + offsetCol;
                    
                    // Check bounds
                    if (adjRow >= 0 && adjRow < rows && adjCol >= 0 && adjCol < cols) {
                        const adjTile = getTileAt(currentTiles, adjRow, adjCol);
                        
                        if (adjTile && isWoodenTile(adjTile.type)) {
                            const adjKey = `${adjRow},${adjCol}`;
                            // Store the wooden tile to damage
                            if (!woodenTilesToDamage.has(adjKey)) {
                                woodenTilesToDamage.set(adjKey, adjTile);
                            }
                        }
                    }
                });
            });

            // Mark tiles for removal and track destroyed
            const tilesToRemove = new Set<string>();
            const destroyedTiles: Tile[] = [];
            matchedPositions.forEach((posKey) => {
                const [r, c] = posKey.split(",").map(Number);
                const tile = getTileAt(currentTiles, r, c);
                if (tile) {
                    tilesToRemove.add(tile.id);
                    destroyedTiles.push(tile);
                }
            });

            // Damage wooden tiles and track destroyed ones
            const damagedWoodenTiles: Tile[] = [];
            woodenTilesToDamage.forEach((woodTile) => {
                if (woodTile.type === WOOD_NORMAL) {
                    // Normal -> Broken (don't remove, just update type)
                    // DON'T track yet - only count when fully destroyed
                } else if (woodTile.type === WOOD_BROKEN) {
                    // Broken -> Destroyed (remove completely)
                    tilesToRemove.add(woodTile.id);
                    // NOW track as WOOD_NORMAL for goal progress (only when fully destroyed)
                    damagedWoodenTiles.push({ ...woodTile, type: WOOD_NORMAL });
                }
            });

            updateGoalProgress([...destroyedTiles, ...damagedWoodenTiles]);

            // Animate removal and damage wooden tiles
            setTiles((prev) =>
                prev.map((t) => {
                    if (tilesToRemove.has(t.id)) {
                        return { ...t, isRemoving: true };
                    }
                    // Damage wooden tiles: Normal -> Broken
                    const woodTile = Array.from(woodenTilesToDamage.values()).find(
                        (wt) => wt.id === t.id
                    );
                    if (woodTile && woodTile.type === WOOD_NORMAL) {
                        return { ...t, type: WOOD_BROKEN };
                    }
                    return t;
                })
            );

            await new Promise((resolve) => setTimeout(resolve, ANIMATION.REMOVAL_DURATION));

            // Remove and refill
            setTiles((prev) => {
                let newTiles = prev.filter((t) => !tilesToRemove.has(t.id));

                for (let c = 0; c < cols; c++) {
                    const existingInCol = newTiles.filter((t) => t.col === c).length;
                    const tilesNeeded = rows - existingInCol;

                    for (let i = 0; i < tilesNeeded; i++) {
                        const startRow = -(tilesNeeded - i);
                        newTiles.push(
                            createTile(
                                getRandomTileType(availableTileTypes),
                                startRow,
                                c,
                                true
                            )
                        );
                    }
                }

                return newTiles;
            });

            await new Promise((resolve) =>
                requestAnimationFrame(() => resolve(undefined))
            );
            await new Promise((resolve) => setTimeout(resolve, ANIMATION.FRAME_DELAY));

            // Apply gravity
            setTiles((prev) => applyGravity(prev, rows, cols));

            await new Promise((resolve) => setTimeout(resolve, ANIMATION.FALL_SETTLE));

            // Continue with cascading matches
            await processMatches();
        },
        [rows, cols, availableTileTypes, updateGoalProgress]
    );

    // Process matches, gravity, and cascades
    const processMatches = useCallback(
        async (swapPositions?: { from: Position; to: Position }) => {
            let hasMatches = true;
            let isFirstIteration = true;

            while (hasMatches) {
                // Get current tiles state
                const currentTiles = await new Promise<Tile[]>((resolve) => {
                    setTiles((prev) => {
                        resolve(prev);
                        return prev;
                    });
                });

                const matches = findMatches(currentTiles);

                if (matches.length === 0) {
                    hasMatches = false;
                    break;
                }

                // Collect all matched positions and check for bombs
                const matchedPositions = new Set<string>();
                const bombsToExplode: Tile[] = [];
                const bombCreations: BombCreation[] = [];

                // Track which matches have been used for combined bombs (L/T/cross shapes)
                const usedForCombinedBomb = new Set<MatchInfo>();

                // Group matches by tile type for L/T/cross detection
                const matchesByType = new Map<number, MatchInfo[]>();
                matches.forEach((match) => {
                    const existing = matchesByType.get(match.tileType) || [];
                    existing.push(match);
                    matchesByType.set(match.tileType, existing);
                });

                // Helper to find the best bomb position (prefer swap destination)
                const findBombPosition = (
                    positions: Position[],
                    defaultPos: Position
                ): Position => {
                    if (isFirstIteration && swapPositions) {
                        const toInMatch = positions.some(
                            (p) =>
                                p.row === swapPositions.to.row &&
                                p.col === swapPositions.to.col
                        );
                        if (toInMatch) return swapPositions.to;

                        const fromInMatch = positions.some(
                            (p) =>
                                p.row === swapPositions.from.row &&
                                p.col === swapPositions.from.col
                        );
                        if (fromInMatch) return swapPositions.from;
                    }
                    return defaultPos;
                };

                // Check for L/T/cross shapes (matches of same type that intersect)
                matchesByType.forEach((typeMatches) => {
                    if (typeMatches.length < 2) return;

                    for (let i = 0; i < typeMatches.length; i++) {
                        for (let j = i + 1; j < typeMatches.length; j++) {
                            const match1 = typeMatches[i];
                            const match2 = typeMatches[j];

                            if (match1.direction === match2.direction) continue;

                            const hMatch =
                                match1.direction === "horizontal" ? match1 : match2;
                            const vMatch =
                                match1.direction === "vertical" ? match1 : match2;

                            const hRow = hMatch.startRow;
                            const vCol = vMatch.startCol;

                            const intersects =
                                hRow >= vMatch.startRow &&
                                hRow <= vMatch.endRow &&
                                vCol >= hMatch.startCol &&
                                vCol <= hMatch.endCol;

                            if (intersects) {
                                const sharedPos: Position = { row: hRow, col: vCol };
                                const combinedLen =
                                    hMatch.matchLength + vMatch.matchLength - 1;

                                if (combinedLen >= 5) {
                                    const allPositions = [
                                        ...match1.positions,
                                        ...match2.positions,
                                    ];
                                    const bombPos = findBombPosition(
                                        allPositions,
                                        sharedPos
                                    );
                                    bombCreations.push({
                                        position: bombPos,
                                        bombType: BOMB_AREA,
                                    });
                                    usedForCombinedBomb.add(match1);
                                    usedForCombinedBomb.add(match2);
                                }
                            }
                        }
                    }
                });

                // Process individual matches (that weren't used in combined bombs)
                matches.forEach((match) => {
                    if (usedForCombinedBomb.has(match)) {
                        match.positions.forEach((pos) => {
                            matchedPositions.add(`${pos.row},${pos.col}`);
                            const tile = getTileAt(currentTiles, pos.row, pos.col);
                            if (tile && isBomb(tile.type)) {
                                bombsToExplode.push(tile);
                            }
                        });
                        return;
                    }

                    const matchLen = match.matchLength;
                    const posLen = match.positions.length;
                    const effectiveLen = Math.max(matchLen, posLen);

                    const centerIdx = Math.floor(posLen / 2);
                    const centerPos = match.positions[centerIdx] || match.positions[0];

                    if (centerPos) {
                        const bombPos = findBombPosition(match.positions, centerPos);

                        if (effectiveLen >= 5) {
                            bombCreations.push({
                                position: bombPos,
                                bombType: BOMB_AREA,
                            });
                        } else if (effectiveLen === 4) {
                            const bombType =
                                match.direction === "horizontal"
                                    ? BOMB_VERTICAL
                                    : BOMB_HORIZONTAL;
                            bombCreations.push({ position: bombPos, bombType });
                        }
                    }

                    match.positions.forEach((pos) => {
                        matchedPositions.add(`${pos.row},${pos.col}`);

                        const tile = getTileAt(currentTiles, pos.row, pos.col);
                        if (tile && isBomb(tile.type)) {
                            bombsToExplode.push(tile);
                        }
                    });
                });

                // Process bomb explosions (chain reaction)
                const processedBombs = new Set<string>();
                const bombQueue = [...bombsToExplode];

                while (bombQueue.length > 0) {
                    const bomb = bombQueue.shift()!;
                    if (processedBombs.has(bomb.id)) continue;
                    processedBombs.add(bomb.id);

                    const explosionPositions = getBombExplosionPositions(bomb, rows, cols);
                    explosionPositions.forEach((pos) => {
                        matchedPositions.add(`${pos.row},${pos.col}`);

                        const tileAtPos = getTileAt(currentTiles, pos.row, pos.col);
                        if (
                            tileAtPos &&
                            isBomb(tileAtPos.type) &&
                            !processedBombs.has(tileAtPos.id)
                        ) {
                            bombQueue.push(tileAtPos);
                        }
                    });
                }

                // Calculate score
                const roundScore = matchedPositions.size * POINTS_PER_TILE;
                setScore((prev) => prev + roundScore);

                // Handle wooden tile damage from adjacent matches
                const woodenTilesToDamage = new Map<string, Tile>();
                const adjacentOffsets = [
                    { row: -1, col: 0 }, // up
                    { row: 1, col: 0 },  // down
                    { row: 0, col: -1 }, // left
                    { row: 0, col: 1 },  // right
                ];

                matchedPositions.forEach((posKey) => {
                    const [matchRow, matchCol] = posKey.split(",").map(Number);
                    
                    // Check all 4 adjacent positions
                    adjacentOffsets.forEach(({ row: offsetRow, col: offsetCol }) => {
                        const adjRow = matchRow + offsetRow;
                        const adjCol = matchCol + offsetCol;
                        
                        // Check bounds
                        if (adjRow >= 0 && adjRow < rows && adjCol >= 0 && adjCol < cols) {
                            const adjTile = getTileAt(currentTiles, adjRow, adjCol);
                            
                            if (adjTile && isWoodenTile(adjTile.type)) {
                                const adjKey = `${adjRow},${adjCol}`;
                                // Store the wooden tile to damage (avoid damaging same tile multiple times)
                                if (!woodenTilesToDamage.has(adjKey)) {
                                    woodenTilesToDamage.set(adjKey, adjTile);
                                }
                            }
                        }
                    });
                });

                // Mark matched tiles for removal
                const tilesToRemove = new Set<string>();
                const destroyedTiles: Tile[] = [];
                matchedPositions.forEach((posKey) => {
                    const [row, col] = posKey.split(",").map(Number);
                    const tile = getTileAt(currentTiles, row, col);
                    if (tile) {
                        tilesToRemove.add(tile.id);
                        destroyedTiles.push(tile);
                    }
                });

                // Damage wooden tiles and track destroyed ones
                const damagedWoodenTiles: Tile[] = [];
                woodenTilesToDamage.forEach((woodTile) => {
                    if (woodTile.type === WOOD_NORMAL) {
                        // Normal -> Broken (don't remove, just update type)
                        // DON'T track yet - only count when fully destroyed
                    } else if (woodTile.type === WOOD_BROKEN) {
                        // Broken -> Destroyed (remove completely)
                        tilesToRemove.add(woodTile.id);
                        // NOW track as WOOD_NORMAL for goal progress (only when fully destroyed)
                        damagedWoodenTiles.push({ ...woodTile, type: WOOD_NORMAL });
                    }
                });

                updateGoalProgress([...destroyedTiles, ...damagedWoodenTiles]);

                // Animate removal and damage wooden tiles
                setTiles((prev) =>
                    prev.map((t) => {
                        if (tilesToRemove.has(t.id)) {
                            return { ...t, isRemoving: true };
                        }
                        // Damage wooden tiles: Normal -> Broken
                        const woodTile = Array.from(woodenTilesToDamage.values()).find(
                            (wt) => wt.id === t.id
                        );
                        if (woodTile && woodTile.type === WOOD_NORMAL) {
                            return { ...t, type: WOOD_BROKEN };
                        }
                        return t;
                    })
                );

                await new Promise((resolve) =>
                    setTimeout(resolve, ANIMATION.REMOVAL_DURATION)
                );

                // Remove matched tiles and create new ones
                setTiles((prev) => {
                    let newTiles = prev.filter((t) => !tilesToRemove.has(t.id));

                    // Create bombs at their positions
                    bombCreations.forEach(({ position, bombType }) => {
                        const existingTile = newTiles.find(
                            (t) => t.row === position.row && t.col === position.col
                        );
                        if (!existingTile) {
                            const bombTile = createTile(
                                bombType,
                                position.row,
                                position.col,
                                false
                            );
                            newTiles.push(bombTile);
                        }
                    });

                    // Add new tiles above grid
                    for (let col = 0; col < cols; col++) {
                        const existingInCol = newTiles.filter(
                            (t) => t.col === col
                        ).length;
                        const tilesNeeded = rows - existingInCol;

                        for (let i = 0; i < tilesNeeded; i++) {
                            const startRow = -(tilesNeeded - i);
                            const newTile = createTile(
                                getRandomTileType(availableTileTypes),
                                startRow,
                                col,
                                true
                            );
                            newTiles.push(newTile);
                        }
                    }

                    return newTiles;
                });

                // Wait a frame for new tiles to render
                await new Promise((resolve) =>
                    requestAnimationFrame(() => resolve(undefined))
                );
                await new Promise((resolve) =>
                    setTimeout(resolve, ANIMATION.FRAME_DELAY)
                );

                // Apply gravity
                setTiles((prev) => applyGravity(prev, rows, cols));

                // Wait for fall animation
                await new Promise((resolve) =>
                    setTimeout(resolve, ANIMATION.FALL_SETTLE)
                );

                isFirstIteration = false;
            }

            setIsAnimating(false);
            
            // Now that all animations are done, check if goals were met
            if (goalsMetDuringAnimation.current) {
                goalsMetDuringAnimation.current = false;
                setIsComplete(true);
            }
        },
        [rows, cols, availableTileTypes, findMatches, updateGoalProgress]
    );

    // Handle tile click
    const handleTileClick = useCallback(
        (row: number, col: number) => {
            if (isAnimating || isComplete || isFailed) return;

            const currentTiles = tiles;
            const clickedTile = getTileAt(currentTiles, row, col);
            const clickedPos = { row, col };

            // Wooden tiles cannot be selected or swapped
            if (clickedTile && isWoodenTile(clickedTile.type)) {
                setSelectedTile(null);
                return;
            }

            // If clicking on a bomb (with no selection or same bomb selected), explode it
            if (clickedTile && isBomb(clickedTile.type)) {
                if (
                    !selectedTile ||
                    (selectedTile.row === row && selectedTile.col === col)
                ) {
                    setSelectedTile(null);
                    // Clicking bomb counts as a move
                    setMovesUsed((prev) => {
                        const newMoves = prev + 1;
                        if (newMoves >= maxMoves) {
                            // Will check failure after processing
                        }
                        return newMoves;
                    });
                    triggerBombAtPosition(clickedTile).then(() => {
                        onMoveComplete?.();
                    });
                    return;
                }
            }

            // If clicking on the same tile, deselect it
            if (selectedTile && selectedTile.row === row && selectedTile.col === col) {
                setSelectedTile(null);
                return;
            }

            if (!selectedTile) {
                setSelectedTile(clickedPos);
            } else {
                const isAdjacent =
                    (Math.abs(selectedTile.row - row) === 1 &&
                        selectedTile.col === col) ||
                    (Math.abs(selectedTile.col - col) === 1 &&
                        selectedTile.row === row);

                if (isAdjacent) {
                    handleSwap(selectedTile, clickedPos);
                    setSelectedTile(null);
                } else {
                    setSelectedTile(clickedPos);
                }
            }
        },
        [isAnimating, isComplete, isFailed, tiles, selectedTile, maxMoves, triggerBombAtPosition, onMoveComplete]
    );

    // Handle swap between two tiles
    const handleSwap = useCallback(
        async (from: Position, to: Position) => {
            if (isAnimating || isComplete || isFailed) return;

            const currentTiles = tiles;
            const tile1 = getTileAt(currentTiles, from.row, from.col);
            const tile2 = getTileAt(currentTiles, to.row, to.col);

            if (!tile1 || !tile2) return;

            // Cannot swap wooden tiles
            if (isWoodenTile(tile1.type) || isWoodenTile(tile2.type)) {
                return;
            }

            const tile1IsBomb = isBomb(tile1.type);
            const tile2IsBomb = isBomb(tile2.type);
            const hasBomb = tile1IsBomb || tile2IsBomb;

            // Check if valid swap (or if a bomb is involved)
            if (!hasBomb && !isValidSwap(currentTiles, from, to)) {
                // Animate invalid swap
                setIsAnimating(true);

                setTiles((prev) =>
                    prev.map((t) => {
                        if (t.id === tile1.id) return { ...t, row: to.row, col: to.col };
                        if (t.id === tile2.id)
                            return { ...t, row: from.row, col: from.col };
                        return t;
                    })
                );

                await new Promise((resolve) =>
                    setTimeout(resolve, ANIMATION.INVALID_SWAP_DURATION)
                );

                setTiles((prev) =>
                    prev.map((t) => {
                        if (t.id === tile1.id)
                            return { ...t, row: from.row, col: from.col };
                        if (t.id === tile2.id)
                            return { ...t, row: to.row, col: to.col };
                        return t;
                    })
                );

                await new Promise((resolve) =>
                    setTimeout(resolve, ANIMATION.INVALID_SWAP_DURATION)
                );
                setIsAnimating(false);
                return;
            }

            // Count the move
            setMovesUsed((prev) => prev + 1);

            setIsAnimating(true);

            // Perform the swap animation
            setTiles((prev) =>
                prev.map((t) => {
                    if (t.id === tile1.id) return { ...t, row: to.row, col: to.col };
                    if (t.id === tile2.id)
                        return { ...t, row: from.row, col: from.col };
                    return t;
                })
            );

            await new Promise((resolve) =>
                setTimeout(resolve, ANIMATION.SWAP_SETTLE)
            );

            // If a bomb was swapped, trigger its explosion
            if (hasBomb) {
                const updatedTiles = await new Promise<Tile[]>((resolve) => {
                    setTiles((prev) => {
                        resolve(prev);
                        return prev;
                    });
                });

                const bombsToTrigger: Tile[] = [];

                if (tile1IsBomb) {
                    const movedBomb = updatedTiles.find((t) => t.id === tile1.id);
                    if (movedBomb) bombsToTrigger.push(movedBomb);
                }
                if (tile2IsBomb) {
                    const movedBomb = updatedTiles.find((t) => t.id === tile2.id);
                    if (movedBomb) bombsToTrigger.push(movedBomb);
                }

                for (const bomb of bombsToTrigger) {
                    const currentTiles = await new Promise<Tile[]>((resolve) => {
                        setTiles((prev) => {
                            resolve(prev);
                            return prev;
                        });
                    });

                    const matchedPositions = new Set<string>();
                    const processedBombs = new Set<string>();
                    const bombQueue = [bomb];

                    while (bombQueue.length > 0) {
                        const b = bombQueue.shift()!;
                        if (processedBombs.has(b.id)) continue;
                        processedBombs.add(b.id);

                        const explosionPositions = getBombExplosionPositions(b, rows, cols);
                        explosionPositions.forEach((pos) => {
                            matchedPositions.add(`${pos.row},${pos.col}`);

                            const tileAtPos = getTileAt(currentTiles, pos.row, pos.col);
                            if (
                                tileAtPos &&
                                isBomb(tileAtPos.type) &&
                                !processedBombs.has(tileAtPos.id)
                            ) {
                                bombQueue.push(tileAtPos);
                            }
                        });
                    }

                    const roundScore = matchedPositions.size * POINTS_PER_TILE;
                    setScore((prev) => prev + roundScore);

                    // Handle wooden tile damage from adjacent bomb explosions
                    const woodenTilesToDamage = new Map<string, Tile>();
                    const adjacentOffsets = [
                        { row: -1, col: 0 }, // up
                        { row: 1, col: 0 },  // down
                        { row: 0, col: -1 }, // left
                        { row: 0, col: 1 },  // right
                    ];

                    matchedPositions.forEach((posKey) => {
                        const [matchRow, matchCol] = posKey.split(",").map(Number);
                        
                        // Check all 4 adjacent positions
                        adjacentOffsets.forEach(({ row: offsetRow, col: offsetCol }) => {
                            const adjRow = matchRow + offsetRow;
                            const adjCol = matchCol + offsetCol;
                            
                            // Check bounds
                            if (adjRow >= 0 && adjRow < rows && adjCol >= 0 && adjCol < cols) {
                                const adjTile = getTileAt(currentTiles, adjRow, adjCol);
                                
                                if (adjTile && isWoodenTile(adjTile.type)) {
                                    const adjKey = `${adjRow},${adjCol}`;
                                    if (!woodenTilesToDamage.has(adjKey)) {
                                        woodenTilesToDamage.set(adjKey, adjTile);
                                    }
                                }
                            }
                        });
                    });

                    const tilesToRemove = new Set<string>();
                    const destroyedTiles: Tile[] = [];
                    matchedPositions.forEach((posKey) => {
                        const [row, col] = posKey.split(",").map(Number);
                        const tile = getTileAt(currentTiles, row, col);
                        if (tile) {
                            tilesToRemove.add(tile.id);
                            destroyedTiles.push(tile);
                        }
                    });

                    // Damage wooden tiles and track destroyed ones
                    const damagedWoodenTiles: Tile[] = [];
                    woodenTilesToDamage.forEach((woodTile) => {
                        if (woodTile.type === WOOD_NORMAL) {
                            // Normal -> Broken (don't remove, just update type)
                            // DON'T track yet - only count when fully destroyed
                        } else if (woodTile.type === WOOD_BROKEN) {
                            tilesToRemove.add(woodTile.id);
                            // NOW track as WOOD_NORMAL for goal progress (only when fully destroyed)
                            damagedWoodenTiles.push({ ...woodTile, type: WOOD_NORMAL });
                        }
                    });

                    updateGoalProgress([...destroyedTiles, ...damagedWoodenTiles]);

                    setTiles((prev) =>
                        prev.map((t) => {
                            if (tilesToRemove.has(t.id)) {
                                return { ...t, isRemoving: true };
                            }
                            // Damage wooden tiles: Normal -> Broken
                            const woodTile = Array.from(woodenTilesToDamage.values()).find(
                                (wt) => wt.id === t.id
                            );
                            if (woodTile && woodTile.type === WOOD_NORMAL) {
                                return { ...t, type: WOOD_BROKEN };
                            }
                            return t;
                        })
                    );

                    await new Promise((resolve) =>
                        setTimeout(resolve, ANIMATION.REMOVAL_DURATION)
                    );

                    setTiles((prev) => {
                        let newTiles = prev.filter((t) => !tilesToRemove.has(t.id));

                        for (let c = 0; c < cols; c++) {
                            const existingInCol = newTiles.filter(
                                (t) => t.col === c
                            ).length;
                            const tilesNeeded = rows - existingInCol;

                            for (let i = 0; i < tilesNeeded; i++) {
                                const startRow = -(tilesNeeded - i);
                                const newTile = createTile(
                                    getRandomTileType(availableTileTypes),
                                    startRow,
                                    c,
                                    true
                                );
                                newTiles.push(newTile);
                            }
                        }

                        return newTiles;
                    });

                    await new Promise((resolve) =>
                        requestAnimationFrame(() => resolve(undefined))
                    );
                    await new Promise((resolve) =>
                        setTimeout(resolve, ANIMATION.FRAME_DELAY)
                    );

                    setTiles((prev) => applyGravity(prev, rows, cols));

                    await new Promise((resolve) =>
                        setTimeout(resolve, ANIMATION.FALL_SETTLE)
                    );
                }
            }

            // Process any remaining matches
            await processMatches({ from, to });

            onMoveComplete?.();
        },
        [
            isAnimating,
            isComplete,
            isFailed,
            tiles,
            rows,
            cols,
            availableTileTypes,
            isValidSwap,
            processMatches,
            updateGoalProgress,
            onMoveComplete,
        ]
    );

    // Check for failure after moves update
    useEffect(() => {
        if (movesUsed >= maxMoves && !isComplete) {
            // Check again if goals are complete after all animations
            const timer = setTimeout(() => {
                setGoalProgress((prev) => {
                    if (!checkGoalsComplete(prev)) {
                        setIsFailed(true);
                    }
                    return prev;
                });
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [movesUsed, maxMoves, isComplete, checkGoalsComplete]);

    return {
        tiles,
        score,
        movesUsed,
        movesRemaining: maxMoves - movesUsed,
        goalProgress,
        goals: enhancedGoals,
        selectedTile,
        isAnimating,
        isComplete,
        isFailed,
        handleTileClick,
        handleSwap,
        setSelectedTile,
        initializeGrid,
    };
}
