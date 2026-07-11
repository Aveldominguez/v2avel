// Sum all numeric tokens in a string, ignoring:
// - alpha chars (e.g. "23BY" -> 23)
// - any number immediately followed by "kg" (case-insensitive, optional whitespace)
//   e.g. "130kg" -> 0, "10 KG" -> 0, "12+130kg=142" -> 12+142 = 154 (the "130" preceding "kg" is skipped)
export const sumNumericTokens = (text: string): number => {
  if (!text) return 0;
  const matches = text.match(/\d+(?!\s*kg)/gi);
  if (!matches) return 0;
  return matches.reduce((acc, n) => acc + parseInt(n, 10), 0);
};
