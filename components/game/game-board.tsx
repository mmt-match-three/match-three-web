"use client";

import * as React from "react";
import type { Level, PointerState, Position, LevelGoal } from "@/lib/types";
import { GRID_GAP, GRID_PADDING } from "@/lib/constants";
import { areAdjacent } from "@/lib/game-utils";
import { useGameState } from "@/hooks/use-game-state";
import { TileCell } from "./tile-cell";

type GameBoardProps = {
    level: Level;
    onComplete: (movesUsed: number) => void;
    onFailed: () => void;
    onGoalProgressUpdate: (progress: Record<number, number>) => void;
    onMovesUpdate: (movesUsed: number) => void;
    onGoalsUpdate?: (goals: LevelGoal[]) => void;
};

export function GameBoard({
    level,
    onComplete,
    onFailed,
    onGoalProgressUpdate,
    onMovesUpdate,
    onGoalsUpdate,
}: GameBoardProps) {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [cellSize, setCellSize] = React.useState<number | null>(null);
    const [pointerStart, setPointerStart] = React.useState<PointerState | null>(
        null,
    );
    const wasSwipeRef = React.useRef(false);

    // Ensure stable reference for wooden and stone tiles to prevent infinite loop
    const woodenTilePositions = React.useMemo(
        () => level.woodenTiles || [],
        [level.woodenTiles],
    );

    const stoneTilePositions = React.useMemo(
        () => level.stoneTiles || [],
        [level.stoneTiles],
    );

    const {
        tiles,
        score,
        selectedTile,
        isAnimating,
        isComplete,
        isFailed,
        isReshuffling,
        movesUsed,
        goalProgress,
        goals,
        handleTileClick,
        handleSwap,
        setSelectedTile,
    } = useGameState({
        rows: level.dimensions.rows,
        cols: level.dimensions.cols,
        availableTileTypes: level.availableTileTypes,
        goals: level.goals,
        maxMoves: level.maxMoves,
        woodenTilePositions: woodenTilePositions,
        stoneTilePositions: stoneTilePositions,
        accidentalMatchesChance: level.accidentalMatchesChance,
        onTilesDestroyed: () => {
            // Progress is tracked internally, we just notify parent
        },
    });

    // Notify parent of enhanced goals (includes wooden tiles)
    React.useEffect(() => {
        if (onGoalsUpdate) {
            onGoalsUpdate(goals);
        }
    }, [goals, onGoalsUpdate]);

    // Notify parent of goal progress changes
    React.useEffect(() => {
        onGoalProgressUpdate(goalProgress);
    }, [goalProgress, onGoalProgressUpdate]);

    // Notify parent of moves changes
    React.useEffect(() => {
        onMovesUpdate(movesUsed);
    }, [movesUsed, onMovesUpdate]);

    // Handle completion
    React.useEffect(() => {
        if (isComplete) {
            onComplete(movesUsed);
        }
    }, [isComplete, movesUsed, onComplete]);

    // Handle failure
    React.useEffect(() => {
        if (isFailed) {
            onFailed();
        }
    }, [isFailed, onFailed]);

    // Calculate cell size based on container
    React.useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                const containerWidth = containerRef.current.clientWidth;
                const padding = GRID_PADDING * 2;
                const gap = GRID_GAP * (level.dimensions.cols - 1);
                setCellSize(
                    (containerWidth - padding - gap) / level.dimensions.cols,
                );
            }
        };

        const resizeObserver = new ResizeObserver(() => {
            updateSize();
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        window.addEventListener("resize", updateSize);
        updateSize();

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener("resize", updateSize);
        };
    }, [level.dimensions.cols]);

    // Handle click event
    const handleClick = React.useCallback(
        (row: number, col: number) => {
            if (isAnimating) return;
            if (wasSwipeRef.current) {
                wasSwipeRef.current = false;
                return;
            }
            handleTileClick(row, col);
        },
        [isAnimating, handleTileClick],
    );

    // Handle mouse enter for drag swapping
    const handleMouseEnter = React.useCallback(
        (row: number, col: number) => {
            if (isAnimating) return;

            if (pointerStart) {
                const startPos = pointerStart.position;
                if (startPos.row === row && startPos.col === col) return;

                if (areAdjacent(startPos, { row, col })) {
                    wasSwipeRef.current = true;
                    setPointerStart(null);
                    handleSwap(startPos, { row, col });
                }
                return;
            }

            if (!selectedTile) return;
            if (selectedTile.row === row && selectedTile.col === col) return;

            if (areAdjacent(selectedTile, { row, col })) {
                handleSwap(selectedTile, { row, col });
                setSelectedTile(null);
            }
        },
        [isAnimating, pointerStart, selectedTile, handleSwap, setSelectedTile],
    );

    // Handle pointer/touch start
    const handleStart = React.useCallback(
        (e: React.MouseEvent | React.TouchEvent, row: number, col: number) => {
            if (isAnimating) return;

            e.preventDefault();
            wasSwipeRef.current = false;

            let clientX: number;
            let clientY: number;

            if ("touches" in e && e.touches[0]) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = (e as React.MouseEvent).clientX;
                clientY = (e as React.MouseEvent).clientY;
            }

            setPointerStart({
                position: { row, col },
                clientX,
                clientY,
            });
        },
        [isAnimating],
    );

    // Handle pointer/touch end
    const handleEnd = React.useCallback(
        (e: React.MouseEvent | React.TouchEvent) => {
            if (!pointerStart) return;

            e.preventDefault();

            let clientX: number;
            let clientY: number;

            if ("changedTouches" in e && e.changedTouches[0]) {
                clientX = e.changedTouches[0].clientX;
                clientY = e.changedTouches[0].clientY;
            } else {
                clientX = (e as React.MouseEvent).clientX;
                clientY = (e as React.MouseEvent).clientY;
            }

            const startPos = pointerStart.position;
            const deltaX = clientX - pointerStart.clientX;
            const deltaY = clientY - pointerStart.clientY;
            const minSwipeDistance = 25;

            const absDeltaX = Math.abs(deltaX);
            const absDeltaY = Math.abs(deltaY);

            if (absDeltaX > minSwipeDistance || absDeltaY > minSwipeDistance) {
                wasSwipeRef.current = true;
                let targetRow = startPos.row;
                let targetCol = startPos.col;

                if (absDeltaX > absDeltaY) {
                    if (
                        deltaX > 0 &&
                        startPos.col < level.dimensions.cols - 1
                    ) {
                        targetCol = startPos.col + 1;
                    } else if (deltaX < 0 && startPos.col > 0) {
                        targetCol = startPos.col - 1;
                    }
                } else {
                    if (
                        deltaY > 0 &&
                        startPos.row < level.dimensions.rows - 1
                    ) {
                        targetRow = startPos.row + 1;
                    } else if (deltaY < 0 && startPos.row > 0) {
                        targetRow = startPos.row - 1;
                    }
                }

                const targetPos: Position = { row: targetRow, col: targetCol };
                if (areAdjacent(startPos, targetPos) && !isAnimating) {
                    handleSwap(startPos, targetPos);
                }
            }

            setPointerStart(null);
        },
        [pointerStart, level.dimensions, isAnimating, handleSwap],
    );

    const isReady = tiles.length > 0 && cellSize !== null;

    // Calculate aspect ratio based on level dimensions
    const aspectRatio = level.dimensions.cols / level.dimensions.rows;

    return (
        <div
            ref={containerRef}
            className="relative rounded-lg border-2 border-border bg-card p-2 shadow-lg overflow-hidden"
            style={{
                width: "min(90vw, 500px)",
                aspectRatio: aspectRatio.toString(),
            }}
            onMouseUp={handleEnd}
            onMouseLeave={() => setPointerStart(null)}
            onTouchEnd={handleEnd}
            onTouchCancel={() => setPointerStart(null)}
        >
            {/* Grid background cells */}
            <div
                className="absolute inset-2 grid gap-1"
                style={{
                    gridTemplateColumns: `repeat(${level.dimensions.cols}, 1fr)`,
                    gridTemplateRows: `repeat(${level.dimensions.rows}, 1fr)`,
                }}
            >
                {Array.from({
                    length: level.dimensions.rows * level.dimensions.cols,
                }).map((_, i) => (
                    <div
                        key={i}
                        className="aspect-square rounded-md bg-muted/30"
                    />
                ))}
            </div>

            {/* Animated tiles */}
            {isReady && (
                <div className="absolute inset-0">
                    {tiles.map((tile) => {
                        const isSelected =
                            selectedTile?.row === tile.row &&
                            selectedTile?.col === tile.col;

                        return (
                            <TileCell
                                key={tile.id}
                                tile={tile}
                                cellSize={cellSize}
                                isSelected={isSelected}
                                isAnimating={isAnimating}
                                onClick={() => handleClick(tile.row, tile.col)}
                                onMouseEnter={() =>
                                    handleMouseEnter(tile.row, tile.col)
                                }
                                onMouseDown={(e) =>
                                    handleStart(e, tile.row, tile.col)
                                }
                                onTouchStart={(e) =>
                                    handleStart(e, tile.row, tile.col)
                                }
                            />
                        );
                    })}
                </div>
            )}

            {/* Reshuffle overlay */}
            {isReshuffling && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50 animate-in fade-in duration-300">
                    <div className="bg-card border-2 border-primary rounded-lg px-6 py-4 shadow-xl animate-in zoom-in duration-300">
                        <p className="text-lg font-bold text-primary">
                            Перемешиваю..
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
