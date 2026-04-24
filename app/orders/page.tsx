'use client';

import { useEffect, useState } from 'react';
import BottomNav from '@/components/BottomNav';
import { RedeemSkeleton } from '@/components/Skeletons';
import { useCustomerData } from '@/lib/customer-data';
import { supabase } from '@/lib/supabase/client';
import { type TierName } from '@/lib/tiers';
import {
  ArrowRight,
  BadgePercent,
  Brush,
  CalendarDays,
  Gift,
  MinusCircle,
  ReceiptText,
  TicketPercent,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

type Reward = {
  id: string;
  name: string;
  cost: number;
  limit: string;
  remaining: number;
  icon: typeof TicketPercent;
  cardClass: string;
  note: string;
  minimumTier: TierName;
};

type RedeemHistory = {
  id: string;
  type: 'coupon' | 'deduct';
  title: string;
  description: string;
  date: string;
  amount: number;
  status?: string;
  claimCode?: string | null;
  discountAmount?: number | null;
};

function RedeemHistoryItem({ item, onClick }: { item: RedeemHistory; onClick?: () => void }) {
  const Icon = item.type === 'coupon' ? Gift : MinusCircle;
  const iconClass = item.type === 'coupon' ? 'from-emerald-100 to-teal-100 text-emerald-700' : 'from-rose-100 to-orange-100 text-rose-700';

  const content = (
    <>
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
          {item.type === 'coupon' && item.claimCode && (
            <p className="mt-2 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700">Tap to view claim code</p>
          )}
        </div>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="tap-card w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm">
        {content}
      </button>
    );
  }

  return <article className="tap-card rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">{content}</article>;
}

export default function OrdersPage() {
  const { profile, transactions, isLoading, refresh } = useCustomerData();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [isRewardsLoading, setIsRewardsLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [couponHistory, setCouponHistory] = useState<RedeemHistory[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<RedeemHistory | null>(null);
  const [claimError, setClaimError] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    async function loadRewards() {
      if (!profile) return;
      setIsRewardsLoading(true);
      const [couponsResult, historyResult] = await Promise.all([
        supabase.rpc('customer_available_coupons', { p_customer_id: profile.id }),
        supabase.rpc('customer_coupon_history', { p_customer_id: profile.id }),
      ]);

      setRewards(
        ((couponsResult.data || []) as Array<{
          id: string;
          name: string;
          description: string | null;
          reward_type: string;
          points_cost: number;
          monthly_limit: number;
          remaining_this_month: number;
          minimum_tier: TierName;
        }>).map((coupon, index) => ({
          id: coupon.id,
          name: coupon.name,
          cost: Number(coupon.points_cost),
          limit: `${coupon.remaining_this_month}x available this month`,
          remaining: coupon.remaining_this_month,
          icon: index % 3 === 0 ? TicketPercent : index % 3 === 1 ? BadgePercent : Brush,
          cardClass: index % 3 === 0 ? 'from-emerald-600 to-teal-700' : index % 3 === 1 ? 'from-lime-600 to-emerald-700' : 'from-slate-800 to-emerald-900',
          note: coupon.description || 'Redeem with your Suki points.',
          minimumTier: coupon.minimum_tier,
        })),
      );

      setCouponHistory(
        ((historyResult.data || []) as Array<{
          id: string;
          coupon_name: string;
          discount_amount: number | null;
          claim_code: string | null;
          points_spent: number;
          status: string;
          claimed_date: string;
        }>).map((item) => ({
          id: item.id,
          type: 'coupon',
          title: item.coupon_name,
          description: item.status === 'used' ? 'Coupon already applied to an order.' : 'Coupon claimed from Suki rewards.',
          date: item.claimed_date,
          amount: Number(item.points_spent),
          status: item.status,
          claimCode: item.claim_code,
          discountAmount: item.discount_amount ? Number(item.discount_amount) : null,
        })),
      );
      setIsRewardsLoading(false);
    }

    loadRewards();
  }, [profile]);

  if (isLoading || isRewardsLoading || !profile) {
    return <RedeemSkeleton />;
  }

  const redeemHistory: RedeemHistory[] = [
    ...couponHistory,
    ...transactions
      .filter((transaction) => transaction.type === 'redeem' && !transaction.description.startsWith('Coupon redeemed:'))
      .map((transaction) => ({
        id: transaction.id,
        type: 'deduct' as const,
        title: 'Points Used',
        description: transaction.description,
        date: transaction.date,
        amount: transaction.amount,
      })),
  ];
  const redeemPreview = redeemHistory.slice(0, 3);

  const claimCoupon = async () => {
    if (!profile || !selectedReward) return;

    setClaimError('');
    setIsClaiming(true);
    const claimedName = selectedReward.name;

    const { error } = await supabase.rpc('customer_claim_coupon', {
      p_customer_id: profile.id,
      p_coupon_id: selectedReward.id,
    });

    setIsClaiming(false);

    if (error) {
      setClaimError(error.message || 'Could not redeem coupon.');
      return;
    }

    setSelectedReward(null);
    await refresh();
    toast.success(`${claimedName} claimed`);
  };

  return (
    <>
      <main className="animate-page phone-shell bg-white pb-28">
        <header className="animate-hero green-hero rounded-b-[30px] px-5 pb-14 pt-5 text-white">
          <div className="mb-5 flex items-center justify-between">
            <button className="tap-button grid h-10 w-10 place-items-center rounded-xl border border-white/20 bg-white/10 backdrop-blur" title="Rewards">
              <Gift size={19} />
            </button>
            <h1 className="text-lg font-black">Redeem Points</h1>
            <div className="h-10 w-10" aria-hidden="true" />
          </div>

          <div className="animate-rise tap-card overflow-hidden rounded-[26px] border border-white/25 bg-white/12 p-4 shadow-2xl shadow-green-950/25 backdrop-blur-xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/65">Available Points</p>
            <div className="mt-2 flex items-end gap-2">
              <strong className="text-[34px] font-black leading-none tracking-tight text-white">
                {Number(profile.points_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </strong>
              <span className="pb-1 text-xs font-bold text-white/70">points</span>
            </div>
            <p className="mt-3 text-sm font-black text-emerald-200">Worth PHP {Number(profile.points_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
        </header>

        <section className="px-5 pt-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">Available Rewards</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">Coupons reduce points first, then staff confirms use at checkout.</p>
            </div>
          </div>

          <div className="stagger -mx-5 mb-7 flex gap-3 overflow-x-auto px-5 pb-2 hide-scrollbar">
            {rewards.map((reward) => {
              const Icon = reward.icon;
              return (
                <button
                  key={reward.id}
                  onClick={() => setSelectedReward(reward)}
                  disabled={reward.remaining <= 0}
                  className={`tap-card min-h-[178px] min-w-[248px] rounded-[26px] bg-gradient-to-br ${reward.cardClass} p-5 text-left text-white shadow-xl shadow-emerald-900/15`}
                >
                  <div className="flex h-full flex-col justify-between">
                    <div>
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <Icon size={32} className="text-white" strokeWidth={2.4} />
                        <div className="flex flex-col items-end gap-2">
                          <span className="rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-black backdrop-blur">{reward.cost} pts</span>
                          <span className="rounded-full border border-white/20 bg-black/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/85">
                            {reward.minimumTier}+ tier
                          </span>
                        </div>
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

          <section className="animate-rise rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ReceiptText size={20} className="text-ss-green" />
                <h2 className="text-lg font-black text-slate-900">Redeem History</h2>
              </div>
              {redeemHistory.length > 3 && (
                <button onClick={() => setShowHistory(true)} className="tap-button flex items-center gap-1 text-xs font-black uppercase text-ss-green">
                  View all <ArrowRight size={14} />
                </button>
              )}
            </div>
            <div className="stagger space-y-3">
              {redeemPreview.map((item) => (
                <RedeemHistoryItem key={item.id} item={item} onClick={item.type === 'coupon' ? () => setSelectedHistoryItem(item) : undefined} />
              ))}
              {redeemHistory.length === 0 && (
                <p className="rounded-2xl bg-white p-5 text-center text-sm font-bold text-slate-500">No redemptions yet.</p>
              )}
            </div>
          </section>
        </section>
      </main>

      {showHistory && (
        <div className="fixed inset-0 z-[80] bg-black/45 px-5 py-8 backdrop-blur-sm">
          <div className="modal-pop mx-auto flex max-h-full w-full max-w-[430px] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <p className="text-lg font-black text-slate-900">Redeem Points</p>
                <p className="text-xs font-semibold text-slate-500">Full redemption history</p>
              </div>
              <button onClick={() => setShowHistory(false)} className="tap-button grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-700">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3 overflow-y-auto p-5">
              {redeemHistory.map((item) => (
                <RedeemHistoryItem key={item.id} item={item} onClick={item.type === 'coupon' ? () => setSelectedHistoryItem(item) : undefined} />
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedHistoryItem && (
        <div className="fixed inset-0 z-[90] grid place-items-end bg-black/45 px-5 pb-5 pt-8 backdrop-blur-sm sm:place-items-center">
          <div className="modal-sheet w-full max-w-[430px] overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white">
              <div className="mb-5 flex items-start justify-between gap-4">
                <Gift size={34} className="text-white" strokeWidth={2.4} />
                <button onClick={() => setSelectedHistoryItem(null)} className="tap-button grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur">
                  <X size={18} />
                </button>
              </div>
              <p className="text-xl font-black">{selectedHistoryItem.title}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-white/75">
                {selectedHistoryItem.status === 'used' ? 'This coupon was already used.' : 'Show this claim code to staff when adding your order.'}
              </p>
            </div>
            <div className="p-5">
              <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Claim Code</p>
                <p className="mt-3 text-3xl font-black tracking-[0.18em] text-ss-green">{selectedHistoryItem.claimCode || 'Unavailable'}</p>
                <p className="mt-2 text-xs font-semibold text-slate-500">{selectedHistoryItem.date}</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Status</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{selectedHistoryItem.status || 'claimed'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Discount</p>
                  <p className="mt-1 text-sm font-black text-slate-900">
                    {selectedHistoryItem.discountAmount ? `PHP ${selectedHistoryItem.discountAmount.toFixed(2)}` : 'Applied by staff'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedReward && (
        <div className="fixed inset-0 z-[90] grid place-items-end bg-black/45 px-5 pb-5 pt-8 backdrop-blur-sm sm:place-items-center">
          <div className="modal-sheet w-full max-w-[430px] overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className={`bg-gradient-to-br ${selectedReward.cardClass} p-5 text-white`}>
              <div className="mb-5 flex items-start justify-between gap-4">
                <selectedReward.icon size={34} className="text-white" strokeWidth={2.4} />
                <button onClick={() => setSelectedReward(null)} className="tap-button grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur">
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
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Tier</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{selectedReward.minimumTier} and above</p>
                </div>
              </div>
              <p className="mt-4 text-xs font-semibold leading-5 text-slate-500">
                Staff will confirm this claim before applying the coupon to the order.
              </p>
              {claimError && <p className="notice-pop mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{claimError}</p>}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button onClick={() => setSelectedReward(null)} className="tap-button rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700">
                  Cancel
                </button>
                <button onClick={claimCoupon} disabled={isClaiming || selectedReward.remaining <= 0} className="tap-button rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-black text-white shadow-lg shadow-emerald-900/20 disabled:opacity-50">
                  {selectedReward.remaining <= 0 ? 'Limit Reached' : isClaiming ? 'Redeeming...' : 'Redeem'}
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
