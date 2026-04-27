// Toolbar above the product grid — count + sort + view toggle.
// Port of prototype/gallery.jsx:Gallery toolbar block.
'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import { Icon } from './Icon';

type Props = {
  shown: number;
  total: number;
};

export function GalleryToolbar({ shown, total }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  const sort = params.get('sort') ?? 'featured';
  const view = (params.get('view') as 'grid' | 'rows' | null) ?? 'grid';

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (!value || value === defaults[key]) next.delete(key);
    else next.set(key, value);
    router.push(`/shop?${next.toString()}`);
  }

  return (
    <div className="gallery-toolbar">
      <div className="gallery-count">
        Showing <b>{shown}</b> of <b>{total}</b> styles
      </div>
      <div className="gallery-sort">
        <select
          className="sort-select"
          value={sort}
          onChange={(e) => setParam('sort', e.target.value)}
          aria-label="Sort"
        >
          <option value="featured">Featured</option>
          <option value="new">Newest</option>
          <option value="low">Price: low to high</option>
          <option value="high">Price: high to low</option>
        </select>
        <div className="view-toggle">
          <button
            type="button"
            className={view === 'grid' ? 'active' : ''}
            onClick={() => setParam('view', 'grid')}
            aria-label="Grid view"
            aria-pressed={view === 'grid'}
          >
            <Icon name="grid" size={14} />
          </button>
          <button
            type="button"
            className={view === 'rows' ? 'active' : ''}
            onClick={() => setParam('view', 'rows')}
            aria-label="Row view"
            aria-pressed={view === 'rows'}
          >
            <Icon name="rows" size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

const defaults: Record<string, string> = {
  sort: 'featured',
  view: 'grid',
};
