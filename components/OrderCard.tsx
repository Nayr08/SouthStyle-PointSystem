'use client';

import { CheckCircle2, Clock, Package } from 'lucide-react';
import { Order, OrderStatus } from '@/types';

const statusConfig: Record<OrderStatus, { label: string; pill: string; icon: React.ElementType; iconBox: string }> = {
  pending: {
    label: 'Pending',
    pill: 'bg-slate-100 text-slate-600',
    icon: Clock,
    iconBox: 'from-slate-100 to-zinc-100 text-slate-600',
  },
  in_progress: {
    label: 'Processing',
    pill: 'bg-amber-100 text-amber-700',
    icon: Clock,
    iconBox: 'from-amber-100 to-orange-100 text-orange-600',
  },
  ready: {
    label: 'Ready',
    pill: 'bg-emerald-100 text-emerald-700',
    icon: Package,
    iconBox: 'from-emerald-100 to-teal-100 text-emerald-600',
  },
  claimed: {
    label: 'Delivered',
    pill: 'bg-emerald-100 text-emerald-700',
    icon: CheckCircle2,
    iconBox: 'from-blue-100 to-indigo-100 text-blue-600',
  },
};

const paymentPill: Record<Order['paymentStatus'], string> = {
  unpaid: 'bg-slate-100 text-slate-600',
  partial: 'bg-amber-100 text-amber-700',
  paid: 'bg-emerald-100 text-emerald-700',
  voided: 'bg-rose-100 text-rose-700',
};

const paymentLabel: Record<Order['paymentStatus'], string> = {
  unpaid: 'Unpaid',
  partial: 'Partial',
  paid: 'Paid',
  voided: 'Voided',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ${config.pill}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
}

export function OrderCard({ order, onClick }: { order: Order; onClick?: () => void }) {
  const config = statusConfig[order.status];
  const Icon = config.icon;

  return (
    <article
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      className="tap-card rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex gap-4">
        <div className={`h-fit rounded-xl bg-gradient-to-br ${config.iconBox} p-3`}>
          <Icon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-900">{order.items.split(' - ')[0]}</p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Order #{order.orderNumber}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{order.date}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${paymentPill[order.paymentStatus]}`}>
                  {paymentLabel[order.paymentStatus]}
                </span>
                {order.paymentStatus !== 'paid' && (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-600">
                    Remaining PHP {order.remainingBalance.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
            <StatusBadge status={order.status} />
          </div>
          <p className="mb-3 text-xs font-semibold leading-5 text-slate-600">{order.items.split(' - ').slice(1).join(' - ') || order.items}</p>
          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <p className="font-black text-slate-900">PHP {order.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <div className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-1">
              <p className="text-xs font-black text-white">+{order.pointsEarned.toFixed(2)} pts</p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
