import { useCallback } from "react";
import type { Tile, Position, MatchInfo } from "@/lib/types";
import { tilesToGrid, isBomb, isWoodenTile } from "@/lib/game-utils";

type UseMatchDetectionProps = {
    rows: number;
    cols: number;
};

export function useMatchDetection({ rows, cols }: UseMatchDetectionProps) {
    /**
     * Find all matches in the grid with direction info
     */
    const findMatches = useCallback(
        (tiles: Tile[]): MatchInfo[] => {
            const grid = tilesToGrid(tiles, rows, cols);
            const matches: MatchInfo[] = [];

            // Check horizontal matches (no visited set - allow overlaps for L-shape detection)
            for (let row = 0; row < rows; row++) {
                let count = 1;
                let currentType = grid[row][0];
                let startCol = 0;

                for (let col = 1; col <= cols; col++) {
                    const cellType = col < cols ? grid[row][col] : -1;

                    if (
                        cellType === currentType &&
                        currentType >= 0 &&
                        !isBomb(currentType) &&
                        !isWoodenTile(currentType)
                    ) {
                        count++;
                    } else {
                        if (
                            count >= 3 &&
                            currentType >= 0 &&
                            !isBomb(currentType) &&
                            !isWoodenTile(currentType)
                        ) {
                            const positions: Position[] = [];
                            for (let i = startCol; i < startCol + count; i++) {
                                positions.push({ row, col: i });
                            }
                            matches.push({
                                positions,
                                direction: "horizontal",
                                matchLength: count,
                                tileType: currentType,
                                startRow: row,
                                endRow: row,
                                startCol: startCol,
                                endCol: startCol + count - 1,
                            });
                        }
                        count = 1;
                        currentType = cellType;
                        startCol = col;
                    }
                }
            }

            // Check vertical matches
            for (let col = 0; col < cols; col++) {
                let count = 1;
                let currentType = grid[0][col];
                let startRow = 0;

                for (let row = 1; row <= rows; row++) {
                    const cellType = row < rows ? grid[row][col] : -1;

                    if (
                        cellType === currentType &&
                        currentType >= 0 &&
                        !isBomb(currentType) &&
                        !isWoodenTile(currentType)
                    ) {
                        count++;
                    } else {
                        if (
                            count >= 3 &&
                            currentType >= 0 &&
                            !isBomb(currentType) &&
                            !isWoodenTile(currentType)
                        ) {
                            const positions: Position[] = [];
                            for (let i = startRow; i < startRow + count; i++) {
                                positions.push({ row: i, col });
                            }
                            matches.push({
                                positions,
                                direction: "vertical",
                                matchLength: count,
                                tileType: currentType,
                                startRow: startRow,
                                endRow: startRow + count - 1,
                                startCol: col,
                                endCol: col,
                            });
                        }
                        count = 1;
                        currentType = cellType;
                        startRow = row;
                    }
                }
            }

            return matches;
        },
        [rows, cols]
    );

    /**
     * Check if a swap would create a valid match
     */
    const isValidSwap = useCallback(
        (tiles: Tile[], from: Position, to: Position): boolean => {
            // Temporarily swap
            const testTiles = tiles.map((t) => {
                if (t.row === from.row && t.col === from.col) {
                    return { ...t, row: to.row, col: to.col };
                }
                if (t.row === to.row && t.col === to.col) {
                    return { ...t, row: from.row, col: from.col };
                }
                return t;
            });

            const matches = findMatches(testTiles);
            return matches.length > 0;
        },
        [findMatches]
    );

    return {
        findMatches,
        isValidSwap,
    };
}
