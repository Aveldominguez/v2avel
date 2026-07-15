// Sum all numeric tokens in a string, ignoring numbers that represent
// weights (kg) or pieces (pc) instead of luggage units.
//
// Rules:
// - Match every full run of digits.
// - Skip a number if the characters immediately after it (optionally with
//   whitespace) start with "kg" or "pc" (case-insensitive), regardless of
//   how many digits the number has. Examples ignored: "130kg", "1500 KG",
//   "45PC", "1pc".
// - Alpha suffixes that are NOT kg/pc keep the number (e.g. "23BY" -> 23).
export const sumNumericTokens = (text: string): number => {
  if (!text) return 0;
  const regex = /\d+/g;
  let total = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    const after = text.slice(m.index + m[0].length);
    if (/^\s*(kg|pc)\b/i.test(after) || /^\s*(kg|pc)/i.test(after)) {
      continue;
    }
    total += parseInt(m[0], 10);
  }
  return total;
};
