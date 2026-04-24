'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Crown, Phone, ShieldCheck, Trash2, UserPlus, UserRound, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminInput, AdminShell, FieldShell, useStaffSession } from '@/components/AdminShell';
import { supabase } from '@/lib/supabase/client';

type StaffRow = {
  id: string;
  full_name: string;
  phone: string | null;
  role: 'owner' | 'admin' | 'staff';
  is_active: boolean;
  created_at_label: string;
};

export default function StaffPage() {
  const { staff } = useStaffSession();
  const [teamMembers, setTeamMembers] = useState<StaffRow[]>([]);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<'owner' | 'staff'>('staff');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingTeam, setIsLoadingTeam] = useState(true);
  const [selectedMember, setSelectedMember] = useState<StaffRow | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);

  const roleCopy = useMemo(() => {
    if (role === 'owner') {
      return {
        label: 'Owner Account',
        helper: 'Full access to staff management, settings, and every admin screen.',
        badgeClass: 'bg-amber-100 text-amber-700',
        icon: Crown,
      };
    }

    return {
      label: 'Staff Account',
      helper: 'Access to daily cashier and production tools without owner-only controls.',
      badgeClass: 'bg-emerald-100 text-ss-green',
      icon: ShieldCheck,
    };
  }, [role]);

  const staffOnlyCount = useMemo(
    () => teamMembers.filter((member) => member.role === 'staff' && member.is_active).length,
    [teamMembers]
  );

  const loadTeamMembers = async () => {
    setIsLoadingTeam(true);
    const { data, error: teamError } = await supabase.rpc('admin_list_staff');

    if (teamError) {
      setIsLoadingTeam(false);
      toast.error(teamError.message || 'Could not load staff list.');
      return;
    }

    setTeamMembers((data || []) as StaffRow[]);
    setIsLoadingTeam(false);
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadTeamMembers();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const hasElevatedAccess = staff?.role === 'owner' || staff?.role === 'admin';

  if (staff && !hasElevatedAccess) {
    return (
      <AdminShell title="Add Staff" subtitle="Admin-only staff and admin registration.">
        <section className="rounded-3xl border border-red-100 bg-white p-5 shadow-sm">
          <p className="text-base font-black text-slate-900">Access restricted</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Only admin or owner accounts can add staff members.</p>
        </section>
      </AdminShell>
    );
  }

  const resetForm = () => {
    setFullName('');
    setPhone('');
    setPin('');
    setRole('staff');
    setError('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!staff) return;

    setError('');
    setIsSaving(true);

    const { error: staffError } = await supabase.rpc('admin_create_staff', {
      p_owner_staff_id: staff.id,
      p_full_name: fullName.trim(),
      p_phone: phone,
      p_pin: pin,
      p_role: role,
    });

    setIsSaving(false);

    if (staffError) {
      setError(staffError.message || 'Could not add staff.');
      return;
    }

    toast.success(`${fullName.trim()} can now login as ${role}.`);
    resetForm();
    await loadTeamMembers();
  };

  const handleDeactivateStaff = async () => {
    if (!staff || !selectedMember) return;
    const staffName = selectedMember.full_name;

    setIsRemoving(true);

    const { error: deactivateError } = await supabase.rpc('admin_deactivate_staff', {
      p_actor_staff_id: staff.id,
      p_target_staff_id: selectedMember.id,
    });

    setIsRemoving(false);

    if (deactivateError) {
      toast.error(deactivateError.message || 'Could not remove staff account.');
      return;
    }

    toast.success(`${staffName} has been removed from active staff.`);
    setIsRemoveConfirmOpen(false);
    setSelectedMember(null);
    await loadTeamMembers();
  };

  const RoleIcon = roleCopy.icon;
  return (
    <AdminShell title="Add Staff" subtitle="Admin-only staff and admin registration.">
      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.95fr]">
        <form onSubmit={handleSubmit} className="modal-pop rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-ss-green">Create Access</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">Add Staff Member</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Create secure admin or staff login credentials for the SouthStyle admin tools.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldShell label="Full Name">
              <AdminInput>
                <UserRound size={18} className="text-ss-green" />
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Staff name"
                  className="min-w-0 flex-1 bg-transparent text-sm font-black text-slate-900 outline-none placeholder:text-slate-400"
                />
              </AdminInput>
            </FieldShell>

            <FieldShell label="Phone">
              <AdminInput>
                <Phone size={18} className="text-ss-green" />
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 11))}
                  inputMode="tel"
                  maxLength={11}
                  placeholder="09170000000"
                  className="min-w-0 flex-1 bg-transparent text-sm font-black text-slate-900 outline-none placeholder:text-slate-400"
                />
              </AdminInput>
            </FieldShell>

            <FieldShell label="PIN">
              <AdminInput>
                <UserPlus size={18} className="text-ss-green" />
                <input
                  value={pin}
                  onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                  inputMode="numeric"
                  type="password"
                  maxLength={4}
                  placeholder="1234"
                  className="min-w-0 flex-1 bg-transparent text-sm font-black text-slate-900 outline-none placeholder:text-slate-400"
                />
              </AdminInput>
            </FieldShell>

            <FieldShell label="Role">
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as 'owner' | 'staff')}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-black text-slate-900 outline-none transition-colors focus:border-emerald-300"
              >
                <option value="staff">Staff</option>
                <option value="owner">Owner</option>
              </select>
            </FieldShell>
          </div>

          <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Role Preview</p>
                <p className="mt-1 text-sm font-black text-slate-900">{roleCopy.label}</p>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{roleCopy.helper}</p>
              </div>
              <div className={`grid h-11 w-11 place-items-center rounded-2xl ${roleCopy.badgeClass}`}>
                <RoleIcon size={20} />
              </div>
            </div>
          </div>

          {error && <p className="notice-pop mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-600">{error}</p>}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={resetForm}
              className="tap-button rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-700"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="tap-button flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#078b3e,#10b981)] px-5 py-4 text-sm font-black text-white shadow-lg shadow-emerald-900/15 disabled:opacity-60"
            >
              <UserPlus size={18} />
              {isSaving ? 'Saving...' : 'Add Staff'}
            </button>
          </div>
        </form>

        <section className="modal-pop rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-ss-green">Team Directory</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">Current Staff</h2>
          </div>

          <div className="grid gap-3">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-3">
              <div className="mb-3 flex items-center justify-between gap-3 px-1">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Existing Accounts</p>
                  <p className="mt-1 text-sm font-black text-slate-900">Active team directory</p>
                </div>
                <div className="rounded-2xl border border-[#1f261f]/12 bg-[#f1f5ef] px-4 py-3 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Staff</p>
                  <p className="mt-1 text-2xl font-black text-slate-900">{staffOnlyCount}</p>
                </div>
              </div>

              <div className="max-h-[24rem] space-y-3 overflow-y-auto pr-1">
                {isLoadingTeam ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm font-semibold text-slate-500">
                    Loading staff accounts...
                  </div>
                ) : teamMembers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm font-semibold text-slate-500">
                    No staff accounts found yet.
                  </div>
                ) : (
                  teamMembers.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => setSelectedMember(member)}
                      className="tap-button w-full rounded-2xl border border-white bg-white p-4 text-left shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-900">{member.full_name}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">{member.phone || 'No phone set'}</p>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-black ${
                              member.role === 'owner' || member.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-ss-green'
                            }`}
                          >
                            {member.role === 'owner' ? 'Owner' : member.role === 'admin' ? 'Admin' : 'Staff'}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-black ${
                              member.is_active ? 'bg-slate-100 text-slate-700' : 'bg-red-50 text-red-600'
                            }`}
                          >
                            {member.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        Added {member.created_at_label}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      {selectedMember && (
        <div className="modal-pop fixed inset-0 z-[70] flex items-end bg-slate-950/45 p-4 sm:items-center sm:justify-center">
          <button
            type="button"
            aria-label="Close staff details"
            className="absolute inset-0 cursor-default"
            onClick={() => setSelectedMember(null)}
          />
          <section className="relative w-full max-w-md rounded-[30px] bg-white p-5 shadow-2xl shadow-slate-950/20">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-ss-green">Staff Details</p>
                <h3 className="mt-1 text-2xl font-black text-slate-900">{selectedMember.full_name}</h3>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  {selectedMember.phone || 'No phone set'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="tap-button grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <article className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Role</p>
                <p className="mt-2 text-sm font-black text-slate-900">
                  {selectedMember.role === 'owner' ? 'Owner' : selectedMember.role === 'admin' ? 'Admin' : 'Staff'}
                </p>
              </article>
              <article className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Status</p>
                <p className="mt-2 text-sm font-black text-slate-900">
                  {selectedMember.is_active ? 'Active account' : 'Inactive account'}
                </p>
              </article>
              <article className="rounded-2xl bg-slate-50 p-4 sm:col-span-2">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Created</p>
                <p className="mt-2 text-sm font-black text-slate-900">{selectedMember.created_at_label}</p>
              </article>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="tap-button rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-black text-slate-700"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => setIsRemoveConfirmOpen(true)}
                disabled={isRemoving || !selectedMember.is_active || selectedMember.id === staff?.id}
                className="tap-button flex items-center justify-center gap-2 rounded-2xl bg-rose-500 px-4 py-4 text-sm font-black text-white shadow-lg shadow-rose-900/15 disabled:opacity-60"
              >
                <Trash2 size={18} />
                {isRemoving ? 'Removing...' : selectedMember.is_active ? 'Remove Staff' : 'Already Removed'}
              </button>
            </div>
          </section>
        </div>
      )}

      {selectedMember && isRemoveConfirmOpen && (
        <div className="modal-pop fixed inset-0 z-[80] flex items-end bg-slate-950/55 p-4 sm:items-center sm:justify-center">
          <button
            type="button"
            aria-label="Close remove staff confirmation"
            className="absolute inset-0 cursor-default"
            onClick={() => setIsRemoveConfirmOpen(false)}
          />
          <section className="relative w-full max-w-sm rounded-[30px] bg-white p-5 shadow-2xl shadow-slate-950/20">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-rose-500">Confirm Removal</p>
                <h3 className="mt-1 text-xl font-black text-slate-900">Remove {selectedMember.full_name}?</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  This will deactivate the account and prevent that staff member from signing in.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRemoveConfirmOpen(false)}
                className="tap-button grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-400">Account</p>
              <p className="mt-2 text-sm font-black text-slate-900">{selectedMember.full_name}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{selectedMember.phone || 'No phone set'}</p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setIsRemoveConfirmOpen(false)}
                disabled={isRemoving}
                className="tap-button rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-black text-slate-700 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeactivateStaff}
                disabled={isRemoving}
                className="tap-button flex items-center justify-center gap-2 rounded-2xl bg-rose-500 px-4 py-4 text-sm font-black text-white shadow-lg shadow-rose-900/15 disabled:opacity-60"
              >
                <Trash2 size={18} />
                {isRemoving ? 'Removing...' : 'Yes, Remove'}
              </button>
            </div>
          </section>
        </div>
      )}
    </AdminShell>
  );
}
