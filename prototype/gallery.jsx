// Gallery — hero + filters + grid
const { useState: useStateG, useMemo } = React;

const Hero = () => (
  <div className="hero">
    <div>
      <div className="hero-eyebrow">Spring / Summer · Vol. 07</div>
      <h1 className="hero-title">Quiet objects, <em>made to last</em>.</h1>
      <p className="hero-sub">
        Lumen Goods is a small atelier of garments and leather goods, designed in
        Copenhagen and made by independent ateliers across Europe and Japan.
      </p>
    </div>
    <div className="hero-meta">
      <div><b>147</b>Active styles</div>
      <div><b>38</b>Ateliers worldwide</div>
      <div><b>4.8★</b>11k+ reviews</div>
    </div>
  </div>
);

const Filters = ({ category, setCategory, price, setPrice, color, setColor }) => (
  <aside className="filters-sticky">
    <div className="filters">
      <div className="filter-group">
        <h4>Category</h4>
        <div className="filter-list">
          {LUMEN.CATEGORIES.map(c => (
            <div
              key={c.id}
              className={"filter-item" + (category === c.id ? " active" : "")}
              onClick={() => setCategory(c.id)}
            >
              <span>{c.name}</span>
              <span className="count">{String(c.count).padStart(2, "0")}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <h4>Price</h4>
        <div className="range-row">
          <span>Up to <b>{LUMEN.fmt(price)}</b></span>
          <span>$700 max</span>
        </div>
        <input
          className="range-input" type="range"
          min="50" max="700" step="10"
          value={price} onChange={(e) => setPrice(+e.target.value)}
        />
      </div>

      <div className="filter-group">
        <h4>Color</h4>
        <div className="swatches">
          {LUMEN.COLOR_SWATCHES.map(c => (
            <span
              key={c.name}
              className={"swatch" + (color === c.name ? " active" : "")}
              style={{ background: c.hex }}
              title={c.name}
              onClick={() => setColor(color === c.name ? null : c.name)}
            />
          ))}
        </div>
      </div>

      <div className="filter-group">
        <h4>Availability</h4>
        <div className="filter-list">
          <div className="filter-item"><span>In stock</span><span className="count">142</span></div>
          <div className="filter-item"><span>New arrivals</span><span className="count">23</span></div>
          <div className="filter-item"><span>Final sale</span><span className="count">11</span></div>
        </div>
      </div>
    </div>
  </aside>
);

const Gallery = ({ search, onOpen, onQuickAdd }) => {
  const [category, setCategory] = useStateG("all");
  const [price, setPrice] = useStateG(700);
  const [color, setColor] = useStateG(null);
  const [view, setView] = useStateG("grid");
  const [sort, setSort] = useStateG("featured");

  const filtered = useMemo(() => {
    let list = LUMEN.PRODUCTS.filter(p => {
      if (category !== "all" && p.category !== category) return false;
      if (p.price > price) return false;
      if (color && !p.colors.some(c => c.name === color)) return false;
      if (search && !(p.name + " " + p.category).toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    if (sort === "low")  list = [...list].sort((a,b) => a.price - b.price);
    if (sort === "high") list = [...list].sort((a,b) => b.price - a.price);
    if (sort === "new")  list = [...list].sort((a,b) => (b.tag === "new") - (a.tag === "new"));
    return list;
  }, [category, price, color, sort, search]);

  return (
    <>
      <Hero />
      <div className="gallery">
        <Filters
          category={category} setCategory={setCategory}
          price={price} setPrice={setPrice}
          color={color} setColor={setColor}
        />
        <div>
          <div className="gallery-toolbar">
            <div className="gallery-count">
              Showing <b>{filtered.length}</b> of <b>{LUMEN.PRODUCTS.length}</b> styles
            </div>
            <div className="gallery-sort">
              <select className="sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="featured">Featured</option>
                <option value="new">Newest</option>
                <option value="low">Price: low to high</option>
                <option value="high">Price: high to low</option>
              </select>
              <div className="view-toggle">
                <button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")} aria-label="Grid view"><Icon name="grid" size={14}/></button>
                <button className={view === "rows" ? "active" : ""} onClick={() => setView("rows")} aria-label="Row view"><Icon name="rows" size={14}/></button>
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: "80px 0", textAlign: "center", color: "var(--ink-soft)" }}>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: 28, color: "var(--slate-900)", marginBottom: 8 }}>No matches</div>
              <p>Try clearing filters or widening your price range.</p>
            </div>
          ) : (
            <div className="grid">
              {filtered.map(p => (
                <ProductCard key={p.id} product={p} onOpen={onOpen} onQuickAdd={onQuickAdd}/>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

window.Gallery = Gallery;
