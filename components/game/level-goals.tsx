"use client";

import * as React from "react";
import type { LevelGoal } from "@/lib/types";
import { getTileSpriteStyle } from "@/lib/game-utils";

type LevelGoalsProps = {
    goals: LevelGoal[];
    progress: Record<number, number>;
};

export function LevelGoals({ goals, progress }: LevelGoalsProps) {
    return (
        <div className="mt-4 w-full max-w-[500px]">
            <div className="flex justify-center">
                <div className="inline-flex items-center gap-4 rounded-xl border border-border bg-card/80 backdrop-blur-sm px-4 py-3">
                    {goals.map((goal, index) => {
                        const current = progress[goal.tileType] || 0;
                        const remaining = Math.max(0, goal.count - current);
                        const isComplete = remaining === 0;

                        return (
                            <div
                                key={index}
                                className={`transition-all ${
                                    isComplete ? "opacity-50" : ""
                                }`}
                            >
                                <div className="relative w-11 h-11">
                                    <div
                                        className={`w-11 h-11 rounded-md ${
                                            isComplete ? "grayscale" : ""
                                        }`}
                                        style={getTileSpriteStyle(
                                            goal.tileType
                                        )}
                                    />
                                    <div
                                        className={`absolute bottom-[-4] right-[-2] text-2xl font-bold px-0.5 [text-shadow:-1px_-1px_0_#fff,1px_-1px_0_#fff,-1px_1px_0_#fff,1px_1px_0_#fff] ${
                                            isComplete
                                                ? "text-green-500"
                                                : "text-black"
                                        }`}
                                    >
                                        {isComplete ? "✓" : remaining}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
