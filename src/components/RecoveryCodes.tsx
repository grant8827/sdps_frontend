import { useState } from 'react';

/**
 * Shown once, right after two-step verification is turned on (or the
 * codes are replaced): each code signs in once if the phone is lost.
 * The server only keeps hashes, so this is the only time they're visible.
 */
export function RecoveryCodes({ codes, onDone, doneLabel = "I've saved these codes" }: { codes: string[]; onDone: () => void; doneLabel?: string }) {
  const [copied, setCopied] = useState(false);
  const text = codes.join('\n');

  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); } catch { /* clipboard blocked — codes are still on screen */ }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([`School Drop-off & Pick-up recovery codes\nEach code works once.\n\n${text}\n`], { type: 'text/plain' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'recovery-codes.txt'; link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ margin: 0, fontSize: 14, color: 'var(--text)' }}>
        <strong>Save these recovery codes somewhere safe.</strong> If you lose your phone, each code lets you sign in once.
        They won't be shown again.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, padding: 12, borderRadius: 10, background: 'var(--chip-bg)', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 15 }}>
        {codes.map(code => <span key={code}>{code}</span>)}
      </div>
      <div className="btn-row">
        <button type="button" className="btn btn-secondary" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
        <button type="button" className="btn btn-secondary" onClick={download}>Download</button>
      </div>
      <button type="button" className="btn btn-primary btn-block" onClick={onDone}>{doneLabel}</button>
    </div>
  );
}
