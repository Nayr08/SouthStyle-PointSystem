'use client';

import BottomNav from '@/components/BottomNav';
import { OrderCard } from '@/components/OrderCard';
import { PointsDisplay } from '@/components/PointsDisplay';
import { HomeSkeleton } from '@/components/Skeletons';
import { useDemoLoading } from '@/components/useDemoLoading';
import { Customer, Order } from '@/types';
import { ArrowRight, Bell, ShoppingBag, Zap } from 'lucide-react';

const customer: Customer = {
  id: '1',
  name: 'Pristia Candra',
  businessName: 'Retailer Jaya Abadi',
  phone: '0917 555 0148',
  points: 12429,
  memberSince: 'Member since June 2024',
  cardId: 'SS-RFID-000123',
};

const activeOrders: Order[] = [
  {
    id: '1',
    orderNumber: '1024',
    date: 'Today, 2:30 PM',
    status: 'in_progress',
    items: 'Sublimation Shirt Bundle - 24 pcs, front and back print',
    total: 563,
    pointsEarned: 5.63,
  },
  {
    id: '2',
    orderNumber: '1025',
    date: 'Today, 9:15 AM',
    status: 'ready',
    items: 'Tarpaulin Print - 3x6 ft, birthday layout included',
    total: 850,
    pointsEarned: 8.5,
  },
  {
    id: '3',
    orderNumber: '1018',
    date: 'Apr 19',
    status: 'claimed',
    items: 'Custom Hoodie - Black, Size L',
    total: 1250,
    pointsEarned: 12.5,
  },
];

type TierName = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Titanium';

const currentTier: TierName = 'Platinum';
const nextTier: TierName = 'Diamond';
const tierProgress = 62;
const nextTierGap = 7571;

const tierTheme: Record<TierName, { card: string; bar: string; text: string }> = {
  Bronze: {
    card: 'from-[#4a2a16] to-[#8a4f24]',
    bar: 'from-[#cd7f32] to-[#f0b071]',
    text: 'text-[#ffd2a1]',
  },
  Silver: {
    card: 'from-slate-500 to-slate-800',
    bar: 'from-slate-200 to-slate-500',
    text: 'text-slate-100',
  },
  Gold: {
    card: 'from-[#5a3a09] to-[#b87912]',
    bar: 'from-amber-300 to-orange-500',
    text: 'text-amber-200',
  },
  Platinum: {
    card: 'from-[#164e63] to-[#1e3a8a]',
    bar: 'from-cyan-200 via-sky-300 to-blue-500',
    text: 'text-cyan-100',
  },
  Diamond: {
    card: 'from-[#164e63] via-[#2563eb] to-[#7c3aed]',
    bar: 'from-sky-200 via-cyan-300 to-violet-400',
    text: 'text-sky-100',
  },
  Titanium: {
    card: 'from-zinc-700 via-zinc-500 to-neutral-900',
    bar: 'from-zinc-100 via-zinc-300 to-zinc-600',
    text: 'text-zinc-50',
  },
};

export default function Home() {
  const isLoading = useDemoLoading();

  if (isLoading) {
    return <HomeSkeleton />;
  }

  return (
    <>
      <main className="animate-page phone-shell bg-white pb-28">
        <section className="animate-hero green-hero rounded-b-[34px] px-5 pb-24 pt-6 text-white">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-white/75">Welcome back</p>
              <p className="mt-1 text-xl font-black tracking-tight">{customer.name}</p>
              <p className="mt-1 text-sm font-medium text-white/75">{customer.businessName}</p>
            </div>
            <button className="tap-button grid h-10 w-10 place-items-center rounded-xl border border-white/20 bg-white/10 text-white backdrop-blur" title="Notifications">
              <Bell size={19} />
            </button>
          </div>
          <PointsDisplay points={customer.points} memberSince={customer.memberSince} tier={currentTier} />
        </section>

        <div className="stagger px-5 pt-18">
          <section className={`tap-card mb-6 rounded-2xl border border-white/10 bg-gradient-to-br ${tierTheme[currentTier].card} p-5 shadow-lg shadow-slate-950/15`}>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-black text-white">Path to {nextTier} Tier</p>
              <p className={`text-sm font-black ${tierTheme[currentTier].text}`}>{tierProgress}%</p>
            </div>
            <div className="mb-4 h-2 overflow-hidden rounded-full bg-black/30">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${tierTheme[currentTier].bar}`}
                style={{ width: `${tierProgress}%` }}
              />
            </div>
            <p className="text-sm font-semibold text-white/70">
              <span className="font-black text-white">{nextTierGap.toLocaleString()} points</span> until {nextTier} benefits unlock
            </p>
          </section>

          <section className="tap-card mb-6 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-5">
            <div className="mb-4 flex items-center gap-2">
              <Zap size={20} className="text-ss-green" />
              <h2 className="text-sm font-black text-slate-900">Monthly Activity</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-white p-3 text-center shadow-sm">
                <p className="text-xl font-black text-ss-green">+2,340</p>
                <p className="mt-1 text-[11px] font-semibold text-slate-500">Earned</p>
              </div>
              <div className="rounded-xl bg-white p-3 text-center shadow-sm">
                <p className="text-xl font-black text-slate-900">12</p>
                <p className="mt-1 text-[11px] font-semibold text-slate-500">Purchases</p>
              </div>
              <div className="rounded-xl bg-white p-3 text-center shadow-sm">
                <p className="text-xl font-black text-rose-500">-800</p>
                <p className="mt-1 text-[11px] font-semibold text-slate-500">Redeemed</p>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
                <ShoppingBag size={19} className="text-ss-green" />
                Recent Orders
              </h2>
              <a href="/orders" className="tap-button flex items-center gap-1 text-xs font-black uppercase text-ss-green">
                View all <ArrowRight size={14} />
              </a>
            </div>
            <div className="stagger space-y-3">
              {activeOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          </section>
        </div>
      </main>
      <BottomNav />
    </>
  );
}
