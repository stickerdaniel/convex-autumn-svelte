import { ConvexCredentials } from '@convex-dev/auth/providers/ConvexCredentials';
import GitHub from '@auth/core/providers/github';
import { convexAuth } from '@convex-dev/auth/server';
import { internal } from './_generated/api';

/**
 * Convex authentication configuration with GitHub and test credentials.
 *
 * Exports auth methods for handling user authentication in the application.
 * Includes GitHub OAuth provider and a secret-based provider for E2E testing.
 *
 * @returns Object containing auth, signIn, signOut, store, and isAuthenticated functions
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
	providers: [
		GitHub,
		ConvexCredentials({
			id: 'secret',
			authorize: async (params, ctx) => {
				const secret = params.secret;
				const primarySecret =
					process.env.AUTH_E2E_TEST_SECRET_PRIMARY ?? process.env.AUTH_E2E_TEST_SECRET;
				const secondarySecret = process.env.AUTH_E2E_TEST_SECRET_SECONDARY;

				if (primarySecret && secret === primarySecret) {
					const user = await ctx.runQuery(internal.tests.getPrimaryTestUser);
					return { userId: user!._id };
				}

				if (secondarySecret && secret === secondarySecret) {
					const user = await ctx.runQuery(internal.tests.getSecondaryTestUser);
					return { userId: user!._id };
				}
				throw new Error('Invalid secret');
			}
		})
	]
});
