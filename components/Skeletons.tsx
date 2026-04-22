'use client';

import BottomNav from '@/components/BottomNav';

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`skeleton-shimmer ${className}`} />;
}

function SkeletonHeaderCard() {
  return (
    <section className="green-hero rounded-b-[34px] px-5 pb-24 pt-6 text-white">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <SkeletonBlock className="mb-3 h-3 w-24 rounded-full bg-white/20" />
          <SkeletonBlock className="mb-3 h-6 w-44 rounded-full bg-white/25" />
          <SkeletonBlock className="h-3 w-32 rounded-full bg-white/20" />
        </div>
        <SkeletonBlock className="h-10 w-10 rounded-xl bg-white/20" />
      </div>
      <div className="-mb-16 rounded-3xl border border-white/25 bg-white/12 p-5 shadow-2xl shadow-green-950/25 backdrop-blur-xl">
        <div className="mb-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SkeletonBlock className="h-12 w-12 rounded-2xl bg-white/20" />
            <SkeletonBlock className="h-4 w-36 rounded-full bg-white/20" />
          </div>
          <SkeletonBlock className="h-7 w-24 rounded-full bg-white/20" />
        </div>
        <SkeletonBlock className="mb-3 h-3 w-32 rounded-full bg-white/20" />
        <SkeletonBlock className="mb-3 h-12 w-52 rounded-2xl bg-white/25" />
        <SkeletonBlock className="h-4 w-40 rounded-full bg-white/20" />
      </div>
    </section>
  );
}

export function HomeSkeleton() {
  return (
    <>
      <main className="animate-page phone-shell bg-white pb-28">
        <SkeletonHeaderCard />
        <div className="px-5 pt-18">
          <SkeletonBlock className="mb-6 h-32 rounded-2xl bg-slate-100" />
          <SkeletonBlock className="mb-6 h-36 rounded-2xl bg-emerald-50" />
          <SkeletonBlock className="mb-4 h-6 w-40 rounded-full bg-slate-100" />
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <SkeletonBlock key={item} className="h-32 rounded-2xl bg-slate-100" />
            ))}
          </div>
        </div>
      </main>
      <BottomNav />
    </>
  );
}

export function RedeemSkeleton() {
  return (
    <>
      <main className="animate-page phone-shell bg-white pb-28">
        <header className="green-hero rounded-b-[30px] px-5 pb-14 pt-5 text-white">
          <div className="mb-5 flex items-center justify-between">
            <SkeletonBlock className="h-10 w-10 rounded-xl bg-white/20" />
            <SkeletonBlock className="h-5 w-32 rounded-full bg-white/20" />
            <SkeletonBlock className="h-10 w-10 rounded-xl bg-white/20" />
          </div>
          <div className="rounded-[26px] border border-white/25 bg-white/12 p-4 shadow-2xl shadow-green-950/25 backdrop-blur-xl">
            <SkeletonBlock className="mb-4 h-3 w-32 rounded-full bg-white/20" />
            <SkeletonBlock className="mb-4 h-10 w-48 rounded-2xl bg-white/25" />
            <SkeletonBlock className="h-4 w-36 rounded-full bg-white/20" />
          </div>
        </header>
        <section className="px-5 pt-5">
          <SkeletonBlock className="mb-4 h-6 w-44 rounded-full bg-slate-100" />
          <div className="-mx-5 mb-7 flex gap-3 overflow-hidden px-5 pb-2">
            {[1, 2, 3].map((item) => (
              <SkeletonBlock key={item} className="h-[178px] min-w-[248px] rounded-[26px] bg-emerald-100" />
            ))}
          </div>
          <SkeletonBlock className="h-80 rounded-2xl bg-emerald-50" />
        </section>
      </main>
      <BottomNav />
    </>
  );
}

export function TransactionsSkeleton() {
  return (
    <>
      <main className="animate-page phone-shell bg-white pb-28">
        <header className="green-hero rounded-b-[30px] px-5 pb-8 pt-6 text-white">
          <div className="mb-7 flex items-center justify-between">
            <SkeletonBlock className="h-10 w-10 rounded-full bg-white/20" />
            <SkeletonBlock className="h-5 w-32 rounded-full bg-white/20" />
            <SkeletonBlock className="h-10 w-10 rounded-full bg-white/20" />
          </div>
          <SkeletonBlock className="mx-auto mb-5 h-10 w-44 rounded-full bg-white/25" />
          <SkeletonBlock className="mx-auto h-12 w-72 rounded-2xl bg-white/20" />
        </header>
        <section className="px-5 py-6">
          <SkeletonBlock className="mb-3 h-4 w-20 rounded-full bg-slate-100" />
          <SkeletonBlock className="mb-6 h-32 rounded-lg bg-slate-100" />
          <SkeletonBlock className="mb-3 h-4 w-32 rounded-full bg-slate-100" />
          <SkeletonBlock className="h-44 rounded-lg bg-slate-100" />
        </section>
      </main>
      <BottomNav />
    </>
  );
}

export function AccountSkeleton() {
  return (
    <>
      <main className="animate-page phone-shell bg-white pb-28">
        <header className="px-5 pt-8 text-white">
          <section className="green-hero mx-auto max-w-[390px] rounded-[28px] border border-white/25 p-5 shadow-2xl shadow-green-950/25">
            <div className="mb-7 flex items-start justify-between">
              <div>
                <SkeletonBlock className="mb-3 h-7 w-48 rounded-full bg-white/25" />
                <SkeletonBlock className="h-4 w-32 rounded-full bg-white/20" />
              </div>
              <SkeletonBlock className="h-7 w-24 rounded-full bg-white/20" />
            </div>
            <SkeletonBlock className="h-32 rounded-3xl bg-white/15" />
          </section>
        </header>
        <section className="px-5 pt-6">
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <SkeletonBlock key={item} className="h-24 rounded-3xl bg-emerald-50" />
            ))}
          </div>
          <SkeletonBlock className="mt-6 h-14 rounded-2xl bg-rose-50" />
        </section>
      </main>
      <BottomNav />
    </>
  );
}
