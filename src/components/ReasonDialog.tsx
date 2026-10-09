import { useEffect, useId, useRef, useState, type FormEvent } from 'react';

/**
 * Confirmation for high-risk actions that must say why — suspending a
 * school, opening a support session, disabling an administrator. The
 * reason is required (at least 5 characters) and ends up in the audit
 * log. Optional `option` adds one checkbox (e.g. "Allow changes").
 * Escape or Cancel closes it; focus starts in the reason box.
 */
export function ReasonDialog({
  title,
  message,
  confirmLabel,
  fieldLabel = 'Reason (kept in the audit log)',
  danger,
  option,
  onConfirm,
  onClose,
}: {
  title: string;
  message?: string;
  confirmLabel: string;
  fieldLabel?: string;
  danger?: boolean;
  option?: { label: string; help?: string };
  onConfirm: (reason: string, optionChecked: boolean) => Promise<void> | void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const textRef = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();

  useEffect(() => {
    textRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 5) { setError('Please give a reason (at least 5 characters).'); return; }
    setBusy(true);
    setError('');
    try {
      await onConfirm(reason.trim(), checked);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal-panel" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={e => e.stopPropagation()} onSubmit={submit}>
        <p id={titleId} className="form-title" style={{ margin: 0 }}>{title}</p>
        {message && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{message}</p>}
        <label className="field-label" style={{ margin: 0 }} htmlFor={`${titleId}-reason`}>{fieldLabel}</label>
        <textarea id={`${titleId}-reason`} ref={textRef} className="textarea" value={reason} onChange={e => setReason(e.target.value)} maxLength={500} />
        {option && (
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 14 }}>
            <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} style={{ marginTop: 3 }} />
            <span>{option.label}{option.help && <span className="field-label" style={{ display: 'block', margin: 0 }}>{option.help}</span>}</span>
          </label>
        )}
        {error && <p className="form-error" style={{ margin: 0 }}>{error}</p>}
        <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} disabled={busy}>{busy ? 'Working…' : confirmLabel}</button>
        </div>
      </form>
    </div>
  );
}
