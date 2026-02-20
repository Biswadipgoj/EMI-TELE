'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import Link from 'next/link';

type Role = 'admin' | 'retailer';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [role, setRole] = useState<Role>('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Map username → Supabase email
  function toEmail(username: string, role: Role): string {
    if (role === 'admin') {
      const map: Record<string, string> = {
        'TELEPOINT': 'telepoint@admin.local',
        'telepoint': 'telepoint@admin.local',
        'TELEBISWAJITPOINT': 'telepoint@admin.local',
      };
      return map[username] || `${username}@admin.local`;
    }
    return `${username.toLowerCase()}@retailer.local`;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    try {
      const email = toEmail(username, role);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message === 'Invalid login credentials' ? 'Incorrect username or password' : error.message);
        return;
      }
      toast.success('Welcome!');
      router.replace(role === 'admin' ? '/admin' : '/retailer');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen gradient-bg grid-overlay flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-gold-500/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-sapphire-500/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gold-500/10 border border-gold-500/20 mb-5">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <path d="M16 2L2 9V23L16 30L30 23V9L16 2Z" stroke="#e8b800" strokeWidth="2" fill="rgba(232,184,0,0.08)" />
              <circle cx="16" cy="14" r="5" fill="#e8b800" />
            </svg>
          </div>
          <h1 className="font-display text-4xl font-bold text-white tracking-wide">TelePoint</h1>
          <p className="text-slate-500 text-sm mt-1 tracking-wider">EMI Management Portal</p>
        </div>

        <div className="glass-card p-8 shadow-2xl shadow-black/40">
          {/* Role selector */}
          <div className="flex rounded-xl bg-obsidian-900 border border-white/[0.06] p-1 mb-7">
            {(['admin', 'retailer'] as Role[]).map(r => (
              <button
                key={r}
                onClick={() => { setRole(r); setUsername(''); setPassword(''); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 capitalize ${
                  role === r
                    ? 'bg-gold-500 text-obsidian-950 shadow-md shadow-gold-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r === 'admin' ? '🔐 Admin' : '🏪 Retailer'}
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="form-label">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder={role === 'admin' ? 'TELEPOINT' : 'your username'}
                className="form-input"
                autoFocus
                autoCapitalize={role === 'admin' ? 'characters' : 'none'}
                autoComplete="username"
              />
            </div>
            <div>
              <label className="form-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input"
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="btn-gold w-full py-3.5 text-base mt-2"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="gold-line" />
          <p className="text-center text-xs text-slate-600">Secure access · Powered by Supabase Auth</p>
        </div>

        {/* Customer portal link */}
        <div className="text-center mt-6">
          <Link
            href="/customer"
            className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-sapphire-400 transition-colors border border-white/[0.08] hover:border-sapphire-500/30 px-4 py-2 rounded-xl"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
            </svg>
            Customer? View your EMI account →
          </Link>
        </div>
      </div>
    </div>
  );
}
