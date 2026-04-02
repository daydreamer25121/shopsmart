const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const User = require("../../database/models/User");
const { authenticateJWT, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email and password required" });

    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: "JWT_SECRET not configured" });

    const token = jwt.sign(
      { role: user.role },
      secret,
      { subject: user._id.toString(), expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        id: user._id,
        role: user.role,
        name: user.name,
        email: user.email,
        skinTone: user.skinTone,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: "Login failed" });
  }
});

router.get("/me", authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("role name email skinTone");
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ user });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Minimal protected routes (role guard scaffolding for dashboards).
router.get("/owner-only", authenticateJWT, requireRole("OWNER"), (req, res) => {
  return res.json({ ok: true, role: req.user.role });
});

router.get("/seller-only", authenticateJWT, requireRole("SELLER"), (req, res) => {
  return res.json({ ok: true, role: req.user.role });
});

router.get("/analyst-only", authenticateJWT, requireRole("ANALYST"), (req, res) => {
  return res.json({ ok: true, role: req.user.role });
});

router.get("/care-only", authenticateJWT, requireRole("CARE"), (req, res) => {
  return res.json({ ok: true, role: req.user.role });
});

router.get("/user-only", authenticateJWT, requireRole("USER"), (req, res) => {
  return res.json({ ok: true, role: req.user.role });
});

module.exports = router;

