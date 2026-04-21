'use client';

import BottomNav from '@/components/BottomNav';
import { OrderCard } from '@/components/OrderCard';
import { PointsDisplay } from '@/components/PointsDisplay';
import { Customer, Order } from '@/types';
import { Bell, ChevronRight, ShoppingBag } from 'lucide-react';

const customer: Customer = {
  id: '1',
  name: 'Pristia Candra',
  businessName: 'Retailer Jaya Abadi',
  phone: '0917 555 0148',
  points: 12429,
  memberSince: 'Suki member since Jan 2024',
  cardId: 'SS-RFID-000123',
};

const activeOrders: Order[] = [
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
];

const news = [
  'Double points for tarpaulin orders every Friday.',
  'RFID Suki card can now be used with QR backup.',
];

export default function Home() {
  return (
    <>
      <main className="phone-shell pb-28">
        <section className="green-hero rounded-b-[34px] px-5 pb-24 pt-6 text-white">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <p className="text-lg font-bold tracking-wide">Hi, {customer.name}</p>
              <p className="mt-2 text-sm font-medium text-white/80">{customer.businessName}</p>
            </div>
            <button className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white" title="Notifications">
              <Bell size={19} />
            </button>
          </div>
          <PointsDisplay points={customer.points} memberSince={customer.memberSince} />
        </section>

        <div className="px-5 pt-12">
          <section className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-black text-white">
                <ShoppingBag size={19} className="text-ss-green" />
                Purchase Updates
              </h2>
              <a href="/orders" className="flex items-center text-xs font-black uppercase text-ss-green">
                View <ChevronRight size={15} />
              </a>
            </div>
            <div className="space-y-3">
              {activeOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-white">News &amp; Update</h2>
              <a href="/history" className="text-xs font-black uppercase text-ss-green">See All</a>
            </div>
            <div className="space-y-3">
              {news.map((item) => (
                <article key={item} className="rounded-lg bg-white p-4 text-sm font-semibold leading-6 text-ss-ink card-shadow">
                  {item}
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
      <BottomNav />
    </>
  );
}


