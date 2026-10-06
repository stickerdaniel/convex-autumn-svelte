import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	PUBLIC_CONVEX_URL: {
		public: true,
		static: true,
		description: 'The Convex deployment URL used by the demo and its auth adapter.'
	},
	PUBLIC_E2E_TEST: {
		public: true,
		description: 'Show the test sign-in form only when explicitly enabled.',
		schema: (value: string | undefined): boolean => value === '1'
	},
	ENABLE_E2E_HARNESS: {
		static: true,
		description: 'Enable the private regression harness only in test builds.',
		schema: (value: string | undefined): boolean => value === '1'
	},
	AUTUMN_REFERRAL_PROGRAM_ID: {
		description: 'Referral program used by the regression harness.',
		schema: (value: string | undefined): string => value ?? 'default'
	}
});
