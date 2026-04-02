const express = require("express");
const Product = require("../../database/models/Product");
const { authenticateJWT, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

// List seller products with try-on metadata.
router.get("/seller/tryon/products", authenticateJWT, requireRole("SELLER", "OWNER"), async (req, res) => {
  try {
    const filter = req.user.role === "SELLER" ? { sellerId: req.user.id } : {};
    const products = await Product.find(filter).select("name category tryOnEligible glbModel images").lean();
    return res.json({ products });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch products" });
  }
});

// Simulate 3D model generation and mark as try-on eligible.
router.post("/seller/tryon/generate", authenticateJWT, requireRole("SELLER", "OWNER"), async (req, res) => {
  try {
    const { productId } = req.body || {};
    if (!productId) return res.status(400).json({ error: "productId is required" });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: "Product not found" });
    if (req.user.role === "SELLER" && String(product.sellerId) !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Demo GLB reference: pretend we've run photogrammetry + texturing.
    product.glbModel = product.glbModel || `https://example.com/shopsmart/models/${product._id}.glb`;
    product.tryOnEligible = true;
    await product.save();

    return res.json({
      productId: product._id,
      glbModel: product.glbModel,
      tryOnEligible: product.tryOnEligible,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[seller/tryon/generate] failed:", err);
    return res.status(500).json({ error: "Failed to generate 3D model" });
  }
});

module.exports = router;

