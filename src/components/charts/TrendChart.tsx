import { useId, useState } from 'react';

export interface TrendSeries<K extends string> { key: K; label: string; color: string }

/**
 * A small daily chart — grouped bars or lines — drawn as SVG (no chart
 * library). The picture is labelled with a one-line summary for screen
 * readers, and "Show as table" gives the exact numbers to everyone.
 */
export function TrendChart<K extends string>({
  title,
  data,
  series,
  kind = 'bar',
  height = 160,
}: {
  title: string;
  data: ({ date: string } & Record<K, number>)[];
  series: TrendSeries<K>[];
  kind?: 'bar' | 'line';
  height?: number;
}) {
  const [asTable, setAsTable] = useState(false);
  const titleId = useId();
  const width = 600;
  const pad = { top: 10, right: 8, bottom: 22, left: 30 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const max = Math.max(1, ...data.flatMap(d => series.map(s => d[s.key])));
  // Whole-number gridlines: the top is an even number (at least 2), or a multiple of 10 above 10.
  const niceMax = max <= 10 ? Math.max(2, max + (max % 2)) : Math.ceil(max / 10) * 10;
  const y = (value: number) => pad.top + plotH - (value / niceMax) * plotH;
  const slot = plotW / Math.max(1, data.length);
  const barW = Math.max(1, (slot * 0.75) / series.length);
  const totals = series.map(s => `${s.label} ${data.reduce((sum, d) => sum + d[s.key], 0)}`).join(', ');
  const shortDate = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString([], { month: 'short', day: 'numeric', timeZone: 'UTC' });

  return (
    <figure className="card trend-chart" aria-labelledby={titleId} style={{ margin: 0 }}>
      <div className="card-row" style={{ alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <figcaption id={titleId} className="form-title" style={{ margin: 0, fontSize: 15 }}>{title}</figcaption>
        <button type="button" className="link-button" onClick={() => setAsTable(v => !v)} aria-pressed={asTable}>
          {asTable ? 'Show as chart' : 'Show as table'}
        </button>
      </div>
      <ul className="trend-legend" aria-hidden>
        {series.map(s => <li key={s.key}><span style={{ background: s.color }} />{s.label}</li>)}
      </ul>
      {asTable ? (
        <div className="table-wrap" style={{ maxHeight: 260, overflow: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>Date</th>{series.map(s => <th key={s.key}>{s.label}</th>)}</tr></thead>
            <tbody>{[...data].reverse().map(d => <tr key={d.date}><td>{shortDate(d.date)}</td>{series.map(s => <td key={s.key}>{d[s.key]}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label={`${title}, last ${data.length} days: ${totals}.`} style={{ display: 'block' }}>
          {[0, niceMax / 2, niceMax].map(value => (
            <g key={value}>
              <line x1={pad.left} x2={width - pad.right} y1={y(value)} y2={y(value)} className="trend-grid" />
              <text x={pad.left - 6} y={y(value) + 4} textAnchor="end" className="trend-axis">{Math.round(value)}</text>
            </g>
          ))}
          {data.map((d, i) => ((i % 7 === 0 && i < data.length - 3) || i === data.length - 1) && (
            <text key={d.date} x={pad.left + slot * i + slot / 2} y={height - 6} textAnchor="middle" className="trend-axis">{shortDate(d.date)}</text>
          ))}
          {kind === 'bar'
            ? data.map((d, i) => series.map((s, j) => {
              const h = (d[s.key] / niceMax) * plotH;
              return <rect key={`${d.date}-${s.key}`} x={pad.left + slot * i + slot * 0.125 + barW * j} y={pad.top + plotH - h} width={barW} height={h} fill={s.color} rx={1}><title>{`${shortDate(d.date)}: ${s.label} ${d[s.key]}`}</title></rect>;
            }))
            : series.map(s => (
              <polyline
                key={s.key}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                points={data.map((d, i) => `${pad.left + slot * i + slot / 2},${y(d[s.key])}`).join(' ')}
              />
            ))}
        </svg>
      )}
    </figure>
  );
}
