import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

const FEATURES: { icon: string; title: string; body: string }[] = [
  {
    icon: '🚗',
    title: 'Tap to check in',
    body: "Alert your child's teacher the moment you're in the lane.",
  },
  {
    icon: '✅',
    title: 'Live attendance',
    body: 'Drop-offs and pick-ups sync to the class roster instantly.',
  },
  {
    icon: '🔔',
    title: 'Stay in the loop',
    body: 'Messages from the school and teachers, right on your screen.',
  },
];

/**
 * Shared split-panel shell for both auth pages (Login and Register a
 * school): a branded gradient panel with the pitch on wide screens,
 * a plain compact brand line instead on narrow ones, and the actual
 * form (passed as children) on the right/below.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="auth-page">
      <aside className="auth-brand-panel">
        <div className="auth-brand-inner">
          <Link to="/" className="auth-logo-badge" aria-label="Back to home">🏫</Link>
          <h1 className="auth-brand-title">School Drop-off &amp; Pick-up</h1>
          <p className="auth-brand-tagline">
            Faster, safer drop-offs and pick-ups for parents, teachers, and staff.
          </p>

          <div className="auth-feature-list">
            {FEATURES.map(feature => (
              <div key={feature.title} className="auth-feature-row">
                <span className="auth-feature-icon">{feature.icon}</span>
                <div>
                  <p className="auth-feature-title">{feature.title}</p>
                  <p className="auth-feature-body">{feature.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main className="auth-form-side">
        <div className="auth-form-inner">
          <Link to="/" className="auth-mobile-brand" aria-label="Back to home">
            <span className="topbar-badge">🏫</span>
            <span>School Drop-off &amp; Pick-up</span>
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}
