'use client';

import Image from 'next/image';
import { ReactNode, useEffect, useState } from 'react';
import { ArrowLeftRight, Delete, Phone, ShieldCheck } from 'lucide-react';

const PHONE_KEY = 'southstyle:test-phone';
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
  const [savedPhone, setSavedPhone] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [pin, setPin] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState('');
  const [debugStatus, setDebugStatus] = useState('Loading login...');

  useEffect(() => {
    const phone = getStoredPhone();
    setSavedPhone(phone);
    setDebugStatus(`Login ready ${new Date().toLocaleTimeString()}`);
  }, []);

  const savePhoneValue = (value: string) => {
    const normalized = value.replace(/[^0-9+]/g, '');

    if (normalized.length < 10) {
      setError('Enter a valid mobile number for testing.');
      return false;
    }

    setStoredPhone(normalized);
    setSavedPhone(normalized);
    setPhoneInput('');
    setError('');
    return true;
  };

  const savePhone = () => {
    savePhoneValue(phoneInput);
  };

  const handlePhoneInput = (value: string) => {
    setPhoneInput(value);
    setError('');
    setDebugStatus(`Typing ${value.replace(/[^0-9+]/g, '').length} digit(s)`);

    if (value.replace(/[^0-9+]/g, '').length >= 10) {
      window.setTimeout(() => savePhoneValue(value), 80);
    }
  };

  const pressNumber = (value: string) => {
    setError('');
    setPin((current) => {
      if (current.length >= PIN_LENGTH) return current;
      const next = `${current}${value}`;
      if (next.length === PIN_LENGTH) {
        window.setTimeout(() => setIsUnlocked(true), 120);
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
    return <>{children}</>;
  }

  if (!savedPhone) {
    return (
      <main className="login-shell min-h-screen overflow-hidden px-5 py-8 text-white">
        <section className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-[430px] flex-col justify-center">
          <div className="mb-7 text-center">
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

          <div className="rounded-[30px] border border-white/25 bg-white/15 p-5 shadow-2xl shadow-green-950/25 backdrop-blur-xl">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 text-white">
                <ShieldCheck size={21} />
              </div>
              <div>
                <p className="text-sm font-black text-white">Set Mobile Number</p>
                <p className="mt-1 text-xs font-semibold text-white/60">For static testing only</p>
              </div>
            </div>

            <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-white/60">Mobile Number</label>
            <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/20 bg-white px-4 py-4 shadow-lg shadow-black/10">
              <Phone size={18} className="shrink-0 text-ss-green" />
              <input
                value={phoneInput}
                onChange={(event) => handlePhoneInput(event.target.value)}
                onInput={(event) => handlePhoneInput(event.currentTarget.value)}
                inputMode="tel"
                placeholder="09XX XXX XXXX"
                className="min-w-0 flex-1 bg-transparent text-base font-black text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
            <p className="mb-4 text-xs font-semibold leading-5 text-white/60">
              Your number is saved on this device. Any valid number can continue for now.
            </p>
            {error && <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-ss-danger">{error}</p>}
            <button
              type="button"
              onClick={savePhone}
              onPointerUp={savePhone}
              onTouchEnd={(event) => {
                event.preventDefault();
                savePhone();
              }}
              className="mobile-tap w-full rounded-2xl bg-white px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-ss-green shadow-xl shadow-black/15"
            >
              Continue
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
          <div className="relative z-10">
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
              <button type="button" onClick={resetPhone} className="mobile-tap grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white" title="Change number">
                <ArrowLeftRight size={18} />
              </button>
            </div>

            <p className="mt-6 text-lg font-black tracking-wide">Enter your MPIN</p>
            <div className="mt-4 flex justify-center gap-7">
              {Array.from({ length: PIN_LENGTH }).map((_, index) => (
                <span
                  key={index}
                  className={`h-3.5 w-3.5 rounded-full border border-white/45 ${pin.length > index ? 'bg-white' : 'bg-transparent'}`}
                />
              ))}
            </div>
            <p className="mt-8 text-xs font-medium text-white/50">Never share your MPIN or OTP with anyone.</p>
          </div>
        </div>

        <div className="shrink-0 rounded-t-[28px] bg-[#f4f7fb] px-7 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 text-[#003b7a]">
          <div className="grid grid-cols-3 gap-y-3 text-center">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((number) => (
              <button
                type="button"
                key={number}
                onClick={() => pressNumber(number)}
                onTouchEnd={(event) => {
                  event.preventDefault();
                  pressNumber(number);
                }}
                className="mobile-tap mx-auto grid h-14 w-14 place-items-center rounded-full text-3xl font-medium transition active:bg-blue-100"
              >
                {number}
              </button>
            ))}
            <div />
            <button
              type="button"
              onClick={() => pressNumber('0')}
              onTouchEnd={(event) => {
                event.preventDefault();
                pressNumber('0');
              }}
              className="mobile-tap mx-auto grid h-14 w-14 place-items-center rounded-full text-3xl font-medium transition active:bg-blue-100"
            >
              0
            </button>
            <button
              type="button"
              onClick={deletePin}
              onTouchEnd={(event) => {
                event.preventDefault();
                deletePin();
              }}
              className="mobile-tap mx-auto grid h-16 w-16 place-items-center rounded-full transition active:bg-blue-100"
              title="Delete"
            >
              <Delete size={28} />
            </button>
          </div>
          {error && <p className="mt-4 text-center text-xs font-bold text-ss-danger">{error}</p>}
        </div>
      </section>
    </main>
  );
}


