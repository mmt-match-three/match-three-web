"use client";

import * as React from "react";
import Link from "next/link";

type LevelCompleteModalProps = {
    isOpen: boolean;
    isVictory: boolean;
    stars: number;
    onRetry: () => void;
};

function StarIcon({ filled }: { filled: boolean }) {
    return (
        <svg
            className={`w-14 h-14 ${
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
    onRetry,
}: LevelCompleteModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            {/* Modal */}
            <div className="relative bg-card border-2 border-border rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-200">
                {isVictory ? (
                    <>
                        {/* Victory Title */}
                        <h2 className="text-4xl font-bold text-center text-green-400 mb-6">
                            Победа!
                        </h2>

                        {/* Stars */}
                        <div className="flex justify-center gap-2 mb-8">
                            <StarIcon filled={stars >= 1} />
                            <StarIcon filled={stars >= 2} />
                            <StarIcon filled={stars >= 3} />
                        </div>

                        {/* Next button - goes to map */}
                        <Link
                            href="/"
                            className="block w-full py-4 px-6 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-bold text-lg text-center transition-all hover:scale-105 shadow-lg"
                        >
                            Далее
                        </Link>
                    </>
                ) : (
                    <>
                        {/* Defeat Title */}
                        <h2 className="text-3xl font-bold text-center text-red-400 mb-8">
                            Ходы закончились!
                        </h2>

                        {/* Retry button */}
                        <button
                            onClick={onRetry}
                            className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold text-lg transition-all hover:scale-105 shadow-lg"
                        >
                            Попробовать снова
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
