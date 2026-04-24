'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { AdminShellSkeleton } from '@/components/Skeletons';

export const STAFF_SESSION_KEY = 'southstyle:staff-session';

export type StaffSession = {
  id: string;
  full_name: string;
  phone: string;
  role: 'owner' | 'admin' | 'staff';
};

export function useStaffSession() {
  const router = useRouter();
  const [hasHydrated, setHasHydrated] = useState(false);
  const [staff, setStaff] = useState<StaffSession | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const rawSession = window.localStorage.getItem(STAFF_SESSION_KEY);
      setStaff(rawSession ? (JSON.parse(rawSession) as StaffSession) : null);
      setHasHydrated(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!staff) {
      router.replace('/admin/login');
    }
  }, [hasHydrated, router, staff]);

  return { hasHydrated, staff };
}

export function AdminShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const { hasHydrated, staff } = useStaffSession();

  if (!hasHydrated || !staff) {
    return <AdminShellSkeleton />;
  }

  return (
    <main className="animate-page min-h-screen bg-[#f0ede6] pb-10 text-slate-900">
      <header className="green-hero rounded-b-[30px] px-5 pb-5 pt-6 text-white">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image src="/southstyle-logo.png" alt="Southstyle logo" width={44} height={44} loading="eager" className="h-11 w-11 object-contain drop-shadow-xl" />
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/60">SouthStyle</p>
                <h1 className="text-lg font-black">{title}</h1>
                <p className="mt-1 text-xs font-semibold text-white/70">{subtitle}</p>
              </div>
            </div>
            <Link href="/admin" className="tap-button grid h-11 w-11 place-items-center rounded-2xl bg-white/15 backdrop-blur" title="Back">
              <ArrowLeft size={20} />
            </Link>
          </div>
        </div>
      </header>
      <section className="mx-auto max-w-4xl px-5 pt-6">{children}</section>
    </main>
  );
}

export function FieldShell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}

export function AdminInput({ children }: { children: ReactNode }) {
  return <span className="flex items-center gap-3 rounded-2xl border border-[#181d18]/14 bg-white px-4 py-4 transition-colors focus-within:border-[#181d18]/20">{children}</span>;
}
