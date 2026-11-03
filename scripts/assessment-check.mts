/**
 * Checks assessment dossiers against the authoring rules that can be checked mechanically
 * (src/lib/assessment/AUTHORING.md). Usage: `npm run assessment:check -- [code...]`; without
 * argument, every language that has dossiers. Lists the dossiers not reviewed by a native speaker
 * and those without a recording (script listenings only), lists the video passages nobody has listened
 * to yet (`checkedOn` null), checks that the recorded files exist under public/, and checks the pilot
 * languages have their 6 levels. The YouTube videos are checked online (oEmbed: exists, embeddable);
 * `--offline` skips that, and a network error is only a warning.
 * Exits with 1 when a dossier is invalid or missing.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { checkAssessmentDossier } from "../src/lib/assessment/check-dossier";
import { ASSESSMENT_DOSSIERS, assessmentLanguages } from "../src/lib/assessment/dossiers";
import { CEFR_LEVELS, type Language } from "../src/lib/schemas/common";

/** Languages whose six levels must all be written. */
const PILOT_LANGUAGES: Language[] = ["ru", "it"];

const PUBLIC_DIR = fileURLToPath(new URL("../public", import.meta.url));

const args = process.argv.slice(2).filter((a) => a !== "--offline");
const offline = process.argv.includes("--offline");

/** Problem with a video according to YouTube's oEmbed endpoint, a warning when offline, or null when fine. */
async function videoProblem(youtubeId: string): Promise<{ problem?: string; warning?: string }> {
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${youtubeId}`)}&format=json`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (response.ok) return {};
    if (response.status === 401 || response.status === 403) return { problem: `video ${youtubeId} cannot be embedded (HTTP ${response.status})` };
    if (response.status === 404 || response.status === 400) return { problem: `video ${youtubeId} is deleted or private (HTTP ${response.status})` };
    return { warning: `video ${youtubeId}: unexpected HTTP ${response.status}` };
  } catch (error) {
    return { warning: `video ${youtubeId}: could not be checked (${error instanceof Error ? error.message : String(error)})` };
  }
}
const codes = (args.length > 0 ? args : [...new Set([...PILOT_LANGUAGES, ...assessmentLanguages()])]) as Language[];
let failed = false;
const warnings: string[] = [];

for (const code of codes) {
  const dossiers = ASSESSMENT_DOSSIERS[code] ?? [];
  const problems: string[] = [];
  if (PILOT_LANGUAGES.includes(code)) {
    for (const level of CEFR_LEVELS) {
      if (!dossiers.some((d) => d.level === level)) problems.push(`no dossier for ${level}`);
    }
  }
  for (const dossier of dossiers) {
    for (const problem of checkAssessmentDossier(code, dossier.level, dossier)) problems.push(`${dossier.id}: ${problem}`);
    if (dossier.listening.source === "youtube" && !offline) {
      const result = await videoProblem(dossier.listening.video.youtubeId);
      if (result.problem) problems.push(`${dossier.id}: ${result.problem}`);
      if (result.warning) warnings.push(`${dossier.id}: ${result.warning}`);
    }
    if (dossier.audio && !existsSync(`${PUBLIC_DIR}${dossier.audio.file}`)) problems.push(`${dossier.id}: audio file missing (public${dossier.audio.file})`);
  }
  if (problems.length === 0) {
    const unreviewed = dossiers.filter((d) => d.reviewedOn === null).map((d) => d.id);
    const silent = dossiers.filter((d) => d.listening.source === "script" && d.audio === null).map((d) => d.id);
    const unchecked = dossiers.filter((d) => d.listening.source === "youtube" && d.listening.video.checkedOn === null).map((d) => d.id);
    const list = (ids: string[]) => (ids.length ? ` (${ids.join(", ")})` : "");
    console.log(
      `✓ ${code}: ${dossiers.length} dossiers, ${unreviewed.length} not reviewed${list(unreviewed)}, ${silent.length} without audio${list(silent)}, ${unchecked.length} video passages not listened to${list(unchecked)}`,
    );
  } else {
    failed = true;
    console.log(`✗ ${code}:`);
    for (const problem of problems) console.log(`    ${problem}`);
  }
}

for (const warning of warnings) console.log(`! ${warning}`);

process.exit(failed ? 1 : 0);
