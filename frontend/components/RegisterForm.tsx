'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Footer } from './Footer';
import { Topbar } from './Topbar';
import { useAuth } from './AuthProvider';

export function RegisterForm() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signUp(form);
      router.push('/account');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create account.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app">
      <Topbar />
      <div className="auth-shell">
        <div className="auth-card">
          <h1 className="auth-title">Create an account</h1>
          <p className="auth-sub">Save addresses, track orders, and check out faster next time.</p>
          <form onSubmit={onSubmit}>
            <div className="field-row">
              <div className="field">
                <label>First name</label>
                <input
                  value={form.first_name}
                  onChange={(e) => set('first_name', e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>Last name</label>
                <input
                  value={form.last_name}
                  onChange={(e) => set('last_name', e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                required
              />
            </div>
            {error && <div className="auth-error">{error}</div>}
            <button
              type="submit"
              className="btn btn-accent btn-lg btn-block"
              disabled={submitting}
              style={{ opacity: submitting ? 0.6 : 1 }}
            >
              {submitting ? 'Creating…' : 'Create account'}
            </button>
          </form>
          <div className="auth-foot">
            Already have one? <Link href="/auth/sign-in">Sign in</Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
