import { strings } from '@/strings';

export function StatusPill({ status }: { status: string }) {
  return <span className={`pill ${status}`}>{strings.status[status] ?? status}</span>;
}
