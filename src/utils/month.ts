export interface MonthDay {
  date: string | null; // ISO yyyy-mm-dd, null for padding cells outside the month
  dayOfMonth: number | null;
  isWeekend: boolean;
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Lays out a given month (1-12) as Monday-first week rows, so a
 * calendar can render "all school days week by week." Days from the
 * previous/next month that share a row are left as null padding
 * rather than shown, keeping every week exactly 7 cells wide.
 */
export function getMonthWeeks(year: number, month: number): MonthDay[][] {
  const firstOfMonth = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7; // 0=Mon..6=Sun

  const days: MonthDay[] = [];
  for (let i = 0; i < firstWeekday; i++) days.push({ date: null, dayOfMonth: null, isWeekend: false });
  for (let d = 1; d <= daysInMonth; d++) {
    const weekday = new Date(year, month - 1, d).getDay(); // 0=Sun..6=Sat
    days.push({
      date: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      dayOfMonth: d,
      isWeekend: weekday === 0 || weekday === 6,
    });
  }
  while (days.length % 7 !== 0) days.push({ date: null, dayOfMonth: null, isWeekend: false });

  const weeks: MonthDay[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}
