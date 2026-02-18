const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
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
    college: {
      type: String,
      required: true,
    },
    branch: {
      type: String,
      required: true,
    },
    year: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    // Favorites stored per account (student)
    favoritePgIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PG",
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Student", studentSchema);
