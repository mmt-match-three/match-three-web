"use client";

import * as React from "react";
import Link from "next/link";
import type { Level, LevelProgress } from "@/lib/types";

type LevelMapProps = {
    levels: Level[];
    progress: Record<number, LevelProgress>;
    isLevelUnlocked: (levelId: number) => boolean;
};

function StarDisplay({ stars, size = "sm" }: { stars: number; size?: "sm" | "lg" }) {
    const sizeClass = size === "lg" ? "w-5 h-5" : "w-3 h-3";

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

export function LevelMap({ levels, progress, isLevelUnlocked }: LevelMapProps) {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-950 to-slate-900 py-8 px-4">
            <div className="max-w-md mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">
                        Match Three
                    </h1>
                    <p className="text-purple-300">Select a level to play</p>
                </div>

                {/* Level Path */}
                <div className="relative">
                    {/* Connection line */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-600 via-purple-500 to-purple-700 -translate-x-1/2 rounded-full" />

                    {/* Levels */}
                    <div className="relative space-y-6">
                        {levels.map((level, index) => {
                            const isUnlocked = isLevelUnlocked(level.id);
                            const levelProgress = progress[level.id];
                            const isCompleted = levelProgress?.completed ?? false;
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
                                    {/* Level info card */}
                                    <div
                                        className={`flex-1 ${
                                            isLeft ? "text-right" : "text-left"
                                        }`}
                                    >
                                        {isUnlocked && (
                                            <div className="space-y-1">
                                                <div className="text-sm text-purple-300">
                                                    {level.dimensions.rows}x
                                                    {level.dimensions.cols}
                                                </div>
                                                <div className="text-white font-medium">
                                                    {level.name}
                                                </div>
                                                {isCompleted && (
                                                    <div
                                                        className={`flex ${
                                                            isLeft
                                                                ? "justify-end"
                                                                : "justify-start"
                                                        }`}
                                                    >
                                                        <StarDisplay
                                                            stars={stars}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Level node */}
                                    {isUnlocked ? (
                                        <Link
                                            href={`/level/${level.id}`}
                                            className={`
                                                relative z-10 w-16 h-16 rounded-full
                                                flex items-center justify-center
                                                font-bold text-xl
                                                transition-all duration-200
                                                hover:scale-110 hover:shadow-lg
                                                ${
                                                    isCompleted
                                                        ? "bg-gradient-to-br from-green-400 to-green-600 text-white shadow-green-500/30"
                                                        : "bg-gradient-to-br from-purple-400 to-purple-600 text-white shadow-purple-500/30"
                                                }
                                                shadow-lg
                                            `}
                                        >
                                            {level.id}
                                        </Link>
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
                    Complete levels to unlock more!
                </div>
            </div>
        </div>
    );
}
