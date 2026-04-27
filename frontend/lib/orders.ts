// Order history API.
import { authedFetch } from './auth';

export type OrderLine = {
  name: string;
  sku: string;
  color_name: string;
  size: string;
  qty: number;
  price_cents: number;
  line_total_cents: number;
};

export type Order = {
  id: number;
  display_number: string;
  status: 'pending' | 'paid' | 'cancelled' | 'refunded';
  customer_email: string;
  ship_first_name: string;
  ship_last_name: string;
  ship_city: string;
  ship_state: string;
  ship_zip: string;
  ship_country: string;
  ship_method: string;
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  coupon_code_at_purchase: string;
  stripe_status: string;
  created_at: string;
  paid_at: string | null;
  lines: OrderLine[];
};

export async function fetchMyOrders(): Promise<Order[]> {
  const res = await authedFetch('/api/orders/');
  if (!res.ok) throw new Error(`fetchMyOrders failed: ${res.status}`);
  return res.json();
}
