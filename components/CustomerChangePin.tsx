'use client';

import { FormEvent, useState } from 'react';
import { ArrowRight, KeyRound, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';

export function CustomerChangePin({ customerId }: { customerId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setError('');
  };

  const closeModal = () => {
    if (isSaving) return;
    resetForm();
    setIsOpen(false);
  };

  const handlePinChange = (setter: (value: string) => void) => (value: string) => {
    setter(value.replace(/\D/g, '').slice(0, 4));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (currentPin.length !== 4 || newPin.length !== 4 || confirmPin.length !== 4) {
      setError('All MPIN fields must be exactly 4 digits.');
      return;
    }

    if (newPin !== confirmPin) {
      setError('New MPIN and confirmation do not match.');
      return;
    }

    if (newPin === currentPin) {
      setError('New MPIN must be different from the current MPIN.');
      return;
    }

    setIsSaving(true);

    const { error: changePinError } = await supabase.rpc('customer_change_pin', {
      p_customer_id: customerId,
      p_current_pin: currentPin,
      p_new_pin: newPin,
    });

    setIsSaving(false);

    if (changePinError) {
      setError(changePinError.message || 'Could not change MPIN.');
      return;
    }

    toast.success('MPIN changed successfully.');
    closeModal();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="tap-card flex w-full items-center gap-4 rounded-3xl border border-emerald-100 bg-white p-5 text-left shadow-[0_14px_28px_-24px_rgba(15,23,42,0.24)] transition hover:border-emerald-200 hover:bg-emerald-50/35"
      >
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-emerald-100 bg-emerald-50 text-ss-green shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <KeyRound size={24} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-slate-900">Change MPIN</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">Update your 4-digit login PIN.</p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[#1f261f]/12 bg-[#fcfdfb] text-ss-green shadow-[0_10px_24px_-18px_rgba(15,24,18,0.35)]">
          <ArrowRight size={18} />
        </span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[90] grid place-items-end bg-black/45 px-5 pb-5 pt-8 backdrop-blur-sm sm:place-items-center">
          <button
            type="button"
            aria-label="Close change MPIN"
            className="absolute inset-0 cursor-default"
            onClick={closeModal}
          />
          <form onSubmit={handleSubmit} className="modal-sheet relative w-full max-w-[430px] overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white">
              <div className="mb-5 flex items-start justify-between gap-4">
                <KeyRound size={34} className="text-white" strokeWidth={2.4} />
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="tap-button grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur disabled:opacity-60"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-xl font-black">Change your MPIN</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-white/80">
                Enter your previous MPIN before setting a new one.
              </p>
            </div>

            <div className="grid gap-3 p-5">
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Current MPIN</span>
                <input
                  value={currentPin}
                  onChange={(event) => handlePinChange(setCurrentPin)(event.target.value)}
                  inputMode="numeric"
                  type="password"
                  maxLength={4}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-black text-slate-900 outline-none transition-colors focus:border-emerald-300"
                  placeholder="0000"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">New MPIN</span>
                <input
                  value={newPin}
                  onChange={(event) => handlePinChange(setNewPin)(event.target.value)}
                  inputMode="numeric"
                  type="password"
                  maxLength={4}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-black text-slate-900 outline-none transition-colors focus:border-emerald-300"
                  placeholder="0000"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Re-enter New MPIN</span>
                <input
                  value={confirmPin}
                  onChange={(event) => handlePinChange(setConfirmPin)(event.target.value)}
                  inputMode="numeric"
                  type="password"
                  maxLength={4}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-black text-slate-900 outline-none transition-colors focus:border-emerald-300"
                  placeholder="0000"
                />
              </label>

              {error && <p className="notice-pop rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={isSaving}
                className="tap-button mt-2 rounded-2xl bg-[linear-gradient(135deg,#078b3e,#10b981)] px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-emerald-900/20 disabled:opacity-60"
              >
                {isSaving ? 'Changing MPIN...' : 'Change MPIN'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
