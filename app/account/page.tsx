'use client';

import { useState } from 'react';
import BottomNav from '@/components/BottomNav';
import { AccountSkeleton } from '@/components/Skeletons';
import { clearCustomerSession } from '@/lib/customer-session';
import { useCustomerData } from '@/lib/customer-data';
import Link from 'next/link';
import { ArrowRight, Gift, History, LogOut, QrCode, X } from 'lucide-react';

type TierName = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Titanium';

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
  const { profile, isLoading } = useCustomerData();
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  if (isLoading || !profile) {
    return <AccountSkeleton />;
  }

  const logout = () => {
    clearCustomerSession();
    window.location.href = '/';
  };

  return (
    <>
      <main className="animate-page phone-shell bg-white pb-28">
        <header className="px-5 pt-8 text-white">
          <section className="animate-rise tap-card green-hero mx-auto max-w-[390px] rounded-[28px] border border-white/25 p-5 shadow-2xl shadow-green-950/25">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-black tracking-tight">{profile.full_name}</h1>
                <p className="mt-2 text-sm font-semibold text-white/70">{profile.phone}</p>
              </div>
              <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${tierStyle[profile.tier as TierName]}`}>
                {profile.tier}
              </span>
            </div>

            <div className="mt-7 rounded-3xl bg-white/12 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/55">Available Points</p>
              <div className="mt-2 flex items-end gap-2">
                <strong className="text-[34px] font-black leading-none text-white">
                  {Number(profile.points_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </strong>
                <span className="pb-1 text-xs font-bold text-white/65">points</span>
              </div>
              <p className="mt-3 text-sm font-black text-emerald-200">
                Worth PHP {Number(profile.points_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </section>
        </header>

        <section className="px-5 pt-6">
          <section className="rounded-[28px] border border-emerald-100 bg-gradient-to-br from-[#f7fbf6] to-[#eef7f2] p-4 shadow-[0_18px_42px_-34px_rgba(16,24,40,0.3)]">
            <div className="mb-4 flex items-center justify-between gap-3 px-1">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-ss-green">Account Tools</p>
                <p className="mt-1 text-sm font-black text-slate-900">Quick access</p>
              </div>
              <span className="rounded-full border border-[#1f261f]/12 bg-[#f1f5ef] px-3 py-1.5 text-[11px] font-black text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                {accountActions.length} tools
              </span>
            </div>

            <div className="stagger space-y-3">
              {accountActions.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="tap-card flex items-center gap-4 rounded-3xl border border-emerald-100 bg-white p-5 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.24)] transition hover:border-emerald-200 hover:bg-emerald-50/35"
                  >
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-emerald-100 bg-emerald-50 text-ss-green shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                      <Icon size={24} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-slate-900">{item.label}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{item.description}</p>
                    </div>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[#1f261f]/12 bg-[#fcfdfb] text-ss-green shadow-[0_10px_24px_-18px_rgba(15,24,18,0.35)]">
                      <ArrowRight size={18} />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>

          <button
            onClick={() => setIsLogoutConfirmOpen(true)}
            className="tap-button mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-sm font-black text-rose-600"
          >
            <LogOut size={18} />
            Logout
          </button>
        </section>
      </main>

      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 z-[90] grid place-items-end bg-black/45 px-5 pb-5 pt-8 backdrop-blur-sm sm:place-items-center">
          <div className="modal-sheet w-full max-w-[430px] overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white">
              <div className="mb-5 flex items-start justify-between gap-4">
                <LogOut size={34} className="text-white" strokeWidth={2.4} />
                <button
                  onClick={() => setIsLogoutConfirmOpen(false)}
                  className="tap-button grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-xl font-black">Logout from your account?</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-white/80">
                You will return to the welcome screen and need to enter your mobile number and MPIN again.
              </p>
            </div>

            <div className="p-5">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-500">Current Account</p>
                <p className="mt-2 text-sm font-black text-slate-900">{profile.full_name}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{profile.phone}</p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setIsLogoutConfirmOpen(false)}
                  className="tap-button rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={logout}
                  className="tap-button flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#078b3e,#10b981)] px-4 py-3 text-sm font-black text-white shadow-lg shadow-emerald-900/20"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <BottomNav />
    </>
  );
}
