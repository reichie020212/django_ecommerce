// Checkout API client.

const BROWSER_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

const fetchOpts: RequestInit = {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
};

export type ShippingInput = {
  email: string;
  phone?: string;
  first_name: string;
  last_name: string;
  address: string;
  apt?: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
  ship_method: 'standard' | 'express' | 'overnight';
  coupon_code?: string;
};

export type PaymentIntentResponse = {
  client_secret: string;
  payment_intent_id: string;
  order_id: number;
  display_number: string;
  amount_cents: number;
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
  stripe_payment_intent_id: string;
  stripe_status: string;
  paid_at: string | null;
};

export type CouponInfo =
  | { valid: true; code: string; percent_off: number | null; amount_off_cents: number | null }
  | { valid: false; detail?: string };

export async function createPaymentIntent(input: ShippingInput): Promise<PaymentIntentResponse> {
  const res = await fetch(`${BROWSER_URL}/api/checkout/payment-intent/`, {
    ...fetchOpts,
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `createPaymentIntent failed: ${res.status}`);
  }
  return res.json();
}

export async function confirmOrder(payment_intent_id: string): Promise<Order> {
  const res = await fetch(`${BROWSER_URL}/api/checkout/confirm/`, {
    ...fetchOpts,
    method: 'POST',
    body: JSON.stringify({ payment_intent_id }),
  });
  if (!res.ok) throw new Error(`confirmOrder failed: ${res.status}`);
  return res.json();
}

export async function redeemCoupon(code: string): Promise<CouponInfo> {
  const res = await fetch(`${BROWSER_URL}/api/coupons/redeem/`, {
    ...fetchOpts,
    method: 'POST',
    body: JSON.stringify({ code }),
  });
  return res.json();
}
