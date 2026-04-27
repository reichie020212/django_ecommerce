// Cart Drawer
const CartDrawer = ({ open, items, onClose, onChangeQty, onRemove, onCheckout }) => {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = subtotal > 200 || subtotal === 0 ? 0 : 14;
  const tax = Math.round(subtotal * 0.085);
  const total = subtotal + shipping + tax;

  return (
    <>
      <div className={"scrim" + (open ? " open" : "")} onClick={onClose}></div>
      <aside className={"drawer" + (open ? " open" : "")}>
        <div className="drawer-head">
          <h3>Your bag<span className="count">· {items.length} {items.length === 1 ? "item" : "items"}</span></h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close cart"><Icon name="close" size={18}/></button>
        </div>

        <div className="drawer-body">
          {items.length === 0 ? (
            <div className="drawer-empty">
              <div className="glyph"><Icon name="bag" size={26}/></div>
              <div>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: 24, color: "var(--slate-900)", marginBottom: 6 }}>Your bag is empty</div>
                <p>Discover our latest arrivals and small-batch staples.</p>
              </div>
              <button className="btn btn-primary" onClick={onClose}>Continue shopping</button>
            </div>
          ) : items.map((it, idx) => (
            <div className="cart-row" key={idx}>
              <div className="ph-wrap">
                <Placeholder tone={it.selectedColor.tone} label={it.id.toUpperCase()} />
              </div>
              <div className="meta">
                <div className="name">{it.name}</div>
                <div className="opt">{it.selectedColor.name} · Size {it.selectedSize}</div>
                <div className="controls">
                  <div className="qty-mini">
                    <button onClick={() => onChangeQty(idx, Math.max(1, it.qty - 1))}><Icon name="minus" size={11}/></button>
                    <span>{it.qty}</span>
                    <button onClick={() => onChangeQty(idx, it.qty + 1)}><Icon name="plus" size={11}/></button>
                  </div>
                  <a onClick={() => onRemove(idx)}>Remove</a>
                </div>
              </div>
              <div className="price">{LUMEN.fmt(it.price * it.qty)}</div>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div className="drawer-foot">
            <div className="promo-strip">
              <span className="dot"></span> {subtotal > 200 ? "Free express shipping unlocked" : `Spend ${LUMEN.fmt(200 - subtotal)} more for free shipping`}
            </div>
            <div className="totals">
              <div className="row"><span>Subtotal</span><span>{LUMEN.fmt(subtotal)}</span></div>
              <div className="row"><span>Shipping</span><span>{shipping === 0 ? "Free" : LUMEN.fmt(shipping)}</span></div>
              <div className="row"><span>Estimated tax</span><span>{LUMEN.fmt(tax)}</span></div>
              <div className="row total"><span>Total</span><span className="num">{LUMEN.fmt(total)}</span></div>
            </div>
            <button className="btn btn-accent btn-block btn-lg" onClick={onCheckout}>
              Checkout <Icon name="arrow-right" size={15}/>
            </button>
            <div style={{ textAlign: "center", marginTop: 12, fontSize: 11.5, color: "var(--ink-soft)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
              <Icon name="lock" size={11}/> SECURE CHECKOUT · POWERED BY STRIPE
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

window.CartDrawer = CartDrawer;
