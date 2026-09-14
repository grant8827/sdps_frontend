import { Link } from 'react-router-dom';

interface QuickActionProps {
  title: string;
  subtitle?: string;
  badge?: number;
  to: string;
}

/** A tappable shortcut row on a Home screen, linking to another tab. */
export function QuickAction({ title, subtitle, badge, to }: QuickActionProps) {
  return (
    <Link className="quick-action" to={to}>
      <div>
        <p className="quick-action-title">{title}</p>
        {subtitle ? <p className="quick-action-subtitle">{subtitle}</p> : null}
      </div>
      <div className="quick-action-right">
        {!!badge && <span className="badge">{badge}</span>}
        <span className="chevron">›</span>
      </div>
    </Link>
  );
}
