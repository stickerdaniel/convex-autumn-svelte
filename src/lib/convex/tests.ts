import { createAccount } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { internalAction, internalQuery } from "./_generated/server";

const TEST_USER_EMAIL = "secret@secret.com";

/**
 * Retrieves the test user from the database.
 *
 * @returns The test user object if found, null otherwise.
 */
export const getTestUser = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.find((u) => u.email === TEST_USER_EMAIL) ?? null;
  },
});

/**
 * Initializes the test user in the database.
 *
 * Creates a test user account if one does not already exist using the
 * configured test user email address.
 */
export const init = internalAction({
  args: {},
  handler: async (ctx) => {
    const existingUser = await ctx.runQuery(internal.tests.getTestUser);
    if (existingUser !== null) {
      console.info("Test user already exists, skipping creation");
      return;
    }
    await createAccount(ctx, {
      provider: "secret",
      account: { id: TEST_USER_EMAIL },
      profile: { email: TEST_USER_EMAIL },
    });
    console.info("Test user created");
  },
});
