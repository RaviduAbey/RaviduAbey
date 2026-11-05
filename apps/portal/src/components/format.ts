import { countryName, formatColomboDateTime } from '@tourist/core';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "12 Jan 2027" from "2027-01-12". */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[(m ?? 1) - 1]} ${y}`;
}

/** "3 days" / "5 hours" since a timestamp. */
export function age(timestamp: string, now = Date.now()): string {
  const mins = Math.max(0, Math.round((now - new Date(timestamp).getTime()) / 60000));
  if (mins < 60) return `${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} h`;
  return `${Math.round(hours / 24)} days`;
}

export { countryName, formatColomboDateTime };
