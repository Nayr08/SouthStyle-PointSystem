'use client';

export const PHONE_KEY = 'southstyle:test-phone';
export const CUSTOMER_SESSION_KEY = 'southstyle:customer-session';

export type TierName = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Titanium';

export type CustomerSession = {
  id: string;
  full_name: string;
  phone: string;
  points_balance: number;
  tier: TierName;
  rfid_uid: string | null;
  qr_token: string | null;
  member_since: string;
};

export function getCustomerSession() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawSession = window.localStorage.getItem(CUSTOMER_SESSION_KEY);
    return rawSession ? (JSON.parse(rawSession) as CustomerSession) : null;
  } catch {
    return null;
  }
}

export function setCustomerSession(session: CustomerSession) {
  try {
    window.localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(session));
  } catch {
    // Storage can fail in private browsing; session still works in memory through AuthGate.
  }
}

export function clearCustomerSession() {
  try {
    window.localStorage.removeItem(CUSTOMER_SESSION_KEY);
    window.localStorage.removeItem(PHONE_KEY);
  } catch {
    // Ignore storage cleanup failures.
  }
}
