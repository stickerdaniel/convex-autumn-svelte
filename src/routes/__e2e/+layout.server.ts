import { ENABLE_E2E_HARNESS, AUTUMN_REFERRAL_PROGRAM_ID } from '$app/env/private';
import { error } from '@sveltejs/kit';

export const load = async () => {
	if (!ENABLE_E2E_HARNESS) {
		error(404, 'Not found');
	}

	return {
		referralProgramId: AUTUMN_REFERRAL_PROGRAM_ID
	};
};
