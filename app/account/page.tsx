'use client';

import BottomNav from '@/components/BottomNav';
import { AccountSkeleton } from '@/components/Skeletons';
import { useDemoLoading } from '@/components/useDemoLoading';
import Link from 'next/link';
import { ArrowRight, Gift, History, LogOut, QrCode } from 'lucide-react';

type TierName = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Titanium';

const customer = {
  name: 'Pristia Candra',
  phone: '0917 555 0148',
  tier: 'Platinum' as TierName,
  points: 12429,
};

const tierStyle: Record<TierName, string> = {
  Bronze: 'border-[#f0b071]/40 bg-[#8a4f24]/35 text-[#ffd2a1]',
  Silver: 'border-slate-200/40 bg-slate-400/25 text-slate-100',
  Gold: 'border-amber-300/40 bg-amber-400/25 text-amber-100',
  Platinum: 'border-cyan-200/40 bg-cyan-300/20 text-cyan-100',
  Diamond: 'border-sky-200/40 bg-sky-300/20 text-sky-100',
  Titanium: 'border-zinc-100/40 bg-zinc-300/20 text-zinc-50',
};

const accountActions = [
  {
    label: 'My QR Backup',
    description: 'Open your account QR code.',
    href: '/scan?view=qr',
    icon: QrCode,
  },
  {
    label: 'Points History',
    description: 'View all earned and deducted points.',
    href: '/history',
    icon: History,
  },
  {
    label: 'My Rewards',
    description: 'See available and claimed coupons.',
    href: '/orders',
    icon: Gift,
  },
];

export default function AccountPage() {
  const isLoading = useDemoLoading();

  if (isLoading) {
    return <AccountSkeleton />;
  }

  return (
    <>
      <main className="animate-page phone-shell bg-white pb-28">
        <header className="px-5 pt-8 text-white">
          <section className="animate-rise tap-card green-hero mx-auto max-w-[390px] rounded-[28px] border border-white/25 p-5 shadow-2xl shadow-green-950/25">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-black tracking-tight">{customer.name}</h1>
                <p className="mt-2 text-sm font-semibold text-white/70">{customer.phone}</p>
              </div>
              <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${tierStyle[customer.tier]}`}>
                {customer.tier}
              </span>
            </div>

            <div className="mt-7 rounded-3xl bg-white/12 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/55">Available Points</p>
              <div className="mt-2 flex items-end gap-2">
                <strong className="text-[34px] font-black leading-none text-white">
                  {customer.points.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </strong>
                <span className="pb-1 text-xs font-bold text-white/65">points</span>
              </div>
              <p className="mt-3 text-sm font-black text-emerald-200">
                Worth PHP {customer.points.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </section>
        </header>

        <section className="px-5 pt-6">
          <div className="stagger space-y-3">
            {accountActions.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="tap-card flex items-center gap-4 rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 shadow-sm"
                >
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-ss-green text-white">
                    <Icon size={24} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-slate-900">{item.label}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{item.description}</p>
                  </div>
                  <ArrowRight size={18} className="text-ss-green" />
                </Link>
              );
            })}
          </div>

          <button className="tap-button mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-sm font-black text-rose-600">
            <LogOut size={18} />
            Logout
          </button>
        </section>
      </main>
      <BottomNav />
    </>
  );
}
