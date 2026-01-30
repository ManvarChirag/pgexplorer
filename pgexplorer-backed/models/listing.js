const mongoose = require("mongoose");

const listingSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    address: {
      type: String,
      required: true,
    },

    city: {
      type: String,
      required: true,
      index: true,
    },

    rent: {
      type: Number,
      required: true,
    },

    roomType: {
      type: String,
      required: true,
      enum: ["single", "double", "shared"],
    },

    contactPhone: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "active", "inactive"],
      default: "pending",
    },

    // Optional fields
    deposit: {
      type: Number,
    },

    nearbyCollege: {
      type: String,
    },

    facilities: {
      type: [String],
    },

    images: [
      {
        url: String,
        public_id: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Listing", listingSchema);
