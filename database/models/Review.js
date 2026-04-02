const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },

    text: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },

    isFlagged: { type: Boolean, default: false, index: true },
    isVerified: { type: Boolean, default: false, index: true },

    // AI detector outputs (null/empty when not evaluated).
    aiConfidence: { type: Number, default: null, index: true },
    aiReasons: { type: [String], default: [], index: false },

    // Optional sellerId shortcut (denormalized for faster analytics).
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Review", ReviewSchema);

