import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Screen } from '../../components/Screen';
import { Pagination } from '../../components/Pagination';
import { useAuth } from '../../context/AuthContext';
import { api, type BillingPlan, type Paged, type SubscriptionRow } from '../../services/api';
import { priceLabel } from './PlansScreen';

export const SUBSCRIPTION_LABEL: Record<SubscriptionRow['status'], string> = {
  TRIALING: 'Trial', ACTIVE: 'Active', PAST_DUE: 'Past due', CANCELED: 'Canceled', NONE: 'No plan',
};
const TONE: Record<SubscriptionRow['status'], { bg: string; color?: string }> = {
  TRIALING: { bg: 'var(--blue)' }, ACTIVE: { bg: 'var(--green)' }, PAST_DUE: { bg: 'var(--amber)', color: 'var(--on-amber)' }, CANCELED: { bg: '#6B7280' }, NONE: { bg: 'var(--chip-bg)', color: 'var(--text)' },
};
export const SubscriptionBadge = ({ status }: { status: SubscriptionRow['status'] }) => (
  <span className="pill" style={{ backgroundColor: TONE[status].bg, color: TONE[status].color }}>{SUBSCRIPTION_LABEL[status]}</span>
);

/** Billing → School Subscriptions: each school's plan and status. Changing it never switches the school's service on or off. */
export function SubscriptionsScreen() {
  const { token, can } = useAuth();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<SubscriptionRow> | null>(null);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [editing, setEditing] = useState<SubscriptionRow | null>(null);
  const [form, setForm] = useState({ planId: '', status: 'ACTIVE', startedOn: '', currentPeriodEnd: '', notes: '' });
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    if (token) api.subscriptions(token, { status: status || undefined, page }).then(setData).catch(err => setMessage(err.message));
  }, [token, status, page]);
  useEffect(load, [load]);
  useEffect(() => { if (token) api.billingPlans(token).then(setPlans).catch(() => {}); }, [token]);

  const edit = (row: SubscriptionRow) => {
    setEditing(row);
    setForm({ planId: row.planId ?? plans.find(p => p.active)?.id ?? '', status: row.status === 'NONE' ? 'ACTIVE' : row.status, startedOn: row.startedOn ?? '', currentPeriodEnd: row.currentPeriodEnd ?? '', notes: row.notes ?? '' });
  };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !editing) return;
    try {
      await api.setSubscription(token, editing.schoolId, { ...form, startedOn: form.startedOn || undefined, currentPeriodEnd: form.currentPeriodEnd || undefined, notes: form.notes || undefined });
      setMessage(`${editing.schoolName}'s subscription saved.`);
      setEditing(null);
      load();
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Could not save'); }
  };

  return (
    <Screen title="School Subscriptions" subtitle="Which plan each school is on. Changing a subscription doesn't switch a school's service on or off.">
      <label className="field-label" style={{ margin: 0 }}>Status{' '}
        <select className="input" style={{ width: 'auto', display: 'inline-block' }} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All</option>
          {Object.entries(SUBSCRIPTION_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </label>
      {message && <div className="card" role="status">{message}</div>}
      {editing && (
        <form className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 560 }} onSubmit={save}>
          <p className="form-title" style={{ margin: 0 }}>{editing.schoolName}</p>
          <label className="field-label" style={{ margin: 0 }}>Plan
            <select className="input" value={form.planId} onChange={e => setForm(f => ({ ...f, planId: e.target.value }))}>
              <option value="">Choose…</option>
              {plans.filter(p => p.active || p.id === editing.planId).map(p => <option key={p.id} value={p.id}>{p.name}: {priceLabel(p)}</option>)}
            </select>
          </label>
          <label className="field-label" style={{ margin: 0 }}>Status
            <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {(['TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED'] as const).map(s => <option key={s} value={s}>{SUBSCRIPTION_LABEL[s]}</option>)}
            </select>
          </label>
          <div className="action-row">
            <label className="field-label" style={{ margin: 0 }}>Started<input className="input" type="date" value={form.startedOn} onChange={e => setForm(f => ({ ...f, startedOn: e.target.value }))} /></label>
            <label className="field-label" style={{ margin: 0 }}>Current period ends<input className="input" type="date" value={form.currentPeriodEnd} onChange={e => setForm(f => ({ ...f, currentPeriodEnd: e.target.value }))} /></label>
          </div>
          <label className="field-label" style={{ margin: 0 }}>Notes<textarea className="textarea" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></label>
          <div className="action-row"><button type="submit" className="btn btn-primary">Save</button><button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button></div>
        </form>
      )}
      {!data ? <p className="empty-text">Loading…</p> : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>School</th><th>Plan</th><th>Status</th><th>Period ends</th><th>Active students</th><th /></tr></thead>
              <tbody>
                {data.items.map(row => (
                  <tr key={row.schoolId}>
                    <td><Link to={`/platform/schools/${row.schoolId}`}>{row.schoolName}</Link></td>
                    <td>{row.planName ?? '—'}{row.priceCents !== null && row.pricingModel && <div className="field-label" style={{ margin: 0 }}>{priceLabel({ priceCents: row.priceCents, pricingModel: row.pricingModel as 'FLAT' | 'PER_STUDENT', interval: row.interval as 'MONTH' | 'YEAR', currency: 'USD' })}</div>}</td>
                    <td><SubscriptionBadge status={row.status} /></td>
                    <td>{row.currentPeriodEnd ?? '—'}</td>
                    <td>{row.students}</td>
                    <td>{can('billing:update') && <button type="button" className="btn btn-secondary btn-sm" onClick={() => edit(row)}>{row.status === 'NONE' ? 'Set plan' : 'Change'}</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
        </>
      )}
    </Screen>
  );
}
