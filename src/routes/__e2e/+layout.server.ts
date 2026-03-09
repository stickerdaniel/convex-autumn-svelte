import { ENABLE_E2E_HARNESS } from "$env/static/private";
import { error } from "@sveltejs/kit";

export const load = async () => {
	if (ENABLE_E2E_HARNESS !== "1") {
		throw error(404, "Not found");
	}

	return {
		referralProgramId: process.env.AUTUMN_REFERRAL_PROGRAM_ID ?? "default",
	};
};
