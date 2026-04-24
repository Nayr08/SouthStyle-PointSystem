'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ChevronRight, IdCard, Phone, ScanLine, Search, ShoppingBag, Sparkles, UserRound, UsersRound, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminInput, AdminShell, FieldShell, useStaffSession } from '@/components/AdminShell';
import { tierNames, type TierName } from '@/lib/tiers';
import { supabase } from '@/lib/supabase/client';

type RegisteredCustomer = {
  customer_id: string;
  full_name: string;
  phone: string;
  rfid_uid: string | null;
  qr_token: string;
};

type MemberRow = {
  customer_id: string;
  full_name: string;
  phone: string;
  points_balance: number;
  lifetime_earned: number;
  tier: TierName;
  rfid_uid: string | null;
  qr_token: string | null;
  member_since: string;
};

type CustomerOrder = {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  date_label: string;
  order_status: string;
  items: string;
  total_amount: number;
  points_earned: number;
};

const tierBadgeStyles: Record<TierName, string> = {
  Bronze: 'border-[#f0b071]/40 bg-[#8a4f24]/15 text-[#8a4f24]',
  Silver: 'border-slate-200 bg-slate-100 text-slate-700',
  Gold: 'border-amber-200 bg-amber-100 text-amber-700',
  Platinum: 'border-cyan-200 bg-cyan-100 text-cyan-700',
  Diamond: 'border-sky-200 bg-sky-100 text-sky-700',
  Titanium: 'border-zinc-200 bg-zinc-100 text-zinc-700',
};

export default function RegisterSukiPage() {
  const { hasHydrated, staff } = useStaffSession();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [rfidUid, setRfidUid] = useState('');
  const [activeTab, setActiveTab] = useState<'register' | 'members'>('register');
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [isMembersLoading, setIsMembersLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'All' | TierName>('All');
  const [selectedMember, setSelectedMember] = useState<MemberRow | null>(null);
  const [memberOrders, setMemberOrders] = useState<CustomerOrder[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [isOrdersModalOpen, setIsOrdersModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadMembers = async () => {
    setIsMembersLoading(true);
    const { data } = await supabase.rpc('admin_list_customers');
    setMembers(((data || []) as MemberRow[]).map((member) => ({
      ...member,
      points_balance: Number(member.points_balance),
      lifetime_earned: Number(member.lifetime_earned),
    })));
    setIsMembersLoading(false);
  };

  useEffect(() => {
    if (!hasHydrated || !staff) return;

    const timeoutId = window.setTimeout(() => {
      void loadMembers();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [hasHydrated, staff]);

  const handlePhoneChange = (value: string) => {
    setPhone(value.replace(/\D/g, '').slice(0, 11));
  };

  const handlePinChange = (value: string) => {
    setPin(value.replace(/\D/g, '').slice(0, 4));
  };

  const resetForm = () => {
    setFullName('');
    setPhone('');
    setPin('');
    setRfidUid('');
    setError('');
  };

  const openMemberOrders = async (member: MemberRow) => {
    setSelectedMember(member);
    setIsOrdersModalOpen(true);
    setIsOrdersLoading(true);

    const { data, error: ordersError } = await supabase.rpc('admin_list_orders');

    setIsOrdersLoading(false);

    if (ordersError) {
      toast.error(ordersError.message || 'Could not load customer orders.');
      setMemberOrders([]);
      return;
    }

    setMemberOrders(
      ((data || []) as CustomerOrder[])
        .filter((order) => order.customer_id === member.customer_id)
        .map((order) => ({
          ...order,
          total_amount: Number(order.total_amount),
          points_earned: Number(order.points_earned),
        })),
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!staff) {
      setError('Admin session expired. Login again.');
      return;
    }

    if (!fullName.trim()) {
      setError('Customer name is required.');
      return;
    }

    if (phone.length !== 11) {
      setError('Mobile number must be 11 digits.');
      return;
    }

    if (pin.length !== 4) {
      setError('PIN must be exactly 4 digits.');
      return;
    }

    setIsSaving(true);

    const { data, error: registerError } = await supabase.rpc('register_suki_customer', {
      p_staff_id: staff.id,
      p_full_name: fullName.trim(),
      p_phone: phone,
      p_pin: pin,
      p_rfid_uid: rfidUid.trim() || null,
    });

    setIsSaving(false);

    if (registerError) {
      const message = registerError.message.toLowerCase();

      if (message.includes('customers_phone_key')) {
        setError('This mobile number is already registered.');
        return;
      }

      if (message.includes('cards_rfid_uid_key')) {
        setError('This RFID card is already assigned.');
        return;
      }

      setError(registerError.message || 'Could not register this Suki member.');
      return;
    }

    const result = Array.isArray(data) ? data[0] : data;
    setActiveTab('members');
    resetForm();
    toast.success(`Suki member registration completed for ${(result as RegisteredCustomer).full_name}`);
    await loadMembers();
  };

  if (!hasHydrated || !staff) {
    return null;
  }

  const filteredMembers = members.filter((member) => {
    const matchesTier = tierFilter === 'All' || member.tier === tierFilter;
    const search = memberSearch.trim().toLowerCase();
    const matchesSearch = !search
      || member.full_name.toLowerCase().includes(search)
      || member.phone.includes(search)
      || (member.rfid_uid || '').toLowerCase().includes(search);

    return matchesTier && matchesSearch;
  });

  const bronzeMembers = members.filter((member) => member.tier === 'Bronze').length;
  const premiumMembers = members.filter((member) => member.tier !== 'Bronze').length;

  return (
    <AdminShell title="Register Suki" subtitle="Create new Suki members and browse the current customer base.">
      <section className="mx-auto max-w-4xl">
        <div className="mb-5 rounded-[30px] border border-white/70 bg-white/90 p-1.5 shadow-[0_20px_60px_-36px_rgba(6,78,42,0.45)] backdrop-blur">
          <button
            type="button"
            onClick={() => setActiveTab('register')}
            className={`tap-button w-1/2 rounded-[22px] px-4 py-3 text-sm font-black transition ${activeTab === 'register' ? 'bg-[linear-gradient(135deg,#078b3e,#10b981)] text-white shadow-lg shadow-emerald-900/20' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Register
            <span className={`mt-1 block text-[11px] font-bold ${activeTab === 'register' ? 'text-emerald-50/90' : 'text-slate-400'}`}>Create a new member</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`tap-button w-1/2 rounded-[22px] px-4 py-3 text-sm font-black transition ${activeTab === 'members' ? 'bg-[linear-gradient(135deg,#078b3e,#10b981)] text-white shadow-lg shadow-emerald-900/20' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Members
            <span className={`mt-1 block text-[11px] font-bold ${activeTab === 'members' ? 'text-emerald-50/90' : 'text-slate-400'}`}>Browse all Suki profiles</span>
          </button>
        </div>

        {activeTab === 'register' && (
          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.95fr]">
            <form onSubmit={handleSubmit} className="modal-pop rounded-3xl border border-[#181d18]/14 bg-white p-5 shadow-[0_18px_45px_-38px_rgba(15,23,15,0.45)]">
              <div className="mb-5">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-ss-green">New Membership</p>
                <h2 className="mt-1 text-xl font-black text-slate-900">Register Suki Member</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  Create the customer login, optional RFID card, and QR backup token in one clean onboarding flow.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FieldShell label="Full Name">
                  <AdminInput>
                    <UserRound size={18} className="text-ss-green" />
                    <input
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="Customer name"
                      className="min-w-0 flex-1 bg-transparent text-sm font-black text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </AdminInput>
                </FieldShell>

                <FieldShell label="Mobile Number">
                  <AdminInput>
                    <Phone size={18} className="text-ss-green" />
                    <input
                      value={phone}
                      onChange={(event) => handlePhoneChange(event.target.value)}
                      inputMode="tel"
                      maxLength={11}
                      placeholder="09175550148"
                      className="min-w-0 flex-1 bg-transparent text-sm font-black text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </AdminInput>
                </FieldShell>

                <FieldShell label="Customer PIN">
                  <AdminInput>
                    <IdCard size={18} className="text-ss-green" />
                    <input
                      value={pin}
                      onChange={(event) => handlePinChange(event.target.value)}
                      inputMode="numeric"
                      type="password"
                      maxLength={4}
                      placeholder="1234"
                      className="min-w-0 flex-1 bg-transparent text-sm font-black text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </AdminInput>
                </FieldShell>

                <FieldShell label="RFID UID">
                  <AdminInput>
                    <ScanLine size={18} className="text-ss-green" />
                    <input
                      value={rfidUid}
                      onChange={(event) => setRfidUid(event.target.value)}
                      placeholder="Optional card UID"
                      className="min-w-0 flex-1 bg-transparent text-sm font-black text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </AdminInput>
                </FieldShell>
              </div>

              <div className="mt-4 rounded-[24px] border border-[#181d18]/12 bg-[#f6f4ef] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Registration Preview</p>
                    <p className="mt-1 text-sm font-black text-slate-900">{fullName.trim() || 'New Suki member account'}</p>
                    <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                      This creates a customer login with mobile number access, a 4-digit PIN, and a QR backup token.
                    </p>
                  </div>
                  <div className="grid h-11 w-11 place-items-center rounded-2xl border border-[#181d18]/10 bg-white text-ss-green shadow-sm">
                    <Sparkles size={20} />
                  </div>
                </div>
              </div>

              {error && <p className="notice-pop mt-5 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-600">{error}</p>}

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={resetForm} className="tap-button rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-700">
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="tap-button rounded-2xl bg-[linear-gradient(135deg,#078b3e,#10b981)] px-5 py-4 text-sm font-black text-white shadow-lg shadow-emerald-900/15 disabled:opacity-60"
                >
                  {isSaving ? 'Registering...' : 'Register Suki'}
                </button>
              </div>
            </form>

            <section className="modal-pop rounded-3xl border border-[#181d18]/14 bg-white p-5 shadow-[0_18px_45px_-38px_rgba(15,23,15,0.45)]">
              <div className="mb-5">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-ss-green">Member Snapshot</p>
                <h2 className="mt-1 text-xl font-black text-slate-900">Registration Guide</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  Keep each new Suki account clean, secure, and ready for points and order tracking.
                </p>
              </div>

              <div className="grid gap-3">
                <article className="rounded-2xl border border-[#181d18]/10 bg-[#f5f3ee] p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl border border-[#181d18]/10 bg-white text-ss-green shadow-sm">
                      <UsersRound size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">Current Members</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{members.length} registered profiles</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold leading-6 text-slate-600">
                    Every new registration is added immediately to the member directory and becomes ready for points activity.
                  </p>
                </article>

                <div className="grid gap-3 sm:grid-cols-2">
                  <article className="rounded-2xl border border-[#181d18]/10 bg-[#f5f3ee] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Bronze Members</p>
                    <p className="mt-2 text-2xl font-black text-slate-900">{bronzeMembers}</p>
                  </article>
                  <article className="rounded-2xl border border-[#181d18]/10 bg-[#f7f2e8] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Premium Tiers</p>
                    <p className="mt-2 text-2xl font-black text-slate-900">{premiumMembers}</p>
                  </article>
                </div>

                <article className="rounded-2xl border border-[#181d18]/10 bg-[#f6f5f2] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Onboarding Reminder</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                    Use a unique phone number, set a private 4-digit PIN, and only attach RFID when the physical card is ready.
                  </p>
                </article>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'members' && (
          <section className="modal-pop rounded-3xl border border-[#181d18]/14 bg-white p-5 shadow-[0_18px_45px_-38px_rgba(15,23,15,0.45)]">
            <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-ss-green">Member Directory</p>
                <h2 className="mt-1 text-xl font-black text-slate-900">Registered Members</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  Search the current Suki base, filter by tier, and open each profile for points and order details.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <FieldShell label="Search">
                  <AdminInput>
                    <Search size={18} className="text-ss-green" />
                    <input
                      value={memberSearch}
                      onChange={(event) => setMemberSearch(event.target.value)}
                      placeholder="Name, phone, RFID"
                      className="min-w-0 flex-1 bg-transparent text-sm font-black text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </AdminInput>
                </FieldShell>
                <FieldShell label="Tier">
                  <select
                    value={tierFilter}
                    onChange={(event) => setTierFilter(event.target.value as 'All' | TierName)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-black text-slate-900 outline-none"
                  >
                    <option value="All">All Tiers</option>
                    {tierNames.map((tier) => (
                      <option key={tier} value={tier}>{tier}</option>
                    ))}
                  </select>
                </FieldShell>
              </div>
            </div>

            <div className="mb-4 grid gap-3 md:grid-cols-[1.15fr_0.85fr_0.85fr]">
              <div className="rounded-2xl border border-[#181d18]/10 bg-[#f5f3ee] px-4 py-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Visible Members</p>
                <p className="mt-1 text-lg font-black text-slate-900">{filteredMembers.length}</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                  Tap a member card to open the full profile, codes, and order history.
                </p>
              </div>
              <div className="rounded-2xl border border-[#181d18]/10 bg-[#f6f5f2] px-4 py-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Bronze</p>
                <p className="mt-1 text-lg font-black text-slate-900">{bronzeMembers}</p>
              </div>
              <div className="rounded-2xl border border-[#181d18]/10 bg-[#f6f5f2] px-4 py-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Premium</p>
                <p className="mt-1 text-lg font-black text-slate-900">{premiumMembers}</p>
              </div>
            </div>

            <div className="max-h-[31rem] space-y-3 overflow-y-auto pr-1">
              {isMembersLoading && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm font-bold text-slate-500">
                  Loading members...
                </div>
              )}
              {!isMembersLoading && filteredMembers.map((member) => (
                <button
                  key={member.customer_id}
                  type="button"
                  onClick={() => setSelectedMember(member)}
                  className="tap-button flex w-full items-center justify-between gap-4 rounded-[24px] border border-[#181d18]/12 bg-[#f8f6f1] px-4 py-4 text-left transition hover:border-[#181d18]/20 hover:bg-[#f2eee6]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-base font-black text-slate-900">{member.full_name}</p>
                      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${tierBadgeStyles[member.tier]}`}>
                        {member.tier}
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-slate-500">{member.phone}</p>
                    <p className="mt-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Available Points</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{member.points_balance.toFixed(2)} <span className="text-sm text-slate-500">pts</span></p>
                  </div>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#181d18]/10 bg-white text-slate-500 shadow-sm">
                    <ChevronRight size={18} />
                  </span>
                </button>
              ))}
              {!isMembersLoading && filteredMembers.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm font-bold text-slate-500">
                  No members match this filter yet.
                </div>
              )}
            </div>
          </section>
        )}
      </section>

      {selectedMember && (
        <div className="modal-pop fixed inset-0 z-50 flex items-end bg-slate-950/45 p-4 sm:items-center sm:justify-center">
          <button
            type="button"
            aria-label="Close member details"
            className="absolute inset-0 cursor-default"
            onClick={() => setSelectedMember(null)}
          />
          <section className="relative w-full max-w-lg rounded-[30px] border border-[#181d18]/12 bg-white p-5 shadow-2xl shadow-slate-950/20">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Member Profile</p>
                <h3 className="mt-1 truncate text-2xl font-black text-slate-900">{selectedMember.full_name}</h3>
                <p className="mt-2 text-sm font-semibold text-slate-500">{selectedMember.phone}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedMember(null);
                  setIsOrdersModalOpen(false);
                }}
                className="tap-button grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#181d18]/10 bg-[#f5f3ee] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Available Points</p>
                <p className="mt-2 text-2xl font-black text-slate-900">{selectedMember.points_balance.toFixed(2)} <span className="text-sm text-slate-500">pts</span></p>
              </div>
              <div className="rounded-2xl border border-[#181d18]/10 bg-[#f5f3ee] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Lifetime Earned</p>
                <p className="mt-2 text-2xl font-black text-slate-900">{selectedMember.lifetime_earned.toFixed(2)} <span className="text-sm text-slate-500">pts</span></p>
              </div>
            </div>

            <div className="mb-5 grid gap-3 text-sm font-semibold text-slate-600 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Tier</p>
                <span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-black ${tierBadgeStyles[selectedMember.tier]}`}>
                  {selectedMember.tier}
                </span>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Member Since</p>
                <p className="mt-3 font-black text-slate-900">{selectedMember.member_since}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 sm:col-span-2">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">RFID UID</p>
                <p className="mt-3 break-all font-black text-slate-900">{selectedMember.rfid_uid || 'No RFID assigned'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 sm:col-span-2">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">QR Token</p>
                <p className="mt-3 break-all font-black text-slate-900">{selectedMember.qr_token || 'No QR token'}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => openMemberOrders(selectedMember)}
                className="tap-button flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#078b3e,#10b981)] px-4 py-4 text-sm font-black text-white shadow-lg shadow-emerald-900/20"
              >
                <ShoppingBag size={17} />
                Orders
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedMember(null);
                  setIsOrdersModalOpen(false);
                }}
                className="tap-button rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-black text-slate-700"
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}

      {selectedMember && isOrdersModalOpen && (
        <div className="modal-pop fixed inset-0 z-[60] flex items-end bg-slate-950/50 p-4 sm:items-center sm:justify-center">
          <button
            type="button"
            aria-label="Close member orders"
            className="absolute inset-0 cursor-default"
            onClick={() => setIsOrdersModalOpen(false)}
          />
          <section className="relative w-full max-w-2xl rounded-[30px] border border-[#181d18]/12 bg-white p-5 shadow-2xl shadow-slate-950/20">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-ss-green">Customer Orders</p>
                <h3 className="mt-1 truncate text-2xl font-black text-slate-900">{selectedMember.full_name}</h3>
                <p className="mt-2 text-sm font-semibold text-slate-500">{selectedMember.phone}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOrdersModalOpen(false)}
                className="tap-button grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-4 rounded-2xl border border-[#181d18]/10 bg-[#f5f3ee] px-4 py-3">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Order Count</p>
              <p className="mt-1 text-lg font-black text-slate-900">{memberOrders.length}</p>
            </div>

            <div className="max-h-[26rem] space-y-3 overflow-y-auto pr-1">
              {isOrdersLoading && (
                <div className="rounded-2xl bg-slate-50 p-5 text-center text-sm font-bold text-slate-500">Loading orders...</div>
              )}
              {!isOrdersLoading && memberOrders.map((order) => (
                <article key={order.id} className="rounded-2xl border border-[#181d18]/12 bg-[#f8f6f1] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-slate-900">{order.items.split(' - ')[0]}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">Order #{order.order_number} | {order.date_label}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-[#181d18]/10 bg-[#edf5ed] px-3 py-1 text-xs font-black text-ss-green">
                      {order.order_status === 'in_progress' ? 'In Progress' : order.order_status.charAt(0).toUpperCase() + order.order_status.slice(1)}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
                    <p className="text-sm font-black text-slate-900">PHP {order.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs font-black text-ss-green">+{order.points_earned.toFixed(2)} pts</p>
                  </div>
                </article>
              ))}
              {!isOrdersLoading && memberOrders.length === 0 && (
                <div className="rounded-2xl bg-slate-50 p-5 text-center text-sm font-bold text-slate-500">No orders yet for this Suki member.</div>
              )}
            </div>
          </section>
        </div>
      )}
    </AdminShell>
  );
}
