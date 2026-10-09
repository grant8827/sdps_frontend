/** Cents → "$1,234.50" (or another currency code). */
export const formatMoney = (cents: number, currency = 'USD') =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency });

/** "12.50" or "12" typed by a person → 1250 cents; null if it isn't a valid amount. */
export function parseMoney(value: string): number | null {
  const cleaned = value.replace(/[$,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}
