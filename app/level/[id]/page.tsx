"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import type { LevelGoal } from "@/lib/types";
import { useLevelProgress } from "@/hooks/use-level-progress";
import { GameBoard } from "@/components/game/game-board";
import { LevelHeader } from "@/components/game/level-header";
import { LevelGoals } from "@/components/game/level-goals";
import { LevelCompleteModal } from "@/components/game/level-complete-modal";
import { LoadingScreen } from "@/components/game/loading-screen";

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

    const [goalProgress, setGoalProgress] = React.useState<
        Record<number, number>
    >({});
    const [currentGoals, setCurrentGoals] = React.useState<LevelGoal[]>([]);
    const [movesUsed, setMovesUsed] = React.useState(0);
    const [showModal, setShowModal] = React.useState(false);
    const [isVictory, setIsVictory] = React.useState(false);
    const [stars, setStars] = React.useState(0);
    const [gameKey, setGameKey] = React.useState(0);

    const level = levels.find((l) => l.id === levelId);

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
        setMovesUsed(0);
        setGameKey((prev) => prev + 1);
    }, []);

    const handleGoalsUpdate = React.useCallback((goals: LevelGoal[]) => {
        setCurrentGoals(goals);
    }, []);

    const handleGoalProgressUpdate = React.useCallback(
        (progress: Record<number, number>) => {
            setGoalProgress(progress);
        },
        []
    );

    const handleMovesUpdate = React.useCallback((newMovesUsed: number) => {
        setMovesUsed(newMovesUsed);
    }, []);

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (error || !level) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="text-center">
                    <div className="text-lg text-destructive mb-4">
                        {error || "Уровень не найден"}
                    </div>
                    <button
                        onClick={() => router.push("/")}
                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground"
                    >
                        Назад
                    </button>
                </div>
            </div>
        );
    }

    const movesRemaining = level.maxMoves - movesUsed;

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <LevelHeader level={level} movesRemaining={movesRemaining} />

            <GameBoard
                key={gameKey}
                level={level}
                onComplete={handleComplete}
                onFailed={handleFailed}
                onGoalProgressUpdate={handleGoalProgressUpdate}
                onMovesUpdate={handleMovesUpdate}
                onGoalsUpdate={handleGoalsUpdate}
            />

            <LevelGoals
                goals={currentGoals.length > 0 ? currentGoals : level.goals}
                progress={goalProgress}
            />

            <LevelCompleteModal
                isOpen={showModal}
                isVictory={isVictory}
                stars={stars}
                onRetry={handleRetry}
            />
        </div>
    );
}
