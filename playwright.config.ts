import { defineConfig } from '@playwright/test';
import dotenv from "dotenv";

dotenv.config({ path: '.env.local' });

export default defineConfig({
	webServer: {
		command: 'bun run build && bun run preview',
		port: 4173
	},
	testDir: 'e2e'
});