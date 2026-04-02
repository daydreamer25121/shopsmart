const express = require("express");
const Product = require("../../database/models/Product");
const Outfit = require("../../database/models/Outfit");
const { authenticateJWT, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/outfits/suggest", async (req, res) => {
  try {
    const { occasion, notes } = req.body || {};
    if (!occasion) return res.status(400).json({ error: "occasion is required" });

    const mlBase = process.env.ML_SERVICE_URL || "http://localhost:8000";
    const mlRes = await fetch(`${mlBase}/outfit-suggest`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ occasion, notes }),
    });

    if (!mlRes.ok) {
      const text = await mlRes.text().catch(() => "");
      return res.status(502).json({ error: "ML service failed", details: text });
    }

    const mlPayload = await mlRes.json();
    const categories = Array.isArray(mlPayload.categories) ? mlPayload.categories : [];

    // Map suggested categories to actual products (simple: pick 1 random per category).
    const picks = [];
    for (const category of categories) {
      // eslint-disable-next-line no-await-in-loop
      const product = await Product.findOne({ category }).select("name category images tryOnEligible glbModel").lean();
      if (product) picks.push(product);
    }

    return res.json({
      occasion: mlPayload.occasion || occasion,
      message: mlPayload.message || "",
      categories,
      products: picks,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[outfits/suggest] failed:", err);
    return res.status(500).json({ error: "Outfit suggestion failed" });
  }
});

router.post("/outfits/save", authenticateJWT, requireRole("USER", "OWNER"), async (req, res) => {
  try {
    const { occasion, productIds } = req.body || {};
    if (!occasion) return res.status(400).json({ error: "occasion is required" });
    if (!Array.isArray(productIds) || !productIds.length) return res.status(400).json({ error: "productIds required" });

    const outfit = await Outfit.create({
      userId: req.user.id,
      occasion,
      productIds,
    });

    return res.json({ outfit });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[outfits/save] failed:", err);
    return res.status(500).json({ error: "Failed to save outfit" });
  }
});

router.get("/outfits/mine", authenticateJWT, requireRole("USER", "OWNER"), async (req, res) => {
  try {
    const outfits = await Outfit.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean();
    return res.json({ outfits });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch outfits" });
  }
});

module.exports = router;

