import { useEffect, useState } from 'react';

export interface RecipientOption {
  id: string;
  label: string;
}

export type NoticeTarget = { type: 'ALL' } | { type: 'SINGLE'; recipientId: string };

interface NoticeComposerProps {
  /** Label for the "everyone" chip, e.g. "All Class Parents" or "All School Parents". */
  allLabel: string;
  /** Label for the single-recipient chip, e.g. "One Parent" or "One Staff Member". */
  singleLabel?: string;
  /** Real recipients to offer individually via a dropdown. Omitted (or empty) for a broadcast-only composer with no per-recipient targeting. */
  singleOptions?: RecipientOption[];
  onSend: (target: NoticeTarget, title: string, body: string) => void;
  sendLabel?: string;
}

/** Shared composer UI backing the teacher's targeted notices and the admin's staff/parent broadcasts. */
export function NoticeComposer({
  allLabel,
  singleLabel = 'One Parent',
  singleOptions = [],
  onSend,
  sendLabel = 'Send Message',
}: NoticeComposerProps) {
  const [mode, setMode] = useState<'ALL' | 'SINGLE'>('ALL');
  const [recipientId, setRecipientId] = useState(singleOptions[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  // singleOptions usually arrives after an async fetch, past this
  // component's first render — re-sync whenever the list changes and
  // the current selection is no longer (or not yet) valid, otherwise
  // the <select> can visually show its first option while the actual
  // state is still '', silently no-opping Send.
  useEffect(() => {
    if (!singleOptions.some(option => option.id === recipientId)) {
      setRecipientId(singleOptions[0]?.id ?? '');
    }
  }, [singleOptions]);

  const handleSend = () => {
    if (!title.trim() || !body.trim()) return;
    if (mode === 'SINGLE' && !recipientId) return;
    onSend(mode === 'ALL' ? { type: 'ALL' } : { type: 'SINGLE', recipientId }, title.trim(), body.trim());
    setTitle('');
    setBody('');
    setMode('ALL');
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {singleOptions.length > 0 && (
        <>
          <p className="field-label" style={{ margin: 0 }}>Send to</p>
          <div className="chip-row">
            <button type="button" className={`chip${mode === 'ALL' ? ' chip-active' : ''}`} onClick={() => setMode('ALL')}>
              {allLabel}
            </button>
            <button type="button" className={`chip${mode === 'SINGLE' ? ' chip-active' : ''}`} onClick={() => setMode('SINGLE')}>
              {singleLabel}
            </button>
          </div>
          {mode === 'SINGLE' && (
            <select className="input" value={recipientId} onChange={e => setRecipientId(e.target.value)}>
              {singleOptions.map(option => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          )}
        </>
      )}

      <input
        className="input"
        placeholder="Title"
        value={title}
        onChange={e => setTitle(e.target.value)}
      />
      <textarea
        className="textarea"
        placeholder="Message"
        value={body}
        onChange={e => setBody(e.target.value)}
      />

      <button type="button" className="btn btn-primary btn-block" onClick={handleSend}>
        {sendLabel}
      </button>
    </div>
  );
}
