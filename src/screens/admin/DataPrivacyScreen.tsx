import { useEffect, useState } from 'react';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { api, type RemovedStudent, type RetentionSettings } from '../../services/api';
import { formatUtcTimestamp } from '../../utils/utcTime';

/**
 * Admin Data & Privacy: download the school's data, manage removed
 * students (export, restore, or erase for good), and set how long
 * records are kept. School admins only; every export and erasure is in
 * the Audit Log.
 */
export function DataPrivacyScreen() {
  const { token } = useAuth();
  const [removed, setRemoved] = useState<RemovedStudent[]>([]);
  const [retention, setRetention] = useState<RetentionSettings | null>(null);
  const [studentDays, setStudentDays] = useState('');
  const [queueDays, setQueueDays] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!token) return;
    const [nextRemoved, nextRetention] = await Promise.all([api.removedStudents(token), api.retention(token)]);
    setRemoved(nextRemoved);
    setRetention(nextRetention);
    setStudentDays(nextRetention.removedStudentRetentionDays?.toString() ?? '');
    setQueueDays(nextRetention.queueHistoryRetentionDays?.toString() ?? '');
  };
  useEffect(() => { load().catch(error => setMessage(error.message)); }, [token]);

  const act = async (action: () => Promise<string | void>) => {
    setBusy(true); setMessage('');
    try { const done = await action(); if (done) setMessage(done); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Something went wrong'); }
    finally { setBusy(false); }
  };

  const erase = (student: RemovedStudent) => {
    const typed = window.prompt(`Permanently delete ${student.fullName}? This erases their record, attendance, pickup history and guardian links, and cannot be undone. Export it first if you may need it.\n\nType the student's full name to confirm:`);
    if (typed === null) return;
    const reason = window.prompt('Reason (optional, kept in the audit log), e.g. "Parent deletion request":') ?? undefined;
    act(async () => { await api.permanentlyDeleteStudent(token!, student.id, typed, reason || undefined); return `${student.fullName} was permanently deleted.`; });
  };

  const saveRetention = () => act(async () => {
    const parse = (value: string) => (value.trim() === '' ? null : Number(value));
    await api.saveRetention(token!, { removedStudentRetentionDays: parse(studentDays), queueHistoryRetentionDays: parse(queueDays) });
    return 'Retention settings saved. They are applied automatically every day.';
  });

  const runNow = () => {
    if (!retention || !window.confirm(`Apply retention now? This permanently deletes ${retention.wouldDeleteNow.removedStudents} removed student(s) and ${retention.wouldDeleteNow.pickupHistory} old drop-off/pickup record(s).`)) return;
    act(async () => {
      const result = await api.runRetention(token!);
      return `Deleted ${result.studentsDeleted} removed student(s) and ${result.pickupHistoryDeleted} old drop-off/pickup record(s).`;
    });
  };

  return (
    <Screen title="Data & Privacy" subtitle="Export records, handle deletion requests, and set how long data is kept.">
      {message && <div className="card">{message}</div>}

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p className="form-title" style={{ margin: 0 }}>Export</p>
        <p style={{ margin: 0, fontSize: 14 }}>
          Download all of this school's records (students, parents, staff, classes, attendance, drop-off/pickup history) as a JSON file.
          To export one student's full record, including their photo, use <strong>Export</strong> next to them on the Students page or below.
        </p>
        <div><button type="button" className="btn btn-secondary" disabled={busy} onClick={() => act(async () => { await api.exportSchool(token!); })}>Download school data</button></div>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p className="form-title" style={{ margin: 0 }}>Removed students</p>
        <p style={{ margin: 0, fontSize: 14 }}>Students removed from the Students page stay on file until you restore them, delete them permanently, or the retention period below runs out.</p>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Student</th><th>Removed</th><th>Deleted automatically after</th><th>Actions</th></tr></thead>
            <tbody>
              {removed.map(student => (
                <tr key={student.id}>
                  <td>{student.fullName}{student.studentNumber && <div className="field-label" style={{ margin: 0 }}>#{student.studentNumber}</div>}</td>
                  <td>{formatUtcTimestamp(student.removedAt)}</td>
                  <td>{student.purgeAfter ? formatUtcTimestamp(student.purgeAfter) : 'Kept until deleted'}</td>
                  <td className="actions-cell">
                    <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => act(async () => { await api.exportStudent(token!, student.id); })}>Export</button>
                    <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => act(async () => { await api.restoreStudent(token!, student.id); return `${student.fullName} was restored.`; })}>Restore</button>
                    <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => erase(student)}>Delete permanently</button>
                  </td>
                </tr>
              ))}
              {removed.length === 0 && <tr><td colSpan={4} className="empty-text">No removed students.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {retention && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 640 }}>
          <p className="form-title" style={{ margin: 0 }}>Retention</p>
          <p style={{ margin: 0, fontSize: 14 }}>
            Set these to match your school's or district's records policy. Leave a box empty to keep those records until they're deleted by hand.
            The minimum is {retention.minimumDays} days. The audit log is not affected.
          </p>
          <label className="field-label" style={{ margin: 0 }}>Permanently delete removed students after (days)</label>
          <input className="input" inputMode="numeric" placeholder="Keep" value={studentDays} onChange={e => setStudentDays(e.target.value.replace(/\D/g, ''))} />
          <label className="field-label" style={{ margin: 0 }}>Delete finished drop-off/pickup records older than (days)</label>
          <input className="input" inputMode="numeric" placeholder="Keep" value={queueDays} onChange={e => setQueueDays(e.target.value.replace(/\D/g, ''))} />
          <div className="btn-row">
            <button type="button" className="btn btn-primary" disabled={busy} onClick={saveRetention}>Save</button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={busy || (retention.wouldDeleteNow.removedStudents === 0 && retention.wouldDeleteNow.pickupHistory === 0)}
              onClick={runNow}
            >
              Apply now
            </button>
          </div>
          <p className="field-label" style={{ margin: 0 }}>
            With the saved settings, the next daily run would delete {retention.wouldDeleteNow.removedStudents} removed student(s) and {retention.wouldDeleteNow.pickupHistory} old drop-off/pickup record(s).
          </p>
        </div>
      )}
    </Screen>
  );
}
