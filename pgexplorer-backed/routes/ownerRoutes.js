const express = require("express");
const router = express.Router();

// Use the unified auth registration flow (OTP + email verification)
const { registerUser } = require("../controllers/authController");

router.post("/register", (req, res, next) => {
  // Force owner role while reusing the shared registration handler.
  req.body = { ...(req.body || {}), role: "owner" };
  return registerUser(req, res, next);
});

module.exports = router;
