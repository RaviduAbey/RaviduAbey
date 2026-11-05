import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type StaffRole = 'agent' | 'admin';

/** Server-only gate for staff pages. Redirects anyone who is not signed in as staff. */
export async function requireStaff(): Promise<{ userId: string; role: StaffRole }> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/sign-in');

  const { data: staff } = await supabase.from('staff').select('role').eq('user_id', data.user.id).maybeSingle();
  if (!staff) redirect('/sign-in?error=not_staff');

  return { userId: data.user.id, role: staff.role as StaffRole };
}
