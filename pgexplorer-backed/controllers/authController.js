const User = require("../models/user");
const Student = require("../models/Student");
const Owner = require("../models/owner");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendEmail } = require("../utils/email");
const { isValidAadhaar } = require("../utils/verhoeff");

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "15m";
const REFRESH_TOKEN_DAYS = Number(process.env.REFRESH_TOKEN_DAYS || 30);

const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const signAccessToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
  });

const setRefreshCookie = (res, refreshToken) => {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/api/auth/refresh",
    maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
  });
};

const clearRefreshCookie = (res) => {
  res.clearCookie("refreshToken", {
    path: "/api/auth/refresh",
  });
};

const buildFrontendUrl = (path) => {
  const base = process.env.FRONTEND_ORIGIN || "http://localhost:3000";
  return `${base}${path}`;
};

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

      if (!isValidAadhaar(String(aadharNumber))) {
        return res.status(400).json({ message: "Invalid Aadhaar number" });
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

    // Email verification (new signups only)
    const rawVerifyToken = crypto.randomBytes(32).toString("hex");
    user.isEmailVerified = false;
    user.emailVerificationTokenHash = sha256(rawVerifyToken);
    user.emailVerificationExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const verifyUrl = buildFrontendUrl(`/verify-email?token=${rawVerifyToken}`);
    await sendEmail({
      to: user.email,
      subject: "Verify your email - PG Explorer",
      text: `Verify your email by opening: ${verifyUrl}`,
    });

    res.status(201).json({
      message: "Registration successful. Please verify your email.",
      userId: user._id,
      role,
      // Dev helper so you can test without SMTP
      ...(process.env.NODE_ENV !== "production"
        ? { verifyTokenDevOnly: rawVerifyToken }
        : {}),
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

    if (user.isBlocked) {
      return res.status(403).json({ message: "User is blocked" });
    }

    // Enforce verification for new users only (existing DB users may have undefined)
    if (user.role !== "admin" && user.isEmailVerified === false) {
      return res.status(403).json({
        message: "Email not verified. Please verify your email.",
      });
    }

    // Issue refresh token (stored hashed in DB) + access token (returned)
    const refreshToken = crypto.randomBytes(48).toString("hex");
    user.refreshTokenHash = sha256(refreshToken);
    user.refreshTokenExpiresAt = new Date(
      Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
    );
    await user.save();

    const token = signAccessToken(user);
    setRefreshCookie(res, refreshToken);
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

// =====================
// VERIFY EMAIL
// POST /api/auth/verify-email
// =====================
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: "Verification token required" });
    }

    const tokenHash = sha256(token);
    const user = await User.findOne({
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.isEmailVerified = true;
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save();

    res.json({ message: "Email verified successfully" });
  } catch (error) {
    res.status(500).json({ message: "Verification failed" });
  }
};

// =====================
// REFRESH ACCESS TOKEN
// POST /api/auth/refresh
// =====================
exports.refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token" });
    }

    const tokenHash = sha256(refreshToken);
    const user = await User.findOne({
      refreshTokenHash: tokenHash,
      refreshTokenExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: "User is blocked" });
    }

    const token = signAccessToken(user);
    res.json({ token, role: user.role });
  } catch (error) {
    res.status(500).json({ message: "Refresh failed" });
  }
};

// =====================
// LOGOUT
// POST /api/auth/logout
// =====================
exports.logout = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      const tokenHash = sha256(refreshToken);
      await User.updateOne(
        { refreshTokenHash: tokenHash },
        {
          $unset: {
            refreshTokenHash: 1,
            refreshTokenExpiresAt: 1,
          },
        },
      );
    }
    clearRefreshCookie(res);
    res.json({ message: "Logged out" });
  } catch (error) {
    res.status(500).json({ message: "Logout failed" });
  }
};

// =====================
// FORGOT PASSWORD
// POST /api/auth/forgot-password
// =====================
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    const user = await User.findOne({ email });
    // Do not reveal account existence
    if (!user) {
      return res.json({
        message: "If the email exists, a reset link was sent",
      });
    }

    const rawResetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordTokenHash = sha256(rawResetToken);
    user.resetPasswordExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    const resetUrl = buildFrontendUrl(`/reset-password?token=${rawResetToken}`);

    await sendEmail({
      to: user.email,
      subject: "Reset your password - PG Explorer",
      text: `Reset your password by opening: ${resetUrl}`,
    });

    res.json({
      message: "If the email exists, a reset link was sent",
      ...(process.env.NODE_ENV !== "production"
        ? { resetTokenDevOnly: rawResetToken }
        : {}),
    });
  } catch (error) {
    res.status(500).json({ message: "Forgot password failed" });
  }
};

// =====================
// RESET PASSWORD
// POST /api/auth/reset-password
// =====================
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ message: "Token and newPassword required" });
    }

    const tokenHash = sha256(token);
    const user = await User.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpiresAt = undefined;

    // invalidate refresh token on password change
    user.refreshTokenHash = undefined;
    user.refreshTokenExpiresAt = undefined;
    await user.save();

    clearRefreshCookie(res);
    res.json({ message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({ message: "Reset password failed" });
  }
};
