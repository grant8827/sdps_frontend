import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Screen } from '../components/Screen';
import { SummaryTile } from '../components/SummaryTile';
import { TrendChart } from '../components/charts/TrendChart';
import { useAuth } from '../context/AuthContext';
import { api, type AttentionItem, type PlatformDashboard } from '../services/api';

const SEVERITY_LABEL: Record<AttentionItem['severity'], string> = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };

/**
 * Platform → Dashboard: the whole of SDPMPlus at a glance — schools and
 * people, today's drop-offs and pickups, 30-day trends, and a Needs
 * Attention list where every item links to the screen that fixes it.
 */
export function DashboardScreen() {
  const { token } = useAuth();
  const [data, setData] = useState<PlatformDashboard | null>(null);
  const [attention, setAttention] = useState<{ items: AttentionItem[]; notTracked: string[] } | null>(null);
  const [message, setMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (!token) return;
    setRefreshing(true);
    try {
      const [dashboard, needs] = await Promise.all([api.platformDashboard(token, refresh), api.platformNeedsAttention(token)]);
      setData(dashboard);
      setAttention(needs);
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load the dashboard');
    } finally {
      setRefreshing(false);
    }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  if (!data) {
    return <Screen title="Dashboard">{message ? <div className="card" role="alert">{message}</div> : <p className="empty-text">Loading…</p>}</Screen>;
  }
  const { totals, operations: ops } = data;
  const updated = new Date(data.generatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <Screen title="Dashboard" subtitle={`All of SDPMPlus. "Today" is ${new Date(`${data.today}T12:00:00Z`).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })} (${data.timezone.replace('_', ' ')}).`}>
      <div className="action-row">
        <span className="field-label" style={{ margin: 0 }}>Updated {updated}</span>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => load(true)} disabled={refreshing}>{refreshing ? 'Refreshing…' : 'Refresh'}</button>
      </div>
      {message && <div className="card" role="alert">{message}</div>}

      <section aria-labelledby="attention-heading" className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 id="attention-heading" className="form-title" style={{ margin: 0 }}>Needs Attention {attention && attention.items.length > 0 && <span className="attention-count">{attention.items.length}</span>}</h2>
        {attention && attention.items.length === 0 && <p style={{ margin: 0 }}>Nothing needs attention right now.</p>}
        {attention && attention.items.length > 0 && (
          <ul className="attention-list">
            {attention.items.map(item => (
              <li key={item.id} className={`attention-item severity-${item.severity}`}>
                <span className="attention-severity">{SEVERITY_LABEL[item.severity]}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="attention-title">{item.link ? <Link to={item.link}>{item.title}</Link> : item.title}</p>
                  <p className="field-label" style={{ margin: 0 }}>{item.category} · {item.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {attention && attention.notTracked.length > 0 && (
          <p className="field-label" style={{ margin: 0 }}>Not monitored yet: {attention.notTracked.join('; ')}.</p>
        )}
      </section>

      <h2 className="dash-heading">Platform</h2>
      <div className="tile-grid tile-grid-wide">
        <SummaryTile label="Total schools" value={totals.totalSchools} />
        <SummaryTile label="Active schools" value={totals.activeSchools} accentColor="var(--green)" />
        <SummaryTile label="Students" value={totals.students} />
        <SummaryTile label="Parents & guardians" value={totals.parents} />
        <SummaryTile label="Teachers & staff" value={totals.staff} />
        <SummaryTile label="Signed in (last 24 h)" value={totals.activeUsers} accentColor="var(--blue)" />
      </div>

      <h2 className="dash-heading">Today's operations</h2>
      <div className="tile-grid tile-grid-wide">
        <SummaryTile label="Drop-offs" value={ops.dropOffs} accentColor="var(--blue)" />
        <SummaryTile label="Pickups" value={ops.pickUps} accentColor="var(--blue)" />
        <SummaryTile label="Students present" value={ops.present} accentColor="var(--green)" />
        <SummaryTile label="Students absent" value={ops.absent} />
        <SummaryTile label="Pending drop-off requests" value={ops.pendingDropOffs} accentColor="var(--amber-text)" />
        <SummaryTile label="Pending pickup requests" value={ops.pendingPickUps} accentColor="var(--amber-text)" />
        <SummaryTile label="Requests declined" value={ops.declined} accentColor={ops.declined ? 'var(--amber-text)' : undefined} />
      </div>

      <h2 className="dash-heading">Last 30 days</h2>
      <div className="chart-grid">
        <TrendChart title="Drop-offs and pickups per day" data={data.daily} series={[{ key: 'dropOffs', label: 'Drop-offs', color: '#1976D2' }, { key: 'pickUps', label: 'Pickups', color: '#64B5F6' }]} />
        <TrendChart title="Attendance per day" data={data.daily} series={[{ key: 'present', label: 'Present', color: '#39A844' }, { key: 'absent', label: 'Absent', color: '#F5B82E' }]} />
        <TrendChart title="Schools with activity per day" kind="line" data={data.daily} series={[{ key: 'activeSchools', label: 'Schools', color: '#1976D2' }]} />
        <TrendChart title="People signing in per day" kind="line" data={data.daily} series={[{ key: 'signedIn', label: 'People', color: '#39A844' }]} />
      </div>
    </Screen>
  );
}
