import { expect, type Frame, type Page } from '@playwright/test';

import { readJson, waitForOperation } from './fixtures';

/**
 * Returns the frame that renders Stripe Checkout's card form.
 * Stripe renders it inside an Elements iframe whose name and URL change between releases.
 */
async function findCardForm(page: Page): Promise<Frame> {
	let form: Frame | undefined;
	await expect
		.poll(
			async () => {
				for (const frame of page.frames()) {
					const cardNumber = frame.getByRole('textbox', { name: 'Card number', exact: true });
					if ((await cardNumber.count()) > 0) {
						form = frame;
						return true;
					}
				}
				return false;
			},
			{ timeout: 30_000 }
		)
		.toBe(true);
	if (!form) throw new Error('Stripe Checkout rendered no card form');
	return form;
}

/** Complete the hosted sandbox flow when a fresh customer has no payment method. */
export async function attachPro(page: Page) {
	const harnessUrl = page.url();
	await page.getByTestId('run-attach').click();
	const result = await waitForOperation(page, 'attach');
	expect(Number(await page.getByTestId('invalidate-count').textContent())).toBeGreaterThan(0);

	if (result?.checkout_url) {
		const checkoutUrl = new URL(result.checkout_url);
		expect(checkoutUrl.origin).toBe('https://checkout.stripe.com');
		// Stripe changes the path prefix (/c/, /g/); the test-mode session id is the contract.
		expect(checkoutUrl.pathname).toMatch(/\/pay\/cs_test_/);
		await page.goto(checkoutUrl.href);
		await expect(page.getByText('Sandbox', { exact: true })).toBeVisible();
		const form = await findCardForm(page);
		await form.getByRole('textbox', { name: 'Card number', exact: true }).fill('4242424242424242');
		const expiryYear = String(new Date().getUTCFullYear() + 3).slice(-2);
		await form
			.getByRole('textbox', { name: 'Expiration (MM/YY)', exact: true })
			.fill(`12${expiryYear}`);
		await form.getByRole('textbox', { name: 'Security code', exact: true }).fill('123');
		await form.getByRole('textbox', { name: 'Name on card', exact: true }).fill('Autumn E2E');
		await form.getByRole('combobox', { name: 'Country', exact: true }).selectOption('US');
		await form.getByRole('textbox', { name: 'ZIP code', exact: true }).fill('94107');
		await form.getByRole('checkbox', { name: /^Save payment details/ }).setChecked(false);
		await form.getByRole('button', { name: 'Subscribe', exact: true }).click();
		await page.waitForURL(harnessUrl, { timeout: 30_000 });
		// Stripe's redirect and Autumn's webhook can arrive in either order.
		await expect
			.poll(
				async () => {
					await page.reload();
					return (await readJson(page, 'customer-current'))?.products ?? [];
				},
				{ timeout: 15_000 }
			)
			.toContain('pro');
	} else {
		await expect
			.poll(async () => (await readJson(page, 'customer-current'))?.products ?? [])
			.toContain('pro');
	}
}
