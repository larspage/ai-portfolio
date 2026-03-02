'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/leadership', label: 'Leadership' },
  { href: '/architecture', label: 'Architecture' },
  { href: '/development', label: 'Development' },
  { href: '/match', label: 'Job Match' },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-gradient-to-r from-white to-slate-50 border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-xl font-bold text-umber-900 hover:text-umber-700 transition-colors">
            Profile
          </Link>
          <div className="hidden md:flex space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${
                  pathname === item.href ? 'nav-link-active' : ''
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <MobileMenu pathname={pathname} />
        </div>
      </div>
    </nav>
  );
}

function MobileMenu({ pathname }: { pathname: string }) {
  return (
    <div className="md:hidden">
      <details className="relative">
        <summary className="list-none cursor-pointer p-2">
          <svg
            className="w-6 h-6 text-umber-900"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </summary>
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-4 py-2 text-slate-700 hover:bg-slate-50 ${
                pathname === item.href ? 'bg-slate-50 text-umber-900 font-medium' : ''
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </details>
    </div>
  );
}
