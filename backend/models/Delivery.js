const mongoose = require("mongoose");

const deliverySchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",          
      default: null,
    },
    driverEarnings: {
      type: Number,
      default: 0,
      min: 0
    },
    // 6-digit code customer shows to driver at the door
    confirmationCode: {
      type: String,
      default: null,
    },
    codeUsed: { type: Boolean, default: false },

    status: {
      type: String,
      enum: [
        "pending_dispatch",
        "dispatched",
        "accepted",
        "picked_up",
        "in_transit",
        "delivered",
        "failed",
        "cancelled",
      ],
      default: "pending_dispatch",
    },

    // Timestamps for each stage
    dispatchedAt:  Date,
    acceptedAt:    Date,
    pickedUpAt:    Date,
    deliveredAt:   Date,

    // Estimated delivery (set when driver accepts)
    estimatedDelivery: Date,

    // Notes
    driverNotes:   String,
    failureReason: String,

    // Email notification tracking
    customerNotified: { type: Boolean, default: false },
    driverNotified:   { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Delivery", deliverySchema);