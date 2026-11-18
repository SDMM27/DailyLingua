/** Reachable without an account. Everything else sends a signed-out visitor to the sign-in screen. */
export const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/auth/confirm", "/offline"];

/**
 * `/api/*` answers for itself: a script that is not signed in gets a JSON 401 from the route, never a redirect to the
 * sign-in page (it would follow it and read HTML). The routes authenticate with Supabase Auth, not with the proxy.
 */
export function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

export function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
