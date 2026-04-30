'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { clearCustomerSession, getCustomerSession, CustomerSession, setCustomerSession } from '@/lib/customer-session';
import { Order, OrderStatus } from '@/types';
import { Transaction } from '@/components/TransactionCard';

export type CustomerProfile = CustomerSession & {
  lifetime_earned: number;
  total_redeemed: number;
};

type OrderRow = {
  id: string;
  order_number: string;
  date_label: string;
  order_status: OrderStatus;
  payment_status: 'unpaid' | 'partial' | 'paid' | 'voided';
  subtotal_amount: number;
  coupon_discount_amount: number;
  points_discount_amount: number;
  paid_amount: number;
  remaining_balance: number;
  items: string;
  total_amount: number;
  points_earned: number;
};

type TransactionRow = {
  id: string;
  type: 'earn' | 'redeem';
  amount: number;
  description: string;
  date_label: string;
  time_label: string;
};

function profileFromSession(session: CustomerSession | null): CustomerProfile | null {
  if (!session) {
    return null;
  }

  return {
    ...session,
    lifetime_earned: 0,
    total_redeemed: 0,
  };
}

export function useCustomerData() {
  const [session, setSession] = useState<CustomerSession | null>(() => getCustomerSession());
  const [profile, setProfile] = useState<CustomerProfile | null>(() => profileFromSession(getCustomerSession()));
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasRestoredSession, setHasRestoredSession] = useState(() => typeof window !== 'undefined');
  const [error, setError] = useState('');

  const resetCustomerData = useCallback(() => {
    setSession(null);
    setProfile(null);
    setOrders([]);
    setTransactions([]);
  }, []);

  const loadCustomerData = useCallback(async (showLoading = true) => {
    const currentSession = getCustomerSession();

    if (!currentSession) {
      resetCustomerData();
      setIsLoading(false);
      return;
    }

    const customerId = currentSession.id;

    if (showLoading) {
      setIsLoading(true);
    }

    setError('');

    const [profileResult, ordersResult, transactionsResult] = await Promise.all([
      supabase.rpc('customer_app_profile', { p_customer_id: customerId }),
      supabase.rpc('customer_recent_orders', { p_customer_id: customerId }),
      supabase.rpc('customer_transactions', { p_customer_id: customerId }),
    ]);

    if (profileResult.error || ordersResult.error || transactionsResult.error) {
      setError('Could not load your Suki account data.');
      setIsLoading(false);
      return;
    }

    const profileRow = Array.isArray(profileResult.data) ? profileResult.data[0] : profileResult.data;

    if (!profileRow) {
      clearCustomerSession();
      resetCustomerData();
      setError('Your Suki account is no longer active. Please log in again.');
      setIsLoading(false);
      window.dispatchEvent(new CustomEvent('southstyle:customer-session-expired'));
      return;
    }

    setProfile(profileRow as CustomerProfile);
    setSession(profileRow as CustomerSession);
    setCustomerSession(profileRow as CustomerSession);

    setOrders(
      ((ordersResult.data || []) as OrderRow[]).map((order) => ({
        id: order.id,
        orderNumber: order.order_number,
        date: order.date_label,
        status: order.order_status,
        paymentStatus: order.payment_status,
        subtotalAmount: Number(order.subtotal_amount),
        couponDiscountAmount: Number(order.coupon_discount_amount),
        pointsDiscountAmount: Number(order.points_discount_amount),
        paidAmount: Number(order.paid_amount),
        remainingBalance: Number(order.remaining_balance),
        items: order.items,
        total: Number(order.total_amount),
        pointsEarned: Number(order.points_earned),
      })),
    );

    setTransactions(
      ((transactionsResult.data || []) as TransactionRow[]).map((transaction) => ({
        id: transaction.id,
        type: transaction.type,
        amount: Number(transaction.amount),
        description: transaction.description,
        date: transaction.date_label,
        time: transaction.time_label,
      })),
    );

    setIsLoading(false);
  }, [resetCustomerData]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const restoredSession = getCustomerSession();
      setSession(restoredSession);
      setProfile((currentProfile) => currentProfile ?? profileFromSession(restoredSession));
      setHasRestoredSession(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!hasRestoredSession) {
      return;
    }

    if (!session) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadCustomerData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [hasRestoredSession, loadCustomerData, session]);

  useEffect(() => {
    const handleRefresh = async () => {
      await loadCustomerData(false);
      window.dispatchEvent(new CustomEvent('southstyle:customer-refresh-done'));
    };

    window.addEventListener('southstyle:customer-refresh', handleRefresh);
    return () => window.removeEventListener('southstyle:customer-refresh', handleRefresh);
  }, [loadCustomerData]);

  return {
    session,
    profile,
    orders,
    transactions,
    isLoading: !profile && (!hasRestoredSession || isLoading),
    error,
    refresh: () => loadCustomerData(false),
  };
}
