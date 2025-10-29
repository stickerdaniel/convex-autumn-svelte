/**
 * Checks if the code is running in a browser environment (client-side).
 *
 * As opposed to a server-side rendering context.
 *
 * @example
 * ```ts
 * if (isBrowser) {
 *   window.open(url, "_blank");
 * }
 * ```
 */
export const isBrowser = typeof window !== "undefined";
