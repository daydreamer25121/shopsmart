const mongoose = require("mongoose");

const OutfitSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    occasion: {
      type: String,
      enum: ["Casual", "Formal", "Wedding", "Party", "Sports", "Festive"],
      required: true,
      index: true,
    },

    productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Outfit", OutfitSchema);

