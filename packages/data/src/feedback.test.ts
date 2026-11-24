import { describe, expect, it } from "vitest";
import { sendFeedback } from "./feedback";
import { fakeClient } from "./fake-client";

describe("sendFeedback", () => {
  it("calls app.send_feedback field for field", async () => {
    const { client, calls, schemas } = fakeClient({ data: null, error: null });
    await sendFeedback(client, { category: "bug", message: "Ça plante", page: "/settings", appVersion: "abc1234" });
    expect(schemas).toEqual(["app"]);
    expect(calls).toEqual([
      {
        kind: "rpc",
        name: "send_feedback",
        args: { p_category: "bug", p_message: "Ça plante", p_page: "/settings", p_app_version: "abc1234" },
        chain: [],
      },
    ]);
  });

  it("maps the rate limit and validation errors to stable codes", async () => {
    const limited = fakeClient({ data: null, error: { code: "DL429", message: "feedback_rate_limit" } });
    await expect(sendFeedback(limited.client, { category: "idee", message: "abc" })).rejects.toMatchObject({ code: "rate_limited" });
    const invalid = fakeClient({ data: null, error: { code: "22023" } });
    await expect(sendFeedback(invalid.client, { category: "idee", message: "a" })).rejects.toMatchObject({ code: "invalid" });
  });
});
