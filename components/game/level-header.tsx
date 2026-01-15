"use client";

import * as React from "react";
import Link from "next/link";
import type { Level } from "@/lib/types";

type LevelHeaderProps = {
    level: Level;
    movesRemaining: number;
};

export function LevelHeader({ level, movesRemaining }: LevelHeaderProps) {
    return (
        <div className="mb-4 w-full max-w-[500px]">
            <div className="flex items-center justify-between">
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
                    Назад
                </Link>

                <span className="text-lg font-bold text-foreground">
                    Уровень {level.id}
                </span>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">
                        Ходы
                    </span>
                    <span
                        className={`text-xl font-bold ${
                            movesRemaining <= 3
                                ? "text-destructive"
                                : "text-foreground"
                        }`}
                    >
                        {movesRemaining}
                    </span>
                </div>
            </div>
        </div>
    );
}
