import { notFound } from 'next/navigation';

import { Footer } from '@/components/Footer';
import { PDP } from '@/components/PDP';
import { Topbar } from '@/components/Topbar';
import { fetchProductDetail, fetchProducts } from '@/lib/api';

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let product;
  try {
    product = await fetchProductDetail(slug);
  } catch {
    notFound();
  }

  // "You might also like" — same-category siblings first; fall back to other
  // products if the category is sparse.
  const all = await fetchProducts();
  const sameCategory = all.filter((p) => p.slug !== slug && p.category === product.category);
  const fillers = all.filter((p) => p.slug !== slug && p.category !== product.category);
  const related = [...sameCategory, ...fillers].slice(0, 3);

  return (
    <div className="app">
      <Topbar />
      <PDP product={product} related={related} />
      <Footer />
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const p = await fetchProductDetail(slug);
    return {
      title: `${p.name} — Lumen Goods`,
      description: p.description,
    };
  } catch {
    return { title: 'Lumen Goods' };
  }
}
