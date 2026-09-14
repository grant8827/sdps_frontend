import type { AttendanceRow, SettableAttendanceStatus } from '../services/api';

const STATUS_LABEL: Record<AttendanceRow['status'], string> = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  SICK: 'Sick',
  SUSPENDED: 'Suspended',
  HOLIDAY: 'Holiday',
  WEEKEND: 'Weekend (WK)',
  UNMARKED: 'Not marked',
};
const STATUS_COLOR: Record<AttendanceRow['status'], string> = {
  PRESENT: 'var(--green)',
  ABSENT: 'var(--red)',
  SICK: 'var(--amber)',
  SUSPENDED: '#111827',
  HOLIDAY: 'var(--purple)',
  WEEKEND: '#E5E7EB',
  UNMARKED: 'var(--gray)',
};
const STATUS_TEXT_COLOR: Record<AttendanceRow['status'], string> = {
  PRESENT: '#fff', ABSENT: '#fff', SICK: '#fff', SUSPENDED: '#fff', HOLIDAY: '#fff',
  WEEKEND: '#374151', UNMARKED: '#fff',
};
// Every date defaults to WEEKEND (Sat/Sun) or UNMARKED (weekday) until a
// teacher/admin picks something from this list — including picking
// Weekend back explicitly, e.g. after having overridden a Saturday.
const SETTABLE_STATUSES: SettableAttendanceStatus[] = ['PRESENT', 'ABSENT', 'SICK', 'SUSPENDED', 'HOLIDAY', 'WEEKEND'];

/** Shared attendance roster table — used by both Admin's (classroom-scoped) and Teacher's (own-class) Attendance screens. */
export function AttendanceList({ rows, onMark }: { rows: AttendanceRow[]; onMark: (row: AttendanceRow, status: SettableAttendanceStatus) => void }) {
  if (rows.length === 0) return <p className="empty-text">No students to show.</p>;

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr><th /><th>Student</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.studentId}>
              <td>
                {row.photoUrl ? (
                  <img src={row.photoUrl} alt="" className="avatar" />
                ) : (
                  <span className="avatar avatar-placeholder">{row.fullName.charAt(0)}</span>
                )}
              </td>
              <td>{row.fullName}</td>
              <td>
                <span className="pill" style={{ backgroundColor: STATUS_COLOR[row.status], color: STATUS_TEXT_COLOR[row.status] }}>
                  {STATUS_LABEL[row.status]}
                </span>
              </td>
              <td className="actions-cell">
                <select
                  className="input"
                  style={{ maxWidth: 180 }}
                  value={SETTABLE_STATUSES.includes(row.status as SettableAttendanceStatus) ? row.status : ''}
                  onChange={e => onMark(row, e.target.value as SettableAttendanceStatus)}
                >
                  <option value="" disabled>{row.status === 'UNMARKED' ? 'Not marked — choose…' : 'Change status…'}</option>
                  {SETTABLE_STATUSES.map(status => (
                    <option key={status} value={status}>{STATUS_LABEL[status]}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
