const express = require("express");
const router = express.Router();

const {
  createBookingRequest,
  getOwnerBookings,
  updateBookingStatus,
  getStudentBookings,
} = require("../controllers/bookingController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

// Student → Create Booking
router.post(
  "/request/:listingId",
  protect,
  authorize("student"),
  createBookingRequest,
);

// Student → View Bookings
router.get("/student", protect, authorize("student"), getStudentBookings);

// Owner → View Bookings
router.get("/owner", protect, authorize("owner"), getOwnerBookings);

// Owner → Update Booking Status
router.put(
  "/:bookingId/status",
  protect,
  authorize("owner"),
  updateBookingStatus,
);

module.exports = router;
