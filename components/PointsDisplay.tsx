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

const tierCardStyles: Record<TierName, {
  frame: string;
  shell: string;
  border: string;
  glow: string;
  shimmer: string;
  accent: string;
  worth: string;
  orbA: string;
  orbB: string;
}> = {
  Bronze: {
    frame: 'border-[#f4c7a3]/45',
    shell: 'from-[#fff7f1]/18 via-[#dc8d5a]/20 to-[#7c3f1e]/28',
    border: 'from-[#ffd4b5] via-[#c9753f] to-[#8d4420]',
    glow: 'shadow-[0_24px_50px_-30px_rgba(172,97,52,0.8)]',
    shimmer: 'from-white/26 via-[#ffcba6]/16 to-transparent',
    accent: 'text-[#ffe0c8]',
    worth: 'text-[#ffd6b5]',
    orbA: 'bg-[#f6c39a]/22',
    orbB: 'bg-[#c46b37]/20',
  },
  Silver: {
    frame: 'border-[#edf3ff]/45',
    shell: 'from-[#fbfdff]/18 via-[#c8d0dd]/18 to-[#7d8796]/26',
    border: 'from-[#f7fbff] via-[#c7cfdd] to-[#8994a5]',
    glow: 'shadow-[0_24px_50px_-30px_rgba(156,166,184,0.72)]',
    shimmer: 'from-white/30 via-[#f5f8ff]/14 to-transparent',
    accent: 'text-[#f7fbff]',
    worth: 'text-[#e4ebf8]',
    orbA: 'bg-[#e4e9f3]/22',
    orbB: 'bg-[#bcc6d6]/18',
  },
  Gold: {
    frame: 'border-[#fff1a3]/48',
    shell: 'from-[#fffce3]/20 via-[#f7c73d]/20 to-[#9b6902]/28',
    border: 'from-[#fff4b7] via-[#ffc530] to-[#b87a00]',
    glow: 'shadow-[0_24px_50px_-30px_rgba(219,166,12,0.82)]',
    shimmer: 'from-white/28 via-[#fff0a8]/18 to-transparent',
    accent: 'text-[#fff4bf]',
    worth: 'text-[#ffe898]',
    orbA: 'bg-[#ffe89a]/24',
    orbB: 'bg-[#d1970f]/20',
  },
  Platinum: {
    frame: 'border-[#dffcff]/48',
    shell: 'from-[#f5ffff]/20 via-[#9ddceb]/18 to-[#357c92]/26',
    border: 'from-[#ecffff] via-[#b7f1fb] to-[#5ba9c0]',
    glow: 'shadow-[0_24px_50px_-30px_rgba(94,179,200,0.78)]',
    shimmer: 'from-white/28 via-[#d5fbff]/18 to-transparent',
    accent: 'text-[#efffff]',
    worth: 'text-[#d4fbff]',
    orbA: 'bg-[#c9f7ff]/24',
    orbB: 'bg-[#6dc7dc]/18',
  },
  Diamond: {
    frame: 'border-[#e9d4ff]/45',
    shell: 'from-[#fff5ff]/18 via-[#9c7dff]/18 to-[#5e2fba]/30',
    border: 'from-[#f5ddff] via-[#bd94ff] to-[#7c4dff]',
    glow: 'shadow-[0_24px_50px_-30px_rgba(129,92,255,0.82)]',
    shimmer: 'from-white/28 via-[#f1dcff]/18 to-transparent',
    accent: 'text-[#f6e7ff]',
    worth: 'text-[#ead0ff]',
    orbA: 'bg-[#e8d2ff]/22',
    orbB: 'bg-[#9263ff]/20',
  },
  Titanium: {
    frame: 'border-[#f2f4f8]/42',
    shell: 'from-[#fafcff]/16 via-[#99a0ab]/18 to-[#2d323b]/30',
    border: 'from-[#fafcff] via-[#b5bbc7] to-[#606773]',
    glow: 'shadow-[0_24px_50px_-30px_rgba(110,117,131,0.78)]',
    shimmer: 'from-white/24 via-[#eef2f8]/14 to-transparent',
    accent: 'text-[#f6f8fb]',
    worth: 'text-[#dfe5ee]',
    orbA: 'bg-[#eef2f7]/20',
    orbB: 'bg-[#888f9b]/18',
  },
};

export function PointsDisplay({ points, tier = 'Platinum' }: PointsDisplayProps) {
  const cardStyle = tierCardStyles[tier];

  return (
    <div className={`animate-rise tap-card -mb-12 overflow-hidden rounded-3xl border bg-white/12 backdrop-blur-xl ${cardStyle.frame} ${cardStyle.glow}`}>
      <div className={`relative bg-gradient-to-br ${cardStyle.shell} p-4`}>
        <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${cardStyle.shimmer}`} />
        <div className={`absolute -right-8 -top-10 h-28 w-28 rounded-full ${cardStyle.orbA} blur-xl`} />
        <div className={`absolute -bottom-10 left-10 h-24 w-24 rounded-full ${cardStyle.orbB} blur-xl`} />
        <div className="absolute inset-[1px] rounded-[calc(1.5rem-1px)] border border-white/10" />

        <div className="relative flex min-w-0 items-center gap-3">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/8 ring-1 ring-white/10">
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
            <p className={`mt-1 text-xs font-black uppercase tracking-[0.12em] ${cardStyle.accent}`}>{tier} Member</p>
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
          <p className={`mt-2 text-sm font-black ${cardStyle.worth}`}>
            Worth PHP {points.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>
    </div>
  );
}
