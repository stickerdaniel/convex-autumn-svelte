import { action } from "./_generated/server";
import { api } from "./_generated/api";
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

		const customer = unwrap(customerResponse) as { entities?: { id: string }[] };

		for (const entity of customer.entities ?? []) {
			if (entity.id.startsWith("e2e-")) {
				try {
					await autumn.entities.delete(ctx, entity.id);
				} catch (error) {
					console.info(`Skipping entity cleanup for ${entity.id}:`, error);
				}
			}
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
