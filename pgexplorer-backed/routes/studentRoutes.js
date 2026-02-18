const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const auth = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const Student = require("../models/Student");
const PG = require("../models/PG");

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

router.get("/profile", auth, async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user._id }).populate(
      "userId",
      "email role",
    );

    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    res.json(student);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/profile", auth, authorize("student"), async (req, res) => {
  try {
    const { name, college, branch, year } = req.body;

    const updates = {};
    if (typeof name !== "undefined") updates.name = String(name).trim();
    if (typeof college !== "undefined")
      updates.college = String(college).trim();
    if (typeof branch !== "undefined") updates.branch = String(branch).trim();
    if (typeof year !== "undefined") updates.year = Number(year);

    if (typeof updates.year !== "undefined") {
      if (!Number.isFinite(updates.year)) {
        return res.status(400).json({ message: "Year must be a number" });
      }
      if (updates.year < 1 || updates.year > 5) {
        return res
          .status(400)
          .json({ message: "Year must be between 1 and 5" });
      }
    }

    const student = await Student.findOneAndUpdate(
      { userId: req.user._id },
      updates,
      { new: true, runValidators: true },
    ).populate("userId", "email role");

    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    res.json(student);
  } catch (err) {
    console.error("STUDENT PROFILE UPDATE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// =====================
// FAVORITES (per student account)
// =====================

router.get("/favorites", auth, authorize("student"), async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user._id }).select(
      "favoritePgIds",
    );
    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const ids = (student.favoritePgIds || []).map((x) => String(x));
    res.json({ ids });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post(
  "/favorites/toggle",
  auth,
  authorize("student"),
  async (req, res) => {
    try {
      const pgId = String(req.body?.pgId || "").trim();
      if (!pgId || !isValidObjectId(pgId)) {
        return res.status(400).json({ message: "Invalid pgId" });
      }

      const exists = await PG.findById(pgId).select("_id");
      if (!exists) {
        return res.status(404).json({ message: "PG not found" });
      }

      const student = await Student.findOne({ userId: req.user._id });
      if (!student) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      const current = Array.isArray(student.favoritePgIds)
        ? student.favoritePgIds.map((x) => String(x))
        : [];
      const has = current.includes(pgId);

      const next = has ? current.filter((x) => x !== pgId) : [...current, pgId];

      student.favoritePgIds = next;
      await student.save();

      res.json({ ids: next, isFavorite: !has });
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  },
);

router.post("/favorites/bulk", auth, authorize("student"), async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const incoming = ids
      .map((x) => String(x || "").trim())
      .filter(Boolean)
      .filter(isValidObjectId);

    if (incoming.length === 0) {
      return res.json({ ids: [] });
    }

    const student = await Student.findOne({ userId: req.user._id });
    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    // Only keep IDs that actually exist.
    const existing = await PG.find({ _id: { $in: incoming } }).select("_id");
    const existingIds = new Set(existing.map((p) => String(p._id)));
    const filtered = incoming.filter((id) => existingIds.has(id));

    const current = Array.isArray(student.favoritePgIds)
      ? student.favoritePgIds.map((x) => String(x))
      : [];

    const merged = Array.from(new Set([...current, ...filtered]));
    student.favoritePgIds = merged;
    await student.save();

    res.json({ ids: merged });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.delete(
  "/favorites/:pgId",
  auth,
  authorize("student"),
  async (req, res) => {
    try {
      const pgId = String(req.params?.pgId || "").trim();
      if (!pgId || !isValidObjectId(pgId)) {
        return res.status(400).json({ message: "Invalid pgId" });
      }

      const student = await Student.findOne({ userId: req.user._id });
      if (!student) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      const current = Array.isArray(student.favoritePgIds)
        ? student.favoritePgIds.map((x) => String(x))
        : [];
      const next = current.filter((x) => x !== pgId);
      student.favoritePgIds = next;
      await student.save();

      res.json({ ids: next });
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  },
);

module.exports = router;
