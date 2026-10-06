import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.js';

export default mergeConfig(
	viteConfig,
	defineConfig({
		test: {
			exclude: [
				'e2e/**',
				'node_modules/**',
				'dist/**',
				'scratch/**',
				'.{idea,git,cache,output,temp}/**'
			],
			passWithNoTests: true
		}
	})
);
