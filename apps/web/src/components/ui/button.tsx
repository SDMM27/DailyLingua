import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
  // The only filled button of a screen.
  primary: "min-h-[52px] w-full bg-accent text-accent-ink",
  secondary: "min-h-11 border border-muted text-ink",
  ghost: "min-h-11 text-accent-strong",
};

/** Class names of a button, for links that look like one. */
export function buttonClass(variant: ButtonVariant = "primary"): string {
  return `${BASE} ${VARIANTS[variant]}`;
}

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button type={type} className={`${buttonClass(variant)} ${className}`.trim()} {...props} />;
}
