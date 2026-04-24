export type OrderStatus = 'pending' | 'in_progress' | 'ready' | 'claimed';
export type OrderPaymentStatus = 'unpaid' | 'partial' | 'paid' | 'voided';

export interface Order {
  id: string;
  orderNumber: string;
  date: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  subtotalAmount: number;
  couponDiscountAmount: number;
  pointsDiscountAmount: number;
  paidAmount: number;
  remainingBalance: number;
  items: string;
  total: number;
  pointsEarned: number;
}

export interface Customer {
  id: string;
  name: string;
  businessName: string;
  phone: string;
  points: number;
  memberSince: string;
  cardId: string;
}
