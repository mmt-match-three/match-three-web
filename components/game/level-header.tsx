"use client";

import * as React from "react";
import Link from "next/link";
import type { Level } from "@/lib/types";

type LevelHeaderProps = {
    level: Level;
    movesRemaining: number;
    score: number;
};

export function LevelHeader({ level, movesRemaining, score }: LevelHeaderProps) {
    return (
        <div className="mb-4 w-full max-w-[500px]">
            <div className="flex items-center justify-between mb-2">
                <Link
                    href="/"
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                        />
                    </svg>
                    Back
                </Link>
                <span className="text-sm font-medium text-muted-foreground">
                    Level {level.id}
                </span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-card border border-border p-3">
                <div className="text-center">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">
                        Moves
                    </div>
                    <div
                        className={`text-2xl font-bold ${
                            movesRemaining <= 3
                                ? "text-destructive"
                                : "text-foreground"
                        }`}
                    >
                        {movesRemaining}
                    </div>
                </div>

                <div className="text-center flex-1">
                    <div className="text-lg font-semibold text-foreground">
                        {level.name}
                    </div>
                </div>

                <div className="text-center">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">
                        Score
                    </div>
                    <div className="text-2xl font-bold text-primary">
                        {score}
                    </div>
                </div>
            </div>
        </div>
    );
}
