import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, type SchoolBranding } from '../services/api';

/**
 * The school's logo and name, at the top of the parent, teacher and
 * administrator dashboards. Shows just the name when the school has no
 * logo, and nothing until it has loaded.
 */
export function SchoolBadge() {
  const { token, activeSchoolId } = useAuth();
  const [school, setSchool] = useState<SchoolBranding | null>(null);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api.mySchool(token).then(next => { if (!cancelled) { setSchool(next); setLogoFailed(false); } }).catch(() => {});
    return () => { cancelled = true; };
  }, [token, activeSchoolId]);

  if (!school) return null;
  return (
    <div className="school-badge">
      {school.logoUrl && !logoFailed && <img src={school.logoUrl} alt="" className="school-logo" onError={() => setLogoFailed(true)} />}
      <span className="school-badge-name">{school.name}</span>
    </div>
  );
}
