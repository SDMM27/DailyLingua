import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSupabaseRepository } from "@/lib/data/supabase-repository";
import type { SourceDefinition } from "@/lib/schemas/content";
import type { Database } from "@/lib/supabase/database.types";
import { SOURCE_CATALOG } from "./catalog";
import { isSourceAllowed, parseCatalog } from "./ingest";
import type { ContentDraft } from "./normalize";
import { createSupabaseContentStore } from "./supabase-store";

/**
 * Ingestion → reading list, against the LOCAL Supabase stack. Uses its own source (removed
 * afterwards with its contents) and a throw-away user. Skipped when the local stack is down.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function localStackIsUp(): Promise<boolean> {
  if (!url || !anonKey || !serviceKey) return false;
  if (!["127.0.0.1", "localhost", "[::1]"].includes(new URL(url).hostname)) return false;
  try {
    const res = await fetch(`${url}/auth/v1/health`, { headers: { apikey: anonKey }, signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

const stackIsUp = await localStackIsUp();
const RUN = Date.now().toString(36);
const HOST = `run-${RUN}.example.org`;

const TEST_SOURCE: SourceDefinition = {
  key: `integration-${RUN}`,
  name: "Fonte di prova",
  language: "it",
  homepageUrl: `https://${HOST}/`,
  feedUrl: `https://${HOST}/feed`,
  contentType: "article",
  difficulty: "B1",
  defaultMinutes: 4,
  hosts: [HOST],
  license: {
    kind: "all-rights-reserved",
    name: "Tous droits réservés",
    termsUrl: `https://${HOST}/termini`,
    commercialUse: false,
    verifiedOn: "2026-10-13",
    note: "integration test",
  },
};

function draft(path: string, minutesAgo: number): ContentDraft {
  return {
    sourceKey: TEST_SOURCE.key,
    language: "it",
    contentType: "article",
    title: `Articolo di prova ${path}`,
    url: `https://${HOST}/${path}`,
    difficulty: "B1",
    durationMinutes: 4,
    summary: "Una breve presentazione.",
    author: "Redazione",
    categories: ["Prova"],
    publishedAt: new Date(Date.now() - minutesAgo * 60_000),
    audioUrl: null,
    topics: null,
  };
}

describe.skipIf(!stackIsUp)("content ingestion on Supabase (local database)", () => {
  let admin: SupabaseClient<Database>;
  let userClient: SupabaseClient<Database>;
  let userId: string;
  let sourceId: string;
  const store = () => createSupabaseContentStore(admin);
  // The whole catalogue plus the test source: syncing a partial list would retire real sources.
  const catalog = parseCatalog([...SOURCE_CATALOG, TEST_SOURCE]);

  beforeAll(async () => {
    admin = createClient<Database>(url!, serviceKey!, { auth: { persistSession: false } });
    const email = `content-${RUN}@test.invalid`;
    const password = `pw-${Math.random().toString(36).slice(2)}-${RUN}`;
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error) throw created.error;
    userId = created.data.user.id;
    userClient = createClient<Database>(url!, anonKey!, { auth: { persistSession: false } });
    const signedIn = await userClient.auth.signInWithPassword({ email, password });
    if (signedIn.error) throw signedIn.error;

    const ids = await store().syncSources(catalog, (s) => isSourceAllowed(s, "all"));
    sourceId = ids.get(TEST_SOURCE.key)!;
  });

  afterAll(async () => {
    if (!admin) return;
    if (sourceId) {
      await admin.from("contents").delete().eq("source_id", sourceId);
      await admin.from("sources").delete().eq("id", sourceId);
    }
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("stores the source with its licence", async () => {
    const { data } = await admin.from("sources").select("*").eq("id", sourceId).single();
    expect(data).toMatchObject({
      key: TEST_SOURCE.key,
      language: "it",
      feed_url: `https://${HOST}/feed`,
      license_kind: "all-rights-reserved",
      commercial_use: false,
      license_verified_on: "2026-10-13",
      active: true,
    });
  });

  it("inserts new contents once, whatever tracking parameters the link carries", async () => {
    expect(await store().insertContents(sourceId, [draft("a", 5), draft("b", 10)])).toBe(2);
    const again = { ...draft("a", 5), url: `https://${HOST}/a?utm_source=rss` };
    expect(await store().insertContents(sourceId, [again, draft("b", 10)])).toBe(0);
  });

  it("records the fetch result on the source", async () => {
    await store().recordFetch(sourceId, { ok: false, error: "HTTP 500" });
    await store().recordFetch(sourceId, { ok: true, itemCount: 2 });
    const { data } = await admin.from("sources").select("last_fetch_status, last_fetch_error, last_item_count").eq("id", sourceId).single();
    expect(data).toEqual({ last_fetch_status: "ok", last_fetch_error: null, last_item_count: 2 });
  });

  it("shows the contents to a signed-in user, newest first, with the source's licence", async () => {
    const repo = createSupabaseRepository(userClient, userId, { contentPolicy: "all" });
    const mine = (await repo.listContents(["it"], 200)).filter((c) => c.url.includes(HOST));
    expect(mine.map((c) => c.title)).toEqual(["Articolo di prova a", "Articolo di prova b"]);
    expect(mine[0]).toMatchObject({
      language: "it",
      author: "Redazione",
      source: { name: "Fonte di prova", access: "free", license: { kind: "all-rights-reserved" } },
    });
    expect((await repo.listSources()).some((s) => s.key === TEST_SOURCE.key)).toBe(true);
  });

  it("hides contents whose link is broken", async () => {
    // The local database may hold more than a page (1,000 rows) of real contents waiting for a
    // check after `content:ingest`; the oldest fetched come first, so date this run's rows back.
    await admin.from("contents").update({ fetched_at: "2000-01-01T00:00:00Z" }).eq("source_id", sourceId);
    const pending = await store().listUncheckedLinks(1000);
    const b = pending.find((p) => p.url === `https://${HOST}/b`);
    expect(b?.sourceKey).toBe(TEST_SOURCE.key);
    await store().setLinkStatus(b!.id, "broken");
    const repo = createSupabaseRepository(userClient, userId, { contentPolicy: "all" });
    const urls = (await repo.listContents(["it"], 200)).map((c) => c.url);
    expect(urls).toContain(`https://${HOST}/a`);
    expect(urls).not.toContain(`https://${HOST}/b`);
  });

  it("an inconclusive check waits a day before being retried", async () => {
    const a = (await store().listUncheckedLinks(1000)).find((p) => p.url === `https://${HOST}/a`);
    await store().setLinkStatus(a!.id, null);
    const after = await store().listUncheckedLinks(1000);
    expect(after.some((p) => p.id === a!.id)).toBe(false);
    const { data } = await admin.from("contents").select("url_status").eq("id", a!.id).single();
    expect(data?.url_status).toBe("unchecked");
  });

  it("lists the contents to classify, newest first, then stores their domains", async () => {
    // Back to unclassified: the previous tests left some of this run's rows with a broken link.
    await admin.from("contents").update({ topics: null, url_status: "unchecked" }).eq("source_id", sourceId);
    await admin.from("contents").update({ fetched_at: "2000-01-01T00:00:00Z" }).eq("source_id", sourceId);
    const { data: rows } = await admin.from("contents").select("id, url").eq("source_id", sourceId);
    const a = rows!.find((r) => r.url === `https://${HOST}/a`)!;
    const b = rows!.find((r) => r.url === `https://${HOST}/b`)!;
    await admin.from("contents").update({ fetched_at: "2000-01-02T00:00:00Z" }).eq("id", a.id);

    // The local database may hold real contents to classify: look at this run's rows only.
    const mine = async () => (await store().listUnclassifiedContents(5000)).filter((c) => c.id === a.id || c.id === b.id);
    expect((await mine()).map((c) => c.id)).toEqual([a.id, b.id]);
    expect((await mine())[0]).toMatchObject({ language: "it", title: "Articolo di prova a", summary: "Una breve presentazione." });

    await store().setContentTopics([
      { id: a.id, topics: ["société", "sciences"] },
      { id: b.id, topics: [] },
    ]);
    expect(await mine()).toEqual([]);
    const { data } = await admin.from("contents").select("id, topics").in("id", [a.id, b.id]);
    expect(data!.find((r) => r.id === a.id)?.topics).toEqual(["société", "sciences"]);
    expect(data!.find((r) => r.id === b.id)?.topics).toEqual([]);

    // A broken link is not worth classifying.
    await admin.from("contents").update({ topics: null, url_status: "broken" }).eq("id", b.id);
    expect((await mine()).map((c) => c.id)).toEqual([a.id].filter(() => false));
  });

  it("refuses domains outside the list or more than three per content", async () => {
    const { data: rows } = await admin.from("contents").select("id").eq("source_id", sourceId).limit(1);
    const id = rows![0].id;
    expect((await admin.from("contents").update({ topics: ["cuisine"] }).eq("id", id)).error?.code).toBe("23514");
    expect(
      (await admin.from("contents").update({ topics: ["société", "culture", "histoire", "sciences"] }).eq("id", id)).error?.code,
    ).toBe("23514");
  });

  it("applies a source's domains to its unclassified contents only", async () => {
    await admin.from("contents").update({ topics: null, url_status: "unchecked" }).eq("source_id", sourceId);
    const { data: rows } = await admin.from("contents").select("id").eq("source_id", sourceId).order("id");
    await admin.from("contents").update({ topics: ["sport"] }).eq("id", rows![0].id);

    expect(await store().applySourceTopics(TEST_SOURCE.key, ["voyage"])).toBe(rows!.length - 1);
    expect(await store().applySourceTopics(TEST_SOURCE.key, ["voyage"])).toBe(0);
    expect(await store().applySourceTopics("unknown-source", ["voyage"])).toBe(0);
    const { data } = await admin.from("contents").select("id, topics").eq("source_id", sourceId);
    expect(data!.find((r) => r.id === rows![0].id)?.topics).toEqual(["sport"]);
    expect(data!.filter((r) => r.id !== rows![0].id).every((r) => r.topics?.[0] === "voyage")).toBe(true);
  });

  it("under the commercial policy, hides sources that do not allow it", async () => {
    const repo = createSupabaseRepository(userClient, userId, { contentPolicy: "commercial" });
    expect((await repo.listContents(["it"], 200)).some((c) => c.url.includes(HOST))).toBe(false);
    const sources = await repo.listSources();
    expect(sources.some((s) => s.key === TEST_SOURCE.key)).toBe(false);
    expect(sources.length).toBeGreaterThan(0);
  });

  it("retires a source that leaves the catalogue", async () => {
    await store().syncSources(parseCatalog(SOURCE_CATALOG), () => true);
    const { data } = await admin.from("sources").select("active").eq("id", sourceId).single();
    expect(data?.active).toBe(false);
    const repo = createSupabaseRepository(userClient, userId, { contentPolicy: "all" });
    expect((await repo.listContents(["it"], 200)).some((c) => c.url.includes(HOST))).toBe(false);
  });

  it("does not let a signed-in user write the shared catalogue", async () => {
    const { error } = await userClient.from("sources").update({ active: false }).eq("id", sourceId);
    expect(error?.code).toBe("42501");
  });
});
