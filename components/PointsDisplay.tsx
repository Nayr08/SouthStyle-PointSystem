'use client';

import Image from 'next/image';
import { Star } from 'lucide-react';

type TierName = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Titanium';

interface PointsDisplayProps {
  points: number;
  tier?: TierName;
}

const tierBadgeStyles: Record<TierName, string> = {
  Bronze: 'border-[#cd7f32]/30 bg-[#cd7f32]/20 text-[#ffd2a1]',
  Silver: 'border-slate-200/40 bg-slate-200/20 text-slate-100',
  Gold: 'border-amber-300/40 bg-amber-400/20 text-amber-200',
  Platinum: 'border-cyan-200/40 bg-cyan-200/20 text-cyan-100',
  Diamond: 'border-sky-200/40 bg-sky-300/20 text-sky-100',
  Titanium: 'border-zinc-100/40 bg-zinc-300/20 text-zinc-50',
};

export function PointsDisplay({ points, tier = 'Platinum' }: PointsDisplayProps) {
  return (
    <div className="animate-rise tap-card -mb-12 overflow-hidden rounded-3xl border border-white/25 bg-white/12 shadow-2xl shadow-green-950/25 backdrop-blur-xl">
      <div className="relative p-4">
        <div className="absolute -right-10 -top-12 h-28 w-28 rounded-full bg-white/15 blur-sm" />
        <div className="absolute -bottom-12 left-16 h-24 w-24 rounded-full bg-emerald-300/15 blur-sm" />

        <div className="relative flex min-w-0 items-center gap-3">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl">
            <Image
              src="/southstyle-logo.png"
              alt="Southstyle logo"
              width={42}
              height={42}
              className="h-[42px] w-[42px] rounded-xl object-contain"
              priority
            />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Southstyle Suki Card</p>
          </div>
          <div className={`ml-auto flex items-center gap-1 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase ${tierBadgeStyles[tier]}`}>
            <Star size={12} fill="currentColor" />
            {tier}
          </div>
        </div>

        <div className="relative mt-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/65">Available Points</p>
          <div className="mt-1 flex items-end gap-2">
            <strong className="text-[40px] font-black leading-none tracking-tight text-white">
              {points.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
            <p className="pb-1 text-sm font-bold uppercase tracking-[0.12em] text-white/70">points</p>
          </div>
          <p className="mt-2 text-sm font-black text-emerald-200">
            Worth PHP {points.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>
    </div>
  );
}
