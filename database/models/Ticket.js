const mongoose = require("mongoose");

const TicketSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    issue: { type: String, required: true, trim: true },

    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "escalated"],
      default: "open",
      index: true,
    },

    // Assigned to CARE or OWNER (denormalized for dashboard filtering).
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ticket", TicketSchema);

