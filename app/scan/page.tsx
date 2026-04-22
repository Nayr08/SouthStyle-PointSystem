'use client';

import { useEffect, useRef, useState } from 'react';
import BottomNav from '@/components/BottomNav';
import { ArrowLeft, Camera, Flashlight, QrCode, RotateCcw, UserRound } from 'lucide-react';
import Link from 'next/link';

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [mode, setMode] = useState<'scan' | 'account'>('scan');
  const [cameraStatus, setCameraStatus] = useState('Point the camera at a customer QR code.');

  useEffect(() => {
    if (window.location.search.includes('view=qr')) {
      setMode('account');
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const startCamera = async () => {
      if (mode !== 'scan') {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraStatus('Camera is not available in this browser.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraStatus('Scanner ready.');
      } catch {
        setCameraStatus('Allow camera access to scan QR codes.');
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [mode]);

  const isScanner = mode === 'scan';

  return (
    <>
      <main className="phone-shell bg-slate-950 pb-28 text-white">
        <section className="relative min-h-[calc(100svh-88px)] overflow-hidden bg-slate-950">
          {isScanner ? (
            <div className="absolute inset-0">
              <video ref={videoRef} className="h-full w-full object-cover" playsInline muted autoPlay />
              <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/10 to-black/70" />
            </div>
          ) : (
            <div className="absolute inset-0 green-hero" />
          )}

          <div className="relative z-10 flex min-h-[calc(100svh-88px)] flex-col px-5 pt-6">
            <div className="mb-8 flex items-center justify-between">
              <Link href="/" className="grid h-10 w-10 place-items-center rounded-full bg-white/15 backdrop-blur">
                <ArrowLeft size={20} />
              </Link>
              <h1 className="text-lg font-black">{isScanner ? 'Scan QR Code' : 'My QR Code'}</h1>
              <button
                onClick={() => setMode(isScanner ? 'account' : 'scan')}
                className="grid h-10 w-10 place-items-center rounded-full bg-white/15 backdrop-blur"
                title={isScanner ? 'Show my QR' : 'Open scanner'}
              >
                {isScanner ? <QrCode size={20} /> : <Camera size={20} />}
              </button>
            </div>

            {isScanner ? (
              <div className="flex flex-1 flex-col items-center justify-center pb-10">
                <div className="relative grid aspect-square w-full max-w-[290px] place-items-center">
                  <div className="absolute left-0 top-0 h-20 w-20 rounded-tl-[28px] border-l-4 border-t-4 border-white" />
                  <div className="absolute right-0 top-0 h-20 w-20 rounded-tr-[28px] border-r-4 border-t-4 border-white" />
                  <div className="absolute bottom-0 left-0 h-20 w-20 rounded-bl-[28px] border-b-4 border-l-4 border-white" />
                  <div className="absolute bottom-0 right-0 h-20 w-20 rounded-br-[28px] border-b-4 border-r-4 border-white" />
                  <div className="absolute left-8 right-8 top-1/2 h-px bg-emerald-300 shadow-[0_0_18px_rgba(52,211,153,0.9)]" />
                  <div className="rounded-3xl border border-white/15 bg-black/20 px-5 py-3 text-center text-xs font-bold text-white/80 backdrop-blur">
                    {cameraStatus}
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                  <button className="grid h-12 w-12 place-items-center rounded-full bg-white/15 backdrop-blur" title="Flash">
                    <Flashlight size={20} />
                  </button>
                  <button className="grid h-12 w-12 place-items-center rounded-full bg-white/15 backdrop-blur" title="Switch camera">
                    <RotateCcw size={20} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center pb-10">
                <div className="w-full max-w-[310px] rounded-[32px] border border-white/25 bg-white/15 p-5 text-center shadow-2xl shadow-black/25 backdrop-blur-xl">
                  <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-white/15">
                    <UserRound size={26} />
                  </div>
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-white/60">Southstyle Suki</p>
                  <h2 className="mt-2 text-2xl font-black">Pristia Candra</h2>
                  <div className="mx-auto mt-6 grid aspect-square w-full max-w-[220px] place-items-center rounded-[28px] bg-white p-5">
                    <QrCode size={160} className="text-slate-950" strokeWidth={2.4} />
                  </div>
                  <p className="mt-5 text-xs font-semibold leading-5 text-white/70">
                    Show this QR to staff if the RFID card is not available.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      <BottomNav />
    </>
  );
}
