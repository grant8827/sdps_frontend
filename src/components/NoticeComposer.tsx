import { useEffect, useState } from 'react';

export interface ParentOption {
  id: string;
  label: string;
}

export type NoticeTarget = { type: 'ALL' } | { type: 'PARENT'; parentUserId: string };

interface NoticeComposerProps {
  /** Label for the "everyone" chip, e.g. "All Class Parents" or "All School Parents". */
  allLabel: string;
  /** Real parents to offer individually via a dropdown. Omitted (or empty) for a broadcast-only composer with no per-parent targeting. */
  parentOptions?: ParentOption[];
  onSend: (target: NoticeTarget, title: string, body: string) => void;
  sendLabel?: string;
}

/** Shared composer UI backing both the teacher's targeted notices and the admin's broadcast. */
export function NoticeComposer({
  allLabel,
  parentOptions = [],
  onSend,
  sendLabel = 'Send Notice',
}: NoticeComposerProps) {
  const [mode, setMode] = useState<'ALL' | 'PARENT'>('ALL');
  const [parentId, setParentId] = useState(parentOptions[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  // parentOptions usually arrives after an async fetch, past this
  // component's first render — re-sync whenever the list changes and
  // the current selection is no longer (or not yet) valid, otherwise
  // the <select> can visually show its first option while the actual
  // state is still '', silently no-opping Send.
  useEffect(() => {
    if (!parentOptions.some(option => option.id === parentId)) {
      setParentId(parentOptions[0]?.id ?? '');
    }
  }, [parentOptions]);

  const handleSend = () => {
    if (!title.trim() || !body.trim()) return;
    if (mode === 'PARENT' && !parentId) return;
    onSend(mode === 'ALL' ? { type: 'ALL' } : { type: 'PARENT', parentUserId: parentId }, title.trim(), body.trim());
    setTitle('');
    setBody('');
    setMode('ALL');
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {parentOptions.length > 0 && (
        <>
          <p className="field-label" style={{ margin: 0 }}>Send to</p>
          <div className="chip-row">
            <button type="button" className={`chip${mode === 'ALL' ? ' chip-active' : ''}`} onClick={() => setMode('ALL')}>
              {allLabel}
            </button>
            <button type="button" className={`chip${mode === 'PARENT' ? ' chip-active' : ''}`} onClick={() => setMode('PARENT')}>
              One Parent
            </button>
          </div>
          {mode === 'PARENT' && (
            <select className="input" value={parentId} onChange={e => setParentId(e.target.value)}>
              {parentOptions.map(option => (
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
