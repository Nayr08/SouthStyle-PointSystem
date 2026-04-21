'use client';

import { BadgeDollarSign } from 'lucide-react';

export interface Reward {
  id: string;
  name: string;
  cost: number;
  image: string;
}

export function RewardCard({ reward }: { reward: Reward; onRedeem?: (rewardId: string) => void }) {
  return (
    <article className="min-w-[122px] rounded-lg bg-white p-3 card-shadow">
      <div className="mb-3 grid aspect-square place-items-center rounded-lg bg-ss-surface text-center text-3xl font-black text-ss-green">
        {reward.image}
      </div>
      <h3 className="min-h-10 text-sm font-black leading-5 text-ss-ink">{reward.name}</h3>
      <div className="mt-2 flex items-center gap-1 text-ss-green">
        <BadgeDollarSign size={14} />
        <span className="text-xs font-black">{reward.cost.toLocaleString()} point</span>
      </div>
    </article>
  );
}
