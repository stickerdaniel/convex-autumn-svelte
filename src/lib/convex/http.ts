import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

/**
 * Convex HTTP router configured with authentication routes.
 *
 * This router handles HTTP endpoints for the Convex backend, including
 * all authentication routes provided by the auth module.
 *
 * @returns Configured HTTP router instance
 */
export default http;
