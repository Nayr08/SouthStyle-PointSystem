'use client';

import BottomNav from '@/components/BottomNav';
import Link from 'next/link';
import { BadgeDollarSign, CreditCard, LogOut, QrCode, ShieldCheck, UserRound } from 'lucide-react';

const menuItems = [
  { icon: QrCode, label: 'My QR Backup', href: '/scan', value: 'SS-RFID-000123' },
  { icon: CreditCard, label: 'Suki Card Status', href: '#', value: 'Active' },
  { icon: ShieldCheck, label: 'Phone/PIN Login', href: '#', value: 'Enabled' },
  { icon: LogOut, label: 'Logout', href: '#', value: '' },
];

export default function AccountPage() {
  return (
    <>
      <main className="phone-shell pb-28">
        <header className="green-hero rounded-b-[30px] px-5 pb-24 pt-7 text-white">
          <h1 className="text-2xl font-black">Account</h1>
          <p className="mt-2 text-sm font-medium text-white/80">Manage your Southstyle Suki card.</p>
        </header>

        <section className="-mt-16 px-5">
          <div className="rounded-lg bg-white p-5 card-shadow">
            <div className="mb-5 flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-ss-green-soft text-ss-green">
                <UserRound size={30} />
              </div>
              <div>
                <h2 className="text-lg font-black text-ss-ink">Pristia Candra</h2>
                <p className="text-sm font-medium text-ss-muted">Retailer Jaya Abadi</p>
              </div>
            </div>
            <div className="grid grid-cols-2 rounded-lg bg-ss-surface p-4">
              <div>
                <p className="text-[11px] text-ss-muted">Available Points</p>
                <p className="flex items-center gap-1 text-lg font-black text-ss-green">
                  <BadgeDollarSign size={17} /> 12,429.00
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-ss-muted">Phone</p>
                <p className="text-sm font-black text-ss-ink">0917 555 0148</p>
              </div>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-lg bg-white card-shadow">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 border-b border-ss-line p-4 last:border-b-0"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-ss-green-soft text-ss-green">
                    <Icon size={19} />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-black text-ss-ink">{item.label}</span>
                    {item.value && <span className="text-xs font-medium text-ss-muted">{item.value}</span>}
                  </span>
                  <span className="text-ss-muted">&gt;</span>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
      <BottomNav />
    </>
  );
}
