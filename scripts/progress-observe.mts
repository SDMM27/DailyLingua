import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
import {
  countProvenLemmas, loadProgressObservation, observeReading, readObservationTexts, type AppDatabase,
} from "@dailylingua/data";
import { dateKeySchema } from "@dailylingua/schemas";
import { z } from "zod";
import { readerCardLemma } from "../apps/web/src/lib/reader/words";

const usage = "npm run --silent progress:observe -- --user UUID --language ru|it --from AAAA-MM-JJ [--through AAAA-MM-JJ]";
const { values } = parseArgs({ options: {
  user: { type: "string" }, language: { type: "string" }, from: { type: "string" },
  through: { type: "string" }, help: { type: "boolean" },
} });
if (values.help) {
  console.log(usage);
  process.exit(0);
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const now = new Date().toISOString();
const options = z.object({
  user: z.uuid(), language: z.enum(["ru", "it"]), from: dateKeySchema, through: dateKeySchema,
}).safeParse({ ...values, through: values.through ?? now.slice(0, 10) });
if (!options.success) fail(usage);
const { user: userId, language, from: fromDay, through: throughDay } = options.data;
const dayCount = (Date.parse(throughDay) - Date.parse(fromDay)) / 86_400_000 + 1;
if (dayCount < 1 || dayCount > 90) fail("La période doit couvrir de 1 à 90 jours.");

const url = z.url({ protocol: /^https?$/ }).safeParse(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim());
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url.success || !key) fail("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.");
if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(url.data).hostname)) {
  fail("Le rapport doit être exécuté sur une base accessible en local.");
}

const provenance = z.object({ textId: z.uuid(), from: z.int().min(0) });
try {
  const client = createClient<AppDatabase, "app">(url.data, key, {
    db: { schema: "app" }, auth: { persistSession: false, autoRefreshToken: false },
  });
  const evidence = await loadProgressObservation(client, { userId, language, fromDay, throughDay, through: now });
  const candidates = evidence.cards.flatMap((card) => {
    const origin = provenance.safeParse(card.payload);
    return origin.success ? [{ card, ...origin.data }] : [];
  });
  const texts = await readObservationTexts(client, language, [
    ...evidence.sessions.map(({ textId }) => textId), ...candidates.map(({ textId }) => textId),
  ]);
  const textsById = new Map(texts.map((text) => [text.id, text]));
  const daysByCard = new Map<string, string[]>();
  for (const review of evidence.reviews) {
    const day = evidence.rewardDays.get(review.id);
    if (!day || !review.client_event_id) continue;
    const days = daysByCard.get(review.card_id) ?? [];
    days.push(day);
    daysByCard.set(review.card_id, days);
  }
  const vocabulary = candidates.flatMap(({ card, textId, from }) => {
    const text = textsById.get(textId);
    const identity = text && readerCardLemma(text.body, text.new_words, language, { ...card, from });
    return identity ? [{ ...identity, stability: card.stability, days: daysByCard.get(card.id) ?? [] }] : [];
  });
  console.log(JSON.stringify({
    version: 1, language, fromDay, throughDay, observedAt: now,
    reading: observeReading(evidence, texts),
    vocabulary: { provenLemmas: countProvenLemmas(vocabulary), resolvedCards: vocabulary.length, reviewedCards: evidence.cards.length },
  }, null, 2));
} catch {
  fail("Lecture des observations impossible. Vérifie la base locale, ses migrations et la période demandée.");
}
