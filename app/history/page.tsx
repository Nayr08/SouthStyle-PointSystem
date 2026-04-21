'use client';

import BottomNav from '@/components/BottomNav';
import { TransactionCard, type Transaction } from '@/components/TransactionCard';
import { ArrowLeft, BadgeDollarSign } from 'lucide-react';
import Link from 'next/link';

const transactions: Transaction[] = [
  { id: '1', type: 'earn', amount: 5.63, description: 'Sublimation shirt order paid', date: 'Today', time: '14:30' },
  { id: '2', type: 'earn', amount: 8.5, description: 'Tarpaulin order paid', date: 'Today', time: '09:15' },
  { id: '3', type: 'earn', amount: 12.5, description: 'Sticker order paid', date: 'Wed, 23 Jun', time: '14:32' },
  { id: '4', type: 'redeem', amount: 120, description: 'Redeemed as payment discount', date: 'Wed, 23 Jun', time: '08:32' },
  { id: '5', type: 'earn', amount: 3.75, description: 'Mug print order paid', date: 'Tue, 22 Jun', time: '11:45' },
];

const news = [
  {
    title: 'RFID card rollout',
    body: 'Bring your Southstyle Suki card when claiming orders so staff can update your points faster.',
  },
  {
    title: 'April print promo',
    body: 'Earn extra points on tarpaulin and sticker orders paid this month.',
  },
];

export default function HistoryPage() {
  return (
    <>
      <main className="phone-shell pb-28">
        <header className="green-hero rounded-b-[30px] px-5 pb-8 pt-6 text-white">
          <div className="mb-7 flex items-center justify-between">
            <Link href="/" className="grid h-10 w-10 place-items-center rounded-full bg-white/10">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-lg font-black">News &amp; Point Detail</h1>
            <button className="grid h-10 w-10 place-items-center rounded-full bg-white/10" title="Points">
              <BadgeDollarSign size={19} />
            </button>
          </div>
          <div className="mx-auto mb-5 w-fit rounded-full bg-white px-5 py-2 text-ss-ink soft-shadow">
            <span className="text-sm font-medium text-ss-muted">Your Point </span>
            <strong className="text-lg font-black text-ss-green">12,429</strong>
            <span className="text-xs font-semibold text-ss-muted"> point</span>
          </div>
          <p className="mx-auto max-w-[280px] text-center text-sm font-medium leading-6 text-white/90">
            See shop updates and every earn or redeem movement on your Suki card.
          </p>
        </header>

        <section className="px-5 py-6">
          <h2 className="mb-4 text-lg font-black text-white">News &amp; Update</h2>
          <div className="mb-7 space-y-3">
            {news.map((item) => (
              <article key={item.title} className="rounded-lg bg-white p-4 card-shadow">
                <h3 className="text-sm font-black text-ss-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ss-muted">{item.body}</p>
              </article>
            ))}
          </div>

          <p className="mb-3 text-xs font-semibold text-ss-muted">Tue, 21 Apr 2026</p>
          <div className="rounded-lg bg-white px-4 card-shadow">
            {transactions.slice(0, 2).map((transaction) => (
              <TransactionCard key={transaction.id} transaction={transaction} />
            ))}
          </div>

          <p className="mb-3 mt-6 text-xs font-semibold text-ss-muted">Previous updates</p>
          <div className="rounded-lg bg-white px-4 card-shadow">
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
