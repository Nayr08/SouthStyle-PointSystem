'use client';

import BottomNav from '@/components/BottomNav';
import { TransactionsSkeleton } from '@/components/Skeletons';
import { TransactionCard, type Transaction } from '@/components/TransactionCard';
import { useDemoLoading } from '@/components/useDemoLoading';
import { ArrowLeft, ReceiptText } from 'lucide-react';
import Link from 'next/link';

const transactions: Transaction[] = [
  { id: '1', type: 'earn', amount: 5.63, description: 'Sublimation shirt order paid', date: 'Today', time: '14:30' },
  { id: '2', type: 'earn', amount: 8.5, description: 'Tarpaulin order paid', date: 'Today', time: '09:15' },
  { id: '3', type: 'earn', amount: 12.5, description: 'Sticker order paid', date: 'Wed, 23 Jun', time: '14:32' },
  { id: '4', type: 'redeem', amount: 120, description: 'Redeemed as payment discount', date: 'Wed, 23 Jun', time: '08:32' },
  { id: '5', type: 'earn', amount: 3.75, description: 'Mug print order paid', date: 'Tue, 22 Jun', time: '11:45' },
];

export default function HistoryPage() {
  const isLoading = useDemoLoading();

  if (isLoading) {
    return <TransactionsSkeleton />;
  }

  return (
    <>
      <main className="animate-page phone-shell bg-white pb-28">
        <header className="animate-hero green-hero rounded-b-[30px] px-5 pb-8 pt-6 text-white">
          <div className="mb-7 flex items-center justify-between">
            <Link href="/" className="tap-button grid h-10 w-10 place-items-center rounded-full bg-white/10">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-lg font-black">Transactions</h1>
            <button className="tap-button grid h-10 w-10 place-items-center rounded-full bg-white/10" title="Points">
              <ReceiptText size={19} />
            </button>
          </div>
          <div className="animate-pop mx-auto mb-5 w-fit rounded-full bg-white px-5 py-2 text-ss-ink soft-shadow">
            <span className="text-sm font-medium text-ss-muted">Your Point </span>
            <strong className="text-lg font-black text-ss-green">12,429</strong>
            <span className="text-xs font-semibold text-ss-muted"> point</span>
          </div>
          <p className="mx-auto max-w-[280px] text-center text-sm font-medium leading-6 text-white/90">
            See every earn, redeem, and payment deduction on your Suki card.
          </p>
        </header>

        <section className="px-5 py-6">
          <p className="mb-3 text-xs font-semibold text-ss-muted">Today</p>
          <div className="stagger rounded-lg bg-white px-4 card-shadow">
            {transactions.slice(0, 2).map((transaction) => (
              <TransactionCard key={transaction.id} transaction={transaction} />
            ))}
          </div>

          <p className="mb-3 mt-6 text-xs font-semibold text-ss-muted">Previous updates</p>
          <div className="stagger rounded-lg bg-white px-4 card-shadow">
            {transactions.slice(2).map((transaction) => (
              <TransactionCard key={transaction.id} transaction={transaction} />
            ))}
          </div>
        </section>
      </main>
      <BottomNav />
    </>
  );
}
