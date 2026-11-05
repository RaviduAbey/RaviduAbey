'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { strings } from '@/strings';

const LINKS = [
  { href: '/inbox', label: strings.nav.inbox, match: ['/inbox', '/requests'] },
  { href: '/visa-rules', label: strings.nav.visaRules, match: ['/visa-rules'] },
];

export function NavLinks() {
  const path = usePathname();
  return (
    <nav className="topnav" aria-label="Main">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} aria-current={l.match.some((m) => path.startsWith(m)) ? 'page' : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
