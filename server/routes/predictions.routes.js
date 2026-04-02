const express = require("express");
const Product = require("../../database/models/Product");
const User = require("../../database/models/User");
const { requireRole, authenticateJWT } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/predict-sales", authenticateJWT, requireRole("ANALYST", "OWNER"), async (req, res) => {
  try {
    const mlBase = process.env.ML_SERVICE_URL || "http://localhost:8000";
    const { months, topSellersLimit } = req.body || {};

    const mlRes = await fetch(`${mlBase}/predict-sales`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ months, topSellersLimit }),
    });

    if (!mlRes.ok) {
      const text = await mlRes.text().catch(() => "");
      return res.status(502).json({ error: "ML service failed", details: text });
    }

    const payload = await mlRes.json();
    const topPredictedSellers = payload.topPredictedSellers || [];
    const productPredictions = payload.productPredictions || [];

    const sellerIds = [...new Set(topPredictedSellers.map((s) => String(s.sellerId)))];
    const sellers = sellerIds.length
      ? await User.find({ _id: { $in: sellerIds } }).select("name email role").lean()
      : [];
    const sellerById = new Map(sellers.map((s) => [String(s._id), s]));

    const productIds = productPredictions.map((p) => String(p.productId));
    const products = productIds.length
      ? await Product.find({ _id: { $in: productIds } })
          .select("name category inventory sellerId")
          .lean()
      : [];
    const productById = new Map(products.map((p) => [String(p._id), p]));

    const enrichedProductPredictions = productPredictions.map((p) => {
      const pid = String(p.productId);
      const prod = productById.get(pid);
      const inv = prod ? Number(prod.inventory || 0) : Number(p.currentInventory || 0);
      const lowStock = Number(p.predictedSales || 0) > inv;
      return {
        productId: pid,
        productName: prod?.name || null,
        category: prod?.category || null,
        sellerId: prod?.sellerId || null,
        predictedSales: Number(p.predictedSales || 0),
        currentInventory: inv,
        lowStock,
      };
    });

    const enrichedTopSellers = topPredictedSellers.map((s) => {
      const sid = String(s.sellerId);
      const seller = sellerById.get(sid);
      return {
        sellerId: sid,
        sellerName: seller?.name || null,
        role: seller?.role || null,
        predictedSales: Number(s.predictedSales || 0),
      };
    });

    return res.json({
      forecastMonth: payload.forecastMonth,
      trend: payload.trend || { labels: [], historic: [], predictedNext: 0 },
      topPredictedSellers: enrichedTopSellers,
      productPredictions: enrichedProductPredictions,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[predict-sales] failed:", err);
    return res.status(500).json({ error: "Prediction failed" });
  }
});

module.exports = router;

