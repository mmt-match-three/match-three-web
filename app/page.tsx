"use client";

import { useLevelProgress } from "@/hooks/use-level-progress";
import { LevelMap } from "@/components/game/level-map";

export default function Page() {
    const { levels, progress, isLoading, error, isLevelUnlocked } =
        useLevelProgress();

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-linear-to-b from-slate-900 via-purple-950 to-slate-900">
                <div className="text-lg text-purple-300">Loading levels...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-linear-to-b from-slate-900 via-purple-950 to-slate-900">
                <div className="text-center">
                    <div className="text-lg text-red-400 mb-4">{error}</div>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-500 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <LevelMap
            levels={levels}
            progress={progress}
            isLevelUnlocked={isLevelUnlocked}
        />
    );
}
