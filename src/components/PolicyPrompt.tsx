import { useLocation, useNavigate } from 'react-router-dom';
import { usePolicyAcknowledgment } from '../utils/policyAcknowledgment';

/**
 * The popup a school administrator sees on the admin dashboard until
 * someone at the school confirms reading the Legal & Policies documents
 * (and again when one of them is updated). It comes back on every page
 * except Legal & Policies itself, where the confirmation is made.
 */
export function PolicyPrompt() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { current } = usePolicyAcknowledgment(pathname);
  if (current !== false || pathname.startsWith('/admin/legal')) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="policy-prompt-title">
        <p id="policy-prompt-title" className="form-title" style={{ margin: 0 }}>Please read our Legal &amp; Policies</p>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
          Before using SDPMPlus, please read the agreements and policies that cover your school: privacy, student data, terms of service, security and data handling. When you have read them, confirm it at the top of the Legal &amp; Policies page.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/admin/legal')}>Open Legal &amp; Policies</button>
      </div>
    </div>
  );
}
