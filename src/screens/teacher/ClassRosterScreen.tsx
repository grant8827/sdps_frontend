import { useEffect, useState } from 'react';
import { Screen } from '../../components/Screen';
import { AttendanceList } from '../../components/AttendanceList';
import { useAuth } from '../../context/AuthContext';
import { api, type AttendanceRow, type SettableAttendanceStatus, type TeacherClass } from '../../services/api';

const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * Teacher Tab 2 - Class Roster: the classroom the teacher was assigned
 * to (admin sets this from Faculty's classroom dropdown) plus today's
 * real, actionable attendance for every student in it. Mirrors the
 * mobile app's ClassRosterScreen.
 */
export function ClassRosterScreen() {
  const { token } = useAuth();
  const [myClass, setMyClass] = useState<TeacherClass | null>(null);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) return;
    api.teacherClass(token).then(setMyClass).catch(() => {});
    api.teacherAttendance(token).then(setRows).catch(error => setMessage(error.message));
  }, [token]);

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

  const subtitle = myClass
    ? `${myClass.name} — today's attendance.`
    : "You haven't been assigned to a classroom yet — ask your admin to set it from Faculty.";

  return (
    <Screen title="Class Roster" subtitle={subtitle}>
      {message && <div className="card">{message}</div>}
      <AttendanceList rows={rows} onMark={mark} />
    </Screen>
  );
}
