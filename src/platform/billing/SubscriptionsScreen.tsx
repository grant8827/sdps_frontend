import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Screen } from '../../components/Screen';
import { Pagination } from '../../components/Pagination';
import { SummaryTile } from '../../components/SummaryTile';
import { useAuth } from '../../context/AuthContext';
import { api, type BillingInterval, type BillingPlan, type BillingSummary, type Paged, type PlatformSubscriptionRequest, type SubscriptionRow } from '../../services/api';
import { formatMoney, parseMoney } from '../../utils/money';
import { limitLabel, planPriceLabel, priceLabel } from '../../utils/plans';

export const SUBSCRIPTION_LABEL: Record<SubscriptionRow['status'], string> = {
  TRIALING: 'Trial', ACTIVE: 'Active', PAST_DUE: 'Past due', CANCELED: 'Canceled', NONE: 'No plan',
};
const TONE: Record<SubscriptionRow['status'], { bg: string; color?: string }> = {
  TRIALING: { bg: 'var(--blue)' }, ACTIVE: { bg: 'var(--green)' }, PAST_DUE: { bg: 'var(--amber)', color: 'var(--on-amber)' }, CANCELED: { bg: '#6B7280' }, NONE: { bg: 'var(--chip-bg)', color: 'var(--text)' },
};
export const SubscriptionBadge = ({ status }: { status: SubscriptionRow['status'] }) => (
  <span className="pill" style={{ backgroundColor: TONE[status].bg, color: TONE[status].color }}>{SUBSCRIPTION_LABEL[status]}</span>
);

type EditForm = { planId: string; status: string; interval: BillingInterval; price: string; reason: string; trialDays: string; startedOn: string; currentPeriodEnd: string; notes: string };

/**
 * Billing → School Subscriptions: each school's plan, price, status and
 * how full the plan is; requests schools have made; and recurring
 * revenue. A trial can be put on any plan. Changing a subscription
 * never switches a school's drop-off, pickup or attendance on or off.
 */
export function SubscriptionsScreen() {
  const { token, can } = useAuth();
  const canEdit = can('billing:update');
  const [filters, setFilters] = useState({ status: '', planId: '', renewsBefore: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<SubscriptionRow> | null>(null);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [requests, setRequests] = useState<PlatformSubscriptionRequest[]>([]);
  const [editing, setEditing] = useState<SubscriptionRow | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    if (!token) return;
    api.subscriptions(token, { status: filters.status || undefined, planId: filters.planId || undefined, renewsBefore: filters.renewsBefore || undefined, page }).then(setData).catch(err => setMessage(err.message));
    api.billingSummary(token).then(setSummary).catch(() => {});
    api.subscriptionRequests(token).then(setRequests).catch(() => {});
  }, [token, filters, page]);
  useEffect(load, [load]);
  useEffect(() => { if (token) api.billingPlans(token).then(setPlans).catch(() => {}); }, [token]);

  const edit = (row: SubscriptionRow) => {
    setEditing(row);
    setForm({
      planId: row.planId ?? plans.find(p => p.active)?.id ?? '', status: row.status === 'NONE' ? 'TRIALING' : row.status, interval: row.interval ?? 'MONTH',
      price: row.agreedPrice && row.priceCents !== null ? (row.priceCents / 100).toFixed(2) : '', reason: '', trialDays: '',
      startedOn: row.startedOn ?? '', currentPeriodEnd: row.status === 'TRIALING' ? '' : row.currentPeriodEnd ?? '', notes: row.notes ?? '',
    });
  };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !editing || !form) return;
    const priceCents = form.price.trim() ? parseMoney(form.price) : undefined;
    if (priceCents === null) { setMessage('Enter the price like 49.00, or leave it empty to use the plan\'s price.'); return; }
    try {
      await api.setSubscription(token, editing.schoolId, {
        planId: form.planId, status: form.status, interval: form.interval, priceCents, reason: form.reason.trim() || undefined,
        trialDays: form.status === 'TRIALING' && form.trialDays ? Number(form.trialDays) : undefined,
        startedOn: form.startedOn || undefined, currentPeriodEnd: form.currentPeriodEnd || undefined, notes: form.notes || undefined,
      });
      setMessage(`${editing.schoolName}'s subscription saved.`);
      setEditing(null);
      setForm(null);
      load();
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Could not save'); }
  };

  const resolve = async (request: PlatformSubscriptionRequest, approve: boolean) => {
    if (!token) return;
    let note: string | undefined;
    let priceCents: number | undefined;
    if (!approve) {
      note = window.prompt(`Why is ${request.schoolName}'s request declined? The school sees this.`)?.trim();
      if (!note) return;
    } else if (request.type === 'CHANGE_PLAN' && request.customPricing) {
      const typed = window.prompt(`${request.planName} has custom pricing. What price was agreed with ${request.schoolName}, per ${request.interval === 'YEAR' ? 'year' : 'month'}?`);
      if (typed === null) return;
      const parsed = parseMoney(typed);
      if (parsed === null) { setMessage('Enter the agreed price like 450.00.'); return; }
      priceCents = parsed;
    } else if (!window.confirm(request.type === 'CANCEL'
      ? `Cancel ${request.schoolName}'s subscription at the end of its paid period?`
      : `Move ${request.schoolName} to ${request.planName} at ${priceLabel(request.priceCents, request.interval)}?`)) return;
    try {
      await api.resolveSubscriptionRequest(token, request.id, { approve, note, priceCents });
      setMessage(approve ? `${request.schoolName}'s request was approved.` : `${request.schoolName}'s request was declined.`);
      load();
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Could not save'); }
  };

  const selectedPlan = form ? plans.find(p => p.id === form.planId) : undefined;

  return (
    <Screen title="School Subscriptions" subtitle="Each school's plan, price and student count. Changing a subscription doesn't switch a school's service on or off.">
      {summary && (
        <div className="tile-grid tile-grid-wide">
          <SummaryTile label="Monthly recurring revenue" value={formatMoney(summary.monthlyRecurringCents)} accentColor="var(--green)" />
          <SummaryTile label="Annual recurring revenue" value={formatMoney(summary.annualRecurringCents)} />
          <SummaryTile label="Active" value={summary.subscriptions.ACTIVE ?? 0} />
          <SummaryTile label="On trial" value={summary.subscriptions.TRIALING ?? 0} />
          <SummaryTile label="Past due" value={summary.subscriptions.PAST_DUE ?? 0} accentColor={summary.subscriptions.PAST_DUE ? 'var(--red)' : undefined} />
          <SummaryTile label="Canceled" value={summary.subscriptions.CANCELED ?? 0} />
        </div>
      )}
      {message && <div className="card" role="status">{message}</div>}

      {requests.length > 0 && (
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 className="form-title" style={{ margin: 0, fontSize: 15 }}>Requests from schools ({requests.length})</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>School</th><th>Now</th><th>Asking for</th><th>Students</th><th>Note</th><th /></tr></thead>
              <tbody>
                {requests.map(request => (
                  <tr key={request.id}>
                    <td><Link to={`/platform/schools/${request.schoolId}`}>{request.schoolName}</Link><div className="field-label" style={{ margin: 0 }}>{request.requestedBy}</div></td>
                    <td>{request.currentPlanName ?? 'No plan'}</td>
                    <td>{request.type === 'CANCEL' ? 'Cancel the subscription' : <>{request.planName}<div className="field-label" style={{ margin: 0 }}>{request.customPricing ? 'Custom price' : priceLabel(request.priceCents, request.interval)}</div></>}</td>
                    <td>{request.students}</td>
                    <td>{request.note ?? '—'}</td>
                    <td className="actions-cell">
                      {canEdit && <button type="button" className="btn btn-primary btn-sm" onClick={() => resolve(request, true)}>Approve</button>}
                      {canEdit && <button type="button" className="btn btn-secondary btn-sm" onClick={() => resolve(request, false)}>Decline</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="action-row">
        <label className="field-label" style={{ margin: 0 }}>Status
          <select className="input" value={filters.status} onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}>
            <option value="">All</option>
            {Object.entries(SUBSCRIPTION_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <label className="field-label" style={{ margin: 0 }}>Plan
          <select className="input" value={filters.planId} onChange={e => { setFilters(f => ({ ...f, planId: e.target.value })); setPage(1); }}>
            <option value="">All plans</option>
            {plans.map(plan => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
          </select>
        </label>
        <label className="field-label" style={{ margin: 0 }}>Renews or ends by
          <input className="input" type="date" value={filters.renewsBefore} onChange={e => { setFilters(f => ({ ...f, renewsBefore: e.target.value })); setPage(1); }} />
        </label>
      </div>

      {editing && form && (
        <form className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 620 }} onSubmit={save}>
          <p className="form-title" style={{ margin: 0 }}>{editing.schoolName}</p>
          <p className="field-label" style={{ margin: 0 }}>{editing.students} active students.</p>
          <div className="action-row">
            <label className="field-label" style={{ margin: 0 }}>Plan
              <select className="input" value={form.planId} onChange={e => setForm({ ...form, planId: e.target.value })}>
                <option value="">Choose…</option>
                {plans.filter(p => p.active || p.id === editing.planId).map(p => <option key={p.id} value={p.id}>{p.name} ({limitLabel(p.studentLimit).toLowerCase()})</option>)}
              </select>
            </label>
            <label className="field-label" style={{ margin: 0 }}>Billed every
              <select className="input" value={form.interval} onChange={e => setForm({ ...form, interval: e.target.value as BillingInterval })}><option value="MONTH">Month</option><option value="YEAR">Year</option></select>
            </label>
            <label className="field-label" style={{ margin: 0 }}>Status
              <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {(['TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED'] as const).map(s => <option key={s} value={s}>{s === 'TRIALING' ? 'Free trial' : SUBSCRIPTION_LABEL[s]}</option>)}
              </select>
            </label>
          </div>
          {form.status === 'TRIALING' && (
            <label className="field-label" style={{ margin: 0 }}>Trial length in days from today (empty keeps the current end date, or uses the standard length)
              <input className="input" style={{ width: 110 }} inputMode="numeric" placeholder="30" value={form.trialDays} onChange={e => setForm({ ...form, trialDays: e.target.value.replace(/\D/g, '') })} />
            </label>
          )}
          <div className="action-row">
            <label className="field-label" style={{ margin: 0 }}>Agreed price (USD), empty = the plan's price{selectedPlan ? `: ${planPriceLabel(selectedPlan, form.interval)}` : ''}
              <input className="input" style={{ width: 140 }} inputMode="decimal" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
            </label>
            <label className="field-label" style={{ margin: 0, flex: 1 }}>Reason for a different price (discount, contract)
              <input className="input" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
            </label>
          </div>
          <div className="action-row">
            <label className="field-label" style={{ margin: 0 }}>Started<input className="input" type="date" value={form.startedOn} onChange={e => setForm({ ...form, startedOn: e.target.value })} /></label>
            {form.status !== 'TRIALING' && <label className="field-label" style={{ margin: 0 }}>Paid period ends<input className="input" type="date" value={form.currentPeriodEnd} onChange={e => setForm({ ...form, currentPeriodEnd: e.target.value })} /></label>}
          </div>
          <label className="field-label" style={{ margin: 0 }}>Notes<textarea className="textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></label>
          <div className="action-row"><button type="submit" className="btn btn-primary">Save</button><button type="button" className="btn btn-secondary" onClick={() => { setEditing(null); setForm(null); }}>Cancel</button></div>
        </form>
      )}

      {!data ? <p className="empty-text">Loading…</p> : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>School</th><th>Plan</th><th>Status</th><th>Renews or ends</th><th>Students</th><th /></tr></thead>
              <tbody>
                {data.items.map(row => (
                  <tr key={row.schoolId}>
                    <td><Link to={`/platform/schools/${row.schoolId}`}>{row.schoolName}</Link></td>
                    <td>{row.planName ?? '—'}{row.planName && <div className="field-label" style={{ margin: 0 }}>{priceLabel(row.priceCents, row.interval)}{row.paidOnline ? ' · by card' : row.agreedPrice ? ' (agreed)' : ''}</div>}</td>
                    <td><SubscriptionBadge status={row.status} />{row.cancelAtPeriodEnd && <div className="field-label" style={{ margin: 0 }}>Cancels at period end</div>}</td>
                    <td>{row.status === 'TRIALING' ? (row.trialEndsOn ? `Trial ends ${row.trialEndsOn}` : '—') : row.currentPeriodEnd ?? '—'}</td>
                    <td>{row.students.toLocaleString('en-US')}{row.studentLimit !== null && ` of ${row.studentLimit.toLocaleString('en-US')}`}</td>
                    <td>{row.paidOnline ? <span className="field-label" style={{ margin: 0 }}>Managed in Stripe</span> : canEdit && <button type="button" className="btn btn-secondary btn-sm" onClick={() => edit(row)}>{row.status === 'NONE' ? 'Set plan' : 'Change'}</button>}</td>
                  </tr>
                ))}
                {data.items.length === 0 && <tr><td colSpan={6} className="empty-text">No schools match.</td></tr>}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
        </>
      )}
    </Screen>
  );
}
