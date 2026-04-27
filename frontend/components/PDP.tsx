// Product detail page — port of prototype/pdp.jsx.
'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import type { Product, ProductDetail } from '@/lib/types';
import { fmt } from '@/lib/format';

import { useCart } from './CartProvider';
import { Icon } from './Icon';
import { Placeholder } from './Placeholder';
import { ProductCard } from './ProductCard';
import { Stars } from './Stars';

type Props = { product: ProductDetail; related: Product[] };

const ACCORDION_ROWS = ['details', 'ship', 'care'] as const;
type AccordionId = (typeof ACCORDION_ROWS)[number];

export function PDP({ product, related }: Props) {
  const [colorIdx, setColorIdx] = useState(0);
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);
  const [adding, setAdding] = useState(false);
  const [openAcc, setOpenAcc] = useState<AccordionId | null>('details');
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const { addLine } = useCart();

  // Reset state when navigating between products (Link click → same component).
  useEffect(() => {
    setColorIdx(0);
    setSize(null);
    setQty(1);
    setImgIdx(0);
    window.scrollTo({ top: 0 });
  }, [product.slug]);

  const color = product.colors[colorIdx] ?? product.colors[0];
  if (!color) return null;
  const tones = [color.tone, product.alt_tone || color.tone, product.tone, 'graphite'];

  const handleAdd = () => {
    if (adding) return;
    const chosenSize =
      size ?? product.sizes.find((s) => !product.sold_out.includes(s)) ?? product.sizes[0];
    if (!chosenSize) return;
    if (!size) setSize(chosenSize);
    setAdding(true);
    void addLine({
      productSlug: product.slug,
      color: color.name,
      size: chosenSize,
      qty,
      sourceEl: addBtnRef.current,
    });
    setTimeout(() => setAdding(false), 1400);
  };

  return (
    <>
      <ProductJsonLd product={product} />
      <div className="pdp">
        <div className="crumbs">
          <Link href="/shop">
            <span>Shop</span>
          </Link>
          <span className="sep">/</span>
          <Link href={`/shop?category=${product.category}`}>
            <span>{product.category_name}</span>
          </Link>
          <span className="sep">/</span>
          <span>{product.name}</span>
        </div>

        <div className="pdp-grid">
          <div className="pdp-gallery">
            <div className="pdp-thumbs">
              {tones.map((t, i) => (
                <div
                  key={i}
                  className={'thumb' + (imgIdx === i ? ' active' : '')}
                  onClick={() => setImgIdx(i)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setImgIdx(i);
                    }
                  }}
                  aria-label={`View ${i + 1}`}
                >
                  <Placeholder tone={t} label={String(i + 1).padStart(2, '0')} />
                </div>
              ))}
            </div>
            <div className="pdp-main-image">
              <Placeholder
                tone={tones[imgIdx] ?? color.tone}
                label={`${product.sku.toUpperCase()} · VIEW ${imgIdx + 1}`}
              />
            </div>
          </div>

          <div className="pdp-info">
            <div className="pdp-eyebrow">
              {product.category_name} · {product.sku.toUpperCase()}
            </div>
            <h1 className="pdp-title">{product.name}</h1>
            <div className="pdp-price">
              <span className="now">{fmt(product.price)}</span>
              {product.was != null && <span className="was">{fmt(product.was)}</span>}
              {product.was != null && (
                <span className="save">Save {fmt(product.was - product.price)}</span>
              )}
            </div>
            <div className="pdp-rating">
              <Stars value={Number(product.rating)} size={13} />
              <span>
                {Number(product.rating).toFixed(1)} · {product.reviews_count} reviews
              </span>
            </div>

            <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.65 }}>
              {product.description}
            </p>

            <div className="pdp-section">
              <div className="pdp-section-head">
                <span className="label">Color</span>
                <span className="value">{color.name}</span>
              </div>
              <div className="option-row">
                {product.colors.map((c, i) => (
                  <span
                    key={c.name}
                    className={'color-pick' + (colorIdx === i ? ' active' : '')}
                    style={{ background: c.hex }}
                    onClick={() => {
                      setColorIdx(i);
                      setImgIdx(0);
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={c.name}
                    aria-pressed={colorIdx === i}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            <div className="pdp-section">
              <div className="pdp-section-head">
                <span className="label">Size</span>
                <span className="size-link">Size guide</span>
              </div>
              <div className="option-row">
                {product.sizes.map((s) => {
                  const out = product.sold_out.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      className={
                        'size-pick' + (size === s ? ' active' : '') + (out ? ' disabled' : '')
                      }
                      onClick={() => !out && setSize(s)}
                      disabled={out}
                      aria-pressed={size === s}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pdp-cta-row" style={{ marginTop: 6 }}>
              <div className="qty">
                <button
                  type="button"
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  aria-label="Decrease quantity"
                >
                  <Icon name="minus" size={14} />
                </button>
                <span>{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty(qty + 1)}
                  aria-label="Increase quantity"
                >
                  <Icon name="plus" size={14} />
                </button>
              </div>
              <button
                ref={addBtnRef}
                type="button"
                className={'btn btn-accent btn-lg add-btn' + (adding ? ' is-adding' : '')}
                onClick={handleAdd}
                style={{ flex: 1 }}
              >
                <span className="btn-text">
                  <Icon name="bag" size={15} /> Add to bag · {fmt(product.price * qty)}
                </span>
                <span className="btn-checkmark">
                  <Icon name="check" size={16} /> Added to bag
                </span>
              </button>
            </div>

            <div className="pdp-features">
              <Feature
                icon="truck"
                title="Free express shipping"
                sub="Arrives in 2–4 business days"
              />
              <Feature icon="refresh" title="30-day free returns" sub="Pre-paid label included" />
              <Feature icon="shield" title="Lifetime repairs" sub="By our atelier in Porto" />
              <Feature icon="leaf" title="Traceable supply" sub="Mill to maker, on-record" />
            </div>

            <div className="acc">
              <AccordionRow
                id="details"
                open={openAcc === 'details'}
                onToggle={() => setOpenAcc(openAcc === 'details' ? null : 'details')}
                title="Materials & details"
              >
                <ul>
                  {(product.details.length > 0
                    ? product.details
                    : [
                        'Premium materials, sourced and traced',
                        'Constructed by independent ateliers',
                        'Designed to be repaired, not replaced',
                      ]
                  ).map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </AccordionRow>
              <AccordionRow
                id="ship"
                open={openAcc === 'ship'}
                onToggle={() => setOpenAcc(openAcc === 'ship' ? null : 'ship')}
                title="Shipping & returns"
              >
                <p>
                  Complimentary express shipping on orders over $200. Free returns within 30 days —
                  no restocking fees, no questions asked.
                </p>
              </AccordionRow>
              <AccordionRow
                id="care"
                open={openAcc === 'care'}
                onToggle={() => setOpenAcc(openAcc === 'care' ? null : 'care')}
                title="Care instructions"
              >
                <p>
                  Dry clean, reshape and lay flat. Brush with a soft horsehair brush between wears
                  to lift the nap.
                </p>
              </AccordionRow>
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <div className="related">
          <h3>You might also like</h3>
          <div className="grid">
            {related.map((p) => (
              <ProductCard key={p.sku} product={p} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function Feature({
  icon,
  title,
  sub,
}: {
  icon: 'truck' | 'refresh' | 'shield' | 'leaf';
  title: string;
  sub: string;
}) {
  return (
    <div className="pdp-feature">
      <Icon name={icon} size={16} />
      <div>
        {title}
        <br />
        <span style={{ color: 'var(--ink-soft)', fontSize: 12 }}>{sub}</span>
      </div>
    </div>
  );
}

function AccordionRow({
  id,
  open,
  onToggle,
  title,
  children,
}: {
  id: string;
  open: boolean;
  onToggle: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className={'acc-row' + (open ? ' open' : '')}>
      <button
        type="button"
        className="acc-trigger"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`acc-${id}`}
      >
        {title}
        <span className="plus">
          <Icon name="plus" size={16} />
        </span>
      </button>
      <div className="acc-content" id={`acc-${id}`} role="region">
        <div className="acc-content-inner">{children}</div>
      </div>
    </div>
  );
}

function ProductJsonLd({ product }: { product: ProductDetail }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    sku: product.sku,
    name: product.name,
    description: product.description,
    category: product.category_name,
    brand: { '@type': 'Brand', name: 'Lumen Goods' },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.reviews_count,
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'USD',
      price: (product.price / 100).toFixed(2),
      availability:
        product.sold_out.length === product.sizes.length
          ? 'https://schema.org/OutOfStock'
          : 'https://schema.org/InStock',
    },
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
