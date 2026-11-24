/**
 * `npm run reader:audio -- --voice <voice> --text-file <file> --out <name>`: synthesises the full reading of a reader
 * text with a native Azure Speech voice, on the author's machine only (never in CI), and writes it to
 * `apps/web/public/reader-audio/<name>.mp3`. The file name is versioned (`la-lista-della-spesa-v2`): a new take is a
 * new file, then a new migration sets `audio_path` of the text (`j3-lecteur-et-langues-connues.md` §1).
 *
 * `--text-file` holds the body of the text exactly as published (UTF-8, line breaks are read as spaces).
 *
 * Setup: as `units-audio.mts`, `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` in the environment (for example from
 * `.env.local`, never committed), and ffmpeg in the PATH. Only the voices of `CLEARED_VOICES` are accepted.
 */
import { execFile } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { CLEARED_VOICES } from "@dailylingua/schemas";

const run = promisify(execFile);
const ROOT = resolve(import.meta.dirname, "..");
const AZURE_KEY = process.env.AZURE_SPEECH_KEY ?? "";
const AZURE_REGION = process.env.AZURE_SPEECH_REGION ?? "";

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const option = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const voice = option("--voice");
const textFile = option("--text-file");
const out = option("--out");
if (!voice || !textFile || !out) fail("usage: --voice <voice> --text-file <file> --out <name> [--force]");
if (!(CLEARED_VOICES as readonly string[]).includes(voice)) fail(`voice "${voice}" is not cleared for use`);
if (!/^[a-z0-9-]+-v[0-9]+$/.test(out)) fail(`--out must be a versioned name such as "la-lista-della-spesa-v2"`);
if (!AZURE_KEY || !AZURE_REGION) fail("AZURE_SPEECH_KEY and AZURE_SPEECH_REGION must be set (see the header of this script)");

const target = join(ROOT, "apps/web/public/reader-audio", `${out}.mp3`);
if (existsSync(target) && !args.includes("--force")) fail(`${out}.mp3 already exists: publish a new version instead`);

const text = readFileSync(textFile, "utf8").replace(/\s+/g, " ").trim();
const escapeXml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const locale = voice.split("-").slice(0, 2).join("-");
const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${locale}"><voice name="${escapeXml(voice)}">${escapeXml(text)}</voice></speak>`;

const response = await fetch(`https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
  method: "POST",
  headers: {
    "Ocp-Apim-Subscription-Key": AZURE_KEY,
    "Content-Type": "application/ssml+xml",
    "X-Microsoft-OutputFormat": "riff-24khz-16bit-mono-pcm",
    "User-Agent": "dailylingua-reader-audio",
  },
  body: ssml,
});
const audio = Buffer.from(await response.arrayBuffer());
if (!response.ok || audio.length <= 1000) fail(`Azure Speech refused the text (${response.status}, ${audio.length} bytes)`);

const work = mkdtempSync(join(tmpdir(), "reader-audio-"));
try {
  const wav = join(work, "take.wav");
  writeFileSync(wav, audio);
  // Trim the silence Azure adds at both ends, then keep a short tail.
  const trim = "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,apad=pad_dur=0.3";
  await run("ffmpeg", ["-y", "-loglevel", "error", "-i", wav, "-af", trim, "-ac", "1", "-ar", "22050", "-codec:a", "libmp3lame", "-b:a", "64k", target]);
} finally {
  rmSync(work, { recursive: true, force: true });
}
console.log(`✓ apps/web/public/reader-audio/${out}.mp3 (${voice})`);
