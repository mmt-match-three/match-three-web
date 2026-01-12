import { useState, useEffect, useCallback } from "react";
import type { Level, LevelProgress, LevelsData } from "@/lib/types";

type UseLevelProgressReturn = {
    levels: Level[];
    progress: Record<number, LevelProgress>;
    isLoading: boolean;
    error: string | null;
    isLevelUnlocked: (levelId: number) => boolean;
    getLevelProgress: (levelId: number) => LevelProgress | undefined;
    completeLevel: (levelId: number, movesUsed: number, maxMoves: number, starThresholds: [number, number, number]) => void;
    getStarsForMoves: (movesRemaining: number, starThresholds: [number, number, number]) => number;
};

export function useLevelProgress(): UseLevelProgressReturn {
    const [levels, setLevels] = useState<Level[]>([]);
    const [progress, setProgress] = useState<Record<number, LevelProgress>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load levels from JSON
    useEffect(() => {
        async function loadLevels() {
            try {
                const response = await fetch("/levels.json");
                if (!response.ok) {
                    throw new Error("Failed to load levels");
                }
                const data: LevelsData = await response.json();
                setLevels(data.levels);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Unknown error");
            } finally {
                setIsLoading(false);
            }
        }

        loadLevels();
    }, []);

    // Check if a level is unlocked
    const isLevelUnlocked = useCallback(
        (levelId: number): boolean => {
            // Level 1 is always unlocked
            if (levelId === 1) return true;

            // Check if previous level is completed
            const previousLevelProgress = progress[levelId - 1];
            return previousLevelProgress?.completed ?? false;
        },
        [progress]
    );

    // Get progress for a specific level
    const getLevelProgress = useCallback(
        (levelId: number): LevelProgress | undefined => {
            return progress[levelId];
        },
        [progress]
    );

    // Calculate stars based on moves remaining
    const getStarsForMoves = useCallback(
        (movesRemaining: number, starThresholds: [number, number, number]): number => {
            // starThresholds: [1-star, 2-star, 3-star] moves remaining requirements
            if (movesRemaining >= starThresholds[2]) return 3;
            if (movesRemaining >= starThresholds[1]) return 2;
            if (movesRemaining >= starThresholds[0]) return 1;
            return 1; // Minimum 1 star for completing
        },
        []
    );

    // Complete a level
    const completeLevel = useCallback(
        (
            levelId: number,
            movesUsed: number,
            maxMoves: number,
            starThresholds: [number, number, number]
        ) => {
            const movesRemaining = maxMoves - movesUsed;
            const stars = getStarsForMoves(movesRemaining, starThresholds);

            setProgress((prev) => {
                const existingProgress = prev[levelId];

                // Only update if new result is better
                if (
                    existingProgress &&
                    existingProgress.stars >= stars &&
                    existingProgress.bestMoves <= movesUsed
                ) {
                    return prev;
                }

                return {
                    ...prev,
                    [levelId]: {
                        completed: true,
                        stars: Math.max(stars, existingProgress?.stars ?? 0),
                        bestMoves: Math.min(
                            movesUsed,
                            existingProgress?.bestMoves ?? Infinity
                        ),
                    },
                };
            });
        },
        [getStarsForMoves]
    );

    return {
        levels,
        progress,
        isLoading,
        error,
        isLevelUnlocked,
        getLevelProgress,
        completeLevel,
        getStarsForMoves,
    };
}
