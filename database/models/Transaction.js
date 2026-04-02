const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true }],
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

module.exports = mongoose.model("Transaction", TransactionSchema);

