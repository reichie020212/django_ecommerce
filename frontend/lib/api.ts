// Catalog API client. Server-side calls (RSC, route handlers) hit the api
// container directly via INTERNAL_API_URL; browser-side calls use the public
// host URL. Both go through the Django DRF endpoints in backend/catalog/urls.py.

import type { Category, Product, ProductDetail } from './types';

const SERVER_URL = process.env.INTERNAL_API_URL ?? 'http://api:8000';
const BROWSER_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

function apiBase(): string {
  return typeof window === 'undefined' ? SERVER_URL : BROWSER_URL;
}

type FetchProductsParams = {
  category?: string;
  maxPrice?: number; // cents
  color?: string;
  availability?: string;
  search?: string;
  sort?: string;
};

function buildQuery(params: FetchProductsParams): string {
  const q = new URLSearchParams();
  if (params.category && params.category !== 'all') q.set('category', params.category);
  if (params.maxPrice != null) q.set('max_price', String(params.maxPrice));
  if (params.color) q.set('color', params.color);
  if (params.availability) q.set('availability', params.availability);
  if (params.search) q.set('search', params.search);
  if (params.sort) q.set('sort', params.sort);
  const s = q.toString();
  return s ? `?${s}` : '';
}

export async function fetchProducts(params: FetchProductsParams = {}): Promise<Product[]> {
  const res = await fetch(`${apiBase()}/api/products/${buildQuery(params)}`, {
    // searchParams change frequently — disable Next's fetch cache for now.
    // We can add a thin per-request memoization later if SSR cost shows up.
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`fetchProducts failed: ${res.status}`);
  return (await res.json()) as Product[];
}

export async function fetchProductDetail(slug: string): Promise<ProductDetail> {
  const res = await fetch(`${apiBase()}/api/products/${slug}/`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`fetchProductDetail(${slug}) failed: ${res.status}`);
  return (await res.json()) as ProductDetail;
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${apiBase()}/api/categories/`, {
    // Categories rarely change; allow the next request to revalidate after 60s.
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`fetchCategories failed: ${res.status}`);
  return (await res.json()) as Category[];
}
