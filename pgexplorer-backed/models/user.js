const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["student", "owner", "admin"],
      required: true,
    },

    // Auth hardening
    isEmailVerified: {
      type: Boolean,
      // Keep login working for existing users (undefined is treated as verified in controller)
      default: false,
    },
    emailVerificationTokenHash: {
      type: String,
    },
    emailVerificationExpiresAt: {
      type: Date,
    },

    refreshTokenHash: {
      type: String,
    },
    refreshTokenExpiresAt: {
      type: Date,
    },

    resetPasswordTokenHash: {
      type: String,
    },
    resetPasswordExpiresAt: {
      type: Date,
    },

    // Admin moderation
    isBlocked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
