// Product card — port of prototype/components.jsx:ProductCard.
// Quick-add picks the first color and the first non-sold-out size, mirroring
// prototype/app.jsx's quick-add path.
'use client';

import Link from 'next/link';
import { useState } from 'react';

import type { Product } from '@/lib/types';
import { fmt } from '@/lib/format';

import { useCart } from './CartProvider';
import { Icon } from './Icon';
import { Placeholder } from './Placeholder';

export function ProductCard({ product }: { product: Product }) {
  const { addLine } = useCart();
  const [adding, setAdding] = useState(false);

  const firstColor = product.colors[0];
  const firstAvailableSize =
    product.sizes.find((s) => !product.sold_out.includes(s)) ?? product.sizes[0];

  const handleQuickAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (adding || !firstColor || !firstAvailableSize) return;
    setAdding(true);
    void addLine({
      productSlug: product.slug,
      color: firstColor.name,
      size: firstAvailableSize,
      qty: 1,
      sourceEl: e.currentTarget,
    });
    window.setTimeout(() => setAdding(false), 1100);
  };

  return (
    <Link href={`/p/${product.slug}`} className="card">
      <div className="card-image-wrap">
        {product.tag === 'new' && <span className="card-tag tag-new">New</span>}
        {product.tag === 'sale' && <span className="card-tag tag-sale">Sale</span>}
        <div className="card-image">
          <Placeholder tone={product.tone} label={`PRODUCT · ${product.sku.toUpperCase()}`} />
        </div>
        <div className="card-image card-image-secondary">
          <Placeholder tone={product.alt_tone || product.tone} label="ALT VIEW" />
        </div>
        <div className="card-quick">
          <button
            type="button"
            className={'btn add-btn' + (adding ? ' is-adding' : '')}
            onClick={handleQuickAdd}
            disabled={!firstColor || !firstAvailableSize}
          >
            <span className="btn-text">
              <Icon name="bag" size={14} /> Quick add
            </span>
            <span className="btn-checkmark">
              <Icon name="check" size={14} /> Added
            </span>
          </button>
          <button
            type="button"
            className="btn btn-icon-only"
            onClick={(e) => e.preventDefault()}
            aria-label="Save"
          >
            <Icon name="heart" size={15} />
          </button>
        </div>
      </div>
      <div className="card-body">
        <div className="card-cat">{product.category_name}</div>
        <div className="card-title">{product.name}</div>
        <div className="card-row">
          <div className="card-price">
            {product.was != null && <s>{fmt(product.was)}</s>}
            {fmt(product.price)}
          </div>
          <div className="card-swatches">
            {product.colors.slice(0, 3).map((c) => (
              <span key={c.name} className="dot" style={{ background: c.hex }} />
            ))}
            {product.colors.length > 3 && (
              <span className="dot more">+{product.colors.length - 3}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
