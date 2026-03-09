import { defineConfig } from '@playwright/test';
import dotenv from "dotenv";

dotenv.config({ path: '.env.local' });

export default defineConfig({
	retries: process.env.CI ? 1 : 0,
	use: {
		baseURL: "http://127.0.0.1:4173",
		trace: "retain-on-failure",
		video: "retain-on-failure",
	},
	webServer: {
		command:
			'env ENABLE_E2E_HARNESS=1 PUBLIC_E2E_TEST=1 bun run build && env ENABLE_E2E_HARNESS=1 PUBLIC_E2E_TEST=1 bun run preview',
		port: 4173,
		reuseExistingServer: !process.env.CI,
	},
	testDir: 'e2e'
});
