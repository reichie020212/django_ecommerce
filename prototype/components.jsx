// Reusable visual primitives — placeholder, ProductCard, ratings
const { useState } = React;

const Placeholder = ({ tone = "stone", label }) => (
  <div className={`ph tone-${tone}`}>
    <div className="ph-stripes"></div>
    {label ? <div className="ph-label">{label}</div> : null}
  </div>
);

const Stars = ({ value = 4.5, size = 12 }) => {
  const full = Math.round(value);
  return (
    <span className="stars" aria-label={`${value} stars`}>
      {[0,1,2,3,4].map(i => (
        <Icon key={i} name={i < full ? "star" : "star-o"} size={size} />
      ))}
    </span>
  );
};

const ProductCard = ({ product, onOpen, onQuickAdd }) => {
  const [adding, setAdding] = useState(false);
  const handleAdd = (e) => {
    e.stopPropagation();
    if (adding) return;
    setAdding(true);
    onQuickAdd && onQuickAdd(product, e.currentTarget);
    setTimeout(() => setAdding(false), 1100);
  };
  return (
    <div className="card" onClick={() => onOpen(product)}>
      <div className="card-image-wrap">
        {product.tag === "new"  && <span className="card-tag tag-new">New</span>}
        {product.tag === "sale" && <span className="card-tag tag-sale">Sale</span>}
        <div className="card-image">
          <Placeholder tone={product.tone} label={`PRODUCT · ${product.id}`} />
        </div>
        <div className="card-image card-image-secondary">
          <Placeholder tone={product.altTone || product.tone} label="ALT VIEW" />
        </div>
        <div className="card-quick">
          <button className={"btn add-btn" + (adding ? " is-adding" : "")} onClick={handleAdd}>
            <span className="btn-text"><Icon name="bag" size={14}/> Quick add</span>
            <span className="btn-checkmark"><Icon name="check" size={14}/> Added</span>
          </button>
          <button className="btn btn-icon-only" onClick={(e) => e.stopPropagation()} aria-label="Save">
            <Icon name="heart" size={15}/>
          </button>
        </div>
      </div>
      <div className="card-body">
        <div className="card-cat">{product.category}</div>
        <div className="card-title">{product.name}</div>
        <div className="card-row">
          <div className="card-price">
            {product.was ? <s>{LUMEN.fmt(product.was)}</s> : null}
            {LUMEN.fmt(product.price)}
          </div>
          <div className="card-swatches">
            {product.colors.slice(0, 3).map((c, i) => (
              <span key={i} className="dot" style={{ background: c.hex }}></span>
            ))}
            {product.colors.length > 3 ? <span className="dot more">+{product.colors.length - 3}</span> : null}
          </div>
        </div>
      </div>
    </div>
  );
};

window.Placeholder = Placeholder;
window.Stars = Stars;
window.ProductCard = ProductCard;
