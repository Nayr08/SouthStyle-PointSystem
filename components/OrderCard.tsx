'use client';

import { CheckCircle2, Clock3, PackageCheck, Printer } from 'lucide-react';
import { Order, OrderStatus } from '@/types';

const statusConfig: Record<OrderStatus, { label: string; className: string; icon: React.ElementType }> = {
  pending: {
    label: 'Pending',
    className: 'bg-slate-100 text-slate-600',
    icon: Clock3,
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-amber-100 text-amber-700',
    icon: Printer,
  },
  ready: {
    label: 'Ready',
    className: 'bg-ss-green-soft text-ss-green',
    icon: PackageCheck,
  },
  claimed: {
    label: 'Claimed',
    className: 'bg-sky-100 text-ss-sky',
    icon: CheckCircle2,
  },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold ${config.className}`}>
      <Icon size={13} />
      {config.label}
    </span>
  );
}

export function OrderCard({ order }: { order: Order }) {
  return (
    <article className="relative overflow-hidden rounded-xl bg-white p-4 card-shadow">
      <div className="absolute bottom-0 left-0 top-0 w-1.5 bg-ss-green" />
      <div className="mb-3 flex items-start justify-between gap-3 pl-2">
        <div>
          <p className="text-sm font-black text-ss-ink">Order #{order.orderNumber}</p>
          <p className="text-xs font-semibold text-ss-muted">{order.date}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <p className="mb-4 pl-2 text-sm font-bold leading-5 text-ss-ink">{order.items}</p>
      <div className="ml-2 grid grid-cols-2 rounded-xl bg-ss-surface p-3">
        <div>
          <p className="text-[11px] font-semibold text-ss-muted">Total</p>
          <p className="font-black text-ss-ink">PHP {order.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold text-ss-muted">Points Earned</p>
          <p className="font-black text-ss-green">+{order.pointsEarned.toFixed(2)}</p>
        </div>
      </div>
    </article>
  );
}
