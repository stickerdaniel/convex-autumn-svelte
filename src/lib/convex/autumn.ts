import { Autumn } from "@useautumn/convex";
import { components, internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { GenericQueryCtx, GenericMutationCtx, GenericActionCtx } from "convex/server";
import type { DataModel } from "./_generated/dataModel";


const secretKey = process.env.AUTUMN_SECRET_KEY;
if (!secretKey) {
	throw new Error("AUTUMN_SECRET_KEY is required. Set it with bunx convex env set AUTUMN_SECRET_KEY am_sk_*_...");
}
if (!secretKey.startsWith('am_sk_')) {
	throw new Error("AUTUMN_SECRET_KEY must start with 'am_sk_'");
}

/**
 * Autumn billing instance configured with authentication and customer identification.
 *
 * This instance automatically identifies customers using Convex Auth and retrieves
 * user data for billing operations.
 */
export const autumn = new Autumn(components.autumn, {
	secretKey: secretKey,
	identify: async (ctx: GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel> | GenericActionCtx<DataModel>) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return null;

		const user = await ctx.runQuery(internal.users.getUserById, { userId });
		return {
			customerId: userId,
			customerData: {
				name: user?.name ?? undefined,
				email: user?.email ?? undefined,
			},
		};
	},
});

/**
 * Autumn billing API functions exported for Convex type generation.
 *
 * These individual exports enable Convex to automatically generate proper types
 * for each billing function in the generated API schema.
 */
export const {
	track,
	cancel,
	query,
	attach,
	check,
	checkout,
	usage,
	setupPayment,
	createCustomer,
	listProducts,
	billingPortal,
	createReferralCode,
	redeemReferralCode,
	createEntity,
	getEntity,
} = autumn.api();
