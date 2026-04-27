'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { fmt } from '@/lib/format';
import { type Order, fetchMyOrders } from '@/lib/orders';

import { Footer } from './Footer';
import { Topbar } from './Topbar';
import { useAuth } from './AuthProvider';

export function Account() {
  const router = useRouter();
  const { user, isLoaded, signOut } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      router.replace('/auth/sign-in');
      return;
    }
    fetchMyOrders()
      .then(setOrders)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load orders.'));
  }, [isLoaded, user, router]);

  if (!isLoaded || !user) {
    return (
      <div className="app">
        <Topbar />
        <div className="account-shell">
          <p className="muted">Loading…</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="app">
      <Topbar />
      <div className="account-shell">
        <header className="account-head">
          <div>
            <div className="account-eyebrow">Account</div>
            <h1 className="account-title">
              Welcome, {user.first_name || user.email.split('@')[0]}.
            </h1>
            <p className="muted">{user.email}</p>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              signOut();
              router.push('/');
            }}
          >
            Sign out
          </button>
        </header>

        <section className="account-section">
          <h2>Orders</h2>
          {error && <div className="auth-error">{error}</div>}
          {orders == null ? (
            <p className="muted">Loading orders…</p>
          ) : orders.length === 0 ? (
            <div className="empty-state">
              <p>You haven&apos;t placed any orders yet.</p>
              <Link href="/shop" className="btn btn-primary">
                Start shopping
              </Link>
            </div>
          ) : (
            <ul className="order-list">
              {orders.map((o) => (
                <li key={o.id} className="order-row">
                  <div>
                    <div className="order-num">#{o.display_number}</div>
                    <div className="muted">
                      {new Date(o.created_at).toLocaleDateString()} · {o.lines.length} item
                      {o.lines.length === 1 ? '' : 's'} · {o.status}
                    </div>
                  </div>
                  <div className="order-total">{fmt(o.total_cents)}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <Footer />
    </div>
  );
}
