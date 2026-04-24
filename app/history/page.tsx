'use client';

import BottomNav from '@/components/BottomNav';
import { TransactionsSkeleton } from '@/components/Skeletons';
import { TransactionCard } from '@/components/TransactionCard';
import { useCustomerData } from '@/lib/customer-data';
import { ReceiptText, Sparkles } from 'lucide-react';

export default function HistoryPage() {
  const { profile, transactions, isLoading } = useCustomerData();

  if (isLoading || !profile) {
    return <TransactionsSkeleton />;
  }

  return (
    <>
      <main className="animate-page phone-shell bg-white pb-28">
        <header className="animate-hero green-hero rounded-b-[30px] px-5 pb-8 pt-6 text-white">
          <div className="mb-7 flex items-center justify-between">
            <button className="tap-button grid h-10 w-10 place-items-center rounded-full bg-white/10" title="Points">
              <ReceiptText size={19} />
            </button>
            <h1 className="text-lg font-black">Transactions</h1>
            <div className="h-10 w-10" aria-hidden="true" />
          </div>
          <div className="animate-pop mx-auto mb-5 w-fit rounded-full bg-white px-5 py-2 text-ss-ink soft-shadow">
            <span className="text-sm font-medium text-ss-muted">Your Point </span>
            <strong className="text-lg font-black text-ss-green">{Number(profile.points_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
            <span className="text-xs font-semibold text-ss-muted"> point</span>
          </div>
          <p className="mx-auto max-w-[280px] text-center text-sm font-medium leading-6 text-white/90">
            See every earn, redeem, and payment deduction on your Suki card.
          </p>
        </header>

        <section className="px-5 py-6">
          <section className="mb-6 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-5">
            <h2 className="mb-4 text-sm font-black text-slate-900">Points Summary</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-white p-3 text-center shadow-sm">
                <p className="text-lg font-black text-ss-green">{Number(profile.points_balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="mt-1 text-[10px] font-semibold text-slate-500">Available</p>
              </div>
              <div className="rounded-xl bg-white p-3 text-center shadow-sm">
                <p className="text-lg font-black text-slate-900">{Number(profile.lifetime_earned).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="mt-1 text-[10px] font-semibold text-slate-500">Lifetime</p>
              </div>
              <div className="rounded-xl bg-white p-3 text-center shadow-sm">
                <p className="text-lg font-black text-rose-500">{Number(profile.total_redeemed).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="mt-1 text-[10px] font-semibold text-slate-500">Redeemed</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.35)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-ss-green" />
                <div>
                  <p className="text-sm font-black text-slate-900">Recent activity</p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-500">Your latest earn and redeem updates</p>
                </div>
              </div>
              <span className="rounded-full border border-[#1f261f]/12 bg-[#f1f5ef] px-3 py-1.5 text-[11px] font-black text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                {transactions.length} item{transactions.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="stagger rounded-[20px] bg-white px-4 card-shadow">
              <div className="hide-scrollbar max-h-[30rem] overflow-y-auto">
                {transactions.map((transaction) => (
                  <TransactionCard key={transaction.id} transaction={transaction} />
                ))}
                {transactions.length === 0 && (
                  <p className="py-6 text-center text-sm font-bold text-slate-500">No transactions yet.</p>
                )}
              </div>
            </div>
          </section>
        </section>
      </main>
      <BottomNav />
    </>
  );
}
