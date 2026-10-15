import type { AuthFormState } from "@/app/actions/auth";

// text-base: inputs under 16px make iOS Safari zoom in on focus.
export const inputClass =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-base placeholder:text-muted focus:border-ink-soft focus:outline-none";

export function EmailField({ defaultValue }: { defaultValue?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-soft">Adresse e-mail</span>
      <input
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        required
        defaultValue={defaultValue}
        className={inputClass}
      />
    </label>
  );
}

export function PasswordField({
  autoComplete,
  hint,
  minLength,
  name = "password",
  label = "Mot de passe",
}: {
  autoComplete: "current-password" | "new-password";
  hint?: string;
  minLength?: number;
  name?: string;
  label?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-soft">{label}</span>
      <input
        name={name}
        type="password"
        autoComplete={autoComplete}
        required
        minLength={minLength}
        className={inputClass}
      />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Feedback({ state }: { state: AuthFormState }) {
  return (
    <div aria-live="polite">
      {state.error && (
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.notice && <p className="rounded-2xl bg-success-soft px-4 py-3 text-sm text-success">{state.notice}</p>}
    </div>
  );
}

export function SubmitButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-2xl bg-ink px-5 py-3.5 text-[15px] font-semibold text-paper transition-transform active:scale-[0.98] disabled:opacity-60"
    >
      {pending ? "Un instant…" : label}
    </button>
  );
}
