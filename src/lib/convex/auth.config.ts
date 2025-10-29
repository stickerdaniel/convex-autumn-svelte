/**
 * Authentication configuration for Convex.
 *
 * Defines the authentication providers used by the application.
 * Default export required by Convex auth configuration format.
 */
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
