// server/models/Product.js
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: ["clothing", "accessories", "footwear", "ethnic", "western"] // adjust as per your app
  },
  image: {
    type: String, // URL or public_id
    default: "https://via.placeholder.com/300"
  },
  stock: {
    type: Number,
    required: true,
    default: 50,
    min: 0
  },
  tryOnEligible: {
    type: Boolean,
    default: false
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
productSchema.index({ category: 1 });
productSchema.index({ name: 1 });

const Product = mongoose.model("Product", productSchema);

module.exports = Product;