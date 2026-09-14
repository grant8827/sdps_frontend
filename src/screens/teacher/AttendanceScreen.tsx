import { useEffect, useState } from 'react';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { AttendanceList } from '../../components/AttendanceList';
import { api, type AttendanceRow, type SettableAttendanceStatus } from '../../services/api';

const todayIso = () => new Date().toISOString().slice(0, 10);

/** Teacher's Attendance screen — no classroom picker, just their own class. */
export function AttendanceScreen() {
  const { token } = useAuth();
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) return;
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

  return (
    <Screen title="Attendance" subtitle="Mark today's attendance for your class.">
      {message && <div className="card">{message}</div>}
      <AttendanceList rows={rows} onMark={mark} />
    </Screen>
  );
}
