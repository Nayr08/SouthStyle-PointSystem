'use client';

import Image from 'next/image';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

const STAFF_SESSION_KEY = 'southstyle:staff-session';

export default function AdminLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState(() => {
    if (typeof window === 'undefined') {
      return '';
    }

    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('phone') ?? '';
  });
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    const { data, error: loginError } = await supabase.rpc('staff_login', {
      p_phone: phone.replace(/\s+/g, ''),
      p_pin: pin,
    });

    setIsLoading(false);

    if (loginError) {
      setError(loginError.message || 'Admin login failed.');
      return;
    }

    const session = Array.isArray(data) ? data[0] : data;

    if (!session) {
      setError('Invalid admin number or PIN.');
      return;
    }

    window.localStorage.setItem(STAFF_SESSION_KEY, JSON.stringify(session));
    router.push('/admin');
  };

  return (
    <main className="login-shell min-h-screen px-5 py-8 text-white">
      <section className="animate-page mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-[430px] flex-col justify-center">
        <div className="animate-rise mb-7 text-center">
          <div className="mx-auto mb-5 grid h-32 w-32 place-items-center">
            <Image
              src="/southstyle-logo.png"
              alt="Southstyle logo"
              width={128}
              height={128}
              className="h-32 w-32 object-contain drop-shadow-2xl"
              priority
            />
          </div>
          <p className="text-sm font-black uppercase tracking-[0.28em] text-emerald-100/80">SouthStyle Admin</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Staff Login</h1>
          <p className="mx-auto mt-3 max-w-[300px] text-sm font-semibold leading-6 text-white/75">
            Use your admin number and PIN to manage Suki cards, points, coupons, and staff.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="animate-rise rounded-[30px] border border-white/25 bg-white/15 p-5 shadow-2xl shadow-green-950/25 backdrop-blur-xl">
          <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-white/60">Admin Number</label>
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/20 bg-white px-4 py-4 shadow-lg shadow-black/10">
            <Phone size={18} className="shrink-0 text-ss-green" />
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              inputMode="tel"
              placeholder="09170000000"
              className="min-w-0 flex-1 bg-transparent text-base font-black text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>

          <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-white/60">PIN</label>
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/20 bg-white px-4 py-4 shadow-lg shadow-black/10">
            <LockKeyhole size={18} className="shrink-0 text-ss-green" />
            <input
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              inputMode="numeric"
              type="password"
              maxLength={6}
              placeholder="1234"
              className="min-w-0 flex-1 bg-transparent text-base font-black text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>

          {error && (
            <p className="mb-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="mobile-tap tap-button w-full rounded-2xl bg-white px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-ss-green shadow-xl shadow-black/15 disabled:opacity-60"
          >
            {isLoading ? 'Checking...' : 'Login'}
          </button>
        </form>
      </section>
    </main>
  );
}
