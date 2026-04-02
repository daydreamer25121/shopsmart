const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");

const Product = require("../../database/models/Product");
const Order = require("../../database/models/Order");
const Transaction = require("../../database/models/Transaction");
const { authenticateJWT, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

router.post("/payments/create-order", authenticateJWT, requireRole("USER", "OWNER"), async (req, res) => {
  try {
    const razorpay = getRazorpayClient();
    if (!razorpay) return res.status(500).json({ error: "Razorpay not configured" });

    const userId = req.user.id;
    const { items } = req.body || {};
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: "items required" });

    // Load products and validate inventory.
    const productIds = items.map((it) => it.productId).filter(Boolean);
    const products = await Product.find({ _id: { $in: productIds } }).lean();
    const productById = new Map(products.map((p) => [String(p._id), p]));

    const normalizedProducts = [];
    let total = 0;

    for (const it of items) {
      const pid = String(it.productId);
      const qty = Number(it.quantity || 1);
      if (!productById.has(pid)) return res.status(404).json({ error: `Product not found: ${pid}` });
      if (!Number.isFinite(qty) || qty < 1) return res.status(400).json({ error: "Invalid quantity" });

      const p = productById.get(pid);
      const inv = Number(p.inventory || 0);
      if (inv < qty) return res.status(409).json({ error: `Insufficient inventory for ${pid}` });

      const price = Number(p.price || 0);
      total += price * qty;
      normalizedProducts.push({
        productId: p._id,
        quantity: qty,
        priceAtPurchase: price,
      });
    }

    if (total <= 0) return res.status(400).json({ error: "Invalid total" });

    // Create local order record first.
    const order = await Order.create({
      userId,
      products: normalizedProducts,
      total,
      status: "created",
      razorpayId: null,
    });

    const amountPaise = Math.round(total * 100);
    const receipt = String(order._id);

    const rzOrder = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt,
      payment_capture: 1,
    });

    order.razorpayId = rzOrder.id;
    order.status = "created";
    await order.save();

    return res.json({
      orderId: String(order._id),
      razorpayOrderId: rzOrder.id,
      amount: amountPaise,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[payments/create-order] failed:", err);
    return res.status(500).json({ error: "Create order failed" });
  }
});

router.post("/payments/verify-payment", authenticateJWT, requireRole("USER", "OWNER"), async (req, res) => {
  try {
    const razorpay = getRazorpayClient();
    if (!razorpay) return res.status(500).json({ error: "Razorpay not configured" });

    const userId = req.user.id;
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = req.body || {};

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ error: "Missing payment verification fields" });
    }

    // Verify signature: generated = HMAC_SHA256(orderId|paymentId, key_secret)
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    const ok = generatedSignature === razorpaySignature;
    if (!ok) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    // Find the order by razorpayId (rzOrderId).
    // Keep products.productId as ObjectIds for atomic inventory updates.
    const order = await Order.findOne({ razorpayId: razorpayOrderId, userId });
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (order.status === "paid" || order.status === "fulfilled") {
      return res.json({ success: true, orderId: String(order._id), alreadyProcessed: true });
    }

    // Decrement inventory atomically.
    for (const item of order.products) {
      const pid = item.productId;
      const qty = Number(item.quantity || 1);
      const updated = await Product.updateOne(
        { _id: pid, inventory: { $gte: qty } },
        { $inc: { inventory: -qty } }
      );
      if (!updated.modifiedCount) {
        order.status = "failed";
        await order.save();
        return res.status(409).json({ error: `Inventory update failed for product ${pid}` });
      }
    }

    order.status = "paid";
    await order.save();

    // Emit real-time event for the owning user.
    try {
      const io = req.app.get("io");
      if (io) {
        io.to(String(order.userId)).emit("order:paid", { orderId: String(order._id) });
      }
    } catch {
      // ignore
    }

    // Insert transaction for Apriori/Naive Bayes training.
    const productIdsForTx = order.products.map((it) => String(it.productId));
    const uniqueProductIds = Array.from(new Set(productIdsForTx));

    await Transaction.create({
      userId: order.userId,
      productIds: uniqueProductIds,
      timestamp: new Date(),
    }).catch(() => null);

    // Trigger recommendation engine retraining (best-effort).
    try {
      const mlBase = process.env.ML_SERVICE_URL || "http://localhost:8000";
      await fetch(`${mlBase}/retrain`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }).catch(() => null);
    } catch {
      // ignore
    }

    return res.json({ success: true, orderId: String(order._id) });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[payments/verify-payment] failed:", err);
    return res.status(500).json({ error: "Verification failed" });
  }
});

router.get("/orders/mine", authenticateJWT, requireRole("USER", "OWNER"), async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    return res.json({ orders });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[orders/mine] failed:", err);
    return res.status(500).json({ error: "Failed to fetch orders" });
  }
});

module.exports = router;

