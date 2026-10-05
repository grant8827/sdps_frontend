import type { ReactNode } from 'react';

/**
 * Line icons for the marketing home page — one consistent 24px stroke
 * style, drawn with currentColor so each takes its tile's brand color.
 * Decorative only (aria-hidden); the text next to each says what it means.
 */
function Icon({ children, size = 24 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

export const CarIcon = () => (
  <Icon><path d="M5 17h14M6 17v2M18 17v2" /><path d="M4 13l1.6-4.8A2 2 0 0 1 7.5 7h9a2 2 0 0 1 1.9 1.2L20 13v4H4z" /><circle cx="7.5" cy="14.5" r=".8" /><circle cx="16.5" cy="14.5" r=".8" /></Icon>
);
export const ShieldCheckIcon = () => (
  <Icon><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" /><path d="m9 12 2 2 4-4" /></Icon>
);
export const ClipboardIcon = () => (
  <Icon><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1" /><path d="m9 12 2 2 4-4" /><path d="M9 18h6" /></Icon>
);
export const BellIcon = () => (
  <Icon><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></Icon>
);
export const KeyIcon = () => (
  <Icon><circle cx="8" cy="15" r="4" /><path d="m11 12 8-8M16 7l2 2M14 9l2 2" /></Icon>
);
export const UsersCheckIcon = () => (
  <Icon><circle cx="9" cy="8" r="3.5" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="m16 11 2 2 4-4" /></Icon>
);
export const ListIcon = () => (
  <Icon><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></Icon>
);
export const BuildingIcon = () => (
  <Icon><path d="M3 21h18" /><path d="M5 21V9l7-5 7 5v12" /><path d="M10 21v-5h4v5" /><path d="M9 11h.01M15 11h.01" /></Icon>
);
export const PhoneIcon = () => (
  <Icon><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></Icon>
);
export const LockIcon = () => (
  <Icon><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Icon>
);
export const CheckIcon = ({ size = 18 }: { size?: number }) => (
  <Icon size={size}><path d="m5 12 4.5 4.5L19 7" /></Icon>
);
export const ArrowRightIcon = ({ size = 18 }: { size?: number }) => (
  <Icon size={size}><path d="M5 12h14M13 6l6 6-6 6" /></Icon>
);
