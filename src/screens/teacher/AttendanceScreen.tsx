import { useEffect, useState } from 'react';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { STATUS_COLOR, STATUS_LABEL, STATUS_TEXT_COLOR, SETTABLE_STATUSES } from '../../components/AttendanceList';
import { api, type AttendanceRow, type SettableAttendanceStatus } from '../../services/api';
import { getCurrentWeekdayDates } from '../../utils/week';

const WEEK = getCurrentWeekdayDates();

interface StudentWeek {
  studentId: string;
  fullName: string;
  photoUrl?: string;
  byDate: Record<string, AttendanceRow['status']>;
}

/** Teacher's Attendance screen — this week's Mon-Fri grid for their own class, one status per student per day. */
export function AttendanceScreen() {
  const { token } = useAuth();
  const [students, setStudents] = useState<StudentWeek[]>([]);
  const [message, setMessage] = useState('');

  const load = async () => {
    if (!token) return;
    const days = await Promise.all(WEEK.map(day => api.teacherAttendance(token, day.date)));
    const byStudent = new Map<string, StudentWeek>();
    days.forEach((rows, i) => {
      const date = WEEK[i].date;
      for (const row of rows) {
        if (!byStudent.has(row.studentId)) {
          byStudent.set(row.studentId, { studentId: row.studentId, fullName: row.fullName, photoUrl: row.photoUrl, byDate: {} });
        }
        byStudent.get(row.studentId)!.byDate[date] = row.status;
      }
    });
    setStudents([...byStudent.values()]);
  };
  useEffect(() => { load().catch(error => setMessage(error.message)); }, [token]);

  const mark = async (studentId: string, date: string, status: SettableAttendanceStatus) => {
    if (!token) return;
    setMessage('');
    try {
      await api.markAttendance(token, studentId, date, status);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not mark attendance');
    }
  };

  return (
    <Screen title="Attendance" subtitle="This week's attendance for your class.">
      {message && <div className="card">{message}</div>}
      {students.length === 0 ? (
        <p className="empty-text">No students to show.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th /><th>Student</th>
                {WEEK.map(day => <th key={day.date}>{day.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {students.map(student => (
                <tr key={student.studentId}>
                  <td>
                    {student.photoUrl ? (
                      <img src={student.photoUrl} alt="" className="avatar" />
                    ) : (
                      <span className="avatar avatar-placeholder">{student.fullName.charAt(0)}</span>
                    )}
                  </td>
                  <td>{student.fullName}</td>
                  {WEEK.map(day => {
                    const status = student.byDate[day.date] ?? 'UNMARKED';
                    return (
                      <td key={day.date}>
                        <select
                          className="input"
                          style={{ minWidth: 120, backgroundColor: STATUS_COLOR[status], color: STATUS_TEXT_COLOR[status] }}
                          value={SETTABLE_STATUSES.includes(status as SettableAttendanceStatus) ? status : ''}
                          onChange={e => mark(student.studentId, day.date, e.target.value as SettableAttendanceStatus)}
                        >
                          <option value="" disabled>{status === 'UNMARKED' ? 'Not marked…' : STATUS_LABEL[status]}</option>
                          {SETTABLE_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                        </select>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Screen>
  );
}
