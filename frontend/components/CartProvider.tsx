// Cart state shared across the app: drawer open/close, line ops, fly-to-cart.
//
// Optimistic updates: addLine / updateQty / removeLine mutate the local cart
// immediately and fire the API call in parallel. The server response is the
// source of truth and replaces local state when it arrives.
'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  type Cart,
  type CartLine,
  addCartLine,
  getCart,
  removeCartLine,
  updateCartLine,
} from '@/lib/cart';

type FlyDot = {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

type CartContextValue = {
  cart: Cart | null;
  isLoaded: boolean;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  flyDot: FlyDot | null;
  addLine: (input: {
    productSlug: string;
    color: string;
    size: string;
    qty?: number;
    sourceEl?: HTMLElement | null;
  }) => Promise<void>;
  updateQty: (lineId: number, qty: number) => Promise<void>;
  removeLine: (lineId: number) => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

const EMPTY_CART: Cart = {
  id: '',
  lines: [],
  item_count: 0,
  subtotal_cents: 0,
  shipping_cents: 0,
  tax_cents: 0,
  total_cents: 0,
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoaded, setLoaded] = useState(false);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [flyDot, setFlyDot] = useState<FlyDot | null>(null);

  // Hydrate on mount.
  useEffect(() => {
    let cancelled = false;
    getCart()
      .then((c) => !cancelled && setCart(c))
      .catch(() => !cancelled && setCart(EMPTY_CART))
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const triggerFly = useCallback((sourceEl: HTMLElement) => {
    const cartBtn = document.getElementById('cart-btn');
    if (!cartBtn) return;
    const src = sourceEl.getBoundingClientRect();
    const dst = cartBtn.getBoundingClientRect();
    setFlyDot({
      id: Date.now(),
      startX: src.left + src.width / 2 - 9,
      startY: src.top + src.height / 2 - 9,
      endX: dst.left + dst.width / 2 - 9,
      endY: dst.top + dst.height / 2 - 9,
    });
    window.setTimeout(() => {
      cartBtn.classList.add('cart-bump');
      window.setTimeout(() => cartBtn.classList.remove('cart-bump'), 600);
    }, 700);
    window.setTimeout(() => setFlyDot(null), 1100);
  }, []);

  const addLine: CartContextValue['addLine'] = useCallback(
    async ({ productSlug, color, size, qty = 1, sourceEl }) => {
      // Optimistic: bump qty if the line exists, otherwise prepend a stub.
      setCart((prev) => addLineLocally(prev, { productSlug, color, size, qty }));
      if (sourceEl) triggerFly(sourceEl);
      try {
        const next = await addCartLine({ productSlug, color, size, qty });
        setCart(next);
      } catch {
        // Reconcile: refetch on failure.
        const fresh = await getCart().catch(() => null);
        if (fresh) setCart(fresh);
      }
    },
    [triggerFly],
  );

  const updateQty: CartContextValue['updateQty'] = useCallback(async (lineId, qty) => {
    setCart((prev) =>
      prev
        ? recomputeTotals({
            ...prev,
            lines:
              qty <= 0
                ? prev.lines.filter((l) => l.id !== lineId)
                : prev.lines.map((l) => (l.id === lineId ? { ...l, qty } : l)),
          })
        : prev,
    );
    try {
      const next = await updateCartLine(lineId, qty);
      setCart(next);
    } catch {
      const fresh = await getCart().catch(() => null);
      if (fresh) setCart(fresh);
    }
  }, []);

  const removeLine: CartContextValue['removeLine'] = useCallback(async (lineId) => {
    setCart((prev) =>
      prev ? recomputeTotals({ ...prev, lines: prev.lines.filter((l) => l.id !== lineId) }) : prev,
    );
    try {
      const next = await removeCartLine(lineId);
      setCart(next);
    } catch {
      const fresh = await getCart().catch(() => null);
      if (fresh) setCart(fresh);
    }
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      isLoaded,
      isDrawerOpen,
      openDrawer,
      closeDrawer,
      flyDot,
      addLine,
      updateQty,
      removeLine,
    }),
    [cart, isLoaded, isDrawerOpen, openDrawer, closeDrawer, flyDot, addLine, updateQty, removeLine],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}

// ── helpers ─────────────────────────────────────────────────────────────────

function addLineLocally(
  prev: Cart | null,
  input: { productSlug: string; color: string; size: string; qty: number },
): Cart {
  const base = prev ?? EMPTY_CART;
  const existing = base.lines.find(
    (l) =>
      l.product_slug === input.productSlug && l.color.name === input.color && l.size === input.size,
  );
  let lines: CartLine[];
  if (existing) {
    lines = base.lines.map((l) =>
      l.id === existing.id
        ? { ...l, qty: l.qty + input.qty, line_total_cents: (l.qty + input.qty) * l.price_cents }
        : l,
    );
  } else {
    // Stub line — will be replaced when the server response lands.
    const stub: CartLine = {
      id: -Math.floor(Math.random() * 1_000_000),
      product_slug: input.productSlug,
      product_sku: '',
      name: input.productSlug,
      price_cents: 0,
      was_cents: null,
      color: { name: input.color, hex: '#cccccc', tone: 'stone' },
      size: input.size,
      qty: input.qty,
      line_total_cents: 0,
    };
    lines = [...base.lines, stub];
  }
  return recomputeTotals({ ...base, lines });
}

function recomputeTotals(c: Cart): Cart {
  const subtotal = c.lines.reduce((s, l) => s + l.line_total_cents, 0);
  const shipping = subtotal === 0 || subtotal > 200_00 ? 0 : 14_00;
  const tax = Math.round(subtotal * 0.085);
  const item_count = c.lines.reduce((s, l) => s + l.qty, 0);
  return {
    ...c,
    item_count,
    subtotal_cents: subtotal,
    shipping_cents: shipping,
    tax_cents: tax,
    total_cents: subtotal + shipping + tax,
  };
}
