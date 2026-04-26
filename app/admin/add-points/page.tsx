'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { BadgePlus, CheckCircle2, PhilippinePeso, Search, TicketPercent, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminInput, AdminShell, FieldShell, useStaffSession } from '@/components/AdminShell';
import { formatCompactStatValue } from '@/lib/number-format';
import { type TierName } from '@/lib/tiers';
import { supabase } from '@/lib/supabase/client';

type AddPointsResult = {
  customer_id: string;
  full_name: string;
  purchase_amount: number;
  amount_due: number;
  paid_amount: number;
  remaining_balance: number;
  payment_status: 'unpaid' | 'partial' | 'paid' | 'voided';
  coupon_discount: number;
  points_used: number;
  coupon_name: string | null;
  coupon_code: string | null;
  points_added: number;
  balance_after: number;
};

type CustomerLookupResult = {
  customer_id: string;
  full_name: string;
  phone: string;
  points_balance: number;
  tier?: TierName | null;
  rfid_uid: string | null;
  qr_token: string | null;
};

type CustomerListRow = {
  customer_id: string;
  tier: TierName;
};

type CustomerProfileTierResult = {
  tier: TierName;
};

type CouponCheckResult = {
  is_valid: boolean;
  status: 'empty' | 'invalid' | 'available' | 'used' | 'expired' | 'cancelled';
  coupon_name: string | null;
  claim_code: string | null;
  reward_type: string | null;
  discount_amount: number;
  coupon_discount: number;
  message: string;
};

const tierBadgeStyles: Record<TierName, string> = {
  Bronze: 'border-[#f0b071]/40 bg-[#8a4f24]/15 text-[#8a4f24]',
  Silver: 'border-slate-200 bg-slate-100 text-slate-700',
  Gold: 'border-amber-200 bg-amber-100 text-amber-700',
  Platinum: 'border-cyan-200 bg-cyan-100 text-cyan-700',
  Diamond: 'border-sky-200 bg-sky-100 text-sky-700',
  Titanium: 'border-zinc-200 bg-zinc-100 text-zinc-700',
};

export default function AddPointsPage() {
  const { staff } = useStaffSession();
  const [lookup, setLookup] = useState('');
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [downpaymentAmount, setDownpaymentAmount] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [pointsToUse, setPointsToUse] = useState('');
  const [notes, setNotes] = useState('');
  const [customer, setCustomer] = useState<CustomerLookupResult | null>(null);
  const [result, setResult] = useState<AddPointsResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFinding, setIsFinding] = useState(false);
  const [couponCheck, setCouponCheck] = useState<CouponCheckResult | null>(null);
  const [isCheckingCoupon, setIsCheckingCoupon] = useState(false);
  const lastCouponToastKeyRef = useRef<string | null>(null);

  const orderTotal = Number(purchaseAmount || 0);
  const downpayment = Number(downpaymentAmount || 0);
  const couponLooksEntered = couponCode.trim().length > 0;
  const normalizedCouponCode = couponCode.trim();
  const pointsRequested = Number(pointsToUse || 0);
  const requestedPayment = downpayment > 0 ? downpayment : orderTotal;
  const activeCouponCheck = couponLooksEntered ? couponCheck : null;

  const summary = useMemo(() => {
    if (result) {
      return {
        orderTotal: Number(result.purchase_amount),
        requestedPayment: Number(result.paid_amount),
        amountDue: Number(result.amount_due),
        remainingBalance: Number(result.remaining_balance),
        couponDiscount: Number(result.coupon_discount),
        pointsUsed: Number(result.points_used),
        pointsEarned: Number(result.points_added),
      };
    }

    const couponDiscount = activeCouponCheck?.is_valid
      ? Number(activeCouponCheck.coupon_discount || 0)
      : 0;
    const maxPointsUsable = Math.max(orderTotal - couponDiscount, 0);
    const pointsUsed = Math.max(Math.min(pointsRequested || 0, customer?.points_balance ?? 0, maxPointsUsable), 0);
    const amountDue = Math.max(orderTotal - couponDiscount - pointsUsed, 0);
    const paymentToApply = Math.max(Math.min(requestedPayment, amountDue || requestedPayment), 0);

    return {
      orderTotal,
      requestedPayment: paymentToApply,
      amountDue,
      remainingBalance: Math.max(amountDue - paymentToApply, 0),
      couponDiscount,
      pointsUsed,
      pointsEarned:
        amountDue > 0 && Math.max(amountDue - paymentToApply, 0) === 0
          ? Number((paymentToApply / 100).toFixed(2))
          : 0,
    };
  }, [
    activeCouponCheck?.coupon_discount,
    activeCouponCheck?.is_valid,
    customer?.points_balance,
    orderTotal,
    pointsRequested,
    requestedPayment,
    result,
  ]);

  const customerTier = customer?.tier && customer.tier in tierBadgeStyles ? customer.tier : null;

  const resetForm = () => {
    setLookup('');
    setPurchaseAmount('');
    setDownpaymentAmount('');
    setCouponCode('');
    setPointsToUse('');
    setNotes('');
    setCustomer(null);
    setResult(null);
    setCouponCheck(null);
  };

  useEffect(() => {
    if (!couponLooksEntered) {
      lastCouponToastKeyRef.current = null;
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setIsCheckingCoupon(true);

      const { data, error: couponError } = await supabase.rpc('admin_check_coupon_code', {
        p_coupon_code: couponCode.trim(),
        p_purchase_amount: orderTotal > 0 ? orderTotal : null,
      });

      setIsCheckingCoupon(false);

      if (couponError) {
        setCouponCheck({
          is_valid: false,
          status: 'invalid',
          coupon_name: null,
          claim_code: couponCode.trim().toUpperCase(),
          reward_type: null,
          discount_amount: 0,
          coupon_discount: 0,
          message: couponError.message || 'Could not verify coupon code.',
        });
        return;
      }

      const checkedCoupon = (Array.isArray(data) ? data[0] : data) as CouponCheckResult | null;
      setCouponCheck(checkedCoupon);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [couponCode, couponLooksEntered, orderTotal]);

  useEffect(() => {
    if (!couponLooksEntered || isCheckingCoupon || !couponCheck) {
      return;
    }

    const toastKey = `${couponCheck.status}:${couponCheck.claim_code ?? couponCode.trim().toUpperCase()}:${Number(couponCheck.coupon_discount || 0)}`;

    if (lastCouponToastKeyRef.current === toastKey) {
      return;
    }

    lastCouponToastKeyRef.current = toastKey;

    if (couponCheck.is_valid) {
      toast.success(
        couponCheck.reward_type === 'discount'
          ? `${couponCheck.coupon_name || 'Coupon'} available. Discount: PHP ${Number(couponCheck.coupon_discount || 0).toFixed(2)}`
          : `${couponCheck.coupon_name || 'Coupon'} is available.`,
      );
      return;
    }

    toast.error(couponCheck.message || 'Coupon code is not available.');
  }, [couponCheck, couponCode, couponLooksEntered, isCheckingCoupon]);

  const couponStatusTone = !couponLooksEntered
    ? 'border-[#181d18]/10 bg-[#f8f6f1] text-slate-600'
    : isCheckingCoupon
      ? 'border-sky-200 bg-sky-50 text-sky-700'
      : activeCouponCheck?.is_valid
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-rose-200 bg-rose-50 text-rose-700';
  const isSubmitDisabled =
    isSaving
    || isFinding
    || !customer
    || !lookup.trim()
    || !(orderTotal > 0)
    || !(requestedPayment > 0)
    || requestedPayment > summary.amountDue;

  const findCustomer = async () => {
    const trimmedLookup = lookup.trim();

    if (!trimmedLookup) {
      toast.error('Enter a phone number, RFID, or QR token first.');
      setCustomer(null);
      return;
    }

    setIsFinding(true);

    const { data, error: lookupError } = await supabase.rpc('admin_lookup_customer', {
      p_lookup: trimmedLookup,
    });

    setIsFinding(false);

    if (lookupError) {
      toast.error(lookupError.message || 'Could not find customer.');
      setCustomer(null);
      return;
    }

    const foundCustomer = (Array.isArray(data) ? data[0] : data) as CustomerLookupResult | null;

    if (!foundCustomer) {
      toast.error('No customer found for that lookup.');
      setCustomer(null);
      return;
    }

    let resolvedTier = foundCustomer.tier ?? null;

    if (!resolvedTier) {
      const { data: customersData } = await supabase.rpc('admin_list_customers');
      const matchedCustomer = ((customersData || []) as CustomerListRow[]).find(
        (customerRow) => customerRow.customer_id === foundCustomer.customer_id,
      );
      resolvedTier = matchedCustomer?.tier ?? null;
    }

    if (!resolvedTier) {
      const { data: profileData } = await supabase.rpc('customer_app_profile', {
        p_customer_id: foundCustomer.customer_id,
      });
      const matchedProfile = (Array.isArray(profileData) ? profileData[0] : profileData) as CustomerProfileTierResult | null;
      resolvedTier = matchedProfile?.tier ?? null;
    }

    setCustomer({
      ...foundCustomer,
      tier: resolvedTier,
      points_balance: Number(foundCustomer.points_balance),
    });
    toast.success(`Customer found: ${foundCustomer.full_name}`);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!staff) return;

    setResult(null);

    if (!lookup.trim()) {
      toast.error('Customer lookup is required.');
      return;
    }

    if (!(orderTotal > 0)) {
      toast.error('Enter a valid order total.');
      return;
    }

    if (!(requestedPayment > 0)) {
      toast.error('Enter a valid downpayment amount.');
      return;
    }

    if (requestedPayment > summary.amountDue) {
      toast.error('Downpayment cannot be greater than amount due.');
      return;
    }

    setIsSaving(true);

    const couponCodeForSubmit = normalizedCouponCode && activeCouponCheck?.is_valid ? normalizedCouponCode : null;
    const pointsToUseForSubmit = Number(pointsToUse || 0);

    const { data, error: addError } = await supabase.rpc('admin_add_purchase_points', {
      p_staff_id: staff.id,
      p_lookup: lookup.trim(),
      p_purchase_amount: orderTotal,
      p_coupon_code: couponCodeForSubmit,
      p_points_to_use: pointsToUseForSubmit,
      p_notes: notes.trim() || null,
      p_paid_amount: summary.requestedPayment,
    });

    setIsSaving(false);

    if (addError) {
      toast.error(addError.message || 'Could not add points.');
      return;
    }

    const nextResult = (Array.isArray(data) ? data[0] : data) as AddPointsResult;
    setResult(nextResult);
    setCustomer((currentCustomer) =>
      currentCustomer
        ? { ...currentCustomer, points_balance: Number(nextResult.balance_after) }
        : currentCustomer,
    );

    toast.success(`Order added successfully for ${nextResult.full_name}`);
  };

  return (
    <AdminShell title="Add Order" subtitle="Create a paid printing order and award points automatically.">
      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.95fr]">
        <form onSubmit={handleSubmit} className="grid gap-5">
          <section className="modal-pop rounded-3xl border border-[#181d18]/14 bg-white p-5 shadow-[0_18px_45px_-38px_rgba(15,23,15,0.45)]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-ss-green">Find Customer</p>
                <h2 className="mt-1 text-xl font-black text-slate-900">Lookup Member</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  Search by phone number, RFID, or QR token before creating the order.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <FieldShell label="Customer Lookup">
                <AdminInput>
                  <Search size={18} className="text-ss-green" />
                  <input
                    value={lookup}
                    onChange={(event) => setLookup(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        if (!isFinding) {
                          void findCustomer();
                        }
                      }
                    }}
                    placeholder="Phone, RFID, or QR"
                    className="min-w-0 flex-1 bg-transparent text-sm font-black text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </AdminInput>
              </FieldShell>

              <button
                type="button"
                onClick={findCustomer}
                disabled={isFinding}
                className="tap-button mt-7 rounded-2xl border border-[#181d18]/14 bg-[#f8f6f1] px-5 py-4 text-sm font-black text-slate-700 disabled:opacity-60"
              >
                {isFinding ? 'Finding...' : 'Find'}
              </button>
            </div>

            <div className="mt-4 rounded-[26px] border border-[#181d18]/12 bg-[#f5f3ee] p-4">
              {customer ? (
                <div className="grid gap-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl border border-[#181d18]/10 bg-white text-ss-green shadow-sm">
                    <UserRound size={22} />
                  </div>
                  <div className="min-w-0">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${customerTier ? tierBadgeStyles[customerTier] : 'border-[#181d18]/14 bg-[#f8f6f1] text-slate-600'}`}>
                      {customerTier ?? 'Member'}
                    </span>
                    <p className="mt-2 truncate text-base font-black text-slate-900">{customer.full_name}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{customer.phone}</p>
                  </div>
                  <div className="rounded-2xl border border-[#181d18]/10 bg-white px-4 py-3 text-right shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Available Points</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{customer.points_balance.toFixed(2)} <span className="text-sm text-slate-500">pts</span></p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl border border-[#181d18]/10 bg-white text-slate-400 shadow-sm">
                    <Search size={20} />
                  </div>
                  <p>Customer details will appear here once the lookup is verified.</p>
                </div>
              )}
            </div>
          </section>

          <section className="modal-pop rounded-3xl border border-[#181d18]/14 bg-white p-5 shadow-[0_18px_45px_-38px_rgba(15,23,15,0.45)]">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-ss-green">Order Details</p>
              <h2 className="mt-1 text-xl font-black text-slate-900">Capture Payment</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                Enter total order first, then the downpayment to collect now. Points are awarded only when the order becomes fully paid.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldShell label="Order Total">
                <AdminInput>
                  <PhilippinePeso size={18} className="text-ss-green" />
                  <input
                    value={purchaseAmount}
                    onChange={(event) => setPurchaseAmount(event.target.value)}
                    inputMode="decimal"
                    placeholder="0.00"
                    className="min-w-0 flex-1 bg-transparent text-sm font-black text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </AdminInput>
              </FieldShell>

              <FieldShell label="Downpayment Now">
                <AdminInput>
                  <PhilippinePeso size={18} className="text-ss-green" />
                  <input
                    value={downpaymentAmount}
                    onChange={(event) => setDownpaymentAmount(event.target.value)}
                    inputMode="decimal"
                    placeholder="Defaults to full payment"
                    className="min-w-0 flex-1 bg-transparent text-sm font-black text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </AdminInput>
              </FieldShell>

              <FieldShell label="Coupon Claim Code">
                <AdminInput>
                  <TicketPercent size={18} className="text-ss-green" />
                  <input
                    value={couponCode}
                    onChange={(event) => {
                      const nextValue = event.target.value.toUpperCase();
                      setCouponCode(nextValue);
                      if (!nextValue.trim()) {
                        setCouponCheck(null);
                        setIsCheckingCoupon(false);
                      }
                    }}
                    placeholder="Optional claim code"
                    className="min-w-0 flex-1 bg-transparent text-sm font-black uppercase tracking-[0.12em] text-slate-900 outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400"
                  />
                  {couponLooksEntered && (
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${couponStatusTone}`}>
                      {isCheckingCoupon ? 'Checking' : activeCouponCheck?.is_valid ? 'Available' : 'Used'}
                    </span>
                  )}
                </AdminInput>
                {couponLooksEntered ? (
                  <p className={`mt-2 text-xs font-bold ${activeCouponCheck?.is_valid ? 'text-emerald-700' : isCheckingCoupon ? 'text-sky-700' : 'text-rose-600'}`}>
                    {isCheckingCoupon
                      ? 'Checking coupon code...'
                      : activeCouponCheck?.message || 'Coupon code is not available.'}
                  </p>
                ) : null}
              </FieldShell>

              <FieldShell label="Use Customer Points">
                <AdminInput>
                  <BadgePlus size={18} className="text-amber-600" />
                  <input
                    value={pointsToUse}
                    onChange={(event) => setPointsToUse(event.target.value)}
                    inputMode="decimal"
                    placeholder="Optional points to use"
                    className="min-w-0 flex-1 bg-transparent text-sm font-black text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </AdminInput>
              </FieldShell>
            </div>

            <div className={`mt-4 rounded-[24px] border p-4 ${couponLooksEntered ? 'border-[#181d18]/14 bg-[#f5f3ee]' : 'border-[#181d18]/10 bg-[#f8f6f1]'}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Coupon State</p>
                  <p className="mt-1 text-sm font-black text-slate-900">
                    {!couponLooksEntered
                      ? 'No coupon applied yet'
                      : isCheckingCoupon
                        ? 'Checking coupon code'
                        : activeCouponCheck?.is_valid
                          ? `${activeCouponCheck.coupon_name || 'Coupon'} is available`
                          : 'Coupon code is not available'}
                  </p>
                  <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                    {!couponLooksEntered
                      ? 'You can leave this empty when the customer is paying full price.'
                      : isCheckingCoupon
                        ? 'Please wait while the coupon code is being verified.'
                        : activeCouponCheck?.is_valid
                          ? `Discount will apply automatically. Current discount: PHP ${Number(activeCouponCheck.coupon_discount || 0).toFixed(2)}.`
                          : activeCouponCheck?.message || 'This coupon code cannot be used for this order.'}
                  </p>
                </div>
                {couponLooksEntered && (
                  <span className="rounded-full border border-[#181d18]/10 bg-white px-3 py-1 text-xs font-black text-ss-green shadow-sm">
                    {couponCode.trim()}
                  </span>
                )}
              </div>
            </div>

            <div className={`mt-4 rounded-[24px] border p-4 ${summary.pointsUsed > 0 ? 'border-[#181d18]/14 bg-[#f7f2e8]' : 'border-[#181d18]/10 bg-[#f8f6f1]'}`}>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Points Payment</p>
              <p className="mt-1 text-sm font-black text-slate-900">
                {summary.pointsUsed > 0 ? `${summary.pointsUsed.toFixed(2)} points will be used on this order` : 'No points applied yet'}
              </p>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                Available customer balance: {customer ? `${customer.points_balance.toFixed(2)} pts` : 'Find the customer first'}.
                Points are awarded after full payment and are based on actual paid amount.
              </p>
            </div>

            <FieldShell label="Notes">
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Example: Sublimation shirt order"
                className="min-h-28 w-full rounded-2xl border border-[#181d18]/14 bg-white px-4 py-4 text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 transition-colors focus:border-[#181d18]/20"
              />
            </FieldShell>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={resetForm}
                className="tap-button rounded-2xl border border-[#181d18]/14 bg-white px-5 py-4 text-sm font-black text-slate-700"
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={isSubmitDisabled}
                className="tap-button flex items-center justify-center gap-2 rounded-2xl border border-[#181d18]/14 bg-[linear-gradient(135deg,#078b3e,#10b981)] px-5 py-4 text-sm font-black text-white shadow-lg shadow-emerald-900/15 disabled:opacity-60"
              >
                <BadgePlus size={18} />
                {isSaving ? 'Creating...' : 'Add Order'}
              </button>
            </div>
          </section>
        </form>

        <aside className="grid gap-5">
          <section className="modal-pop rounded-3xl border border-[#181d18]/14 bg-white p-5 shadow-[0_18px_45px_-38px_rgba(15,23,15,0.45)]">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-ss-green">Payment Summary</p>
              <h2 className="mt-1 text-xl font-black text-slate-900">What the customer pays</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                This panel mirrors cashier flow for installments. Downpayment can be partial, while points are awarded only when fully paid.
              </p>
            </div>

            <div className="grid gap-3">
              <div className="overflow-hidden rounded-2xl border border-[#181d18]/10 bg-[#f8f6f1] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Order Total</p>
                <p title={`PHP ${summary.orderTotal.toFixed(2)}`} className="mt-2 truncate text-xl font-black tabular-nums text-slate-900">PHP {formatCompactStatValue(summary.orderTotal)}</p>
              </div>
              <div className="overflow-hidden rounded-2xl border border-[#181d18]/10 bg-[#f8f6f1] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Paying Now</p>
                <p title={`PHP ${summary.requestedPayment.toFixed(2)}`} className="mt-2 truncate text-xl font-black tabular-nums text-slate-900">PHP {formatCompactStatValue(summary.requestedPayment)}</p>
              </div>
              <div className="overflow-hidden rounded-2xl border border-[#181d18]/10 bg-[#f8f6f1] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Coupon Discount</p>
                <p title={`PHP ${summary.couponDiscount.toFixed(2)}`} className="mt-2 truncate text-xl font-black tabular-nums text-slate-900">PHP {formatCompactStatValue(summary.couponDiscount)}</p>
              </div>
              <div className="overflow-hidden rounded-2xl border border-[#181d18]/10 bg-[#f8f6f1] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Points Used</p>
                <p title={`${summary.pointsUsed.toFixed(2)} pts`} className="mt-2 truncate text-xl font-black tabular-nums text-slate-900">{formatCompactStatValue(summary.pointsUsed)} pts</p>
              </div>
              <div className="overflow-hidden rounded-[26px] bg-[linear-gradient(135deg,#078b3e,#10b981)] p-5 text-white shadow-lg shadow-emerald-900/20">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-50/85">Remaining Balance</p>
                <p title={`PHP ${summary.remainingBalance.toFixed(2)}`} className="mt-2 truncate text-3xl font-black tabular-nums">PHP {formatCompactStatValue(summary.remainingBalance)}</p>
              </div>
              <div className="overflow-hidden rounded-2xl border border-[#181d18]/10 bg-[#f8f6f1] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Points To Earn</p>
                <p title={`+${summary.pointsEarned.toFixed(2)} pts`} className="mt-2 truncate text-xl font-black tabular-nums text-slate-900">+{formatCompactStatValue(summary.pointsEarned)} pts</p>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                  Points are awarded only when remaining balance reaches zero.
                </p>
              </div>
            </div>
          </section>

          <section className="modal-pop rounded-3xl border border-[#181d18]/14 bg-white p-5 shadow-[0_18px_45px_-38px_rgba(15,23,15,0.45)]">
            <div className="mb-4 flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl border border-[#181d18]/10 bg-[#edf5ed] text-ss-green">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">Submission Result</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  The final order breakdown appears here after a successful save.
                </p>
              </div>
            </div>

            {result ? (
              <div className="grid gap-3">
                <div className="rounded-2xl border border-[#181d18]/10 bg-[#f5f3ee] p-4">
                  <p className="text-sm font-black text-slate-900">{result.full_name}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    New balance: {Number(result.balance_after).toFixed(2)} pts - {result.payment_status === 'paid' ? 'Fully Paid' : 'Partial Payment'}
                  </p>
                </div>
                {Number(result.coupon_discount) > 0 && (
                  <div className="rounded-2xl border border-[#181d18]/12 bg-[#f5f3ee] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Coupon Applied</p>
                    <p className="mt-2 text-sm font-black text-slate-900">{result.coupon_name}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      Code {result.coupon_code} for PHP {Number(result.coupon_discount).toFixed(2)} off
                    </p>
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-[#181d18]/10 bg-[#f8f6f1] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Paid Now</p>
                    <p className="mt-2 text-lg font-black text-ss-green">PHP {Number(result.paid_amount).toFixed(2)}</p>
                  </div>
                  <div className="rounded-2xl border border-[#181d18]/10 bg-[#f8f6f1] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Remaining</p>
                    <p className="mt-2 text-lg font-black text-slate-900">PHP {Number(result.remaining_balance).toFixed(2)}</p>
                  </div>
                  <div className="rounded-2xl border border-[#181d18]/10 bg-[#f8f6f1] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Points Added</p>
                    <p className="mt-2 text-lg font-black text-slate-900">+{Number(result.points_added).toFixed(2)} pts</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-[#181d18]/10 bg-[#f8f6f1] p-4 text-sm font-semibold leading-6 text-slate-500">
                No order submitted yet. Once you create the order, this card will show the final amount due, coupon usage, and updated points balance.
              </div>
            )}
          </section>
        </aside>
      </div>
    </AdminShell>
  );
}
