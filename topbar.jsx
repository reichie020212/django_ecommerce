// Topbar — sticky navigation
const { useState: useStateTB } = React;

const Topbar = ({ route, cartCount, onNav, onOpenCart, onSearch, search }) => {
  return (
    <div className="topbar-wrap">
      <div className="topbar-promo">
        Complimentary express shipping on orders over <b>$200</b> · Free returns within 30 days
      </div>
      <div className="topbar">
        <div className="topbar-left">
          <nav className="nav">
            <button className={route === "shop" ? "active" : ""} onClick={() => onNav("shop")}>Shop</button>
            <button>New Arrivals</button>
            <button>Editorial</button>
            <button>Stockists</button>
          </nav>
        </div>
        <div className="brand" onClick={() => onNav("shop")}>
          <span className="brand-mark"></span>
          Lumen Goods
        </div>
        <div className="topbar-right">
          <div className="search-input">
            <Icon name="search" size={15}/>
            <input
              placeholder="Search the archive"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
          <button className="icon-btn" aria-label="Account"><Icon name="user" size={18}/></button>
          <button className="icon-btn" aria-label="Saved"><Icon name="heart" size={18}/></button>
          <button id="cart-btn" className="icon-btn" aria-label="Cart" onClick={onOpenCart}>
            <Icon name="bag" size={18}/>
            {cartCount > 0 ? <span className="badge">{cartCount}</span> : null}
          </button>
        </div>
      </div>
    </div>
  );
};

window.Topbar = Topbar;
