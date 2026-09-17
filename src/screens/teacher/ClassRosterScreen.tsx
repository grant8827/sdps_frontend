import { useEffect, useState } from 'react';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { api, type RosterStudent, type TeacherClass } from '../../services/api';

/**
 * Teacher Tab 2 - Class: who's in the classroom the teacher was
 * assigned to (admin sets this from Faculty's classroom dropdown), and
 * their enrollment status — active or suspended, set by an admin from
 * Students, shown here read-only (a teacher can't change it). A
 * removed (ARCHIVED) student is filtered out server-side rather than
 * shown at all. Day-to-day attendance marking lives on the separate
 * Attendance tab, not here — the two used to be duplicates of the same
 * screen, which made "Suspended" ambiguous (a day's attendance mark vs.
 * this enrollment status).
 */
export function ClassRosterScreen() {
  const { token, user } = useAuth();
  const [myClass, setMyClass] = useState<TeacherClass | null>(null);
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) return;
    api.teacherClass(token).then(setMyClass).catch(() => {});
    api.teacherStudents(token).then(setStudents).catch(error => setMessage(error.message));
  }, [token]);

  // Just grade/room/teacher, not myClass.name too — the class's own name
  // (e.g. "Grade 1 - Room 12") already tends to spell those out, so
  // showing both read as a duplicated "Grade 1 - Room 12 · Grade 1 · Room 12".
  const subtitle = myClass
    ? [`Grade ${myClass.gradeName}`, myClass.roomName, user?.fullName].filter(Boolean).join(' · ')
    : "You haven't been assigned to a classroom yet — ask your admin to set it from Faculty.";

  return (
    <Screen title="Class" subtitle={subtitle}>
      {message && <div className="card">{message}</div>}
      {students.length === 0 ? (
        <p className="empty-text">No students in this class yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th /><th>Student</th><th>Status</th></tr>
            </thead>
            <tbody>
              {students.map(student => (
                <tr key={student.id}>
                  <td>
                    {student.photoUrl ? (
                      <img src={student.photoUrl} alt="" className="avatar" />
                    ) : (
                      <span className="avatar avatar-placeholder">{student.fullName.charAt(0)}</span>
                    )}
                  </td>
                  <td>{student.fullName}</td>
                  <td>
                    <span className="pill" style={{ backgroundColor: student.status === 'SUSPENDED' ? 'var(--red)' : 'var(--green)', color: '#fff' }}>
                      {student.status === 'SUSPENDED' ? 'Suspended' : 'Active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Screen>
  );
}
