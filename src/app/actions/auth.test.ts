import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteAccount, requestPasswordReset, updatePassword, upgradeGuestAccount } from "./auth";

const auth = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  getUser: vi.fn(),
  signOut: vi.fn(),
}));
const deleteUserAccount = vi.hoisted(() => vi.fn());
const state = vi.hoisted(() => ({ demo: false }));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => (state.demo ? null : { auth }),
}));
vi.mock("@/lib/supabase/delete-account", () => ({ deleteUserAccount }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: "localhost:3000" }),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  state.demo = false;
  auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
  auth.updateUser.mockResolvedValue({ data: {}, error: null });
  auth.signOut.mockResolvedValue({ error: null });
  auth.getUser.mockResolvedValue({ data: { user: { id: "u1", is_anonymous: true, email: undefined } } });
  deleteUserAccount.mockResolvedValue(undefined);
});

describe("requestPasswordReset", () => {
  it("asks Supabase for a link that lands on the new password page", async () => {
    await requestPasswordReset({}, form({ email: " demo@dailylingua.test " }));
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("demo@dailylingua.test", {
      redirectTo: "http://localhost:3000/auth/confirm?next=/nouveau-mot-de-passe",
    });
  });

  it("gives the same answer for an existing account, an unknown one and a Supabase error", async () => {
    const existing = await requestPasswordReset({}, form({ email: "demo@dailylingua.test" }));
    // Supabase answers success for unknown addresses too, so the action cannot tell them apart.
    const unknown = await requestPasswordReset({}, form({ email: "nobody@example.com" }));
    auth.resetPasswordForEmail.mockResolvedValue({ data: null, error: { status: 500, code: "unexpected_failure" } });
    const failing = await requestPasswordReset({}, form({ email: "demo@dailylingua.test" }));

    expect(existing.notice).toMatch(/Si un compte existe/);
    expect(existing.error).toBeUndefined();
    expect(unknown.notice).toBe(existing.notice);
    expect(failing.notice).toBe(existing.notice);
    expect(failing.error).toBeUndefined();
    expect(console.error).toHaveBeenCalledOnce();
  });

  it("reports a rate limit", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ data: null, error: { status: 429, code: "over_email_send_rate_limit" } });
    const result = await requestPasswordReset({}, form({ email: "demo@dailylingua.test" }));
    expect(result.error).toBe("Trop de demandes, réessaie dans quelques minutes.");
    expect(result.notice).toBeUndefined();
  });

  it("recognises the rate limit by its code alone", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ data: null, error: { code: "over_email_send_rate_limit" } });
    expect((await requestPasswordReset({}, form({ email: "a@b.co" }))).error).toMatch(/Trop de demandes/);
  });

  it("rejects an invalid address without calling Supabase", async () => {
    const result = await requestPasswordReset({}, form({ email: "not-an-email" }));
    expect(result.error).toBe("Adresse e-mail invalide");
    expect(auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("is unavailable in the demo", async () => {
    state.demo = true;
    const result = await requestPasswordReset({}, form({ email: "demo@dailylingua.test" }));
    expect(result.error).toMatch(/démo/);
    expect(result.notice).toBeUndefined();
  });
});

describe("updatePassword", () => {
  const valid = { password: "new-password-1", confirmation: "new-password-1" };

  it("updates the password", async () => {
    expect(await updatePassword({}, form(valid))).toEqual({ done: true });
    expect(auth.updateUser).toHaveBeenCalledWith({ password: "new-password-1" });
  });

  it("refuses a short password", async () => {
    const result = await updatePassword({}, form({ password: "short", confirmation: "short" }));
    expect(result.error).toBe("Au moins 8 caractères");
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("refuses two different passwords", async () => {
    const result = await updatePassword({}, form({ password: "new-password-1", confirmation: "new-password-2" }));
    expect(result.error).toBe("Les deux mots de passe ne correspondent pas");
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("translates a password equal to the old one", async () => {
    auth.updateUser.mockResolvedValue({ data: null, error: { code: "same_password", status: 422 } });
    expect((await updatePassword({}, form(valid))).error).toBe("Choisis un mot de passe différent de l’ancien.");
  });

  it("translates a weak password", async () => {
    auth.updateUser.mockResolvedValue({ data: null, error: { code: "weak_password", status: 422 } });
    expect((await updatePassword({}, form(valid))).error).toMatch(/trop faible/);
  });

  it("points to a new link when the session is gone", async () => {
    auth.updateUser.mockResolvedValue({ data: null, error: { name: "AuthSessionMissingError", status: 400 } });
    const result = await updatePassword({}, form(valid));
    expect(result.expired).toBe(true);
    expect(result.error).toMatch(/expiré/);
  });

  it("hides unexpected errors behind a generic message", async () => {
    auth.updateUser.mockResolvedValue({ data: null, error: { status: 500, message: "boom" } });
    const result = await updatePassword({}, form(valid));
    expect(result.error).toMatch(/Impossible de changer/);
    expect(result.error).not.toMatch(/boom/);
  });

  it("is unavailable in the demo", async () => {
    state.demo = true;
    expect((await updatePassword({}, form(valid))).error).toMatch(/démo/);
  });
});

describe("upgradeGuestAccount", () => {
  it("asks for an e-mail confirmation that leads to the password screen", async () => {
    const result = await upgradeGuestAccount({}, form({ email: " moi@example.com " }));
    expect(auth.updateUser).toHaveBeenCalledWith(
      { email: "moi@example.com" },
      { emailRedirectTo: "http://localhost:3000/auth/confirm?next=/nouveau-mot-de-passe" },
    );
    expect(result.notice).toMatch(/Ta progression est conservée/);
    expect(result.error).toBeUndefined();
  });

  it("refuses an invalid address without calling Supabase", async () => {
    expect((await upgradeGuestAccount({}, form({ email: "nope" }))).error).toBe("Adresse e-mail invalide");
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("refuses a session that is not a guest", async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: "u1", is_anonymous: false, email: "a@b.co" } } });
    const result = await upgradeGuestAccount({}, form({ email: "moi@example.com" }));
    expect(result.error).toBeDefined();
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("sends a signed-out visitor to the sign-in screen", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null } });
    await expect(upgradeGuestAccount({}, form({ email: "moi@example.com" }))).rejects.toThrow("redirect:/connexion");
  });

  it("answers a taken address exactly like a free one (no account enumeration)", async () => {
    auth.updateUser.mockResolvedValue({ data: {}, error: null });
    const free = await upgradeGuestAccount({}, form({ email: "moi@example.com" }));
    auth.updateUser.mockResolvedValue({ data: null, error: { status: 422, code: "email_exists" } });
    const taken = await upgradeGuestAccount({}, form({ email: "moi@example.com" }));
    auth.updateUser.mockResolvedValue({ data: null, error: { status: 422, message: "A user with this email address has already been registered" } });
    const takenByMessage = await upgradeGuestAccount({}, form({ email: "moi@example.com" }));
    expect(taken).toEqual(free);
    expect(takenByMessage).toEqual(free);
    expect(free.error).toBeUndefined();
  });

  it("reports a rate limit", async () => {
    auth.updateUser.mockResolvedValue({ data: null, error: { status: 429, code: "over_email_send_rate_limit" } });
    expect((await upgradeGuestAccount({}, form({ email: "moi@example.com" }))).error).toMatch(/Trop de demandes/);
  });

  it("hides unexpected errors", async () => {
    auth.updateUser.mockResolvedValue({ data: null, error: { status: 500, message: "boom" } });
    const result = await upgradeGuestAccount({}, form({ email: "moi@example.com" }));
    expect(result.error).toMatch(/Impossible/);
    expect(result.error).not.toMatch(/boom/);
  });
});

describe("deleteAccount", () => {
  it("asks a guest to type « supprimer », whatever the case", async () => {
    expect((await deleteAccount({}, form({ confirmation: "oui" }))).error).toMatch(/supprimer/);
    expect(deleteUserAccount).not.toHaveBeenCalled();

    await expect(deleteAccount({}, form({ confirmation: " Supprimer " }))).rejects.toThrow("redirect:/connexion");
    expect(deleteUserAccount).toHaveBeenCalledWith("u1");
  });

  it("still asks a member for their e-mail", async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: "u2", is_anonymous: false, email: "Moi@Example.com" } } });
    expect((await deleteAccount({}, form({ confirmation: "supprimer" }))).error).toMatch(/adresse e-mail/);
    expect(deleteUserAccount).not.toHaveBeenCalled();

    await expect(deleteAccount({}, form({ confirmation: "moi@example.com" }))).rejects.toThrow("redirect:/connexion");
    expect(deleteUserAccount).toHaveBeenCalledWith("u2");
  });
});
