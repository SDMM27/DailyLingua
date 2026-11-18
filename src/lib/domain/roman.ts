const NUMERALS: [number, string][] = [
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

/** Roman numeral of a small positive integer (1 → "I"), for numbered sections and summaries. */
export function toRoman(n: number): string {
  let rest = Math.max(0, Math.floor(n));
  let out = "";
  for (const [value, symbol] of NUMERALS) {
    while (rest >= value) {
      out += symbol;
      rest -= value;
    }
  }
  return out;
}
