'use server';
import { todayInColombo } from '@tourist/core';
import { revalidatePath } from 'next/cache';
import { requireStaff } from '@/lib/requireStaff';
import { createClient } from '@/lib/supabase/server';

export interface VisaRuleFormState {
  error: string | null;
  ok: boolean;
}

function fail(error: string): VisaRuleFormState {
  return { error, ok: false };
}

export async function upsertVisaRule(_prev: VisaRuleFormState, formData: FormData): Promise<VisaRuleFormState> {
  const staff = await requireStaff();
  if (staff.role !== 'admin') return fail('Only admins can change visa rules.');

  const country = String(formData.get('countryIso2') ?? '').trim().toUpperCase();
  const feeRaw = String(formData.get('feeUsd') ?? '').trim();
  const stayRaw = String(formData.get('maxStayDays') ?? '').trim();
  const sourceUrl = String(formData.get('sourceUrl') ?? '').trim();
  const fee = Number(feeRaw);
  const stay = Number(stayRaw);

  if (!/^[A-Z]{2}$/.test(country)) return fail('Country must be a 2-letter code, like DE.');
  if (feeRaw === '' || !Number.isFinite(fee) || fee < 0) return fail('Fee must be 0 or more (0 means free).');
  if (!Number.isInteger(stay) || stay < 1) return fail('Maximum stay must be at least 1 day.');
  if (!/^https:\/\/\S+\.\S+/.test(sourceUrl)) return fail('Source must be an https:// link.');

  const supabase = await createClient();
  const { error } = await supabase.from('country_visa_rules').upsert({
    country_iso2: country,
    fee_usd: fee,
    max_stay_days: stay,
    source_url: sourceUrl,
    verified_on: todayInColombo(),
  });
  if (error) return fail(error.message);

  revalidatePath('/visa-rules');
  return { error: null, ok: true };
}
