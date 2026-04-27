// /checkout — the prototype renders without the topbar/footer chrome.
import { Checkout } from '@/components/Checkout';

export const metadata = { title: 'Checkout — Lumen Goods' };

export default function CheckoutPage() {
  return <Checkout />;
}
