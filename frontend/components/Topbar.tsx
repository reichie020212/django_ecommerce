// Sticky topbar — port of prototype/topbar.jsx.
// Search input updates the ?search= URL param so the server-rendered grid
// re-fetches. Cart-icon click is a no-op until the cart drawer ships in
// task #9.
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Icon } from './Icon';

export function Topbar({ cartCount = 0 }: { cartCount?: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get('search') ?? '');

  // Debounce — 250ms after typing stops, push the URL.
  useEffect(() => {
    const handle = setTimeout(() => {
      const current = params.get('search') ?? '';
      if (search === current) return;
      const next = new URLSearchParams(params.toString());
      if (search) next.set('search', search);
      else next.delete('search');
      router.push(`/shop?${next.toString()}`);
    }, 250);
    return () => clearTimeout(handle);
  }, [search, params, router]);

  return (
    <div className="topbar-wrap">
      <div className="topbar-promo">
        Complimentary express shipping on orders over <b>$200</b> · Free returns within 30 days
      </div>
      <div className="topbar">
        <div className="topbar-left">
          <nav className="nav">
            <Link href="/shop" className="active">
              <span>Shop</span>
            </Link>
            <button type="button">New Arrivals</button>
            <button type="button">Editorial</button>
            <button type="button">Stockists</button>
          </nav>
        </div>
        <Link href="/shop" className="brand">
          <span className="brand-mark" />
          Lumen Goods
        </Link>
        <div className="topbar-right">
          <div className="search-input">
            <Icon name="search" size={15} />
            <input
              placeholder="Search the archive"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search"
            />
          </div>
          <button className="icon-btn" aria-label="Account" type="button">
            <Icon name="user" size={18} />
          </button>
          <button className="icon-btn" aria-label="Saved" type="button">
            <Icon name="heart" size={18} />
          </button>
          <button id="cart-btn" className="icon-btn" aria-label="Cart" type="button">
            <Icon name="bag" size={18} />
            {cartCount > 0 && <span className="badge">{cartCount}</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
