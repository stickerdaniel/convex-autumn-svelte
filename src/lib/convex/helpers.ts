import { authTables } from "@convex-dev/auth/server";
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Deletes all auth-related data for development and testing purposes.
 *
 * @param args.forReal - Safety string that must equal "I know what I'm doing"
 * @returns Void promise after deleting all records from auth tables
 */
export const reset = internalMutation({
  args: { forReal: v.string() },
  handler: async (ctx, args) => {
    if (args.forReal !== "I know what I'm doing") {
      throw new Error("You must know what you're doing to reset the database.");
    }
    for (const table of Object.keys(authTables)) {
      for (const { _id } of await ctx.db.query(table as any).collect()) {
        await ctx.db.delete(_id);
      }
    }
  },
});
