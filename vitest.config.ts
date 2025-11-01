import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()] as any,
	test: {
		exclude: ['e2e/**', 'node_modules/**', 'dist/**', '.{idea,git,cache,output,temp}/**'],
		passWithNoTests: true
	}
});
