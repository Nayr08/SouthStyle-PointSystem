'use client';

import BottomNav from '@/components/BottomNav';
import { OrderCard } from '@/components/OrderCard';
import { RewardCard, type Reward } from '@/components/RewardCard';
import { Order } from '@/types';
import { ArrowLeft, Gift } from 'lucide-react';
import Link from 'next/link';

const rewards: Reward[] = [
  { id: '1', name: 'PHP 50 Print Discount', cost: 50, image: 'PHP' },
  { id: '2', name: 'Free Layout Edit', cost: 120, image: 'LAY' },
  { id: '3', name: 'Sticker Freebie', cost: 75, image: 'STK' },
  { id: '4', name: 'Priority Queue', cost: 200, image: 'VIP' },
];

const orders: Order[] = [
  {
    id: '1',
    orderNumber: '1024',
    date: 'Today, 2:30 PM',
    status: 'in_progress',
    items: 'Sublimation Shirt - 24 pcs, front and back print',
    total: 563,
    pointsEarned: 5.63,
  },
  {
    id: '2',
    orderNumber: '1025',
    date: 'Today, 9:15 AM',
    status: 'ready',
    items: 'Tarpaulin 3x6 ft - birthday layout included',
    total: 850,
    pointsEarned: 8.5,
  },
  {
    id: '3',
    orderNumber: '1019',
    date: 'Yesterday, 4:45 PM',
    status: 'pending',
    items: 'Die-cut stickers - 500 pcs waterproof',
    total: 1250,
    pointsEarned: 12.5,
  },
];

export default function OrdersPage() {
  return (
    <>
      <main className="phone-shell pb-28">
        <header className="green-hero rounded-b-[30px] px-5 pb-10 pt-6 text-white">
          <div className="mb-8 flex items-center justify-between">
            <Link href="/" className="grid h-10 w-10 place-items-center rounded-full bg-white/10">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-lg font-black">Redeem</h1>
            <button className="grid h-10 w-10 place-items-center rounded-full bg-white/10" title="Rewards">
              <Gift size={19} />
            </button>
          </div>
          <div className="mx-auto w-fit rounded-full bg-white px-5 py-2 text-ss-ink soft-shadow">
            <span className="text-sm font-medium text-ss-muted">Your Point </span>
            <strong className="text-lg font-black text-ss-green">12,429</strong>
            <span className="text-xs font-semibold text-ss-muted"> point</span>
          </div>
        </header>

        <section className="px-5 py-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-white">Available Rewards</h2>
              <p className="mt-1 text-xs text-ss-muted">Staff scans your card to redeem points.</p>
            </div>
          </div>
          <div className="-mx-5 mb-8 flex gap-3 overflow-x-auto px-5 pb-2 hide-scrollbar">
            {rewards.map((reward) => (
              <RewardCard key={reward.id} reward={reward} />
            ))}
          </div>

          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-black text-white">Purchase Updates</h2>
            <span className="text-xs font-black text-ss-green">{orders.length} active</span>
          </div>
          <div className="space-y-3">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        </section>
      </main>
      <BottomNav />
    </>
  );
}
