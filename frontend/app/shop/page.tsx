// Gallery / shop page. Server component — reads filters from searchParams,
// fetches the catalog, renders Topbar + Hero + Filters + grid + Footer.
import { Filters } from '@/components/Filters';
import { Footer } from '@/components/Footer';
import { GalleryToolbar } from '@/components/GalleryToolbar';
import { Hero } from '@/components/Hero';
import { ProductCard } from '@/components/ProductCard';
import { Topbar } from '@/components/Topbar';
import { fetchCategories, fetchProducts } from '@/lib/api';
import { COLOR_SWATCHES } from '@/lib/swatches';

type SearchParams = Record<string, string | string[] | undefined>;

function pick(params: SearchParams, key: string): string | undefined {
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const category = pick(sp, 'category') ?? 'all';
  const priceDollars = pick(sp, 'price');
  const color = pick(sp, 'color');
  const availability = pick(sp, 'availability');
  const search = pick(sp, 'search') ?? '';
  const sort = pick(sp, 'sort');

  // Fetch unfiltered products for the per-filter counts, plus the filtered
  // list for display, plus the category list. All in parallel.
  const [allProducts, products, categories] = await Promise.all([
    fetchProducts(),
    fetchProducts({
      category,
      maxPrice: priceDollars ? Number(priceDollars) * 100 : undefined,
      color: color ?? undefined,
      availability: availability ?? undefined,
      search,
      sort,
    }),
    fetchCategories(),
  ]);

  const counts: { all: number } & Record<string, number> = {
    all: allProducts.length,
    in_stock: allProducts.filter((p) => p.sold_out.length < p.sizes.length).length,
    new: allProducts.filter((p) => p.tag === 'new').length,
    sale: allProducts.filter((p) => p.tag === 'sale').length,
  };
  for (const c of categories) {
    counts[c.slug] = allProducts.filter((p) => p.category === c.slug).length;
  }

  return (
    <div className="app">
      <Topbar />
      <Hero />
      <div className="gallery">
        <Filters categories={categories} swatches={COLOR_SWATCHES} counts={counts} />
        <div>
          <GalleryToolbar shown={products.length} total={allProducts.length} />
          {products.length === 0 ? (
            <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--ink-soft)' }}>
              <div
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 28,
                  color: 'var(--slate-900)',
                  marginBottom: 8,
                }}
              >
                No matches
              </div>
              <p>Try clearing filters or widening your price range.</p>
            </div>
          ) : (
            <div className="grid">
              {products.map((p) => (
                <ProductCard key={p.sku} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
