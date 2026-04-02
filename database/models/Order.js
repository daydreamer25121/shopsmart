const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    products: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, default: 1, min: 1 },
        priceAtPurchase: { type: Number, required: true, min: 0 },
      },
    ],

    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["created", "paid", "failed", "cancelled", "fulfilled"],
      default: "created",
      index: true,
    },

    razorpayId: { type: String, default: null, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);

