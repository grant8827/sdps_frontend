interface SummaryTileProps {
  label: string;
  value: number | string;
  accentColor?: string;
}

/** Stat tile used on Home screens and Admin's Overview. */
export function SummaryTile({ label, value, accentColor = '#111827' }: SummaryTileProps) {
  return (
    <div className="tile">
      <div className="tile-value" style={{ color: accentColor }}>{value}</div>
      <div className="tile-label">{label}</div>
    </div>
  );
}
