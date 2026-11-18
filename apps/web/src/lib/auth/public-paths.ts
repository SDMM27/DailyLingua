/** Reachable without an account. Everything else sends a signed-out visitor to the sign-in screen. */
export const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/auth/confirm", "/offline"];

export function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
