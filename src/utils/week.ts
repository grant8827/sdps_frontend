/** Returns this week's Mon-Fri as ISO (yyyy-mm-dd) dates, for the weekly attendance grid. */
export function getCurrentWeekdayDates(): { label: string; date: string }[] {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const now = new Date();
  const day = now.getDay(); // 0 = Sun ... 6 = Sat
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);

  return labels.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { label, date: d.toISOString().slice(0, 10) };
  });
}
