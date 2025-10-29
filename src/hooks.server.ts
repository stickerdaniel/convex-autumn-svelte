import { sequence } from '@sveltejs/kit/hooks';
import { createConvexAuthHooks, createRouteMatcher } from '@mmailaender/convex-auth-svelte/sveltekit/server';
import { redirect, type Handle } from '@sveltejs/kit';

const isSignInPage = createRouteMatcher('/signin');
const isProtectedRoute = createRouteMatcher(['/product{/*rest}']);

const { handleAuth, isAuthenticated: isAuthenticatedPromise } = createConvexAuthHooks({
	verbose: true
});

const authFirstPattern: Handle = async ({ event, resolve }) => {
	const isAuthenticated = await isAuthenticatedPromise(event);

	// Redirect authenticated users away from sign-in page.
	if (isSignInPage(event.url.pathname) && isAuthenticated) {
		redirect(307, '/product');
	}
	// Redirect unauthenticated users to sign-in with return URL.
	if (isProtectedRoute(event.url.pathname) && !isAuthenticated) {
		redirect(307, `/signin?redirectTo=${encodeURIComponent(event.url.pathname + event.url.search)}`);
	}

	return resolve(event);
}

/**
 * SvelteKit server hooks handling authentication and route protection.
 *
 * Sequences two handlers: Convex authentication initialization and route-based
 * access control. Redirects authenticated users from sign-in page and protects
 * routes requiring authentication.
 */
export const handle = sequence(handleAuth, authFirstPattern);
