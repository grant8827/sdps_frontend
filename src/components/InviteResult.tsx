import { useState } from 'react';
import type { InviteResult as InviteResultData } from '../services/api';

/**
 * After an admin (or parent) adds someone: confirms the invite email went
 * out, or — when email isn't set up or delivery failed — shows the
 * one-time link to pass on another way (text message, in person).
 */
export function InviteResult({ name, result, onDismiss }: { name: string; result: InviteResultData; onDismiss?: () => void }) {
  const [copied, setCopied] = useState(false);
  if (result.emailSent) {
    return <p className="form-success" role="status">We emailed {name} a link to set up their account.</p>;
  }
  if (!result.setupLink) return null;
  const copy = async () => {
    try { await navigator.clipboard.writeText(result.setupLink!); setCopied(true); } catch { setCopied(false); }
  };
  return (
    <div className="invite-link-box" role="status">
      <p><strong>The email to {name} couldn't be sent.</strong> Share this one-time link with them yourself so they can choose a password. Keep it private: whoever opens it can set up the account.</p>
      <div className="invite-link-row">
        <input className="input" readOnly value={result.setupLink} onFocus={e => e.target.select()} aria-label="Account set-up link" />
        <button type="button" className="btn btn-primary" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
        {onDismiss ? <button type="button" className="btn btn-secondary" onClick={onDismiss}>Done</button> : null}
      </div>
    </div>
  );
}
