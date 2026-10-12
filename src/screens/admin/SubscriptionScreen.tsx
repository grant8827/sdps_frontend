import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { api, type BillingInterval, type SchoolPlanOption, type SchoolSubscriptionView } from '../../services/api';
import { formatMoney } from '../../utils/money';
import { limitLabel, planPriceLabel, priceLabel } from '../../utils/plans';
import { formatUtcTimestamp } from '../../utils/utcTime';

const STATUS_LABEL = { TRIALING: 'Free trial', ACTIVE: 'Active', PAST_DUE: 'Payment overdue', CANCELED: 'Canceled' } as const;
const REQUEST_STATUS = { OPEN: 'Waiting for approval', APPROVED: 'Approved', DECLINED: 'Declined', WITHDRAWN: 'Withdrawn' } as const;
const INVOICE_STATUS = { DRAFT: 'Draft', OPEN: 'Unpaid', PAID: 'Paid', VOID: 'Cancelled' } as const;

/** How full the plan is, in words and color. */
function capacityNote(data: SchoolSubscriptionView): { text: string; color: string } | null {
  if (data.studentLimit === null) return null;
  if (data.level === 'FULL') return { text: "Your plan is full. You can keep using everything, but new students can't be added until you choose a larger plan or remove students who have left.", color: 'var(--red)' };
  if (data.level === 'CLOSE') return { text: `Your plan is ${data.percentUsed}% full: ${data.remaining} more ${data.remaining === 1 ? 'student fits' : 'students fit'}.`, color: 'var(--amber)' };
  if (data.level === 'NEAR') return { text: `Your plan is ${data.percentUsed}% full: ${data.remaining} more students fit.`, color: 'var(--amber)' };
  return null;
}

/**
 * Admin → Subscription: the school's plan and price, how many active
 * students it covers and how many the school has, the trial or renewal
 * date, invoices, and asking for a different plan, monthly or annual
 * billing, or to cancel. Every plan includes every feature; a plan only
 * sets how many active students the school can have.
 */
export function SubscriptionScreen() {
  const { token } = useAuth();
  const [data, setData] = useState<SchoolSubscriptionView | null>(null);
  const [interval, setBillingInterval] = useState<BillingInterval>('MONTH');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [params, setParams] = useSearchParams();

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const next = await api.mySubscription(token);
      setData(next);
      setBillingInterval(current => (next.subscription && next.subscription.status !== 'TRIALING' ? next.subscription.interval : current));
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Could not load your subscription'); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  // Back from Stripe's payment page. Stripe tells our server about the
  // payment a moment later, so the page is refreshed a few times.
  useEffect(() => {
    const outcome = params.get('checkout');
    if (!outcome) return;
    setParams({}, { replace: true });
    if (outcome !== 'success') { setMessage('Payment was not completed, so nothing has changed.'); return; }
    setMessage('Thank you. Your payment is being confirmed; this page will update in a moment.');
    const timers = [2000, 5000, 10000].map(delay => setTimeout(load, delay));
    return () => timers.forEach(clearTimeout);
    // Only when the page first opens with ?checkout=…
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async (action: () => Promise<string>) => {
    setBusy(true);
    setMessage('');
    try { setMessage(await action()); await load(); } catch (err) { setMessage(err instanceof Error ? err.message : 'Something went wrong'); } finally { setBusy(false); }
  };

  // With card payment on: pay on Stripe's page, or (already paying by
  // card) switch plan straight away. Otherwise, and for custom-priced
  // plans, it is a request our team confirms.
  const payByCard = (plan: SchoolPlanOption) => {
    if (!token || !data) return;
    const price = planPriceLabel(plan, interval, plan.currency);
    const question = data.paidOnline
      ? `Move your school to ${plan.name} (${limitLabel(plan.studentLimit).toLowerCase()}) at ${price}?\n\nThe change is immediate. The difference for the rest of this billing period is added to, or taken off, your next bill.`
      : `Subscribe your school to ${plan.name} (${limitLabel(plan.studentLimit).toLowerCase()}) at ${price}?\n\nYou'll enter your card on our payment provider's secure page.${data.subscription?.status === 'TRIALING' && !data.subscription.trialEnded ? ` Your free trial continues until ${data.subscription.trialEndsOn}; the first charge is on that day.` : ''}`;
    if (!window.confirm(question)) return;
    run(async () => {
      const result = await api.subscriptionCheckout(token, { planId: plan.id, interval, confirm: true });
      if (result.url) { window.location.assign(result.url); return 'Taking you to the payment page…'; }
      return `Your school is now on ${plan.name}.`;
    });
  };
  const cancelCard = () => {
    if (!token) return;
    if (!window.confirm("Cancel your school's subscription?\n\nIt stays active until the end of the period you have paid for, and you can undo this before then.")) return;
    run(async () => { await api.cancelPaidSubscription(token, { confirm: true }); return 'Your subscription will end at the end of the paid period.'; });
  };
  const undoCancel = () => {
    if (!token) return;
    run(async () => { await api.cancelPaidSubscription(token, { resume: true }); return 'Your subscription will continue.'; });
  };
  const openPortal = () => {
    if (!token) return;
    run(async () => { window.location.assign((await api.billingPortal(token)).url); return 'Opening your card and receipts…'; });
  };

  const choose = (plan: SchoolPlanOption) => {
    if (!token) return;
    if (data?.onlinePayment && !plan.customPricing) { payByCard(plan); return; }
    const price = plan.customPricing ? 'a price we will agree with you' : planPriceLabel(plan, interval, plan.currency);
    if (!window.confirm(`Ask to move your school to ${plan.name} (${limitLabel(plan.studentLimit).toLowerCase()}) at ${price}?\n\nThis changes what your school is billed. Nothing changes until our team confirms it.`)) return;
    run(async () => { await api.requestSubscriptionChange(token, { type: 'CHANGE_PLAN', planId: plan.id, interval, confirm: true }); return `We received your request for ${plan.name}. We'll confirm it shortly.`; });
  };
  const cancel = () => {
    if (!token) return;
    if (data?.paidOnline) { cancelCard(); return; }
    if (!window.confirm("Ask to cancel your school's subscription?\n\nIt stays active until the end of the period you have paid for. Nothing changes until our team confirms it.")) return;
    run(async () => { await api.requestSubscriptionChange(token, { type: 'CANCEL', confirm: true }); return "We received your cancellation request. We'll confirm it shortly."; });
  };
  const withdraw = (requestId: string) => {
    if (!token) return;
    run(async () => { await api.withdrawSubscriptionRequest(token, requestId); return 'Request withdrawn.'; });
  };

  if (!data) return <Screen title="Subscription" subtitle="Your school's plan and billing.">{message ? <div className="card" role="alert">{message}</div> : <p className="empty-text">Loading…</p>}</Screen>;

  const sub = data.subscription;
  const note = capacityNote(data);
  const sameChoice = (plan: SchoolPlanOption) => plan.current && sub?.status !== 'TRIALING' && sub?.status !== 'CANCELED' && sub?.interval === interval;

  return (
    <Screen title="Subscription" subtitle="Your school's plan and billing. Every plan includes every feature.">
      {message && <div className="card" role="status">{message}</div>}

      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sub ? (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'baseline', justifyContent: 'space-between' }}>
              <h2 className="form-title" style={{ margin: 0 }}>{sub.planName}</h2>
              <span className="pill" style={{ backgroundColor: sub.status === 'ACTIVE' ? 'var(--green)' : sub.status === 'TRIALING' ? 'var(--blue)' : sub.status === 'PAST_DUE' ? 'var(--red)' : '#6B7280' }}>{STATUS_LABEL[sub.status]}</span>
            </div>
            <div style={{ fontSize: 14 }}>
              {sub.status === 'TRIALING'
                ? sub.trialEnded
                  ? 'Your free trial has ended. Choose a plan below to continue.'
                  : data.paidOnline
                    ? `Free trial until ${sub.trialEndsOn} (${sub.trialDaysLeft} ${sub.trialDaysLeft === 1 ? 'day' : 'days'} left). Then ${priceLabel(sub.priceCents, sub.interval, sub.currency)}, charged to your card.`
                    : `Free trial with every feature: ${sub.trialDaysLeft} ${sub.trialDaysLeft === 1 ? 'day' : 'days'} left (ends ${sub.trialEndsOn}). No card needed.`
                : <>{priceLabel(sub.priceCents, sub.interval, sub.currency)}{sub.currentPeriodEnd && ` · ${sub.cancelAtPeriodEnd || sub.status === 'CANCELED' ? 'ends' : 'renews'} ${sub.currentPeriodEnd}`}</>}
            </div>
            {sub.cancelAtPeriodEnd && (
              <div className="field-label" style={{ margin: 0 }}>
                Your subscription is set to end on {sub.currentPeriodEnd}.{' '}
                {data.paidOnline && <button type="button" className="link-button" disabled={busy} onClick={undoCancel}>Keep my subscription</button>}
              </div>
            )}
            {sub.status === 'PAST_DUE' && <div style={{ fontSize: 14, borderLeft: '4px solid var(--red)', paddingLeft: 10 }}>A payment didn't go through. Drop-off, pickup and attendance keep working. {data.paidOnline ? 'Please update the card on file.' : 'Please contact us to settle the invoice.'}</div>}
            {data.lapsed && <div style={{ fontSize: 14, borderLeft: '4px solid var(--red)', paddingLeft: 10 }}>New students can't be added until your school is on a plan. Everything else, including drop-off, pickup and attendance, keeps working.</div>}
            {data.paidOnline && <div><button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={openPortal}>Card on file and receipts</button></div>}
          </>
        ) : (
          <div style={{ fontSize: 14 }}>Your school isn't on a plan yet, so there is no student limit. Choose one below when you're ready.</div>
        )}

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 6 }}>
            <strong>{data.activeStudents.toLocaleString('en-US')} active {data.activeStudents === 1 ? 'student' : 'students'}</strong>
            <span>{data.studentLimit === null ? 'No limit' : `${data.remaining?.toLocaleString('en-US')} of ${data.studentLimit.toLocaleString('en-US')} places left`}</span>
          </div>
          {data.studentLimit !== null && (
            <div className="capacity-bar" role="progressbar" aria-valuemin={0} aria-valuemax={data.studentLimit} aria-valuenow={data.activeStudents} aria-label="Students on your plan">
              <div className="capacity-bar-fill" style={{ width: `${Math.min(100, data.percentUsed ?? 0)}%`, background: data.level === 'FULL' ? 'var(--red)' : data.level === 'OK' ? 'var(--green)' : 'var(--amber)' }} />
            </div>
          )}
          {note && <p style={{ margin: '8px 0 0', fontSize: 14, borderLeft: `4px solid ${note.color}`, paddingLeft: 10 }}>{note.text}</p>}
          <p className="field-label" style={{ margin: '8px 0 0' }}>Only active students count. Suspended and removed students, parents, teachers and staff do not.</p>
        </div>
      </section>

      {data.openRequest && (
        <section className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14 }}>
            <strong>Waiting for approval:</strong>{' '}
            {data.openRequest.type === 'CANCEL' ? 'cancel the subscription' : `move to ${data.openRequest.planName}, billed every ${data.openRequest.interval === 'YEAR' ? 'year' : 'month'}`}.
            <div className="field-label" style={{ margin: 0 }}>Asked by {data.openRequest.requestedBy} on {formatUtcTimestamp(data.openRequest.createdAt)}. Nothing changes until our team confirms it.</div>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => withdraw(data.openRequest!.id)}>Withdraw request</button>
        </section>
      )}

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 className="form-title" style={{ margin: 0, fontSize: 16 }}>Plans</h2>
          <div className="subtabs" role="tablist" aria-label="Billing">
            {(['MONTH', 'YEAR'] as const).map(option => (
              <button key={option} type="button" role="tab" aria-selected={interval === option} className={`subtab${interval === option ? ' subtab-active' : ''}`} onClick={() => setBillingInterval(option)}>
                {option === 'MONTH' ? 'Monthly' : 'Annual (2 months free)'}
              </button>
            ))}
          </div>
        </div>
        <div className="plan-grid">
          {data.plans.map(plan => (
            <div key={plan.id} className={`card plan-card${plan.current ? ' plan-card-current' : ''}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                <strong style={{ fontSize: 16 }}>{plan.name}</strong>
                {plan.current ? <span className="pill" style={{ backgroundColor: 'var(--blue)' }}>Your plan</span> : plan.recommended ? <span className="pill" style={{ backgroundColor: 'var(--green)' }}>Recommended</span> : null}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{planPriceLabel(plan, interval, plan.currency)}</div>
              <div style={{ fontSize: 14 }}>{limitLabel(plan.studentLimit)}</div>
              <div className="field-label" style={{ margin: 0 }}>{plan.customPricing ? "We'll agree a price with you." : 'Every feature included.'}</div>
              <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 'auto' }} disabled={busy || plan.tooSmall || sameChoice(plan) || (Boolean(data.openRequest) && (!data.onlinePayment || plan.customPricing))} onClick={() => choose(plan)}>
                {plan.tooSmall ? `Too small for ${data.activeStudents} students` : sameChoice(plan) ? 'Current plan' : plan.current && sub?.status !== 'TRIALING' && sub?.status !== 'CANCELED' ? `Switch to ${interval === 'YEAR' ? 'annual' : 'monthly'}` : plan.customPricing ? 'Ask about this plan' : data.paidOnline ? 'Switch to this plan' : data.onlinePayment ? 'Pay by card' : 'Choose this plan'}
              </button>
            </div>
          ))}
        </div>
        <p className="field-label" style={{ margin: 0 }}>
          {data.onlinePayment
            ? "Card payments are taken on our payment provider's secure page; we never see or store your card number. Custom-priced plans are arranged with our team."
            : 'Choosing a plan sends a request; our team confirms it before anything is billed.'}
          {data.openRequest && ' You have a request waiting, so another can\'t be made until it is answered or withdrawn.'}
        </p>
        {sub && sub.status !== 'CANCELED' && !sub.cancelAtPeriodEnd && (
          <div><button type="button" className="link-button" disabled={busy || (Boolean(data.openRequest) && !data.paidOnline)} onClick={cancel}>Cancel subscription</button></div>
        )}
      </section>

      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 className="form-title" style={{ margin: 0, fontSize: 15 }}>Invoices and payments</h2>
        {data.invoices.length === 0 ? <p className="empty-text">No invoices yet.</p> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Invoice</th><th>Amount</th><th>Paid</th><th>Due</th><th>Status</th></tr></thead>
              <tbody>
                {data.invoices.map(invoice => (
                  <tr key={invoice.id}>
                    <td>{invoice.hostedUrl ? <a href={invoice.hostedUrl} target="_blank" rel="noopener noreferrer">{invoice.number}</a> : invoice.number}<div className="field-label" style={{ margin: 0 }}>{invoice.description}</div></td>
                    <td>{formatMoney(invoice.amountCents, invoice.currency)}</td>
                    <td>{formatMoney(invoice.paidCents, invoice.currency)}{invoice.paidAt && <div className="field-label" style={{ margin: 0 }}>{formatUtcTimestamp(invoice.paidAt)}</div>}</td>
                    <td>{invoice.dueOn ?? '—'}</td>
                    <td>{invoice.overdue ? 'Overdue' : INVOICE_STATUS[invoice.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {data.requests.some(request => request.status !== 'OPEN') && (
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 className="form-title" style={{ margin: 0, fontSize: 15 }}>Earlier requests</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Asked</th><th>For</th><th>Outcome</th></tr></thead>
              <tbody>
                {data.requests.filter(request => request.status !== 'OPEN').map(request => (
                  <tr key={request.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatUtcTimestamp(request.createdAt)}</td>
                    <td>{request.type === 'CANCEL' ? 'Cancel the subscription' : `${request.planName}, every ${request.interval === 'YEAR' ? 'year' : 'month'}`}</td>
                    <td>{REQUEST_STATUS[request.status]}{request.resolutionNote && <div className="field-label" style={{ margin: 0 }}>{request.resolutionNote}</div>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {data.enrollmentHistory.length > 0 && (
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 className="form-title" style={{ margin: 0, fontSize: 15 }}>Enrollment changes</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>When</th><th>Active students</th><th>What changed</th></tr></thead>
              <tbody>
                {data.enrollmentHistory.map((entry, index) => (
                  <tr key={index}><td style={{ whiteSpace: 'nowrap' }}>{formatUtcTimestamp(entry.at)}</td><td>{entry.activeStudents.toLocaleString('en-US')}</td><td>{entry.reason ?? '—'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </Screen>
  );
}
