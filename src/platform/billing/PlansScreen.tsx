import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { api, type BillingPlan, type BillingSettings, type PlanHistoryEntry } from '../../services/api';
import { parseMoney } from '../../utils/money';
import { limitLabel, planPriceLabel } from '../../utils/plans';
import { formatUtcTimestamp } from '../../utils/utcTime';

type PlanForm = { id: string | null; name: string; description: string; studentLimit: string; monthly: string; annual: string; customPricing: boolean };
const emptyForm: PlanForm = { id: null, name: '', description: '', studentLimit: '', monthly: '', annual: '', customPricing: false };
const dollars = (cents: number | null) => (cents === null ? '' : (cents / 100).toFixed(2));

/**
 * Billing → Plans. A plan sets how many active students a school may
 * have and what it costs per month or per year; every plan includes
 * every feature. Changing a limit or price is kept in the plan's
 * history and applies to schools that subscribe afterwards: a school
 * already on the plan keeps the price it agreed.
 */
export function PlansScreen() {
  const { token, can } = useAuth();
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [settings, setSettings] = useState<BillingSettings | null>(null);
  const [form, setForm] = useState<PlanForm | null>(null);
  const [history, setHistory] = useState<{ plan: BillingPlan; entries: PlanHistoryEntry[] } | null>(null);
  const [message, setMessage] = useState('');
  const canEdit = can('billing:update');

  const load = useCallback(() => {
    if (!token) return;
    api.billingPlans(token).then(setPlans).catch(err => setMessage(err.message));
    api.billingSettings(token).then(setSettings).catch(() => {});
  }, [token]);
  useEffect(load, [load]);

  const edit = (plan: BillingPlan) => setForm({
    id: plan.id, name: plan.name, description: plan.description ?? '', studentLimit: plan.studentLimit?.toString() ?? '',
    monthly: dollars(plan.monthlyPriceCents), annual: dollars(plan.annualPriceCents), customPricing: plan.customPricing,
  });

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !form) return;
    const studentLimit = form.studentLimit.trim() ? Number(form.studentLimit) : null;
    const monthlyPriceCents = form.customPricing ? null : parseMoney(form.monthly);
    const annualPriceCents = form.customPricing ? null : parseMoney(form.annual);
    if (!form.name.trim()) { setMessage('Give the plan a name.'); return; }
    if (studentLimit !== null && (!Number.isInteger(studentLimit) || studentLimit < 1)) { setMessage('The student limit is a whole number, or empty for no limit.'); return; }
    if (!form.customPricing && (monthlyPriceCents === null || annualPriceCents === null)) { setMessage('Enter a monthly and an annual price like 49.00, or tick custom pricing.'); return; }
    const input = { name: form.name.trim(), description: form.description.trim(), studentLimit, monthlyPriceCents, annualPriceCents, customPricing: form.customPricing };
    try {
      if (form.id) await api.updatePlan(token, form.id, input); else await api.createPlan(token, input);
      setMessage(form.id ? `${input.name} saved. Schools already on it keep the price they agreed.` : `${input.name} created.`);
      setForm(null);
      load();
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Could not save the plan'); }
  };
  const setActive = async (plan: BillingPlan, active: boolean) => {
    if (!token) return;
    try { await api.updatePlan(token, plan.id, { active }); load(); } catch (err) { setMessage(err instanceof Error ? err.message : 'Could not save'); }
  };
  const showHistory = async (plan: BillingPlan) => {
    if (!token) return;
    try { setHistory({ plan, entries: await api.planHistory(token, plan.id) }); } catch (err) { setMessage(err instanceof Error ? err.message : 'Could not load the history'); }
  };
  const saveSettings = async (change: Partial<BillingSettings>) => {
    if (!token) return;
    try { await api.saveBillingSettings(token, change); setMessage('Settings saved.'); load(); } catch (err) { setMessage(err instanceof Error ? err.message : 'Could not save the settings'); }
  };

  return (
    <Screen title="Plans" subtitle="Each plan sets a student limit and a price. Every plan includes every feature.">
      {message && <div className="card" role="status">{message}</div>}
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Plan</th><th>Students</th><th>Monthly</th><th>Annual</th><th>Schools</th><th>Status</th><th /></tr></thead>
          <tbody>
            {plans.map(plan => (
              <tr key={plan.id}>
                <td><strong>{plan.name}</strong>{plan.description && <div className="field-label" style={{ margin: 0 }}>{plan.description}</div>}</td>
                <td>{limitLabel(plan.studentLimit)}</td>
                <td>{planPriceLabel(plan, 'MONTH', plan.currency)}</td>
                <td>{planPriceLabel(plan, 'YEAR', plan.currency)}</td>
                <td>{plan.schools}</td>
                <td>{plan.active ? 'Available' : 'Retired'}</td>
                <td className="actions-cell">
                  {canEdit && <button type="button" className="btn btn-secondary btn-sm" onClick={() => edit(plan)}>Edit</button>}
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => showHistory(plan)}>History</button>
                  {canEdit && <button type="button" className="btn btn-secondary btn-sm" onClick={() => setActive(plan, !plan.active)}>{plan.active ? 'Retire' : 'Make available'}</button>}
                </td>
              </tr>
            ))}
            {plans.length === 0 && <tr><td colSpan={7} className="empty-text">No plans yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="field-label" style={{ margin: 0 }}>A retired plan can't be chosen any more; schools already on it stay on it.</p>

      {history && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p className="form-title" style={{ margin: 0 }}>{history.plan.name}: limit and price history</p>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>When</th><th>Students</th><th>Monthly</th><th>Annual</th><th>Changed by</th></tr></thead>
              <tbody>
                {history.entries.map((entry, index) => (
                  <tr key={index}>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatUtcTimestamp(entry.at)}</td>
                    <td>{limitLabel(entry.studentLimit)}</td>
                    <td>{planPriceLabel(entry, 'MONTH')}</td>
                    <td>{planPriceLabel(entry, 'YEAR')}</td>
                    <td>{entry.changedBy ?? '—'}</td>
                  </tr>
                ))}
                {history.entries.length === 0 && <tr><td colSpan={5} className="empty-text">No changes recorded since this plan was set up.</td></tr>}
              </tbody>
            </table>
          </div>
          <div><button type="button" className="btn btn-secondary btn-sm" onClick={() => setHistory(null)}>Close</button></div>
        </div>
      )}

      {canEdit && !form && <div><button type="button" className="btn btn-primary" onClick={() => setForm(emptyForm)}>New plan</button></div>}
      {canEdit && form && (
        <form className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 560 }} onSubmit={save}>
          <p className="form-title" style={{ margin: 0 }}>{form.id ? `Edit ${form.name}` : 'New plan'}</p>
          <label className="field-label" style={{ margin: 0 }}>Name<input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
          <label className="field-label" style={{ margin: 0 }}>Description (optional)<input className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
          <label className="field-label" style={{ margin: 0 }}>Student limit (empty = no limit)
            <input className="input" style={{ width: 160 }} inputMode="numeric" placeholder="150" value={form.studentLimit} onChange={e => setForm({ ...form, studentLimit: e.target.value.replace(/\D/g, '') })} />
          </label>
          <label className="field-label" style={{ margin: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={form.customPricing} onChange={e => setForm({ ...form, customPricing: e.target.checked })} />
            Custom pricing (the price is agreed with each school, as for Enterprise)
          </label>
          {!form.customPricing && (
            <div className="action-row">
              <label className="field-label" style={{ margin: 0 }}>Monthly price (USD)<input className="input" style={{ width: 130 }} inputMode="decimal" placeholder="49.00" value={form.monthly} onChange={e => setForm({ ...form, monthly: e.target.value })} /></label>
              <label className="field-label" style={{ margin: 0 }}>Annual price (USD)<input className="input" style={{ width: 130 }} inputMode="decimal" placeholder="490.00" value={form.annual} onChange={e => setForm({ ...form, annual: e.target.value })} /></label>
            </div>
          )}
          <div className="action-row">
            <button type="submit" className="btn btn-primary">{form.id ? 'Save plan' : 'Create plan'}</button>
            <button type="button" className="btn btn-secondary" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      )}

      {settings && <TrialSettings settings={settings} plans={plans.filter(plan => plan.active)} canEdit={canEdit} onSave={saveSettings} />}
    </Screen>
  );
}

/** How long a new school's free trial is, which plan it is on, and the grace period. */
function TrialSettings({ settings, plans, canEdit, onSave }: { settings: BillingSettings; plans: BillingPlan[]; canEdit: boolean; onSave: (change: Partial<BillingSettings>) => void }) {
  const [trialDays, setTrialDays] = useState(String(settings.trialDays));
  const [graceDays, setGraceDays] = useState(String(settings.graceDays));
  const [trialPlanId, setTrialPlanId] = useState(settings.trialPlanId);
  useEffect(() => { setTrialDays(String(settings.trialDays)); setGraceDays(String(settings.graceDays)); setTrialPlanId(settings.trialPlanId); }, [settings]);
  return (
    <form className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 560 }} onSubmit={e => { e.preventDefault(); onSave({ trialDays: Number(trialDays), graceDays: Number(graceDays), trialPlanId }); }}>
      <p className="form-title" style={{ margin: 0 }}>Free trial and grace period</p>
      <p className="field-label" style={{ margin: 0 }}>A new school starts a free trial with every feature and no card. You can also put any school on a trial of any plan from School Subscriptions.</p>
      <div className="action-row">
        <label className="field-label" style={{ margin: 0 }}>Trial length (days)<input className="input" style={{ width: 110 }} inputMode="numeric" disabled={!canEdit} value={trialDays} onChange={e => setTrialDays(e.target.value.replace(/\D/g, ''))} /></label>
        <label className="field-label" style={{ margin: 0 }}>Trial plan
          <select className="input" disabled={!canEdit} value={trialPlanId} onChange={e => setTrialPlanId(e.target.value)}>
            {plans.map(plan => <option key={plan.id} value={plan.id}>{plan.name} ({limitLabel(plan.studentLimit).toLowerCase()})</option>)}
          </select>
        </label>
        <label className="field-label" style={{ margin: 0 }}>Grace period (days)<input className="input" style={{ width: 110 }} inputMode="numeric" disabled={!canEdit} value={graceDays} onChange={e => setGraceDays(e.target.value.replace(/\D/g, ''))} /></label>
      </div>
      {canEdit && <div><button type="submit" className="btn btn-primary">Save settings</button></div>}
    </form>
  );
}
