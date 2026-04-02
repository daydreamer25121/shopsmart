const mongoose = require("mongoose");

const ROLES = ["OWNER", "SELLER", "ANALYST", "CARE", "USER"];

const UserSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ROLES,
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },

    // Used for skin-tone-based color suggestions.
    skinTone: {
      type: String,
      enum: ["Fair", "Wheatish", "Medium Brown", "Dark Brown"],
      default: null,
    },

    // Lightweight purchase history for ML feature hooks / personalization.
    purchaseHistory: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        purchasedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);

