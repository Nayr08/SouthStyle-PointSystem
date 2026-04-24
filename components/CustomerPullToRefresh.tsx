'use client';

import { ReactNode, TouchEvent, useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

const REFRESH_THRESHOLD = 82;
const MAX_PULL = 118;

export function CustomerPullToRefresh({ children }: { children: ReactNode }) {
  const startY = useRef(0);
  const startX = useRef(0);
  const isTracking = useRef(false);
  const refreshTimeout = useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const finishRefresh = () => {
      if (refreshTimeout.current) {
        window.clearTimeout(refreshTimeout.current);
      }

      refreshTimeout.current = window.setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      }, 420);
    };

    window.addEventListener('southstyle:customer-refresh-done', finishRefresh);
    return () => {
      window.removeEventListener('southstyle:customer-refresh-done', finishRefresh);
      if (refreshTimeout.current) {
        window.clearTimeout(refreshTimeout.current);
      }
    };
  }, []);

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (isRefreshing || window.scrollY > 0) return;

    const touch = event.touches[0];
    startY.current = touch.clientY;
    startX.current = touch.clientX;
    isTracking.current = true;
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (!isTracking.current || isRefreshing) return;

    const touch = event.touches[0];
    const deltaY = touch.clientY - startY.current;
    const deltaX = Math.abs(touch.clientX - startX.current);

    if (deltaY <= 0 || deltaX > deltaY || window.scrollY > 0) {
      setPullDistance(0);
      return;
    }

    setPullDistance(Math.min(MAX_PULL, deltaY * 0.48));
  };

  const handleTouchEnd = () => {
    if (!isTracking.current || isRefreshing) return;

    isTracking.current = false;

    if (pullDistance >= REFRESH_THRESHOLD) {
      setPullDistance(REFRESH_THRESHOLD);
      setIsRefreshing(true);
      window.dispatchEvent(new CustomEvent('southstyle:customer-refresh'));
      refreshTimeout.current = window.setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      }, 1800);
      return;
    }

    setPullDistance(0);
  };

  const progress = Math.min(1, pullDistance / REFRESH_THRESHOLD);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="relative min-h-screen"
    >
      <div
        className={`pointer-events-none fixed left-1/2 top-3 z-[90] flex -translate-x-1/2 items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2 text-xs font-black text-ss-green shadow-xl shadow-green-950/10 transition-all duration-200 ${
          pullDistance > 8 || isRefreshing ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          transform: `translate(-50%, ${Math.max(0, pullDistance - 32)}px)`,
        }}
      >
        <RefreshCw
          size={16}
          className={isRefreshing ? 'animate-spin' : ''}
          style={{
            transform: isRefreshing ? undefined : `rotate(${progress * 180}deg)`,
          }}
        />
        <span>{isRefreshing ? 'Refreshing...' : pullDistance >= REFRESH_THRESHOLD ? 'Release to refresh' : 'Pull to refresh'}</span>
      </div>
      <div
        className="transition-transform duration-200 ease-out"
        style={{
          transform: pullDistance > 0 && !isRefreshing ? `translateY(${pullDistance * 0.18}px)` : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
