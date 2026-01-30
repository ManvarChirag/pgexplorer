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
    city: {
      type: String,
      required: true,
      index: true,
    },
    rent: {
      type: Number,
      required: true,
    },
    gender: {
      type: String,
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
  },
  { timestamps: true },
);

module.exports = mongoose.models.PG || mongoose.model("PG", pgSchema);
