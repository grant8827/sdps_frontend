import { useEffect, useMemo, useState } from 'react';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { api, type ClassRow, type TeacherRow } from '../../services/api';

const emptyForm = { fullName: '', email: '', password: '', classId: '', photoDataUrl: '' };

/**
 * Admin Faculty Management (Add/Edit Teachers). Password is required
 * when creating a teacher (it's their login); the photo is optional.
 * The classroom field is a dropdown sourced from real classes (set up
 * on the Classes tab) rather than free text, and only offers rooms
 * that don't already have a different teacher — reassigning an
 * occupied room isn't a one-click action here.
 */
export function FacultyManagementScreen() {
  const { token } = useAuth();
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!token) return;
    const [nextTeachers, nextClasses] = await Promise.all([api.teachers(token), api.classes(token)]);
    setTeachers(nextTeachers);
    setClasses(nextClasses);
  };
  useEffect(() => { load().catch(error => setMessage(error.message)); }, [token]);

  const availableClasses = useMemo(() => classes.filter(c => !c.teacherId || c.teacherId === editingId), [classes, editingId]);
  const set = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));

  const onPhotoSelected = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set('photoDataUrl', typeof reader.result === 'string' ? reader.result : '');
    reader.readAsDataURL(file);
  };

  const resetForm = () => { setEditingId(null); setForm(emptyForm); };

  const startEdit = (teacher: TeacherRow) => {
    setEditingId(teacher.id);
    setForm({ fullName: teacher.fullName, email: teacher.email, password: '', classId: teacher.classId || '', photoDataUrl: teacher.photoUrl || '' });
  };

  const submit = async () => {
    if (!token) return;
    setMessage('');
    if (!form.fullName.trim()) { setMessage('Full name is required.'); return; }
    setSubmitting(true);
    try {
      if (editingId) {
        await api.updateTeacher(token, editingId, { fullName: form.fullName, photoDataUrl: form.photoDataUrl || undefined, classId: form.classId || null });
        setMessage('Teacher updated.');
      } else {
        if (!form.email.trim() || !form.password) { setMessage('Email and password are required.'); setSubmitting(false); return; }
        await api.addTeacher(token, { fullName: form.fullName, email: form.email, password: form.password, photoDataUrl: form.photoDataUrl || undefined, classId: form.classId || undefined });
        setMessage('Teacher added.');
      }
      resetForm();
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save teacher');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen title="Faculty" subtitle="Add teachers and assign their classroom.">
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p className="form-title" style={{ marginBottom: 0, fontSize: 15 }}>
          {editingId ? 'Edit Teacher' : 'Add Teacher'}
        </p>

        <div className="btn-row" style={{ alignItems: 'center' }}>
          {form.photoDataUrl
            ? <img src={form.photoDataUrl} alt="" className="avatar avatar-lg" />
            : <span className="avatar avatar-lg avatar-placeholder">{form.fullName.charAt(0) || '?'}</span>}
          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
            Upload photo (optional)
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => onPhotoSelected(e.target.files?.[0])} />
          </label>
        </div>

        <input className="input" placeholder="Full Name" value={form.fullName} onChange={e => set('fullName', e.target.value)} />
        <input className="input" placeholder="Email" type="email" value={form.email} disabled={!!editingId} onChange={e => set('email', e.target.value)} />
        {!editingId && <input className="input" placeholder="Password" type="password" value={form.password} onChange={e => set('password', e.target.value)} />}
        <select className="input" value={form.classId} onChange={e => set('classId', e.target.value)}>
          <option value="">No classroom assigned yet</option>
          {availableClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <div className="btn-row">
          {editingId && (
            <button type="button" className="btn btn-secondary" onClick={resetForm}>
              Cancel
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={submit} disabled={submitting}>
            {submitting ? 'Saving…' : editingId ? 'Save Changes' : 'Add Teacher'}
          </button>
        </div>
      </div>

      {message && <div className="card">{message}</div>}

      {teachers.map(teacher => (
        <button
          key={teacher.id}
          type="button"
          className="card"
          style={{ textAlign: 'left', width: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
          onClick={() => startEdit(teacher)}
        >
          {teacher.photoUrl
            ? <img src={teacher.photoUrl} alt="" className="avatar" />
            : <span className="avatar avatar-placeholder">{teacher.fullName.charAt(0)}</span>}
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span className="quick-action-title">{teacher.fullName}</span>
            <span className="quick-action-subtitle">{teacher.className || 'Unassigned'} · {teacher.email}</span>
          </span>
        </button>
      ))}
    </Screen>
  );
}
