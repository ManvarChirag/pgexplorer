const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const Student = require("../models/Student");

router.get("/profile", auth, async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user._id }).populate(
      "userId",
      "email role"
    );

    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    res.json(student);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
