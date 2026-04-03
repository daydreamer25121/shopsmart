const mongoose = require("mongoose");
const Product = require("../database/models/Product");

const MONGODB_LOCAL_URI = "mongodb://localhost:27017/shopsmart";

async function seed() {
  try {
    await mongoose.connect(MONGODB_LOCAL_URI);
    console.log("Connected to MongoDB");

    const dummySellerId = new mongoose.Types.ObjectId();

    const products = [
      {
        name: "Classic Linen Shirt",
        category: "shirts",
        price: 1299,
        sellerId: dummySellerId,
        tryOnEligible: false,
        images: ["https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&q=80&w=400"],
      },
      {
        name: "Urban Sneakers",
        category: "shoes",
        price: 2499,
        sellerId: dummySellerId,
        tryOnEligible: false,
        images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=400"],
      }
    ];

    await Product.deleteMany({});
    await Product.insertMany(products);
    console.log("Seeded 2 test products successfully");

    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  }
}

seed();
