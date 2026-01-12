"use client";

import * as React from "react";
import Link from "next/link";

type LevelCompleteModalProps = {
    isOpen: boolean;
    isVictory: boolean;
    stars: number;
    levelId: number;
    score: number;
    onRetry: () => void;
    hasNextLevel: boolean;
};

function StarIcon({ filled }: { filled: boolean }) {
    return (
        <svg
            className={`w-12 h-12 ${
                filled ? "text-yellow-400" : "text-gray-600"
            }`}
            fill={filled ? "currentColor" : "none"}
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
    );
}

export function LevelCompleteModal({
    isOpen,
    isVictory,
    stars,
    levelId,
    score,
    onRetry,
    hasNextLevel,
}: LevelCompleteModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            {/* Modal */}
            <div className="relative bg-card border-2 border-border rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Title */}
                <h2
                    className={`text-3xl font-bold text-center mb-4 ${
                        isVictory ? "text-green-400" : "text-red-400"
                    }`}
                >
                    {isVictory ? "Level Complete!" : "Out of Moves!"}
                </h2>

                {/* Stars (only for victory) */}
                {isVictory && (
                    <div className="flex justify-center gap-2 mb-6">
                        <StarIcon filled={stars >= 1} />
                        <StarIcon filled={stars >= 2} />
                        <StarIcon filled={stars >= 3} />
                    </div>
                )}

                {/* Score */}
                <div className="text-center mb-8">
                    <div className="text-sm text-muted-foreground uppercase tracking-wide">
                        Score
                    </div>
                    <div className="text-4xl font-bold text-primary">
                        {score}
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex flex-col gap-3">
                    {isVictory && hasNextLevel && (
                        <Link
                            href={`/level/${levelId + 1}`}
                            className="w-full py-3 px-6 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold text-center transition-colors"
                        >
                            Next Level
                        </Link>
                    )}

                    <button
                        onClick={onRetry}
                        className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                            isVictory
                                ? "bg-muted hover:bg-muted/80 text-foreground"
                                : "bg-primary hover:bg-primary/90 text-primary-foreground"
                        }`}
                    >
                        {isVictory ? "Play Again" : "Try Again"}
                    </button>

                    <Link
                        href="/"
                        className="w-full py-3 px-6 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-semibold text-center transition-colors"
                    >
                        Back to Levels
                    </Link>
                </div>
            </div>
        </div>
    );
}
