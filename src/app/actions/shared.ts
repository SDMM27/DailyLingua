import "server-only";
import type { z } from "zod";
import { UserFacingError } from "@/lib/data/errors";
import { getRepository, type DailyLinguaRepository } from "@/lib/data/repository";
import type { ActionResult } from "./result";

const GENERIC_ERROR = "Une erreur est survenue. Réessaie dans un instant.";

/**
 * Common frame of the data server actions. Server actions are public POST endpoints, so the
 * input is re-validated here, the user is the one of the session (`getRepository` redirects to
 * the sign-in screen otherwise), the demo is refused, and only messages meant for the user
 * ever leave the server.
 */
export async function runAction<S extends z.ZodType, T>(
  schema: S,
  input: unknown,
  run: (repo: DailyLinguaRepository, input: z.infer<S>) => Promise<T>,
): Promise<ActionResult<T>> {
  const repo = await getRepository();
  if (repo.isDemo) return { ok: false, error: "Mode démonstration : rien n’est enregistré." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };

  try {
    return { ok: true, data: await run(repo, parsed.data) };
  } catch (error) {
    if (error instanceof UserFacingError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: GENERIC_ERROR };
  }
}
