// Slide-out cart drawer — port of prototype/cart.jsx:CartDrawer.
'use client';

import Link from 'next/link';

import { fmt } from '@/lib/format';

import { useCart } from './CartProvider';
import { Icon } from './Icon';
import { Placeholder } from './Placeholder';

export function CartDrawer() {
  const { cart, isDrawerOpen, closeDrawer, updateQty, removeLine } = useCart();

  const items = cart?.lines ?? [];
  const subtotal = cart?.subtotal_cents ?? 0;
  const shipping = cart?.shipping_cents ?? 0;
  const tax = cart?.tax_cents ?? 0;
  const total = cart?.total_cents ?? 0;

  return (
    <>
      <div
        className={'scrim' + (isDrawerOpen ? ' open' : '')}
        onClick={closeDrawer}
        aria-hidden={!isDrawerOpen}
      />
      <aside
        className={'drawer' + (isDrawerOpen ? ' open' : '')}
        aria-hidden={!isDrawerOpen}
        role="dialog"
        aria-label="Your bag"
      >
        <div className="drawer-head">
          <h3>
            Your bag
            <span className="count">
              · {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          </h3>
          <button className="icon-btn" onClick={closeDrawer} aria-label="Close cart" type="button">
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="drawer-body">
          {items.length === 0 ? (
            <div className="drawer-empty">
              <div className="glyph">
                <Icon name="bag" size={26} />
              </div>
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 24,
                    color: 'var(--slate-900)',
                    marginBottom: 6,
                  }}
                >
                  Your bag is empty
                </div>
                <p>Discover our latest arrivals and small-batch staples.</p>
              </div>
              <button className="btn btn-primary" onClick={closeDrawer} type="button">
                Continue shopping
              </button>
            </div>
          ) : (
            items.map((it) => (
              <div className="cart-row" key={it.id}>
                <div className="ph-wrap">
                  <Placeholder tone={it.color.tone} label={it.product_sku.toUpperCase()} />
                </div>
                <div className="meta">
                  <div className="name">{it.name}</div>
                  <div className="opt">
                    {it.color.name} · Size {it.size}
                  </div>
                  <div className="controls">
                    <div className="qty-mini">
                      <button
                        type="button"
                        onClick={() => updateQty(it.id, Math.max(1, it.qty - 1))}
                        aria-label="Decrease quantity"
                      >
                        <Icon name="minus" size={11} />
                      </button>
                      <span>{it.qty}</span>
                      <button
                        type="button"
                        onClick={() => updateQty(it.id, it.qty + 1)}
                        aria-label="Increase quantity"
                      >
                        <Icon name="plus" size={11} />
                      </button>
                    </div>
                    <a onClick={() => removeLine(it.id)}>Remove</a>
                  </div>
                </div>
                <div className="price">{fmt(it.line_total_cents)}</div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="drawer-foot">
            <div className="promo-strip">
              <span className="dot" />{' '}
              {subtotal > 200_00
                ? 'Free express shipping unlocked'
                : `Spend ${fmt(200_00 - subtotal)} more for free shipping`}
            </div>
            <div className="totals">
              <div className="row">
                <span>Subtotal</span>
                <span>{fmt(subtotal)}</span>
              </div>
              <div className="row">
                <span>Shipping</span>
                <span>{shipping === 0 ? 'Free' : fmt(shipping)}</span>
              </div>
              <div className="row">
                <span>Estimated tax</span>
                <span>{fmt(tax)}</span>
              </div>
              <div className="row total">
                <span>Total</span>
                <span className="num">{fmt(total)}</span>
              </div>
            </div>
            <Link
              className="btn btn-accent btn-block btn-lg"
              href="/checkout"
              onClick={closeDrawer}
            >
              Checkout <Icon name="arrow-right" size={15} />
            </Link>
            <div
              style={{
                textAlign: 'center',
                marginTop: 12,
                fontSize: 11.5,
                color: 'var(--ink-soft)',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.04em',
              }}
            >
              <Icon name="lock" size={11} /> SECURE CHECKOUT · POWERED BY STRIPE
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
