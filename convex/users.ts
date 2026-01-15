import { v } from "convex/values";
import { mutation, MutationCtx, query, QueryCtx } from "./_generated/server";

export const getUser = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.userId);
    },
});

export const ensureUser = mutation({
    args: {
        telegramUser: v.any(),
    },
    handler: async (ctx, args) => {
        const user = await getOrCreateUserByTelegramUser(
            ctx,
            args.telegramUser
        );
        return user;
    },
});

export async function getUserByTelegramId(ctx: QueryCtx, telegramId: number) {
    const user = await ctx.db
        .query("users")
        .withIndex("by_telegram_id", (q) => q.eq("telegramId", telegramId))
        .first();

    if (!user) {
        return null;
    }

    return user;
}

export async function getUserByTelegramUser(
    ctx: QueryCtx,
    telegramUser: {
        id: number;
        firstName?: string;
        lastName?: string;
        username?: string;
    }
) {
    if (!telegramUser?.id) return null;
    return await getUserByTelegramId(ctx, telegramUser.id);
}

export async function getOrCreateUserByTelegramUser(
    ctx: MutationCtx,
    telegramUser: {
        id: number;
        firstName?: string;
        lastName?: string;
        username?: string;
    }
) {
    const existing = await getUserByTelegramId(ctx, telegramUser.id);
    if (existing) return existing;

    const username = telegramUser.username ?? "";
    const firstName = telegramUser.firstName ?? "";
    const lastName = telegramUser.lastName ?? "";

    const newUserId = await ctx.db.insert("users", {
        telegramId: telegramUser.id,
        username: username,
        firstName: firstName,
        lastName: lastName,
    });

    return await ctx.db.get(newUserId);
}
