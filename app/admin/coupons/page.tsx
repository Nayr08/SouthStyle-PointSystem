'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Gift, PhilippinePeso, Plus, Sparkles, TicketPercent, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminInput, AdminShell, FieldShell, useStaffSession } from '@/components/AdminShell';
import { tierNames, type TierName } from '@/lib/tiers';
import { supabase } from '@/lib/supabase/client';

type Coupon = {
  id: string;
  name: string;
  description: string | null;
  reward_type: 'discount' | 'free_service';
  points_cost: number;
  discount_amount: number | null;
  monthly_limit: number;
  minimum_tier: TierName;
  is_active: boolean;
};

type CouponRedemption = {
  id: string;
  coupon_name: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  claim_code: string;
  points_spent: number;
  status: 'claimed' | 'used' | 'expired' | 'cancelled';
  claimed_at_label: string;
  used_at_label: string | null;
};

type CatalogFilter = 'available' | 'used';

const tierBadgeStyles: Record<TierName, string> = {
  Bronze: 'border-[#f0b071]/40 bg-[#8a4f24]/15 text-[#8a4f24]',
  Silver: 'border-slate-200 bg-slate-100 text-slate-700',
  Gold: 'border-amber-200 bg-amber-100 text-amber-700',
  Platinum: 'border-cyan-200 bg-cyan-100 text-cyan-700',
  Diamond: 'border-sky-200 bg-sky-100 text-sky-700',
  Titanium: 'border-zinc-200 bg-zinc-100 text-zinc-700',
};

export default function CouponsPage() {
  const { staff } = useStaffSession();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [redemptions, setRedemptions] = useState<CouponRedemption[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rewardType, setRewardType] = useState<'discount' | 'free_service'>('discount');
  const [pointsCost, setPointsCost] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [monthlyLimit, setMonthlyLimit] = useState('2');
  const [minimumTier, setMinimumTier] = useState<TierName>('Bronze');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [catalogFilter, setCatalogFilter] = useState<CatalogFilter>('available');

  const loadCoupons = async () => {
    setIsLoading(true);
    const [couponsResult, redemptionsResult] = await Promise.all([
      supabase.rpc('admin_list_coupons'),
      supabase.rpc('admin_coupon_redemptions'),
    ]);

    setCoupons((((couponsResult.data as Coupon[] | null) || [])).map((coupon) => ({
      ...coupon,
      points_cost: Number(coupon.points_cost),
      discount_amount: coupon.discount_amount === null ? null : Number(coupon.discount_amount),
    })));

    setRedemptions((((redemptionsResult.data as CouponRedemption[] | null) || [])).map((redemption) => ({
      ...redemption,
      points_spent: Number(redemption.points_spent),
    })));
    setIsLoading(false);
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadCoupons();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!staff) return;

    setError('');
    setIsSaving(true);

    const { error: couponError } = await supabase.rpc('admin_create_coupon', {
      p_staff_id: staff.id,
      p_name: name.trim(),
      p_description: description.trim() || null,
      p_reward_type: rewardType,
      p_points_cost: Number(pointsCost),
      p_discount_amount: rewardType === 'discount' ? Number(discountAmount || 0) : null,
      p_monthly_limit: Number(monthlyLimit),
      p_minimum_tier: minimumTier,
    });

    setIsSaving(false);

    if (couponError) {
      setError(couponError.message || 'Could not save coupon.');
      return;
    }

    setName('');
    setDescription('');
    setPointsCost('');
    setDiscountAmount('');
    setMonthlyLimit('2');
    setMinimumTier('Bronze');
    toast.success('Coupon saved successfully');
    await loadCoupons();
  };

  const availableCoupons = useMemo(
    () => coupons.filter((coupon) => coupon.is_active),
    [coupons],
  );

  const usedRedemptions = useMemo(
    () => redemptions.filter((redemption) => redemption.status === 'used'),
    [redemptions],
  );

  const catalogCount = catalogFilter === 'available' ? availableCoupons.length : usedRedemptions.length;

  return (
    <AdminShell title="Set Coupons" subtitle="Create and manage premium Suki reward coupons.">
      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.95fr]">
        <form onSubmit={handleSubmit} className="modal-pop rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-ss-green">Create Reward</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">Build a Coupon</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Set the reward value, points cost, tier access, and monthly redemption limit in one polished flow.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldShell label="Coupon Name">
              <AdminInput>
                <Gift size={18} className="text-ss-green" />
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="PHP 50 Print Discount"
                  className="min-w-0 flex-1 bg-transparent text-sm font-black text-slate-900 outline-none placeholder:text-slate-400"
                />
              </AdminInput>
            </FieldShell>

            <FieldShell label="Reward Type">
              <select
                value={rewardType}
                onChange={(event) => setRewardType(event.target.value as 'discount' | 'free_service')}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-black text-slate-900 outline-none"
              >
                <option value="discount">Discount</option>
                <option value="free_service">Free Service</option>
              </select>
            </FieldShell>

            <FieldShell label="Points Cost">
              <AdminInput>
                <Sparkles size={18} className="text-ss-green" />
                <input
                  value={pointsCost}
                  onChange={(event) => setPointsCost(event.target.value)}
                  inputMode="decimal"
                  placeholder="40"
                  className="min-w-0 flex-1 bg-transparent text-sm font-black text-slate-900 outline-none placeholder:text-slate-400"
                />
              </AdminInput>
            </FieldShell>

            <FieldShell label="Discount Amount">
              <AdminInput>
                <PhilippinePeso size={18} className="text-ss-green" />
                <input
                  value={discountAmount}
                  onChange={(event) => setDiscountAmount(event.target.value)}
                  inputMode="decimal"
                  disabled={rewardType !== 'discount'}
                  placeholder="50"
                  className="min-w-0 flex-1 bg-transparent text-sm font-black text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-40"
                />
              </AdminInput>
            </FieldShell>

            <FieldShell label="Monthly Limit">
              <AdminInput>
                <Plus size={18} className="text-ss-green" />
                <input
                  value={monthlyLimit}
                  onChange={(event) => setMonthlyLimit(event.target.value)}
                  inputMode="numeric"
                  placeholder="2"
                  className="min-w-0 flex-1 bg-transparent text-sm font-black text-slate-900 outline-none placeholder:text-slate-400"
                />
              </AdminInput>
            </FieldShell>

            <FieldShell label="Minimum Tier">
              <select
                value={minimumTier}
                onChange={(event) => setMinimumTier(event.target.value as TierName)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-black text-slate-900 outline-none"
              >
                {tierNames.map((tier) => (
                  <option key={tier} value={tier}>{tier}</option>
                ))}
              </select>
            </FieldShell>
          </div>

          <div className={`mt-4 rounded-[24px] border p-4 ${rewardType === 'discount' ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Reward Preview</p>
                <p className="mt-1 text-sm font-black text-slate-900">
                  {rewardType === 'discount' ? 'Discount coupon for paid orders' : 'Free service reward'}
                </p>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                  Customers will spend {pointsCost || '0'} points and need at least {minimumTier} tier to unlock this reward.
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-ss-green shadow-sm">
                {rewardType === 'discount' ? `${discountAmount || '0'} PHP off` : 'Service perk'}
              </span>
            </div>
          </div>

          <FieldShell label="Description">
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Use on any paid printing order."
              className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400"
            />
          </FieldShell>

          {error && <p className="notice-pop mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-600">{error}</p>}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setName('');
                setDescription('');
                setPointsCost('');
                setDiscountAmount('');
                setMonthlyLimit('2');
                setMinimumTier('Bronze');
                setError('');
              }}
              className="tap-button rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-700"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="tap-button flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#078b3e,#10b981)] px-5 py-4 text-sm font-black text-white shadow-lg shadow-emerald-900/15 disabled:opacity-60"
            >
              <TicketPercent size={18} />
              {isSaving ? 'Saving...' : 'Save Coupon'}
            </button>
          </div>
        </form>

        <section className="modal-pop rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-ss-green">Live Catalog</p>
              <h2 className="mt-1 text-xl font-black text-slate-900">
                {catalogFilter === 'available' ? 'Available Coupons' : 'Used Coupons'}
              </h2>
            </div>
            <div className="rounded-2xl bg-[#f4f8f4] px-4 py-3 text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                {catalogFilter === 'available' ? 'Available' : 'Used'}
              </p>
              <p className="mt-1 text-lg font-black text-slate-900">{catalogCount}</p>
            </div>
          </div>

          <div className="mb-5 rounded-[30px] border border-white/70 bg-white/90 p-1.5 shadow-[0_20px_60px_-36px_rgba(6,78,42,0.45)] backdrop-blur">
            <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setCatalogFilter('available')}
              className={`tap-button rounded-[24px] px-4 py-2.5 text-center text-xs font-black uppercase tracking-[0.16em] transition ${
                catalogFilter === 'available'
                  ? 'bg-[linear-gradient(135deg,#078b3e,#10b981)] text-white shadow-[0_10px_24px_-12px_rgba(6,78,42,0.45)]'
                  : 'bg-transparent text-slate-500'
              }`}
            >
              Available Coupons
            </button>
            <button
              type="button"
              onClick={() => setCatalogFilter('used')}
              className={`tap-button rounded-[24px] px-4 py-2.5 text-center text-xs font-black uppercase tracking-[0.16em] transition ${
                catalogFilter === 'used'
                  ? 'bg-[linear-gradient(135deg,#078b3e,#10b981)] text-white shadow-[0_10px_24px_-12px_rgba(6,78,42,0.45)]'
                  : 'bg-transparent text-slate-500'
              }`}
            >
              Used Coupons
            </button>
          </div>
          </div>

          <div className="max-h-[44rem] space-y-3 overflow-y-auto pr-1">
            {isLoading && (
              <div className="rounded-2xl bg-slate-50 p-5 text-center text-sm font-bold text-slate-500">Loading coupons...</div>
            )}

            {!isLoading && catalogFilter === 'available' && availableCoupons.map((coupon) => (
              <article key={coupon.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-base font-black text-slate-900">{coupon.name}</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                      {coupon.description || 'No description provided yet.'}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-ss-green shadow-sm">
                    {coupon.points_cost.toFixed(0)} pts
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Reward Value</p>
                    <p className="mt-1 text-sm font-black text-slate-900">
                      {coupon.reward_type === 'discount'
                        ? `PHP ${(coupon.discount_amount || 0).toFixed(2)} off`
                        : 'Free service'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Monthly Limit</p>
                    <p className="mt-1 text-sm font-black text-slate-900">{coupon.monthly_limit} redemption(s)</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs font-black ${tierBadgeStyles[coupon.minimum_tier]}`}>
                    Min. tier: {coupon.minimum_tier}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${coupon.is_active ? 'bg-emerald-100 text-ss-green' : 'bg-slate-200 text-slate-600'}`}>
                    {coupon.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </article>
            ))}

            {!isLoading && catalogFilter === 'used' && usedRedemptions.map((redemption) => (
              <article key={redemption.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-base font-black text-slate-900">{redemption.coupon_name}</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                      Claim code: {redemption.claim_code}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-ss-green shadow-sm">
                    Used
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Customer</p>
                    <div className="mt-2 flex items-start gap-2">
                      <UserRound size={16} className="mt-0.5 shrink-0 text-ss-green" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-900">{redemption.customer_name}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{redemption.customer_phone}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Usage</p>
                    <p className="mt-1 text-sm font-black text-slate-900">{redemption.points_spent.toFixed(0)} pts spent</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      Used on {redemption.used_at_label || redemption.claimed_at_label}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600">
                    Claimed: {redemption.claimed_at_label}
                  </span>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-ss-green">
                    Used: {redemption.used_at_label || 'Pending timestamp'}
                  </span>
                </div>
              </article>
            ))}

            {!isLoading && catalogFilter === 'available' && availableCoupons.length === 0 && (
              <div className="rounded-2xl bg-slate-50 p-5 text-center text-sm font-bold text-slate-500">No active coupons yet.</div>
            )}

            {!isLoading && catalogFilter === 'used' && usedRedemptions.length === 0 && (
              <div className="rounded-2xl bg-slate-50 p-5 text-center text-sm font-bold text-slate-500">No used coupons yet.</div>
            )}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
