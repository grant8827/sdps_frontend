// Carries two small things across the sign-up flow, in this browser tab only:
// - that a school was just registered here, so the next page is "choose
//   your plan" rather than the dashboard;
// - the plan and billing interval picked on the public Pricing section,
//   so it is preselected there.
// sessionStorage can be unavailable (private windows); everything
// works without it, just without the shortcut.

const REGISTERED = 'sdp.justRegistered';
const PLAN = 'sdp.chosenPlan';

const read = (key: string) => { try { return window.sessionStorage.getItem(key); } catch { return null; } };
const write = (key: string, value: string | null) => {
  try { if (value === null) window.sessionStorage.removeItem(key); else window.sessionStorage.setItem(key, value); } catch { /* ignore */ }
};

export const markJustRegistered = () => write(REGISTERED, '1');
export const justRegistered = () => read(REGISTERED) === '1';
export const clearJustRegistered = () => write(REGISTERED, null);

export function rememberChosenPlan(planId: string, interval: 'MONTH' | 'YEAR') { write(PLAN, JSON.stringify({ planId, interval })); }
export function chosenPlan(): { planId: string; interval: 'MONTH' | 'YEAR' } | null {
  try {
    const value = JSON.parse(read(PLAN) ?? 'null');
    return value && typeof value.planId === 'string' && (value.interval === 'MONTH' || value.interval === 'YEAR') ? value : null;
  } catch { return null; }
}
export const clearChosenPlan = () => write(PLAN, null);
