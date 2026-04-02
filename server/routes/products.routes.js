// server/routes/products.routes.js
const express = require("express");
const router = express.Router();
const Product = require("../../database/models/Product");

// GET /api/products
router.get("/products", async (req, res) => {
  try {
    const { category, limit = 20 } = req.query;

    const query = category ? { category } : {};

    const products = await Product.find(query)
      .limit(Number(limit))
      .sort({ createdAt: -1 })
      .lean();   // Makes it faster

    res.json({
      success: true,
      count: products.length,
      products: products
    });
  } catch (error) {
    console.error("Products route error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: error.message
    });
  }
});

// GET /api/products/:id
router.get("/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: "Product not found" 
      });
    }

    res.json({ 
      success: true, 
      product 
    });
  } catch (error) {
    console.error("Product detail error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch product" 
    });
  }
});

module.exports = router;