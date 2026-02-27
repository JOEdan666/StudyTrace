'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Header() {
  const pathname = usePathname();

  return (
    <header className="header">
      <h1>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
        StudyTrace
      </h1>
      <nav>
        <Link href="/dashboard" className={pathname === '/dashboard' ? 'active' : ''}>
          Dashboard
        </Link>
        <Link href="/cards" className={pathname === '/cards' ? 'active' : ''}>
          Cards
        </Link>
        <Link href="/plan" className={pathname === '/plan' ? 'active' : ''}>
          Plan
        </Link>
      </nav>
    </header>
  );
}
