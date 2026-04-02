const express = require("express");
const Combo = require("../../database/models/Combo");
const { authenticateJWT, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/combos", async (req, res) => {
  try {
    const activeCombos = await Combo.find({ active: true }).lean();
    return res.json({ combos: activeCombos });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch combos" });
  }
});

router.post("/combos/suggest", authenticateJWT, requireRole("ANALYST", "OWNER"), async (req, res) => {
  try {
    const mlBase = process.env.ML_SERVICE_URL || "http://localhost:8000";
    const { minSupport, minLift, limit } = req.body || {};

    const mlRes = await fetch(`${mlBase}/apriori`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ minSupport, minLift, limit }),
    });

    if (!mlRes.ok) {
      const text = await mlRes.text().catch(() => "");
      return res.status(502).json({ error: "ML service failed", details: text });
    }

    const payload = await mlRes.json();
    return res.json(payload);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[combos/suggest] failed:", err);
    return res.status(500).json({ error: "Suggestion failed" });
  }
});

router.post("/combos/approve", authenticateJWT, requireRole("ANALYST", "OWNER"), async (req, res) => {
  try {
    const { productIds, discount } = req.body || {};
    if (!Array.isArray(productIds) || !productIds.length) {
      return res.status(400).json({ error: "productIds array required" });
    }

    const payload = {
      productIds,
      discount: Number(discount) || 10,
      approvedBy: req.user.id,
      active: true,
    };

    const combo = await Combo.findOneAndUpdate(
      { productIds: { $all: productIds, $size: productIds.length } },
      { $set: payload },
      { upsert: true, new: true }
    );

    return res.json({ combo });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[combos/approve] failed:", err);
    return res.status(500).json({ error: "Approve failed" });
  }
});

module.exports = router;

