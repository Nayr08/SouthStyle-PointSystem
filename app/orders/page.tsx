'use client';

import { useState } from 'react';
import BottomNav from '@/components/BottomNav';
import {
  ArrowLeft,
  ArrowRight,
  BadgePercent,
  Brush,
  CalendarDays,
  CheckCircle2,
  Gift,
  MinusCircle,
  ReceiptText,
  TicketPercent,
  X,
} from 'lucide-react';
import Link from 'next/link';

const points = 12429;

const rewards = [
  {
    id: 'print-50',
    name: 'PHP 50 Print Discount',
    cost: 40,
    limit: '2x available this month',
    icon: TicketPercent,
    cardClass: 'from-emerald-600 to-teal-700',
    note: 'Use on any paid printing order.',
  },
  {
    id: 'print-100',
    name: 'PHP 100 Print Discount',
    cost: 80,
    limit: '2x available this month',
    icon: BadgePercent,
    cardClass: 'from-lime-600 to-emerald-700',
    note: 'Best for bulk print orders.',
  },
  {
    id: 'layout-free',
    name: 'Free Layout Service',
    cost: 100,
    limit: '2x available this month',
    icon: Brush,
    cardClass: 'from-slate-800 to-emerald-900',
    note: 'Redeem before staff starts layout work.',
  },
];

const redeemHistory = [
  {
    id: 'r1',
    type: 'coupon',
    title: 'PHP 50 Print Discount',
    description: 'Coupon redeemed for Order #1024',
    date: 'Today, 2:30 PM',
    amount: 40,
  },
  {
    id: 'r2',
    type: 'deduct',
    title: 'Points Used as Payment',
    description: 'Deducted from Tarpaulin Print total',
    date: 'Today, 9:15 AM',
    amount: 120,
  },
  {
    id: 'r3',
    type: 'coupon',
    title: 'Free Layout Service',
    description: 'Coupon redeemed for custom hoodie layout',
    date: 'Apr 19',
    amount: 100,
  },
  {
    id: 'r4',
    type: 'deduct',
    title: 'Points Used as Payment',
    description: 'Deducted from sticker order balance',
    date: 'Apr 15',
    amount: 85,
  },
];

function RedeemHistoryItem({ item }: { item: (typeof redeemHistory)[number] }) {
  const Icon = item.type === 'coupon' ? Gift : MinusCircle;
  const iconClass = item.type === 'coupon' ? 'from-emerald-100 to-teal-100 text-emerald-700' : 'from-rose-100 to-orange-100 text-rose-700';

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex gap-4">
        <div className={`h-fit rounded-xl bg-gradient-to-br ${iconClass} p-3`}>
          <Icon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-900">{item.title}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{item.date}</p>
            </div>
            <p className="shrink-0 rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-600">-{item.amount} pts</p>
          </div>
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">{item.description}</p>
        </div>
      </div>
    </article>
  );
}

export default function OrdersPage() {
  const [showHistory, setShowHistory] = useState(false);
  const [selectedReward, setSelectedReward] = useState<(typeof rewards)[number] | null>(null);

  return (
    <>
      <main className="phone-shell bg-white pb-28">
        <header className="green-hero rounded-b-[30px] px-5 pb-14 pt-5 text-white">
          <div className="mb-5 flex items-center justify-between">
            <Link href="/" className="grid h-10 w-10 place-items-center rounded-xl border border-white/20 bg-white/10 backdrop-blur">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-lg font-black">Redeem Points</h1>
            <button className="grid h-10 w-10 place-items-center rounded-xl border border-white/20 bg-white/10 backdrop-blur" title="Rewards">
              <Gift size={19} />
            </button>
          </div>

          <div className="overflow-hidden rounded-[26px] border border-white/25 bg-white/12 p-4 shadow-2xl shadow-green-950/25 backdrop-blur-xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/65">Available Points</p>
            <div className="mt-2 flex items-end gap-2">
              <strong className="text-[34px] font-black leading-none tracking-tight text-white">
                {points.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </strong>
              <span className="pb-1 text-xs font-bold text-white/70">points</span>
            </div>
            <p className="mt-3 text-sm font-black text-emerald-200">Worth PHP {points.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
        </header>

        <section className="px-5 pt-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">Available Rewards</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">Coupons reduce points first, then staff confirms use at checkout.</p>
            </div>
          </div>

          <div className="-mx-5 mb-7 flex gap-3 overflow-x-auto px-5 pb-2 hide-scrollbar">
            {rewards.map((reward) => {
              const Icon = reward.icon;
              return (
                <button
                  key={reward.id}
                  onClick={() => setSelectedReward(reward)}
                  className={`min-h-[178px] min-w-[248px] rounded-[26px] bg-gradient-to-br ${reward.cardClass} p-5 text-left text-white shadow-xl shadow-emerald-900/15`}
                >
                  <div className="flex h-full flex-col justify-between">
                    <div>
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <Icon size={32} className="text-white" strokeWidth={2.4} />
                        <span className="rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-black backdrop-blur">{reward.cost} pts</span>
                      </div>
                      <p className="text-base font-black leading-5">{reward.name}</p>
                      <p className="mt-2 text-xs font-semibold leading-5 text-white/75">{reward.note}</p>
                    </div>
                    <div className="mt-5 flex items-center gap-2 border-t border-white/15 pt-3 text-xs font-bold text-white/75">
                      <CalendarDays size={14} className="text-white" />
                      {reward.limit}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <section className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ReceiptText size={20} className="text-ss-green" />
                <h2 className="text-lg font-black text-slate-900">Redeem History</h2>
              </div>
              <button onClick={() => setShowHistory(true)} className="flex items-center gap-1 text-xs font-black uppercase text-ss-green">
                View all <ArrowRight size={14} />
              </button>
            </div>
            <div className="space-y-3">
              {redeemHistory.slice(0, 3).map((item) => (
                <RedeemHistoryItem key={item.id} item={item} />
              ))}
            </div>
          </section>
        </section>
      </main>

      {showHistory && (
        <div className="fixed inset-0 z-[80] bg-black/45 px-5 py-8 backdrop-blur-sm">
          <div className="mx-auto flex max-h-full w-full max-w-[430px] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <p className="text-lg font-black text-slate-900">Redeem Points</p>
                <p className="text-xs font-semibold text-slate-500">Full redemption history</p>
              </div>
              <button onClick={() => setShowHistory(false)} className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-700">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3 overflow-y-auto p-5">
              {redeemHistory.map((item) => (
                <RedeemHistoryItem key={item.id} item={item} />
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedReward && (
        <div className="fixed inset-0 z-[90] grid place-items-end bg-black/45 px-5 pb-5 pt-8 backdrop-blur-sm sm:place-items-center">
          <div className="w-full max-w-[430px] overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className={`bg-gradient-to-br ${selectedReward.cardClass} p-5 text-white`}>
              <div className="mb-5 flex items-start justify-between gap-4">
                <selectedReward.icon size={34} className="text-white" strokeWidth={2.4} />
                <button onClick={() => setSelectedReward(null)} className="grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur">
                  <X size={18} />
                </button>
              </div>
              <p className="text-xl font-black">{selectedReward.name}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-white/75">{selectedReward.note}</p>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-emerald-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Cost</p>
                  <p className="mt-1 text-lg font-black text-ss-green">{selectedReward.cost} pts</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Limit</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{selectedReward.limit}</p>
                </div>
              </div>
              <p className="mt-4 text-xs font-semibold leading-5 text-slate-500">
                Staff will confirm this claim before applying the coupon to the order.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button onClick={() => setSelectedReward(null)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700">
                  Cancel
                </button>
                <button onClick={() => setSelectedReward(null)} className="rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-black text-white shadow-lg shadow-emerald-900/20">
                  Redeem
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
