import { createAccount } from "@convex-dev/auth/server";
import { internalAction, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const PRIMARY_TEST_USER_EMAIL = "secret@secret.com";
export const SECONDARY_TEST_USER_EMAIL = "secret+secondary@secret.com";

const TEST_USER_EMAILS = [PRIMARY_TEST_USER_EMAIL, SECONDARY_TEST_USER_EMAIL];

async function findUserByEmail(ctx: any, email: string) {
	const users: any[] = await ctx.db.query("users").collect();
	return users.find((user) => user.email === email) ?? null;
}

/**
 * Retrieves a test user by email address.
 */
export const getTestUserByEmail = internalQuery({
	args: { email: v.string() },
	handler: async (ctx, { email }) => await findUserByEmail(ctx, email),
});

/**
 * Retrieves the primary test user from the database.
 *
 * @returns The test user object if found, null otherwise.
 */
export const getPrimaryTestUser = internalQuery({
	args: {},
	handler: async (ctx) => await findUserByEmail(ctx, PRIMARY_TEST_USER_EMAIL),
});

/**
 * Retrieves the secondary test user from the database.
 *
 * @returns The test user object if found, null otherwise.
 */
export const getSecondaryTestUser = internalQuery({
	args: {},
	handler: async (ctx) => await findUserByEmail(ctx, SECONDARY_TEST_USER_EMAIL),
});

/**
 * Retrieves both configured test users.
 */
export const getTestUsers = internalQuery({
	args: {},
	handler: async (ctx) => {
		const users = await ctx.db.query("users").collect();
		return {
			primary: users.find((user) => user.email === PRIMARY_TEST_USER_EMAIL) ?? null,
			secondary: users.find((user) => user.email === SECONDARY_TEST_USER_EMAIL) ?? null,
		};
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
    for (const email of TEST_USER_EMAILS) {
      const existingUser = await findUserByEmail(ctx, email);
      if (existingUser !== null) {
        console.info(`Test user ${email} already exists, skipping creation`);
        continue;
      }

      await createAccount(ctx, {
        provider: "secret",
        account: { id: email },
        profile: { email },
      });
      console.info(`Test user ${email} created`);
    }
  },
});
