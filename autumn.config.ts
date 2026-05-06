import {
	feature,
	product,
	featureItem,
	pricedFeatureItem,
	priceItem,
} from "atmn";

/**
 * Defines single-use message features for billing and usage tracking.
 */
export const messages = feature({
	id: "messages",
	name: "Messages",
	type: "single_use",
});

/**
 * Continuous-use seats feature, used as an entity feature in E2E tests.
 * Autumn rejects entities linked to consumable (single_use) features,
 * so a continuous_use feature is required for createEntity flows.
 */
export const seats = feature({
	id: "seats",
	name: "Seats",
	type: "continuous_use",
});

/**
 * Free tier product with limited message usage.
 */
export const free = product({
	id: "free",
	name: "Free",
	items: [
		featureItem({
			feature_id: messages.id,
			included_usage: 10,
			interval: "month",
		}),
		featureItem({
			feature_id: seats.id,
			included_usage: 1,
		}),
	],
});

/**
 * Pro tier product with unlimited message usage and monthly pricing.
 */
export const pro = product({
	id: "pro",
	name: "Pro",
	items: [
		priceItem({
			price: 10,
			interval: "month",
		}),

		featureItem({
			feature_id: messages.id,
			included_usage: "inf",
			interval: "month",
		}),
		featureItem({
			feature_id: seats.id,
			included_usage: 5,
		}),
	],
});
