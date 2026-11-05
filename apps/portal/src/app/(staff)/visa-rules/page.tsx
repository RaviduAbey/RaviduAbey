import { countryName, todayInColombo } from '@tourist/core';
import { formatDate } from '@/components/format';
import { requireStaff } from '@/lib/requireStaff';
import { createClient } from '@/lib/supabase/server';
import { AddRuleForm, VisaRuleRow, type RuleView } from '@/visa-rules/VisaRuleRow';

const STALE_AFTER_DAYS = 90;

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000);
}

export default async function VisaRulesPage() {
  const staff = await requireStaff();
  const supabase = await createClient();
  const { data } = await supabase.from('country_visa_rules').select('*');
  const today = todayInColombo();

  const rules: RuleView[] = (data ?? [])
    .map((r) => ({
      code: r.country_iso2,
      name: countryName(r.country_iso2),
      feeUsd: Number(r.fee_usd),
      maxStayDays: r.max_stay_days,
      sourceUrl: r.source_url,
      verifiedOn: r.verified_on,
      verifiedLabel: formatDate(r.verified_on),
      stale: daysBetween(r.verified_on, today) > STALE_AFTER_DAYS,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const staleCount = rules.filter((r) => r.stale).length;
  const isAdmin = staff.role === 'admin';

  return (
    <>
      <div className="page-head">
        <div style={{ display: 'grid', gap: 6 }}>
          <h1>Visa rules</h1>
          <p className="muted">
            {rules.length} countries. Nationalities not listed see &ldquo;Our team will check&rdquo; in the app.
            {isAdmin ? ' Check each rule against eta.gov.lk and save to mark it verified today.' : ' Only admins can edit.'}
          </p>
        </div>
      </div>
      {staleCount > 0 ? (
        <p className="notice">
          {staleCount} {staleCount === 1 ? 'rule was' : 'rules were'} last checked more than {STALE_AFTER_DAYS} days ago.
        </p>
      ) : null}
      {isAdmin ? <AddRuleForm /> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Country</th>
              <th>Code</th>
              <th>ETA fee</th>
              <th>Max stay</th>
              <th>Verified</th>
              <th>Source</th>
              <th><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => <VisaRuleRow key={r.code} rule={r} canEdit={isAdmin} />)}
          </tbody>
        </table>
      </div>
    </>
  );
}
