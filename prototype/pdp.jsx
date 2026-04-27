// Product Detail Page
const { useState: useStatePDP, useEffect: useEffectPDP, useRef: useRefPDP } = React;

const PDP = ({ product, onBack, onAddToCart, onOpen }) => {
  const [colorIdx, setColorIdx] = useStatePDP(0);
  const [size, setSize] = useStatePDP(null);
  const [qty, setQty] = useStatePDP(1);
  const [imgIdx, setImgIdx] = useStatePDP(0);
  const [adding, setAdding] = useStatePDP(false);
  const [openAcc, setOpenAcc] = useStatePDP("details");
  const addBtnRef = useRefPDP(null);

  useEffectPDP(() => {
    setColorIdx(0); setSize(null); setQty(1); setImgIdx(0);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [product?.id]);

  if (!product) return null;
  const color = product.colors[colorIdx];
  const tones = [color.tone, product.altTone || color.tone, product.tone, "graphite"];

  const handleAdd = () => {
    if (!size) { setSize(product.sizes.find(s => !product.soldOut.includes(s))); }
    if (adding) return;
    setAdding(true);
    onAddToCart({
      ...product,
      selectedColor: color,
      selectedSize: size || product.sizes.find(s => !product.soldOut.includes(s)),
      qty
    }, addBtnRef.current);
    setTimeout(() => setAdding(false), 1400);
  };

  const related = LUMEN.PRODUCTS.filter(p => p.id !== product.id && p.category === product.category).slice(0, 3);
  const fillRelated = LUMEN.PRODUCTS.filter(p => p.id !== product.id).slice(0, 3 - related.length);
  const recs = [...related, ...fillRelated].slice(0, 3);

  return (
    <>
      <div className="pdp">
        <div className="crumbs">
          <a onClick={onBack}>Shop</a>
          <span className="sep">/</span>
          <a onClick={onBack}>{product.category}</a>
          <span className="sep">/</span>
          <span>{product.name}</span>
        </div>

        <div className="pdp-grid">
          <div className="pdp-gallery">
            <div className="pdp-thumbs">
              {tones.map((t, i) => (
                <div key={i} className={"thumb" + (imgIdx === i ? " active" : "")} onClick={() => setImgIdx(i)}>
                  <Placeholder tone={t} label={`${String(i+1).padStart(2, "0")}`} />
                </div>
              ))}
            </div>
            <div className="pdp-main-image">
              <Placeholder tone={tones[imgIdx]} label={`${product.id} · VIEW ${imgIdx+1}`} />
            </div>
          </div>

          <div className="pdp-info">
            <div className="pdp-eyebrow">{product.category} · {product.id.toUpperCase()}</div>
            <h1 className="pdp-title">{product.name}</h1>
            <div className="pdp-price">
              <span className="now">{LUMEN.fmt(product.price)}</span>
              {product.was ? <span className="was">{LUMEN.fmt(product.was)}</span> : null}
              {product.was ? <span className="save">Save {LUMEN.fmt(product.was - product.price)}</span> : null}
            </div>
            <div className="pdp-rating">
              <Stars value={product.rating} size={13}/>
              <span>{product.rating.toFixed(1)} · {product.reviews} reviews</span>
            </div>

            <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 14, lineHeight: 1.65 }}>
              {product.desc}
            </p>

            <div className="pdp-section">
              <div className="pdp-section-head">
                <span className="label">Color</span>
                <span className="value">{color.name}</span>
              </div>
              <div className="option-row">
                {product.colors.map((c, i) => (
                  <span key={i}
                    className={"color-pick" + (colorIdx === i ? " active" : "")}
                    style={{ background: c.hex }}
                    onClick={() => { setColorIdx(i); setImgIdx(0); }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            <div className="pdp-section">
              <div className="pdp-section-head">
                <span className="label">Size</span>
                <span className="size-link">Size guide</span>
              </div>
              <div className="option-row">
                {product.sizes.map(s => {
                  const out = product.soldOut.includes(s);
                  return (
                    <button
                      key={s}
                      className={"size-pick" + (size === s ? " active" : "") + (out ? " disabled" : "")}
                      onClick={() => !out && setSize(s)}
                      disabled={out}
                    >{s}</button>
                  );
                })}
              </div>
            </div>

            <div className="pdp-cta-row" style={{ marginTop: 6 }}>
              <div className="qty">
                <button onClick={() => setQty(Math.max(1, qty-1))} aria-label="Decrease"><Icon name="minus" size={14}/></button>
                <span>{qty}</span>
                <button onClick={() => setQty(qty+1)} aria-label="Increase"><Icon name="plus" size={14}/></button>
              </div>
              <button
                ref={addBtnRef}
                className={"btn btn-accent btn-lg add-btn" + (adding ? " is-adding" : "")}
                onClick={handleAdd}
                style={{ flex: 1 }}
              >
                <span className="btn-text"><Icon name="bag" size={15}/> Add to bag · {LUMEN.fmt(product.price * qty)}</span>
                <span className="btn-checkmark"><Icon name="check" size={16}/> Added to bag</span>
              </button>
            </div>

            <div className="pdp-features">
              <div className="pdp-feature"><Icon name="truck" size={16}/><div>Free express shipping<br/><span style={{color: "var(--ink-soft)", fontSize: 12}}>Arrives in 2–4 business days</span></div></div>
              <div className="pdp-feature"><Icon name="refresh" size={16}/><div>30-day free returns<br/><span style={{color: "var(--ink-soft)", fontSize: 12}}>Pre-paid label included</span></div></div>
              <div className="pdp-feature"><Icon name="shield" size={16}/><div>Lifetime repairs<br/><span style={{color: "var(--ink-soft)", fontSize: 12}}>By our atelier in Porto</span></div></div>
              <div className="pdp-feature"><Icon name="leaf" size={16}/><div>Traceable supply<br/><span style={{color: "var(--ink-soft)", fontSize: 12}}>Mill to maker, on-record</span></div></div>
            </div>

            <div className="acc">
              {[
                { id: "details", title: "Materials & details", body: (
                  <ul>
                    {(product.details || ["Premium materials, sourced and traced", "Constructed by independent ateliers", "Designed to be repaired, not replaced"]).map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                )},
                { id: "ship", title: "Shipping & returns", body: <p>Complimentary express shipping on orders over $200. Free returns within 30 days — no restocking fees, no questions asked.</p> },
                { id: "care", title: "Care instructions", body: <p>Dry clean, reshape and lay flat. Brush with a soft horsehair brush between wears to lift the nap.</p> }
              ].map(row => (
                <div key={row.id} className={"acc-row" + (openAcc === row.id ? " open" : "")}>
                  <button className="acc-trigger" onClick={() => setOpenAcc(openAcc === row.id ? null : row.id)}>
                    {row.title}
                    <span className="plus"><Icon name="plus" size={16}/></span>
                  </button>
                  <div className="acc-content">
                    <div className="acc-content-inner">{row.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="related">
        <h3>You might also like</h3>
        <div className="grid">
          {recs.map(p => (
            <ProductCard key={p.id} product={p} onOpen={onOpen} onQuickAdd={(prod, btn) => onAddToCart({...prod, selectedColor: prod.colors[0], selectedSize: prod.sizes.find(s => !prod.soldOut.includes(s)), qty: 1}, btn)}/>
          ))}
        </div>
      </div>
    </>
  );
};

window.PDP = PDP;
