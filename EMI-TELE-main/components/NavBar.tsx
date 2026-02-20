'use client';

import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface NavBarProps {
  role: 'admin' | 'retailer';
  userName?: string;
  pendingCount?: number;
}

export default function NavBar({ role, userName, pendingCount }: NavBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success('Signed out');
    router.push('/login');
    router.refresh();
  }

  const adminLinks = [
    { href: '/admin', label: 'Dashboard', exact: true },
    { href: '/admin/approvals', label: 'Approvals', badge: pendingCount },
  ];

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-white/[0.06] bg-obsidian-900/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <Link href={role === 'admin' ? '/admin' : '/retailer'} className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-gold-500/15 border border-gold-500/25 flex items-center justify-center group-hover:bg-gold-500/20 transition-colors">
                <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
                  <path d="M16 2L2 9V23L16 30L30 23V9L16 2Z" stroke="#e8b800" strokeWidth="2" fill="rgba(232,184,0,0.1)" />
                  <circle cx="16" cy="14" r="4" fill="#e8b800" />
                </svg>
              </div>
              <span className="font-display text-lg font-semibold text-white">TelePoint</span>
            </Link>

            {role === 'admin' && (
              <div className="flex items-center gap-1">
                {adminLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive(link.href, link.exact)
                        ? 'bg-gold-500/10 text-gold-400'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    {link.label}
                    {link.badge !== undefined && link.badge > 0 && (
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gold-500 text-obsidian-950 text-[10px] font-bold">
                        {link.badge > 99 ? '99+' : link.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] text-slate-600 uppercase tracking-wider">Logged in as</span>
              <span className="text-sm font-medium text-slate-200 leading-tight">{userName || 'User'}</span>
            </div>
            <span className={`hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest ${
              role === 'admin'
                ? 'bg-gold-500/15 text-gold-400 border border-gold-500/20'
                : 'bg-sapphire-500/15 text-sapphire-400 border border-sapphire-500/20'
            }`}>
              {role === 'admin' ? 'SUPER ADMIN' : 'RETAILER'}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.08] hover:border-crimson-500/30 hover:bg-crimson-500/8 text-slate-400 hover:text-crimson-400 transition-all duration-200 text-sm"
              title="Logout"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
