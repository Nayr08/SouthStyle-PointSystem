'use client';

import { useEffect, useState } from 'react';
import BottomNav from '@/components/BottomNav';
import { OrderCard } from '@/components/OrderCard';
import { PointsDisplay } from '@/components/PointsDisplay';
import { HomeSkeleton } from '@/components/Skeletons';
import { useCustomerData } from '@/lib/customer-data';
import { formatCompactStatValue } from '@/lib/number-format';
import { supabase } from '@/lib/supabase/client';
import { tierMinimum, tierNames, type TierName } from '@/lib/tiers';
import { Order, OrderStatus } from '@/types';
import { ArrowRight, CheckCircle2, ChevronRight, Circle, Clock3, PackageCheck, Paintbrush, Printer, Scissors, ShoppingBag, Star, X, Zap } from 'lucide-react';

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

const tierCardTheme: Record<TierName, { shell: string; border: string; accent: string; badge: string; glow: string }> = {
  Bronze: {
    shell: 'from-[#fff3eb] via-[#f6dccd] to-[#f0c0a0]',
    border: 'from-[#a85a2f] via-[#d28452] to-[#f3b37f]',
    accent: 'text-[#9f4d23]',
    badge: 'bg-[#b86634] text-white',
    glow: 'shadow-[0_14px_30px_-18px_rgba(168,90,47,0.65)]',
  },
  Silver: {
    shell: 'from-[#f7f9fc] via-[#e5ebf3] to-[#d7dee9]',
    border: 'from-[#8d98ab] via-[#c3cad7] to-[#eef2f7]',
    accent: 'text-[#5e6b7f]',
    badge: 'bg-[#8b96a8] text-white',
    glow: 'shadow-[0_14px_30px_-18px_rgba(120,132,150,0.55)]',
  },
  Gold: {
    shell: 'from-[#fff7d6] via-[#ffe89a] to-[#ffd75b]',
    border: 'from-[#c58b00] via-[#f3c51d] to-[#fff1a6]',
    accent: 'text-[#9f6b00]',
    badge: 'bg-[#d6a106] text-white',
    glow: 'shadow-[0_14px_30px_-18px_rgba(214,161,6,0.6)]',
  },
  Platinum: {
    shell: 'from-[#f7fdff] via-[#dff5fb] to-[#cbe9f7]',
    border: 'from-[#8bc6de] via-[#d5f7ff] to-[#9fd4e9]',
    accent: 'text-[#2f6f88]',
    badge: 'bg-[#77bdd6] text-white',
    glow: 'shadow-[0_14px_30px_-18px_rgba(119,189,214,0.55)]',
  },
  Diamond: {
    shell: 'from-[#faf1ff] via-[#e7d4ff] to-[#d8b8ff]',
    border: 'from-[#8b5cf6] via-[#d8b4fe] to-[#f5d0fe]',
    accent: 'text-[#7c3aed]',
    badge: 'bg-[#8b5cf6] text-white',
    glow: 'shadow-[0_14px_30px_-18px_rgba(139,92,246,0.58)]',
  },
  Titanium: {
    shell: 'from-[#f5f5f6] via-[#d8dade] to-[#b6bac2]',
    border: 'from-[#505661] via-[#8e949f] to-[#d5d8df]',
    accent: 'text-[#4b525d]',
    badge: 'bg-[#5b616c] text-white',
    glow: 'shadow-[0_14px_30px_-18px_rgba(91,97,108,0.55)]',
  },
};

const tierOrder: TierName[] = [...tierNames];

const trackingSteps = [
  { key: 'designing', title: 'Designing', description: 'Layout and print file preparation.', icon: Paintbrush },
  { key: 'printing', title: 'Printing', description: 'Your order is being produced.', icon: Printer },
  { key: 'cutting', title: 'Cutting', description: 'Materials are measured and prepared.', icon: Scissors },
  { key: 'ready', title: 'Ready to pick up', description: 'Order is ready at the shop.', icon: PackageCheck },
  { key: 'claimed', title: 'Claimed', description: 'Order has been received.', icon: CheckCircle2 },
];

const statusStepIndex: Record<OrderStatus, number> = {
  pending: 0,
  in_progress: 1,
  ready: 3,
  claimed: 4,
};

type TrackingRow = {
  id: string;
  step_key: string;
  step_name: string;
  sort_order: number;
  status: 'pending' | 'current' | 'done';
  updated_at: string;
};

function formatClaimedDateTime(value: string | null | undefined) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function OrderTrackingModal({ customerId, order, onClose }: { customerId: string; order: Order; onClose: () => void }) {
  const activeIndex = statusStepIndex[order.status];
  const [steps, setSteps] = useState<TrackingRow[]>([]);

  useEffect(() => {
    async function loadTracking() {
      const { data } = await supabase.rpc('customer_order_tracking', {
        p_customer_id: customerId,
        p_order_id: order.id,
      });

      setSteps((data || []) as TrackingRow[]);
    }

    loadTracking();
  }, [customerId, order.id]);

  const displaySteps = steps.length > 0
    ? steps.map((step) => ({
        key: step.step_key,
        title: step.step_name,
        description: trackingSteps.find((item) => item.key === step.step_key)?.description || 'Production step update.',
        icon: trackingSteps.find((item) => item.key === step.step_key)?.icon || Clock3,
        status: step.status,
        updatedAt: step.updated_at,
      }))
    : trackingSteps.map((step, index) => ({
        ...step,
        status: index < activeIndex || order.status === 'claimed' ? 'done' : index === activeIndex ? 'current' : 'pending',
        updatedAt: '',
      }));

  const currentStepKey =
    displaySteps.find((step) => step.status === 'current')?.key ??
    displaySteps.find((step) => step.status !== 'done')?.key ??
    null;

  return (
    <div className="fixed inset-0 z-[90] grid place-items-end bg-black/45 px-5 pb-5 pt-8 backdrop-blur-sm sm:place-items-center">
      <div className="modal-sheet max-h-full w-full max-w-[430px] overflow-hidden rounded-[30px] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-ss-green">Order Tracking</p>
            <h2 className="mt-1 truncate text-xl font-black text-slate-900">{order.items.split(' - ')[0]}</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">Order #{order.orderNumber} • {order.date}</p>
          </div>
          <button onClick={onClose} className="tap-button grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700">
            <X size={18} />
          </button>
        </div>

        <div className="hide-scrollbar max-h-[70svh] overflow-y-auto p-5">
          <div className="mb-5 rounded-2xl bg-emerald-50 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Sub Total</p>
                <p className="mt-1 text-lg font-black text-slate-900">PHP {order.subtotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                <p className="mt-2 text-xs font-semibold text-slate-500">
                  Coupon - PHP {order.couponDiscountAmount.toFixed(2)}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Points - PHP {order.pointsDiscountAmount.toFixed(2)}
                </p>
                <p className="mt-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500">Total</p>
                <p className="mt-1 text-sm font-black text-slate-900">PHP {order.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Payment</p>
                <p className="mt-1 text-sm font-black text-slate-900">
                  {order.paymentStatus === 'paid' ? 'Fully Paid' : order.paymentStatus === 'partial' ? 'Partial Payment' : 'Unpaid'}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Paid PHP {order.paidAmount.toFixed(2)}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Needed for full paid PHP {order.remainingBalance.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-end">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-ss-green">+{order.pointsEarned.toFixed(2)} pts</span>
            </div>
          </div>

          <div>
            {displaySteps.map((step, index) => {
              const Icon = step.icon;
              const effectiveStatus = step.status === 'done' ? 'done' : step.key === currentStepKey ? 'current' : 'pending';
              const isDone = effectiveStatus === 'done';
              const isCurrent = effectiveStatus === 'current';
              const isActive = isDone || isCurrent;

              return (
                <div key={step.key} className="relative flex gap-4 pb-7 last:pb-0">
                  {index < trackingSteps.length - 1 && (
                    <>
                      <div className="absolute left-[22px] top-12 h-full w-1 rounded-full bg-slate-200" />
                      {isDone && <div className="absolute left-[22px] top-12 h-full w-1 rounded-full bg-emerald-500" />}
                    </>
                  )}
                  <div className={`relative z-10 grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 ${isActive ? 'border-ss-green bg-emerald-50 text-ss-green' : 'border-slate-200 bg-white text-slate-300'}`}>
                    {isDone ? <CheckCircle2 size={22} /> : isCurrent ? <Clock3 size={22} /> : <Icon size={22} />}
                  </div>
                  <div className="min-w-0 pt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`text-base font-black ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>{step.title}</p>
                      {isCurrent && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase text-amber-700">Current</span>}
                      {isDone && <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700">Done</span>}
                    </div>
                    <p className={`mt-1 text-xs font-semibold leading-5 ${isActive ? 'text-slate-500' : 'text-slate-400'}`}>{step.description}</p>
                    {step.key === 'claimed' && isDone && formatClaimedDateTime(step.updatedAt) && (
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        Claimed on {formatClaimedDateTime(step.updatedAt)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function AllOrdersModal({ orders, onClose, onSelectOrder }: { orders: Order[]; onClose: () => void; onSelectOrder: (order: Order) => void }) {
  return (
    <div className="fixed inset-0 z-[80] bg-black/45 px-5 py-8 backdrop-blur-sm">
      <div className="modal-pop mx-auto flex max-h-full w-full max-w-[430px] flex-col overflow-hidden rounded-[30px] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div>
            <p className="text-lg font-black text-slate-900">Recent Orders</p>
            <p className="text-xs font-semibold text-slate-500">Tap an order to view tracking.</p>
          </div>
          <button onClick={onClose} className="tap-button grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-700">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3 overflow-y-auto p-5">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} onClick={() => onSelectOrder(order)} />
          ))}
          {orders.length === 0 && (
            <div className="grid place-items-center rounded-2xl bg-slate-50 p-8 text-center">
              <Circle size={26} className="mb-3 text-slate-300" />
              <p className="text-sm font-bold text-slate-500">No recent orders yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TierRoadmapModal({
  currentTier,
  lifetimeEarned,
  nextTier,
  nextTierGap,
  tierProgress,
  onClose,
}: {
  currentTier: TierName;
  lifetimeEarned: number;
  nextTier: TierName;
  nextTierGap: number;
  tierProgress: number;
  onClose: () => void;
}) {
  const currentIndex = tierOrder.indexOf(currentTier);

  return (
    <div className="fixed inset-0 z-[85] bg-black/45 px-5 py-8 backdrop-blur-sm">
      <div className="modal-pop mx-auto flex max-h-full w-full max-w-[430px] flex-col overflow-hidden rounded-[30px] bg-white shadow-2xl">
        <div className={`bg-gradient-to-br ${tierTheme[currentTier].card} p-5 text-white`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-white/70">Tier Roadmap</p>
              <h2 className="mt-1 text-xl font-black">Your loyalty journey</h2>
              <p className="mt-2 text-sm font-semibold text-white/75">
                {nextTier === currentTier
                  ? `You already reached the highest tier: ${currentTier}.`
                  : `${nextTierGap.toLocaleString()} points more to reach ${nextTier}.`}
              </p>
            </div>
            <button onClick={onClose} className="tap-button grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15 text-white">
              <X size={18} />
            </button>
          </div>

          <div className="mt-5 rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/65">Current Tier</p>
                <p className="mt-1 text-lg font-black">{currentTier}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/65">Lifetime Points</p>
                <p className="mt-1 text-lg font-black">{lifetimeEarned.toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/20">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${tierTheme[currentTier].bar}`}
                style={{ width: `${tierProgress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="hide-scrollbar overflow-y-auto p-5">
          <div className="space-y-3">
            {tierOrder.map((tier, index) => {
              const minimum = tierMinimum[tier];
              const pointsNeeded = Math.max(minimum - lifetimeEarned, 0);
              const isCurrent = tier === currentTier;
              const isUnlocked = lifetimeEarned >= minimum;
              const showActiveLine = index < currentIndex;
              const showPendingLine = index >= currentIndex && index < tierOrder.length - 1;
              const theme = tierCardTheme[tier];

              return (
                <div key={tier} className="relative flex gap-4 pb-3 last:pb-0">
                  {index < tierOrder.length - 1 && (
                    <>
                      <div className="absolute left-[19px] top-11 h-full w-1 rounded-full bg-slate-200" />
                      {showActiveLine && <div className="absolute left-[19px] top-11 h-full w-1 rounded-full bg-emerald-500" />}
                      {showPendingLine && <div className="absolute left-[19px] top-11 h-full w-1 rounded-full bg-slate-200" />}
                    </>
                  )}

                  <div
                    className={`relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-2xl border-2 ${
                      isUnlocked ? 'border-emerald-300 bg-emerald-50 text-emerald-600' : 'border-slate-200 bg-white text-slate-400'
                    }`}
                  >
                    <Star size={16} fill="currentColor" />
                  </div>

                  <div
                    className={`flex-1 rounded-[26px] bg-gradient-to-br p-[1.5px] ${theme.border} ${
                      isCurrent ? `${theme.glow} scale-[1.01]` : isUnlocked ? theme.glow : ''
                    } ${isUnlocked ? 'opacity-100' : 'opacity-70'}`}
                  >
                    <div className={`relative overflow-hidden rounded-[25px] bg-gradient-to-br ${theme.shell} p-4`}>
                      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/35 blur-xl" />
                      <div className="absolute bottom-0 left-0 h-16 w-16 rounded-full bg-white/20 blur-lg" />

                      <div className="relative flex items-start justify-between gap-3">
                        <div>
                          <p className={`text-base font-black ${theme.accent}`}>{tier}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-600">
                            Requires {minimum.toLocaleString()} total lifetime points
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${isCurrent ? theme.badge : isUnlocked ? 'bg-slate-900 text-white' : 'bg-white/80 text-slate-500'}`}>
                          {isCurrent ? 'Current' : isUnlocked ? 'Unlocked' : 'Locked'}
                        </span>
                      </div>

                      <div className="relative mt-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Tier Requirement</p>
                          <p className={`mt-1 text-lg font-black ${theme.accent}`}>
                            {minimum.toLocaleString()} pts
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Status</p>
                          <p className="mt-1 text-sm font-black text-slate-700">
                            {isCurrent ? 'You are here' : isUnlocked ? 'Completed' : 'In progress'}
                          </p>
                        </div>
                      </div>

                      <p className="relative mt-3 text-sm font-semibold text-slate-700">
                        {pointsNeeded === 0
                          ? `You already reached ${tier}.`
                          : `To reach ${tier}, you need ${pointsNeeded.toLocaleString()} more points.`}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { profile, orders, transactions, isLoading } = useCustomerData();
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showTierRoadmap, setShowTierRoadmap] = useState(false);

  if (isLoading || !profile) {
    return <HomeSkeleton />;
  }

  const currentTier = profile.tier as TierName;
  const nextTier = tierOrder[Math.min(tierOrder.indexOf(currentTier) + 1, tierOrder.length - 1)];
  const currentMinimum = tierMinimum[currentTier];
  const nextMinimum = tierMinimum[nextTier];
  const nextTierGap = Math.max(nextMinimum - profile.lifetime_earned, 0);
  const tierProgress = currentTier === nextTier
    ? 100
    : Math.max(0, Math.min(Math.round(((profile.lifetime_earned - currentMinimum) / (nextMinimum - currentMinimum)) * 100), 100));
  const earned = transactions.filter((transaction) => transaction.type === 'earn').reduce((total, transaction) => total + transaction.amount, 0);
  const redeemed = transactions.filter((transaction) => transaction.type === 'redeem').reduce((total, transaction) => total + transaction.amount, 0);
  const earnedDisplay = Math.abs(earned) < 0.005 ? 0 : earned;
  const redeemedDisplay = Math.abs(redeemed) < 0.005 ? 0 : redeemed;

  return (
    <>
      <main className="animate-page phone-shell bg-white pb-28">
        <section className="animate-hero green-hero rounded-b-[34px] px-5 pb-18 pt-5 text-white">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-white/75">Welcome back</p>
              <p className="mt-1 text-xl font-black tracking-tight">{profile.full_name}</p>
            </div>
            <div className="h-10 w-10" aria-hidden="true" />
          </div>
          <PointsDisplay points={Number(profile.points_balance)} tier={currentTier} />
        </section>

        <div className="stagger px-5 pt-9">
          <button
            type="button"
            onClick={() => setShowTierRoadmap(true)}
            className={`tap-card mb-6 block w-full rounded-2xl border border-white/10 bg-gradient-to-br ${tierTheme[currentTier].card} p-5 text-left shadow-lg shadow-slate-950/15`}
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-black text-white">Path to {nextTier} Tier</p>
              <div className="flex items-center gap-2">
                <p className={`text-sm font-black ${tierTheme[currentTier].text}`}>{tierProgress}%</p>
                <ChevronRight size={16} className={tierTheme[currentTier].text} />
              </div>
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
            <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-white/55">Tap to view all tier stages</p>
          </button>

          <section className="tap-card mb-6 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-5">
            <div className="mb-4 flex items-center gap-2">
              <Zap size={20} className="text-ss-green" />
              <h2 className="text-sm font-black text-slate-900">Monthly Activity</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="overflow-hidden rounded-xl bg-white p-3 text-center shadow-sm">
                <p
                  title={`+${earnedDisplay.toLocaleString()}`}
                  className="truncate text-xl font-black tabular-nums text-ss-green"
                >
                  +{formatCompactStatValue(earnedDisplay)}
                </p>
                <p className="mt-1 text-[11px] font-semibold text-slate-500">Earned</p>
              </div>
              <div className="overflow-hidden rounded-xl bg-white p-3 text-center shadow-sm">
                <p title={String(orders.length)} className="truncate text-xl font-black text-slate-900">{orders.length}</p>
                <p className="mt-1 text-[11px] font-semibold text-slate-500">Purchases</p>
              </div>
              <div className="overflow-hidden rounded-xl bg-white p-3 text-center shadow-sm">
                <p
                  title={`${redeemedDisplay > 0 ? '-' : ''}${redeemedDisplay.toLocaleString()}`}
                  className="truncate text-xl font-black tabular-nums text-rose-500"
                >
                  {redeemedDisplay > 0 ? '-' : ''}
                  {formatCompactStatValue(redeemedDisplay)}
                </p>
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
              <button onClick={() => setShowAllOrders(true)} className="tap-button flex items-center gap-1 text-xs font-black uppercase text-ss-green">
                View all <ArrowRight size={14} />
              </button>
            </div>
            <div className="stagger space-y-3">
              {orders.slice(0, 3).map((order) => (
                <OrderCard key={order.id} order={order} onClick={() => setSelectedOrder(order)} />
              ))}
              {orders.length === 0 && (
                <p className="rounded-2xl bg-slate-50 p-5 text-center text-sm font-bold text-slate-500">No recent orders yet.</p>
              )}
            </div>
          </section>
        </div>
      </main>
      {showAllOrders && (
        <AllOrdersModal
          orders={orders}
          onClose={() => setShowAllOrders(false)}
          onSelectOrder={(order) => {
            setShowAllOrders(false);
            setSelectedOrder(order);
          }}
        />
      )}
      {showTierRoadmap && (
        <TierRoadmapModal
          currentTier={currentTier}
          lifetimeEarned={profile.lifetime_earned}
          nextTier={nextTier}
          nextTierGap={nextTierGap}
          tierProgress={tierProgress}
          onClose={() => setShowTierRoadmap(false)}
        />
      )}
      {selectedOrder && <OrderTrackingModal customerId={profile.id} order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
      <BottomNav />
    </>
  );
}
