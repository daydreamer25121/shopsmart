const mongoose = require("mongoose");

const ComboSchema = new mongoose.Schema(
  {
    productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true }],
    discount: { type: Number, required: true, min: 0, max: 100 },

    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Combo", ComboSchema);

