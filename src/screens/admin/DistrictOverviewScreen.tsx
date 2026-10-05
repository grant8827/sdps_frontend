import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../../components/Screen';
import { SummaryTile } from '../../components/SummaryTile';
import { useAuth } from '../../context/AuthContext';
import { api, type DistrictSchool } from '../../services/api';

/**
 * District admins: every school in their district at a glance. "Open"
 * switches the dashboard to that school (same as the top-bar school
 * switcher) — everything else in the dashboard then acts on that school.
 */
export function DistrictOverviewScreen() {
  const { token, activeSchoolId, setActiveSchool } = useAuth();
  const navigate = useNavigate();
  const [schools, setSchools] = useState<DistrictSchool[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (token) api.districtOverview(token).then(setSchools).catch(error => setMessage(error.message));
  }, [token]);

  const open = (schoolId: string) => { setActiveSchool(schoolId); navigate('/admin'); };
  const districtName = schools[0]?.districtName;

  return (
    <Screen title={districtName ? `District: ${districtName}` : 'District'} subtitle="Every school in your district. Open one to manage it.">
      {message && <div className="card">{message}</div>}
      {schools.map(school => (
        <div key={school.schoolId} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="card-row" style={{ gap: 8 }}>
            <div>
              <p className="quick-action-title" style={{ margin: 0, fontSize: 17 }}>{school.schoolName}</p>
              <p className="field-label" style={{ margin: 0 }}>Code {school.schoolCode}{school.schoolId === activeSchoolId ? ' · currently open' : ''}</p>
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => open(school.schoolId)}>Open</button>
          </div>
          <div className="tile-grid">
            <SummaryTile label="Students" value={school.students} />
            <SummaryTile label="Teachers" value={school.teachers} />
            <SummaryTile label="Present now" value={school.presentToday} accentColor="var(--green)" />
            <SummaryTile label="Pending requests" value={school.pendingRequests} accentColor="var(--amber-text)" />
            <SummaryTile label="Adults awaiting approval" value={school.pendingGuardianApprovals} accentColor="var(--purple)" />
          </div>
        </div>
      ))}
    </Screen>
  );
}
