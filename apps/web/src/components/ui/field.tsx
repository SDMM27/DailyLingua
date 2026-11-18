import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";

export const CONTROL_CLASS =
  "min-h-12 w-full rounded-xl border border-muted bg-surface px-4 text-ink placeholder:text-muted aria-[invalid=true]:border-danger";

interface FieldProps {
  label: string;
  hint?: string;
  /** Already translated error message. */
  error?: string;
}

/** Wires a label, an optional hint and an optional error (linked with aria-describedby) to a control. */
function Field({
  label,
  hint,
  error,
  children,
}: FieldProps & { children: (props: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode }) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextField({
  label,
  hint,
  error,
  className = "",
  ...props
}: FieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "aria-invalid" | "aria-describedby">) {
  return (
    <Field label={label} hint={hint} error={error}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className={`${CONTROL_CLASS} ${className}`.trim()}
          {...props}
        />
      )}
    </Field>
  );
}

export function SelectField({
  label,
  hint,
  error,
  className = "",
  children,
  ...props
}: FieldProps & Omit<SelectHTMLAttributes<HTMLSelectElement>, "id" | "aria-invalid" | "aria-describedby">) {
  return (
    <Field label={label} hint={hint} error={error}>
      {({ id, describedBy, invalid }) => (
        <select
          id={id}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className={`${CONTROL_CLASS} ${className}`.trim()}
          {...props}
        >
          {children}
        </select>
      )}
    </Field>
  );
}

/** A message tied to a form: an error is announced at once, a notice politely. */
export function FormMessage({ kind, id, children }: { kind: "error" | "notice"; id?: string; children: ReactNode }) {
  return (
    <p
      id={id}
      role={kind === "error" ? "alert" : "status"}
      className={`rounded-xl px-4 py-3 text-sm ${kind === "error" ? "border border-danger text-danger" : "border border-line bg-surface-2 text-ink"}`}
    >
      {children}
    </p>
  );
}
