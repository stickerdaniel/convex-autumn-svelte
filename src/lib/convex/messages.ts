import { getAuthUserId } from "@convex-dev/auth/server";
import { query, internalMutation, action } from "./_generated/server";
import { v } from "convex/values";
import { autumn } from "./autumn";
import { internal } from "./_generated/api";

/**
 * Retrieves the 100 most recent messages with author information.
 *
 * @returns Array of messages in chronological order with author names
 * @throws Error if user is not authenticated
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not signed in");
    }
    const messages = await ctx.db.query("messages").order("desc").take(100);
    return Promise.all(
      messages.reverse().map(async (message) => {
        const { name, email, phone } = (await ctx.db.get(message.userId))!;
        return { ...message, author: name ?? email ?? phone ?? "Anonymous" };
      }),
    );
  },
});

/**
 * Sends a new message with Autumn billing checks and usage tracking.
 *
 * @param body - The message content to send
 * @returns Promise that resolves when message is sent and tracked
 * @throws Error if user is not authenticated or has reached message limit
 */
export const send = action({
  args: { body: v.string() },
  handler: async (ctx, { body }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not signed in");
    }

    const { data: checkData } = await autumn.check(ctx, { featureId: "messages" });
    if (!checkData || !checkData.allowed) {
      throw new Error("Message limit reached. Upgrade to Pro!");
    }

    await ctx.runMutation(internal.messages.insertMessage, { body, userId });

    await autumn.track(ctx, { featureId: "messages", value: 1 });
  },
});

/**
 * Internal mutation for inserting messages into the database.
 *
 * Called from the send action to ensure proper separation of concerns.
 *
 * @param body - The message content
 * @param userId - The ID of the user sending the message
 * @returns Promise that resolves when message is inserted
 */
export const insertMessage = internalMutation({
  args: { body: v.string(), userId: v.id("users") },
  handler: async (ctx, { body, userId }) => {
    await ctx.db.insert("messages", { body, userId });
  },
});
