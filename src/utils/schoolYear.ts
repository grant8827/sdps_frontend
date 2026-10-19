/** The name the next school year gets ("2026-2027" -> "2027-2028"); the same rule the server uses when it creates it. */
export function nextSchoolYearName(currentName: string | undefined): string {
  const match = /^(\d{4})\s*[-/]\s*(\d{4})$/.exec((currentName ?? '').trim());
  if (match) return `${Number(match[1]) + 1}-${Number(match[2]) + 1}`;
  const year = new Date().getFullYear() + 1;
  return `${year}-${year + 1}`;
}
