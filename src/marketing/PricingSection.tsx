import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type BillingInterval, type PublicPlan } from '../services/api';
import { limitLabel, planPriceLabel } from '../utils/plans';
import { rememberChosenPlan } from '../utils/onboarding';
import { CheckIcon } from './icons';

// Shown straight away, then replaced by the live price list from the
// server (so a price changed in the platform's Plans page shows here).
const STANDARD: PublicPlan[] = [
  { id: 'plan-starter', name: 'Starter', description: null, currency: 'USD', studentLimit: 150, monthlyPriceCents: 4900, annualPriceCents: 49000, customPricing: false },
  { id: 'plan-growth', name: 'Growth', description: null, currency: 'USD', studentLimit: 500, monthlyPriceCents: 9900, annualPriceCents: 99000, customPricing: false },
  { id: 'plan-professional', name: 'Professional', description: null, currency: 'USD', studentLimit: 1000, monthlyPriceCents: 19900, annualPriceCents: 199000, customPricing: false },
  { id: 'plan-enterprise', name: 'Enterprise', description: null, currency: 'USD', studentLimit: null, monthlyPriceCents: null, annualPriceCents: null, customPricing: true },
];
const INCLUDED = ['Parent, teacher and admin dashboards', 'Location check and pickup PIN', 'Attendance, messages and reports', 'Approved-adult pickup and audit log'];

/**
 * The Pricing page (PricingPage). Every plan has every feature; a plan only sets
 * how many students the school can have. Each card leads to
 * registration with that plan remembered for the "choose your plan" step.
 */
export function PricingSection() {
  const [plans, setPlans] = useState<PublicPlan[]>(STANDARD);
  const [trialDays, setTrialDays] = useState(30);
  const [interval, setBillingInterval] = useState<BillingInterval>('MONTH');

  useEffect(() => {
    let cancelled = false;
    api.publicPlans().then(result => { if (!cancelled && result.plans.length > 0) { setPlans(result.plans); setTrialDays(result.trialDays); } }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <section id="pricing" className="home-section home-section-soft">
      <div className="home-section-header">
        <span className="home-eyebrow">Pricing</span>
        <h2 className="section-title">Pay for the size of your school, not for features</h2>
        <p className="home-section-subtitle">Every plan includes everything. Start with a {trialDays}-day free trial, no card needed.</p>
      </div>
      <div className="home-pricing-toggle" role="tablist" aria-label="Billing">
        {(['MONTH', 'YEAR'] as const).map(option => (
          <button key={option} type="button" role="tab" aria-selected={interval === option} className={`subtab${interval === option ? ' subtab-active' : ''}`} onClick={() => setBillingInterval(option)}>
            {option === 'MONTH' ? 'Monthly' : 'Annual (2 months free)'}
          </button>
        ))}
      </div>
      <div className="home-pricing">
        {plans.map(plan => (
          <article key={plan.id} className="home-role home-price-card">
            <h3>{plan.name}</h3>
            <p className="home-price">{planPriceLabel(plan, interval, plan.currency)}</p>
            <p>{limitLabel(plan.studentLimit)}</p>
            <ul>
              {plan.customPricing
                ? <li><CheckIcon size={16} /> A price agreed for your school or district</li>
                : INCLUDED.map(item => <li key={item}><CheckIcon size={16} /> {item}</li>)}
              {plan.customPricing && <li><CheckIcon size={16} /> Everything in the other plans</li>}
            </ul>
            <Link to="/register" className="btn btn-primary" style={{ marginTop: 'auto' }} onClick={() => rememberChosenPlan(plan.id, interval)}>
              {plan.customPricing ? 'Get started' : 'Start free trial'}
            </Link>
          </article>
        ))}
      </div>
      <p className="home-pricing-note">Prices in US dollars. Only active students count toward a plan; parents, teachers and staff are always free.</p>
    </section>
  );
}
