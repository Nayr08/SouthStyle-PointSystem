'use client';

import Image from 'next/image';
import Link from 'next/link';
import { CreditCard, QrCode, RadioTower } from 'lucide-react';

interface PointsDisplayProps {
  points: number;
  memberSince: string;
}

export function PointsDisplay({ points, memberSince }: PointsDisplayProps) {
  return (
    <div className="-mb-16 overflow-hidden rounded-2xl bg-white card-shadow">
      <div className="relative p-4">
        <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-ss-green-soft" />
        <div className="absolute -bottom-12 left-16 h-24 w-24 rounded-full bg-ss-green-soft" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ss-green-soft ring-4 ring-white">
              <Image
                src="/southstyle-logo.png"
                alt="Southstyle logo"
                width={34}
                height={34}
                className="h-[34px] w-[34px] rounded-full object-contain"
                priority
              />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-ss-muted">Southstyle Suki Card</p>
              <p className="truncate text-sm font-black text-ss-ink">RFID + QR Backup</p>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-ss-green-soft px-3 py-1 text-[10px] font-black uppercase text-ss-green">
            <RadioTower size={12} /> Active
          </div>
        </div>

        <div className="relative mt-5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ss-muted">Available Points</p>
          <div className="mt-1 flex items-end gap-2">
            <strong className="text-[32px] font-black leading-none tracking-tight text-ss-green">
              {points.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
            <span className="pb-1 text-xs font-bold text-ss-muted">points</span>
          </div>
          <p className="mt-2 text-[11px] font-semibold text-ss-muted">Worth PHP {points.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>

        <div className="relative mt-5 grid grid-cols-[1fr_auto] items-center gap-4 border-t border-ss-line pt-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-ss-muted">
            <CreditCard size={14} className="text-ss-green" />
            {memberSince}
          </div>
          <Link href="/scan" className="scanner-icon flex items-center gap-2 rounded-full bg-ss-green px-3 py-2 text-xs font-black text-white">
            <QrCode size={16} />
            QR
          </Link>
        </div>
      </div>
    </div>
  );
}
