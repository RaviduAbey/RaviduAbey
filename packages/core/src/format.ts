const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const COLOMBO_OFFSET_MS = 330 * 60_000; // Sri Lanka is UTC+5:30 all year (no daylight saving).

/** "1 Jan 2027, 13:30" in Sri Lanka time. Avoids Intl time zones, which some JS engines lack. */
export function formatColomboDateTime(timestamp: string): string {
  const d = new Date(new Date(timestamp).getTime() + COLOMBO_OFFSET_MS);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
