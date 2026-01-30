const User = require("../models/user");
const Student = require("../models/Student");
const Owner = require("../models/owner");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// =====================
// REGISTER USER (Student / Owner only)
// =====================
exports.registerUser = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Block admin registration
    if (role === "admin") {
      return res.status(403).json({
        message: "Admin registration is not allowed",
      });
    }

    if (!email || !password || !role) {
      return res.status(400).json({
        message: "Email, password and role are required",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        message: "User already exists",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create base User
    const user = await User.create({
      email,
      passwordHash,
      role,
    });

    // =====================
    // CREATE ROLE PROFILE
    // =====================
    if (role === "student") {
      const { name, college, branch, year } = req.body;

      if (!name || !college || !branch || !year) {
        return res.status(400).json({
          message: "Student profile fields missing",
        });
      }

      await Student.create({
        userId: user._id,
        name,
        college,
        branch,
        year,
      });
    }

    if (role === "owner") {
      const { name, phone, city, address, aadharNumber } = req.body;

      if (!name || !phone || !city || !address || !aadharNumber) {
        return res.status(400).json({
          message: "Owner profile fields missing",
        });
      }

      await Owner.create({
        userId: user._id,
        name,
        phone,
        city,
        address,
        aadharNumber,
      });
    }

    res.status(201).json({
      message: "Registration successful",
      userId: user._id,
      role,
    });
  } catch (error) {
    res.status(500).json({
      message: "Registration failed",
      error: error.message,
    });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      role: user.role,
    });
  } catch (error) {
    res.status(500).json({
      message: "Login failed",
      error: error.message,
    });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid email or password" });

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      token,
      role: user.role,
      userId: user._id,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
