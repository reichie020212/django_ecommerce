// Shapes returned by the Django catalog API. Mirror the serializers in
// backend/catalog/serializers.py — keep these in sync if the API shape changes.

export type ColorOption = {
  name: string;
  hex: string;
  tone: string;
};

export type ProductTag = '' | 'new' | 'sale';

export type Product = {
  sku: string;
  slug: string;
  name: string;
  category: string; // slug
  category_name: string; // human label
  price: number; // cents
  was: number | null; // cents, null if not on sale
  tag: ProductTag;
  rating: string; // DRF ships Decimal as string
  reviews_count: number;
  tone: string;
  alt_tone: string;
  colors: ColorOption[];
  sizes: string[];
  sold_out: string[];
};

export type ProductDetail = Product & {
  description: string;
  details: string[];
};

export type Category = {
  slug: string;
  name: string;
  sort_order: number;
};

// URL-state used by the gallery page. Filter values are URL-friendly strings
// or null when omitted, so we can round-trip via searchParams.
export type GalleryFilters = {
  category: string; // 'all' | category slug
  maxPrice: number | null; // dollars, capped at 700 in the prototype
  color: string | null; // color name, e.g. 'Noir'
  availability: string | null; // 'in_stock' | 'new' | 'sale' | null
  search: string;
  sort: 'featured' | 'new' | 'low' | 'high';
  view: 'grid' | 'rows';
};

export const DEFAULT_FILTERS: GalleryFilters = {
  category: 'all',
  maxPrice: null,
  color: null,
  availability: null,
  search: '',
  sort: 'featured',
  view: 'grid',
};
