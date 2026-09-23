import { useState } from 'react';
import type { RecipientOption } from './NoticeComposer';

interface PersonPickerModalProps {
  title: string;
  options: RecipientOption[];
  onSelect: (id: string) => void;
  onClose: () => void;
}

/** A searchable name-picker popup — used to choose one staff member or one parent to message. */
export function PersonPickerModal({ title, options, onSelect, onClose }: PersonPickerModalProps) {
  const [search, setSearch] = useState('');
  const term = search.trim().toLowerCase();
  const visible = term ? options.filter(o => o.label.toLowerCase().includes(term)) : options;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <p className="form-title" style={{ margin: 0 }}>{title}</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
        </div>
        <input
          className="input"
          placeholder="Search by name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
        />
        <div className="modal-list">
          {visible.length === 0 && <p className="empty-text">No one matches "{search}".</p>}
          {visible.map(option => (
            <button key={option.id} type="button" className="modal-option" onClick={() => onSelect(option.id)}>
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
