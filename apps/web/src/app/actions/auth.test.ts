import { beforeEach, describe, expect, it, vi } from "vitest";

const signInWithPassword = vi.fn();
const signUp = vi.fn();
const createSupabaseServerClient = vi.fn(async () => ({ auth: { signInWithPassword, signUp } }));

vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => createSupabaseServerClient() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: "localhost:3200" }) }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`NEXT_REDIRECT ${path}`);
  },
}));

const { signIn, signUp: signUpAction } = await import("./auth");

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("signIn action", () => {
  it("refuses an empty or malformed e-mail without calling Supabase", async () => {
    expect(await signIn({}, form({ email: "", password: "x" }))).toEqual({ email: "", error: "emailRequired" });
    expect(await signIn({}, form({ email: "nope", password: "x" }))).toEqual({ email: "nope", error: "emailInvalid" });
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("refuses an empty password as invalid credentials", async () => {
    expect(await signIn({}, form({ email: "a@b.test", password: "" }))).toEqual({
      email: "a@b.test",
      error: "invalidCredentials",
    });
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("returns a code, never the raw message of Supabase", async () => {
    signInWithPassword.mockResolvedValue({ error: { status: 400, code: "invalid_credentials", message: "Invalid login credentials" } });
    expect(await signIn({}, form({ email: "a@b.test", password: "secret-pass" }))).toEqual({
      email: "a@b.test",
      error: "invalidCredentials",
    });
  });

  it("does not blame the credentials for a server failure, and reports rate limits and the CAPTCHA", async () => {
    signInWithPassword.mockResolvedValue({ error: { status: 500, message: "boom" } });
    expect((await signIn({}, form({ email: "a@b.test", password: "x" }))).error).toBe("generic");
    signInWithPassword.mockResolvedValue({ error: { status: 429, code: "over_request_rate_limit" } });
    expect((await signIn({}, form({ email: "a@b.test", password: "x" }))).error).toBe("tooManyRequests");
    signInWithPassword.mockResolvedValue({ error: { status: 400, code: "captcha_failed" } });
    expect((await signIn({}, form({ email: "a@b.test", password: "x" }))).error).toBe("botCheck");
  });

  it("passes the CAPTCHA token on and goes to the home page on success", async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    await expect(signIn({}, form({ email: " a@b.test ", password: "pw", captchaToken: "tok" }))).rejects.toThrow("NEXT_REDIRECT /");
    expect(signInWithPassword).toHaveBeenCalledWith({ email: "a@b.test", password: "pw", options: { captchaToken: "tok" } });
  });
});

describe("signUp action", () => {
  it("refuses a password shorter than 8 characters without calling Supabase", async () => {
    expect(await signUpAction({}, form({ email: "a@b.test", password: "1234567" }))).toEqual({
      email: "a@b.test",
      error: "passwordTooShort",
    });
    expect(signUp).not.toHaveBeenCalled();
  });

  it("asks to check the mailbox when confirmation is required (no session)", async () => {
    signUp.mockResolvedValue({ data: { session: null }, error: null });
    expect(await signUpAction({}, form({ email: "a@b.test", password: "12345678" }))).toEqual({
      email: "a@b.test",
      notice: "checkEmail",
    });
    expect(signUp).toHaveBeenCalledWith({
      email: "a@b.test",
      password: "12345678",
      options: { emailRedirectTo: "http://localhost:3200/auth/confirm" },
    });
  });

  it("maps the failures of Supabase to codes", async () => {
    signUp.mockResolvedValue({ data: {}, error: { status: 422, code: "user_already_exists", message: "User already registered" } });
    expect((await signUpAction({}, form({ email: "a@b.test", password: "12345678" }))).error).toBe("emailTaken");
    signUp.mockResolvedValue({ data: {}, error: { status: 422, code: "weak_password" } });
    expect((await signUpAction({}, form({ email: "a@b.test", password: "12345678" }))).error).toBe("passwordWeak");
  });

  it("goes to the home page when the session starts at once", async () => {
    signUp.mockResolvedValue({ data: { session: {} }, error: null });
    await expect(signUpAction({}, form({ email: "a@b.test", password: "12345678" }))).rejects.toThrow("NEXT_REDIRECT /");
  });
});
