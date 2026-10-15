import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, type SchoolSubscriptionView } from '../services/api';

/**
 * The school's plan, for screens that warn before an administrator tries
 * to add a student. Null while loading, for front desk staff (who can't
 * see the plan), or if it couldn't be loaded — the server still refuses
 * a student over the limit either way.
 */
export function usePlanStatus(): { plan: SchoolSubscriptionView | null; reload: () => void } {
  const { token, canManageSchool } = useAuth();
  const [plan, setPlan] = useState<SchoolSubscriptionView | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!token || !canManageSchool) return;
    let cancelled = false;
    api.mySubscription(token).then(next => { if (!cancelled) setPlan(next); }).catch(() => {});
    return () => { cancelled = true; };
  }, [token, canManageSchool, version]);
  return { plan, reload: () => setVersion(value => value + 1) };
}

/** Why no student can be added right now, or null. */
export function addStudentBlocked(plan: SchoolSubscriptionView | null): string | null {
  if (!plan) return null;
  if (plan.lapsed) return plan.lapsed === 'PAYMENT_OVERDUE'
    ? "Your subscription payment is overdue, so new students can't be added."
    : plan.lapsed === 'TRIAL_ENDED' ? "Your free trial has ended, so new students can't be added." : "Your subscription has ended, so new students can't be added.";
  if (plan.level === 'FULL') return `Your ${plan.subscription?.planName ?? ''} plan is full (${plan.activeStudents} of ${plan.studentLimit} students), so new students can't be added.`.replace('  ', ' ');
  return null;
}
