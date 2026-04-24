'use client';

import { useEffect, useState } from 'react';
import { AdminShell, useStaffSession } from '@/components/AdminShell';
import { supabase } from '@/lib/supabase/client';
import { CheckCircle2, Clock3, PackageCheck, Paintbrush, PhilippinePeso, Printer, Scissors, Search, Trash2, X } from 'lucide-react';

type AdminOrder = {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  date_label: string;
  order_status: string;
  payment_status: 'unpaid' | 'partial' | 'paid' | 'voided';
  subtotal_amount: number;
  coupon_discount_amount: number;
  points_discount_amount: number;
  paid_amount: number;
  remaining_balance: number;
  items: string;
  total_amount: number;
  points_earned: number;
};

type AddOrderPaymentResult = {
  order_id: string;
  customer_id: string;
  customer_name: string;
  total_amount: number;
  amount_due: number;
  paid_amount: number;
  remaining_balance: number;
  payment_status: 'unpaid' | 'partial' | 'paid' | 'voided';
  points_added: number;
  balance_after: number;
};

type TrackingStep = {
  id: string;
  step_key: string;
  step_name: string;
  sort_order: number;
  status: 'pending' | 'current' | 'done';
  updated_at: string;
};

type OrderFilter = 'active' | 'ready' | 'claimed' | 'all';

const stepIcons: Record<string, typeof Paintbrush> = {
  designing: Paintbrush,
  printing: Printer,
  cutting: Scissors,
  ready: PackageCheck,
  claimed: CheckCircle2,
};

const trackingOrder: Record<string, number> = {
  designing: 1,
  printing: 2,
  cutting: 3,
  ready: 4,
  claimed: 5,
};

const statusLabel: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  ready: 'Ready',
  claimed: 'Claimed',
};

const paymentStatusLabel: Record<string, string> = {
  unpaid: 'Unpaid',
  partial: 'Partial',
  paid: 'Paid',
  voided: 'Voided',
};

const filterMeta: Record<OrderFilter, { label: string; helper: string }> = {
  active: { label: 'Active', helper: 'Pending and in progress' },
  ready: { label: 'Ready', helper: 'Ready for pickup' },
  claimed: { label: 'Claimed', helper: 'Completed pickups' },
  all: { label: 'All', helper: 'Everything together' },
};

const trackingStepHelper: Record<string, string> = {
  designing: 'Prepare the design and confirm the layout is ready for production.',
  printing: 'Send the order to print and monitor progress on the machine.',
  cutting: 'Trim and finish the printed output for handoff.',
  ready: 'Mark the order as ready once it can be picked up by the customer.',
  claimed: 'Finalize the order after the customer has received it.',
};

function formatTrackingTimestamp(value: string | null | undefined) {
  if (!value) return 'Not updated yet';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not updated yet';
  }

  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export default function AdminOrdersPage() {
  const { staff } = useStaffSession();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [tracking, setTracking] = useState<TrackingStep[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [query, setQuery] = useState('');
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('active');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isApplyingPayment, setIsApplyingPayment] = useState(false);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);
  const [error, setError] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('0.00');
  const [showDeleteOrderConfirm, setShowDeleteOrderConfirm] = useState(false);
  const [deleteOrderRfid, setDeleteOrderRfid] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function fetchOrders() {
      const { data, error: ordersError } = await supabase.rpc('admin_list_orders');

      if (!isMounted) return;

      setIsLoading(false);

      if (ordersError) {
        setError(ordersError.message || 'Could not load orders.');
        return;
      }

      setOrders((data || []) as AdminOrder[]);
    }

    void fetchOrders();

    return () => {
      isMounted = false;
    };
  }, []);

  const loadOrders = async () => {
    setIsLoading(true);
    const { data, error: ordersError } = await supabase.rpc('admin_list_orders');
    setIsLoading(false);

    if (ordersError) {
      setError(ordersError.message || 'Could not load orders.');
      return;
    }

    setOrders((data || []) as AdminOrder[]);
  };

  const loadTracking = async (order: AdminOrder) => {
    setError('');
    setSelectedOrder(order);
    setPaymentAmount('0.00');
    setShowDeleteOrderConfirm(false);
    setDeleteOrderRfid('');

    const { data, error: trackingError } = await supabase.rpc('admin_order_tracking', {
      p_order_id: order.id,
    });

    if (trackingError) {
      setError(trackingError.message || 'Could not load tracking.');
      return;
    }

    setTracking(
      ((data || []) as TrackingStep[]).sort(
        (a, b) => (trackingOrder[a.step_key] ?? a.sort_order) - (trackingOrder[b.step_key] ?? b.sort_order),
      ),
    );
  };

  const updateStep = async (step: TrackingStep, status: TrackingStep['status']) => {
    if (!staff) return;

    setIsSaving(true);
    setError('');

    const { error: updateError } = await supabase.rpc('admin_set_tracking_step', {
      p_staff_id: staff.id,
      p_step_id: step.id,
      p_status: status,
    });

    setIsSaving(false);

    if (updateError) {
      setError(updateError.message || 'Could not update tracking step.');
      return;
    }

    if (selectedOrder) {
      await loadTracking(selectedOrder);
      await loadOrders();
    }
  };

  const applyPayment = async () => {
    if (!staff || !selectedOrder) return;

    const amount = Number(paymentAmount || 0);

    if (!(amount > 0)) {
      setError('Enter a valid payment amount.');
      return;
    }

    setIsApplyingPayment(true);
    setError('');

    const { data, error: paymentError } = await supabase.rpc('admin_add_order_payment', {
      p_staff_id: staff.id,
      p_order_id: selectedOrder.id,
      p_payment_amount: amount,
      p_coupon_code: null,
      p_points_to_use: 0,
      p_notes: null,
    });

    setIsApplyingPayment(false);

    if (paymentError) {
      setError(paymentError.message || 'Could not apply payment.');
      return;
    }

    const paymentResult = (Array.isArray(data) ? data[0] : data) as AddOrderPaymentResult | null;

    if (paymentResult) {
      setPaymentAmount('0.00');
    }

    const { data: latestOrdersData, error: latestOrdersError } = await supabase.rpc('admin_list_orders');

    if (!latestOrdersError) {
      const latestOrders = (latestOrdersData || []) as AdminOrder[];
      setOrders(latestOrders);
      const refreshedOrder = latestOrders.find((order) => order.id === selectedOrder.id);

      if (refreshedOrder) {
        await loadTracking(refreshedOrder);
      }
    }
  };

  const deleteOrder = async () => {
    if (!staff || !selectedOrder) return;

    const rfidValue = deleteOrderRfid.trim();

    if (!rfidValue) {
      setError('Scan your RFID card to confirm order deletion.');
      return;
    }

    setIsDeletingOrder(true);
    setError('');

    const { error: deleteError } = await supabase.rpc('admin_delete_order_with_rfid', {
      p_staff_id: staff.id,
      p_order_id: selectedOrder.id,
      p_staff_rfid_uid: rfidValue,
    });

    setIsDeletingOrder(false);

    if (deleteError) {
      setError(deleteError.message || 'Could not delete order.');
      return;
    }

    setShowDeleteOrderConfirm(false);
    setDeleteOrderRfid('');
    setSelectedOrder(null);
    setTracking([]);
    await loadOrders();
  };

  const filteredOrders = orders.filter((order) => {
    const haystack = `${order.customer_name} ${order.customer_phone} ${order.order_number} ${order.items}`.toLowerCase();
    const matchesQuery = haystack.includes(query.toLowerCase());
    const matchesFilter =
      orderFilter === 'all'
      || (orderFilter === 'active' && ['pending', 'in_progress'].includes(order.order_status))
      || (orderFilter === 'ready' && order.order_status === 'ready')
      || (orderFilter === 'claimed' && order.order_status === 'claimed');

    return matchesQuery && matchesFilter;
  });

  const counts = {
    active: orders.filter((order) => ['pending', 'in_progress'].includes(order.order_status)).length,
    ready: orders.filter((order) => order.order_status === 'ready').length,
    claimed: orders.filter((order) => order.order_status === 'claimed').length,
    all: orders.length,
  };

  const currentStepId =
    tracking.find((step) => step.status === 'current')?.id ??
    tracking.find((step) => step.status !== 'done')?.id ??
    null;
  const lastUpdatedAt = tracking
    .map((step) => step.updated_at)
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

  return (
    <AdminShell title="Orders" subtitle="View customer orders and update production tracking.">
      <div className="mb-5 rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm">
        <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {(Object.keys(filterMeta) as OrderFilter[]).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setOrderFilter(filter)}
              className={`tap-button rounded-[22px] border px-4 py-3 text-left transition ${
                orderFilter === filter
                  ? 'border-emerald-200 bg-[linear-gradient(135deg,#078b3e,#10b981)] text-white shadow-lg shadow-emerald-900/15'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-100 hover:bg-emerald-50/60'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className={`text-sm font-black ${orderFilter === filter ? 'text-white' : 'text-slate-900'}`}>{filterMeta[filter].label}</p>
                  <p className={`mt-1 text-[11px] font-semibold ${orderFilter === filter ? 'text-emerald-50/90' : 'text-slate-500'}`}>{filterMeta[filter].helper}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-black ${orderFilter === filter ? 'bg-white/20 text-white' : 'bg-white text-slate-700'}`}>
                  {counts[filter]}
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <Search size={18} className="text-ss-green" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, phone, order, or item"
            className="min-w-0 flex-1 bg-transparent text-sm font-black text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      {error && <p className="notice-pop mb-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-600">{error}</p>}

      <section className="grid gap-3">
        {isLoading && <p className="rounded-2xl bg-white p-5 text-sm font-bold text-slate-500">Loading orders...</p>}
        {!isLoading && filteredOrders.map((order) => (
          <button
            key={order.id}
            type="button"
            onClick={() => loadTracking(order)}
            className="tap-card rounded-3xl border border-emerald-100 bg-white p-5 text-left shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-base font-black text-slate-900">{order.items.split(' - ')[0]}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{order.customer_name} - {order.customer_phone}</p>
                <p className="mt-1 text-xs font-semibold text-slate-400">Order #{order.order_number} - {order.date_label}</p>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-ss-green">
                {statusLabel[order.order_status] || order.order_status}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                order.payment_status === 'paid'
                  ? 'bg-emerald-100 text-emerald-700'
                  : order.payment_status === 'partial'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-600'
              }`}>
                {paymentStatusLabel[order.payment_status] || order.payment_status}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-600">
                Remaining PHP {Number(order.remaining_balance).toFixed(2)}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
              <p className="text-sm font-black text-slate-900">
                Total PHP {Number(order.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs font-black text-ss-green">+{Number(order.points_earned).toFixed(2)} pts</p>
            </div>
          </button>
        ))}
        {!isLoading && filteredOrders.length === 0 && (
          <p className="rounded-2xl bg-white p-5 text-center text-sm font-bold text-slate-500">No orders found in this filter.</p>
        )}
      </section>

      {selectedOrder && (
        <div className="fixed inset-0 z-[90] grid place-items-end bg-black/45 px-5 pb-5 pt-8 backdrop-blur-sm sm:place-items-center">
          <div className="modal-sheet max-h-full w-full max-w-[460px] overflow-hidden rounded-[30px] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-ss-green">Edit Tracking</p>
                <h2 className="mt-1 truncate text-xl font-black text-slate-900">{selectedOrder.items.split(' - ')[0]}</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">{selectedOrder.customer_name} - Order #{selectedOrder.order_number}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">Last update {formatTrackingTimestamp(lastUpdatedAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedOrder(null);
                  setTracking([]);
                  setShowDeleteOrderConfirm(false);
                  setDeleteOrderRfid('');
                }}
                className="tap-button grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[74svh] overflow-y-auto p-5">
              <div className="mb-5 rounded-2xl bg-emerald-50 p-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Sub Total</p>
                    <p className="mt-1 text-sm font-black text-slate-900">PHP {Number(selectedOrder.subtotal_amount).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Discounts</p>
                    <p className="mt-1 text-[11px] font-bold text-slate-500">Coupon - PHP {Number(selectedOrder.coupon_discount_amount).toFixed(2)}</p>
                    <p className="mt-1 text-[11px] font-bold text-slate-500">Points - PHP {Number(selectedOrder.points_discount_amount).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Final Total</p>
                    <p className="mt-1 text-sm font-black text-slate-900">PHP {Number(selectedOrder.total_amount).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Partial Paid</p>
                    <p className="mt-1 text-sm font-black text-slate-900">PHP {Number(selectedOrder.paid_amount).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {selectedOrder.payment_status !== 'paid' && selectedOrder.payment_status !== 'voided' && (
                <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-ss-green">Payment Update</p>
                  <h3 className="mt-1 text-base font-black text-slate-900">Record Additional Payment</h3>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                    Points are awarded only when the remaining balance becomes zero.
                  </p>
                  <p className="mt-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    Needed For Full Paid: PHP {Number(selectedOrder.remaining_balance).toFixed(2)}
                  </p>

                  <div className="mt-3 grid gap-3">
                    <label className="grid gap-1">
                      <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Payment Amount</span>
                      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <PhilippinePeso size={16} className="text-ss-green" />
                        <input
                          value={paymentAmount}
                          onChange={(event) => setPaymentAmount(event.target.value)}
                          inputMode="decimal"
                          className="min-w-0 flex-1 bg-transparent text-sm font-black text-slate-900 outline-none"
                        />
                      </div>
                    </label>
                  </div>

                  <button
                    type="button"
                    disabled={isApplyingPayment}
                    onClick={applyPayment}
                    className="tap-button mt-4 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-ss-green disabled:opacity-60"
                  >
                    {isApplyingPayment ? 'Applying payment...' : 'Add Payment'}
                  </button>
                </section>
              )}

              <section className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-red-700">Danger Zone</p>
                <h3 className="mt-1 text-base font-black text-slate-900">Delete This Order</h3>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                  Use this only for wrong orders. This action will remove the order and related payment/points records.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteOrderConfirm(true);
                    setDeleteOrderRfid('');
                  }}
                  className="tap-button mt-4 inline-flex items-center gap-2 rounded-xl border border-red-300 bg-white px-3 py-2 text-xs font-black text-red-700"
                >
                  <Trash2 size={14} />
                  Delete Order
                </button>
              </section>

              <div>
                {tracking.map((step) => {
                  const Icon = stepIcons[step.step_key] || Clock3;
                  const effectiveStatus = step.status === 'done' ? 'done' : step.id === currentStepId ? 'current' : 'pending';
                  const isCurrent = effectiveStatus === 'current';
                  const isDone = effectiveStatus === 'done';
                  const isActive = isDone || isCurrent;
                  const isPending = effectiveStatus === 'pending';
                  const isClaimedStep = step.step_key === 'claimed';
                  const canMarkDone = !(isClaimedStep && selectedOrder?.payment_status !== 'paid');
                  const stepIndex = tracking.findIndex((item) => item.id === step.id);
                  const hasNextStep = stepIndex < tracking.length - 1;
                  const previousStep = stepIndex > 0 ? tracking[stepIndex - 1] : null;

                  return (
                    <div key={step.id} className="relative flex gap-4 pb-7 last:pb-0">
                      {hasNextStep && (
                        <>
                          <div className="absolute left-[23px] top-12 h-full w-1 rounded-full bg-slate-200" />
                          {isDone && <div className="absolute left-[23px] top-12 h-full w-1 rounded-full bg-emerald-500" />}
                        </>
                      )}

                      <div className={`relative z-10 grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 ${
                        isDone
                          ? 'border-ss-green bg-emerald-50 text-ss-green'
                          : isCurrent
                            ? 'border-amber-400 bg-amber-50 text-amber-600'
                            : 'border-slate-200 bg-white text-slate-300'
                      }`}>
                        {isDone ? <CheckCircle2 size={22} /> : isCurrent ? <Clock3 size={22} /> : <Icon size={22} />}
                      </div>

                      <article
                        className={`min-w-0 flex-1 rounded-[26px] border p-4 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.28)] ${
                          isDone
                            ? 'border-emerald-200 bg-emerald-50/80'
                            : isCurrent
                              ? 'border-amber-200 bg-amber-50'
                              : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <p className={`text-base font-black ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>{step.step_name}</p>
                                {isCurrent && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase text-amber-700">Current</span>}
                                {isDone && <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700">Done</span>}
                                {isPending && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-500">Pending</span>}
                              </div>
                              {isCurrent && (
                                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-700 shadow-sm">
                                  Active Now
                                </span>
                              )}
                            </div>
                            <p className={`mt-1 text-xs font-semibold leading-5 ${isActive ? 'text-slate-500' : 'text-slate-400'}`}>
                              {trackingStepHelper[step.step_key] || 'Production step update.'}
                            </p>
                            <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                              Updated {formatTrackingTimestamp(step.updated_at)}
                            </p>
                          </div>
                        </div>

                        {isCurrent && (
                          <div className="mt-4 grid gap-2 sm:grid-cols-2">
                            <button
                              type="button"
                              disabled={isSaving || !canMarkDone}
                              onClick={() => updateStep(step, 'done')}
                              className="tap-button rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-ss-green disabled:opacity-60"
                            >
                              Mark Done
                            </button>
                            <button
                              type="button"
                              disabled={isSaving || !previousStep}
                              onClick={() => previousStep && updateStep(previousStep, 'current')}
                              className="tap-button rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 disabled:opacity-60"
                            >
                              Go Back To Previous Step
                            </button>
                          </div>
                        )}
                        {isCurrent && !canMarkDone && (
                          <p className="mt-2 text-xs font-bold text-amber-700">
                            This order must be fully paid before marking Claimed as done.
                          </p>
                        )}
                        {isSaving && isCurrent && (
                          <button
                            type="button"
                            disabled
                            className="mt-2 w-full rounded-xl border border-transparent bg-slate-100 px-3 py-2 text-xs font-black text-slate-500"
                          >
                            Saving changes...
                          </button>
                        )}
                      </article>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      {selectedOrder && showDeleteOrderConfirm && (
        <div className="fixed inset-0 z-[95] grid place-items-center bg-black/55 px-5 py-8 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[26px] border border-red-200 bg-white p-5 shadow-2xl">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-red-700">Confirm Delete</p>
            <h3 className="mt-1 text-lg font-black text-slate-900">Scan Your RFID To Continue</h3>
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">
              Order #{selectedOrder.order_number} will be permanently removed. Scan your own staff RFID card to confirm.
            </p>

            <label className="mt-4 grid gap-1">
              <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Staff RFID</span>
              <input
                value={deleteOrderRfid}
                onChange={(event) => setDeleteOrderRfid(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    if (!isDeletingOrder) {
                      void deleteOrder();
                    }
                  }
                }}
                autoFocus
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-900 outline-none focus:border-red-400"
                placeholder="Scan card now"
              />
            </label>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteOrderConfirm(false);
                  setDeleteOrderRfid('');
                }}
                className="tap-button rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingOrder}
                onClick={() => void deleteOrder()}
                className="tap-button rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-xs font-black text-red-700 disabled:opacity-60"
              >
                {isDeletingOrder ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
