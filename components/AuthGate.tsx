'use client';

import Image from 'next/image';
import { ReactNode, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowLeftRight, Delete, Phone, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { CUSTOMER_SESSION_KEY, CustomerSession, PHONE_KEY, setCustomerSession } from '@/lib/customer-session';
import { CustomerPullToRefresh } from '@/components/CustomerPullToRefresh';

const PIN_LENGTH = 4;

function getStoredPhone() {
  try {
    return window.localStorage.getItem(PHONE_KEY) ?? '';
  } catch {
    return '';
  }
}

function setStoredPhone(phone: string) {
  try {
    window.localStorage.setItem(PHONE_KEY, phone);
  } catch {
    // Storage can fail in some mobile/private browsing modes; state still works for this session.
  }
}

function clearStoredPhone() {
  try {
    window.localStorage.removeItem(PHONE_KEY);
    window.localStorage.removeItem(CUSTOMER_SESSION_KEY);
  } catch {
    // Ignore storage cleanup failures during local testing.
  }
}

function maskPhone(phone: string) {
  const clean = phone.replace(/\s+/g, '');
  if (clean.length < 7) return phone;
  return `${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7)}`;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith('/admin');
  const [hasHydrated, setHasHydrated] = useState(false);
  const [savedPhone, setSavedPhone] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [pin, setPin] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [isCheckingPin, setIsCheckingPin] = useState(false);
  const [error, setError] = useState('');
  const [errorTarget, setErrorTarget] = useState<'phone' | 'pin' | null>(null);

  useEffect(() => {
    if (!error) return;

    const timeout = window.setTimeout(() => {
      setError('');
      setErrorTarget(null);
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [error]);

  useEffect(() => {
    const storedPhone = getStoredPhone();
    const storedSession = window.localStorage.getItem(CUSTOMER_SESSION_KEY);

    const timeout = window.setTimeout(() => {
      setSavedPhone(storedPhone);
      setIsUnlocked(Boolean(storedSession));
      setHasHydrated(true);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  if (isAdminRoute) {
    return <>{children}</>;
  }

  if (!hasHydrated) {
    return (
      <main className="login-shell min-h-screen overflow-hidden px-5 py-8 text-white">
        <section className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-[430px] flex-col justify-center">
          <div className="rounded-[30px] border border-white/15 bg-white/10 p-5 backdrop-blur-xl">
            <div className="mb-5 h-24 rounded-3xl bg-white/10 skeleton-shimmer" />
            <div className="mb-4 h-5 rounded-full bg-white/10 skeleton-shimmer" />
            <div className="h-14 rounded-2xl bg-white/10 skeleton-shimmer" />
          </div>
        </section>
      </main>
    );
  }

  const showError = (message: string, target: 'phone' | 'pin') => {
    setError('');
    setErrorTarget(null);

    window.setTimeout(() => {
      setError(message);
      setErrorTarget(target);
    }, 0);
  };

  const savePhoneValue = async (value: string) => {
    if (isCheckingPhone) return false;

    const normalized = value.replace(/[^0-9+]/g, '');

    if (normalized.length < 10) {
      showError('Enter a valid mobile number.', 'phone');
      return false;
    }

    setIsCheckingPhone(true);
    setError('');

    const { data, error: lookupError } = await supabase.rpc('customer_phone_exists', {
      p_phone: normalized,
    });

    setIsCheckingPhone(false);

    if (lookupError) {
      showError('This mobile number is not yet registered.', 'phone');
      return false;
    }

    if (!data) {
      const { data: staffExists } = await supabase.rpc('staff_phone_exists', {
        p_phone: normalized,
      });

      if (staffExists) {
        window.location.href = `/admin/login?phone=${encodeURIComponent(normalized)}`;
        return true;
      }

      showError('This mobile number is not yet registered.', 'phone');
      return false;
    }

    setStoredPhone(normalized);
    setSavedPhone(normalized);
    setPhoneInput('');
    setError('');
    return true;
  };

  const savePhone = async () => {
    await savePhoneValue(phoneInput);
  };

  const handlePhoneInput = (value: string) => {
    const normalized = value.replace(/\D/g, '').slice(0, 11);

    setPhoneInput(normalized);
    setError('');
  };

  const verifyCustomerPin = async (nextPin: string) => {
    setIsCheckingPin(true);
    setError('');

    const { data, error: loginError } = await supabase.rpc('customer_login', {
      p_phone: savedPhone,
      p_pin: nextPin,
    });

    setIsCheckingPin(false);

    if (loginError) {
      setPin('');
      showError('Your MPIN is wrong.', 'pin');
      return;
    }

    const session = Array.isArray(data) ? data[0] : data;

    if (!session) {
      setPin('');
      showError('Your MPIN is wrong.', 'pin');
      return;
    }

    setCustomerSession(session as CustomerSession);
    setIsUnlocked(true);
  };

  const pressNumber = (value: string) => {
    if (isCheckingPin) return;
    setError('');
    setPin((current) => {
      if (current.length >= PIN_LENGTH) return current;
      const next = `${current}${value}`;
      if (next.length === PIN_LENGTH) {
        window.setTimeout(() => verifyCustomerPin(next), 120);
      }
      return next;
    });
  };

  const deletePin = () => {
    setError('');
    setPin((current) => current.slice(0, -1));
  };

  const resetPhone = () => {
    clearStoredPhone();
    setSavedPhone('');
    setPin('');
    setError('');
  };


  if (isUnlocked) {
    return <CustomerPullToRefresh>{children}</CustomerPullToRefresh>;
  }

  if (!savedPhone) {
    return (
      <main className="login-shell min-h-screen overflow-hidden px-5 py-8 text-white">
        <section className="animate-page mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-[430px] flex-col justify-center">
          <div className="animate-rise mb-7 text-center">
            <div className="mx-auto mb-5 grid h-24 w-24 place-items-center">
              <Image
                src="/southstyle-logo.png"
                alt="Southstyle logo"
                width={92}
                height={92}
                className="h-[92px] w-[92px] object-contain drop-shadow-2xl"
                priority
              />
            </div>
            <p className="text-sm font-black uppercase tracking-[0.28em] text-emerald-100/80">SouthStyle Suki</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Welcome Back</h1>
            <p className="mx-auto mt-3 max-w-[300px] text-sm font-semibold leading-6 text-white/75">
              Enter your mobile number to continue to your Suki points account.
            </p>
          </div>

          <div className="animate-rise rounded-[30px] border border-white/25 bg-white/15 p-5 shadow-2xl shadow-green-950/25 backdrop-blur-xl">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 text-white">
                <ShieldCheck size={21} />
              </div>
              <div>
                <p className="text-sm font-black text-white">Enter Mobile Number</p>
                <p className="mt-1 text-xs font-semibold text-white/60">Registered Suki members only</p>
              </div>
            </div>

            <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-white/60">Mobile Number</label>
            <div className={`mb-4 flex items-center gap-3 rounded-2xl border border-white/20 bg-white px-4 py-4 shadow-lg shadow-black/10 ${errorTarget === 'phone' ? 'field-error-shake' : ''}`}>
              <Phone size={18} className="shrink-0 text-ss-green" />
              <input
                value={phoneInput}
                onChange={(event) => handlePhoneInput(event.target.value)}
                onInput={(event) => handlePhoneInput(event.currentTarget.value)}
                inputMode="tel"
                maxLength={11}
                placeholder="09XX XXX XXXX"
                className="min-w-0 flex-1 bg-transparent text-base font-black text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
            <p className="mb-4 text-xs font-semibold leading-5 text-white/60">
              Your number must exist in the SouthStyle Suki database before MPIN login works.
            </p>
            {error && <p className="notice-pop mb-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-600">{error}</p>}
            <button
              type="button"
              disabled={isCheckingPhone}
              onClick={savePhone}
              onTouchEnd={(event) => {
                event.preventDefault();
                savePhone();
              }}
              className="mobile-tap tap-button w-full rounded-2xl bg-white px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-ss-green shadow-xl shadow-black/15 disabled:opacity-60"
            >
              {isCheckingPhone ? 'Checking...' : 'Continue'}
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mpin-shell h-[100svh] overflow-hidden text-white">
      <section className="mx-auto flex h-[100svh] w-full max-w-[430px] flex-col overflow-hidden">
        <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-6 py-5 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.16),transparent_28%)]" />
          <div className="animate-rise relative z-10">
            <div className="mx-auto mb-4 grid h-20 w-20 place-items-center">
              <Image
                src="/southstyle-logo.png"
                alt="Southstyle logo"
                width={78}
                height={78}
                className="h-[78px] w-[78px] object-contain drop-shadow-2xl"
                priority
              />
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-white/75">Southstyle</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">Suki Points</h1>

            <div className="mx-auto mt-5 flex w-fit items-center gap-3 rounded-full bg-white/18 px-6 py-3 shadow-xl shadow-black/10 backdrop-blur">
              <span className="text-xl font-black tracking-widest text-white">{maskPhone(savedPhone)}</span>
              <button type="button" onClick={resetPhone} className="mobile-tap tap-button grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white" title="Change number">
                <ArrowLeftRight size={18} />
              </button>
            </div>

            <p className="mt-6 text-lg font-black tracking-wide">{isCheckingPin ? 'Checking MPIN' : 'Enter your MPIN'}</p>
            <div className={`mt-4 flex justify-center gap-7 ${errorTarget === 'pin' ? 'field-error-shake rounded-2xl py-2' : ''}`}>
              {Array.from({ length: PIN_LENGTH }).map((_, index) => (
                <span
                  key={index}
                  className={`h-3.5 w-3.5 rounded-full border border-white/45 ${pin.length > index ? 'mpin-dot-filled bg-white' : 'bg-transparent'}`}
                />
              ))}
            </div>
            <p className="mt-8 text-xs font-medium text-white/50">Never share your MPIN with anyone.</p>
          </div>
        </div>

        <div className="shrink-0 rounded-t-[28px] bg-[#f4f7fb] px-7 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 text-[#003b7a]">
          <div className="grid grid-cols-3 gap-y-3 text-center">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((number) => (
              <button
                type="button"
                key={number}
                disabled={isCheckingPin}
                onClick={() => pressNumber(number)}
                onTouchEnd={(event) => {
                  event.preventDefault();
                  pressNumber(number);
                }}
                className="mobile-tap tap-button mx-auto grid h-14 w-14 place-items-center rounded-full text-3xl font-medium transition active:bg-blue-100"
              >
                {number}
              </button>
            ))}
            <div />
            <button
              type="button"
              disabled={isCheckingPin}
              onClick={() => pressNumber('0')}
              onTouchEnd={(event) => {
                event.preventDefault();
                pressNumber('0');
              }}
              className="mobile-tap tap-button mx-auto grid h-14 w-14 place-items-center rounded-full text-3xl font-medium transition active:bg-blue-100"
            >
              0
            </button>
            <button
              type="button"
              disabled={isCheckingPin}
              onClick={deletePin}
              onTouchEnd={(event) => {
                event.preventDefault();
                deletePin();
              }}
              className="mobile-tap tap-button mx-auto grid h-16 w-16 place-items-center rounded-full transition active:bg-blue-100"
              title="Delete"
            >
              <Delete size={28} />
            </button>
          </div>
          {error && <p className="notice-pop mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-center text-xs font-bold text-red-600">{error}</p>}
        </div>
      </section>
    </main>
  );
}


