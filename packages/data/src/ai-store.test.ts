import { describe, expect, it } from "vitest";
import { createAiStore } from "./ai-store";
import { DataError } from "./errors";
import { fakeClient } from "./fake-client";

const USER = "00000000-0000-4000-8000-000000000001";

describe("createAiStore", () => {
  it("claims a quota through app.claim_quota", async () => {
    const { client, calls, schemas } = fakeClient({ data: true, error: null });
    const claimed = await createAiStore(client).claimQuota({ userId: USER, kind: "writing_feedback", limit: 3, day: "2026-11-14" });
    expect(claimed).toBe(true);
    expect(schemas).toEqual(["app"]);
    expect(calls).toEqual([
      { kind: "rpc", name: "claim_quota", args: { p_user_id: USER, p_kind: "writing_feedback", p_limit: 3, p_day: "2026-11-14" }, chain: [] },
    ]);
  });

  it("reports a refused claim as false", async () => {
    const { client } = fakeClient({ data: false, error: null });
    expect(await createAiStore(client).claimQuota({ userId: USER, kind: "roleplay", limit: 1, day: "2026-11-14" })).toBe(false);
  });

  it("does not take an unexpected answer for a granted quota", async () => {
    const { client } = fakeClient({ data: null, error: null });
    await expect(createAiStore(client).claimQuota({ userId: USER, kind: "roleplay", limit: 1, day: "2026-11-14" })).rejects.toMatchObject({
      code: "unknown",
    });
  });

  it("releases a quota through app.release_quota", async () => {
    const { client, calls } = fakeClient({ data: null, error: null });
    await createAiStore(client).releaseQuota({ userId: USER, kind: "roleplay", day: "2026-11-14" });
    expect(calls).toEqual([
      { kind: "rpc", name: "release_quota", args: { p_user_id: USER, p_kind: "roleplay", p_day: "2026-11-14" }, chain: [] },
    ]);
  });

  it("records a call through app.record_ai_call, field for field", async () => {
    const { client, calls } = fakeClient({ data: 42, error: null });
    await createAiStore(client).recordCall({
      purpose: "writing_feedback",
      model: "claude-haiku-5-5",
      promptVersion: "writing-feedback@3",
      inputTokens: 3000,
      outputTokens: 1200,
      cacheReadTokens: 500,
      cacheWriteTokens: 100,
      batch: false,
      costUsd: 0.001,
      userId: null,
      status: "ok",
    });
    expect(calls).toEqual([
      {
        kind: "rpc",
        name: "record_ai_call",
        args: {
          p_purpose: "writing_feedback",
          p_model: "claude-haiku-5-5",
          p_prompt_version: "writing-feedback@3",
          p_input_tokens: 3000,
          p_output_tokens: 1200,
          p_cache_read_tokens: 500,
          p_cache_write_tokens: 100,
          p_batch: false,
          p_cost_usd: 0.001,
          p_user_id: null,
          p_status: "ok",
        },
        chain: [],
      },
    ]);
  });

  it("reads the month's spend at the given instant, from a number or a numeric string", async () => {
    const at = new Date("2026-11-14T10:30:00Z");
    const number = fakeClient({ data: 1.25, error: null });
    expect(await createAiStore(number.client).monthSpendUsd(at)).toBe(1.25);
    expect(number.calls[0]).toMatchObject({ name: "ai_spend_month", args: { p_at: "2026-11-14T10:30:00.000Z" } });

    const text = fakeClient({ data: "0.004200", error: null });
    expect(await createAiStore(text.client).monthSpendUsd(at)).toBe(0.0042);

    const none = fakeClient({ data: null, error: null });
    expect(await createAiStore(none.client).monthSpendUsd(at)).toBe(0);
  });

  it("maps a database error to a DataError without its message", async () => {
    const { client } = fakeClient({ data: null, error: { code: "42501", message: 'permission denied for function "claim_quota"' } });
    const error = await createAiStore(client).releaseQuota({ userId: USER, kind: "x", day: "2026-11-14" }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DataError);
    expect(error).toMatchObject({ code: "unauthenticated", sqlstate: "42501", message: "unauthenticated" });
  });
});
