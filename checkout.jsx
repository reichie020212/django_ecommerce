// Multi-step checkout: Shipping → Payment → Review → Confirmation
const { useState: useStateCO, useMemo: useMemoCO } = React;

const Checkout = ({ items, onBack, onComplete }) => {
  const [step, setStep] = useStateCO(0);
  const [shipping, setShipping] = useStateCO({
    email: "", firstName: "", lastName: "", address: "", apt: "",
    city: "", state: "", zip: "", country: "United States", phone: ""
  });
  const [shipMethod, setShipMethod] = useStateCO("express");
  const [payment, setPayment] = useStateCO({
    cardNumber: "", expiry: "", cvc: "", nameOnCard: "", saveCard: true
  });
  const [discount, setDiscount] = useStateCO("");
  const [discountApplied, setDiscountApplied] = useStateCO(0);

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const shipPrice = useMemoCO(() => {
    if (subtotal === 0) return 0;
    if (shipMethod === "standard") return 0;
    if (shipMethod === "express") return subtotal > 200 ? 0 : 14;
    if (shipMethod === "overnight") return 28;
    return 0;
  }, [shipMethod, subtotal]);
  const tax = Math.round((subtotal - discountApplied) * 0.085);
  const total = subtotal - discountApplied + shipPrice + tax;

  const stepLabels = ["Shipping", "Payment", "Review"];

  const isShippingValid = shipping.email && shipping.firstName && shipping.lastName &&
    shipping.address && shipping.city && shipping.state && shipping.zip;
  const isPaymentValid = payment.cardNumber.replace(/\s/g, "").length >= 15 &&
    payment.expiry.length >= 4 && payment.cvc.length >= 3 && payment.nameOnCard;

  const fmtCard = (v) => v.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ").trim();
  const fmtExp = (v) => {
    const d = v.replace(/\D/g, "").slice(0, 4);
    return d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d;
  };

  const applyDiscount = () => {
    if (discount.trim().toUpperCase() === "LUMEN10") {
      setDiscountApplied(Math.round(subtotal * 0.1));
    }
  };

  if (step === 3) {
    return (
      <div className="confirm-screen">
        <div className="check"><Icon name="check" size={32}/></div>
        <h1>Thank you, {shipping.firstName || "friend"}.</h1>
        <p>Your order has been placed. We've sent a confirmation to <b>{shipping.email || "you"}</b>. You'll receive a tracking link as soon as it ships.</p>
        <div className="confirm-card">
          <div className="row"><span className="lbl">Order</span><span><b>#LG-{Math.floor(Math.random() * 90000 + 10000)}</b></span></div>
          <div className="row"><span className="lbl">Total</span><span><b>{LUMEN.fmt(total)}</b></span></div>
          <div className="row"><span className="lbl">Shipping to</span><span>{shipping.city}, {shipping.state}</span></div>
          <div className="row"><span className="lbl">Estimated arrival</span><span>{shipMethod === "overnight" ? "Tomorrow" : shipMethod === "express" ? "2–4 business days" : "5–7 business days"}</span></div>
        </div>
        <button className="btn btn-primary btn-lg" onClick={onComplete}>Continue shopping</button>
      </div>
    );
  }

  return (
    <div className="checkout">
      <div className="checkout-form-wrap">
        <div className="steps">
          {stepLabels.map((lbl, i) => (
            <React.Fragment key={lbl}>
              <div
                className={"step" + (step === i ? " active" : "") + (step > i ? " done" : "")}
                onClick={() => step > i && setStep(i)}
              >
                <span className="num">{step > i ? <Icon name="check" size={13}/> : i + 1}</span>
                {lbl}
              </div>
              {i < 2 ? <div className={"step-sep" + (step > i ? " done" : "")}></div> : null}
            </React.Fragment>
          ))}
        </div>

        {/* STEP 0 — Shipping */}
        {step === 0 && (
          <>
            <h2 className="checkout-title">Where should we send it?</h2>
            <p className="checkout-sub">We'll email a tracking link as soon as your order ships.</p>

            <div className="field">
              <label>Email</label>
              <input type="email" placeholder="you@example.com" value={shipping.email} onChange={(e) => setShipping({...shipping, email: e.target.value})}/>
            </div>
            <div className="field-row">
              <div className="field"><label>First name</label><input value={shipping.firstName} onChange={(e) => setShipping({...shipping, firstName: e.target.value})}/></div>
              <div className="field"><label>Last name</label><input value={shipping.lastName} onChange={(e) => setShipping({...shipping, lastName: e.target.value})}/></div>
            </div>
            <div className="field"><label>Address</label><input placeholder="Street and number" value={shipping.address} onChange={(e) => setShipping({...shipping, address: e.target.value})}/></div>
            <div className="field"><label>Apartment, suite, etc. (optional)</label><input value={shipping.apt} onChange={(e) => setShipping({...shipping, apt: e.target.value})}/></div>
            <div className="field-row-3">
              <div className="field"><label>City</label><input value={shipping.city} onChange={(e) => setShipping({...shipping, city: e.target.value})}/></div>
              <div className="field"><label>State</label><input value={shipping.state} onChange={(e) => setShipping({...shipping, state: e.target.value})}/></div>
              <div className="field"><label>ZIP</label><input value={shipping.zip} onChange={(e) => setShipping({...shipping, zip: e.target.value})}/></div>
            </div>
            <div className="field"><label>Phone</label><input placeholder="For delivery updates only" value={shipping.phone} onChange={(e) => setShipping({...shipping, phone: e.target.value})}/></div>

            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 400, margin: "28px 0 14px" }}>Shipping method</h3>
            <div className="ship-options">
              {[
                { id: "standard", name: "Standard", meta: "5–7 business days", price: 0 },
                { id: "express", name: "Express", meta: "2–4 business days", price: subtotal > 200 ? 0 : 14 },
                { id: "overnight", name: "Overnight", meta: "Next business day", price: 28 }
              ].map(opt => (
                <div key={opt.id} className={"ship-option" + (shipMethod === opt.id ? " active" : "")} onClick={() => setShipMethod(opt.id)}>
                  <span className="radio"></span>
                  <div className="ship-name">{opt.name}<div className="ship-meta">{opt.meta}</div></div>
                  <div className="ship-price">{opt.price === 0 ? "Free" : LUMEN.fmt(opt.price)}</div>
                </div>
              ))}
            </div>

            <div className="checkout-cta-row">
              <span className="back-link" onClick={onBack}><Icon name="arrow-left" size={14}/> Back to bag</span>
              <button className="btn btn-accent btn-lg" disabled={!isShippingValid} style={{ opacity: isShippingValid ? 1 : 0.5 }} onClick={() => setStep(1)}>
                Continue to payment <Icon name="arrow-right" size={15}/>
              </button>
            </div>
          </>
        )}

        {/* STEP 1 — Payment */}
        {step === 1 && (
          <>
            <h2 className="checkout-title">Payment</h2>
            <p className="checkout-sub">All transactions are encrypted and processed by Stripe.</p>

            <div className="payment-card">
              <div className="cc-strip" style={{ justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <span className="cc-brand">VISA</span>
                  <span className="cc-brand">MC</span>
                  <span className="cc-brand">AMEX</span>
                  <span className="cc-brand">DISC</span>
                </div>
                <div className="stripe-badge"><Icon name="lock" size={11} className="lock"/> STRIPE SECURED</div>
              </div>
              <div className="field" style={{ marginTop: 14 }}>
                <label>Card number</label>
                <input placeholder="1234 1234 1234 1234" value={payment.cardNumber}
                  onChange={(e) => setPayment({...payment, cardNumber: fmtCard(e.target.value)})}/>
              </div>
              <div className="field-row">
                <div className="field"><label>Expiry</label><input placeholder="MM / YY" value={payment.expiry}
                  onChange={(e) => setPayment({...payment, expiry: fmtExp(e.target.value)})}/></div>
                <div className="field"><label>CVC</label><input placeholder="123" value={payment.cvc}
                  onChange={(e) => setPayment({...payment, cvc: e.target.value.replace(/\D/g, "").slice(0, 4)})}/></div>
              </div>
              <div className="field"><label>Name on card</label><input value={payment.nameOnCard} onChange={(e) => setPayment({...payment, nameOnCard: e.target.value})}/></div>
              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--slate-700)", marginTop: 6 }}>
                <input type="checkbox" checked={payment.saveCard} onChange={(e) => setPayment({...payment, saveCard: e.target.checked})} style={{ accentColor: "var(--indigo-600)" }}/>
                Save this card for future purchases
              </label>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "12px 14px", background: "var(--paper-2)", borderRadius: "var(--r-md)", fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.55 }}>
              <Icon name="info" size={14} style={{ marginTop: 2, flex: "0 0 auto" }}/>
              <span><b style={{ color: "var(--slate-900)" }}>Demo mode.</b> Use card <span className="mono">4242 4242 4242 4242</span> with any future expiry and any CVC to simulate a successful Stripe charge.</span>
            </div>

            <div className="checkout-cta-row">
              <span className="back-link" onClick={() => setStep(0)}><Icon name="arrow-left" size={14}/> Back to shipping</span>
              <button className="btn btn-accent btn-lg" disabled={!isPaymentValid} style={{ opacity: isPaymentValid ? 1 : 0.5 }} onClick={() => setStep(2)}>
                Review order <Icon name="arrow-right" size={15}/>
              </button>
            </div>
          </>
        )}

        {/* STEP 2 — Review */}
        {step === 2 && (
          <>
            <h2 className="checkout-title">Review and place order</h2>
            <p className="checkout-sub">A final look before we charge your card.</p>

            <div className="review-block">
              <div className="review-head"><h4>Contact</h4><span className="edit" onClick={() => setStep(0)}>Edit</span></div>
              <div className="review-body">{shipping.email}<br/><span className="muted">{shipping.phone || "No phone provided"}</span></div>
            </div>
            <div className="review-block">
              <div className="review-head"><h4>Ship to</h4><span className="edit" onClick={() => setStep(0)}>Edit</span></div>
              <div className="review-body">
                {shipping.firstName} {shipping.lastName}<br/>
                {shipping.address}{shipping.apt ? `, ${shipping.apt}` : ""}<br/>
                <span className="muted">{shipping.city}, {shipping.state} {shipping.zip} · {shipping.country}</span>
              </div>
            </div>
            <div className="review-block">
              <div className="review-head"><h4>Method</h4><span className="edit" onClick={() => setStep(0)}>Edit</span></div>
              <div className="review-body">
                {shipMethod[0].toUpperCase() + shipMethod.slice(1)} shipping<br/>
                <span className="muted">{shipMethod === "overnight" ? "Next business day" : shipMethod === "express" ? "2–4 business days" : "5–7 business days"}</span>
              </div>
            </div>
            <div className="review-block">
              <div className="review-head"><h4>Payment</h4><span className="edit" onClick={() => setStep(1)}>Edit</span></div>
              <div className="review-body">
                Card ending in <b>{payment.cardNumber.slice(-4)}</b><br/>
                <span className="muted">{payment.nameOnCard}</span>
              </div>
            </div>

            <div className="checkout-cta-row">
              <span className="back-link" onClick={() => setStep(1)}><Icon name="arrow-left" size={14}/> Back to payment</span>
              <button className="btn btn-accent btn-lg" onClick={() => setStep(3)}>
                <Icon name="lock" size={14}/> Place order · {LUMEN.fmt(total)}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Right rail summary */}
      <aside className="checkout-summary">
        <div className="summary-rail">
          <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 24, fontWeight: 400, margin: "0 0 20px" }}>
            Order summary
          </h3>
          <div className="summary-list">
            {items.map((it, idx) => (
              <div className="summary-row" key={idx}>
                <div className="ph-wrap">
                  <Placeholder tone={it.selectedColor.tone} label="" />
                  <span className="qty-bubble">{it.qty}</span>
                </div>
                <div>
                  <div className="name">{it.name}</div>
                  <div className="opt">{it.selectedColor.name} · {it.selectedSize}</div>
                </div>
                <div className="price">{LUMEN.fmt(it.price * it.qty)}</div>
              </div>
            ))}
          </div>

          <div className="discount-row">
            <input placeholder="Promo code" value={discount} onChange={(e) => setDiscount(e.target.value)}/>
            <button className="btn btn-ghost btn-sm" onClick={applyDiscount}>Apply</button>
          </div>

          <div className="totals">
            <div className="row"><span>Subtotal</span><span>{LUMEN.fmt(subtotal)}</span></div>
            {discountApplied > 0 && <div className="row" style={{ color: "var(--success)" }}><span>Discount (LUMEN10)</span><span>−{LUMEN.fmt(discountApplied)}</span></div>}
            <div className="row"><span>Shipping</span><span>{shipPrice === 0 ? "Free" : LUMEN.fmt(shipPrice)}</span></div>
            <div className="row"><span>Estimated tax</span><span>{LUMEN.fmt(tax)}</span></div>
            <div className="row total"><span>Total</span><span className="num">{LUMEN.fmt(total)}</span></div>
          </div>

          <div style={{ marginTop: 20, padding: 16, background: "white", border: "1px solid var(--line)", borderRadius: "var(--r-md)", fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.55, display: "flex", gap: 10 }}>
            <Icon name="shield" size={16} style={{ flex: "0 0 auto", color: "var(--slate-900)", marginTop: 1 }}/>
            <span>Your information is secured with bank-level 256-bit encryption. Lumen Goods never stores raw card data.</span>
          </div>
        </div>
      </aside>
    </div>
  );
};

window.Checkout = Checkout;
