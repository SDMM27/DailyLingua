/** Short hash of the deployed commit (Vercel), or `local` outside a Vercel build. Server only. */
export function appVersion(env: Record<string, string | undefined> = process.env): string {
  return env.VERCEL_GIT_COMMIT_SHA?.trim().slice(0, 7) || "local";
}

/** True when the deployment is labelled as a pre-release (`NEXT_PUBLIC_PREVIEW_LABEL=1`). */
export function isPreviewLabelled(env: Record<string, string | undefined> = process.env): boolean {
  return env.NEXT_PUBLIC_PREVIEW_LABEL === "1";
}
