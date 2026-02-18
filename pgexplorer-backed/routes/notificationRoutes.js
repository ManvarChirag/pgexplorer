const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const { getNotifications } = require("../controllers/notificationController");

// Sync missed notifications based on Booking updates (no new DB schema)
router.get("/", protect, getNotifications);

module.exports = router;
