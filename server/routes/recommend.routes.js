const express = require("express");
const jwt = require("jsonwebtoken");

const router = express.Router();

function getUserFromOptionalJWT(req) {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = String(header).split(" ");
  if (scheme !== "Bearer" || !token) return null;

  const secret = process.env.JWT_SECRET;
  if (!secret) return null;

  try {
    const payload = jwt.verify(token, secret);
    return { id: payload.sub, role: payload.role };
  } catch (err) {
    return null;
  }
}

router.post("/recommendations", async (req, res) => {
  try {
    const { productId } = req.body || {};
    if (!productId) return res.status(400).json({ error: "productId is required" });

    const user = getUserFromOptionalJWT(req);
    const userId = user ? user.id : null;

    const mlBase = process.env.ML_SERVICE_URL || "http://localhost:8000";
    const mlRes = await fetch(`${mlBase}/recommend`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, productId }),
    });

    if (!mlRes.ok) {
      const text = await mlRes.text().catch(() => "");
      return res.status(502).json({ error: "ML service failed", details: text });
    }

    const payload = await mlRes.json();
    return res.json(payload);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[recommendations] failed:", err);
    return res.status(500).json({ error: "Recommendation failed" });
  }
});

module.exports = router;

