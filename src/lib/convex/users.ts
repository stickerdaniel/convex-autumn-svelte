import { getAuthUserId } from "@convex-dev/auth/server";
import { query, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Retrieves the currently authenticated user's data.
 *
 * @returns The user document if authenticated, null otherwise.
 */
export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    return userId !== null ? ctx.db.get(userId) : null;
  },
});

/**
 * Retrieves a user by their ID.
 *
 * @param userId - The ID of the user to retrieve.
 * @returns The user document if found, null otherwise.
 */
export const getUserById = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db.get(userId);
  },
});
