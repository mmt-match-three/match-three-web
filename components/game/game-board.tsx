"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import type {
    AreaBombExplosionEffectInstance,
    BombSpawnPreviewEffectInstance,
    DirectionalBombPartEffectInstance,
    Level,
    PointerState,
    Position,
    LevelGoal,
    TileBreakFlashEffectInstance,
    TileBreakFragmentEffectInstance,
} from "@/lib/types";
import {
    AREA_BOMB_EXPLOSION_CONFIG,
    BOMB_MERGE_EFFECT_CONFIG,
    DIRECTIONAL_BOMB_BURST_CONFIG,
    EFFECT_SPRITE_REGIONS,
    GRID_GAP,
    GRID_PADDING,
    TILE_BREAK_FLASH_CONFIG,
    TILE_BREAK_FRAGMENT_CONFIG,
} from "@/lib/constants";
import {
    areAdjacent,
    getEffectSpriteStyle,
    getPackedSpriteStyle,
    getSwapTrailPlacement,
    getTileSpriteStyle,
} from "@/lib/game-utils";
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

type TileBreakFragmentParticleProps = {
    effect: TileBreakFragmentEffectInstance;
    cellSize: number;
    rows: number;
    onExit: (id: string) => void;
};

type TileBreakFlashProps = {
    effect: TileBreakFlashEffectInstance;
    cellSize: number;
    onExit: (id: string) => void;
};

type AreaBombExplosionProps = {
    effect: AreaBombExplosionEffectInstance;
    cellSize: number;
};

type DirectionalBombPartProps = {
    effect: DirectionalBombPartEffectInstance;
    cellSize: number;
    boardRect: DOMRect | null;
    onExit: (id: string) => void;
};

type BombSpawnPreviewProps = {
    effect: BombSpawnPreviewEffectInstance;
    cellSize: number;
};

function AreaBombExplosion({ effect, cellSize }: AreaBombExplosionProps) {
    const [frame, setFrame] = React.useState(0);
    const explosionSize = cellSize * AREA_BOMB_EXPLOSION_CONFIG.sizeScale;
    const tileCenterX =
        GRID_PADDING + effect.col * (cellSize + GRID_GAP) + cellSize / 2;
    const tileCenterY =
        GRID_PADDING + effect.row * (cellSize + GRID_GAP) + cellSize / 2;
    const left = tileCenterX - explosionSize / 2;
    const top = tileCenterY - explosionSize / 2;

    React.useEffect(() => {
        let frameIndex = 0;
        const intervalId = window.setInterval(() => {
            frameIndex += 1;
            if (frameIndex >= effect.frameCount) {
                window.clearInterval(intervalId);
                return;
            }
            setFrame(frameIndex);
        }, effect.frameDurationMs);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [effect.frameCount, effect.frameDurationMs]);

    const scaleX = explosionSize / AREA_BOMB_EXPLOSION_CONFIG.frameWidth;
    const scaleY = explosionSize / AREA_BOMB_EXPLOSION_CONFIG.frameHeight;
    const frameOffsetX = frame * AREA_BOMB_EXPLOSION_CONFIG.frameWidth * scaleX;

    return (
        <div
            className="absolute will-change-transform"
            style={{
                left: `${left}px`,
                top: `${top}px`,
                width: `${explosionSize}px`,
                height: `${explosionSize}px`,
                opacity: effect.maxOpacity,
                backgroundImage: "url('/tiles-explotion.png')",
                backgroundRepeat: "no-repeat",
                backgroundSize: `${2560 * scaleX}px ${256 * scaleY}px`,
                backgroundPosition: `-${frameOffsetX}px 0px`,
            }}
        />
    );
}

function BombSpawnPreview({ effect, cellSize }: BombSpawnPreviewProps) {
    const left = GRID_PADDING + effect.col * (cellSize + GRID_GAP);
    const top = GRID_PADDING + effect.row * (cellSize + GRID_GAP);

    return (
        <div
            className="absolute rounded-lg"
            style={{
                left: `${left}px`,
                top: `${top}px`,
                width: `${cellSize}px`,
                height: `${cellSize}px`,
                ...getTileSpriteStyle(effect.bombType),
                opacity: BOMB_MERGE_EFFECT_CONFIG.bombStartOpacity,
                transform: `rotate(${BOMB_MERGE_EFFECT_CONFIG.bombStartRotationDeg}deg) scale(${BOMB_MERGE_EFFECT_CONFIG.bombStartScale})`,
                animation: `bombSpawnPreview ${BOMB_MERGE_EFFECT_CONFIG.durationMs}ms ${BOMB_MERGE_EFFECT_CONFIG.easing} ${effect.delayMs}ms forwards`,
                zIndex: 12,
            }}
        />
    );
}

function DirectionalBombPart({
    effect,
    cellSize,
    boardRect,
    onExit,
}: DirectionalBombPartProps) {
    const partRef = React.useRef<HTMLDivElement>(null);
    const trailRef = React.useRef<HTMLDivElement>(null);
    const isDoneRef = React.useRef(false);
    const isHorizontal = effect.axis === "horizontal";
    const halfTrailWidth = EFFECT_SPRITE_REGIONS.directionalBombTrail.width / 2;
    const halfTrailHeight =
        EFFECT_SPRITE_REGIONS.directionalBombTrail.height / 2;
    const useFirstHalf = effect.directionSign === 1; // swapped mapping between flying parts
    const partRegion = EFFECT_SPRITE_REGIONS.directionalBombPart;
    const basePartSize = cellSize * DIRECTIONAL_BOMB_BURST_CONFIG.sizeScale;
    const partAspectRatio = partRegion.width / partRegion.height;
    const height = basePartSize;
    const width = height * partAspectRatio;
    if (!boardRect || typeof document === "undefined") return null;
    const tileCenterX =
        boardRect.left +
        GRID_PADDING +
        effect.col * (cellSize + GRID_GAP) +
        cellSize / 2;
    const tileCenterY =
        boardRect.top +
        GRID_PADDING +
        effect.row * (cellSize + GRID_GAP) +
        cellSize / 2;
    const left = tileCenterX - width / 2;
    const top = tileCenterY - height / 2;
    const clipTop = Math.max(0, boardRect.top);
    const clipRight = Math.max(0, window.innerWidth - boardRect.right);
    const clipBottom = Math.max(0, window.innerHeight - boardRect.bottom);
    const clipLeft = Math.max(0, boardRect.left);
    const boardClipPath = `inset(${clipTop}px ${clipRight}px ${clipBottom}px ${clipLeft}px)`;
    const trailThickness =
        height * DIRECTIONAL_BOMB_BURST_CONFIG.trailThicknessScale;
    const trailMaxLength =
        cellSize * DIRECTIONAL_BOMB_BURST_CONFIG.trailMaxLengthScale;
    const halfTrailRegion = isHorizontal
        ? ({
              sheet: EFFECT_SPRITE_REGIONS.directionalBombTrail.sheet,
              x:
                  EFFECT_SPRITE_REGIONS.directionalBombTrail.x +
                  (useFirstHalf ? 0 : halfTrailWidth),
              y: EFFECT_SPRITE_REGIONS.directionalBombTrail.y,
              width: halfTrailWidth,
              height: EFFECT_SPRITE_REGIONS.directionalBombTrail.height,
          } as const)
        : ({
              sheet: EFFECT_SPRITE_REGIONS.directionalBombTrail.sheet,
              x: EFFECT_SPRITE_REGIONS.directionalBombTrail.x,
              y:
                  EFFECT_SPRITE_REGIONS.directionalBombTrail.y +
                  (useFirstHalf ? 0 : halfTrailHeight),
              width: EFFECT_SPRITE_REGIONS.directionalBombTrail.width,
              height: halfTrailHeight,
          } as const);
    const rotationDeg =
        effect.axis === "horizontal"
            ? effect.directionSign === -1
                ? 0
                : 180
            : effect.directionSign === -1
              ? 90
              : -90;

    React.useEffect(() => {
        const element = partRef.current;
        const trailElement = trailRef.current;
        if (!element || !trailElement) return;
        isDoneRef.current = false;

        const speedPxPerSec = effect.speedScale * cellSize;
        const velocityX =
            effect.axis === "horizontal"
                ? effect.directionSign * speedPxPerSec
                : 0;
        const velocityY =
            effect.axis === "vertical"
                ? effect.directionSign * speedPxPerSec
                : 0;
        const startTime = performance.now();
        const margin = Math.max(width, height) + 20;
        const trailGrowDurationSec =
            DIRECTIONAL_BOMB_BURST_CONFIG.trailGrowDurationMs / 1000;

        const step = (now: number) => {
            if (isDoneRef.current) return;
            const elapsedSec = (now - startTime) / 1000;
            const translateX = velocityX * elapsedSec;
            const translateY = velocityY * elapsedSec;
            element.style.transform = `translate(${translateX}px, ${translateY}px)`;

            const travelDistance = isHorizontal
                ? Math.abs(translateX)
                : Math.abs(translateY);
            const growCap =
                trailMaxLength *
                Math.min(
                    1,
                    elapsedSec / Math.max(trailGrowDurationSec, 0.0001),
                );
            const visibleLength = Math.max(
                0,
                Math.min(trailMaxLength, Math.min(travelDistance, growCap)),
            );
            const featherPx = Math.min(
                Math.max(2, trailThickness * 0.5),
                Math.max(2, visibleLength * 0.35),
            );

            if (isHorizontal) {
                trailElement.style.left =
                    effect.directionSign === 1
                        ? `${width / 2 - trailMaxLength}px`
                        : `${width / 2}px`;
                trailElement.style.top = `${(height - trailThickness) / 2}px`;
                trailElement.style.width = `${trailMaxLength}px`;
                trailElement.style.height = `${trailThickness}px`;
                const mask =
                    effect.directionSign === 1
                        ? `linear-gradient(90deg, transparent 0px, transparent ${Math.max(0, trailMaxLength - visibleLength - featherPx)}px, black ${Math.max(0, trailMaxLength - visibleLength + featherPx)}px, black ${trailMaxLength}px)`
                        : `linear-gradient(90deg, black 0px, black ${Math.max(0, visibleLength - featherPx)}px, transparent ${Math.min(trailMaxLength, visibleLength + featherPx)}px, transparent ${trailMaxLength}px)`;
                trailElement.style.clipPath = "none";
                trailElement.style.maskImage = mask;
                trailElement.style.webkitMaskImage = mask;
            } else {
                trailElement.style.left = `${(width - trailThickness) / 2}px`;
                trailElement.style.top =
                    effect.directionSign === 1
                        ? `${height / 2 - trailMaxLength}px`
                        : `${height / 2}px`;
                trailElement.style.width = `${trailThickness}px`;
                trailElement.style.height = `${trailMaxLength}px`;
                const mask =
                    effect.directionSign === 1
                        ? `linear-gradient(180deg, transparent 0px, transparent ${Math.max(0, trailMaxLength - visibleLength - featherPx)}px, black ${Math.max(0, trailMaxLength - visibleLength + featherPx)}px, black ${trailMaxLength}px)`
                        : `linear-gradient(180deg, black 0px, black ${Math.max(0, visibleLength - featherPx)}px, transparent ${Math.min(trailMaxLength, visibleLength + featherPx)}px, transparent ${trailMaxLength}px)`;
                trailElement.style.clipPath = "none";
                trailElement.style.maskImage = mask;
                trailElement.style.webkitMaskImage = mask;
            }

            const currentLeft = left + translateX;
            const currentTop = top + translateY;
            const isOffscreen =
                currentLeft + width < -margin ||
                currentLeft > window.innerWidth + margin ||
                currentTop + height < -margin ||
                currentTop > window.innerHeight + margin;

            if (isOffscreen) {
                isDoneRef.current = true;
                onExit(effect.id);
                return;
            }

            requestAnimationFrame(step);
        };

        const raf = requestAnimationFrame(step);
        return () => {
            isDoneRef.current = true;
            cancelAnimationFrame(raf);
        };
    }, [
        cellSize,
        effect.axis,
        effect.directionSign,
        effect.id,
        effect.speedScale,
        height,
        left,
        onExit,
        top,
        width,
        isHorizontal,
    ]);

    return createPortal(
        <div
            className="fixed"
            style={{
                left: "0px",
                top: "0px",
                width: "100vw",
                height: "100vh",
                pointerEvents: "none",
                zIndex: 68,
                clipPath: boardClipPath,
                WebkitClipPath: boardClipPath,
                overflow: "hidden",
            }}
        >
            <div
                ref={partRef}
                className="absolute"
                style={{
                    left: `${left}px`,
                    top: `${top}px`,
                    width: `${width}px`,
                    height: `${height}px`,
                }}
            >
                <div
                    ref={trailRef}
                    className="will-change-transform"
                    style={{
                        position: "absolute",
                        left: "0px",
                        top: "0px",
                        width: `${trailMaxLength}px`,
                        height: `${trailThickness}px`,
                        opacity: DIRECTIONAL_BOMB_BURST_CONFIG.trailOpacity,
                        ...getPackedSpriteStyle(
                            halfTrailRegion,
                            isHorizontal ? trailMaxLength : trailThickness,
                            isHorizontal ? trailThickness : trailMaxLength,
                        ),
                    }}
                />
                <div
                    className="will-change-transform"
                    style={{
                        width: `${width}px`,
                        height: `${height}px`,
                        opacity: effect.maxOpacity,
                        ...getPackedSpriteStyle(partRegion, width, height),
                        transform: `rotate(${rotationDeg}deg)`,
                        transformOrigin: "center",
                    }}
                />
            </div>
        </div>,
        document.body,
    );
}

function TileBreakFlash({ effect, cellSize, onExit }: TileBreakFlashProps) {
    const flashSize = cellSize;
    const totalDurationMs = effect.fadeInMs + effect.fadeOutMs;
    const tileCenterX =
        GRID_PADDING + effect.col * (cellSize + GRID_GAP) + cellSize / 2;
    const tileCenterY =
        GRID_PADDING + effect.row * (cellSize + GRID_GAP) + cellSize / 2;
    const left = tileCenterX - flashSize / 2;
    const top = tileCenterY - flashSize / 2;

    React.useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            onExit(effect.id);
        }, totalDurationMs);
        return () => window.clearTimeout(timeoutId);
    }, [effect.id, onExit, totalDurationMs]);

    const flashStyle: React.CSSProperties & {
        "--flash-max-opacity": number;
    } = {
        width: `${flashSize}px`,
        height: `${flashSize}px`,
        ...getEffectSpriteStyle("tileBreakFlash", flashSize, flashSize),
        animation: `tileBreakFlashScale ${totalDurationMs}ms linear forwards, tileBreakFlashFadeIn ${effect.fadeInMs}ms ease-out forwards, tileBreakFlashFadeOut ${effect.fadeOutMs}ms ease-in ${effect.fadeInMs}ms forwards`,
        opacity: 0,
        "--flash-max-opacity": effect.maxOpacity,
    };

    return (
        <div
            className="absolute"
            style={{
                left: `${left}px`,
                top: `${top}px`,
                width: `${flashSize}px`,
                height: `${flashSize}px`,
                transform: `rotate(${effect.rotationDeg}deg)`,
                transformOrigin: "center",
            }}
        >
            <div className="will-change-transform" style={flashStyle} />
        </div>
    );
}

function TileBreakFragmentParticle({
    effect,
    cellSize,
    rows,
    onExit,
}: TileBreakFragmentParticleProps) {
    const particleRef = React.useRef<HTMLDivElement>(null);
    const isDoneRef = React.useRef(false);

    const fragmentWidth =
        effect.fragment.width * TILE_BREAK_FRAGMENT_CONFIG.fragmentScale;
    const fragmentHeight =
        effect.fragment.height * TILE_BREAK_FRAGMENT_CONFIG.fragmentScale;
    const tileCenterX =
        GRID_PADDING + effect.col * (cellSize + GRID_GAP) + cellSize / 2;
    const tileCenterY =
        GRID_PADDING + effect.row * (cellSize + GRID_GAP) + cellSize / 2;
    const left = tileCenterX - fragmentWidth / 2;
    const top = tileCenterY - fragmentHeight / 2;
    const boardHeight =
        GRID_PADDING * 2 + rows * cellSize + (rows - 1) * GRID_GAP;

    React.useEffect(() => {
        const element = particleRef.current;
        if (!element) return;
        isDoneRef.current = false;

        const angleRadians = (effect.launchAngleDeg * Math.PI) / 180;
        const speedPxPerSec = effect.initialSpeedScale * cellSize;
        const velocityX = Math.cos(angleRadians) * speedPxPerSec;
        const velocityY = -Math.sin(angleRadians) * speedPxPerSec;
        const gravityPxPerSec2 =
            TILE_BREAK_FRAGMENT_CONFIG.gravityScale * cellSize;
        const spinDegPerSec = effect.spinDegPerSec;
        const startTime = performance.now();

        const step = (now: number) => {
            if (isDoneRef.current) return;

            const elapsedSec = (now - startTime) / 1000;
            const translateX = velocityX * elapsedSec;
            const translateY =
                velocityY * elapsedSec +
                0.5 * gravityPxPerSec2 * elapsedSec * elapsedSec;
            const rotationDeg = spinDegPerSec * elapsedSec;

            element.style.transform = `translate(${translateX}px, ${translateY}px) rotate(${rotationDeg}deg)`;

            if (
                top + translateY >
                boardHeight + fragmentHeight + cellSize * 0.5
            ) {
                isDoneRef.current = true;
                onExit(effect.id);
                return;
            }

            requestAnimationFrame(step);
        };

        const raf = requestAnimationFrame(step);
        return () => {
            isDoneRef.current = true;
            cancelAnimationFrame(raf);
        };
    }, [
        boardHeight,
        cellSize,
        effect.id,
        effect.initialSpeedScale,
        effect.launchAngleDeg,
        effect.spinDegPerSec,
        fragmentHeight,
        onExit,
        top,
    ]);

    return (
        <div
            ref={particleRef}
            className="absolute will-change-transform"
            style={{
                left: `${left}px`,
                top: `${top}px`,
                width: `${fragmentWidth}px`,
                height: `${fragmentHeight}px`,
                opacity: effect.maxOpacity,
                ...getPackedSpriteStyle(
                    effect.fragment,
                    fragmentWidth,
                    fragmentHeight,
                ),
            }}
        />
    );
}

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
        swappingTileIds,
        activeEffects,
        movesUsed,
        goalProgress,
        goals,
        handleTileClick,
        handleSwap,
        removeEffect,
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
    const boardRect = containerRef.current?.getBoundingClientRect() ?? null;

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
                                isSwapping={swappingTileIds.includes(tile.id)}
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

            {isReady && (
                <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden rounded-lg">
                    {activeEffects.map((effect) => {
                        if (effect.type !== "bombSpawnPreview") {
                            return null;
                        }
                        return (
                            <BombSpawnPreview
                                key={effect.id}
                                effect={effect}
                                cellSize={cellSize}
                            />
                        );
                    })}
                </div>
            )}

            {/* Unclipped visual effects layer (swap trail, etc.) */}
            {isReady && (
                <div className="absolute inset-0 pointer-events-none z-70 overflow-visible">
                    {activeEffects.map((effect) => {
                        if (effect.type !== "swapTrail") return null;

                        const placement = getSwapTrailPlacement(
                            effect.from,
                            effect.to,
                            cellSize,
                        );
                        const fadeOutDelayMs = Math.max(
                            0,
                            effect.durationMs - effect.fadeOutMs,
                        );
                        const effectStyle: React.CSSProperties & {
                            "--effect-max-opacity": number;
                        } = {
                            left: `${placement.left}px`,
                            top: `${placement.top}px`,
                            width: `${placement.width}px`,
                            height: `${placement.height}px`,
                            transform:
                                effect.orientation === "vertical"
                                    ? "rotate(90deg)"
                                    : "none",
                            transformOrigin: "center",
                            ...getEffectSpriteStyle(
                                effect.type,
                                placement.width,
                                placement.height,
                            ),
                            animation: `swapTrailFadeIn ${effect.fadeInMs}ms ease-out forwards, swapTrailFadeOut ${effect.fadeOutMs}ms ease-in ${fadeOutDelayMs}ms forwards`,
                            opacity: 0,
                            "--effect-max-opacity": effect.maxOpacity,
                        };

                        return (
                            <div
                                key={effect.id}
                                className="absolute"
                                style={effectStyle}
                            />
                        );
                    })}
                </div>
            )}

            {/* Clipped fragments layer (must stay inside game field) */}
            {isReady && (
                <div className="absolute inset-0 pointer-events-none z-68 overflow-hidden rounded-lg">
                    {activeEffects.map((effect) => {
                        if (effect.type !== "areaBombExplosion") {
                            return null;
                        }
                        return (
                            <AreaBombExplosion
                                key={effect.id}
                                effect={effect}
                                cellSize={cellSize}
                            />
                        );
                    })}
                </div>
            )}

            {isReady && (
                <div className="absolute inset-0 pointer-events-none z-68 overflow-hidden rounded-lg">
                    {activeEffects.map((effect) => {
                        if (effect.type !== "directionalBombPart") {
                            return null;
                        }
                        return (
                            <DirectionalBombPart
                                key={effect.id}
                                effect={effect}
                                cellSize={cellSize}
                                boardRect={boardRect}
                                onExit={removeEffect}
                            />
                        );
                    })}
                </div>
            )}

            {/* Clipped fragments layer (must stay inside game field) */}
            {isReady && (
                <div className="absolute inset-0 pointer-events-none z-69 overflow-visible">
                    {activeEffects.map((effect) => {
                        if (effect.type !== "tileBreakFlash") {
                            return null;
                        }

                        return (
                            <TileBreakFlash
                                key={effect.id}
                                effect={effect}
                                cellSize={cellSize}
                                onExit={removeEffect}
                            />
                        );
                    })}
                </div>
            )}

            {/* Clipped fragments layer (must stay inside game field) */}
            {isReady && (
                <div className="absolute inset-0 pointer-events-none z-70 overflow-hidden rounded-lg">
                    {activeEffects.map((effect) => {
                        if (effect.type !== "tileBreakFragment") {
                            return null;
                        }
                        return (
                            <TileBreakFragmentParticle
                                key={effect.id}
                                effect={effect}
                                cellSize={cellSize}
                                rows={level.dimensions.rows}
                                onExit={removeEffect}
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

            <style jsx>{`
                @keyframes swapTrailFadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: var(--effect-max-opacity, 1);
                    }
                }

                @keyframes swapTrailFadeOut {
                    from {
                        opacity: var(--effect-max-opacity, 1);
                    }
                    to {
                        opacity: 0;
                    }
                }

                @keyframes tileBreakFlashScale {
                    0% {
                        transform: scale(${TILE_BREAK_FLASH_CONFIG.startScale});
                    }
                    100% {
                        transform: scale(${TILE_BREAK_FLASH_CONFIG.endScale});
                    }
                }

                @keyframes tileBreakFlashFadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: var(--flash-max-opacity, 0.6);
                    }
                }

                @keyframes tileBreakFlashFadeOut {
                    from {
                        opacity: var(--flash-max-opacity, 0.6);
                    }
                    to {
                        opacity: 0;
                    }
                }

                @keyframes bombSpawnPreview {
                    from {
                        opacity: ${BOMB_MERGE_EFFECT_CONFIG.bombStartOpacity};
                        transform: rotate(${BOMB_MERGE_EFFECT_CONFIG.bombStartRotationDeg}deg) scale(${BOMB_MERGE_EFFECT_CONFIG.bombStartScale});
                    }
                    to {
                        opacity: ${BOMB_MERGE_EFFECT_CONFIG.bombEndOpacity};
                        transform: rotate(${BOMB_MERGE_EFFECT_CONFIG.bombEndRotationDeg}deg) scale(${BOMB_MERGE_EFFECT_CONFIG.bombEndScale});
                    }
                }
            `}</style>
        </div>
    );
}
