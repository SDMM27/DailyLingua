import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserFacingError } from "@/lib/data/errors";
import { MISSION_READY_MESSAGE } from "@/lib/schemas/mission-request";
import { setNextTopic } from "./next-topic";

const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidatePath }));

const repo = vi.hoisted(() => ({
  isDemo: false,
  getToday: vi.fn(),
  getPreferences: vi.fn(),
  setMissionRequest: vi.fn(),
}));
vi.mock("@/lib/data/repository", () => ({ getRepository: async () => repo }));

beforeEach(() => {
  vi.clearAllMocks();
  repo.isDemo = false;
  repo.getToday.mockResolvedValue("2026-10-29"); // a Thursday
  repo.getPreferences.mockResolvedValue({
    goals: [
      { language: "it", days: [1, 2, 3, 4, 5, 6, 7] },
      { language: "ru", days: [1, 3] },
    ],
  });
  repo.setMissionRequest.mockResolvedValue(undefined);
});

describe("setNextTopic", () => {
  it("computes the date itself: the next day the language is worked", async () => {
    expect(await setNextTopic({ language: "it", topic: "sport" })).toEqual({ ok: true, data: undefined });
    expect(repo.setMissionRequest).toHaveBeenLastCalledWith({ language: "it", date: "2026-10-30", topic: "sport" });
    await setNextTopic({ language: "ru", topic: null });
    expect(repo.setMissionRequest).toHaveBeenLastCalledWith({ language: "ru", date: "2026-11-02", topic: null });
  });

  it("ignores a date sent by the client", async () => {
    await setNextTopic({ language: "it", topic: "sport", date: "2026-12-01" });
    expect(repo.setMissionRequest).toHaveBeenLastCalledWith({ language: "it", date: "2026-10-30", topic: "sport" });
  });

  it("revalidates the home page and the mission page", async () => {
    await setNextTopic({ language: "it", topic: "sport" });
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/mission");
  });

  it("refuses an unknown domain or language, and a language the user does not study", async () => {
    expect((await setNextTopic({ language: "it", topic: "bricolage" })).ok).toBe(false);
    expect((await setNextTopic({ language: "xx", topic: "sport" })).ok).toBe(false);
    expect((await setNextTopic({ language: "es", topic: "sport" })).ok).toBe(false);
    expect(repo.setMissionRequest).not.toHaveBeenCalled();
  });

  it("refuses in the demo", async () => {
    repo.isDemo = true;
    expect((await setNextTopic({ language: "it", topic: "sport" })).ok).toBe(false);
    expect(repo.setMissionRequest).not.toHaveBeenCalled();
  });

  it("passes on the message of a mission already written", async () => {
    repo.setMissionRequest.mockRejectedValue(new UserFacingError(MISSION_READY_MESSAGE));
    expect(await setNextTopic({ language: "it", topic: "sport" })).toEqual({ ok: false, error: MISSION_READY_MESSAGE });
  });
});
