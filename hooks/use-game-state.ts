import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import type {
    Tile,
    Position,
    MatchInfo,
    LevelGoal,
    BombCreation,
    BoardEffectInstance,
    BombSpawnPreviewEffectInstance,
} from "@/lib/types";
import {
    createTile,
    getTileAt,
    wouldCreateMatch,
    wouldCreateMatchComplete,
    isBomb,
    getBombExplosionPositions,
    applyGravity,
    getRandomTileType,
    resetTileIdCounter,
    isWoodenTile,
    isStoneTile,
    tilesToGrid,
    hasValidMoves,
    reshuffleTiles,
} from "@/lib/game-utils";
import {
    BOMB_VERTICAL,
    BOMB_HORIZONTAL,
    BOMB_AREA,
    ANIMATION,
    BOMB_MERGE_EFFECT_CONFIG,
    POINTS_PER_TILE,
    WOOD_NORMAL,
    WOOD_BROKEN,
    STONE_TILE,
    EFFECT_SPRITE_REGIONS,
    TILE_BREAK_FRAGMENT_SPRITES,
    TILE_BREAK_FRAGMENT_CONFIG,
    TILE_BREAK_FLASH_CONFIG,
    AREA_BOMB_EXPLOSION_CONFIG,
    DIRECTIONAL_BOMB_BURST_CONFIG,
} from "@/lib/constants";
import { useMatchDetection } from "./use-match-detection";

type UseGameStateProps = {
    rows: number;
    cols: number;
    availableTileTypes: number[];
    goals: LevelGoal[];
    maxMoves: number;
    woodenTilePositions?: Position[];
    stoneTilePositions?: Position[];
    accidentalMatchesChance?: number;
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
    stoneTilePositions = [],
    accidentalMatchesChance = 0,
    onTilesDestroyed,
    onMoveComplete,
}: UseGameStateProps) {
    const [tiles, setTiles] = useState<Tile[]>([]);
    const [score, setScore] = useState(0);
    const [movesUsed, setMovesUsed] = useState(0);
    const [goalProgress, setGoalProgress] = useState<Record<number, number>>(
        {},
    );
    const [selectedTile, setSelectedTile] = useState<Position | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [isFailed, setIsFailed] = useState(false);
    const [isReshuffling, setIsReshuffling] = useState(false);
    const [swappingTileIds, setSwappingTileIds] = useState<string[]>([]);
    const [activeEffects, setActiveEffects] = useState<BoardEffectInstance[]>(
        [],
    );

    // Track if goals were met during animation - will be checked after animations settle
    const goalsMetDuringAnimation = useRef(false);
    const effectIdCounterRef = useRef(0);
    const effectTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    // Enhance goals with wooden tiles if present - memoized to prevent infinite loops
    const enhancedGoals = useMemo(() => {
        const enhanced = [...goals];
        if (woodenTilePositions.length > 0) {
            // Check if wooden tile goal already exists
            const hasWoodenGoal = enhanced.some(
                (g) => g.tileType === WOOD_NORMAL,
            );
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

    useEffect(() => {
        return () => {
            effectTimeoutsRef.current.forEach((timeoutId) => {
                clearTimeout(timeoutId);
            });
            effectTimeoutsRef.current = [];
        };
    }, []);

    // Helper function to get a random tile type that respects accidentalMatchesChance
    const getSmartTileType = useCallback(
        (
            currentTiles: Tile[],
            targetRow: number,
            targetCol: number,
        ): number => {
            let tileType: number;
            let attempts = 0;
            const maxAttempts = 50;

            do {
                tileType = getRandomTileType(availableTileTypes);
                attempts++;
                if (attempts > maxAttempts) break;

                // Build a temporary grid to check for matches
                const tempGrid = tilesToGrid(currentTiles, rows, cols);

                // Check if tile would create a match at this position (using comprehensive check)
                const wouldMatch = wouldCreateMatchComplete(
                    tempGrid,
                    targetRow,
                    targetCol,
                    tileType,
                );

                if (wouldMatch) {
                    // Roll a random chance to allow the match
                    const randomChance = Math.random() * 100;
                    if (randomChance < accidentalMatchesChance) {
                        // Allow the match based on the chance
                        break;
                    }
                } else {
                    // No match, use this tile
                    break;
                }
            } while (attempts < maxAttempts);

            return tileType;
        },
        [availableTileTypes, rows, cols, accidentalMatchesChance],
    );

    // Check for valid moves and reshuffle if necessary
    const checkAndReshuffleIfNeeded = useCallback(async () => {
        // Don't check if game is over or animating
        if (isComplete || isFailed || isAnimating) return;

        // Get current tiles
        const currentTiles = await new Promise<Tile[]>((resolve) => {
            setTiles((prev) => {
                resolve(prev);
                return prev;
            });
        });

        // Check if there are valid moves
        if (!hasValidMoves(currentTiles, rows, cols)) {
            console.log("No valid moves detected, reshuffling...");
            setIsReshuffling(true);
            setIsAnimating(true);

            // Wait a moment before reshuffling so player can see the state
            await new Promise((resolve) => setTimeout(resolve, 500));

            // Reshuffle tiles
            setTiles((prev) => {
                const reshuffled = reshuffleTiles(
                    prev,
                    rows,
                    cols,
                    availableTileTypes,
                );
                return reshuffled;
            });

            // Wait for reshuffle animation
            await new Promise((resolve) => setTimeout(resolve, 600));

            setIsReshuffling(false);
            setIsAnimating(false);
        }
    }, [rows, cols, availableTileTypes, isComplete, isFailed, isAnimating]);

    // Check if all goals are met
    const checkGoalsComplete = useCallback(
        (progress: Record<number, number>) => {
            return enhancedGoals.every((goal) => {
                const current = progress[goal.tileType] || 0;
                return current >= goal.count;
            });
        },
        [enhancedGoals],
    );

    // Initialize the grid
    const initializeGrid = useCallback(() => {
        resetTileIdCounter();
        const initialTiles: Tile[] = [];
        const grid: number[][] = [];

        // Create set of wooden and stone tile positions for quick lookup
        const woodenPositionsSet = new Set(
            woodenTilePositions.map((pos) => `${pos.row},${pos.col}`),
        );
        const stonePositionsSet = new Set(
            stoneTilePositions.map((pos) => `${pos.row},${pos.col}`),
        );

        // Fill grid with regular tiles (wooden and stone tiles will be placed on top)
        for (let row = 0; row < rows; row++) {
            grid[row] = [];
            for (let col = 0; col < cols; col++) {
                // Skip wooden and stone tile positions when creating regular tiles
                if (
                    woodenPositionsSet.has(`${row},${col}`) ||
                    stonePositionsSet.has(`${row},${col}`)
                ) {
                    grid[row][col] = -1; // Mark as occupied by immovable tile
                    continue;
                }

                let tileType: number;
                let attempts = 0;
                do {
                    tileType = getRandomTileType(availableTileTypes);
                    attempts++;
                    if (attempts > 50) break;

                    // Check if tile would create a match
                    const wouldMatch = wouldCreateMatch(
                        grid,
                        row,
                        col,
                        tileType,
                    );

                    // During initialization, NEVER allow matches regardless of accidentalMatchesChance
                    // accidentalMatchesChance only applies to tiles falling in during gameplay
                    if (!wouldMatch) {
                        // No match, use this tile
                        break;
                    }
                } while (attempts < 50);

                grid[row][col] = tileType;
                initialTiles.push(createTile(tileType, row, col));
            }
        }

        // Add wooden tiles at their specified positions
        woodenTilePositions.forEach((pos) => {
            initialTiles.push(createTile(WOOD_NORMAL, pos.row, pos.col));
        });

        // Add stone tiles at their specified positions
        stoneTilePositions.forEach((pos) => {
            initialTiles.push(createTile(STONE_TILE, pos.row, pos.col));
        });

        // Add wooden tiles to goals automatically (stone tiles are NOT added to goals)
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
        setIsReshuffling(false);
        setSwappingTileIds([]);
        setActiveEffects([]);
        effectTimeoutsRef.current.forEach((timeoutId) =>
            clearTimeout(timeoutId),
        );
        effectTimeoutsRef.current = [];
        goalsMetDuringAnimation.current = false;
    }, [
        rows,
        cols,
        availableTileTypes,
        woodenTilePositions,
        stoneTilePositions,
        accidentalMatchesChance,
    ]);

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
        [checkGoalsComplete, onTilesDestroyed],
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

            const { positionHitDelayMs, bombExplosionEvents } =
                collectBombPropagation([{ bomb: bombTile, delayMs: 0 }], currentTiles);
            scheduleBombVisualEffects(bombExplosionEvents);
            const matchedPositions = new Set(positionHitDelayMs.keys());

            // Calculate score
            const roundScore = matchedPositions.size * POINTS_PER_TILE;
            setScore((prev) => prev + roundScore);

            // Handle wooden tile damage - only tiles directly in explosion range
            const woodenTilesToDamage = new Map<string, Tile>();

            // Mark tiles for removal and track destroyed
            // Wooden tiles should not be destroyed directly - they take damage instead
            // Stone tiles are indestructible and should be completely skipped
            const tilesToRemove = new Set<string>();
            const removalDelayByTileId = new Map<string, number>();
            const destroyedTiles: Tile[] = [];
            matchedPositions.forEach((posKey) => {
                const [r, c] = posKey.split(",").map(Number);
                const tile = getTileAt(currentTiles, r, c);
                if (
                    tile &&
                    !isWoodenTile(tile.type) &&
                    !isStoneTile(tile.type)
                ) {
                    tilesToRemove.add(tile.id);
                    destroyedTiles.push(tile);
                    const hitDelay = positionHitDelayMs.get(posKey) ?? 0;
                    const previousDelay = removalDelayByTileId.get(tile.id);
                    if (previousDelay === undefined || hitDelay < previousDelay) {
                        removalDelayByTileId.set(tile.id, hitDelay);
                    }
                } else if (tile && isWoodenTile(tile.type)) {
                    // Wooden tiles in explosion area should be damaged, not destroyed
                    const woodKey = `${r},${c}`;
                    if (!woodenTilesToDamage.has(woodKey)) {
                        woodenTilesToDamage.set(woodKey, tile);
                    }
                }
                // Stone tiles are skipped entirely - they cannot be damaged or destroyed
            });

            // Damage wooden tiles and track destroyed ones
            const damagedWoodenTiles: Tile[] = [];
            const woodenTilesForFragments = Array.from(
                woodenTilesToDamage.values(),
            );
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
                        return {
                            ...t,
                            isRemoving: true,
                            removalDelayMs: removalDelayByTileId.get(t.id) ?? 0,
                        };
                    }
                    // Damage wooden tiles: Normal -> Broken
                    const woodTile = Array.from(
                        woodenTilesToDamage.values(),
                    ).find((wt) => wt.id === t.id);
                    if (woodTile && woodTile.type === WOOD_NORMAL) {
                        return { ...t, type: WOOD_BROKEN, removalDelayMs: undefined };
                    }
                    return { ...t, removalDelayMs: undefined };
                }),
            );

            const tilesForFragmentEffects = [
                ...destroyedTiles.map((tile) => ({
                    ...tile,
                    removalDelayMs: removalDelayByTileId.get(tile.id) ?? 0,
                })),
                ...woodenTilesForFragments.map((tile) => ({
                    ...tile,
                    removalDelayMs:
                        positionHitDelayMs.get(`${tile.row},${tile.col}`) ?? 0,
                })),
            ];
            await new Promise((resolve) =>
                setTimeout(resolve, ANIMATION.TILE_BREAK_FRAGMENT_SPAWN_DELAY),
            );
            enqueueTileBreakFragments(tilesForFragmentEffects);
            const maxRemovalDelayMs =
                removalDelayByTileId.size > 0
                    ? Math.max(...removalDelayByTileId.values())
                    : 0;
            await new Promise((resolve) =>
                setTimeout(
                    resolve,
                    Math.max(
                        0,
                        ANIMATION.REMOVAL_DURATION -
                            ANIMATION.TILE_BREAK_FRAGMENT_SPAWN_DELAY +
                            maxRemovalDelayMs,
                    ),
                ),
            );

            // Remove and refill
            setTiles((prev) => {
                let newTiles = prev.filter((t) => !tilesToRemove.has(t.id));

                // After removing tiles, apply gravity to see where new tiles will land
                const afterGravity = applyGravity(newTiles, rows, cols);

                // Now create new tiles for empty positions
                for (let c = 0; c < cols; c++) {
                    const existingInCol = afterGravity.filter(
                        (t) => t.col === c,
                    ).length;
                    const tilesNeeded = rows - existingInCol;

                    // Find which rows will be filled (from top)
                    const occupiedRows = new Set(
                        afterGravity
                            .filter((t) => t.col === c)
                            .map((t) => t.row),
                    );
                    const emptyRows: number[] = [];
                    for (let r = 0; r < rows; r++) {
                        if (!occupiedRows.has(r)) {
                            emptyRows.push(r);
                        }
                    }

                    // Create tiles for each empty position, checking for matches
                    for (let i = 0; i < tilesNeeded; i++) {
                        const startRow = -(tilesNeeded - i);
                        const finalRow = emptyRows[i];

                        // Get a smart tile type that respects accidentalMatchesChance
                        const tileType = getSmartTileType(
                            afterGravity,
                            finalRow,
                            c,
                        );

                        const newTile = createTile(tileType, startRow, c, true);
                        newTiles.push(newTile);
                        // Update afterGravity simulation for next tile
                        afterGravity.push({ ...newTile, row: finalRow });
                    }
                }

                return newTiles;
            });

            await new Promise((resolve) =>
                requestAnimationFrame(() => resolve(undefined)),
            );
            await new Promise((resolve) =>
                setTimeout(resolve, ANIMATION.FRAME_DELAY),
            );

            // Apply gravity
            setTiles((prev) => applyGravity(prev, rows, cols));

            await new Promise((resolve) =>
                setTimeout(resolve, ANIMATION.FALL_SETTLE),
            );

            // Continue with cascading matches
            await processMatches();

            // Check if reshuffle is needed
            await checkAndReshuffleIfNeeded();
        },
        [
            rows,
            cols,
            availableTileTypes,
            updateGoalProgress,
            checkAndReshuffleIfNeeded,
        ],
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
                const positionHitDelayMs = new Map<string, number>();
                const bombsToExplode: Tile[] = [];
                const bombCreations: BombCreation[] = [];
                const bombCreationByPosKey = new Map<string, BombCreation>();
                const mergeTargetBySourcePosKey = new Map<string, Position>();

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
                    defaultPos: Position,
                ): Position => {
                    if (isFirstIteration && swapPositions) {
                        const toInMatch = positions.some(
                            (p) =>
                                p.row === swapPositions.to.row &&
                                p.col === swapPositions.to.col,
                        );
                        if (toInMatch) return swapPositions.to;

                        const fromInMatch = positions.some(
                            (p) =>
                                p.row === swapPositions.from.row &&
                                p.col === swapPositions.from.col,
                        );
                        if (fromInMatch) return swapPositions.from;
                    }
                    return defaultPos;
                };
                const addBombCreation = (
                    bombType: number,
                    bombPos: Position,
                    sourcePositions: Position[],
                ) => {
                    const bombPosKey = `${bombPos.row},${bombPos.col}`;
                    if (!bombCreationByPosKey.has(bombPosKey)) {
                        const creation = { position: bombPos, bombType };
                        bombCreationByPosKey.set(bombPosKey, creation);
                        bombCreations.push(creation);
                    }
                    sourcePositions.forEach((pos) => {
                        const sourceKey = `${pos.row},${pos.col}`;
                        if (sourceKey === bombPosKey) return;
                        if (!mergeTargetBySourcePosKey.has(sourceKey)) {
                            mergeTargetBySourcePosKey.set(sourceKey, bombPos);
                        }
                    });
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
                                match1.direction === "horizontal"
                                    ? match1
                                    : match2;
                            const vMatch =
                                match1.direction === "vertical"
                                    ? match1
                                    : match2;

                            const hRow = hMatch.startRow;
                            const vCol = vMatch.startCol;

                            const intersects =
                                hRow >= vMatch.startRow &&
                                hRow <= vMatch.endRow &&
                                vCol >= hMatch.startCol &&
                                vCol <= hMatch.endCol;

                            if (intersects) {
                                const sharedPos: Position = {
                                    row: hRow,
                                    col: vCol,
                                };
                                const combinedLen =
                                    hMatch.matchLength + vMatch.matchLength - 1;

                                if (combinedLen >= 5) {
                                    const allPositions = [
                                        ...match1.positions,
                                        ...match2.positions,
                                    ];
                                    const bombPos = findBombPosition(
                                        allPositions,
                                        sharedPos,
                                    );
                                    addBombCreation(
                                        BOMB_AREA,
                                        bombPos,
                                        allPositions,
                                    );
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
                            const tile = getTileAt(
                                currentTiles,
                                pos.row,
                                pos.col,
                            );
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
                    const centerPos =
                        match.positions[centerIdx] || match.positions[0];

                    if (centerPos) {
                        const bombPos = findBombPosition(
                            match.positions,
                            centerPos,
                        );

                        if (effectiveLen >= 5) {
                            addBombCreation(BOMB_AREA, bombPos, match.positions);
                        } else if (effectiveLen === 4) {
                            const bombType =
                                match.direction === "horizontal"
                                    ? BOMB_VERTICAL
                                    : BOMB_HORIZONTAL;
                            addBombCreation(bombType, bombPos, match.positions);
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

                // Process bomb explosions (chain reaction) with travel delay propagation
                const initialBombs = bombsToExplode.map((bomb) => ({
                    bomb,
                    delayMs: positionHitDelayMs.get(`${bomb.row},${bomb.col}`) ?? 0,
                }));
                const { positionHitDelayMs: bombHitDelays, bombExplosionEvents } =
                    collectBombPropagation(initialBombs, currentTiles);
                scheduleBombVisualEffects(bombExplosionEvents);
                bombHitDelays.forEach((delayMs, posKey) => {
                    matchedPositions.add(posKey);
                    const existingDelay = positionHitDelayMs.get(posKey);
                    if (existingDelay === undefined || delayMs < existingDelay) {
                        positionHitDelayMs.set(posKey, delayMs);
                    }
                });

                // Calculate score
                const roundScore = matchedPositions.size * POINTS_PER_TILE;
                setScore((prev) => prev + roundScore);

                // Handle wooden tile damage from adjacent matches (for regular matches)
                const woodenTilesToDamage = new Map<string, Tile>();
                const adjacentOffsets = [
                    { row: -1, col: 0 }, // up
                    { row: 1, col: 0 }, // down
                    { row: 0, col: -1 }, // left
                    { row: 0, col: 1 }, // right
                ];

                matchedPositions.forEach((posKey) => {
                    const [matchRow, matchCol] = posKey.split(",").map(Number);

                    // Check all 4 adjacent positions
                    adjacentOffsets.forEach(
                        ({ row: offsetRow, col: offsetCol }) => {
                            const adjRow = matchRow + offsetRow;
                            const adjCol = matchCol + offsetCol;

                            // Check bounds
                            if (
                                adjRow >= 0 &&
                                adjRow < rows &&
                                adjCol >= 0 &&
                                adjCol < cols
                            ) {
                                const adjTile = getTileAt(
                                    currentTiles,
                                    adjRow,
                                    adjCol,
                                );

                                if (adjTile && isWoodenTile(adjTile.type)) {
                                    const adjKey = `${adjRow},${adjCol}`;
                                    // Store the wooden tile to damage (avoid damaging same tile multiple times)
                                    if (!woodenTilesToDamage.has(adjKey)) {
                                        woodenTilesToDamage.set(
                                            adjKey,
                                            adjTile,
                                        );
                                    }
                                }
                            }
                        },
                    );
                });

                // Mark matched tiles for removal
                // Wooden tiles should not be destroyed directly - they take damage instead
                // Stone tiles are indestructible and should be completely skipped
                const tilesToRemove = new Set<string>();
                const removalDelayByTileId = new Map<string, number>();
                const destroyedTiles: Tile[] = [];
                const mergeSourcePosKeys = new Set<string>();
                matchedPositions.forEach((posKey) => {
                    const [row, col] = posKey.split(",").map(Number);
                    const tile = getTileAt(currentTiles, row, col);
                    if (
                        tile &&
                        !isWoodenTile(tile.type) &&
                        !isStoneTile(tile.type)
                    ) {
                        if (bombCreationByPosKey.has(posKey)) {
                            return;
                        }
                        tilesToRemove.add(tile.id);
                        destroyedTiles.push(tile);
                        if (mergeTargetBySourcePosKey.has(posKey)) {
                            mergeSourcePosKeys.add(posKey);
                        }
                        const hitDelay = positionHitDelayMs.get(posKey) ?? 0;
                        const previousDelay = removalDelayByTileId.get(tile.id);
                        if (previousDelay === undefined || hitDelay < previousDelay) {
                            removalDelayByTileId.set(tile.id, hitDelay);
                        }
                    } else if (tile && isWoodenTile(tile.type)) {
                        // Wooden tiles in explosion area should be damaged, not destroyed
                        const woodKey = `${row},${col}`;
                        if (!woodenTilesToDamage.has(woodKey)) {
                            woodenTilesToDamage.set(woodKey, tile);
                        }
                    }
                    // Stone tiles are skipped entirely - they cannot be damaged or destroyed
                });

                // Damage wooden tiles and track destroyed ones
                const damagedWoodenTiles: Tile[] = [];
                const woodenTilesForFragments = Array.from(
                    woodenTilesToDamage.values(),
                );
                woodenTilesToDamage.forEach((woodTile) => {
                    if (woodTile.type === WOOD_NORMAL) {
                        // Normal -> Broken (don't remove, just update type)
                        // DON'T track yet - only count when fully destroyed
                    } else if (woodTile.type === WOOD_BROKEN) {
                        // Broken -> Destroyed (remove completely)
                        tilesToRemove.add(woodTile.id);
                        // NOW track as WOOD_NORMAL for goal progress (only when fully destroyed)
                        damagedWoodenTiles.push({
                            ...woodTile,
                            type: WOOD_NORMAL,
                        });
                    }
                });

                updateGoalProgress([...destroyedTiles, ...damagedWoodenTiles]);
                enqueueBombSpawnPreview(bombCreations, positionHitDelayMs);

                // Animate removal and damage wooden tiles
                setTiles((prev) =>
                    prev.map((t) => {
                        const tilePosKey = `${t.row},${t.col}`;
                        const bombCreation = bombCreationByPosKey.get(tilePosKey);
                        if (bombCreation) {
                            return {
                                ...t,
                                isRemoving: false,
                                removalDelayMs: undefined,
                                isMergingToBomb: false,
                                mergeTargetRow: undefined,
                                mergeTargetCol: undefined,
                                isBombSpawning: true,
                                bombSpawnDelayMs:
                                    positionHitDelayMs.get(tilePosKey) ?? 0,
                            };
                        }
                        if (tilesToRemove.has(t.id)) {
                            const mergeTarget = mergeTargetBySourcePosKey.get(
                                tilePosKey,
                            );
                            return {
                                ...t,
                                isRemoving: true,
                                removalDelayMs: removalDelayByTileId.get(t.id) ?? 0,
                                isMergingToBomb: !!mergeTarget,
                                mergeTargetRow: mergeTarget?.row,
                                mergeTargetCol: mergeTarget?.col,
                                isBombSpawning: false,
                                bombSpawnDelayMs: undefined,
                            };
                        }
                        // Damage wooden tiles: Normal -> Broken
                        const woodTile = Array.from(
                            woodenTilesToDamage.values(),
                        ).find((wt) => wt.id === t.id);
                        if (woodTile && woodTile.type === WOOD_NORMAL) {
                            return {
                                ...t,
                                type: WOOD_BROKEN,
                                removalDelayMs: undefined,
                                isMergingToBomb: false,
                                mergeTargetRow: undefined,
                                mergeTargetCol: undefined,
                                isBombSpawning: false,
                                bombSpawnDelayMs: undefined,
                            };
                        }
                        return {
                            ...t,
                            removalDelayMs: undefined,
                            isMergingToBomb: false,
                            mergeTargetRow: undefined,
                            mergeTargetCol: undefined,
                            isBombSpawning: false,
                            bombSpawnDelayMs: undefined,
                        };
                    }),
                );

                const tilesForFragmentEffects = [
                    ...destroyedTiles
                        .filter(
                            (tile) =>
                                !mergeSourcePosKeys.has(`${tile.row},${tile.col}`),
                        )
                        .map((tile) => ({
                            ...tile,
                            removalDelayMs: removalDelayByTileId.get(tile.id) ?? 0,
                        })),
                    ...woodenTilesForFragments.map((tile) => ({
                        ...tile,
                        removalDelayMs:
                            positionHitDelayMs.get(`${tile.row},${tile.col}`) ?? 0,
                    })),
                ];
                await new Promise((resolve) =>
                    setTimeout(resolve, ANIMATION.TILE_BREAK_FRAGMENT_SPAWN_DELAY),
                );
                enqueueTileBreakFragments(tilesForFragmentEffects);
                const maxRemovalDelayMs =
                    removalDelayByTileId.size > 0
                        ? Math.max(...removalDelayByTileId.values())
                        : 0;
                await new Promise((resolve) =>
                    setTimeout(
                        resolve,
                        Math.max(
                            0,
                            ANIMATION.REMOVAL_DURATION -
                                ANIMATION.TILE_BREAK_FRAGMENT_SPAWN_DELAY +
                                maxRemovalDelayMs,
                        ),
                    ),
                );

                // Remove matched tiles and create new ones
                setTiles((prev) => {
                    let newTiles: Tile[] = prev
                        .filter((t) => !tilesToRemove.has(t.id))
                        .map((t): Tile => ({
                            ...t,
                            isMergingToBomb: undefined,
                            mergeTargetRow: undefined,
                            mergeTargetCol: undefined,
                            isBombSpawning: undefined,
                            bombSpawnDelayMs: undefined,
                            removalDelayMs: undefined,
                        }));

                    // Create bombs at their positions
                    bombCreations.forEach(({ position, bombType }) => {
                        const existingTile = newTiles.find(
                            (t) =>
                                t.row === position.row &&
                                t.col === position.col,
                        );
                        if (existingTile) {
                            existingTile.type = bombType;
                            existingTile.isBombSpawning = undefined;
                            existingTile.bombSpawnDelayMs = undefined;
                        } else {
                            const bombTile = createTile(
                                bombType,
                                position.row,
                                position.col,
                                false,
                            );
                            newTiles.push(bombTile);
                        }
                    });

                    // Add new tiles above grid
                    // First, simulate gravity to know where new tiles will land
                    const afterGravity = applyGravity(newTiles, rows, cols);

                    for (let col = 0; col < cols; col++) {
                        const existingInCol = afterGravity.filter(
                            (t) => t.col === col,
                        ).length;
                        const tilesNeeded = rows - existingInCol;

                        // Find which rows will be filled (from top)
                        const occupiedRows = new Set(
                            afterGravity
                                .filter((t) => t.col === col)
                                .map((t) => t.row),
                        );
                        const emptyRows: number[] = [];
                        for (let r = 0; r < rows; r++) {
                            if (!occupiedRows.has(r)) {
                                emptyRows.push(r);
                            }
                        }

                        for (let i = 0; i < tilesNeeded; i++) {
                            const startRow = -(tilesNeeded - i);
                            const finalRow = emptyRows[i];

                            // Get a smart tile type that respects accidentalMatchesChance
                            const tileType = getSmartTileType(
                                afterGravity,
                                finalRow,
                                col,
                            );

                            const newTile = createTile(
                                tileType,
                                startRow,
                                col,
                                true,
                            );
                            newTiles.push(newTile);
                            // Update afterGravity simulation for next tile
                            afterGravity.push({ ...newTile, row: finalRow });
                        }
                    }

                    return newTiles;
                });

                // Wait a frame for new tiles to render
                await new Promise((resolve) =>
                    requestAnimationFrame(() => resolve(undefined)),
                );
                await new Promise((resolve) =>
                    setTimeout(resolve, ANIMATION.FRAME_DELAY),
                );

                // Apply gravity
                setTiles((prev) => applyGravity(prev, rows, cols));

                // Wait for fall animation
                await new Promise((resolve) =>
                    setTimeout(resolve, ANIMATION.FALL_SETTLE),
                );

                isFirstIteration = false;
            }

            setIsAnimating(false);

            // Now that all animations are done, check if goals were met
            if (goalsMetDuringAnimation.current) {
                goalsMetDuringAnimation.current = false;
                setIsComplete(true);
            }

            // Check if reshuffle is needed (after a short delay to ensure everything is settled)
            setTimeout(() => {
                checkAndReshuffleIfNeeded();
            }, 100);
        },
        [
            rows,
            cols,
            availableTileTypes,
            findMatches,
            updateGoalProgress,
            checkAndReshuffleIfNeeded,
        ],
    );

    // Handle tile click
    const handleTileClick = useCallback(
        (row: number, col: number) => {
            if (isAnimating || isComplete || isFailed) return;

            const currentTiles = tiles;
            const clickedTile = getTileAt(currentTiles, row, col);
            const clickedPos = { row, col };

            // Wooden and stone tiles cannot be selected or swapped
            if (
                clickedTile &&
                (isWoodenTile(clickedTile.type) ||
                    isStoneTile(clickedTile.type))
            ) {
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
            if (
                selectedTile &&
                selectedTile.row === row &&
                selectedTile.col === col
            ) {
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
        [
            isAnimating,
            isComplete,
            isFailed,
            tiles,
            selectedTile,
            maxMoves,
            triggerBombAtPosition,
            onMoveComplete,
        ],
    );

    const enqueueSwapTrailEffect = useCallback(
        (from: Position, to: Position) => {
            const durationMs = ANIMATION.SWAP_TRAIL_DURATION;
            const fadeInMs = ANIMATION.SWAP_TRAIL_FADE_IN;
            const maxOpacity = Math.min(
                1,
                Math.max(0, EFFECT_SPRITE_REGIONS.swapTrail.maxOpacity ?? 1),
            );
            const effectId = `effect-${effectIdCounterRef.current++}`;

            const orientation = from.row === to.row ? "horizontal" : "vertical";

            setActiveEffects((prev) => [
                ...prev,
                {
                    id: effectId,
                    type: "swapTrail",
                    from,
                    to,
                    orientation,
                    createdAt: Date.now(),
                    durationMs,
                    fadeInMs,
                    fadeOutMs: Math.max(0, durationMs - fadeInMs),
                    maxOpacity,
                },
            ]);

            const timeoutId = setTimeout(() => {
                setActiveEffects((prev) =>
                    prev.filter((effect) => effect.id !== effectId),
                );
                effectTimeoutsRef.current = effectTimeoutsRef.current.filter(
                    (id) => id !== timeoutId,
                );
            }, durationMs);

            effectTimeoutsRef.current.push(timeoutId);
        },
        [],
    );

    const enqueueTileBreakFragments = useCallback((destroyedTiles: Tile[]) => {
        const immediateEffects: BoardEffectInstance[] = [];
        const uniqueTiles = Array.from(
            new Map(destroyedTiles.map((tile) => [tile.id, tile])).values(),
        );

        uniqueTiles.forEach((tile) => {
            const fragments = TILE_BREAK_FRAGMENT_SPRITES[tile.type];
            if (!fragments || fragments.length === 0) return;

            const flashId = `effect-${effectIdCounterRef.current++}`;

            const tileEffects: BoardEffectInstance[] = [];

            tileEffects.push({
                id: flashId,
                type: "tileBreakFlash",
                row: tile.row,
                col: tile.col,
                rotationDeg: Math.random() * 360,
                fadeInMs: TILE_BREAK_FLASH_CONFIG.fadeInMs,
                fadeOutMs: TILE_BREAK_FLASH_CONFIG.fadeOutMs,
                maxOpacity: TILE_BREAK_FLASH_CONFIG.maxOpacity,
            });

            const minFragments = TILE_BREAK_FRAGMENT_CONFIG.minFragments;
            const maxFragments = TILE_BREAK_FRAGMENT_CONFIG.maxFragments;
            const count =
                minFragments +
                Math.floor(Math.random() * (maxFragments - minFragments + 1));

            for (let i = 0; i < count; i++) {
                const fragment =
                    fragments[Math.floor(Math.random() * fragments.length)];
                const effectId = `effect-${effectIdCounterRef.current++}`;
                const launchAngleDeg = Math.random() * 360 - 180;
                const initialSpeedScale =
                    TILE_BREAK_FRAGMENT_CONFIG.minInitialSpeedScale +
                    Math.random() *
                        (TILE_BREAK_FRAGMENT_CONFIG.maxInitialSpeedScale -
                            TILE_BREAK_FRAGMENT_CONFIG.minInitialSpeedScale);
                const spinDegPerSec =
                    TILE_BREAK_FRAGMENT_CONFIG.minSpinDegPerSec +
                    Math.random() *
                        (TILE_BREAK_FRAGMENT_CONFIG.maxSpinDegPerSec -
                            TILE_BREAK_FRAGMENT_CONFIG.minSpinDegPerSec);

                tileEffects.push({
                    id: effectId,
                    type: "tileBreakFragment",
                    row: tile.row,
                    col: tile.col,
                    fragment,
                    launchAngleDeg,
                    initialSpeedScale,
                    spinDegPerSec,
                    createdAt: Date.now(),
                    maxOpacity: TILE_BREAK_FRAGMENT_CONFIG.maxOpacity,
                });
            }

            const delayMs = Math.max(0, tile.removalDelayMs ?? 0);
            if (delayMs > 0) {
                const timeoutId = setTimeout(() => {
                    setActiveEffects((prev) => [...prev, ...tileEffects]);
                    effectTimeoutsRef.current = effectTimeoutsRef.current.filter(
                        (id) => id !== timeoutId,
                    );
                }, delayMs);
                effectTimeoutsRef.current.push(timeoutId);
            } else {
                immediateEffects.push(...tileEffects);
            }
        });

        if (immediateEffects.length === 0) return;

        setActiveEffects((prev) => [...prev, ...immediateEffects]);

    }, []);

    function enqueueBombSpawnPreview(
        bombCreations: BombCreation[],
        positionHitDelayMs: Map<string, number>,
    ) {
        if (bombCreations.length === 0) return;

        const effects: BombSpawnPreviewEffectInstance[] = bombCreations.map(
            ({ position, bombType }) => {
                const delayMs =
                    positionHitDelayMs.get(`${position.row},${position.col}`) ?? 0;
                return {
                    id: `effect-${effectIdCounterRef.current++}`,
                    type: "bombSpawnPreview",
                    row: position.row,
                    col: position.col,
                    bombType,
                    delayMs,
                };
            },
        );

        setActiveEffects((prev) => [...prev, ...effects]);
        effects.forEach((effect) => {
            const timeoutId = setTimeout(() => {
                setActiveEffects((prev) =>
                    prev.filter((item) => item.id !== effect.id),
                );
                effectTimeoutsRef.current = effectTimeoutsRef.current.filter(
                    (id) => id !== timeoutId,
                );
            }, effect.delayMs + BOMB_MERGE_EFFECT_CONFIG.durationMs + 16);
            effectTimeoutsRef.current.push(timeoutId);
        });
    }

    const enqueueAreaBombExplosion = useCallback((bomb: Tile) => {
        const effectId = `effect-${effectIdCounterRef.current++}`;
        const frameCount = AREA_BOMB_EXPLOSION_CONFIG.frameCount;
        const frameDurationMs = AREA_BOMB_EXPLOSION_CONFIG.frameDurationMs;
        const durationMs = frameCount * frameDurationMs;

        setActiveEffects((prev) => [
            ...prev,
            {
                id: effectId,
                type: "areaBombExplosion",
                row: bomb.row,
                col: bomb.col,
                createdAt: Date.now(),
                frameCount,
                frameDurationMs,
                maxOpacity: AREA_BOMB_EXPLOSION_CONFIG.maxOpacity,
            },
        ]);

        const timeoutId = setTimeout(() => {
            setActiveEffects((prev) =>
                prev.filter((effect) => effect.id !== effectId),
            );
            effectTimeoutsRef.current = effectTimeoutsRef.current.filter(
                (id) => id !== timeoutId,
            );
        }, durationMs);

        effectTimeoutsRef.current.push(timeoutId);
    }, []);

    const enqueueDirectionalBombBurst = useCallback((bomb: Tile) => {
        if (bomb.type !== BOMB_HORIZONTAL && bomb.type !== BOMB_VERTICAL) {
            return;
        }

        const axis = bomb.type === BOMB_HORIZONTAL ? "horizontal" : "vertical";
        const speedScale = DIRECTIONAL_BOMB_BURST_CONFIG.speedScale;

        const effects: BoardEffectInstance[] = [-1, 1].map((directionSign) => ({
            id: `effect-${effectIdCounterRef.current++}`,
            type: "directionalBombPart",
            row: bomb.row,
            col: bomb.col,
            axis,
            directionSign: directionSign as -1 | 1,
            speedScale,
            maxOpacity: DIRECTIONAL_BOMB_BURST_CONFIG.maxOpacity,
        }));

        setActiveEffects((prev) => [...prev, ...effects]);
    }, []);

    const getBombHitDelayMs = useCallback(
        (bomb: Tile, position: Position): number => {
            if (bomb.type === BOMB_HORIZONTAL) {
                return (
                    Math.abs(position.col - bomb.col) *
                    ANIMATION.DIRECTIONAL_BOMB_TILE_HIT_STEP_MS
                );
            }
            if (bomb.type === BOMB_VERTICAL) {
                return (
                    Math.abs(position.row - bomb.row) *
                    ANIMATION.DIRECTIONAL_BOMB_TILE_HIT_STEP_MS
                );
            }
            return 0;
        },
        [],
    );

    const collectBombPropagation = useCallback(
        (
            initialBombs: Array<{ bomb: Tile; delayMs: number }>,
            currentTiles: Tile[],
        ) => {
            const positionHitDelayMs = new Map<string, number>();
            const bombHitDelayById = new Map<string, number>();
            const bombExplosionEvents: Array<{ bomb: Tile; delayMs: number }> = [];
            const queue = [...initialBombs];

            while (queue.length > 0) {
                let minIdx = 0;
                for (let i = 1; i < queue.length; i++) {
                    if (queue[i].delayMs < queue[minIdx].delayMs) {
                        minIdx = i;
                    }
                }
                const [{ bomb, delayMs }] = queue.splice(minIdx, 1);

                const knownDelay = bombHitDelayById.get(bomb.id);
                if (knownDelay !== undefined && knownDelay <= delayMs) continue;
                bombHitDelayById.set(bomb.id, delayMs);
                bombExplosionEvents.push({ bomb, delayMs });

                const explosionPositions = getBombExplosionPositions(bomb, rows, cols);
                explosionPositions.forEach((pos) => {
                    const posKey = `${pos.row},${pos.col}`;
                    const hitDelay = delayMs + getBombHitDelayMs(bomb, pos);
                    const previousPosDelay = positionHitDelayMs.get(posKey);
                    if (
                        previousPosDelay === undefined ||
                        hitDelay < previousPosDelay
                    ) {
                        positionHitDelayMs.set(posKey, hitDelay);
                    }

                    const tileAtPos = getTileAt(currentTiles, pos.row, pos.col);
                    if (tileAtPos && isBomb(tileAtPos.type)) {
                        const knownBombDelay = bombHitDelayById.get(tileAtPos.id);
                        if (
                            knownBombDelay === undefined ||
                            hitDelay < knownBombDelay
                        ) {
                            queue.push({ bomb: tileAtPos, delayMs: hitDelay });
                        }
                    }
                });
            }

            return { positionHitDelayMs, bombExplosionEvents };
        },
        [cols, getBombHitDelayMs, rows],
    );

    const scheduleBombVisualEffects = useCallback(
        (events: Array<{ bomb: Tile; delayMs: number }>) => {
            events.forEach(({ bomb, delayMs }) => {
                const trigger = () => {
                    enqueueDirectionalBombBurst(bomb);
                    if (bomb.type === BOMB_AREA) {
                        enqueueAreaBombExplosion(bomb);
                    }
                };

                if (delayMs <= 0) {
                    trigger();
                    return;
                }

                const timeoutId = setTimeout(() => {
                    trigger();
                    effectTimeoutsRef.current = effectTimeoutsRef.current.filter(
                        (id) => id !== timeoutId,
                    );
                }, delayMs);
                effectTimeoutsRef.current.push(timeoutId);
            });
        },
        [enqueueAreaBombExplosion, enqueueDirectionalBombBurst],
    );

    const removeEffect = useCallback((effectId: string) => {
        setActiveEffects((prev) =>
            prev.filter((effect) => effect.id !== effectId),
        );
    }, []);

    // Handle swap between two tiles
    const handleSwap = useCallback(
        async (from: Position, to: Position) => {
            if (isAnimating || isComplete || isFailed) return;

            const currentTiles = tiles;
            const tile1 = getTileAt(currentTiles, from.row, from.col);
            const tile2 = getTileAt(currentTiles, to.row, to.col);

            if (!tile1 || !tile2) return;

            // Cannot swap wooden or stone tiles
            if (
                isWoodenTile(tile1.type) ||
                isWoodenTile(tile2.type) ||
                isStoneTile(tile1.type) ||
                isStoneTile(tile2.type)
            ) {
                return;
            }

            const tile1IsBomb = isBomb(tile1.type);
            const tile2IsBomb = isBomb(tile2.type);
            const hasBomb = tile1IsBomb || tile2IsBomb;

            // Check if valid swap (or if a bomb is involved)
            if (!hasBomb && !isValidSwap(currentTiles, from, to)) {
                // Animate invalid swap
                setIsAnimating(true);
                enqueueSwapTrailEffect(from, to);
                setSwappingTileIds([tile1.id, tile2.id]);

                setTiles((prev) =>
                    prev.map((t) => {
                        if (t.id === tile1.id)
                            return { ...t, row: to.row, col: to.col };
                        if (t.id === tile2.id)
                            return { ...t, row: from.row, col: from.col };
                        return t;
                    }),
                );

                await new Promise((resolve) =>
                    setTimeout(resolve, ANIMATION.INVALID_SWAP_DURATION),
                );

                setTiles((prev) =>
                    prev.map((t) => {
                        if (t.id === tile1.id)
                            return { ...t, row: from.row, col: from.col };
                        if (t.id === tile2.id)
                            return { ...t, row: to.row, col: to.col };
                        return t;
                    }),
                );

                await new Promise((resolve) =>
                    setTimeout(resolve, ANIMATION.INVALID_SWAP_DURATION),
                );
                setSwappingTileIds([]);
                setIsAnimating(false);
                return;
            }

            // Count the move
            setMovesUsed((prev) => prev + 1);

            setIsAnimating(true);
            enqueueSwapTrailEffect(from, to);
            setSwappingTileIds([tile1.id, tile2.id]);

            // Perform the swap animation
            setTiles((prev) =>
                prev.map((t) => {
                    if (t.id === tile1.id)
                        return { ...t, row: to.row, col: to.col };
                    if (t.id === tile2.id)
                        return { ...t, row: from.row, col: from.col };
                    return t;
                }),
            );

            await new Promise((resolve) =>
                setTimeout(resolve, ANIMATION.SWAP_SETTLE),
            );
            setSwappingTileIds([]);

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
                    const movedBomb = updatedTiles.find(
                        (t) => t.id === tile1.id,
                    );
                    if (movedBomb) bombsToTrigger.push(movedBomb);
                }
                if (tile2IsBomb) {
                    const movedBomb = updatedTiles.find(
                        (t) => t.id === tile2.id,
                    );
                    if (movedBomb) bombsToTrigger.push(movedBomb);
                }

                for (const bomb of bombsToTrigger) {
                    const currentTiles = await new Promise<Tile[]>(
                        (resolve) => {
                            setTiles((prev) => {
                                resolve(prev);
                                return prev;
                            });
                        },
                    );

                    const { positionHitDelayMs, bombExplosionEvents } =
                        collectBombPropagation([{ bomb, delayMs: 0 }], currentTiles);
                    scheduleBombVisualEffects(bombExplosionEvents);
                    const matchedPositions = new Set(positionHitDelayMs.keys());

                    const roundScore = matchedPositions.size * POINTS_PER_TILE;
                    setScore((prev) => prev + roundScore);

                    // Handle wooden tile damage - only tiles directly in explosion range
                    const woodenTilesToDamage = new Map<string, Tile>();

                    // Wooden tiles should not be destroyed directly - they take damage instead
                    // Stone tiles are indestructible and should be completely skipped
                    const tilesToRemove = new Set<string>();
                    const removalDelayByTileId = new Map<string, number>();
                    const destroyedTiles: Tile[] = [];
                    matchedPositions.forEach((posKey) => {
                        const [row, col] = posKey.split(",").map(Number);
                        const tile = getTileAt(currentTiles, row, col);
                        if (
                            tile &&
                            !isWoodenTile(tile.type) &&
                            !isStoneTile(tile.type)
                        ) {
                            tilesToRemove.add(tile.id);
                            destroyedTiles.push(tile);
                            const hitDelay = positionHitDelayMs.get(posKey) ?? 0;
                            const previousDelay = removalDelayByTileId.get(tile.id);
                            if (
                                previousDelay === undefined ||
                                hitDelay < previousDelay
                            ) {
                                removalDelayByTileId.set(tile.id, hitDelay);
                            }
                        } else if (tile && isWoodenTile(tile.type)) {
                            // Wooden tiles in explosion area should be damaged, not destroyed
                            const woodKey = `${row},${col}`;
                            if (!woodenTilesToDamage.has(woodKey)) {
                                woodenTilesToDamage.set(woodKey, tile);
                            }
                        }
                        // Stone tiles are skipped entirely - they cannot be damaged or destroyed
                    });

                    // Damage wooden tiles and track destroyed ones
                    const damagedWoodenTiles: Tile[] = [];
                    const woodenTilesForFragments = Array.from(
                        woodenTilesToDamage.values(),
                    );
                    woodenTilesToDamage.forEach((woodTile) => {
                        if (woodTile.type === WOOD_NORMAL) {
                            // Normal -> Broken (don't remove, just update type)
                            // DON'T track yet - only count when fully destroyed
                        } else if (woodTile.type === WOOD_BROKEN) {
                            tilesToRemove.add(woodTile.id);
                            // NOW track as WOOD_NORMAL for goal progress (only when fully destroyed)
                            damagedWoodenTiles.push({
                                ...woodTile,
                                type: WOOD_NORMAL,
                            });
                        }
                    });

                    updateGoalProgress([
                        ...destroyedTiles,
                        ...damagedWoodenTiles,
                    ]);

                    setTiles((prev) =>
                        prev.map((t) => {
                            if (tilesToRemove.has(t.id)) {
                                return {
                                    ...t,
                                    isRemoving: true,
                                    removalDelayMs: removalDelayByTileId.get(t.id) ?? 0,
                                };
                            }
                            // Damage wooden tiles: Normal -> Broken
                            const woodTile = Array.from(
                                woodenTilesToDamage.values(),
                            ).find((wt) => wt.id === t.id);
                            if (woodTile && woodTile.type === WOOD_NORMAL) {
                                return {
                                    ...t,
                                    type: WOOD_BROKEN,
                                    removalDelayMs: undefined,
                                };
                            }
                            return { ...t, removalDelayMs: undefined };
                        }),
                    );

                    const tilesForFragmentEffects = [
                        ...destroyedTiles.map((tile) => ({
                            ...tile,
                            removalDelayMs: removalDelayByTileId.get(tile.id) ?? 0,
                        })),
                        ...woodenTilesForFragments.map((tile) => ({
                            ...tile,
                            removalDelayMs:
                                positionHitDelayMs.get(`${tile.row},${tile.col}`) ?? 0,
                        })),
                    ];
                    await new Promise((resolve) =>
                        setTimeout(resolve, ANIMATION.TILE_BREAK_FRAGMENT_SPAWN_DELAY),
                    );
                    enqueueTileBreakFragments(tilesForFragmentEffects);
                    const maxRemovalDelayMs =
                        removalDelayByTileId.size > 0
                            ? Math.max(...removalDelayByTileId.values())
                            : 0;
                    await new Promise((resolve) =>
                        setTimeout(
                            resolve,
                            Math.max(
                                0,
                                ANIMATION.REMOVAL_DURATION -
                                    ANIMATION.TILE_BREAK_FRAGMENT_SPAWN_DELAY +
                                    maxRemovalDelayMs,
                            ),
                        ),
                    );

                    setTiles((prev) => {
                        let newTiles = prev.filter(
                            (t) => !tilesToRemove.has(t.id),
                        );

                        // After removing tiles, apply gravity to see where new tiles will land
                        const afterGravity = applyGravity(newTiles, rows, cols);

                        for (let c = 0; c < cols; c++) {
                            const existingInCol = afterGravity.filter(
                                (t) => t.col === c,
                            ).length;
                            const tilesNeeded = rows - existingInCol;

                            // Find which rows will be filled (from top)
                            const occupiedRows = new Set(
                                afterGravity
                                    .filter((t) => t.col === c)
                                    .map((t) => t.row),
                            );
                            const emptyRows: number[] = [];
                            for (let r = 0; r < rows; r++) {
                                if (!occupiedRows.has(r)) {
                                    emptyRows.push(r);
                                }
                            }

                            for (let i = 0; i < tilesNeeded; i++) {
                                const startRow = -(tilesNeeded - i);
                                const finalRow = emptyRows[i];

                                // Get a smart tile type that respects accidentalMatchesChance
                                const tileType = getSmartTileType(
                                    afterGravity,
                                    finalRow,
                                    c,
                                );

                                const newTile = createTile(
                                    tileType,
                                    startRow,
                                    c,
                                    true,
                                );
                                newTiles.push(newTile);
                                // Update afterGravity simulation for next tile
                                afterGravity.push({
                                    ...newTile,
                                    row: finalRow,
                                });
                            }
                        }

                        return newTiles;
                    });

                    await new Promise((resolve) =>
                        requestAnimationFrame(() => resolve(undefined)),
                    );
                    await new Promise((resolve) =>
                        setTimeout(resolve, ANIMATION.FRAME_DELAY),
                    );

                    setTiles((prev) => applyGravity(prev, rows, cols));

                    await new Promise((resolve) =>
                        setTimeout(resolve, ANIMATION.FALL_SETTLE),
                    );
                }
            }

            // Process any remaining matches
            await processMatches({ from, to });

            // Check if reshuffle is needed
            await checkAndReshuffleIfNeeded();

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
            checkAndReshuffleIfNeeded,
            onMoveComplete,
            enqueueSwapTrailEffect,
        ],
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
        isReshuffling,
        swappingTileIds,
        activeEffects,
        removeEffect,
        handleTileClick,
        handleSwap,
        setSelectedTile,
        initializeGrid,
    };
}
