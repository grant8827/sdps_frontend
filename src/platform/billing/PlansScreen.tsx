import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { api, type BillingPlan } from '../../services/api';
import { formatMoney, parseMoney } from '../../utils/money';

const priceLabel = (plan: Pick<BillingPlan, 'priceCents' | 'pricingModel' | 'interval' | 'currency'>) =>
  `${formatMoney(plan.priceCents, plan.currency)}${plan.pricingModel === 'PER_STUDENT' ? ' per student' : ''} / ${plan.interval === 'YEAR' ? 'year' : 'month'}`;

/** Billing → Plans: what schools can be on. A price change applies to invoices created afterwards. */
export function PlansScreen() {
  const { token, can } = useAuth();
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [form, setForm] = useState({ name: '', description: '', price: '', pricingModel: 'PER_STUDENT' as 'FLAT' | 'PER_STUDENT', interval: 'YEAR' as 'MONTH' | 'YEAR' });
  const [editing, setEditing] = useState<{ id: string; price: string } | null>(null);
  const [message, setMessage] = useState('');
  const load = useCallback(() => { if (token) api.billingPlans(token).then(setPlans).catch(err => setMessage(err.message)); }, [token]);
  useEffect(load, [load]);
  const canEdit = can('billing:update');

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const priceCents = parseMoney(form.price);
    if (!form.name.trim() || priceCents === null) { setMessage('Enter a name and a price like 5.00.'); return; }
    try {
      await api.createPlan(token, { name: form.name.trim(), description: form.description.trim() || undefined, pricingModel: form.pricingModel, priceCents, interval: form.interval });
      setForm(f => ({ ...f, name: '', description: '', price: '' }));
      setMessage('Plan created.');
      load();
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Could not create the plan'); }
  };
  const update = async (plan: BillingPlan, change: { priceCents?: number; active?: boolean }) => {
    if (!token) return;
    try { await api.updatePlan(token, plan.id, change); setEditing(null); load(); } catch (err) { setMessage(err instanceof Error ? err.message : 'Could not save'); }
  };

  return (
    <Screen title="Plans" subtitle="What schools can subscribe to. Billing is recorded here; it doesn't depend on a payment company.">
      {message && <div className="card" role="status">{message}</div>}
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Plan</th><th>Price</th><th>Schools</th><th>Status</th><th /></tr></thead>
          <tbody>
            {plans.map(plan => (
              <tr key={plan.id}>
                <td><strong>{plan.name}</strong>{plan.description && <div className="field-label" style={{ margin: 0 }}>{plan.description}</div>}</td>
                <td>
                  {editing?.id === plan.id ? (
                    <span className="action-row">
                      <input className="input" style={{ width: 110 }} aria-label="New price" value={editing.price} onChange={e => setEditing({ id: plan.id, price: e.target.value })} />
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => { const c = parseMoney(editing.price); if (c === null) setMessage('Enter a price like 5.00.'); else update(plan, { priceCents: c }); }}>Save</button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                    </span>
                  ) : priceLabel(plan)}
                </td>
                <td>{plan.schools}</td>
                <td>{plan.active ? 'Available' : 'Retired'}</td>
                <td className="actions-cell">
                  {canEdit && editing?.id !== plan.id && <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing({ id: plan.id, price: (plan.priceCents / 100).toFixed(2) })}>Change price</button>}
                  {canEdit && <button type="button" className="btn btn-secondary btn-sm" onClick={() => update(plan, { active: !plan.active })}>{plan.active ? 'Retire' : 'Make available'}</button>}
                </td>
              </tr>
            ))}
            {plans.length === 0 && <tr><td colSpan={5} className="empty-text">No plans yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {canEdit && (
        <form className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 560 }} onSubmit={create}>
          <p className="form-title" style={{ margin: 0 }}>New plan</p>
          <label className="field-label" style={{ margin: 0 }}>Name<input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></label>
          <label className="field-label" style={{ margin: 0 }}>Description (optional)<input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></label>
          <div className="action-row">
            <label className="field-label" style={{ margin: 0 }}>Price (USD)<input className="input" style={{ width: 120 }} inputMode="decimal" placeholder="5.00" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></label>
            <label className="field-label" style={{ margin: 0 }}>Pricing
              <select className="input" value={form.pricingModel} onChange={e => setForm(f => ({ ...f, pricingModel: e.target.value as typeof f.pricingModel }))}><option value="PER_STUDENT">Per student</option><option value="FLAT">Flat per school</option></select>
            </label>
            <label className="field-label" style={{ margin: 0 }}>Every
              <select className="input" value={form.interval} onChange={e => setForm(f => ({ ...f, interval: e.target.value as typeof f.interval }))}><option value="YEAR">Year</option><option value="MONTH">Month</option></select>
            </label>
          </div>
          <div><button type="submit" className="btn btn-primary">Create plan</button></div>
        </form>
      )}
    </Screen>
  );
}

export { priceLabel };
