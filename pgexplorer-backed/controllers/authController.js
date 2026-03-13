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

const generateOtp6 = () =>
  String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5);
const OTP_RESEND_COOLDOWN_MS = Number(
  process.env.OTP_RESEND_COOLDOWN_MS || 60_000,
);

const signAccessToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
  });

const setRefreshCookie = (res, refreshToken) => {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProd,
    // In production the frontend and backend are typically on different domains.
    // Cross-site XHR/fetch requires SameSite=None + Secure for cookies to be sent.
    sameSite: isProd ? "none" : "lax",
    path: "/api/auth/refresh",
    maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
  });
};

const clearRefreshCookie = (res) => {
  const isProd = process.env.NODE_ENV === "production";
  res.clearCookie("refreshToken", {
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/api/auth/refresh",
  });
};

const isEmailVerificationRequired = () => {
  // Default: required (especially in production).
  // Set EMAIL_VERIFICATION_REQUIRED=false to disable for demo/staging environments.
  return (
    String(process.env.EMAIL_VERIFICATION_REQUIRED || "true").toLowerCase() !==
    "false"
  );
};

const buildFrontendUrl = (path) => {
  const isProd = process.env.NODE_ENV === "production";
  const configuredRaw = process.env.FRONTEND_ORIGIN;

  const configuredBase = (configuredRaw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)[0];

  if (isProd && !configuredBase) {
    throw new Error(
      "FRONTEND_ORIGIN is not set. It must be your deployed frontend URL (e.g. https://pgexplorer.netlify.app).",
    );
  }

  const base = (configuredBase || "http://localhost:3000").replace(/\/+$/, "");
  const normalizedPath = String(path || "").startsWith("/")
    ? String(path || "")
    : `/${path}`;
  return `${base}${normalizedPath}`;
};

// =====================
// REGISTER USER (Student / Owner only)
// =====================
exports.registerUser = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Validate role-specific payload BEFORE creating any DB records
    if (role === "student") {
      const { name, college, branch, year } = req.body;
      if (!name || !college || !branch || !year) {
        return res.status(400).json({
          message: "Student profile fields missing",
        });
      }
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
    }

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

    let user;
    try {
      // Create base User
      user = await User.create({
        email,
        passwordHash,
        role,
      });

      // =====================
      // CREATE ROLE PROFILE
      // =====================
      if (role === "student") {
        const { name, college, branch, year } = req.body;
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
        await Owner.create({
          userId: user._id,
          name,
          phone,
          city,
          address,
          aadharNumber,
        });
      }

      // Optional mode (demo/staging): allow signups even when email isn't configured.
      // NOTE: Password reset will still require email.
      if (!isEmailVerificationRequired()) {
        user.isEmailVerified = true;
        user.emailVerificationTokenHash = undefined;
        user.emailVerificationExpiresAt = undefined;
        user.emailOtpHash = undefined;
        user.emailOtpExpiresAt = undefined;
        user.emailOtpAttempts = 0;
        user.emailOtpLastSentAt = undefined;
        await user.save();

        return res.status(201).json({
          message: "Registration successful",
          userId: user._id,
          role,
        });
      }

      // Email OTP verification (new signups)
      const otp = generateOtp6();
      user.isEmailVerified = false;
      user.emailOtpHash = sha256(otp);
      user.emailOtpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
      user.emailOtpAttempts = 0;
      user.emailOtpLastSentAt = new Date();

      // Keep old token fields cleared (backward compatible endpoint still exists)
      user.emailVerificationTokenHash = undefined;
      user.emailVerificationExpiresAt = undefined;
      await user.save();

      await sendEmail({
        to: user.email,
        subject: "Your PG Explorer verification code",
        text: `Your verification code is: ${otp}. This code will expire in 10 minutes.`,
      });

      res.status(201).json({
        message: "Registration successful. Please verify your email.",
        userId: user._id,
        role,
        // Dev helper so you can test without SMTP
        ...(process.env.NODE_ENV !== "production" ? { otpDevOnly: otp } : {}),
      });
    } catch (innerError) {
      // Rollback: avoid leaving an unverified account that can never be verified
      if (user?._id) {
        try {
          await Promise.all([
            Student.deleteOne({ userId: user._id }),
            Owner.deleteOne({ userId: user._id }),
          ]);
        } catch {
          // ignore cleanup failures
        }

        try {
          await User.deleteOne({ _id: user._id });
        } catch {
          // ignore cleanup failures
        }
      }

      throw innerError;
    }
  } catch (error) {
    const msg = String(error?.message || "");
    const isProd = process.env.NODE_ENV === "production";

    if (
      isProd &&
      (msg.includes("SMTP is not configured") ||
        msg.includes("SMTP verify failed") ||
        msg.includes("SMTP send failed"))
    ) {
      return res.status(503).json({
        message:
          "Email service is not configured. Please try again later or contact support.",
      });
    }

    if (isProd && msg.includes("FRONTEND_ORIGIN is not set")) {
      return res.status(503).json({
        message: "Server configuration error. Please try again later.",
      });
    }

    res.status(500).json({
      message: "Registration failed",
      ...(!isProd ? { error: error.message } : {}),
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

    // Enforce verification only when enabled.
    // Existing DB users may have undefined (treated as verified).
    if (
      isEmailVerificationRequired() &&
      user.role !== "admin" &&
      user.isEmailVerified === false
    ) {
      return res.status(403).json({
        message: "Please verify your email before logging in.",
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
    const { token, email, otp } = req.body || {};

    // Backward-compatible: support old token-based verification links
    if (token) {
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
      user.emailOtpHash = undefined;
      user.emailOtpExpiresAt = undefined;
      user.emailOtpAttempts = 0;
      user.emailOtpLastSentAt = undefined;
      await user.save();

      return res.json({ message: "Email verified successfully." });
    }

    // OTP verification
    const cleanEmail = String(email || "")
      .trim()
      .toLowerCase();
    const cleanOtp = String(otp || "").trim();

    if (!cleanEmail || !cleanOtp) {
      return res
        .status(400)
        .json({ message: "Email and verification code are required." });
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user || user.role === "admin") {
      return res.status(400).json({ message: "Invalid verification code." });
    }

    if (user.isEmailVerified === true) {
      return res.json({ message: "Email verified successfully." });
    }

    if (!user.emailOtpHash || !user.emailOtpExpiresAt) {
      return res.status(400).json({
        message: "Verification code expired. Please request a new one.",
      });
    }

    if (new Date(user.emailOtpExpiresAt).getTime() < Date.now()) {
      return res.status(400).json({
        message: "Verification code expired. Please request a new one.",
      });
    }

    if (Number(user.emailOtpAttempts || 0) >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({
        message: "Too many attempts. Please request a new one.",
      });
    }

    const matches = sha256(cleanOtp) === user.emailOtpHash;
    if (!matches) {
      user.emailOtpAttempts = Number(user.emailOtpAttempts || 0) + 1;
      await user.save();
      return res.status(400).json({ message: "Invalid verification code." });
    }

    user.isEmailVerified = true;
    user.emailOtpHash = undefined;
    user.emailOtpExpiresAt = undefined;
    user.emailOtpAttempts = 0;
    user.emailOtpLastSentAt = undefined;
    await user.save();

    return res.json({ message: "Email verified successfully." });
  } catch (error) {
    res.status(500).json({ message: "Verification failed" });
  }
};

// =====================
// RESEND VERIFICATION EMAIL
// POST /api/auth/resend-verification
// =====================
exports.resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    // Do not reveal account existence
    if (!user || user.role === "admin") {
      return res.json({
        message: "If the email exists, a verification code was sent",
      });
    }

    if (user.isEmailVerified === true) {
      return res.json({ message: "Email already verified" });
    }

    // If verification is disabled, just activate.
    if (!isEmailVerificationRequired()) {
      user.isEmailVerified = true;
      user.emailVerificationTokenHash = undefined;
      user.emailVerificationExpiresAt = undefined;
      user.emailOtpHash = undefined;
      user.emailOtpExpiresAt = undefined;
      user.emailOtpAttempts = 0;
      user.emailOtpLastSentAt = undefined;
      await user.save();
      return res.json({ message: "Email verification is not required" });
    }

    const lastSentAt = user.emailOtpLastSentAt
      ? new Date(user.emailOtpLastSentAt).getTime()
      : 0;
    if (Date.now() - lastSentAt < OTP_RESEND_COOLDOWN_MS) {
      return res.status(429).json({
        message: "Please wait before requesting a new code.",
      });
    }

    const otp = generateOtp6();
    user.isEmailVerified = false;
    user.emailOtpHash = sha256(otp);
    user.emailOtpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
    user.emailOtpAttempts = 0;
    user.emailOtpLastSentAt = new Date();

    // Clear legacy token fields
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save();

    await sendEmail({
      to: user.email,
      subject: "Your PG Explorer verification code",
      text: `Your verification code is: ${otp}. This code will expire in 10 minutes.`,
    });

    return res.json({
      message: "If the email exists, a verification code was sent",
      ...(process.env.NODE_ENV !== "production" ? { otpDevOnly: otp } : {}),
    });
  } catch (error) {
    const msg = String(error?.message || "");
    const isProd = process.env.NODE_ENV === "production";

    if (
      isProd &&
      (msg.includes("SMTP is not configured") ||
        msg.includes("SMTP verify failed") ||
        msg.includes("SMTP send failed"))
    ) {
      return res.status(503).json({
        message:
          "Email service is not configured. Please try again later or contact support.",
      });
    }

    if (isProd && msg.includes("FRONTEND_ORIGIN is not set")) {
      return res.status(503).json({
        message: "Server configuration error. Please try again later.",
      });
    }

    return res.status(500).json({
      message: "Resend verification failed",
      ...(!isProd ? { error: error.message } : {}),
    });
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
    const msg = String(error?.message || "");
    const isProd = process.env.NODE_ENV === "production";

    if (
      isProd &&
      (msg.includes("SMTP is not configured") ||
        msg.includes("SMTP verify failed") ||
        msg.includes("SMTP send failed"))
    ) {
      return res.status(503).json({
        message:
          "Email service is not configured. Please try again later or contact support.",
      });
    }

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
