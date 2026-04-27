// Lumen Goods — main app
const { useState: useStateApp, useEffect: useEffectApp, useRef: useRefApp } = React;

function App() {
  const [route, setRoute] = useStateApp("shop"); // shop | pdp | checkout
  const [activeProduct, setActiveProduct] = useStateApp(null);
  const [cart, setCart] = useStateApp([]);
  const [drawerOpen, setDrawerOpen] = useStateApp(false);
  const [search, setSearch] = useStateApp("");
  const [flyDot, setFlyDot] = useStateApp(null);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const addToCart = (item, sourceEl) => {
    setCart(prev => {
      const key = (i) => `${i.id}-${i.selectedColor?.name}-${i.selectedSize}`;
      const k = key(item);
      const exists = prev.find(p => key(p) === k);
      if (exists) {
        return prev.map(p => key(p) === k ? { ...p, qty: p.qty + (item.qty || 1) } : p);
      }
      return [...prev, { ...item, qty: item.qty || 1 }];
    });

    // Fly-to-cart animation
    if (sourceEl) {
      const cartBtn = document.getElementById("cart-btn");
      if (cartBtn) {
        const src = sourceEl.getBoundingClientRect();
        const dst = cartBtn.getBoundingClientRect();
        const startX = src.left + src.width / 2 - 9;
        const startY = src.top + src.height / 2 - 9;
        const endX = dst.left + dst.width / 2 - 9;
        const endY = dst.top + dst.height / 2 - 9;
        setFlyDot({ id: Date.now(), startX, startY, endX, endY });
        setTimeout(() => {
          cartBtn.classList.add("cart-bump");
          setTimeout(() => cartBtn.classList.remove("cart-bump"), 600);
        }, 700);
        setTimeout(() => setFlyDot(null), 1100);
      }
    }
  };

  const openProduct = (p) => {
    setActiveProduct(p);
    setRoute("pdp");
  };

  const goCheckout = () => {
    setDrawerOpen(false);
    setRoute("checkout");
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  return (
    <div className="app">
      {route !== "checkout" && (
        <Topbar
          route={route}
          cartCount={cartCount}
          onNav={(r) => { setRoute(r); window.scrollTo({top:0, behavior: "instant"}); }}
          onOpenCart={() => setDrawerOpen(true)}
          onSearch={setSearch}
          search={search}
        />
      )}

      {route === "shop" && (
        <Gallery search={search} onOpen={openProduct} onQuickAdd={(p, btn) =>
          addToCart({ ...p, selectedColor: p.colors[0], selectedSize: p.sizes.find(s => !p.soldOut.includes(s)) || p.sizes[0], qty: 1 }, btn)
        }/>
      )}
      {route === "pdp" && activeProduct && (
        <PDP
          product={activeProduct}
          onBack={() => setRoute("shop")}
          onAddToCart={addToCart}
          onOpen={openProduct}
        />
      )}
      {route === "checkout" && (
        <Checkout
          items={cart}
          onBack={() => { setRoute("shop"); setDrawerOpen(true); }}
          onComplete={() => { setCart([]); setRoute("shop"); }}
        />
      )}

      <CartDrawer
        open={drawerOpen}
        items={cart}
        onClose={() => setDrawerOpen(false)}
        onChangeQty={(idx, q) => setCart(prev => prev.map((it, i) => i === idx ? { ...it, qty: q } : it))}
        onRemove={(idx) => setCart(prev => prev.filter((_, i) => i !== idx))}
        onCheckout={goCheckout}
      />

      {flyDot && (
        <FlyDot key={flyDot.id} {...flyDot} />
      )}

      {route !== "checkout" && (
        <footer className="footer">
          <div className="footer-inner">
            <div>
              <div className="brand-blk">Lumen Goods</div>
              <p style={{ margin: 0, lineHeight: 1.7, fontSize: 14, color: "var(--slate-400)", maxWidth: 360 }}>
                A small atelier of garments and leather goods, designed in Copenhagen and made by independent ateliers across Europe and Japan.
              </p>
            </div>
            <div>
              <h5>Shop</h5>
              <ul><li>New arrivals</li><li>Outerwear</li><li>Knitwear</li><li>Footwear</li><li>Bags</li></ul>
            </div>
            <div>
              <h5>Atelier</h5>
              <ul><li>Our makers</li><li>Materials</li><li>Repairs</li><li>Editorial</li></ul>
            </div>
            <div>
              <h5>Support</h5>
              <ul><li>Shipping & returns</li><li>Size guide</li><li>Contact</li><li>FAQ</li></ul>
            </div>
          </div>
          <div className="footer-base">
            <span>© 2026 Lumen Goods · Copenhagen</span>
            <span>Made with care · Built to last</span>
          </div>
        </footer>
      )}
    </div>
  );
}

// Fly-to-cart animation dot
function FlyDot({ startX, startY, endX, endY }) {
  const ref = useRefApp(null);
  useEffectApp(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = `translate(${startX}px, ${startY}px) scale(1)`;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transform = `translate(${endX}px, ${endY}px) scale(0.4)`;
        el.style.opacity = "0";
      });
    });
  }, []);
  return (
    <div
      ref={ref}
      className="fly-dot"
      style={{ top: 0, left: 0, transform: `translate(${startX}px, ${startY}px)` }}
    />
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
