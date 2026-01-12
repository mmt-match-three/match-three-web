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
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2 text-center">
                Goals
            </div>
            <div className="flex justify-center gap-4">
                {goals.map((goal, index) => {
                    const current = progress[goal.tileType] || 0;
                    const isComplete = current >= goal.count;

                    return (
                        <div
                            key={index}
                            className={`flex items-center gap-2 rounded-lg border p-2 transition-colors ${
                                isComplete
                                    ? "border-green-500 bg-green-500/10"
                                    : "border-border bg-card"
                            }`}
                        >
                            <div
                                className="w-8 h-8 rounded-md"
                                style={getTileSpriteStyle(goal.tileType)}
                            />
                            <div className="text-sm font-medium">
                                <span
                                    className={
                                        isComplete
                                            ? "text-green-500"
                                            : "text-foreground"
                                    }
                                >
                                    {Math.min(current, goal.count)}
                                </span>
                                <span className="text-muted-foreground">
                                    /{goal.count}
                                </span>
                            </div>
                            {isComplete && (
                                <svg
                                    className="w-4 h-4 text-green-500"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
