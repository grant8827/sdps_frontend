import type { BillingInterval, PlanTerms } from '../services/api';
import { formatMoney } from './money';

export const INTERVAL_LABEL: Record<BillingInterval, string> = { MONTH: 'month', YEAR: 'year' };

/** "Up to 150 students", or "No student limit". */
export const limitLabel = (studentLimit: number | null) =>
  studentLimit === null ? 'No student limit' : `Up to ${studentLimit.toLocaleString('en-US')} students`;

/** "$49.00 / month", or "Custom" when the price is agreed with each school. */
export function planPriceLabel(plan: PlanTerms, interval: BillingInterval, currency = 'USD') {
  const cents = interval === 'YEAR' ? plan.annualPriceCents : plan.monthlyPriceCents;
  return plan.customPricing || cents === null ? 'Custom' : `${formatMoney(cents, currency)} / ${INTERVAL_LABEL[interval]}`;
}

/** What a subscription costs: "$990.00 / year", or "Price not set". */
export const priceLabel = (priceCents: number | null, interval: BillingInterval | string | null, currency = 'USD') =>
  priceCents === null ? 'Price not set' : `${formatMoney(priceCents, currency)} / ${interval === 'YEAR' ? 'year' : 'month'}`;
