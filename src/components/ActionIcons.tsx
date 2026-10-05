/**
 * Small line icons for table row actions (edit / suspend / resume /
 * delete). Drawn with currentColor so they follow the button's color
 * in light and dark mode. Always wrap one in a button that has an
 * aria-label — the icon itself is decorative.
 */
const svgProps = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

export const EditIcon = () => (
  <svg {...svgProps}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
);
export const PauseIcon = () => (
  <svg {...svgProps}><circle cx="12" cy="12" r="9" /><path d="M10 9v6M14 9v6" /></svg>
);
export const ResumeIcon = () => (
  <svg {...svgProps}><circle cx="12" cy="12" r="9" /><path d="m10 8.5 5 3.5-5 3.5Z" /></svg>
);
export const TrashIcon = () => (
  <svg {...svgProps}><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></svg>
);
export const MailIcon = () => (
  <svg {...svgProps}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
);
