const mongoose = require("mongoose");

const pgSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // 🔥 USER ONLY
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    address: {
      type: String,
      default: "",
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
    deposit: {
      type: Number,
      default: 0,
    },
    maintenance: {
      type: Number,
      default: 0,
    },
    gender: {
      type: String,
    },

    roomType: {
      type: String,
      enum: ["single", "shared"],
      default: "single",
    },
    ac: {
      type: Boolean,
      default: false,
    },

    totalRooms: {
      type: Number,
      default: 0,
      min: 0,
    },
    availableRooms: {
      type: Number,
      default: 0,
      min: 0,
    },

    rules: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["draft", "pending", "active", "inactive", "rejected"],
      // Keep existing docs visible by default
      default: "active",
      index: true,
    },
    amenities: {
      type: [String],
    },
    images: [
      {
        url: String,
        public_id: String,
      },
    ],

    propertyPaper: {
      url: { type: String },
      public_id: { type: String },
      originalName: { type: String },
      mimeType: { type: String },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.models.PG || mongoose.model("PG", pgSchema);
