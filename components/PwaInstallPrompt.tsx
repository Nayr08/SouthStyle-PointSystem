'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, Share2, Smartphone, X } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const DISMISS_KEY = 'southstyle:pwa-install-dismissed';
const APPLE_HINT_KEY = 'southstyle:pwa-apple-hint-dismissed';

function isIosSafari() {
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(userAgent);
  const isSafari = /safari/.test(userAgent) && !/crios|fxios|edgios/.test(userAgent);
  return isIos && isSafari;
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function PwaInstallPrompt({ enabled = true }: { enabled?: boolean }) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showAndroidPrompt, setShowAndroidPrompt] = useState(false);
  const [showAppleHint, setShowAppleHint] = useState(false);
  const isPromptEligible = useMemo(
    () => enabled && typeof window !== 'undefined' && !isStandalone(),
    [enabled],
  );

  useEffect(() => {
    if (!enabled) return;

    const standalone = isStandalone();

    const dismissed = window.localStorage.getItem(DISMISS_KEY);
    const appleDismissed = window.localStorage.getItem(APPLE_HINT_KEY);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);

      if (!dismissed && !standalone) {
        setShowAndroidPrompt(true);
      }
    };

    const handleInstalled = () => {
      setShowAndroidPrompt(false);
      setShowAppleHint(false);
      window.localStorage.setItem(DISMISS_KEY, '1');
      window.localStorage.setItem(APPLE_HINT_KEY, '1');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    let timeoutId: number | null = null;

    if (!dismissed && !appleDismissed && isIosSafari() && !standalone) {
      timeoutId = window.setTimeout(() => {
        setShowAppleHint(true);
      }, 1600);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);

      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [enabled]);

  if (!enabled || !isPromptEligible) {
    return null;
  }

  const dismissAndroidPrompt = () => {
    window.localStorage.setItem(DISMISS_KEY, '1');
    setShowAndroidPrompt(false);
  };

  const dismissAppleHint = () => {
    window.localStorage.setItem(APPLE_HINT_KEY, '1');
    setShowAppleHint(false);
  };

  const handleInstall = async () => {
    if (!installEvent) return;

    await installEvent.prompt();
    const choice = await installEvent.userChoice;

    if (choice.outcome === 'accepted') {
      window.localStorage.setItem(DISMISS_KEY, '1');
      setShowAndroidPrompt(false);
      setInstallEvent(null);
      return;
    }

    dismissAndroidPrompt();
  };

  return (
    <>
      {showAndroidPrompt && installEvent && (
        <div className="fixed inset-x-4 bottom-24 z-[120] mx-auto max-w-sm rounded-3xl border border-emerald-100 bg-white/95 p-4 shadow-2xl shadow-green-950/15 backdrop-blur">
          <button onClick={dismissAndroidPrompt} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-500">
            <X size={16} />
          </button>
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-ss-green">
              <Download size={18} />
            </div>
            <div className="pr-8">
              <p className="text-sm font-black text-slate-900">Install Southstyle App</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                Add this to your home screen for a faster, full-screen app experience.
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={dismissAndroidPrompt} className="tap-button flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-600">
              Later
            </button>
            <button
              onClick={handleInstall}
              className="tap-button flex-1 rounded-2xl bg-[linear-gradient(160deg,#078b3e_0%,#046b31_100%)] px-4 py-3 text-sm font-black text-white shadow-lg shadow-green-900/20"
            >
              Install
            </button>
          </div>
        </div>
      )}

      {showAppleHint && (
        <div className="fixed inset-x-4 bottom-24 z-[120] mx-auto max-w-sm rounded-3xl border border-cyan-100 bg-white/95 p-4 shadow-2xl shadow-cyan-950/10 backdrop-blur">
          <button onClick={dismissAppleHint} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-500">
            <X size={16} />
          </button>
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cyan-100 text-cyan-700">
              <Smartphone size={18} />
            </div>
            <div className="pr-8">
              <p className="text-sm font-black text-slate-900">Add To Home Screen</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                On iPhone, tap <span className="font-black text-slate-700">Share</span> then choose <span className="font-black text-slate-700">Add to Home Screen</span>.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-3 text-sm font-black text-slate-700">
            <Share2 size={16} />
            Share
            <span className="text-slate-400">{'->'}</span>
            Add to Home Screen
          </div>
        </div>
      )}
    </>
  );
}
