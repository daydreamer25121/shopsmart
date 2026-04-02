const Review = require("../models/Review");
const Product = require("../models/Product");
const User = require("../models/User");

const GENERIC_FAKE = [
  "Amazing quality, totally satisfied!",
  "Best product ever. Would definitely buy again.",
  "Good one.",
  "Loved it!",
  "Five stars for sure.",
  "Perfect.",
  "Great purchase.",
  "Superb!",
];

const DETAILED_GENUINE = [
  "Fit was true to size and the fabric feels premium. Color matches the photos really well.",
  "The stitching is neat and it looks great for casual outings. Comfortable all day.",
  "Arrived quickly and the material feels durable. The finish looks premium in person.",
  "Wore it for an event and got compliments. Very comfortable and breathable.",
  "Good value for the price. Loved the texture and the overall look.",
  "The sizing was spot-on and the product exceeded my expectations.",
  "Stylish and comfortable. The quality feels better than expected.",
  "Nice build quality and the colour is exactly what I wanted.",
  "Great product overall with no issues. Would recommend to friends.",
  "Excellent purchase. Works well and holds up after multiple wears.",
];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seedReviews() {
  const customers = await User.find({ role: "USER" }, { _id: 1 });
  const products = await Product.find({}, { _id: 1, sellerId: 1, category: 1 });

  if (!customers.length || !products.length) throw new Error("Run seedUsers and seedProducts first.");

  const total = 20;
  const productIds = products.map((p) => p._id);
  const customerIds = customers.map((c) => c._id);

  const reviews = [];
  for (let i = 0; i < total; i++) {
    const customerId = customerIds[Math.floor(Math.random() * customerIds.length)];
    const product = products[Math.floor(Math.random() * products.length)];
    const rating = Math.floor(Math.random() * 5) + 1;

    const isFake = i < Math.floor(total * 0.4); // ~40% fake
    const text = isFake ? randomFrom(GENERIC_FAKE) : randomFrom(DETAILED_GENUINE);

    const aiConfidence = isFake ? 0.78 + Math.random() * 0.18 : 0.05 + Math.random() * 0.25;
    const aiReasons = isFake
      ? ["Generic phrasing", "Low detail", "Often reported as spammy copy"]
      : [];

    reviews.push({
      userId: customerId,
      productId: product._id,
      sellerId: product.sellerId,
      text,
      rating,
      isFlagged: isFake,
      isVerified: !isFake,
      aiConfidence: Number(aiConfidence.toFixed(2)),
      aiReasons,
    });
  }

  // Upsert by (userId, productId) pair for demo stability.
  for (const r of reviews) {
    await Review.updateOne(
      { userId: r.userId, productId: r.productId },
      { $set: r },
      { upsert: true }
    );
  }
}

module.exports = { seedReviews };

