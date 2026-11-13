/** A line of a check's result: what was looked at, and what was found. Both already translated. */
export type ReportLine = readonly [label: string, value: string];

/** The result of a check as plain text, one `label: value` per line, ready to be pasted in a message. */
export function formatReport(lines: readonly ReportLine[]): string {
  return lines.map(([label, value]) => `${label}: ${value}`).join("\n");
}

/** Bytes as megabytes with one decimal at most (`1.5`), for the storage figures. */
export function megabytes(bytes: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(bytes / (1024 * 1024));
}

/** A message of an unknown error, whatever was thrown. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.name === "Error" ? error.message : `${error.name}: ${error.message}`;
  return String(error);
}
