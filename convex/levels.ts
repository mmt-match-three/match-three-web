import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all completed levels for a user
export const getCompletedLevels = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const completedLevels = await ctx.db
            .query("completedLevels")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();

        // Convert to a record keyed by levelId for easy lookup
        const progressRecord: Record<
            number,
            { completed: boolean; stars: number; bestMoves: number }
        > = {};

        for (const level of completedLevels) {
            progressRecord[level.levelId] = {
                completed: true,
                stars: level.stars,
                bestMoves: level.bestMoves,
            };
        }

        return progressRecord;
    },
});

// Save a completed level (only called when level is actually completed)
export const completeLevel = mutation({
    args: {
        userId: v.id("users"),
        levelId: v.number(),
        stars: v.number(),
        movesUsed: v.number(),
    },
    handler: async (ctx, args) => {
        // Check if this level was already completed by this user
        const existing = await ctx.db
            .query("completedLevels")
            .withIndex("by_user_and_level", (q) =>
                q.eq("userId", args.userId).eq("levelId", args.levelId)
            )
            .first();

        if (existing) {
            // Only update if new result is better (more stars or fewer moves)
            const shouldUpdate =
                args.stars > existing.stars ||
                (args.stars === existing.stars &&
                    args.movesUsed < existing.bestMoves);

            if (shouldUpdate) {
                await ctx.db.patch(existing._id, {
                    stars: Math.max(args.stars, existing.stars),
                    bestMoves: Math.min(args.movesUsed, existing.bestMoves),
                    completedAt: Date.now(),
                });
            }

            return existing._id;
        }

        // Create new completion record
        const newId = await ctx.db.insert("completedLevels", {
            userId: args.userId,
            levelId: args.levelId,
            stars: args.stars,
            bestMoves: args.movesUsed,
            completedAt: Date.now(),
        });

        return newId;
    },
});
