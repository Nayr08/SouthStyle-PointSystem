'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getCustomerSession, CustomerSession } from '@/lib/customer-session';
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

export function useCustomerData() {
  const [session, setSession] = useState<CustomerSession | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasRestoredSession, setHasRestoredSession] = useState(false);
  const [error, setError] = useState('');

  const loadCustomerData = useCallback(async (showLoading = true) => {
    const currentSession = getCustomerSession();

    if (!currentSession) {
      setSession(null);
      setProfile(null);
      setOrders([]);
      setTransactions([]);
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
    setProfile(profileRow as CustomerProfile);

    setOrders(
      ((ordersResult.data || []) as OrderRow[]).map((order) => ({
        id: order.id,
        orderNumber: order.order_number,
        date: order.date_label,
        status: order.order_status,
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
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSession(getCustomerSession());
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
    isLoading: !hasRestoredSession || isLoading,
    error,
    refresh: () => loadCustomerData(false),
  };
}
