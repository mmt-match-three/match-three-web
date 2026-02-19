"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { getTileSpriteStyle, isWoodenTile, isStoneTile } from "@/lib/game-utils";
import type { Tile } from "@/lib/types";
import {
    ANIMATION,
    BOMB_MERGE_EFFECT_CONFIG,
    GRID_GAP,
    GRID_PADDING,
} from "@/lib/constants";

type TileCellProps = {
    tile: Tile;
    cellSize: number;
    isSelected: boolean;
    isAnimating: boolean;
    isSwapping: boolean;
    onClick: () => void;
    onMouseEnter: () => void;
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
};

export function TileCell({
    tile,
    cellSize,
    isSelected,
    isAnimating,
    isSwapping,
    onClick,
    onMouseEnter,
    onMouseDown,
    onTouchStart,
}: TileCellProps) {
    const renderCol =
        tile.isMergingToBomb && tile.mergeTargetCol !== undefined
            ? tile.mergeTargetCol
            : tile.col;
    const renderRow =
        tile.isMergingToBomb && tile.mergeTargetRow !== undefined
            ? tile.mergeTargetRow
            : tile.row;
    const left = GRID_PADDING + renderCol * (cellSize + GRID_GAP);
    const top = GRID_PADDING + renderRow * (cellSize + GRID_GAP);
    const isWooden = isWoodenTile(tile.type);
    const isStone = isStoneTile(tile.type);
    const isImmovable = isWooden || isStone;
    const mergeDurationMs = BOMB_MERGE_EFFECT_CONFIG.durationMs;
    const mergeDelayMs = tile.removalDelayMs ?? 0;
    const mergeFadeMs = Math.min(
        BOMB_MERGE_EFFECT_CONFIG.tileFadeOutDurationMs,
        mergeDurationMs,
    );
    const mergeFadeDelayMs = Math.max(0, mergeDurationMs - mergeFadeMs) + mergeDelayMs;
    const bombSpawnHideDelayMs = tile.bombSpawnDelayMs ?? 0;

    return (
        <button
            type="button"
            className={cn(
                "absolute rounded-lg overflow-hidden outline-none",
                isImmovable ? "cursor-default" : "cursor-pointer",
                !isImmovable && "active:brightness-125",
                isSelected && "z-20 brightness-125",
                tile.isRemoving &&
                    !tile.isMergingToBomb &&
                    "opacity-0 scale-0 pointer-events-none"
            )}
            style={{
                width: `${cellSize}px`,
                height: `${cellSize}px`,
                left: `${left}px`,
                top: `${top}px`,
                opacity:
                    tile.isMergingToBomb || tile.isBombSpawning ? 0 : undefined,
                ...getTileSpriteStyle(tile.type),
                // Bouncy spring-like animation for playful feel
                // Wooden and stone tiles don't fall, so they have different transitions
                transition: tile.isNew
                    ? "none"
                    : tile.isMergingToBomb
                    ? `top ${mergeDurationMs}ms linear ${mergeDelayMs}ms, left ${mergeDurationMs}ms linear ${mergeDelayMs}ms, opacity ${mergeFadeMs}ms linear ${mergeFadeDelayMs}ms`
                    : tile.isBombSpawning
                    ? `opacity 10ms linear ${bombSpawnHideDelayMs}ms`
                    : tile.isRemoving
                    ? `all 120ms ease-out ${tile.removalDelayMs ?? 0}ms`
                    : isImmovable
                    ? "opacity 120ms ease-out, transform 200ms ease-out"
                    : isSwapping
                    ? `top ${ANIMATION.SWAP_DURATION}ms linear, left ${ANIMATION.SWAP_DURATION}ms linear, transform 100ms ease-out, opacity 120ms ease-out`
                    : "top 280ms cubic-bezier(0.34, 1.4, 0.64, 1), left 180ms cubic-bezier(0.34, 1.2, 0.64, 1), transform 100ms ease-out, opacity 120ms ease-out",
                zIndex: isSelected ? 20 : 1,
            }}
            disabled={isAnimating || tile.isRemoving || isImmovable}
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
        />
    );
}
