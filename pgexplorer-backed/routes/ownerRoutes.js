const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();

const User = require("../models/user");
const Owner = require("../models/owner");

router.post("/register", async (req, res) => {
  try {
    const { email, password, name, phone, city, address, aadharNumber } =
      req.body;

    if (!email || !password || !name || !phone) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      passwordHash,
      role: "owner",
    });

    await Owner.create({
      userId: user._id,
      name,
      phone,
      city,
      address,
      aadharNumber,
      verificationStatus: "verified",
    });

    res.status(201).json({ message: "Owner registered successfully" });
  } catch (err) {
    console.error("OWNER REGISTER ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
