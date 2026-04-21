export type OrderStatus = 'pending' | 'in_progress' | 'ready' | 'claimed';

export interface Order {
  id: string;
  orderNumber: string;
  date: string;
  status: OrderStatus;
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
