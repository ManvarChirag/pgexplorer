const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    permissions: {
      type: [String],
      default: ["MANAGE_USERS", "MODERATE_LISTINGS", "VERIFY_OWNERS"],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Admin", adminSchema);
