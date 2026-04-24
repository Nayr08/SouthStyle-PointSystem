'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BadgePlus,
  ChevronRight,
  ClipboardList,
  Gift,
  LogOut,
  Minimize2,
  Sparkles,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react';
import { AdminDashboardSkeleton } from '@/components/Skeletons';
import { supabase } from '@/lib/supabase/client';

const STAFF_SESSION_KEY = 'southstyle:staff-session';
const ADMIN_HEADER_COLLAPSED_KEY = 'southstyle:admin-header-collapsed';

type StaffSession = {
  id: string;
  full_name: string;
  phone: string;
  role: 'owner' | 'admin' | 'staff';
};

type AdminAction = {
  title: string;
  description: string;
  icon: typeof UserPlus;
  href: string;
  group: 'Customers' | 'Orders' | 'Rewards' | 'Team';
  featured?: boolean;
};

type AdminOrderRow = {
  id: string;
  order_status: string;
};

type AdminCouponRow = {
  id: string;
  is_active: boolean;
};

type AdminStaffRow = {
  id: string;
  role: 'owner' | 'admin' | 'staff';
  is_active: boolean;
};

const adminActions: AdminAction[] = [
  {
    title: 'Register New Suki',
    description: 'Create customer profile, RFID card, and QR backup.',
    icon: UserPlus,
    href: '/admin/register',
    group: 'Customers',
    featured: true,
  },
  {
    title: 'Add Order',
    description: 'Create a paid order and award points automatically.',
    icon: BadgePlus,
    href: '/admin/add-points',
    group: 'Orders',
    featured: true,
  },
  {
    title: 'Orders',
    description: 'View orders and update production tracking.',
    icon: ClipboardList,
    href: '/admin/orders',
    group: 'Orders',
  },
  {
    title: 'Set Coupons',
    description: 'Manage print discounts and reward limits.',
    icon: Gift,
    href: '/admin/coupons',
    group: 'Rewards',
  },
  {
    title: 'Add Staff',
    description: 'Owner-only staff account management.',
    icon: UsersRound,
    href: '/admin/staff',
    group: 'Team',
  },
];

const sectionCopy: Record<AdminAction['group'], string> = {
  Customers: 'Customer onboarding and member account creation.',
  Orders: 'Sales entry and production workflow updates.',
  Rewards: 'Coupon setup and loyalty reward controls.',
  Team: 'Staff access and owner-only account management.',
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [hasHydrated, setHasHydrated] = useState(false);
  const [staff, setStaff] = useState<StaffSession | null>(null);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [activeOrdersCount, setActiveOrdersCount] = useState<number | null>(null);
  const [availableCouponsCount, setAvailableCouponsCount] = useState<number | null>(null);
  const [availableStaffCount, setAvailableStaffCount] = useState<number | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const rawSession = window.localStorage.getItem(STAFF_SESSION_KEY);
      const rawHeaderState = window.localStorage.getItem(ADMIN_HEADER_COLLAPSED_KEY);
      setStaff(rawSession ? (JSON.parse(rawSession) as StaffSession) : null);
      setIsHeaderCollapsed(rawHeaderState === 'true');
      setHasHydrated(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      window.localStorage.setItem(ADMIN_HEADER_COLLAPSED_KEY, String(isHeaderCollapsed));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [hasHydrated, isHeaderCollapsed]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!staff) {
      router.replace('/admin/login');
    }
  }, [hasHydrated, router, staff]);

  useEffect(() => {
    if (!hasHydrated || !staff) {
      return;
    }

    const loadDashboardCounts = async () => {
      const [ordersResult, couponsResult, staffResult] = await Promise.all([
        supabase.rpc('admin_list_orders'),
        supabase.rpc('admin_list_coupons'),
        supabase.rpc('admin_list_staff'),
      ]);

      if (ordersResult.error) {
        setActiveOrdersCount(null);
      } else {
        const activeOrders = ((ordersResult.data || []) as AdminOrderRow[]).filter(
          (order) => order.order_status !== 'claimed',
        );

        setActiveOrdersCount(activeOrders.length);
      }

      if (couponsResult.error) {
        setAvailableCouponsCount(null);
      } else {
        const activeCoupons = ((couponsResult.data || []) as AdminCouponRow[]).filter(
          (coupon) => coupon.is_active,
        );

        setAvailableCouponsCount(activeCoupons.length);
      }

      if (staffResult.error) {
        setAvailableStaffCount(null);
      } else {
        const activeStaff = ((staffResult.data || []) as AdminStaffRow[]).filter(
          (member) => member.role === 'staff' && member.is_active,
        );

        setAvailableStaffCount(activeStaff.length);
      }
    };

    void loadDashboardCounts();
  }, [hasHydrated, staff]);

  const logout = () => {
    window.localStorage.removeItem(STAFF_SESSION_KEY);
    router.replace('/');
  };

  if (!hasHydrated || !staff) {
    return <AdminDashboardSkeleton />;
  }

  const hasElevatedAccess = staff.role === 'owner' || staff.role === 'admin';

  const visibleActions = hasElevatedAccess
    ? adminActions
    : adminActions.filter((action) => action.href !== '/admin/staff');

  const featuredActions = visibleActions.filter((action) => action.featured);
  const groupedActions: Record<AdminAction['group'], AdminAction[]> = {
    Customers: [],
    Orders: [],
    Rewards: [],
    Team: [],
  };

  visibleActions
    .filter((action) => !action.featured)
    .forEach((action) => {
      groupedActions[action.group].push(action);
    });

  const quickStats = [
    {
      label: 'Access',
      value: hasElevatedAccess ? (staff.role === 'admin' ? 'Admin' : 'Owner') : 'Staff',
      helper: hasElevatedAccess ? 'Full dashboard control' : 'Operations access',
    },
    {
      label: 'Featured Actions',
      value: String(featuredActions.length),
      helper: 'Priority daily tools',
    },
    {
      label: 'Sections',
      value: '4',
      helper: 'Customers, Orders, Rewards, Team',
    },
  ];
  const dashboardTitle = hasElevatedAccess ? 'Admin Dashboard' : 'Staff Dashboard';

  return (
    <main className="animate-page min-h-screen bg-[#f0ede6] pb-10 text-slate-900">
      <header className={`green-hero rounded-b-[30px] px-5 pt-6 text-white transition-all duration-300 ${isHeaderCollapsed ? 'pb-4' : 'pb-8'}`}>
        <div className="mx-auto max-w-6xl">
          <div className={`flex justify-between gap-4 ${isHeaderCollapsed ? 'items-center mb-0' : 'items-start mb-5'}`}>
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/12 shadow-xl shadow-green-950/20 backdrop-blur">
                <Image src="/southstyle-logo.png" alt="Southstyle logo" width={34} height={34} className="h-[34px] w-[34px] object-contain" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-white/60">SouthStyle</p>
                <h1 className="mt-1 text-xl font-black">{dashboardTitle}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsHeaderCollapsed((current) => !current)}
                className="tap-button grid h-11 w-11 place-items-center rounded-2xl bg-white/15 backdrop-blur transition hover:bg-white/20"
                title={isHeaderCollapsed ? 'Expand header' : 'Collapse header'}
              >
                <Minimize2 size={18} className={`transition-transform duration-300 ${isHeaderCollapsed ? 'rotate-180' : ''}`} />
              </button>
              <button
                onClick={() => setIsLogoutConfirmOpen(true)}
                className="tap-button grid h-11 w-11 place-items-center rounded-2xl bg-white/15 backdrop-blur"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>

          {!isHeaderCollapsed && (
            <section className="animate-rise overflow-hidden rounded-[28px] border border-white/20 bg-white/12 px-5 py-5 shadow-2xl shadow-green-950/20 backdrop-blur-xl transition-all duration-300 sm:px-6">
              <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-white/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100">Logged in as</span>
                    <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/75">
                      {staff.role}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{staff.full_name}</h2>
                    <p className="mt-2 text-sm font-semibold text-emerald-100">{staff.phone}</p>
                  </div>

                  <p className="max-w-[38rem] text-sm font-semibold leading-6 text-white/75">
                    Start with the high-priority tools below, then move through customers, orders, rewards, and team management as needed.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                  {quickStats.map((stat) => (
                    <article key={stat.label} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/55">{stat.label}</p>
                      <p className="mt-2 text-2xl font-black text-white">{stat.value}</p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-white/65">{stat.helper}</p>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 pt-6">
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-100 text-ss-green">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Featured Actions</p>
              <h2 className="mt-1 text-xl font-black text-slate-900">Start Here</h2>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {featuredActions.map((action, index) => {
              const Icon = action.icon;
              const featuredStyle = index === 0
                ? 'from-[#fcfbf7] to-white'
                : 'from-[#f8fafc] to-white';

              return (
                <Link
                  key={action.title}
                  href={action.href}
                  className={`tap-card rounded-[28px] border border-[#181d18]/18 ${featuredStyle} bg-gradient-to-br p-5 shadow-[0_20px_45px_-28px_rgba(20,45,24,0.18)] transition hover:-translate-y-0.5 hover:border-[#181d18]/18 hover:shadow-[0_24px_50px_-28px_rgba(20,45,24,0.22)]`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid h-14 w-14 place-items-center rounded-2xl border border-[#1f261f]/14 bg-[#fcfdfb] text-ss-green shadow-[0_10px_24px_-18px_rgba(15,24,18,0.45)]">
                      <Icon size={24} />
                    </div>
                    <span className="rounded-full border border-[#1f261f]/12 bg-[#fcfdfb] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                      Priority
                    </span>
                  </div>
                  <p className="mt-8 text-2xl font-black tracking-tight text-slate-900">{action.title}</p>
                  <p className="mt-3 max-w-[34ch] text-sm font-semibold leading-7 text-slate-600">{action.description}</p>
                  <div className="mt-6 flex items-center gap-2 text-sm font-black text-ss-green">
                    Open tool <ChevronRight size={16} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          {(['Customers', 'Orders', 'Rewards', 'Team'] as const).map((group) => {
            const actions = groupedActions[group];

            if (actions.length === 0) {
              return null;
            }

            return (
              <section key={group} className="modal-pop rounded-3xl border border-[#181d18]/18 bg-[#fafcf9] p-5 shadow-[0_20px_46px_-34px_rgba(20,45,24,0.22)]">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-ss-green">{group}</p>
                    <h3 className="mt-1 text-xl font-black text-slate-900">{group} Tools</h3>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{sectionCopy[group]}</p>
                  </div>
                  <div className="rounded-2xl border border-[#1f261f]/12 bg-[#f1f5ef] px-4 py-3 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                      {group === 'Orders' ? 'Working' : 'Available'}
                    </p>
                    <p className="mt-1 text-lg font-black text-slate-900">
                      {group === 'Orders'
                        ? (activeOrdersCount ?? '-')
                        : group === 'Rewards'
                          ? (availableCouponsCount ?? '-')
                          : group === 'Team'
                            ? (availableStaffCount ?? '-')
                          : actions.length}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3">
                  {actions.map((action) => {
                    const Icon = action.icon;

                    return (
                      <Link
                        key={action.title}
                        href={action.href}
                        className="tap-card flex items-center justify-between gap-4 rounded-[24px] border border-[#181d18]/14 bg-[#f2f0ea] px-4 py-4 shadow-[0_10px_24px_-20px_rgba(20,45,24,0.16)] transition hover:border-[#181d18]/14 hover:bg-[#f5f2ec]"
                      >
                        <div className="flex min-w-0 items-center gap-4">
                          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#1f261f]/12 bg-[#fcfdfb] text-ss-green shadow-[0_10px_24px_-18px_rgba(15,24,18,0.4)]">
                            <Icon size={22} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-base font-black text-slate-900">{action.title}</p>
                            <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{action.description}</p>
                          </div>
                        </div>
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[#1f261f]/12 bg-[#fcfdfb] text-slate-500 shadow-[0_10px_24px_-18px_rgba(15,24,18,0.35)]">
                          <ChevronRight size={18} />
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </section>

      {isLogoutConfirmOpen && (
        <div className="modal-pop fixed inset-0 z-[70] flex items-end bg-slate-950/45 p-4 sm:items-center sm:justify-center">
          <button
            type="button"
            aria-label="Close logout confirmation"
            className="absolute inset-0 cursor-default"
            onClick={() => setIsLogoutConfirmOpen(false)}
          />
          <section className="relative w-full max-w-md rounded-[30px] bg-white p-5 shadow-2xl shadow-slate-950/20">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-rose-500">Logout</p>
                <h3 className="mt-1 text-2xl font-black text-slate-900">Confirm Logout</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  You are about to sign out from the SouthStyle admin dashboard.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLogoutConfirmOpen(false)}
                className="tap-button grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setIsLogoutConfirmOpen(false)}
                className="tap-button rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-black text-slate-700"
              >
                Stay Here
              </button>
              <button
                type="button"
                onClick={logout}
                className="tap-button rounded-2xl bg-rose-500 px-4 py-4 text-sm font-black text-white shadow-lg shadow-rose-900/15"
              >
                Logout
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
