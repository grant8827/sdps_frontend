import { useEffect, useState } from 'react';
import { Screen } from '../../components/Screen';
import { AttendanceList } from '../../components/AttendanceList';
import { useAuth } from '../../context/AuthContext';
import { api, type AttendanceRow, type SettableAttendanceStatus, type TeacherAttendanceStudent } from '../../services/api';
import { getMonthWeeks, MONTH_NAMES } from '../../utils/month';

const todayIso = () => new Date().toISOString().slice(0, 10);

type StoredStatus = 'PRESENT' | 'ABSENT' | 'SICK' | 'SUSPENDED' | 'HOLIDAY';
// LATE isn't a stored status — it's PRESENT with the late flag set (the
// student checked in after the school's configured start time), shown
// as its own badge/legend entry so it reads as "L" instead of "✓".
type DisplayStatus = StoredStatus | 'WEEKEND' | 'UNMARKED' | 'LATE';

// Same icon/color legend as the parent's Class & Attendance screen —
// a teacher and a parent should read the same "✓ / L / X" for the
// same underlying record.
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
  UNMARKED: 'Not yet marked',
  LATE: 'Late — dropped off after the school start time',
};
const LEGEND_ORDER: DisplayStatus[] = ['PRESENT', 'LATE', 'ABSENT', 'HOLIDAY', 'WEEKEND', 'SICK', 'SUSPENDED'];

const now = new Date();
const YEAR_OPTIONS = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

type Tab = 'today' | 'history';

/**
 * Teacher's Attendance screen — two tabs. "Attendance" marks today's
 * status for the class (unchanged). "Attendance History" is a
 * month-by-month, week-by-week record for every student in the class,
 * matching the parent's Class & Attendance screen's ✓/L/X icon style
 * so the same record reads the same way to both audiences.
 */
export function AttendanceScreen() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>('today');

  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [message, setMessage] = useState('');

  const [students, setStudents] = useState<TeacherAttendanceStudent[]>([]);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [infoOpen, setInfoOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!token) return;
    api.teacherAttendance(token).then(setRows).catch(error => setMessage(error.message));
  }, [token]);

  useEffect(() => {
    if (!token || tab !== 'history') return;
    api.teacherAttendanceHistory(token).then(setStudents).catch(error => setMessage(error.message));
  }, [token, tab]);

  const mark = async (row: AttendanceRow, status: SettableAttendanceStatus) => {
    if (!token) return;
    setMessage('');
    try {
      await api.markAttendance(token, row.studentId, todayIso(), status);
      setRows(await api.teacherAttendance(token));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not mark attendance');
    }
  };

  const weeks = getMonthWeeks(year, month);
  const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  const statusFor = (student: TeacherAttendanceStudent, date: string | null): DisplayStatus | null => {
    if (!date) return null;
    const record = student.records.find(r => r.date === date);
    if (!record) return 'UNMARKED';
    return record.status === 'PRESENT' && record.late ? 'LATE' : record.status;
  };

  const visibleStudents = students.filter(student => student.fullName.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <Screen title="Attendance" subtitle={tab === 'today' ? "Mark today's attendance for your class." : 'Select a month to see the full record, week by week.'}>
      <div className="subtabs">
        <button type="button" className={`subtab${tab === 'today' ? ' subtab-active' : ''}`} onClick={() => setTab('today')}>Attendance</button>
        <button type="button" className={`subtab${tab === 'history' ? ' subtab-active' : ''}`} onClick={() => setTab('history')}>Attendance History</button>
      </div>

      {message && <div className="card">{message}</div>}

      {tab === 'today' && <AttendanceList rows={rows} onMark={mark} />}

      {tab === 'history' && (
        <>
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

          <input className="input" placeholder="Search for a student…" value={search} onChange={e => setSearch(e.target.value)} />

          {students.length === 0 ? (
            <p className="empty-text">No students in this class yet.</p>
          ) : visibleStudents.length === 0 ? (
            <p className="empty-text">No student matches "{search}".</p>
          ) : (
            visibleStudents.map(student => (
              <div key={student.id} className="card">
                <p className="quick-action-title" style={{ fontSize: 17 }}>{student.fullName}</p>
                <p className="quick-action-subtitle" style={{ marginBottom: 10 }}>{MONTH_NAMES[month - 1]} {year}</p>

                <div style={{ display: 'flex' }}>
                  {weekdayLabels.map(label => (
                    <span key={label} style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{label}</span>
                  ))}
                </div>

                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} style={{ display: 'flex', marginTop: 6 }}>
                    {week.slice(0, 5).map((day, dayIndex) => {
                      const status = statusFor(student, day.date);
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
        </>
      )}
    </Screen>
  );
}
