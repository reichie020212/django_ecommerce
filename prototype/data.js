// Lumen Goods — product data + helpers
// Originally-named SKUs. No real-brand recreation.

const PRODUCTS = [
  {
    id: "lg-001",
    name: "Meridian Wool Overcoat",
    category: "Outerwear",
    price: 480,
    was: 580,
    tag: "sale",
    rating: 4.8,
    reviews: 214,
    tone: "stone",
    altTone: "noir",
    colors: [
      { name: "Stone", hex: "#d8d2c5", tone: "stone" },
      { name: "Noir",  hex: "#1f2535", tone: "noir" },
      { name: "Clay",  hex: "#c8aa92", tone: "clay" }
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    soldOut: ["XS"],
    desc: "A long-line overcoat tailored from a 22oz Italian wool–cashmere blend, with hand-finished horn buttons and a half-canvas construction.",
    details: [
      "82% Virgin wool, 18% cashmere",
      "Half-canvas construction",
      "Bemberg cupro lining",
      "Made in Biella, Italy"
    ]
  },
  {
    id: "lg-002",
    name: "Field Selvedge Trouser",
    category: "Trousers",
    price: 220,
    tag: "new",
    rating: 4.9,
    reviews: 89,
    tone: "sand",
    altTone: "moss",
    colors: [
      { name: "Sand",  hex: "#ece7d9", tone: "sand" },
      { name: "Moss",  hex: "#b6b9a3", tone: "moss" },
      { name: "Noir",  hex: "#1f2535", tone: "noir" }
    ],
    sizes: ["28", "30", "32", "34", "36"],
    soldOut: [],
    desc: "Five-pocket workwear cut from 13.5oz Japanese selvedge denim, washed once for an immediate, lived-in hand.",
    details: ["13.5oz selvedge cotton", "Sanforized, one-wash", "YKK zip", "Made in Okayama, Japan"]
  },
  {
    id: "lg-003",
    name: "Pebble Knit Crewneck",
    category: "Knitwear",
    price: 165,
    rating: 4.7,
    reviews: 322,
    tone: "bone",
    altTone: "rose",
    colors: [
      { name: "Bone",  hex: "#efece4", tone: "bone" },
      { name: "Rose",  hex: "#e6c8c1", tone: "rose" },
      { name: "Indigo",hex: "#c7c8e4", tone: "indigo" }
    ],
    sizes: ["XS", "S", "M", "L"],
    soldOut: ["XS", "L"],
    desc: "Mid-gauge merino crewneck with a subtle pebble texture and a relaxed body."
  },
  {
    id: "lg-004",
    name: "Atlas Leather Holdall",
    category: "Bags",
    price: 640,
    tag: "new",
    rating: 4.9,
    reviews: 47,
    tone: "clay",
    altTone: "graphite",
    colors: [
      { name: "Clay",     hex: "#c8aa92", tone: "clay" },
      { name: "Graphite", hex: "#5b6271", tone: "graphite" }
    ],
    sizes: ["One Size"],
    soldOut: [],
    desc: "Vegetable-tanned full-grain leather, hand-stitched in Tuscany. Designed for a long weekend."
  },
  {
    id: "lg-005",
    name: "Dune Heavyweight Tee",
    category: "T-Shirts",
    price: 78,
    rating: 4.6,
    reviews: 581,
    tone: "cream",
    altTone: "olive",
    colors: [
      { name: "Cream", hex: "#f3eddc", tone: "cream" },
      { name: "Olive", hex: "#9da079", tone: "olive" },
      { name: "Noir",  hex: "#1f2535", tone: "noir" }
    ],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    soldOut: [],
    desc: "240gsm long-staple cotton, garment-dyed for a soft hand and an even fade."
  },
  {
    id: "lg-006",
    name: "Cumulus Down Jacket",
    category: "Outerwear",
    price: 395,
    was: 475,
    tag: "sale",
    rating: 4.8,
    reviews: 156,
    tone: "noir",
    altTone: "fog",
    colors: [
      { name: "Noir", hex: "#1f2535", tone: "noir" },
      { name: "Fog",  hex: "#d6dbe0", tone: "fog" }
    ],
    sizes: ["S", "M", "L", "XL"],
    soldOut: ["S"],
    desc: "850-fill responsibly-sourced down with a 20D matte ripstop shell."
  },
  {
    id: "lg-007",
    name: "Quarry Cotton Crew",
    category: "T-Shirts",
    price: 88,
    rating: 4.7,
    reviews: 209,
    tone: "fog",
    altTone: "graphite",
    colors: [
      { name: "Fog",      hex: "#d6dbe0", tone: "fog" },
      { name: "Graphite", hex: "#5b6271", tone: "graphite" }
    ],
    sizes: ["S", "M", "L", "XL"],
    soldOut: [],
    desc: "Ultra-fine sea-island cotton, mid-weight, built to layer."
  },
  {
    id: "lg-008",
    name: "Harbor Suede Loafer",
    category: "Footwear",
    price: 295,
    rating: 4.5,
    reviews: 132,
    tone: "clay",
    altTone: "olive",
    colors: [
      { name: "Clay",  hex: "#c8aa92", tone: "clay" },
      { name: "Olive", hex: "#9da079", tone: "olive" },
      { name: "Noir",  hex: "#1f2535", tone: "noir" }
    ],
    sizes: ["8", "9", "10", "11", "12"],
    soldOut: [],
    desc: "Hand-lasted Italian suede loafer with a Blake-stitched leather sole."
  },
  {
    id: "lg-009",
    name: "Linen Camp Shirt",
    category: "Shirts",
    price: 145,
    tag: "new",
    rating: 4.6,
    reviews: 64,
    tone: "rose",
    altTone: "cream",
    colors: [
      { name: "Rose",  hex: "#e6c8c1", tone: "rose" },
      { name: "Cream", hex: "#f3eddc", tone: "cream" },
      { name: "Indigo",hex: "#c7c8e4", tone: "indigo" }
    ],
    sizes: ["S", "M", "L", "XL"],
    soldOut: [],
    desc: "Garment-washed Belgian linen with a relaxed camp collar."
  }
];

const CATEGORIES = [
  { id: "all", name: "All", count: PRODUCTS.length },
  { id: "Outerwear", name: "Outerwear" },
  { id: "Knitwear", name: "Knitwear" },
  { id: "Shirts", name: "Shirts" },
  { id: "T-Shirts", name: "T-Shirts" },
  { id: "Trousers", name: "Trousers" },
  { id: "Footwear", name: "Footwear" },
  { id: "Bags", name: "Bags" }
].map(c => ({
  ...c,
  count: c.id === "all" ? PRODUCTS.length : PRODUCTS.filter(p => p.category === c.id).length
}));

const COLOR_SWATCHES = [
  { name: "Stone",    hex: "#d8d2c5" },
  { name: "Noir",     hex: "#1f2535" },
  { name: "Sand",     hex: "#ece7d9" },
  { name: "Clay",     hex: "#c8aa92" },
  { name: "Bone",     hex: "#efece4" },
  { name: "Rose",     hex: "#e6c8c1" },
  { name: "Indigo",   hex: "#c7c8e4" },
  { name: "Olive",    hex: "#9da079" },
  { name: "Fog",      hex: "#d6dbe0" }
];

const fmt = (n) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

window.LUMEN = { PRODUCTS, CATEGORIES, COLOR_SWATCHES, fmt };
