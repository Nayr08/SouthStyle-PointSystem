'use client';

import { FormEvent, useState } from 'react';
import { KeyRound, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { type StaffSession } from '@/components/AdminShell';
import { supabase } from '@/lib/supabase/client';

export function AdminChangePin({ staff }: { staff: StaffSession }) {
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (currentPin.length !== 4 || newPin.length !== 4 || confirmPin.length !== 4) {
      setError('All PIN fields must be exactly 4 digits.');
      return;
    }

    if (newPin !== confirmPin) {
      setError('New PIN and confirmation do not match.');
      return;
    }

    if (newPin === currentPin) {
      setError('New PIN must be different from the current PIN.');
      return;
    }

    setIsSaving(true);

    const { error: changePinError } = await supabase.rpc('staff_change_pin', {
      p_staff_id: staff.id,
      p_current_pin: currentPin,
      p_new_pin: newPin,
    });

    setIsSaving(false);

    if (changePinError) {
      setError(changePinError.message || 'Could not change PIN.');
      return;
    }

    toast.success('PIN changed successfully.');
    closeModal();
  };

  const handlePinChange = (setter: (value: string) => void) => (value: string) => {
    setter(value.replace(/\D/g, '').slice(0, 4));
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="tap-button grid h-11 w-11 place-items-center rounded-2xl bg-white/15 backdrop-blur transition hover:bg-white/20"
        title="Change PIN"
      >
        <KeyRound size={18} />
      </button>

      {isOpen && (
        <div className="modal-pop fixed inset-0 z-[90] flex items-end bg-slate-950/55 p-4 text-slate-900 backdrop-blur-sm sm:items-center sm:justify-center">
          <button
            type="button"
            aria-label="Close change PIN"
            className="absolute inset-0 cursor-default"
            onClick={closeModal}
          />
          <form onSubmit={handleSubmit} className="relative w-full max-w-sm rounded-[30px] bg-white p-5 shadow-2xl shadow-slate-950/25">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-ss-green">Account Security</p>
                <h2 className="mt-1 text-xl font-black text-slate-900">Change PIN</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  Verify your current PIN before setting a new one.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                className="tap-button grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-600 disabled:opacity-60"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-3">
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Current PIN</span>
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
                <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">New PIN</span>
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
                <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Re-enter New PIN</span>
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
            </div>

            {error && <p className="notice-pop mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={isSaving}
              className="tap-button mt-5 w-full rounded-2xl bg-[linear-gradient(135deg,#078b3e,#10b981)] px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-emerald-900/15 disabled:opacity-60"
            >
              {isSaving ? 'Changing PIN...' : 'Change PIN'}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
