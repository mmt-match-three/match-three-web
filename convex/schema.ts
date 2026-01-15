import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    users: defineTable({
        telegramId: v.number(),
        username: v.string(),
        firstName: v.string(),
        lastName: v.string(),
    }).index("by_telegram_id", ["telegramId"]),

    completedLevels: defineTable({
        userId: v.id("users"),
        levelId: v.number(),
        stars: v.number(),
        bestMoves: v.number(),
        completedAt: v.number(),
    })
        .index("by_user", ["userId"])
        .index("by_user_and_level", ["userId", "levelId"]),
});
