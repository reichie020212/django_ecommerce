// Sticky filter rail — port of prototype/gallery.jsx:Filters.
// Every change updates the URL searchParams so the server-rendered grid
// can re-fetch. Filter values intentionally round-trip through the URL —
// shareable links per handoff §5.1.
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

import type { Category, ColorOption } from '@/lib/types';
import { fmt } from '@/lib/format';

const PRICE_MIN = 50;
const PRICE_MAX = 700;
const PRICE_STEP = 10;

type Props = {
  categories: Category[];
  swatches: ColorOption[];
  counts: { all: number } & Record<string, number>;
};

export function Filters({ categories, swatches, counts }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const category = params.get('category') ?? 'all';
  const priceParam = params.get('price');
  const price = priceParam ? Number(priceParam) : PRICE_MAX;
  const color = params.get('color');

  function update(next: URLSearchParams) {
    startTransition(() => {
      const qs = next.toString();
      router.push(qs ? `/shop?${qs}` : '/shop');
    });
  }

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value == null || value === '') next.delete(key);
    else next.set(key, value);
    update(next);
  }

  return (
    <aside className="filters-sticky">
      <div className="filters">
        <div className="filter-group">
          <h4>Category</h4>
          <div className="filter-list">
            <FilterRow
              active={category === 'all'}
              label="All"
              count={counts.all}
              onClick={() => setParam('category', null)}
            />
            {categories.map((c) => (
              <FilterRow
                key={c.slug}
                active={category === c.slug}
                label={c.name}
                count={counts[c.slug] ?? 0}
                onClick={() => setParam('category', c.slug)}
              />
            ))}
          </div>
        </div>

        <div className="filter-group">
          <h4>Price</h4>
          <div className="range-row">
            <span>
              Up to <b>{fmt(price * 100)}</b>
            </span>
            <span>$700 max</span>
          </div>
          <input
            className="range-input"
            type="range"
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={PRICE_STEP}
            value={price}
            onChange={(e) =>
              setParam('price', e.target.value === String(PRICE_MAX) ? null : e.target.value)
            }
            aria-label="Maximum price"
          />
        </div>

        <div className="filter-group">
          <h4>Color</h4>
          <div className="swatches">
            {swatches.map((c) => (
              <span
                key={c.name}
                role="button"
                tabIndex={0}
                aria-pressed={color === c.name}
                aria-label={c.name}
                title={c.name}
                className={'swatch' + (color === c.name ? ' active' : '')}
                style={{ background: c.hex }}
                onClick={() => setParam('color', color === c.name ? null : c.name)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setParam('color', color === c.name ? null : c.name);
                  }
                }}
              />
            ))}
          </div>
        </div>

        <div className="filter-group">
          <h4>Availability</h4>
          <div className="filter-list">
            <FilterRow
              active={params.get('availability') === 'in_stock'}
              label="In stock"
              count={counts.in_stock ?? 0}
              onClick={() =>
                setParam(
                  'availability',
                  params.get('availability') === 'in_stock' ? null : 'in_stock',
                )
              }
            />
            <FilterRow
              active={params.get('availability') === 'new'}
              label="New arrivals"
              count={counts.new ?? 0}
              onClick={() =>
                setParam('availability', params.get('availability') === 'new' ? null : 'new')
              }
            />
            <FilterRow
              active={params.get('availability') === 'sale'}
              label="Final sale"
              count={counts.sale ?? 0}
              onClick={() =>
                setParam('availability', params.get('availability') === 'sale' ? null : 'sale')
              }
            />
          </div>
        </div>
      </div>
    </aside>
  );
}

function FilterRow({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <div className={'filter-item' + (active ? ' active' : '')} onClick={onClick} role="button">
      <span>{label}</span>
      <span className="count">{String(count).padStart(2, '0')}</span>
    </div>
  );
}
