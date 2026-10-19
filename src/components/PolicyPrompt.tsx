import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePolicyAcknowledgment } from '../utils/policyAcknowledgment';

// "Cancel" hides the popup for this sign-in only: it is remembered
// against the current session (a short piece of its token), so signing
// in again brings it back until someone confirms.
const dismissKey = (schoolId: string | null) => `sdpmplus.policyPromptDismissed.${schoolId ?? 'school'}`;
const sessionMark = (token: string | null) => (token ? token.slice(-12) : '');
function wasDismissed(schoolId: string | null, token: string | null) {
  try { return Boolean(token) && sessionStorage.getItem(dismissKey(schoolId)) === sessionMark(token); } catch { return false; }
}

/**
 * The popup a school administrator sees on the admin dashboard until
 * someone at the school confirms reading the Legal & Policies documents
 * (and again when one of them is updated). It shows on every page except
 * Legal & Policies itself, where the confirmation is made. Cancel hides
 * it until the next sign-in.
 */
export function PolicyPrompt() {
  const { token, activeSchoolId } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { current } = usePolicyAcknowledgment(pathname);
  const [dismissed, setDismissed] = useState(() => wasDismissed(activeSchoolId, token));
  if (current !== false || dismissed || pathname.startsWith('/admin/legal')) return null;

  const cancel = () => {
    try { sessionStorage.setItem(dismissKey(activeSchoolId), sessionMark(token)); } catch { /* still hidden until the page reloads */ }
    setDismissed(true);
  };
  return (
    <div className="modal-backdrop">
      <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="policy-prompt-title">
        <p id="policy-prompt-title" className="form-title" style={{ margin: 0 }}>Please read our Legal &amp; Policies</p>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
          Before using SDPMPlus, please read the agreements and policies that cover your school: privacy, student data, terms of service, security and data handling. When you have read them, confirm it at the top of the Legal &amp; Policies page.
        </p>
        <div className="btn-row">
          <button type="button" className="btn btn-secondary" onClick={cancel}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/admin/legal')}>Open Legal &amp; Policies</button>
        </div>
      </div>
    </div>
  );
}
