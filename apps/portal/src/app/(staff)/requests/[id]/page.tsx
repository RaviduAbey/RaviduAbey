import { stayDays, type LicenceAssessment, type RequestStatus, type RequestType, type VisaAssessment } from '@tourist/core';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { countryName, formatColomboDateTime, formatDate } from '@/components/format';
import { StatusPill } from '@/components/StatusPill';
import { requireStaff } from '@/lib/requireStaff';
import { createClient } from '@/lib/supabase/server';
import { getRequestDetail } from '@/requests/queries';
import { StatusActions } from '@/requests/StatusActions';
import { strings } from '@/strings';

const DOC_LABEL: Record<string, string> = {
  passport: 'Passport photo page',
  licence_front: 'Licence (front)',
  licence_back: 'Licence (back)',
  idp: 'International Driving Permit',
  photo: 'Photo of tourist',
  eta_approval: 'ETA approval',
  permit: 'Driving permit',
};

function visaText(v: VisaAssessment): { text: string; warn: boolean } {
  switch (v.kind) {
    case 'eta_free': return { text: `Free ETA · ${v.stayDays}-day stay within ${v.maxStayDays} days`, warn: false };
    case 'eta_paid': return { text: `Paid ETA · to collect: US$${v.feeUsd}`, warn: false };
    case 'stay_exceeds_eta': return { text: `Stay of ${v.stayDays} days is longer than the ${v.maxStayDays}-day ETA · advise on extension${v.feeUsd ? ` · fee US$${v.feeUsd}` : ''}`, warn: true };
    case 'unknown_country': return { text: 'Nationality not in the visa rules · check eta.gov.lk and add it under Visa rules', warn: true };
  }
}

function drivingText(d: LicenceAssessment): { text: string; warn: boolean } {
  switch (d.kind) {
    case 'no_licence': return { text: 'No licence · car with driver only', warn: true };
    case 'licence_expires_during_trip': return { text: `Licence expires ${formatDate(d.expiryDate)}, before departure`, warn: true };
    case 'eligible_for_permit':
      return { text: d.route === 'aa_ceylon_recognition' ? 'Has IDP · AA Ceylon recognition permit' : 'No IDP · DMT temporary permit', warn: false };
  }
}

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const supabase = await createClient();
  const d = await getRequestDetail(supabase, id);
  if (!d) notFound();

  const type = d.request.type as RequestType;
  const status = d.request.status as RequestStatus;
  const visa = visaText(d.visa);
  const driving = drivingText(d.driving);
  const details = d.request.details as Record<string, string>;

  return (
    <>
      <p><Link href="/inbox">← Inbox</Link></p>
      <div className="page-head">
        <div style={{ display: 'grid', gap: 6 }}>
          <h1>{strings.type[type]}</h1>
          <p className="muted">{d.profile.full_name} · sent {formatColomboDateTime(d.request.created_at)}</p>
        </div>
        <StatusPill status={status} />
      </div>

      <div className="detail">
        <div style={{ display: 'grid', gap: 20, minWidth: 0 }}>
          <section className="card" aria-labelledby="tourist-h">
            <h2 id="tourist-h">Tourist</h2>
            <dl className="kv">
              <dt>Name</dt><dd>{d.profile.full_name}</dd>
              <dt>Phone</dt><dd className="mono">{d.profile.phone_e164}</dd>
              <dt>Nationality</dt><dd>{countryName(d.profile.nationality_iso2)}</dd>
              <dt>Trip</dt>
              <dd>{formatDate(d.trip.arrival_date)} → {formatDate(d.trip.departure_date)} · {stayDays(d.trip.arrival_date, d.trip.departure_date)} days</dd>
              {type === 'eta_application' ? (
                <>
                  <dt>Passport no.</dt><dd className="mono">{details.passportNumber ?? '—'}</dd>
                  <dt>Passport expiry</dt><dd>{formatDate(details.passportExpiry)}</dd>
                </>
              ) : (
                <>
                  <dt>Licence</dt>
                  <dd>
                    {d.licence?.has_licence
                      ? `${countryName(d.licence.issuing_country_iso2)} · ${d.licence.licence_number ?? 'no number given'} · expires ${formatDate(d.licence.expiry_date)}`
                      : 'None'}
                  </dd>
                  <dt>IDP</dt><dd>{d.licence?.has_idp ? 'Yes' : 'No'}</dd>
                </>
              )}
            </dl>
            <p className={`assessment ${(type === 'eta_application' ? visa : driving).warn ? 'warn' : ''}`}>
              <strong>What the app told them:</strong> {(type === 'eta_application' ? visa : driving).text}
            </p>
          </section>

          <section className="card" aria-labelledby="docs-h">
            <h2 id="docs-h">Documents</h2>
            {d.documents.length === 0 ? (
              <p className="muted">No documents.</p>
            ) : (
              <div className="docs">
                {d.documents.map((doc) =>
                  doc.signedUrl ? (
                    <a key={doc.id} className="doc" href={doc.signedUrl} target="_blank" rel="noreferrer">
                      {doc.isImage ? <img src={doc.signedUrl} alt="" /> : null}
                      <span>{DOC_LABEL[doc.kind] ?? doc.kind}</span>
                    </a>
                  ) : (
                    <div key={doc.id} className="doc"><span>{DOC_LABEL[doc.kind] ?? doc.kind} (file missing)</span></div>
                  ),
                )}
              </div>
            )}
          </section>
        </div>

        <div style={{ display: 'grid', gap: 20, minWidth: 0 }}>
          <section className="card" aria-labelledby="actions-h">
            <h2 id="actions-h">Next step</h2>
            <StatusActions key={status} requestId={d.request.id} status={status} type={type} />
          </section>
          <section className="card" aria-labelledby="timeline-h">
            <h2 id="timeline-h">Timeline</h2>
            <ol className="timeline" aria-label="Timeline">
              {d.events.map((e) => (
                <li key={e.id}>
                  <strong>{strings.status[e.to_status] ?? e.to_status}</strong>
                  <span className="muted num">{formatColomboDateTime(e.created_at)}</span>
                  {e.note ? <span className="note">{e.note}</span> : null}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </>
  );
}
