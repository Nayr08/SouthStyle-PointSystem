'use client';

import { FormEvent, useState } from 'react';
import BottomNav from '@/components/BottomNav';
import { ArrowLeft, Flashlight, QrCode } from 'lucide-react';
import Link from 'next/link';

export default function ScanPage() {
  const [qrInput, setQrInput] = useState('');
  const [message, setMessage] = useState('RFID reader or QR backup can identify the customer card.');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = qrInput.trim();
    if (!code) {
      setMessage('Enter a card ID, RFID code, or QR token first.');
      return;
    }
    setMessage(`Card ${code} is ready for customer lookup.`);
    setQrInput('');
  };

  return (
    <>
      <main className="phone-shell pb-28">
        <section className="green-hero min-h-[510px] px-5 pt-6 text-white">
          <div className="mb-8 flex items-center justify-between">
            <Link href="/" className="grid h-10 w-10 place-items-center rounded-full bg-white/10">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-lg font-black">Scan QR Code</h1>
            <button className="grid h-10 w-10 place-items-center rounded-full bg-white/10" title="Flash">
              <Flashlight size={18} />
            </button>
          </div>

          <div className="mx-auto flex h-[310px] max-w-[290px] items-center justify-center">
            <div className="relative grid h-56 w-44 place-items-center rounded-[28px] bg-zinc-950 p-3 shadow-2xl">
              <div className="absolute top-3 h-2 w-14 rounded-full bg-black/70" />
              <div className="grid h-44 w-36 place-items-center rounded-lg bg-white">
                <QrCode size={96} className="text-black" />
              </div>
              <div className="absolute left-[-28px] top-12 h-20 w-20 rounded-l-3xl border-l-4 border-t-4 border-white" />
              <div className="absolute right-[-28px] top-12 h-20 w-20 rounded-r-3xl border-r-4 border-t-4 border-white" />
              <div className="absolute left-[-28px] bottom-12 h-20 w-20 rounded-l-3xl border-b-4 border-l-4 border-white" />
              <div className="absolute right-[-28px] bottom-12 h-20 w-20 rounded-r-3xl border-b-4 border-r-4 border-white" />
              <div className="absolute left-[-18px] right-[-18px] top-1/2 h-px bg-white/80" />
            </div>
          </div>
        </section>

        <section className="-mt-20 rounded-t-[28px] bg-white px-5 pb-8 pt-6">
          <h2 className="text-lg font-black text-ss-ink">Or Input QR Code</h2>
          <p className="mt-2 text-sm leading-6 text-ss-muted">
            Enter the QR code, RFID UID, or card number manually if scanning has an error.
          </p>
          <form onSubmit={handleSubmit} className="mt-5">
            <label className="mb-2 block text-sm font-bold text-ss-ink">QR Code</label>
            <div className="flex gap-3">
              <input
                value={qrInput}
                onChange={(event) => setQrInput(event.target.value)}
                placeholder="Input here"
                className="min-w-0 flex-1 rounded-lg border border-ss-line bg-white px-4 py-3 text-sm text-ss-ink outline-none transition placeholder:text-ss-muted focus:border-ss-green"
              />
              <button className="rounded-lg bg-ss-orange px-5 text-xs font-black uppercase text-white">
                Submit
              </button>
            </div>
          </form>
          <p className="mt-4 rounded-lg bg-ss-green-soft px-4 py-3 text-sm font-semibold text-ss-green">{message}</p>
        </section>
      </main>
      <BottomNav />
    </>
  );
}
