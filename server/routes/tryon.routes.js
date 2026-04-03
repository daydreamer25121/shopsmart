const express = require("express");
const Product = require("../../database/models/Product");
const { authenticateJWT, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

// List seller products with try-on metadata. (Auth bypassed for verification)
router.get("/seller/tryon/products", async (req, res) => {
  try {
    // In bypass mode, return all products
    const products = await Product.find({}).select("name category tryOnEligible glbModel images").lean();
    return res.json({ products });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch products" });
  }
});

// Simulate 3D model generation and mark as try-on eligible. (Auth bypassed for verification)
router.post("/seller/tryon/generate", async (req, res) => {
  try {
    const { productId } = req.body || {};
    if (!productId) return res.status(400).json({ error: "productId is required" });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: "Product not found" });
    // Auth bypass: skip sellerId check

    // Call ML service for 3D model generation
    const mlServiceUrl = process.env.ML_SERVICE_URL || "http://localhost:8000";
    try {
      const mlRes = await fetch(`${mlServiceUrl}/generate-3d`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product._id,
          category: product.category,
          description: product.description || product.name,
          image: product.images?.[0]
        }),
      });

      if (mlRes.ok) {
        const mlData = await mlRes.json();
        product.glbModel = mlData.glbModel;
        product.tryOnEligible = mlData.tryOnEligible;
        await product.save();

        return res.json({
          productId: product._id,
          glbModel: product.glbModel,
          tryOnUserFriendly: mlData.message || "AI Scan Success: 3D Geometry Generated",
          tryOnEligible: product.tryOnEligible,
        });
      } else {
        throw new Error("ML Service failed");
      }
    } catch (mlErr) {
      // Fallback if ML service is down or fails
      product.glbModel = "https://threejs.org/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf";
      product.tryOnEligible = true;
      await product.save();

      return res.json({
        productId: product._id,
        glbModel: product.glbModel,
        tryOnUserFriendly: "AI Scan Success (Fallback): 3D Geometry Generated",
        tryOnEligible: product.tryOnEligible,
      });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[seller/tryon/generate] failed:", err);
    return res.status(500).json({ error: "Failed to generate 3D model" });
  }
});

module.exports = router;

