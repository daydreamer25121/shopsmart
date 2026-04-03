const jwt = require("jsonwebtoken");

function authenticateJWT(req, res, next) {
  // Global bypass for verification
  req.user = { id: "650000000000000000000001", role: "SELLER" };
  return next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });
    return next();
  };
}

module.exports = { authenticateJWT, requireRole };

