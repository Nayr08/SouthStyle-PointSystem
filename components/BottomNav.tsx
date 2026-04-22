'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Gift, Home, ReceiptText, QrCode, UserRound } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/orders', label: 'Redeem', icon: Gift },
  { href: '/scan', label: 'Scan', icon: QrCode, featured: true },
  { href: '/history', label: 'Transactions', icon: ReceiptText },
  { href: '/account', label: 'Account', icon: UserRound },
];

const navBackground = {
  background:
    'linear-gradient(140deg, rgba(255,255,255,0.08), transparent 36%), repeating-linear-gradient(135deg, rgba(255,255,255,0.055) 0 1px, transparent 1px 16px), linear-gradient(160deg, #078b3e 0%, #046b31 100%)',
};

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="green-hero bottom-nav-surface fixed bottom-0 left-0 right-0 z-50 rounded-t-[32px] px-4 pb-4 pt-2 shadow-2xl shadow-black/25 md:top-0 md:bottom-auto md:rounded-b-[28px] md:rounded-t-none md:px-8 md:py-3"
      style={navBackground}
    >
      <div
        className="mx-auto grid h-[76px] max-w-[430px] grid-cols-5 items-center rounded-t-[32px] px-2 shadow-none md:h-16 md:max-w-[1180px] md:rounded-none"
        style={navBackground}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold md:flex-row md:gap-2 md:text-sm"
              title={item.label}
            >
              <span
                className={
                  item.featured
                    ? 'grid h-12 w-12 -mt-7 place-items-center rounded-full bg-white text-ss-green shadow-lg md:mt-0 md:h-10 md:w-10'
                    : isActive
                      ? 'text-white'
                      : 'text-white/70'
                }
              >
                <Icon size={item.featured ? 22 : 20} strokeWidth={2.2} />
              </span>
              <span className={isActive ? 'text-white' : 'text-white/70'}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

