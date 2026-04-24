'use client';

import { FormEvent, useState } from 'react';
import { Search, UserRound } from 'lucide-react';
import { AdminInput, AdminShell, FieldShell } from '@/components/AdminShell';
import { supabase } from '@/lib/supabase/client';

type CustomerLookup = {
  customer_id: string;
  full_name: string;
  phone: string;
  points_balance: number;
  rfid_uid: string | null;
  qr_token: string | null;
};

export default function AdminScanPage() {
  const [lookup, setLookup] = useState('');
  const [customer, setCustomer] = useState<CustomerLookup | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setCustomer(null);
    setIsLoading(true);

    const { data, error: lookupError } = await supabase.rpc('admin_lookup_customer', {
      p_lookup: lookup.trim(),
    });

    setIsLoading(false);

    if (lookupError) {
      setError(lookupError.message || 'Customer lookup failed.');
      return;
    }

    const result = Array.isArray(data) ? data[0] : data;

    if (!result) {
      setError('No active customer found.');
      return;
    }

    setCustomer(result as CustomerLookup);
  };

  return (
    <AdminShell title="Scan Card" subtitle="Lookup customer by phone, RFID UID, or QR token.">
      <form onSubmit={handleSearch} className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
        <FieldShell label="Customer Lookup">
          <AdminInput>
            <Search size={18} className="text-ss-green" />
            <input
              value={lookup}
              onChange={(event) => setLookup(event.target.value)}
              placeholder="Phone, RFID UID, or QR token"
              className="min-w-0 flex-1 bg-transparent text-sm font-black text-slate-900 outline-none placeholder:text-slate-400"
            />
          </AdminInput>
        </FieldShell>

        {error && <p className="notice-pop mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-600">{error}</p>}

        <button type="submit" disabled={isLoading} className="tap-button mt-5 w-full rounded-2xl bg-ss-green px-5 py-4 text-sm font-black text-white disabled:opacity-60">
          {isLoading ? 'Searching...' : 'Search Customer'}
        </button>
      </form>

      {customer && (
        <section className="modal-pop mt-5 rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-ss-green text-white">
              <UserRound size={24} />
            </div>
            <div>
              <p className="text-lg font-black text-slate-900">{customer.full_name}</p>
              <p className="text-sm font-semibold text-slate-500">{customer.phone}</p>
            </div>
          </div>
          <div className="grid gap-3 text-sm font-semibold text-slate-600 sm:grid-cols-2">
            <p><span className="font-black text-slate-900">Points:</span> {Number(customer.points_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p><span className="font-black text-slate-900">RFID:</span> {customer.rfid_uid || 'No RFID'}</p>
            <p className="sm:col-span-2"><span className="font-black text-slate-900">QR:</span> {customer.qr_token || 'No QR token'}</p>
          </div>
        </section>
      )}
    </AdminShell>
  );
}
