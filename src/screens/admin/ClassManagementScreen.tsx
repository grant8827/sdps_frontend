import { useEffect, useMemo, useState } from 'react';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { api, type AdminSetup, type ClassRow, type TeacherRow } from '../../services/api';
import { nextSchoolYearName } from '../../utils/schoolYear';

const emptyForm = { name: '', gradeLevelId: '', roomName: '', schoolYearId: '', campusId: '' };

type Tab = 'list' | 'register' | 'promote';
// The "Upgrade into" choice when next school year doesn't exist yet.
const NEW_YEAR = 'new-year';

/** Admin's Classes screen: create classrooms (name, grade, room, school year), and see who's assigned/enrolled in each. */
export function ClassManagementScreen() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>('list');
  const [setup, setSetup] = useState<AdminSetup | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [promoteFromClassId, setPromoteFromClassId] = useState('');
  const [promoteToClassId, setPromoteToClassId] = useState('');
  const [promoteTeacherId, setPromoteTeacherId] = useState('');
  const [targetYearId, setTargetYearId] = useState('');
  const [creatingYear, setCreatingYear] = useState(false);
  const [activating, setActivating] = useState(false);
  const activeYear = setup?.schoolYears.find(y => y.status === 'ACTIVE');
  const nextYear = setup?.schoolYears.find(y => y.status === 'PLANNING');

  const load = async () => {
    if (!token) return;
    const [nextSetup, nextClasses, nextTeachers] = await Promise.all([api.adminSetup(token), api.classes(token), api.teachers(token)]);
    setSetup(nextSetup);
    setClasses(nextClasses);
    setTeachers(nextTeachers);
    setForm(current => ({
      ...current,
      schoolYearId: current.schoolYearId || nextSetup.schoolYears.find(y => y.status === 'ACTIVE')?.id || '',
      gradeLevelId: current.gradeLevelId || nextSetup.gradeLevels[0]?.id || '',
    }));
    const activeId = nextSetup.schoolYears.find(y => y.status === 'ACTIVE')?.id;
    const nextId = nextSetup.schoolYears.find(y => y.status === 'PLANNING')?.id;
    setPromoteFromClassId(current => current || nextClasses.find(c => c.schoolYearId === activeId)?.id || '');
    // Upgrading defaults to next year (or offering to create it), never to an immediate move.
    setTargetYearId(current => (current && current !== NEW_YEAR ? current : nextId || NEW_YEAR));
  };
  useEffect(() => { load().catch(error => setMessage(error.message)); }, [token]);

  const set = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  const fromClassOptions = useMemo(() => classes.filter(c => c.schoolYearId === activeYear?.id), [classes, activeYear]);
  // To Class: any class (any grade) in the year chosen under "Upgrade
  // into", except the From class itself.
  const toClassOptions = useMemo(
    () => classes.filter(c => c.schoolYearId === targetYearId && c.id !== promoteFromClassId),
    [classes, targetYearId, promoteFromClassId],
  );
  useEffect(() => {
    if (!toClassOptions.some(c => c.id === promoteToClassId)) setPromoteToClassId(toClassOptions[0]?.id || '');
  }, [toClassOptions, promoteToClassId]);
  const promoteFromClass = classes.find(c => c.id === promoteFromClassId);
  const promoteToClass = classes.find(c => c.id === promoteToClassId);
  const activeTeachers = useMemo(() => teachers.filter(t => t.active), [teachers]);
  const promoteTeacher = teachers.find(t => t.id === promoteTeacherId);
  // Upgrading inside the current school year moves students at once.
  const sameYear = Boolean(activeYear) && targetYearId === activeYear?.id;
  const targetYearName = targetYearId === NEW_YEAR ? nextSchoolYearName(activeYear?.name) : setup?.schoolYears.find(y => y.id === targetYearId)?.name;
  // The class the chosen teacher leaves this year, if any.
  const teacherLeaves = sameYear && promoteTeacher?.classId && promoteTeacher.classId !== promoteToClassId ? promoteTeacher.className : undefined;
  const promotedIntoNextYear = useMemo(
    () => classes.filter(c => c.schoolYearId === nextYear?.id).reduce((sum, c) => sum + c.studentCount, 0),
    [classes, nextYear],
  );

  // Pre-fill with the To class's current teacher (if any) whenever the
  // selected class changes — the admin can still pick someone else,
  // e.g. when the class doesn't have a teacher yet.
  useEffect(() => { setPromoteTeacherId(promoteToClass?.teacherId || ''); }, [promoteToClassId, classes]);

  const runActivate = async () => {
    if (!token || !nextYear) return;
    if (!window.confirm(`Make "${nextYear.name}" the current school year? "${activeYear?.name}" will be closed, and parents and teachers will immediately see the new grades, classes, and teachers the next time they log in.`)) return;
    setMessage('');
    setActivating(true);
    try {
      await api.activateSchoolYear(token, nextYear.id);
      setMessage(`"${nextYear.name}" is now the active school year.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not activate school year');
    } finally {
      setActivating(false);
    }
  };

  const createNextYear = async () => {
    if (!token) return;
    setMessage('');
    setCreatingYear(true);
    try {
      const year = await api.createNextSchoolYear(token);
      await load();
      setTargetYearId(year.id);
      setMessage(year.created ? `${year.name} created. Add its classes, then upgrade students into them.` : `${year.name} is already set up.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create next school year');
    } finally {
      setCreatingYear(false);
    }
  };
  const addClassForYear = () => {
    setForm(current => ({ ...current, schoolYearId: targetYearId }));
    setTab('register');
  };

  const runPromotion = async () => {
    if (!token || !promoteFromClassId || !promoteToClassId) return;
    const fromClass = promoteFromClass;
    const toClass = promoteToClass;
    const teacherName = promoteTeacher?.fullName;
    const teacherChanged = promoteTeacherId && promoteTeacherId !== toClass?.teacherId;
    if (sameYear) {
      const lines = [
        `You are upgrading within the current school year (${activeYear?.name}). This takes effect immediately:`,
        '',
        `• The students leave "${fromClass?.name}" and join "${toClass?.name}" (Grade ${toClass?.gradeName}) now. Parents see the new grade and teacher right away.`,
        '• Their earlier class for this year is not kept as history. Attendance already recorded is kept.',
        ...(teacherName ? [`• ${teacherName} teaches "${toClass?.name}"${teacherLeaves ? `. "${teacherLeaves}" will have no teacher until you assign one` : ''}.`] : []),
        "• Drop-off and pickup requests that are waiting go to the new class's teacher.",
        '',
        'Move the students now?',
      ];
      if (!window.confirm(lines.join('\n'))) return;
    } else if (!window.confirm(`Move every active student in "${fromClass?.name}" into "${toClass?.name}" (Grade ${toClass?.gradeName})${teacherName ? `, taught by ${teacherName}` : ''}${teacherChanged ? ' — this reassigns that teacher off their current class' : ''}?`)) return;
    setMessage('');
    try {
      const result = await api.promoteByClass(token, { fromClassId: promoteFromClassId, toClassId: promoteToClassId, teacherUserId: promoteTeacherId || undefined });
      setMessage(result.sameYear
        ? `${result.promoted} student(s) moved to "${toClass?.name}". Parents and the teacher see the change now.`
        : `${result.promoted} student(s) promoted to "${toClass?.name}"${result.skipped ? ` (${result.skipped} already had an enrollment there)` : ''}. Parents and teachers see it once ${targetYearName} is activated.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Promotion failed');
    }
  };

  const submit = async () => {
    if (!token) return;
    setMessage('');
    if (!form.name.trim()) { setMessage('Class name is required.'); return; }
    if (!form.gradeLevelId || !form.schoolYearId) { setMessage('Grade and school year are required.'); return; }
    setSubmitting(true);
    try {
      await api.addClass(token, { name: form.name, gradeLevelId: form.gradeLevelId, roomName: form.roomName || undefined, schoolYearId: form.schoolYearId, campusId: form.campusId || undefined });
      setForm({ ...emptyForm, schoolYearId: form.schoolYearId, gradeLevelId: setup?.gradeLevels[0]?.id || '' });
      setMessage('Class added.');
      setTab('list');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not add class');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen title="Classes" subtitle="Set up classrooms — name, grade, and room.">
      <div className="subtabs">
        <button type="button" className={`subtab${tab === 'list' ? ' subtab-active' : ''}`} onClick={() => setTab('list')}>Classes</button>
        <button type="button" className={`subtab${tab === 'register' ? ' subtab-active' : ''}`} onClick={() => setTab('register')}>Add a Class</button>
        <button type="button" className={`subtab${tab === 'promote' ? ' subtab-active' : ''}`} onClick={() => setTab('promote')}>Classes Upgrade</button>
      </div>
      {message && <div className="card">{message}</div>}

      {tab === 'promote' && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p className="form-title" style={{ marginBottom: 0 }}>Promote Students</p>

          <p className="field-label" style={{ margin: 0 }}>Upgrade into (school year)</p>
          <select className="input" value={targetYearId} onChange={e => setTargetYearId(e.target.value)}>
            {nextYear
              ? <option value={nextYear.id}>{nextYear.name} (next year)</option>
              : <option value={NEW_YEAR}>{nextSchoolYearName(activeYear?.name)} (next year) — create it</option>}
            {activeYear && <option value={activeYear.id}>{activeYear.name} (current year)</option>}
          </select>
          {targetYearId === NEW_YEAR && (
            <div className="card" style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 14 }}>{targetYearName} doesn&apos;t exist yet. Create it, add its classes, then upgrade students into them. Nothing changes for parents or teachers until you activate it.</span>
              <button type="button" className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} disabled={creatingYear} onClick={createNextYear}>
                {creatingYear ? 'Creating…' : `Create ${targetYearName}`}
              </button>
            </div>
          )}

          {targetYearId !== NEW_YEAR && (
            <>
              <p className="field-label" style={{ margin: 0 }}>From Class</p>
              <select className="input" value={promoteFromClassId} onChange={e => setPromoteFromClassId(e.target.value)}>
                {fromClassOptions.length === 0 && <option value="">No classes in {activeYear?.name || 'the active year'} yet</option>}
                {fromClassOptions.map(c => <option key={c.id} value={c.id}>{c.name} (Grade {c.gradeName})</option>)}
              </select>

              <p className="field-label" style={{ margin: 0 }}>To Class</p>
              <select className="input" value={promoteToClassId} onChange={e => setPromoteToClassId(e.target.value)}>
                {toClassOptions.length === 0 && <option value="">No other classes in {targetYearName} yet</option>}
                {toClassOptions.map(c => <option key={c.id} value={c.id}>{c.name} (Grade {c.gradeName})</option>)}
              </select>
              {toClassOptions.length === 0 && (
                <button type="button" className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={addClassForYear}>Add a class for {targetYearName}</button>
              )}

              <p className="field-label" style={{ margin: 0 }}>Teacher</p>
              <select className="input" value={promoteTeacherId} onChange={e => setPromoteTeacherId(e.target.value)}>
                <option value="">No teacher assigned yet</option>
                {activeTeachers.map(t => <option key={t.id} value={t.id}>{t.fullName}{t.className ? ` — teaches ${t.className}` : ''}</option>)}
              </select>

              {sameYear && (
                <div role="alert" style={{ fontSize: 14, lineHeight: 1.5, borderLeft: '4px solid var(--amber)', paddingLeft: 10 }}>
                  <strong>You are upgrading within the current school year ({activeYear?.name}).</strong> This takes effect immediately:
                  <ul style={{ margin: '6px 0', paddingLeft: 18 }}>
                    <li>The students leave {promoteFromClass ? `"${promoteFromClass.name}"` : 'the From class'} and join {promoteToClass ? `"${promoteToClass.name}"` : 'the To class'} now. Parents see the new grade and teacher right away.</li>
                    <li>Their earlier class for this year is not kept as history. Attendance already recorded is kept.</li>
                    {promoteTeacher && <li>{promoteTeacher.fullName} teaches the new class{teacherLeaves ? `; "${teacherLeaves}" will have no teacher until you assign one` : ''}.</li>}
                    <li>Drop-off and pickup requests that are waiting go to the new class&apos;s teacher.</li>
                  </ul>
                  For the end-of-year upgrade, choose next year instead: nothing changes for parents or teachers until you activate the new year.
                </div>
              )}

              <button type="button" className="btn btn-primary" disabled={!promoteFromClassId || !promoteToClassId} onClick={runPromotion}>
                {sameYear ? 'Move students now' : 'Update'}
              </button>
            </>
          )}
        </div>
      )}

      {tab === 'promote' && nextYear && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p className="form-title" style={{ marginBottom: 0 }}>Activate School Year</p>
          <p className="quick-action-subtitle">{promotedIntoNextYear} student{promotedIntoNextYear === 1 ? '' : 's'} promoted into {nextYear.name} so far.</p>
          <p className="field-label" style={{ margin: 0 }}>
            Once every class has been promoted, activate {nextYear.name} to make it the current year — {activeYear?.name} will close, and parents and teachers will immediately see the new grades, classes, and teachers the next time they log in.
          </p>
          <button type="button" className="btn btn-primary" disabled={activating} onClick={runActivate}>
            {activating ? 'Activating…' : `Activate ${nextYear.name} as Current Year`}
          </button>
        </div>
      )}

      {tab === 'register' && (
        <div className="card" style={{ display: 'grid', gap: 10 }}>
          <p className="form-title">New class</p>
          <input className="input" placeholder="Class name (e.g. Grade 1 - Room 12)" value={form.name} onChange={e => set('name', e.target.value)} />
          <div className="btn-row">
            <select className="input" value={form.gradeLevelId} onChange={e => set('gradeLevelId', e.target.value)}>{setup?.gradeLevels.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
            <input className="input" placeholder="Room name (optional)" value={form.roomName} onChange={e => set('roomName', e.target.value)} />
          </div>
          <select className="input" value={form.schoolYearId} onChange={e => set('schoolYearId', e.target.value)}>{setup?.schoolYears.map(y => <option key={y.id} value={y.id}>{y.name}{y.status === 'ACTIVE' ? ' (active)' : ''}</option>)}</select>
          {setup && setup.campuses.length > 1 && (
            <select className="input" value={form.campusId} onChange={e => set('campusId', e.target.value)}>
              <option value="">Default campus</option>
              {setup.campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <button className="btn btn-primary" onClick={submit} disabled={submitting}>{submitting ? 'Adding…' : 'Add Class'}</button>
        </div>
      )}

      {tab === 'list' && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Class</th><th>Grade</th><th>Room</th><th>School Year</th><th>Teacher</th><th>Students</th></tr>
            </thead>
            <tbody>
              {classes.map(c => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.gradeName}</td>
                  <td>{c.roomName || '—'}</td>
                  <td>{c.schoolYearName}</td>
                  <td>{c.teacherName || 'Unassigned'}</td>
                  <td>{c.studentCount}</td>
                </tr>
              ))}
              {classes.length === 0 && <tr><td colSpan={6} className="empty-text">No classes set up yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </Screen>
  );
}
