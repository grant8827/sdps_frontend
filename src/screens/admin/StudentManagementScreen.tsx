import { useEffect, useMemo, useState } from 'react';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { AttendanceList } from '../../components/AttendanceList';
import { api, type AdminSetup, type AttendanceRow, type ClassRow, type SettableAttendanceStatus, type Student, type TeacherRow } from '../../services/api';

interface DraftChild {
  firstName: string;
  lastName: string;
  studentNumber: string;
  dateOfBirth: string;
  gradeLevelId: string;
  classId: string;
  photoDataUrl: string;
  daycare: boolean;
}
const emptyChild = (gradeLevelId = ''): DraftChild => ({ firstName: '', lastName: '', studentNumber: '', dateOfBirth: '', gradeLevelId, classId: '', photoDataUrl: '', daycare: false });
const emptyGuardianForm = { schoolYearId: '', guardianId: '', guardianName: '', guardianEmail: '', guardianPhone: '', relationship: 'Parent', temporaryPassword: '' };
const todayIso = () => new Date().toISOString().slice(0, 10);

type Tab = 'list' | 'attendance' | 'register';

export function StudentManagementScreen() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>('list');
  const [setup, setSetup] = useState<AdminSetup | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [classRows, setClassRows] = useState<ClassRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [children, setChildren] = useState<DraftChild[]>([emptyChild()]);
  const [guardianForm, setGuardianForm] = useState(emptyGuardianForm);
  const [promoteFromClassId, setPromoteFromClassId] = useState('');
  const [promoteToClassId, setPromoteToClassId] = useState('');
  const [promoteTeacherId, setPromoteTeacherId] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [gradeFilter, setGradeFilter] = useState('');
  const [attendanceClassId, setAttendanceClassId] = useState('');
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);
  const activeYear = setup?.schoolYears.find(y => y.status === 'ACTIVE');
  const nextYear = setup?.schoolYears.find(y => y.status === 'PLANNING');

  const load = async () => {
    if (!token) return;
    const [nextSetup, nextStudents, nextClasses, nextTeachers] = await Promise.all([api.adminSetup(token), api.students(token), api.classes(token), api.teachers(token)]);
    setSetup(nextSetup); setStudents(nextStudents); setClassRows(nextClasses); setTeachers(nextTeachers);
    setGuardianForm(current => ({ ...current, schoolYearId: current.schoolYearId || nextSetup.schoolYears.find(y => y.status === 'ACTIVE')?.id || '' }));
    setChildren(current => current.map(c => c.gradeLevelId ? c : { ...c, gradeLevelId: nextSetup.gradeLevels[0]?.id || '' }));
    setAttendanceClassId(current => current || nextSetup.classes[0]?.id || '');
    const activeId = nextSetup.schoolYears.find(y => y.status === 'ACTIVE')?.id;
    const nextId = nextSetup.schoolYears.find(y => y.status === 'PLANNING')?.id;
    setPromoteFromClassId(current => current || nextClasses.find(c => c.schoolYearId === activeId)?.id || '');
    setPromoteToClassId(current => current || nextClasses.find(c => c.schoolYearId === nextId)?.id || '');
  };
  useEffect(() => { load().catch(error => setMessage(error.message)); }, [token]);
  const visibleStudents = useMemo(() => gradeFilter ? students.filter(s => s.gradeLevelId === gradeFilter) : students, [students, gradeFilter]);
  const classesFor = (gradeLevelId: string) => setup?.classes.filter(c => c.schoolYearId === guardianForm.schoolYearId && c.gradeLevelId === gradeLevelId) || [];
  const fromClassOptions = useMemo(() => classRows.filter(c => c.schoolYearId === activeYear?.id), [classRows, activeYear]);
  const toClassOptions = useMemo(() => classRows.filter(c => c.schoolYearId === nextYear?.id), [classRows, nextYear]);
  const promoteToClass = classRows.find(c => c.id === promoteToClassId);

  // Pre-fill with the To class's current teacher (if any) whenever the
  // selected class changes — the admin can still pick someone else,
  // e.g. when the class doesn't have a teacher yet.
  useEffect(() => { setPromoteTeacherId(promoteToClass?.teacherId || ''); }, [promoteToClassId, classRows]);

  useEffect(() => {
    if (!token || !attendanceClassId) { setAttendanceRows([]); return; }
    api.adminAttendance(token, attendanceClassId).then(setAttendanceRows).catch(error => setMessage(error.message));
  }, [token, attendanceClassId]);

  const markAttendance = async (row: AttendanceRow, status: SettableAttendanceStatus) => {
    if (!token) return;
    setMessage('');
    try {
      await api.markAttendance(token, row.studentId, todayIso(), status);
      setAttendanceRows(await api.adminAttendance(token, attendanceClassId));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not mark attendance');
    }
  };

  const updateChild = (index: number, patch: Partial<DraftChild>) =>
    setChildren(prev => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  const addAnotherChild = () => setChildren(prev => [...prev, emptyChild(setup?.gradeLevels[0]?.id || '')]);
  const removeChild = (index: number) => setChildren(prev => prev.filter((_, i) => i !== index));
  const setGuardianField = (key: keyof typeof guardianForm, value: string) => setGuardianForm(current => ({ ...current, [key]: value }));

  const onPhotoSelected = (index: number, file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateChild(index, { photoDataUrl: typeof reader.result === 'string' ? reader.result : '' });
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (!token) return;
    setMessage('');
    const validChildren = children.filter(c => c.firstName.trim() && c.lastName.trim());
    if (validChildren.length === 0) { setMessage('Add at least one child with a first and last name.'); return; }
    if (!guardianForm.schoolYearId) { setMessage('No active school year is configured.'); return; }
    const missingClass = validChildren.find(c => !c.gradeLevelId || !c.classId);
    if (missingClass) { setMessage(`Select a grade and class for ${missingClass.firstName || 'each child'}.`); return; }

    setSubmitting(true);
    try {
      // Sequential on purpose: the first child (when creating a new parent
      // account) creates the guardian; later children re-send the same
      // guardian email, and the backend links them to that same account
      // instead of making a duplicate — that only works if each request
      // finishes before the next starts.
      for (const child of validChildren) {
        await api.addStudent(token, {
          firstName: child.firstName,
          lastName: child.lastName,
          studentNumber: child.studentNumber,
          dateOfBirth: child.dateOfBirth,
          photoDataUrl: child.photoDataUrl || undefined,
          schoolYearId: guardianForm.schoolYearId,
          gradeLevelId: child.gradeLevelId,
          classId: child.classId,
          daycare: child.daycare,
          guardian: guardianForm.guardianId
            ? { id: guardianForm.guardianId, relationship: guardianForm.relationship }
            : guardianForm.guardianEmail
              ? { fullName: guardianForm.guardianName, email: guardianForm.guardianEmail, phone: guardianForm.guardianPhone, relationship: guardianForm.relationship, temporaryPassword: guardianForm.temporaryPassword }
              : undefined,
        });
      }
      setChildren([emptyChild(setup?.gradeLevels[0]?.id || '')]);
      setGuardianForm({ ...emptyGuardianForm, schoolYearId: activeYear?.id || '' });
      setMessage(`${validChildren.length} ${validChildren.length === 1 ? 'student' : 'students'} added${guardianForm.guardianId || guardianForm.guardianEmail ? ' and parent linked' : ''}.`);
      setTab('list');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not add student(s)');
    } finally {
      setSubmitting(false);
    }
  };

  const runPromotion = async () => {
    if (!token || !promoteFromClassId || !promoteToClassId) return;
    const fromClass = classRows.find(c => c.id === promoteFromClassId);
    const toClass = classRows.find(c => c.id === promoteToClassId);
    const teacherName = teachers.find(t => t.id === promoteTeacherId)?.fullName;
    const teacherChanged = promoteTeacherId && promoteTeacherId !== toClass?.teacherId;
    if (!window.confirm(`Move every active student in "${fromClass?.name}" into "${toClass?.name}" (Grade ${toClass?.gradeName})${teacherName ? `, taught by ${teacherName}` : ''}${teacherChanged ? ' — this reassigns that teacher off their current class' : ''}?`)) return;
    setMessage('');
    try {
      const result = await api.promoteByClass(token, { fromClassId: promoteFromClassId, toClassId: promoteToClassId, teacherUserId: promoteTeacherId || undefined });
      setMessage(`${result.promoted} student(s) promoted to "${toClass?.name}"${result.skipped ? ` (${result.skipped} already had an enrollment there)` : ''}.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Promotion failed');
    }
  };

  const toggleSuspend = async (student: Student) => {
    if (!token) return;
    const nextStatus = student.enrollmentStatus === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    try { await api.setStudentStatus(token, student.id, nextStatus); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not update student'); }
  };
  const remove = async (student: Student) => {
    if (!token || !window.confirm(`Delete ${student.fullName}? This removes their enrollment and parent links and cannot be undone.`)) return;
    try { await api.deleteStudent(token, student.id); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not delete student'); }
  };

  return <Screen title="Students" subtitle="Admin-only enrollment, attendance, and yearly promotion.">
    <div className="subtabs">
      <button type="button" className={`subtab${tab === 'list' ? ' subtab-active' : ''}`} onClick={() => setTab('list')}>Students &amp; Grades</button>
      <button type="button" className={`subtab${tab === 'attendance' ? ' subtab-active' : ''}`} onClick={() => setTab('attendance')}>Attendance</button>
      <button type="button" className={`subtab${tab === 'register' ? ' subtab-active' : ''}`} onClick={() => setTab('register')}>Register a Student</button>
    </div>
    {message && <div className="card">{message}</div>}

    {tab === 'register' && (
      <>
        {children.map((child, index) => (
          <div className="card" style={{ display: 'grid', gap: 10 }} key={index}>
            <div className="card-header">
              <p className="form-title" style={{ margin: 0 }}>{children.length > 1 ? `Child ${index + 1}` : 'Add student'}</p>
              {children.length > 1 && <button type="button" className="link-danger" onClick={() => removeChild(index)}>Remove</button>}
            </div>

            <div className="btn-row" style={{ alignItems: 'center' }}>
              {child.photoDataUrl
                ? <img src={child.photoDataUrl} alt="" className="avatar avatar-lg" />
                : <span className="avatar avatar-lg avatar-placeholder">{child.firstName.charAt(0) || '?'}</span>}
              <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                Upload photo
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => onPhotoSelected(index, e.target.files?.[0])} />
              </label>
            </div>

            <div className="btn-row"><input className="input" placeholder="First name" value={child.firstName} onChange={e => updateChild(index, { firstName: e.target.value })} /><input className="input" placeholder="Last name" value={child.lastName} onChange={e => updateChild(index, { lastName: e.target.value })} /></div>
            <div className="btn-row"><input className="input" placeholder="Student number" value={child.studentNumber} onChange={e => updateChild(index, { studentNumber: e.target.value })} /><input className="input" type="date" value={child.dateOfBirth} onChange={e => updateChild(index, { dateOfBirth: e.target.value })} /></div>
            <select className="input" value={child.gradeLevelId} onChange={e => updateChild(index, { gradeLevelId: e.target.value, classId: '' })}>{setup?.gradeLevels.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
            <select className="input" value={child.classId} onChange={e => updateChild(index, { classId: e.target.value })}><option value="">No class assigned yet</option>{classesFor(child.gradeLevelId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <label className="btn-row" style={{ alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={child.daycare} onChange={e => updateChild(index, { daycare: e.target.checked })} />
              <span>Daycare (extended time)</span>
            </label>
          </div>
        ))}

        <button type="button" className="btn btn-secondary" onClick={addAnotherChild}>+ Add Another Child</button>

        <div className="card" style={{ display: 'grid', gap: 10 }}>
          <p className="form-title">Parent / Guardian</p>
          <p className="field-label">Link an existing parent, or create one below — applies to every child above.</p>
          <select className="input" value={guardianForm.guardianId} onChange={e => setGuardianField('guardianId', e.target.value)}><option value="">Create new parent account</option>{setup?.guardians.map(g => <option key={g.id} value={g.id}>{g.fullName} — {g.email}</option>)}</select>
          {!guardianForm.guardianId && <><input className="input" placeholder="Parent full name" value={guardianForm.guardianName} onChange={e => setGuardianField('guardianName', e.target.value)} /><input className="input" type="email" placeholder="Parent email" value={guardianForm.guardianEmail} onChange={e => setGuardianField('guardianEmail', e.target.value)} /><input className="input" placeholder="Phone" value={guardianForm.guardianPhone} onChange={e => setGuardianField('guardianPhone', e.target.value)} /><input className="input" type="password" placeholder="Temporary password" value={guardianForm.temporaryPassword} onChange={e => setGuardianField('temporaryPassword', e.target.value)} /></>}
          <button className="btn btn-primary" onClick={submit} disabled={submitting}>{submitting ? 'Adding…' : children.length > 1 ? `Add ${children.length} Students` : 'Add Student'}</button>
        </div>
      </>
    )}

    {tab === 'attendance' && (
      <>
        <div className="btn-row" style={{ alignItems: 'center', marginBottom: 12 }}>
          <p className="field-label" style={{ margin: 0 }}>Classroom</p>
          <select className="input" style={{ maxWidth: 260 }} value={attendanceClassId} onChange={e => setAttendanceClassId(e.target.value)}>
            {setup?.classes.length ? setup.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>) : <option value="">No classes yet</option>}
          </select>
        </div>
        <AttendanceList rows={attendanceRows} onMark={markAttendance} />
      </>
    )}

    {tab === 'list' && (
      <>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p className="form-title" style={{ marginBottom: 0 }}>Promote Students</p>
          <p className="quick-action-subtitle">{activeYear?.name} → {nextYear?.name}</p>

          <p className="field-label" style={{ margin: 0 }}>From Class</p>
          <select className="input" value={promoteFromClassId} onChange={e => setPromoteFromClassId(e.target.value)}>
            {fromClassOptions.length === 0 && <option value="">No classes in {activeYear?.name || 'the active year'} yet</option>}
            {fromClassOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <p className="field-label" style={{ margin: 0 }}>To Class</p>
          <select className="input" value={promoteToClassId} onChange={e => setPromoteToClassId(e.target.value)}>
            {toClassOptions.length === 0 && <option value="">No classes set up for {nextYear?.name || 'next year'} yet</option>}
            {toClassOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {promoteToClass && (
            <p className="field-label" style={{ margin: 0 }}>Grade {promoteToClass.gradeName}</p>
          )}

          <p className="field-label" style={{ margin: 0 }}>Teacher</p>
          <select className="input" value={promoteTeacherId} onChange={e => setPromoteTeacherId(e.target.value)}>
            <option value="">No classroom assigned yet</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.fullName}</option>)}
          </select>

          <button type="button" className="btn btn-primary" disabled={!promoteFromClassId || !promoteToClassId} onClick={runPromotion}>
            Update
          </button>
        </div>

        <div className="btn-row" style={{ alignItems: 'center', marginBottom: 12 }}>
          <p className="field-label" style={{ margin: 0 }}>Filter by grade</p>
          <select className="input" style={{ maxWidth: 220 }} value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}>
            <option value="">All Grades</option>
            {setup?.gradeLevels.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th /><th>Student</th><th>Grade</th><th>Class</th><th>Parent(s)</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {visibleStudents.map(student => (
                <tr key={student.id}>
                  <td>{student.photoUrl ? <img src={student.photoUrl} alt="" className="avatar" /> : <span className="avatar avatar-placeholder">{student.firstName.charAt(0)}</span>}</td>
                  <td>{student.fullName}</td>
                  <td>{student.gradeName}</td>
                  <td>{student.className || '—'}</td>
                  <td>{student.guardians.length ? student.guardians.map(g => g.fullName).join(', ') : 'No parent linked'}</td>
                  <td><span className="pill" style={{ backgroundColor: student.enrollmentStatus === 'SUSPENDED' ? 'var(--red)' : 'var(--green)' }}>{student.enrollmentStatus === 'SUSPENDED' ? 'Suspended' : 'Active'}</span></td>
                  <td className="actions-cell">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => toggleSuspend(student)}>{student.enrollmentStatus === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}</button>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(student)}>Delete</button>
                  </td>
                </tr>
              ))}
              {visibleStudents.length === 0 && <tr><td colSpan={7} className="empty-text">{gradeFilter ? 'No students in this grade.' : 'No students enrolled yet.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </>
    )}
  </Screen>;
}
