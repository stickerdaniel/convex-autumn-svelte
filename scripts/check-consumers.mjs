import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

// Exercise the installed tarball, including public declarations and SSR, rather
// than importing the library's source through this repository's Vite aliases.
const repository = process.cwd();
const artifacts = resolve(process.env.COMPAT_WORK_DIR ?? 'scratch/compatibility');
mkdirSync(artifacts, { recursive: true });
const directory = mkdtempSync(join(artifacts, 'consumers-'));
const tarball = join(directory, 'package.tgz');
const library = JSON.parse(readFileSync('package.json', 'utf8'));

function run(cwd, label, args, expectedFailure) {
	const result = spawnSync('bun', args, {
		cwd,
		encoding: 'utf8',
		timeout: 180_000,
		env: process.env
	});
	const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
	writeFileSync(join(cwd === repository ? directory : cwd, `${label}.log`), output);
	if (expectedFailure) {
		assert.ok(result.status !== null && result.status !== 0, `${label} unexpectedly passed`);
		assert.match(output, expectedFailure, `${label} failed for an unrelated reason`);
	} else {
		assert.equal(result.status, 0, `${label} failed: ${result.error ?? ''}\n${output}`);
	}
}

function write(cwd, name, contents) {
	const path = join(cwd, name);
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, contents);
}

run(repository, 'consumer-pack', ['pm', 'pack', '--filename', tarball, '--ignore-scripts']);

const consumers = [
	{
		name: 'kit-2',
		kit: '2.21.0',
		plugin: '5.1.1',
		vite: '6.4.1',
		typescript: '5.9.3',
		svelte: '5.38.5'
	},
	{
		name: 'kit-3',
		kit: library.devDependencies['@sveltejs/kit'],
		plugin: library.devDependencies['@sveltejs/vite-plugin-svelte'],
		vite: library.devDependencies.vite,
		typescript: library.devDependencies.typescript,
		svelte: library.devDependencies.svelte
	}
];

for (const consumer of consumers) {
	const cwd = join(directory, consumer.name);
	mkdirSync(cwd);
	write(
		cwd,
		'package.json',
		JSON.stringify(
			{
				name: `autumn-${consumer.name}-consumer`,
				private: true,
				type: 'module',
				dependencies: {
					[library.name]: `file:${tarball}`,
					'@sveltejs/kit': consumer.kit,
					'@sveltejs/vite-plugin-svelte': consumer.plugin,
					vite: consumer.vite,
					typescript: consumer.typescript,
					svelte: consumer.svelte,
					'svelte-check': library.devDependencies['svelte-check'],
					convex: library.devDependencies.convex,
					'convex-svelte': library.devDependencies['convex-svelte']
				}
			},
			null,
			2
		)
	);
	write(
		cwd,
		'vite.config.js',
		`import { sveltekit } from '@sveltejs/kit/vite';
export default { plugins: [sveltekit()] };\n`
	);
	if (consumer.name === 'kit-2') write(cwd, 'svelte.config.js', 'export default {};\n');
	write(
		cwd,
		'tsconfig.json',
		JSON.stringify({
			extends: consumer.name === 'kit-2' ? './.svelte-kit/tsconfig.json' : '$app/tsconfig',
			compilerOptions: { strict: true, skipLibCheck: true, moduleResolution: 'bundler' },
			include: ['src'],
			exclude: ['src/service-worker']
		})
	);
	write(
		cwd,
		'src/app.html',
		'<!doctype html><html lang="en"><head><meta charset="utf-8">%sveltekit.head%</head><body><div>%sveltekit.body%</div></body></html>'
	);
	write(cwd, 'src/app.d.ts', 'declare global { namespace App {} }\nexport {};\n');
	// These references are never sent to a backend. Their shape is the existing
	// contract fixture used by the library's unit tests.
	write(
		cwd,
		'src/api.ts',
		readFileSync('tests/helpers/mock-api.ts', 'utf8').replace(
			'../../src/lib/svelte/types.js',
			`${library.name}/sveltekit`
		)
	);
	write(
		cwd,
		'src/routes/+page.server.ts',
		`import { ConvexHttpClient } from 'convex/browser';
import { createAutumnHandlers } from '${library.name}/sveltekit/server';
import type { Customer } from '${library.name}/sveltekit';
import type { PageServerLoad } from './$types';
import { mockAutumnApi } from '../api.js';

export const prerender = true;
const customer: Customer = { id: 'compat-customer', name: '${consumer.name}' };
const handlers = createAutumnHandlers({
  convexApi: mockAutumnApi,
  createClient: () => new ConvexHttpClient('https://compatibility.convex.cloud')
});
export const load: PageServerLoad = async (event) => {
  const client = await handlers.getConvexClient(event);
  return { autumnState: { customer, _timeFetched: 0 }, url: client.url };
};\n`
	);
	write(
		cwd,
		'src/routes/+page.svelte',
		`<script lang="ts">
  import { setupConvex } from 'convex-svelte';
  import { setupAutumn as rootSetup } from '${library.name}';
  import { setupAutumn as vanillaSetup } from '${library.name}/svelte';
  import { setupAutumn, useCustomer } from '${library.name}/sveltekit';
  import { invalidate } from '$app/navigation';
  import type { PageData } from './$types';
  import { mockAutumnApi } from '../api.js';
  let { data }: { data: PageData } = $props();
  setupConvex(data.url, { disabled: true });
  setupAutumn({ convexApi: mockAutumnApi, getServerState: () => data.autumnState, invalidate });
  const autumn = useCustomer();
</script>
<h1>{autumn.customer?.name}: {autumn.customer?.id}</h1>
<p>Vanilla exports: {rootSetup === vanillaSetup ? 'shared' : 'different'}</p>\n`
	);
	console.log(`Checking installed package with ${consumer.name} (${consumer.kit})`);
	run(cwd, 'install', ['install']);
	run(cwd, 'sync', ['x', '--no-install', 'svelte-kit', 'sync']);
	run(cwd, 'check', ['x', '--no-install', 'svelte-check', '--tsconfig', './tsconfig.json']);
	run(cwd, 'build', ['x', '--no-install', 'vite', 'build']);
	const html = readFileSync(join(cwd, '.svelte-kit/output/prerendered/pages/index.html'), 'utf8');
	assert.ok(
		html.includes(`${consumer.name}: compat-customer`),
		'SSR must render the hydrated customer'
	);
	assert.ok(html.includes('Vanilla exports: shared'), 'Both vanilla entry points must work');
	console.log(`${consumer.name}: declarations, client build, and customer SSR passed`);

	write(
		cwd,
		'src/routes/+page.svelte',
		`<script>
  import { createAutumnHandlers } from '${library.name}/sveltekit/server';
</script>
<p>{typeof createAutumnHandlers}</p>\n`
	);
	run(
		cwd,
		'server-boundary',
		['x', '--no-install', 'vite', 'build'],
		/(?:Cannot import|server.only)[\s\S]*(?:\$app\/server|@sveltejs\/kit\/src\/runtime\/app\/server)/i
	);
	console.log(`${consumer.name}: browser import of server helpers rejected`);
}

console.log(`Compatibility artifacts: ${directory}`);

if (process.env.GITHUB_OUTPUT) {
	const sha256 = createHash('sha256').update(readFileSync(tarball)).digest('hex');
	appendFileSync(
		process.env.GITHUB_OUTPUT,
		`tarball=${tarball}\nsha256=${sha256}\nversion=${library.version}\n`
	);
}
