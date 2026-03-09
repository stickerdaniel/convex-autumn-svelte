import { expect, test } from "@playwright/test";

import { signInAsPrimary, signOut } from "./helpers/auth";
import { openHarness, readJson, resetPrimaryUser } from "./helpers/fixtures";

test.describe.configure({ mode: "serial" });

test.describe("server helper harness", () => {
	test("@smoke returns null customer and viewer when unauthenticated", async ({ page }) => {
		await signOut(page);
		await page.goto("/__e2e/server");

		expect(await readJson(page, "server-customer")).toBeNull();
		expect(await readJson(page, "server-viewer")).toBeNull();
	});

	test("returns authenticated customer, entity, and viewer data", async ({ page }) => {
		await resetPrimaryUser(page, "/__e2e/sveltekit");
		await openHarness(page, "/__e2e/sveltekit");

		await page.getByTestId("run-createEntity").click();
		const entityId = (await readJson(page, "created-entity-id")) as string;

		await page.goto(`/__e2e/server?entityId=${entityId}`);

		expect(await readJson(page, "server-customer")).toMatchObject({
			products: ["free"],
		});
		expect(await readJson(page, "server-viewer")).toBeTruthy();
		expect(await readJson(page, "server-entity")).toMatchObject({
			id: entityId,
		});

		await signOut(page);
		await signInAsPrimary(page);
	});
});
