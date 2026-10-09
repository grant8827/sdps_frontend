import { useState } from 'react';
import { readLogoFile } from '../utils/logoFile';

/**
 * Shows the school's logo (or an empty box) with buttons to choose or
 * remove one. `value` is whatever can be shown in an <img>; picking a
 * file calls `onChange` with a data URL, removing calls it with ''.
 */
export function LogoPicker({ value, onChange, disabled }: { value: string; onChange: (dataUrl: string) => void; disabled?: boolean }) {
  const [error, setError] = useState('');
  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    try { onChange(await readLogoFile(file)); } catch (err) { setError(err instanceof Error ? err.message : 'Could not use that file.'); }
  };
  return (
    <div>
      <div className="logo-picker">
        {value ? <img src={value} alt="School logo" className="school-logo school-logo-lg" /> : <span className="school-logo school-logo-lg school-logo-empty">No logo</span>}
        <div className="action-row">
          <label className="btn btn-secondary btn-sm" style={{ cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1 }}>
            {value ? 'Change logo' : 'Upload logo'}
            <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} disabled={disabled} onChange={e => { pick(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
          {value && <button type="button" className="btn btn-secondary btn-sm" disabled={disabled} onClick={() => { setError(''); onChange(''); }}>Remove</button>}
        </div>
      </div>
      {error ? <p className="form-error" style={{ margin: '6px 0 0' }}>{error}</p> : null}
    </div>
  );
}
