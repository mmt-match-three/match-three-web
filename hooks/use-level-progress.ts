import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@/contexts/user-context";
import type { Level, LevelProgress, LevelsData } from "@/lib/types";

type UseLevelProgressReturn = {
    levels: Level[];
    progress: Record<number, LevelProgress>;
    isLoading: boolean;
    error: string | null;
    isLevelUnlocked: (levelId: number) => boolean;
    getLevelProgress: (levelId: number) => LevelProgress | undefined;
    completeLevel: (
        levelId: number,
        movesUsed: number,
        maxMoves: number,
        starThresholds: [number, number, number]
    ) => void;
    getStarsForMoves: (
        movesRemaining: number,
        starThresholds: [number, number, number]
    ) => number;
};

export function useLevelProgress(): UseLevelProgressReturn {
    const { userId, isLoading: userLoading } = useUser();
    const [levels, setLevels] = useState<Level[]>([]);
    const [levelsLoading, setLevelsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch completed levels from Convex
    const completedLevels = useQuery(
        api.levels.getCompletedLevels,
        userId ? { userId } : "skip"
    );

    // Mutation to save completed level
    const completeLevelMutation = useMutation(api.levels.completeLevel);

    // Convert Convex data to progress record
    const progress = useMemo<Record<number, LevelProgress>>(() => {
        if (!completedLevels) return {};
        return completedLevels;
    }, [completedLevels]);

    // Combined loading state - wait for user, levels JSON, and completed levels from Convex
    const isLoading =
        userLoading ||
        levelsLoading ||
        (userId !== null && completedLevels === undefined);

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
                setLevelsLoading(false);
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
        (
            movesRemaining: number,
            starThresholds: [number, number, number]
        ): number => {
            // starThresholds: [1-star, 2-star, 3-star] moves remaining requirements
            if (movesRemaining >= starThresholds[2]) return 3;
            if (movesRemaining >= starThresholds[1]) return 2;
            if (movesRemaining >= starThresholds[0]) return 1;
            return 1; // Minimum 1 star for completing
        },
        []
    );

    // Complete a level - persists to Convex
    const completeLevel = useCallback(
        (
            levelId: number,
            movesUsed: number,
            maxMoves: number,
            starThresholds: [number, number, number]
        ) => {
            if (!userId) {
                console.warn("Cannot save level progress: no user ID");
                return;
            }

            const movesRemaining = maxMoves - movesUsed;
            const stars = getStarsForMoves(movesRemaining, starThresholds);

            // Save to Convex (the mutation handles checking if update is needed)
            completeLevelMutation({
                userId,
                levelId,
                stars,
                movesUsed,
            }).catch((err) => {
                console.error("Failed to save level completion:", err);
            });
        },
        [userId, getStarsForMoves, completeLevelMutation]
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
