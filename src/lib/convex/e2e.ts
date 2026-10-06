import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { autumn } from "./autumn";

function assertHarnessEnabled() {
	if (process.env.ENABLE_E2E_HARNESS !== "1") {
		throw new Error("E2E harness is disabled.");
	}
}

function unwrap<T>(result: { data: T | null; error: unknown }) {
	if (result.error || result.data === null) {
		throw new Error(
			result.error instanceof Error
				? result.error.message
				: typeof result.error === "object" && result.error !== null && "message" in result.error
					? String((result.error as { message: string }).message)
					: "Unexpected Autumn response while resetting E2E state",
		);
	}

	return result.data;
}

/**
 * Resets the authenticated test user to the known free-plan baseline used by live tests.
 */
export const resetCurrentUser = action({
	args: {},
	handler: async (ctx): Promise<unknown> => {
		assertHarnessEnabled();

		const userId = await getAuthUserId(ctx);
		const secondary = await ctx.runQuery(internal.tests.getSecondaryTestUser);
		if (userId && userId === secondary?._id) {
			if (!process.env.AUTUMN_SECRET_KEY?.startsWith("am_sk_test_")) {
				throw new Error("Referral customer reset requires the Autumn sandbox.");
			}
			// Referral redemption is one-time per customer and program. Recreate
			// only the dedicated secondary sandbox customer so reruns stay isolated.
			unwrap(await autumn.customers.delete(ctx));
			unwrap(
				await ctx.runAction(api.autumn.createCustomer, { errorOnNotFound: false }),
			);
		}

		await ctx.runAction(api.autumn.usage as any, {
			featureId: "messages",
			value: 0,
		});

		try {
			await ctx.runAction(api.autumn.cancel as any, {
				productId: "pro",
				cancelImmediately: true,
			});
		} catch (error) {
			console.info("Skipping Pro cancellation during E2E reset:", error);
		}

		const customerResponse = await ctx.runAction(api.autumn.createCustomer as any, {
			expand: ["entities"],
			errorOnNotFound: false,
		});

		const customer = unwrap(customerResponse) as {
			entities?: { id: string }[];
			products?: { id: string }[];
		};

		const cleanupErrors: string[] = [];
		for (const entity of customer.entities ?? []) {
			if (entity.id.startsWith("e2e-")) {
				try {
					await autumn.entities.delete(ctx, entity.id);
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error);
					if (/not found/i.test(message)) {
						continue;
					}
					cleanupErrors.push(`${entity.id}: ${message}`);
				}
			}
		}
		if (cleanupErrors.length > 0) {
			throw new Error(`Entity cleanup failed: ${cleanupErrors.join("; ")}`);
		}

		const hasFree = (customer.products ?? []).some((product) => product.id === "free");
		if (!hasFree) {
			await ctx.runAction(api.autumn.attach as any, {
				productId: "free",
			});
		}

		const refreshed = await ctx.runAction(api.autumn.createCustomer as any, {
			expand: ["entities"],
			errorOnNotFound: false,
		});

		if (refreshed.error) {
			throw new Error(refreshed.error.message);
		}

		return refreshed.data;
	},
});
