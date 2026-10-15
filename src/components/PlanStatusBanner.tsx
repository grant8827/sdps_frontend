import { Link } from 'react-router-dom';
import type { SchoolSubscriptionView } from '../services/api';
import { addStudentBlocked } from '../utils/planStatus';

/**
 * A warning across the top of the admin Overview and Students screens
 * when the plan is lapsed, full, or nearly full. Drop-off, pickup and
 * attendance keep working regardless; only adding students stops.
 */
export function PlanStatusBanner({ plan }: { plan: SchoolSubscriptionView | null }) {
  if (!plan) return null;
  const blocked = addStudentBlocked(plan);
  const nearlyFull = !blocked && plan.level === 'CLOSE'
    ? `Your plan is ${plan.percentUsed}% full: ${plan.remaining} more ${plan.remaining === 1 ? 'student fits' : 'students fit'}.`
    : null;
  const text = blocked ?? nearlyFull;
  if (!text) return null;
  return (
    <div className="card" role={blocked ? 'alert' : 'status'} style={{ borderLeft: `4px solid ${blocked ? 'var(--red)' : 'var(--amber)'}`, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 14 }}>
        {text}{blocked ? ' Drop-off, pickup, attendance and everything else keep working.' : ''}
      </span>
      <Link to="/admin/subscription" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>Upgrade Plan</Link>
    </div>
  );
}
