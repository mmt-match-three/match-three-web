"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { getTileSpriteStyle, isWoodenTile, isStoneTile } from "@/lib/game-utils";
import type { Tile } from "@/lib/types";
import { GRID_GAP, GRID_PADDING } from "@/lib/constants";

type TileCellProps = {
    tile: Tile;
    cellSize: number;
    isSelected: boolean;
    isAnimating: boolean;
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
    onClick,
    onMouseEnter,
    onMouseDown,
    onTouchStart,
}: TileCellProps) {
    const left = GRID_PADDING + tile.col * (cellSize + GRID_GAP);
    const top = GRID_PADDING + tile.row * (cellSize + GRID_GAP);
    const isWooden = isWoodenTile(tile.type);
    const isStone = isStoneTile(tile.type);
    const isImmovable = isWooden || isStone;

    return (
        <button
            type="button"
            className={cn(
                "absolute rounded-lg overflow-hidden outline-none",
                isImmovable ? "cursor-default" : "cursor-pointer",
                !isImmovable && "active:brightness-125",
                isSelected && "z-20 brightness-125",
                tile.isRemoving && "opacity-0 scale-0 pointer-events-none"
            )}
            style={{
                width: `${cellSize}px`,
                height: `${cellSize}px`,
                left: `${left}px`,
                top: `${top}px`,
                ...getTileSpriteStyle(tile.type),
                // Bouncy spring-like animation for playful feel
                // Wooden and stone tiles don't fall, so they have different transitions
                transition: tile.isNew
                    ? "none"
                    : tile.isRemoving
                    ? "all 120ms ease-out"
                    : isImmovable
                    ? "opacity 120ms ease-out, transform 200ms ease-out"
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
