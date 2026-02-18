const mongoose = require("mongoose");

const ALLOWED_ROLES = ["student", "owner", "admin"];

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    message: { type: String, required: true },
    // Empty/undefined means "all roles".
    roles: { type: [String], default: undefined, enum: ALLOWED_ROLES },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

announcementSchema.index({ createdAt: -1 });
announcementSchema.index({ roles: 1, createdAt: -1 });

module.exports =
  mongoose.models.Announcement ||
  mongoose.model("Announcement", announcementSchema);
