import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.integration.test.ts'],
		globalSetup: ['src/lib/server/integration-setup.ts'],
		fileParallelism: false
	}
});
