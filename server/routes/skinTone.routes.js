const express = require("express");

const router = express.Router();

router.post("/skin-tone", async (req, res) => {
  try {
    const mlBase = process.env.ML_SERVICE_URL || "http://localhost:8000";
    const mlRes = await fetch(`${mlBase}/skin-tone`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req.body || {}),
    });

    if (!mlRes.ok) {
      const text = await mlRes.text().catch(() => "");
      return res.status(502).json({ error: "ML service failed", details: text });
    }

    const payload = await mlRes.json();
    return res.json(payload);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[skin-tone] failed:", err);
    return res.status(500).json({ error: "Skin tone analysis failed" });
  }
});

module.exports = router;

