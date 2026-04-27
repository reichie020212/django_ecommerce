// Cart API client. All calls run from the browser with credentials: 'include'
// so the lumen_cart_id cookie travels both ways. Server-side rendering of the
// cart isn't needed for v1 — the drawer hydrates on mount.

const BROWSER_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export type CartLine = {
  id: number;
  product_slug: string;
  product_sku: string;
  name: string;
  price_cents: number;
  was_cents: number | null;
  color: { name: string; hex: string; tone: string };
  size: string;
  qty: number;
  line_total_cents: number;
};

export type Cart = {
  id: string;
  lines: CartLine[];
  item_count: number;
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
};

const fetchOpts: RequestInit = {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
};

export async function getCart(): Promise<Cart> {
  const res = await fetch(`${BROWSER_URL}/api/cart/`, { ...fetchOpts, cache: 'no-store' });
  if (!res.ok) throw new Error(`getCart failed: ${res.status}`);
  return res.json();
}

export async function addCartLine(input: {
  productSlug: string;
  color: string;
  size: string;
  qty?: number;
}): Promise<Cart> {
  const res = await fetch(`${BROWSER_URL}/api/cart/lines/`, {
    ...fetchOpts,
    method: 'POST',
    body: JSON.stringify({
      product_slug: input.productSlug,
      color: input.color,
      size: input.size,
      qty: input.qty ?? 1,
    }),
  });
  if (!res.ok) throw new Error(`addCartLine failed: ${res.status}`);
  return res.json();
}

export async function updateCartLine(lineId: number, qty: number): Promise<Cart> {
  const res = await fetch(`${BROWSER_URL}/api/cart/lines/${lineId}/`, {
    ...fetchOpts,
    method: 'PATCH',
    body: JSON.stringify({ qty }),
  });
  if (!res.ok) throw new Error(`updateCartLine failed: ${res.status}`);
  return res.json();
}

export async function removeCartLine(lineId: number): Promise<Cart> {
  const res = await fetch(`${BROWSER_URL}/api/cart/lines/${lineId}/`, {
    ...fetchOpts,
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`removeCartLine failed: ${res.status}`);
  return res.json();
}
