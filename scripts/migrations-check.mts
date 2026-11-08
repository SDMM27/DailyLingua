/**
 * Fails when a migration file is modified after being committed.
 *
 * `supabase db push` tracks migrations by version and never replays one: a change to a migration that
 * the hosted project already has never reaches it, while the local stack and CI (rebuilt from the
 * files) pass. That is how the `show_streak` grant went missing in production (fixed by
 * 20261108000100_grant_show_streak.sql). A change goes in a new migration instead.
 *
 * Checked: every commit of the history (needs a full clone, `fetch-depth: 0` in CI) and the
 * uncommitted changes. A new, not yet committed migration can be edited freely.
 */
import { execFileSync } from "node:child_process";

const DIR = "supabase/migrations";

/** Edited before the rule existed; both checked against the hosted database on 2026-11-08. */
const ALLOWED = new Set([
  // reserve/release_session_replacement and mission_sessions.replacing_since exist on the hosted project.
  `${DIR}/20261015000600_content_refusals.sql`,
  // Its missing grant was re-applied by 20261108000100_grant_show_streak.sql.
  `${DIR}/20261026000100_show_streak.sql`,
]);

const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" });
const lines = (text: string) => text.split("\n").map((l) => l.trim()).filter(Boolean);

if (git("rev-parse", "--is-shallow-repository").trim() === "true") {
  console.error("migrations:check needs the full git history (in CI: actions/checkout with fetch-depth: 0).");
  process.exit(1);
}

const edited = new Set([
  // Modified (M), deleted (D) or renamed (R) in a commit: a migration is only ever added.
  ...lines(git("log", "--format=", "--name-only", "--diff-filter=MDR", "--no-renames", "--", DIR)),
  // Uncommitted changes to a committed file.
  ...lines(git("diff", "--name-only", "--diff-filter=MD", "HEAD", "--", DIR)),
]);
const offending = [...edited].filter((file) => file.endsWith(".sql") && !ALLOWED.has(file)).sort();

if (offending.length > 0) {
  console.error("Committed migrations must not change (supabase db push never replays them):");
  for (const file of offending) console.error(`  - ${file}`);
  console.error("Revert the change and put it in a new migration.");
  process.exit(1);
}
console.log("migrations:check: no committed migration was changed.");
