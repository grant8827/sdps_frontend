import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Shown on every page while a platform admin is inside a school through
 * a support session — who they're viewing as, whether it's read-only,
 * when it ends — with an obvious way out.
 */
export function SupportBanner() {
  const { supportSession, exitSupport } = useAuth();
  const navigate = useNavigate();
  if (!supportSession) return null;
  const ends = new Date(supportSession.expiresAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const exit = async () => {
    const schoolId = supportSession.schoolId;
    await exitSupport();
    navigate(`/platform/schools/${schoolId}`);
  };
  return (
    <div className="support-banner" role="status">
      <span>
        <strong>Viewing {supportSession.schoolName} as School Administrator</strong>
        {' · '}{supportSession.allowChanges ? 'Changes allowed' : 'Read-only'}
        {' · '}Ends {ends}
      </span>
      <button type="button" className="btn btn-sm support-banner-exit" onClick={exit}>Exit Support Session</button>
    </div>
  );
}
