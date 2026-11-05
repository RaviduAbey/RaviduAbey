import { redirect } from 'next/navigation';
import { requireStaff } from '@/lib/requireStaff';
import { createClient } from '@/lib/supabase/server';
import { strings } from '@/strings';
import { NavLinks } from './NavLinks';

async function signOut() {
  'use server';
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/sign-in');
}

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-inner">
          <span className="brand">{strings.product} <small>{strings.portal}</small></span>
          <NavLinks />
          <span className="who">
            {data.user?.email} · {staff.role}
            <form action={signOut}><button className="btn secondary">{strings.nav.signOut}</button></form>
          </span>
        </div>
      </header>
      <main className="page">{children}</main>
    </div>
  );
}
