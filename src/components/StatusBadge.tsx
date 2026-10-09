// Brand colors: green = active/done, amber = waiting/suspended, red only
// for warnings, grey for archived/disabled.
const TONES: Record<string, { bg: string; color?: string; label: string }> = {
  ACTIVE: { bg: 'var(--green)', label: 'Active' },
  SUSPENDED: { bg: 'var(--amber)', color: 'var(--on-amber)', label: 'Suspended' },
  ARCHIVED: { bg: '#6B7280', label: 'Archived' },
  DISABLED: { bg: '#6B7280', label: 'Disabled' },
  PENDING: { bg: 'var(--amber)', color: 'var(--on-amber)', label: 'Pending' },
};

/** A small status pill with a text label (never color alone). */
export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const tone = TONES[status] ?? { bg: 'var(--blue)', label: status };
  return <span className="pill" style={{ backgroundColor: tone.bg, color: tone.color }}>{label ?? tone.label}</span>;
}
