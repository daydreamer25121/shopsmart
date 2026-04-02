const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    category: {
      type: String,
      required: true,
      enum: ["shirts", "pants", "caps", "shoes", "bracelets"],
      index: true,
    },

    images: { type: [String], default: [] },
    video: { type: String, default: null },

    // GLB URL or filesystem path (demo can use a static GLB reference).
    glbModel: { type: String, default: null },

    tryOnEligible: { type: Boolean, default: true },

    colours: [
      {
        name: { type: String, required: true },
        hex: { type: String, required: true },
        // Which skin tone buckets this colour works best for.
        bestForSkinTone: [
          {
            type: String,
            enum: ["Fair", "Wheatish", "Medium Brown", "Dark Brown"],
          },
        ],
      },
    ],

    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // Used for low-stock alerts in sales predictions.
    inventory: { type: Number, default: 50, min: 0 },

    // Used for Razorpay order totals.
    price: { type: Number, default: 999, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", ProductSchema);

