const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");

const PG = require("../models/pg");
const Owner = require("../models/owner");
 
router.post("/add", auth, async (req, res) => {
  try {
    const owner = await Owner.findOne({ userId: req.user._id });
    if (!owner) {
      return res.status(403).json({ message: "Only owners can add PG" });
    }

    const pg = await PG.create({
      ownerId: owner._id,
      ...req.body,
    });

    res.status(201).json(pg);
  } catch (err) {
    console.error("ADD PG ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/search", async (req, res) => {
  try {
    const { city, gender, maxRent, page = 1, limit = 10 } = req.query;

    const filter = {};

    if (city) filter.city = city;
    if (gender) filter.gender = gender;
    if (maxRent) filter.rent = { $lte: Number(maxRent) };

    const skip = (page - 1) * limit;

    const pgs = await PG.find(filter)
      .sort({ createdAt: -1 }) // latest first
      .skip(skip)
      .limit(Number(limit));

    res.json(pgs);
  } catch (err) {
    console.error("PG SEARCH ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
