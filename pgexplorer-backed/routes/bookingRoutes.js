const express = require("express");
const router = express.Router();

const {
  createBookingRequest,
  getOwnerBookings,
  updateBookingStatus,
  getStudentBookings,
  getStudentBookingById,
  cancelStudentBooking,
  downloadBookingInvoice,
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

// Student → View One Booking (Summary)
router.get(
  "/student/:bookingId",
  protect,
  authorize("student"),
  getStudentBookingById,
);

// Student → Cancel Booking (keeps history by marking cancelled)
router.delete(
  "/:bookingId",
  protect,
  authorize("student"),
  cancelStudentBooking,
);

// Owner → View Bookings
router.get("/owner", protect, authorize("owner"), getOwnerBookings);

// Owner → Update Booking Status
router.put(
  "/:bookingId/status",
  protect,
  authorize("owner"),
  updateBookingStatus,
);

// Owner/Student → Download invoice PDF (approved bookings only)
router.get(
  "/:bookingId/invoice",
  protect,
  authorize("student", "owner"),
  downloadBookingInvoice,
);

module.exports = router;
