import { REQUEST_STATUSES, REQUEST_TYPES, type RequestStatus, type RequestType } from '@tourist/core';
import Link from 'next/link';
import { age, countryName, formatDate } from '@/components/format';
import { StatusPill } from '@/components/StatusPill';
import { requireStaff } from '@/lib/requireStaff';
import { createClient } from '@/lib/supabase/server';
import { listRequests, OPEN_STATUSES } from '@/requests/queries';
import { strings } from '@/strings';

export default async function Inbox({ searchParams }: { searchParams: Promise<{ type?: string; status?: string }> }) {
  await requireStaff();
  const params = await searchParams;
  const type = (REQUEST_TYPES as readonly string[]).includes(params.type ?? '') ? (params.type as RequestType) : undefined;
  const status =
    params.status === 'all'
      ? [...REQUEST_STATUSES]
      : (REQUEST_STATUSES as readonly string[]).includes(params.status ?? '')
        ? [params.status as RequestStatus]
        : OPEN_STATUSES;

  const supabase = await createClient();
  const rows = await listRequests(supabase, { type, status });
  const now = Date.now();

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Inbox</h1>
          <p className="muted">{rows.length} {rows.length === 1 ? 'request' : 'requests'} · oldest first</p>
        </div>
        <form className="filters" method="get">
          <label>
            Type
            <select id="type" name="type" defaultValue={type ?? ''}>
              <option value="">All types</option>
              {REQUEST_TYPES.map((t) => <option key={t} value={t}>{strings.type[t]}</option>)}
            </select>
          </label>
          <label>
            Status
            <select id="status" name="status" defaultValue={params.status ?? ''}>
              <option value="">Open</option>
              {REQUEST_STATUSES.map((s) => <option key={s} value={s}>{strings.status[s]}</option>)}
              <option value="all">Everything</option>
            </select>
          </label>
          <button className="btn secondary">Filter</button>
        </form>
      </div>
      <div className="table-wrap">
        {rows.length === 0 ? (
          <p className="empty">Nothing waiting. New requests from the app appear here.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Tourist</th>
                <th>Request</th>
                <th>Status</th>
                <th>Nationality</th>
                <th>Arrives</th>
                <th>Waiting</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><Link className="rowlink" href={`/requests/${r.id}`}>{r.touristName}</Link></td>
                  <td>{strings.type[r.type]}</td>
                  <td><StatusPill status={r.status} /></td>
                  <td>{countryName(r.nationalityIso2)}</td>
                  <td className="num">{formatDate(r.arrivalDate)}</td>
                  <td className="num">{age(r.createdAt, now)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
