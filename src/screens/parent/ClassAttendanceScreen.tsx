import { useEffect, useState } from 'react';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { api, type MyAttendanceChild } from '../../services/api';
import { getMonthWeeks, MONTH_NAMES, WEEKDAY_LABELS } from '../../utils/month';

type StoredStatus = 'PRESENT' | 'ABSENT' | 'SICK' | 'SUSPENDED' | 'HOLIDAY';
// LATE isn't a stored status — it's PRESENT with the late flag set (the
// student checked in after the school's configured start time), shown
// as its own badge/legend entry so it reads as "L" instead of "✓".
type DisplayStatus = StoredStatus | 'WEEKEND' | 'UNMARKED' | 'LATE';

const STATUS_LABEL: Record<DisplayStatus, string> = {
  PRESENT: '✓', ABSENT: 'X', HOLIDAY: 'H', WEEKEND: 'WK', SICK: 'S', SUSPENDED: 'SP', UNMARKED: '—', LATE: 'L',
};
const STATUS_COLOR: Record<DisplayStatus, string> = {
  PRESENT: '#16A34A', ABSENT: '#DC2626', HOLIDAY: '#7C3AED', WEEKEND: '#E5E7EB', SICK: '#F59E0B', SUSPENDED: '#111827', UNMARKED: '#F3F4F6', LATE: '#F97316',
};
const STATUS_TEXT_COLOR: Record<DisplayStatus, string> = {
  PRESENT: '#fff', ABSENT: '#fff', HOLIDAY: '#fff', SICK: '#fff', SUSPENDED: '#fff', WEEKEND: '#6B7280', UNMARKED: '#9CA3AF', LATE: '#fff',
};
const STATUS_MEANING: Record<DisplayStatus, string> = {
  PRESENT: 'Present — checked in for the day',
  ABSENT: 'Absent',
  HOLIDAY: 'School holiday',
  WEEKEND: 'Weekend',
  SICK: 'Sick',
  SUSPENDED: 'Suspended',
  UNMARKED: 'Not yet marked by the teacher',
  LATE: 'Late — dropped off after the school start time',
};
// Grid only shows the 5 school weekdays — Sat/Sun never render as columns.
const LEGEND_ORDER: DisplayStatus[] = ['PRESENT', 'LATE', 'ABSENT', 'HOLIDAY', 'WEEKEND', 'SICK', 'SUSPENDED'];

const POLL_MS = 4000;
const now = new Date();
const YEAR_OPTIONS = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

/**
 * Parent Tab 2 - Class & Attendance: a full month, laid out week by
 * week (weekdays only), for every linked child. Present/Absent/Sick/
 * Suspended/Holiday/Late come from attendance_records — a teacher (or
 * an approved drop-off) sets these; this screen is read-only. Mirrors
 * the mobile app's AttendanceScreen.
 */
export function ClassAttendanceScreen() {
  const { token } = useAuth();
  const [children, setChildren] = useState<MyAttendanceChild[]>([]);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = () => api.myAttendance(token).then(next => { if (!cancelled) setChildren(next); }).catch(() => {});
    load();
    const interval = setInterval(load, POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [token]);

  const weeks = getMonthWeeks(year, month);
  const weekdayLabels = WEEKDAY_LABELS.slice(0, 5);

  const statusFor = (child: MyAttendanceChild, date: string | null): DisplayStatus | null => {
    if (!date) return null;
    const record = child.records.find(r => r.date === date);
    if (!record) return 'UNMARKED';
    return record.status === 'PRESENT' && record.late ? 'LATE' : record.status;
  };

  return (
    <Screen title="Class & Attendance" subtitle="Select a month to see the full record, week by week.">
      <div className="btn-row" style={{ alignItems: 'flex-end', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <p className="field-label" style={{ margin: '0 0 4px' }}>Month</p>
          <select className="input" value={month} onChange={e => setMonth(Number(e.target.value))}>
            {MONTH_NAMES.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <p className="field-label" style={{ margin: '0 0 4px' }}>Year</p>
          <select className="input" value={year} onChange={e => setYear(Number(e.target.value))}>
            {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => setInfoOpen(true)}>ℹ️ Info</button>
      </div>

      {children.length === 0 ? (
        <p className="empty-text">No children linked to this account yet.</p>
      ) : (
        children.map(child => (
          <div key={child.id} className="card">
            <p className="quick-action-title" style={{ fontSize: 17 }}>{child.fullName}</p>
            <p className="quick-action-subtitle" style={{ marginBottom: 10 }}>
              {child.className ? `${child.className}${child.teacherName ? ` · ${child.teacherName}` : ''}` : 'Unassigned'}
              {' — '}{MONTH_NAMES[month - 1]} {year}
            </p>

            <div style={{ display: 'flex' }}>
              {weekdayLabels.map(label => (
                <span key={label} style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{label}</span>
              ))}
            </div>

            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} style={{ display: 'flex', marginTop: 6 }}>
                {week.slice(0, 5).map((day, dayIndex) => {
                  const status = statusFor(child, day.date);
                  return (
                    <div key={dayIndex} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minHeight: 44 }}>
                      {day.dayOfMonth !== null && (
                        <>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{day.dayOfMonth}</span>
                          <div
                            style={{
                              width: 26, height: 26, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              backgroundColor: STATUS_COLOR[status!],
                            }}
                          >
                            <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_TEXT_COLOR[status!] }}>{STATUS_LABEL[status!]}</span>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ))
      )}

      {infoOpen && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setInfoOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
        >
          <div onClick={e => e.stopPropagation()} className="card" style={{ width: 320, maxWidth: '90vw', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p className="form-title" style={{ margin: 0 }}>What the icons mean</p>
            {LEGEND_ORDER.map(key => (
              <div key={key} className="card-row" style={{ justifyContent: 'flex-start', gap: 10 }}>
                <div style={{ width: 26, height: 26, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: STATUS_COLOR[key], flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_TEXT_COLOR[key] }}>{STATUS_LABEL[key]}</span>
                </div>
                <span style={{ fontSize: 14, color: 'var(--text)' }}>{STATUS_MEANING[key]}</span>
              </div>
            ))}
            <button type="button" className="btn btn-primary" onClick={() => setInfoOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </Screen>
  );
}
