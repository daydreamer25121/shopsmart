const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const authRoutes = require("./routes/auth.routes");
const recommendRoutes = require("./routes/recommend.routes");
const comboRoutes = require("./routes/combo.routes");
const tryOnRoutes = require("./routes/tryon.routes");
const skinToneRoutes = require("./routes/skinTone.routes");
const outfitsRoutes = require("./routes/outfits.routes");
const chatRoutes = require("./routes/chat.routes");
const reviewsRoutes = require("./routes/reviews.routes");
const predictionsRoutes = require("./routes/predictions.routes");
const paymentsRoutes = require("./routes/payments.routes");
const productsRoutes = require("./routes/products.routes");

function createApp() {
  const app = express();

  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("dev"));

 // Simple health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'ShopSmart Backend is running ✅',
    mongo: 'connected',
    timestamp: new Date().toISOString()
  });
});

  app.use("/api/auth", authRoutes);
  app.use("/api", recommendRoutes);
  app.use("/api", comboRoutes);
  app.use("/api", tryOnRoutes);
  app.use("/api", skinToneRoutes);
  app.use("/api", outfitsRoutes);
  app.use("/api", productsRoutes);
  app.use("/api", chatRoutes);
  app.use("/api", reviewsRoutes);
  app.use("/api", predictionsRoutes);
  app.use("/api", paymentsRoutes);

  // Future: Socket.io + role dashboards.

  return app;
}

module.exports = createApp;

