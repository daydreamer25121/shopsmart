const express = require("express");
const Product = require("../../database/models/Product");
const Review = require("../../database/models/Review");
const Ticket = require("../../database/models/Ticket");
const { authenticateJWT, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/reviews/submit", authenticateJWT, requireRole("USER", "OWNER"), async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, text, rating } = req.body || {};

    if (!productId || !text) return res.status(400).json({ error: "productId and text are required" });
    const ratingNum = Number(rating);
    if (!Number.isFinite(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: "rating must be between 1 and 5" });
    }

    const product = await Product.findById(productId).select("sellerId name").lean();
    if (!product) return res.status(404).json({ error: "Product not found" });

    const mlBase = process.env.ML_SERVICE_URL || "http://localhost:8000";
    const mlRes = await fetch(`${mlBase}/detect-fake-review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, productId, text: String(text), rating: ratingNum }),
    });

    if (!mlRes.ok) {
      const details = await mlRes.text().catch(() => "");
      return res.status(502).json({ error: "ML service failed", details });
    }

    const mlPayload = await mlRes.json();
    const isFlagged = Boolean(mlPayload.isFlagged);
    const aiConfidence = typeof mlPayload.confidence === "number" ? mlPayload.confidence : null;
    const aiReasons = Array.isArray(mlPayload.reasons) ? mlPayload.reasons : [];

    const review = await Review.create({
      userId,
      productId,
      text: String(text),
      rating: ratingNum,
      isFlagged,
      isVerified: !isFlagged,
      sellerId: product.sellerId,
      aiConfidence,
      aiReasons,
    });

    // If flagged, create a human moderation ticket for Customer Care.
    if (isFlagged) {
      await Ticket.create({
        userId,
        issue: `Fake review flagged for product ${product.name} (${productId}). AI confidence: ${aiConfidence}. Text: ${String(
          text
        ).slice(0, 220)}`,
        status: "open",
        assignedTo: null,
      }).catch(() => null);
    }

    return res.json({ review });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[reviews/submit] failed:", err);
    return res.status(500).json({ error: "Failed to submit review" });
  }
});

router.get("/care/flagged-reviews", authenticateJWT, requireRole("CARE", "OWNER"), async (req, res) => {
  try {
    const flagged = await Review.find({ isFlagged: true })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("userId", "name email")
      .populate("productId", "name category")
      .lean();

    return res.json({ reviews: flagged });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[care/flagged-reviews] failed:", err);
    return res.status(500).json({ error: "Failed to fetch flagged reviews" });
  }
});

router.post("/care/review-moderate", authenticateJWT, requireRole("CARE", "OWNER"), async (req, res) => {
  try {
    const { reviewId, action } = req.body || {};
    if (!reviewId || !action) return res.status(400).json({ error: "reviewId and action are required" });

    const review = await Review.findById(reviewId);
    if (!review) return res.status(404).json({ error: "Review not found" });

    if (action === "approve") {
      review.isFlagged = false;
      review.isVerified = true;
    } else if (action === "reject") {
      review.isFlagged = true;
      review.isVerified = false;
    } else {
      return res.status(400).json({ error: "action must be approve or reject" });
    }

    await review.save();
    return res.json({ review });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[care/review-moderate] failed:", err);
    return res.status(500).json({ error: "Moderation failed" });
  }
});

router.get("/owner/fake-review-stats", authenticateJWT, requireRole("OWNER"), async (req, res) => {
  try {
    // Count per sellerId.
    const result = await Review.aggregate([
      { $match: { sellerId: { $ne: null } } },
      {
        $group: {
          _id: "$sellerId",
          total: { $sum: 1 },
          flagged: { $sum: { $cond: ["$isFlagged", 1, 0] } },
          verified: { $sum: { $cond: ["$isVerified", 1, 0] } },
        },
      },
      { $sort: { flagged: -1 } },
      { $limit: 20 },
    ]);

    return res.json({ stats: result });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[owner/fake-review-stats] failed:", err);
    return res.status(500).json({ error: "Failed to fetch stats" });
  }
});

module.exports = router;

