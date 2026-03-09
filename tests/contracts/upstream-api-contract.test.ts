import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";
import { Autumn } from "@useautumn/convex";

const expectedApiMethods = [
	"attach",
	"billingPortal",
	"cancel",
	"check",
	"checkout",
	"createCustomer",
	"createEntity",
	"createReferralCode",
	"getEntity",
	"listProducts",
	"query",
	"redeemReferralCode",
	"setupPayment",
	"track",
	"usage",
].sort();

describe("upstream API contract", () => {
	test("Autumn.api() exposes the expected callable surface", () => {
		const autumn = new Autumn({} as never, {
			identify: async () => null,
			secretKey: "am_sk_test",
		});

		expect(Object.keys(autumn.api()).sort()).toEqual(expectedApiMethods);
	});

	test("local Convex export list stays in lockstep with upstream", () => {
		const source = readFileSync(
			resolve(process.cwd(), "src/lib/convex/autumn.ts"),
			"utf8",
		);
		const match = source.match(/export const\s*\{([^}]+)\}\s*=\s*autumn\.api\(\);/m);

		expect(match).toBeTruthy();

		const exportedMethods = match![1]
			.split(",")
			.map((value) => value.trim())
			.filter(Boolean)
			.sort();

		expect(exportedMethods).toEqual(expectedApiMethods);
	});
});
