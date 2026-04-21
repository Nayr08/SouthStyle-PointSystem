'use client';

import { BadgeDollarSign } from 'lucide-react';

export interface Transaction {
  id: string;
  type: 'earn' | 'redeem';
  amount: number;
  description: string;
  date: string;
  time: string;
}

export function TransactionCard({ transaction }: { transaction: Transaction }) {
  const isEarn = transaction.type === 'earn';

  return (
    <article className="flex items-center justify-between border-b border-ss-line py-4 last:border-b-0">
      <div>
        <p className="text-sm font-black text-ss-ink">{isEarn ? 'Point Reward' : 'Point Redemption'}</p>
        <p className="mt-1 max-w-[215px] text-sm font-semibold leading-5 text-ss-ink">{transaction.description}</p>
        <p className="mt-2 text-xs text-ss-muted">{transaction.time}</p>
      </div>
      <div className={`flex items-center gap-1 text-sm font-black ${isEarn ? 'text-ss-green' : 'text-ss-danger'}`}>
        <BadgeDollarSign size={15} />
        {isEarn ? '+' : '-'}{transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        <span className="font-medium text-ss-muted">point</span>
      </div>
    </article>
  );
}
