/** Server timestamps are UTC 'YYYY-MM-DD HH:MM:SS' strings — show them in the viewer's local time. */
export const formatUtcTimestamp = (value: string) => new Date(`${value.replace(' ', 'T')}Z`).toLocaleString();
