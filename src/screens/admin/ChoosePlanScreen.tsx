import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { api, type BillingInterval, type SchoolPlanOption, type SchoolSubscriptionView } from '../../services/api';
import { limitLabel, planPriceLabel } from '../../utils/plans';
import { chosenPlan, clearChosenPlan, clearJustRegistered } from '../../utils/onboarding';

/**
 * The step between registering a school and its dashboard: choose a
 * plan, then either start the free trial on it (no card) or subscribe
 * now and pay by card on our payment provider's page. Both end at the
 * dashboard. The plan picked on the public Pricing section is
 * preselected. Every plan includes every feature.
 */
export function ChoosePlanScreen() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<SchoolSubscriptionView | null>(null);
  const [interval, setBillingInterval] = useState<BillingInterval>(() => chosenPlan()?.interval ?? 'MONTH');
  const [selected, setSelected] = useState<string | null>(() => chosenPlan()?.planId ?? null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  // Reaching this page is what "just registered" was for.
  useEffect(() => { clearJustRegistered(); }, []);
  useEffect(() => {
    if (params.get('checkout') === 'cancelled') { setMessage('Payment was not completed, so nothing was charged. You can start the free trial or try again.'); setParams({}, { replace: true }); }
  }, [params, setParams]);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const next = await api.mySubscription(token);
      setData(next);
      setSelected(current => (current && next.plans.some(plan => plan.id === current && !plan.tooSmall) ? current : next.subscription?.planId ?? next.plans[0]?.id ?? null));
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Could not load the plans'); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const toDashboard = () => { clearChosenPlan(); navigate('/admin', { replace: true }); };
  const plan: SchoolPlanOption | undefined = data?.plans.find(candidate => candidate.id === selected);
  const sub = data?.subscription;
  const inTrial = sub?.status === 'TRIALING' && !sub.trialEnded && !data?.paidOnline;

  const startTrial = async () => {
    if (!token || !plan) return;
    setBusy(true);
    setMessage('');
    try {
      await api.chooseTrialPlan(token, plan.id, interval);
      toDashboard();
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Could not start the trial'); setBusy(false); }
  };
  const payNow = async () => {
    if (!token || !plan) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await api.subscriptionCheckout(token, { planId: plan.id, interval, confirm: true, startNow: true, returnTo: 'dashboard' });
      clearChosenPlan();
      if (result.url) window.location.assign(result.url); else toDashboard();
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Could not open the payment page'); setBusy(false); }
  };

  if (!data) return <Screen title="Choose your plan" subtitle="One more step before your dashboard.">{message ? <div className="card" role="alert">{message}</div> : <p className="empty-text">Loading…</p>}</Screen>;

  const canPay = data.onlinePayment && plan && !plan.customPricing && !data.paidOnline;

  return (
    <Screen title="Choose your plan" subtitle="One more step before your dashboard. Every plan includes every feature; pick the size that fits your school.">
      {message && <div className="card" role="status">{message}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div className="subtabs" role="tablist" aria-label="Billing">
          {(['MONTH', 'YEAR'] as const).map(option => (
            <button key={option} type="button" role="tab" aria-selected={interval === option} className={`subtab${interval === option ? ' subtab-active' : ''}`} onClick={() => setBillingInterval(option)}>
              {option === 'MONTH' ? 'Monthly' : 'Annual (2 months free)'}
            </button>
          ))}
        </div>
      </div>

      <div className="plan-grid" role="radiogroup" aria-label="Plan">
        {data.plans.map(option => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={option.id === selected}
            disabled={option.tooSmall || busy}
            className={`card plan-card plan-choice${option.id === selected ? ' plan-card-current' : ''}`}
            onClick={() => setSelected(option.id)}
          >
            <strong style={{ fontSize: 16 }}>{option.name}</strong>
            <span style={{ fontSize: 20, fontWeight: 700 }}>{planPriceLabel(option, interval, option.currency)}</span>
            <span style={{ fontSize: 14 }}>{limitLabel(option.studentLimit)}</span>
            <span className="field-label" style={{ margin: 0 }}>{option.tooSmall ? `Too small for ${data.activeStudents} students` : option.customPricing ? "We'll agree a price with you." : 'Every feature included.'}</span>
          </button>
        ))}
      </div>

      {plan && (
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 className="form-title" style={{ margin: 0, fontSize: 16 }}>{plan.name}: how would you like to start?</h2>
          <div className="plan-grid">
            {inTrial && (
              <div className="plan-start">
                <strong>Free trial</strong>
                <span style={{ fontSize: 14 }}>{sub!.trialDaysLeft} days with every feature. No card needed; nothing is charged. You choose whether to subscribe before {sub!.trialEndsOn}.</span>
                <button type="button" className="btn btn-primary" style={{ marginTop: 'auto' }} disabled={busy} onClick={startTrial}>Start free trial</button>
              </div>
            )}
            {canPay && (
              <div className="plan-start">
                <strong>Subscribe now</strong>
                <span style={{ fontSize: 14 }}>{planPriceLabel(plan, interval, plan.currency)}, starting today. You'll enter your card on our payment provider's secure page; we never see or store your card number.</span>
                <button type="button" className={`btn ${inTrial ? 'btn-secondary' : 'btn-primary'}`} style={{ marginTop: 'auto' }} disabled={busy} onClick={payNow}>Pay by card</button>
              </div>
            )}
          </div>
          {plan.customPricing && <p className="field-label" style={{ margin: 0 }}>{plan.name} is priced for each school. Start the trial and we'll be in touch to agree a price; you can also ask from the Subscription page.</p>}
          {!inTrial && !canPay && <p className="field-label" style={{ margin: 0 }}>You can change your plan any time from the Subscription page.</p>}
        </section>
      )}

      <div><button type="button" className="link-button" disabled={busy} onClick={toDashboard}>Decide later and go to my dashboard</button></div>
    </Screen>
  );
}
