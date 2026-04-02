const Product = require("../models/Product");
const User = require("../models/User");

const CATEGORIES = ["shirts", "pants", "caps", "shoes", "bracelets"];
const ADJECTIVES = ["Essential", "Premium", "Everyday", "Urban", "Classic", "Modern", "Comfy", "Crisp", "Pro", "Lite"];

const ITEM_BY_CATEGORY = {
  shirts: ["Cotton Shirt", "Denim Shirt", "Oversized Tee", "Formal Shirt", "Hoodie Shirt"],
  pants: ["Chino Pants", "Slim Jeans", "Joggers", "Dress Trousers", "Cargo Pants"],
  caps: ["Baseball Cap", "Beanie Cap", "Snapback Cap", "Bucket Hat", "Trucker Cap"],
  shoes: ["Sneakers", "Loafers", "Running Shoes", "Chelsea Boots", "Sandals"],
  bracelets: ["Charm Bracelet", "Leather Bracelet", "Beaded Bracelet", "Metal Bracelet", "Woven Bracelet"],
};

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

function pickColourVariants() {
  const shuffled = [...COLOUR_VARIANTS].sort(() => Math.random() - 0.5);
  const slice = shuffled.slice(0, 4);

  // Randomly assign each variant a "best for" tone bucket.
  return slice.map((v) => ({
    name: v.name,
    hex: v.hex,
    bestForSkinTone: [SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)]],
  }));
}

async function seedProducts() {
  const seller = await User.findOne({ role: "SELLER", email: "seller@shopsmart.com" });
  if (!seller) throw new Error("Seed seller not found. Run seedUsers first.");

  const totalProducts = 50;
  const docs = [];

  for (let i = 1; i <= totalProducts; i++) {
    const category = CATEGORIES[(i - 1) % CATEGORIES.length];
    const name = `${ADJECTIVES[(i + 2) % ADJECTIVES.length]} ${ITEM_BY_CATEGORY[category][(i + 1) % ITEM_BY_CATEGORY[category].length]}`;

    const images = Array.from({ length: 4 }).map((_, k) => `https://picsum.photos/seed/shopsmart-${i}-${k}/800/800`);
    const video = `https://example.com/shopsmart/videos/${i}.mp4`;

    const glbModel = `https://example.com/shopsmart/models/${i}.glb`;

    // Eligible for "Try On" for apparel-like categories.
    const tryOnEligible = category === "shirts" || category === "pants" || category === "caps" || category === "bracelets" || category === "shoes";

    docs.push({
      name,
      category,
      images,
      video,
      glbModel,
      tryOnEligible,
      colours: pickColourVariants(),
      sellerId: seller._id,
      inventory: Math.floor(5 + Math.random() * 75), // 5..80 units
      price: Math.floor(499 + Math.random() * 1999), // 499..2498
    });
  }

  // Upsert by name (fine for demo).
  for (const doc of docs) {
    // eslint-disable-next-line no-await-in-loop
    await Product.updateOne({ name: doc.name }, { $set: doc }, { upsert: true });
  }
}

module.exports = { seedProducts };

