"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useLevelProgress } from "@/hooks/use-level-progress";
import { GameBoard } from "@/components/game/game-board";
import { LevelHeader } from "@/components/game/level-header";
import { LevelGoals } from "@/components/game/level-goals";
import { LevelCompleteModal } from "@/components/game/level-complete-modal";

export default function LevelPage() {
    const params = useParams();
    const router = useRouter();
    const levelId = parseInt(params.id as string, 10);

    const {
        levels,
        isLoading,
        error,
        isLevelUnlocked,
        completeLevel,
        getStarsForMoves,
    } = useLevelProgress();

    const [goalProgress, setGoalProgress] = React.useState<Record<number, number>>({});
    const [score, setScore] = React.useState(0);
    const [movesUsed, setMovesUsed] = React.useState(0);
    const [showModal, setShowModal] = React.useState(false);
    const [isVictory, setIsVictory] = React.useState(false);
    const [stars, setStars] = React.useState(0);
    const [gameKey, setGameKey] = React.useState(0);

    const level = levels.find((l) => l.id === levelId);
    const hasNextLevel = levels.some((l) => l.id === levelId + 1);

    // Redirect if level not unlocked
    React.useEffect(() => {
        if (!isLoading && level && !isLevelUnlocked(levelId)) {
            router.push("/");
        }
    }, [isLoading, level, levelId, isLevelUnlocked, router]);

    const handleComplete = React.useCallback(
        (usedMoves: number) => {
            if (!level) return;

            setMovesUsed(usedMoves);
            const movesRemaining = level.maxMoves - usedMoves;
            const earnedStars = getStarsForMoves(
                movesRemaining,
                level.starThresholds
            );

            setStars(earnedStars);
            setIsVictory(true);
            setShowModal(true);

            // Save progress
            completeLevel(
                levelId,
                usedMoves,
                level.maxMoves,
                level.starThresholds
            );
        },
        [level, levelId, completeLevel, getStarsForMoves]
    );

    const handleFailed = React.useCallback(() => {
        setIsVictory(false);
        setShowModal(true);
    }, []);

    const handleRetry = React.useCallback(() => {
        setShowModal(false);
        setGoalProgress({});
        setScore(0);
        setMovesUsed(0);
        setGameKey((prev) => prev + 1);
    }, []);

    const handleGoalProgressUpdate = React.useCallback(
        (progress: Record<number, number>) => {
            setGoalProgress(progress);
        },
        []
    );

    const handleScoreUpdate = React.useCallback((newScore: number) => {
        setScore(newScore);
    }, []);

    const handleMovesUpdate = React.useCallback((newMovesUsed: number) => {
        setMovesUsed(newMovesUsed);
    }, []);

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="text-lg text-muted-foreground">Loading...</div>
            </div>
        );
    }

    if (error || !level) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="text-center">
                    <div className="text-lg text-destructive mb-4">
                        {error || "Level not found"}
                    </div>
                    <button
                        onClick={() => router.push("/")}
                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground"
                    >
                        Back to Levels
                    </button>
                </div>
            </div>
        );
    }

    const movesRemaining = level.maxMoves - movesUsed;

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <LevelHeader
                level={level}
                movesRemaining={movesRemaining}
                score={score}
            />

            <GameBoard
                key={gameKey}
                level={level}
                onComplete={handleComplete}
                onFailed={handleFailed}
                onGoalProgressUpdate={handleGoalProgressUpdate}
                onScoreUpdate={handleScoreUpdate}
                onMovesUpdate={handleMovesUpdate}
            />

            <LevelGoals goals={level.goals} progress={goalProgress} />

            <LevelCompleteModal
                isOpen={showModal}
                isVictory={isVictory}
                stars={stars}
                levelId={levelId}
                score={score}
                onRetry={handleRetry}
                hasNextLevel={hasNextLevel}
            />
        </div>
    );
}
