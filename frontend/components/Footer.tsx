// Site footer — port of prototype/app.jsx footer block.
export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <div className="brand-blk">Lumen Goods</div>
          <p
            style={{
              margin: 0,
              lineHeight: 1.7,
              fontSize: 14,
              color: 'var(--slate-400)',
              maxWidth: 360,
            }}
          >
            A small atelier of garments and leather goods, designed in Copenhagen and made by
            independent ateliers across Europe and Japan.
          </p>
        </div>
        <div>
          <h5>Shop</h5>
          <ul>
            <li>New arrivals</li>
            <li>Outerwear</li>
            <li>Knitwear</li>
            <li>Footwear</li>
            <li>Bags</li>
          </ul>
        </div>
        <div>
          <h5>Atelier</h5>
          <ul>
            <li>Our makers</li>
            <li>Materials</li>
            <li>Repairs</li>
            <li>Editorial</li>
          </ul>
        </div>
        <div>
          <h5>Support</h5>
          <ul>
            <li>Shipping &amp; returns</li>
            <li>Size guide</li>
            <li>Contact</li>
            <li>FAQ</li>
          </ul>
        </div>
      </div>
      <div className="footer-base">
        <span>© 2026 Lumen Goods · Copenhagen</span>
        <span>Made with care · Built to last</span>
      </div>
    </footer>
  );
}
