// server/scripts/seedProducts.js
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const Product = require("../models/Product");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function seedProducts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/shopsmart");

    // Clear existing products
    await Product.deleteMany({});

    const sampleProducts = [
      {
        name: "Classic White Sneakers",
        description: "Comfortable everyday sneakers with premium cushioning",
        price: 2499,
        category: "footwear",
        image: "https://via.placeholder.com/300x300/ffffff/000000?text=White+Sneakers",
        stock: 45,
        tryOnEligible: true
      },
      {
        name: "Denim Jacket",
        description: "Premium quality denim jacket with modern fit",
        price: 3299,
        category: "clothing",
        image: "https://via.placeholder.com/300x300/1a3c5e/ffffff?text=Denim+Jacket",
        stock: 30,
        tryOnEligible: true
      },
      {
        name: "Ethnic Kurta Set",
        description: "Traditional kurta with matching pants",
        price: 1899,
        category: "ethnic",
        image: "https://via.placeholder.com/300x300/ff9933/000000?text=Kurta+Set",
        stock: 25,
        tryOnEligible: false
      }
    ];

    await Product.insertMany(sampleProducts);
    console.log("✅ Sample products seeded successfully!");

  } catch (error) {
    console.error("Seed error:", error);
  } finally {
    mongoose.connection.close();
  }
}

seedProducts();