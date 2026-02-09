"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { Level, LevelProgress, LevelGoal } from "@/lib/types";
import { getTileSpriteStyle } from "@/lib/game-utils";
import { WOOD_NORMAL } from "@/lib/constants";

type LevelMapProps = {
    levels: Level[];
    progress: Record<number, LevelProgress>;
    isLevelUnlocked: (levelId: number) => boolean;
};

function StarDisplay({
    stars,
    size = "sm",
}: {
    stars: number;
    size?: "sm" | "lg";
}) {
    const sizeClass = size === "lg" ? "w-6 h-6" : "w-4 h-4";

    return (
        <div className="flex gap-0.5">
            {[1, 2, 3].map((i) => (
                <svg
                    key={i}
                    className={`${sizeClass} ${
                        i <= stars ? "text-yellow-400" : "text-gray-600"
                    }`}
                    fill={i <= stars ? "currentColor" : "none"}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    />
                </svg>
            ))}
        </div>
    );
}

function LockIcon() {
    return (
        <svg
            className="w-6 h-6 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
        </svg>
    );
}

// Level preview modal with goals
function LevelPreviewModal({
    level,
    onPlay,
    onClose,
}: {
    level: Level;
    onPlay: () => void;
    onClose: () => void;
}) {
    // Compute enhanced goals including wooden tiles
    const displayGoals = React.useMemo(() => {
        const goals = [...level.goals];
        
        // Add wooden tile goal if level has wooden tiles
        if (level.woodenTiles && level.woodenTiles.length > 0) {
            const hasWoodenGoal = goals.some((g) => g.tileType === WOOD_NORMAL);
            if (!hasWoodenGoal) {
                goals.push({
                    tileType: WOOD_NORMAL,
                    count: level.woodenTiles.length,
                });
            }
        }
        
        return goals;
    }, [level.goals, level.woodenTiles]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-card border-2 border-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Level number */}
                <h2 className="text-2xl font-bold text-center text-white mb-6">
                    Уровень {level.id}
                </h2>

                {/* Goals */}
                <div className="mb-8">
                    <div className="text-xs text-purple-300 uppercase tracking-wide mb-4 text-center">
                        Цель
                    </div>
                    <div className="flex justify-center gap-6">
                        {displayGoals.map((goal, index) => (
                            <GoalPreview key={index} goal={goal} />
                        ))}
                    </div>
                </div>

                {/* Play button */}
                <button
                    onClick={onPlay}
                    className="w-full py-4 px-6 rounded-xl bg-linear-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold text-lg transition-all hover:scale-105 shadow-lg"
                >
                    Играть
                </button>
            </div>
        </div>
    );
}

function GoalPreview({ goal }: { goal: LevelGoal }) {
    return (
        <div className="flex flex-col items-center">
            <div
                className="w-14 h-14 rounded-lg"
                style={getTileSpriteStyle(goal.tileType)}
            />
            <div className="text-xl font-bold text-white mt-1">
                {goal.count}
            </div>
        </div>
    );
}

export function LevelMap({ levels, progress, isLevelUnlocked }: LevelMapProps) {
    const router = useRouter();
    const [selectedLevel, setSelectedLevel] = React.useState<Level | null>(
        null
    );

    const handleLevelClick = (level: Level) => {
        setSelectedLevel(level);
    };

    const handlePlay = () => {
        if (selectedLevel) {
            router.push(`/level/${selectedLevel.id}`);
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-b from-slate-900 via-purple-950 to-slate-900 py-8 px-4">
            <div className="max-w-md mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">
                        Три в ряд
                    </h1>
                    <p className="text-purple-300">Выберите уровень</p>
                </div>

                {/* Level Path */}
                <div className="relative">
                    {/* Connection line */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-linear-to-b from-purple-600 via-purple-500 to-purple-700 -translate-x-1/2 rounded-full" />

                    {/* Levels */}
                    <div className="relative space-y-6">
                        {levels.map((level, index) => {
                            const isUnlocked = isLevelUnlocked(level.id);
                            const levelProgress = progress[level.id];
                            const isCompleted =
                                levelProgress?.completed ?? false;
                            const stars = levelProgress?.stars ?? 0;

                            // Alternate sides for visual interest
                            const isLeft = index % 2 === 0;

                            return (
                                <div
                                    key={level.id}
                                    className={`flex items-center gap-4 ${
                                        isLeft ? "flex-row" : "flex-row-reverse"
                                    }`}
                                >
                                    {/* Stars display */}
                                    <div
                                        className={`flex-1 ${
                                            isLeft ? "text-right" : "text-left"
                                        }`}
                                    >
                                        {isCompleted && (
                                            <div
                                                className={`flex ${
                                                    isLeft
                                                        ? "justify-end"
                                                        : "justify-start"
                                                }`}
                                            >
                                                <StarDisplay stars={stars} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Level node */}
                                    {isUnlocked ? (
                                        <button
                                            onClick={() =>
                                                handleLevelClick(level)
                                            }
                                            className={`
                                                relative z-10 w-16 h-16 rounded-full
                                                flex items-center justify-center
                                                font-bold text-xl
                                                transition-all duration-200
                                                hover:scale-110 hover:shadow-lg
                                                ${
                                                    isCompleted
                                                        ? "bg-linear-to-br from-green-400 to-green-600 text-white shadow-green-500/30"
                                                        : "bg-linear-to-br from-purple-400 to-purple-600 text-white shadow-purple-500/30"
                                                }
                                                shadow-lg
                                            `}
                                        >
                                            {level.id}
                                        </button>
                                    ) : (
                                        <div
                                            className="
                                                relative z-10 w-16 h-16 rounded-full
                                                flex items-center justify-center
                                                bg-gray-700 border-2 border-gray-600
                                                cursor-not-allowed
                                            "
                                        >
                                            <LockIcon />
                                        </div>
                                    )}

                                    {/* Spacer for alignment */}
                                    <div className="flex-1" />
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer hint */}
                <div className="mt-12 text-center text-sm text-purple-400">
                    Пройдите уровни, чтобы открыть новые!
                </div>
            </div>

            {/* Level Preview Modal */}
            {selectedLevel && (
                <LevelPreviewModal
                    level={selectedLevel}
                    onPlay={handlePlay}
                    onClose={() => setSelectedLevel(null)}
                />
            )}
        </div>
    );
}
