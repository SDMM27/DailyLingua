/**
 * Prepares the recording of an assessment dossier (src/lib/assessment/AUTHORING.md, docs/assessment/recording-guide.md).
 *
 *   npm run assessment:audio -- <file> <dossier id> --speaker <first name> --recorded-on <YYYY-MM-DD> [--force] [--allow-duration]
 *     Normalises a voice memo of any format with ffmpeg into public/assessment/<language>/<id>.m4a, checks
 *     its duration against the level's target (±30 %) and prints the `audio` block to paste into the
 *     dossier (the dossier itself is not modified). A recording out of range is deleted and the script
 *     exits with 1, unless --allow-duration.
 *   npm run assessment:audio -- --brief <language>
 *     Prints what the voice receives for each dossier of the language: id, level, target duration, pace
 *     and the exact script.
 *
 * ffmpeg and ffprobe must be installed. They are run with execFile, never through a shell.
 */
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { parseArgs, promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { audioPublicPath, checkDuration, ffmpegArgs, speakingPace } from "../src/lib/assessment/audio";
import { ASSESSMENT_DOSSIERS } from "../src/lib/assessment/dossiers";
import { assessmentAudioSchema, ASSESSMENT_LIMITS } from "../src/lib/schemas/assessment";

const run = promisify(execFile);
const PUBLIC_DIR = fileURLToPath(new URL("../public", import.meta.url));

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    brief: { type: "string" },
    speaker: { type: "string" },
    "recorded-on": { type: "string" },
    force: { type: "boolean", default: false },
    "allow-duration": { type: "boolean", default: false },
  },
});

if (values.brief !== undefined) {
  const dossiers = (ASSESSMENT_DOSSIERS as Record<string, typeof ASSESSMENT_DOSSIERS.it>)[values.brief];
  if (!dossiers || dossiers.length === 0) fail(`aucun dossier pour la langue « ${values.brief} »`);
  for (const d of dossiers) {
    console.log(`=== ${d.id} (${d.level}) ===`);
    console.log(`Durée visée : environ ${ASSESSMENT_LIMITS[d.level].seconds} secondes`);
    console.log(`Débit : ${speakingPace(d.level)}`);
    console.log("Script à lire tel quel :");
    console.log(d.listening.script);
    console.log("");
  }
  process.exit(0);
}

const [input, id] = positionals;
if (!input || !id || positionals.length !== 2) {
  fail("usage : npm run assessment:audio -- <fichier> <id du dossier> --speaker <prénom> --recorded-on <AAAA-MM-JJ>  |  --brief <langue>");
}
const dossier = Object.values(ASSESSMENT_DOSSIERS).flat().find((d) => d.id === id);
if (!dossier) fail(`dossier inconnu : « ${id} »`);
if (!existsSync(input)) fail(`fichier introuvable : ${input}`);

const file = audioPublicPath(dossier.language, dossier.id);
const meta = assessmentAudioSchema.omit({ file: true, licence: true }).safeParse({
  speaker: values.speaker,
  recordedOn: values["recorded-on"],
});
if (!meta.success) {
  fail(`--speaker (prénom ou pseudonyme) et --recorded-on (AAAA-MM-JJ) sont obligatoires : ${meta.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join(" ; ")}`);
}

const output = path.join(PUBLIC_DIR, file);
if (existsSync(output) && !values.force) fail(`${path.relative(process.cwd(), output)} existe déjà (--force pour le remplacer)`);

// Written beside the final file and moved once checked, so a refused take never destroys a good one.
const partial = output.replace(/\.m4a$/, ".part.m4a");
await mkdir(path.dirname(output), { recursive: true });

function missingTool(error: unknown, tool: string): never {
  if ((error as NodeJS.ErrnoException).code === "ENOENT") {
    fail(`${tool} est introuvable : installe ffmpeg (https://ffmpeg.org/download.html) et vérifie qu'il est dans le PATH`);
  }
  throw error;
}

try {
  await run("ffmpeg", ffmpegArgs(input, partial));
} catch (error) {
  await rm(partial, { force: true });
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
    fail(`ffmpeg a échoué : ${(error as { stderr?: string }).stderr?.trim() || String(error)}`);
  }
  missingTool(error, "ffmpeg");
}

let seconds: number;
try {
  const { stdout } = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", partial]);
  seconds = Number.parseFloat(stdout.trim());
  if (!Number.isFinite(seconds)) throw new Error(`durée illisible : « ${stdout.trim()} »`);
} catch (error) {
  await rm(partial, { force: true });
  missingTool(error, "ffprobe");
}

const duration = checkDuration(seconds, dossier.level);
const range = `${duration.min.toFixed(1)}-${duration.max.toFixed(1)} s`;
if (!duration.ok && !values["allow-duration"]) {
  await rm(partial, { force: true });
  fail(`durée ${seconds.toFixed(1)} s hors de la cible du niveau ${dossier.level} (${duration.target} s, accepté ${range}) : fichier supprimé (--allow-duration pour le garder)`);
}
await rename(partial, output);

console.log(`✓ ${path.relative(process.cwd(), output)} (${seconds.toFixed(1)} s${duration.ok ? "" : `, HORS CIBLE ${range}, gardé avec --allow-duration`})`);
console.log(`À coller dans le dossier ${dossier.id} :`);
console.log(`  audio: { file: ${JSON.stringify(file)}, speaker: ${JSON.stringify(meta.data.speaker)}, licence: "granted-commercial", recordedOn: ${JSON.stringify(meta.data.recordedOn)} },`);
console.log("Rappel : l'autorisation signée de la voix doit être reçue (et gardée hors du dépôt) avant toute publication.");
