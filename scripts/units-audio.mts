/**
 * `npm run units:audio [-- --unit <unitId>] [--force]`: synthesises the audio of the beginner units with the native
 * neural voices of Azure Speech (`j4-pr1-architecture.md` §8), on the author's machine only (never in CI).
 *
 * For every dialogue line, the whole dialogue, every key phrase, every conversation turn and every `listen_mcq` item,
 * it writes a mono MP3 to `apps/web/public/unit-audio/<lang>/<unitId>/<id>.mp3` when the file is missing (or always
 * with `--force`), then records the path in the unit's source file where the field is still `audio: null`.
 *
 * Writing units (`kind: "script"`) have no dialogue: the example word of every letter (`e1`, `e2`…, in the order of the
 * letters), every word (`w1`…) and every `listen_mcq` item are synthesised with the voice of the unit.
 *
 * Setup: an Azure Speech resource (the free F0 tier is enough), with `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION`
 * in the environment (for example from `.env.local`, never committed). ffmpeg must be in the PATH.
 *
 * Russian and Ukrainian stress marks (U+0301) are removed before synthesis; they stay on screen. Only the voices of
 * `CLEARED_VOICES` are accepted. (Piper was used before; its voices were fine-tuned from non-native bases.)
 */
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { CLEARED_VOICES, isAssessmentUnit, isScriptUnit, type AssessmentUnit, type Unit } from "@dailylingua/schemas";
import { UNITS } from "@dailylingua/content";

const run = promisify(execFile);
const ROOT = resolve(import.meta.dirname, "..");
const PUBLIC = join(ROOT, "apps/web/public");
const SOURCES = join(ROOT, "packages/content/src/units");
const AZURE_KEY = process.env.AZURE_SPEECH_KEY ?? "";
const AZURE_REGION = process.env.AZURE_SPEECH_REGION ?? "";
/** Silence between two lines of the whole dialogue (seconds). */
const LINE_GAP = 0.5;
/** Silence kept after a single clip (seconds). */
const TAIL = 0.2;

const args = process.argv.slice(2);
const only = args.includes("--unit") ? args[args.indexOf("--unit") + 1] : null;
const force = args.includes("--force");

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

interface Clip {
  /** Id of the element in the unit (`d1`, `k3`, `c2`, `i11`) or `dialogue` for the whole dialogue. */
  id: string;
  text: string;
  voice: string;
  /** Public path, starting with `/unit-audio/`. */
  path: string;
  /** For the whole dialogue: the line clips to join. */
  parts?: Clip[];
  /** Letter of a writing unit whose example this is: where `recordPath` looks for the `audio: null` to fill. */
  letter?: string;
}

const speak = (text: string) => text.normalize("NFD").replace(/́/g, "").normalize("NFC");

function clipsOf(unit: Exclude<Unit, AssessmentUnit>): Clip[] {
  if (isScriptUnit(unit)) {
    const pathOf = (id: string) => `/unit-audio/${unit.language}/${unit.id}/${id}.mp3`;
    return [
      ...unit.letters.map((letter, index) => ({ id: `e${index + 1}`, letter: letter.lower, text: letter.example.word, voice: unit.voice, path: letter.example.audio ?? pathOf(`e${index + 1}`) })),
      ...unit.words.map((word) => ({ id: word.id, text: word.text, voice: unit.voice, path: word.audio ?? pathOf(word.id) })),
      ...unit.items.flatMap((item) => (item.kind === "listen_mcq" ? [{ id: item.id, text: item.audioText, voice: unit.voice, path: item.audio }] : [])),
    ];
  }
  const voiceOf = new Map(unit.dialogue.speakers.map((speaker) => [speaker.id, speaker.voice]));
  const firstVoice = unit.dialogue.speakers[0]?.voice as string;
  const pathOf = (id: string) => `/unit-audio/${unit.language}/${unit.id}/${id}.mp3`;
  const lines: Clip[] = unit.dialogue.lines.map((line) => ({ id: line.id, text: line.text, voice: voiceOf.get(line.speaker) ?? firstVoice, path: line.audio ?? pathOf(line.id) }));
  const lineVoice = new Map(lines.map((clip) => [clip.id, clip.voice]));
  return [
    ...lines,
    { id: "dialogue", text: "", voice: firstVoice, path: unit.dialogue.audio ?? pathOf("dialogue"), parts: lines },
    ...unit.keyPhrases.map((phrase) => ({ id: phrase.id, text: phrase.text, voice: (phrase.lineId && lineVoice.get(phrase.lineId)) || firstVoice, path: phrase.audio ?? pathOf(phrase.id) })),
    ...unit.conversation.turns.map((turn) => ({ id: turn.id, text: turn.text, voice: voiceOf.get(turn.speaker) ?? firstVoice, path: turn.audio ?? pathOf(turn.id) })),
    ...unit.items.flatMap((item) => (item.kind === "listen_mcq" ? [{ id: item.id, text: item.audioText, voice: firstVoice, path: item.audio }] : [])),
  ];
}

const escapeXml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** One clip as a WAV file, synthesised by Azure Speech (voice names start with their locale, `ru-RU-…`). */
async function synthesise(clip: Clip, work: string): Promise<string> {
  if (!(CLEARED_VOICES as readonly string[]).includes(clip.voice)) fail(`voice "${clip.voice}" is not cleared for use (${clip.id})`);
  const locale = clip.voice.split("-").slice(0, 2).join("-");
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${locale}"><voice name="${escapeXml(clip.voice)}">${escapeXml(speak(clip.text))}</voice></speak>`;
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(`https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": AZURE_KEY,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "riff-24khz-16bit-mono-pcm",
        "User-Agent": "dailylingua-units-audio",
      },
      body: ssml,
    });
    const audio = Buffer.from(await response.arrayBuffer());
    if (response.ok && audio.length > 1000) {
      const wav = join(work, `${clip.id}.wav`);
      writeFileSync(wav, audio);
      return wav;
    }
    // The free tier limits the request rate: wait and retry a few times.
    if (attempt >= 5) fail(`Azure Speech refused ${clip.id} (${response.status}, ${audio.length} bytes)`);
    await new Promise((done) => setTimeout(done, 2000 * attempt));
  }
}

async function toMp3(inputs: string[], target: string): Promise<void> {
  mkdirSync(dirname(target), { recursive: true });
  // Azure pads short utterances with up to a second of silence: trim both ends, then keep a short tail (a longer gap
  // between the lines of a whole dialogue).
  const trim = "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse";
  const tail = inputs.length === 1 ? TAIL : LINE_GAP;
  const filter = `${inputs.map((_, i) => `[${i}:a]${trim},apad=pad_dur=${tail}[a${i}]`).join(";")};${inputs.map((_, i) => `[a${i}]`).join("")}concat=n=${inputs.length}:v=0:a=1[out]`;
  await run("ffmpeg", ["-y", "-loglevel", "error", ...inputs.flatMap((file) => ["-i", file]), "-filter_complex", filter, "-map", "[out]", "-ac", "1", "-ar", "22050", "-codec:a", "libmp3lame", "-b:a", "64k", target]);
}

/** Records `path` in the source where the element's `audio` is still null. Returns false if nothing was changed. */
function recordPath(source: string, clip: Clip): { source: string; changed: boolean } {
  if (clip.id === "dialogue") {
    // The dialogue's own field: the only `audio:` at four spaces of indentation.
    const next = source.replace(/^ {4}audio: null,$/m, `    audio: "${clip.path}",`);
    return { source: next, changed: next !== source };
  }
  if (clip.letter !== undefined) {
    // The example of a letter: the first `audio: null` after `lower: "<letter>"`, before the next letter or the words.
    const at = source.indexOf(`lower: "${clip.letter}"`);
    if (at < 0) return { source, changed: false };
    const after = source.slice(at + 1);
    const stop = after.search(/upper: "|(?<![A-Za-z])words: \[/);
    const scope = stop < 0 ? after : after.slice(0, stop);
    const found = scope.indexOf("audio: null");
    if (found < 0) return { source, changed: false };
    const index = at + 1 + found;
    return { source: `${source.slice(0, index)}audio: "${clip.path}"${source.slice(index + "audio: null".length)}`, changed: true };
  }
  const start = source.search(new RegExp(`(?<![A-Za-z])id: "${clip.id}"`));
  if (start < 0) return { source, changed: false };
  const rest = source.slice(start + 1);
  const end = rest.search(/(?<![A-Za-z])id: "/);
  const scope = end < 0 ? rest : rest.slice(0, end);
  const at = scope.indexOf("audio: null");
  if (at < 0) return { source, changed: false };
  const index = start + 1 + at;
  return { source: `${source.slice(0, index)}audio: "${clip.path}"${source.slice(index + "audio: null".length)}`, changed: true };
}

/** The source file that declares this unit (file names do not follow the id: `01-saluer.ts`, `e1-lettres-familieres.ts`). */
function sourceFileOf(unit: Exclude<Unit, AssessmentUnit>): string {
  const folder = join(SOURCES, unit.language);
  const found = readdirSync(folder)
    .filter((name) => name.endsWith(".ts"))
    .map((name) => join(folder, name))
    .filter((file) => readFileSync(file, "utf8").includes(`id: "${unit.id}"`));
  if (found.length !== 1) fail(`expected one source file declaring ${unit.id} in ${folder}, found ${found.length}`);
  return found[0] as string;
}

// A bilan has no audio of its own: its items point at the audio files of the units they are drawn from.
const units = Object.values(UNITS)
  .filter((unit): unit is Exclude<Unit, AssessmentUnit> => !isAssessmentUnit(unit))
  .filter((unit) => only === null || unit.id === only);
if (units.length === 0) fail(only ? `unknown unit "${only}"` : "no unit in the registry");
if (!AZURE_KEY || !AZURE_REGION) fail("AZURE_SPEECH_KEY and AZURE_SPEECH_REGION must be set (see the header of this script)");

for (const unit of units) {
  const work = join(tmpdir(), `units-audio-${unit.id}`);
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  const sourceFile = sourceFileOf(unit);
  let source = readFileSync(sourceFile, "utf8");
  let made = 0;
  let recorded = 0;
  const wavs = new Map<string, string>();
  for (const clip of clipsOf(unit)) {
    const target = join(PUBLIC, clip.path);
    if (force || !existsSync(target)) {
      if (clip.parts) {
        const inputs: string[] = [];
        for (const part of clip.parts) inputs.push(wavs.get(part.id) ?? (await synthesise(part, work)));
        await toMp3(inputs, target);
      } else {
        const wav = await synthesise(clip, work);
        wavs.set(clip.id, wav);
        await toMp3([wav], target);
      }
      made++;
    }
    const result = recordPath(source, clip);
    source = result.source;
    if (result.changed) recorded++;
  }
  if (recorded > 0) writeFileSync(sourceFile, source, "utf8");
  rmSync(work, { recursive: true, force: true });
  console.log(`✓ ${unit.id}: ${made} file(s) generated, ${recorded} path(s) recorded in ${sourceFile.slice(ROOT.length + 1)}`);
}
