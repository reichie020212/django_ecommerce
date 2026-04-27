// Multi-step checkout — port of prototype/checkout.jsx.
// Shipping → Payment → Review → Confirmation
// Stripe Elements (PaymentElement) replaces the prototype's hand-rolled
// card form. createPaymentIntent fires when the user advances from
// Shipping; the returned client_secret powers Stripe Elements.
'use client';

import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { type Stripe, loadStripe } from '@stripe/stripe-js';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { useCart } from '@/components/CartProvider';
import { Icon } from '@/components/Icon';
import { Placeholder } from '@/components/Placeholder';
import {
  type CouponInfo,
  type Order,
  type PaymentIntentResponse,
  type ShippingInput,
  confirmOrder,
  createPaymentIntent,
  redeemCoupon,
} from '@/lib/checkout';
import { fmt } from '@/lib/format';

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
const STRIPE_CONFIGURED = !!PUBLISHABLE_KEY && !PUBLISHABLE_KEY.includes('replace_me');

const stripePromise: Promise<Stripe | null> = STRIPE_CONFIGURED
  ? loadStripe(PUBLISHABLE_KEY)
  : Promise.resolve(null);

type Shipping = {
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  apt: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
};

const EMPTY_SHIPPING: Shipping = {
  email: '',
  firstName: '',
  lastName: '',
  address: '',
  apt: '',
  city: '',
  state: '',
  zip: '',
  country: 'United States',
  phone: '',
};

export function Checkout() {
  const router = useRouter();
  const { cart, refresh } = useCart();
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [shipping, setShipping] = useState<Shipping>(EMPTY_SHIPPING);
  const [shipMethod, setShipMethod] = useState<'standard' | 'express' | 'overnight'>('express');
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<CouponInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pi, setPi] = useState<PaymentIntentResponse | null>(null);
  const [order, setOrder] = useState<Order | null>(null);

  const subtotal = cart?.subtotal_cents ?? 0;
  const discount =
    coupon && coupon.valid && coupon.percent_off
      ? Math.round((subtotal * coupon.percent_off) / 100)
      : 0;
  const net = Math.max(0, subtotal - discount);
  const shipPrice = useMemo(() => {
    if (net <= 0) return 0;
    if (shipMethod === 'standard') return 0;
    if (shipMethod === 'express') return net > 200_00 ? 0 : 14_00;
    if (shipMethod === 'overnight') return 28_00;
    return 0;
  }, [shipMethod, net]);
  const tax = Math.round(net * 0.085);
  const total = net + shipPrice + tax;

  const isShippingValid =
    !!shipping.email &&
    !!shipping.firstName &&
    !!shipping.lastName &&
    !!shipping.address &&
    !!shipping.city &&
    !!shipping.state &&
    !!shipping.zip;

  function set<K extends keyof Shipping>(k: K, v: Shipping[K]) {
    setShipping((s) => ({ ...s, [k]: v }));
  }

  async function applyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    const res = await redeemCoupon(code);
    setCoupon(res.valid ? res : null);
    if (!res.valid) setCouponInput('');
  }

  async function continueToPayment() {
    setError(null);
    setSubmitting(true);
    try {
      const body: ShippingInput = {
        email: shipping.email,
        phone: shipping.phone,
        first_name: shipping.firstName,
        last_name: shipping.lastName,
        address: shipping.address,
        apt: shipping.apt,
        city: shipping.city,
        state: shipping.state,
        zip: shipping.zip,
        country: shipping.country,
        ship_method: shipMethod,
        coupon_code: coupon && coupon.valid ? coupon.code : '',
      };
      const result = await createPaymentIntent(body);
      setPi(result);
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start payment.');
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 3 && order) {
    return <Confirmation order={order} onContinue={() => router.push('/shop')} />;
  }

  return (
    <div className="checkout">
      <div className="checkout-form-wrap">
        <Steps step={step} setStep={setStep} />

        {step === 0 && (
          <>
            <h2 className="checkout-title">Where should we send it?</h2>
            <p className="checkout-sub">
              We&apos;ll email a tracking link as soon as your order ships.
            </p>

            <div className="field">
              <label>Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={shipping.email}
                onChange={(e) => set('email', e.target.value)}
              />
            </div>
            <div className="field-row">
              <div className="field">
                <label>First name</label>
                <input
                  value={shipping.firstName}
                  onChange={(e) => set('firstName', e.target.value)}
                />
              </div>
              <div className="field">
                <label>Last name</label>
                <input
                  value={shipping.lastName}
                  onChange={(e) => set('lastName', e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label>Address</label>
              <input
                placeholder="Street and number"
                value={shipping.address}
                onChange={(e) => set('address', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Apartment, suite, etc. (optional)</label>
              <input value={shipping.apt} onChange={(e) => set('apt', e.target.value)} />
            </div>
            <div className="field-row-3">
              <div className="field">
                <label>City</label>
                <input value={shipping.city} onChange={(e) => set('city', e.target.value)} />
              </div>
              <div className="field">
                <label>State</label>
                <input value={shipping.state} onChange={(e) => set('state', e.target.value)} />
              </div>
              <div className="field">
                <label>ZIP</label>
                <input value={shipping.zip} onChange={(e) => set('zip', e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label>Phone</label>
              <input
                placeholder="For delivery updates only"
                value={shipping.phone}
                onChange={(e) => set('phone', e.target.value)}
              />
            </div>

            <h3
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 22,
                fontWeight: 400,
                margin: '28px 0 14px',
              }}
            >
              Shipping method
            </h3>
            <div className="ship-options">
              {(
                [
                  { id: 'standard', name: 'Standard', meta: '5–7 business days', price: 0 },
                  {
                    id: 'express',
                    name: 'Express',
                    meta: '2–4 business days',
                    price: net > 200_00 ? 0 : 14_00,
                  },
                  { id: 'overnight', name: 'Overnight', meta: 'Next business day', price: 28_00 },
                ] as const
              ).map((opt) => (
                <div
                  key={opt.id}
                  role="button"
                  className={'ship-option' + (shipMethod === opt.id ? ' active' : '')}
                  onClick={() => setShipMethod(opt.id)}
                >
                  <span className="radio" />
                  <div className="ship-name">
                    {opt.name}
                    <div className="ship-meta">{opt.meta}</div>
                  </div>
                  <div className="ship-price">{opt.price === 0 ? 'Free' : fmt(opt.price)}</div>
                </div>
              ))}
            </div>

            <div className="checkout-cta-row">
              <span className="back-link" onClick={() => router.push('/shop')}>
                <Icon name="arrow-left" size={14} /> Back to bag
              </span>
              <button
                type="button"
                className="btn btn-accent btn-lg"
                disabled={!isShippingValid || submitting}
                style={{ opacity: isShippingValid && !submitting ? 1 : 0.5 }}
                onClick={continueToPayment}
              >
                {submitting ? 'Starting payment…' : 'Continue to payment'}{' '}
                <Icon name="arrow-right" size={15} />
              </button>
            </div>
            {error && <ErrorBanner message={error} />}
          </>
        )}

        {step === 1 && pi && (
          <Elements
            stripe={stripePromise}
            options={{ clientSecret: pi.client_secret, appearance: { theme: 'stripe' } }}
          >
            <PaymentStep
              onBack={() => setStep(0)}
              onContinue={() => setStep(2)}
              configured={STRIPE_CONFIGURED}
            />
          </Elements>
        )}

        {step === 2 && pi && (
          <Elements
            stripe={stripePromise}
            options={{ clientSecret: pi.client_secret, appearance: { theme: 'stripe' } }}
          >
            <ReviewStep
              shipping={shipping}
              shipMethod={shipMethod}
              total={total}
              onBack={() => setStep(1)}
              onPaid={async (intentId) => {
                const finalized = await confirmOrder(intentId);
                setOrder(finalized);
                await refresh();
                setStep(3);
              }}
            />
          </Elements>
        )}
      </div>

      <Summary
        cart={cart}
        couponInput={couponInput}
        setCouponInput={setCouponInput}
        coupon={coupon}
        applyCoupon={applyCoupon}
        subtotal={subtotal}
        discount={discount}
        shipPrice={shipPrice}
        tax={tax}
        total={total}
      />
    </div>
  );
}

// ── Step strip ────────────────────────────────────────────────────────────────

function Steps({ step, setStep }: { step: number; setStep: (n: 0 | 1 | 2 | 3) => void }) {
  const labels = ['Shipping', 'Payment', 'Review'];
  return (
    <div className="steps">
      {labels.map((lbl, i) => (
        <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            className={'step' + (step === i ? ' active' : '') + (step > i ? ' done' : '')}
            onClick={() => step > i && setStep(i as 0 | 1 | 2)}
            role="button"
          >
            <span className="num">{step > i ? <Icon name="check" size={13} /> : i + 1}</span>
            {lbl}
          </div>
          {i < 2 && <div className={'step-sep' + (step > i ? ' done' : '')} />}
        </div>
      ))}
    </div>
  );
}

// ── Payment step (PaymentElement) ─────────────────────────────────────────────

function PaymentStep({
  onBack,
  onContinue,
  configured,
}: {
  onBack: () => void;
  onContinue: () => void;
  configured: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [ready, setReady] = useState(false);

  return (
    <>
      <h2 className="checkout-title">Payment</h2>
      <p className="checkout-sub">All transactions are encrypted and processed by Stripe.</p>

      {!configured && (
        <div
          style={{
            padding: 16,
            background: 'var(--paper-2)',
            borderRadius: 'var(--r-md)',
            fontSize: 13,
            color: 'var(--ink-soft)',
            marginBottom: 16,
          }}
        >
          Stripe is not configured in this environment. Set{' '}
          <span className="mono">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</span> and{' '}
          <span className="mono">STRIPE_SECRET_KEY</span> in <span className="mono">.env</span> to
          enable the card form.
        </div>
      )}

      <div className="payment-card">
        <div className="cc-strip" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <span className="cc-brand">VISA</span>
            <span className="cc-brand">MC</span>
            <span className="cc-brand">AMEX</span>
            <span className="cc-brand">DISC</span>
          </div>
          <div className="stripe-badge">
            <Icon name="lock" size={11} className="lock" /> STRIPE SECURED
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <PaymentElement onReady={() => setReady(true)} />
        </div>
      </div>

      <div className="checkout-cta-row">
        <span className="back-link" onClick={onBack}>
          <Icon name="arrow-left" size={14} /> Back to shipping
        </span>
        <button
          type="button"
          className="btn btn-accent btn-lg"
          disabled={!stripe || !elements || !ready}
          style={{ opacity: stripe && elements && ready ? 1 : 0.5 }}
          onClick={onContinue}
        >
          Review order <Icon name="arrow-right" size={15} />
        </button>
      </div>
    </>
  );
}

// ── Review step (places the actual charge) ────────────────────────────────────

function ReviewStep({
  shipping,
  shipMethod,
  total,
  onBack,
  onPaid,
}: {
  shipping: Shipping;
  shipMethod: string;
  total: number;
  onBack: () => void;
  onPaid: (paymentIntentId: string) => Promise<void>;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function placeOrder() {
    if (!stripe || !elements) return;
    setSubmitting(true);
    setErr(null);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });
    if (error) {
      setErr(error.message ?? 'Payment failed.');
      setSubmitting(false);
      return;
    }
    if (paymentIntent && paymentIntent.status === 'succeeded') {
      try {
        await onPaid(paymentIntent.id);
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Order finalization failed.');
      }
    }
    setSubmitting(false);
  }

  return (
    <>
      <h2 className="checkout-title">Review and place order</h2>
      <p className="checkout-sub">A final look before we charge your card.</p>

      <div className="review-block">
        <div className="review-head">
          <h4>Contact</h4>
        </div>
        <div className="review-body">
          {shipping.email}
          <br />
          <span className="muted">{shipping.phone || 'No phone provided'}</span>
        </div>
      </div>
      <div className="review-block">
        <div className="review-head">
          <h4>Ship to</h4>
        </div>
        <div className="review-body">
          {shipping.firstName} {shipping.lastName}
          <br />
          {shipping.address}
          {shipping.apt ? `, ${shipping.apt}` : ''}
          <br />
          <span className="muted">
            {shipping.city}, {shipping.state} {shipping.zip} · {shipping.country}
          </span>
        </div>
      </div>
      <div className="review-block">
        <div className="review-head">
          <h4>Method</h4>
        </div>
        <div className="review-body">
          {shipMethod.charAt(0).toUpperCase() + shipMethod.slice(1)} shipping
          <br />
          <span className="muted">
            {shipMethod === 'overnight'
              ? 'Next business day'
              : shipMethod === 'express'
                ? '2–4 business days'
                : '5–7 business days'}
          </span>
        </div>
      </div>

      <div className="checkout-cta-row">
        <span className="back-link" onClick={onBack}>
          <Icon name="arrow-left" size={14} /> Back to payment
        </span>
        <button
          type="button"
          className="btn btn-accent btn-lg"
          disabled={!stripe || submitting}
          onClick={placeOrder}
          style={{ opacity: stripe && !submitting ? 1 : 0.5 }}
        >
          <Icon name="lock" size={14} />{' '}
          {submitting ? 'Processing…' : `Place order · ${fmt(total)}`}
        </button>
      </div>
      {err && <ErrorBanner message={err} />}
    </>
  );
}

// ── Confirmation ──────────────────────────────────────────────────────────────

function Confirmation({ order, onContinue }: { order: Order; onContinue: () => void }) {
  return (
    <div className="confirm-screen">
      <div className="check">
        <Icon name="check" size={32} />
      </div>
      <h1>Thank you, {order.ship_first_name || 'friend'}.</h1>
      <p>
        Your order has been placed. We&apos;ve sent a confirmation to <b>{order.customer_email}</b>.
        You&apos;ll receive a tracking link as soon as it ships.
      </p>
      <div className="confirm-card">
        <div className="row">
          <span className="lbl">Order</span>
          <span>
            <b>#{order.display_number}</b>
          </span>
        </div>
        <div className="row">
          <span className="lbl">Total</span>
          <span>
            <b>{fmt(order.total_cents)}</b>
          </span>
        </div>
        <div className="row">
          <span className="lbl">Shipping to</span>
          <span>
            {order.ship_city}, {order.ship_state}
          </span>
        </div>
        <div className="row">
          <span className="lbl">Estimated arrival</span>
          <span>
            {order.ship_method === 'overnight'
              ? 'Tomorrow'
              : order.ship_method === 'express'
                ? '2–4 business days'
                : '5–7 business days'}
          </span>
        </div>
      </div>
      <button type="button" className="btn btn-primary btn-lg" onClick={onContinue}>
        Continue shopping
      </button>
    </div>
  );
}

// ── Order summary rail ────────────────────────────────────────────────────────

function Summary({
  cart,
  couponInput,
  setCouponInput,
  coupon,
  applyCoupon,
  subtotal,
  discount,
  shipPrice,
  tax,
  total,
}: {
  cart: ReturnType<typeof useCart>['cart'];
  couponInput: string;
  setCouponInput: (s: string) => void;
  coupon: CouponInfo | null;
  applyCoupon: () => void;
  subtotal: number;
  discount: number;
  shipPrice: number;
  tax: number;
  total: number;
}) {
  const items = cart?.lines ?? [];
  return (
    <aside className="checkout-summary">
      <div className="summary-rail">
        <h3
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 24,
            fontWeight: 400,
            margin: '0 0 20px',
          }}
        >
          Order summary
        </h3>
        <div className="summary-list">
          {items.map((it) => (
            <div className="summary-row" key={it.id}>
              <div className="ph-wrap">
                <Placeholder tone={it.color.tone} label="" />
                <span className="qty-bubble">{it.qty}</span>
              </div>
              <div>
                <div className="name">{it.name}</div>
                <div className="opt">
                  {it.color.name} · {it.size}
                </div>
              </div>
              <div className="price">{fmt(it.line_total_cents)}</div>
            </div>
          ))}
        </div>

        <div className="discount-row">
          <input
            placeholder="Promo code"
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value)}
          />
          <button type="button" className="btn btn-ghost btn-sm" onClick={applyCoupon}>
            Apply
          </button>
        </div>

        <div className="totals">
          <div className="row">
            <span>Subtotal</span>
            <span>{fmt(subtotal)}</span>
          </div>
          {discount > 0 && coupon && coupon.valid && (
            <div className="row" style={{ color: 'var(--success)' }}>
              <span>Discount ({coupon.code})</span>
              <span>−{fmt(discount)}</span>
            </div>
          )}
          <div className="row">
            <span>Shipping</span>
            <span>{shipPrice === 0 ? 'Free' : fmt(shipPrice)}</span>
          </div>
          <div className="row">
            <span>Estimated tax</span>
            <span>{fmt(tax)}</span>
          </div>
          <div className="row total">
            <span>Total</span>
            <span className="num">{fmt(total)}</span>
          </div>
        </div>

        <div
          style={{
            marginTop: 20,
            padding: 16,
            background: 'white',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-md)',
            fontSize: 12.5,
            color: 'var(--ink-soft)',
            lineHeight: 1.55,
            display: 'flex',
            gap: 10,
          }}
        >
          <Icon
            name="shield"
            size={16}
            style={{ flex: '0 0 auto', color: 'var(--slate-900)', marginTop: 1 }}
          />
          <span>
            Your information is secured with bank-level 256-bit encryption. Lumen Goods never stores
            raw card data.
          </span>
        </div>
      </div>
    </aside>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      style={{
        marginTop: 16,
        padding: 12,
        background: '#fdecec',
        color: 'var(--danger)',
        borderRadius: 'var(--r-md)',
        fontSize: 13,
      }}
    >
      {message}
    </div>
  );
}
