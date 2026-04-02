const Product = require("../models/Product");
const User = require("../models/User");

const SKIN_TONES = ["Fair", "Wheatish", "Medium Brown", "Dark Brown"];

const COLOUR_VARIANTS = [
  { name: "Ivory", hex: "#F5F0E6" },
  { name: "Beige", hex: "#E8D7B5" },
  { name: "Olive", hex: "#6B7A3A" },
  { name: "Navy", hex: "#1D2B53" },
  { name: "Maroon", hex: "#6B1A2A" },
  { name: "Cobalt", hex: "#155EEF" },
  { name: "Copper", hex: "#B87333" },
  { name: "Black", hex: "#111111" },
];

/** Stable Unsplash URLs (fashion / accessories). w=800 keeps shop cards crisp. */
const IMG = {
  shirts: [
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&h=800&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1596755094514-f87e34085b87?w=800&h=800&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&h=800&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1562157873-818bc0726e68?w=800&h=800&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&h=800&fit=crop&auto=format",
  ],
  pants: [
    "https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&h=800&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&h=800&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=800&h=800&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1624378515195-6dbdb0ddd2f1?w=800&h=800&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&h=800&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1582418702059-97ebafb35d09?w=800&h=800&fit=crop&auto=format",
  ],
  caps: [
    "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&h=800&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1534215755324-71b3feaa628e?w=800&h=800&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1575428652377-a2d80e2277fc?w=800&h=800&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1521369909029-2afed882baee?w=800&h=800&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1556306535-38febf6782e9?w=800&h=800&fit=crop&auto=format",
  ],
  shoes: [
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&h=800&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&h=800&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=800&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800&h=800&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&h=800&fit=crop&auto=format",
  ],
  bracelets: [
    "https://images.unsplash.com/photo-1611593433688-c12c8c0d0a0c?w=800&h=800&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&h=800&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&h=800&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1611955167811-4711904bb76f?w=800&h=800&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&h=800&fit=crop&auto=format",
  ],
};

/**
 * Curated catalogue: readable names, realistic INR bands, 4 images per item.
 * glbModel left null so try-on uses app fallback until you host real GLBs.
 */
const CATALOGUE = [
  // Shirts (10)
  { name: "Meridian Oxford Cotton Shirt", category: "shirts", price: 1499, inventory: 48 },
  { name: "Indigo Slim Denim Shirt", category: "shirts", price: 1799, inventory: 36 },
  { name: "Linen Summer Short Sleeve", category: "shirts", price: 1299, inventory: 52 },
  { name: "Classic White Formal Shirt", category: "shirts", price: 1999, inventory: 44 },
  { name: "Striped Casual Button-Down", category: "shirts", price: 1399, inventory: 40 },
  { name: "Forest Green Polo Tee", category: "shirts", price: 999, inventory: 60 },
  { name: "Heather Grey Crew Neck Tee", category: "shirts", price: 799, inventory: 72 },
  { name: "Navy Check Flannel Shirt", category: "shirts", price: 1699, inventory: 33 },
  { name: "Black Minimal Oversized Tee", category: "shirts", price: 1199, inventory: 55 },
  { name: "Sand Khaki Chambray Shirt", category: "shirts", price: 1599, inventory: 28 },
  // Pants (10)
  { name: "Slate Tapered Chinos", category: "pants", price: 2199, inventory: 41 },
  { name: "Midnight Slim Fit Jeans", category: "pants", price: 2499, inventory: 38 },
  { name: "Olive Cargo Joggers", category: "pants", price: 1899, inventory: 45 },
  { name: "Charcoal Dress Trousers", category: "pants", price: 2799, inventory: 22 },
  { name: "Light Wash Straight Jeans", category: "pants", price: 2299, inventory: 50 },
  { name: "Black Stretch Travel Pants", category: "pants", price: 1999, inventory: 34 },
  { name: "Beige Linen Blend Trousers", category: "pants", price: 2399, inventory: 19 },
  { name: "Navy Pleated Wide Leg Pants", category: "pants", price: 2599, inventory: 26 },
  { name: "Stone Relaxed Fit Chinos", category: "pants", price: 2099, inventory: 47 },
  { name: "Burgundy Corduroy Pants", category: "pants", price: 2699, inventory: 18 },
  // Caps (10)
  { name: "Jet Black Baseball Cap", category: "caps", price: 699, inventory: 80 },
  { name: "Navy Twill Dad Cap", category: "caps", price: 749, inventory: 65 },
  { name: "Olive Field Cap", category: "caps", price: 799, inventory: 55 },
  { name: "Cream Corduroy Cap", category: "caps", price: 849, inventory: 42 },
  { name: "Charcoal Snapback", category: "caps", price: 899, inventory: 58 },
  { name: "Rust Trucker Cap", category: "caps", price: 729, inventory: 48 },
  { name: "Forest Embroidered Cap", category: "caps", price: 949, inventory: 36 },
  { name: "Stone Minimal Cap", category: "caps", price: 679, inventory: 62 },
  { name: "Burgundy Wool Beanie", category: "caps", price: 599, inventory: 90 },
  { name: "Grey Marl Beanie", category: "caps", price: 549, inventory: 95 },
  // Shoes (10)
  { name: "Cloudfoam Running Sneakers", category: "shoes", price: 3999, inventory: 30 },
  { name: "Leather Tan Loafers", category: "shoes", price: 4499, inventory: 24 },
  { name: "White Court Sneakers", category: "shoes", price: 3499, inventory: 44 },
  { name: "Black Chelsea Boots", category: "shoes", price: 5999, inventory: 16 },
  { name: "Trail Grip Hiking Shoes", category: "shoes", price: 5299, inventory: 21 },
  { name: "Navy Slip-On Sneakers", category: "shoes", price: 3199, inventory: 39 },
  { name: "Brown Brogue Derby Shoes", category: "shoes", price: 4999, inventory: 18 },
  { name: "Retro High-Top Sneakers", category: "shoes", price: 4299, inventory: 27 },
  { name: "Minimal Leather Sandals", category: "shoes", price: 2799, inventory: 33 },
  { name: "Carbon Training Runners", category: "shoes", price: 4599, inventory: 29 },
  // Bracelets (10)
  { name: "Aurora Silver Chain Bracelet", category: "bracelets", price: 1299, inventory: 70 },
  { name: "Heritage Leather Cuff", category: "bracelets", price: 999, inventory: 55 },
  { name: "Minimal Gold Bead Bracelet", category: "bracelets", price: 1599, inventory: 48 },
  { name: "Matte Onyx Stretch Bracelet", category: "bracelets", price: 899, inventory: 63 },
  { name: "Braided Rope Anchor Bracelet", category: "bracelets", price: 749, inventory: 58 },
  { name: "Rose Gold Bar Bracelet", category: "bracelets", price: 1899, inventory: 32 },
  { name: "Turquoise Beaded Stack", category: "bracelets", price: 1199, inventory: 44 },
  { name: "Carbon Steel Link Bracelet", category: "bracelets", price: 2199, inventory: 25 },
  { name: "Woven Leather Double Wrap", category: "bracelets", price: 1099, inventory: 51 },
  { name: "Pearl Accent Charm Bracelet", category: "bracelets", price: 1399, inventory: 37 },
];

function pickColourVariants() {
  const shuffled = [...COLOUR_VARIANTS].sort(() => Math.random() - 0.5);
  const slice = shuffled.slice(0, 4);
  return slice.map((v) => ({
    name: v.name,
    hex: v.hex,
    bestForSkinTone: [SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)]],
  }));
}

function imagesForCategory(category, seed) {
  const pool = IMG[category] || IMG.shirts;
  const out = [];
  for (let k = 0; k < 4; k++) {
    out.push(pool[(seed + k) % pool.length]);
  }
  return out;
}

async function seedProducts() {
  const seller = await User.findOne({ role: "SELLER", email: "seller@shopsmart.com" });
  if (!seller) throw new Error("Seed seller not found. Run seedUsers first.");

  let i = 0;
  for (const item of CATALOGUE) {
    const name = item.name;
    const category = item.category;
    const images = imagesForCategory(category, i);
    const tryOnEligible =
      category === "shirts" ||
      category === "pants" ||
      category === "caps" ||
      category === "bracelets" ||
      category === "shoes";

    const doc = {
      name,
      category,
      images,
      video: null,
      glbModel: null,
      tryOnEligible,
      colours: pickColourVariants(),
      sellerId: seller._id,
      inventory: item.inventory,
      price: item.price,
    };

    // eslint-disable-next-line no-await-in-loop
    await Product.updateOne({ name: doc.name }, { $set: doc }, { upsert: true });
    i += 1;
  }
}

module.exports = { seedProducts };
