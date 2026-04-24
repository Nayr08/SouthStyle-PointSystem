'use client';

import { useEffect, useState } from 'react';
import BottomNav from '@/components/BottomNav';
import { QrCode, UserRound } from 'lucide-react';
import QRCode from 'qrcode';
import { getCustomerSession, CustomerSession } from '@/lib/customer-session';

export default function ScanPage() {
  const [customer] = useState<CustomerSession | null>(() => (typeof window === 'undefined' ? null : getCustomerSession()));
  const [qrImage, setQrImage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadQrImage = async () => {
      const qrValue = customer?.qr_token?.trim();

      if (!qrValue) {
        setQrImage('');
        return;
      }

      try {
        const image = await QRCode.toDataURL(qrValue, {
          width: 320,
          margin: 1,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        });

        if (isMounted) {
          setQrImage(image);
        }
      } catch {
        if (isMounted) {
          setQrImage('');
        }
      }
    };

    void loadQrImage();

    return () => {
      isMounted = false;
    };
  }, [customer?.qr_token]);

  return (
    <>
      <main className="animate-page phone-shell green-hero pb-28 text-white">
        <section className="relative min-h-[calc(100svh-88px)] overflow-hidden px-5 pt-6">
          <div className="mx-auto flex min-h-[calc(100svh-112px)] max-w-[430px] flex-col">
            <div className="mb-8 flex items-center justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-white/15 backdrop-blur">
                <QrCode size={20} />
              </div>
              <h1 className="text-lg font-black">My QR Code</h1>
              <div className="h-10 w-10" aria-hidden="true" />
            </div>

            <div className="flex flex-1 flex-col items-center justify-center pb-10">
              <div className="animate-pop w-full max-w-[330px] rounded-[32px] border border-white/25 bg-white/15 p-5 text-center shadow-2xl shadow-black/25 backdrop-blur-xl">
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-white/15">
                  <UserRound size={26} />
                </div>
                <p className="text-sm font-black uppercase tracking-[0.16em] text-white/60">SouthStyle Suki</p>
                <h2 className="mt-2 text-2xl font-black">{customer?.full_name || 'Suki Member'}</h2>

                <div className="mx-auto mt-6 grid aspect-square w-full max-w-[240px] place-items-center rounded-[28px] bg-white p-5">
                  {qrImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrImage} alt="Customer QR code" className="h-full w-full object-contain" />
                  ) : (
                    <div className="grid h-full w-full place-items-center rounded-[20px] border border-dashed border-slate-200 text-slate-400">
                      <QrCode size={92} />
                    </div>
                  )}
                </div>

                <p className="mt-5 text-xs font-semibold leading-5 text-white/70">
                  Show this QR to staff so they can find your account quickly.
                </p>
                <p className="mt-3 break-all text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100/85">
                  {customer?.qr_token || 'QR token unavailable'}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <BottomNav />
    </>
  );
}
