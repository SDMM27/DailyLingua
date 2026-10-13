/** What a server action returns to the client: it does not throw for expected failures. */
export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };
