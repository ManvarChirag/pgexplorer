const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  getDashboard,
  listUsers,
  setUserBlocked,
  listPGs,
  getPGPropertyPaperUrl,
  setPGStatus,
  deletePG,
  listBookings,
  getAnnouncements,
  postAnnouncement,
} = require("../controllers/adminController");

router.use(protect, authorize("admin"));

router.get("/dashboard", getDashboard);

router.get("/users", listUsers);
router.patch("/users/:userId/block", setUserBlocked);

router.get("/pgs", listPGs);
router.get("/pgs/:pgId/property-paper-url", getPGPropertyPaperUrl);
router.patch("/pgs/:pgId/status", setPGStatus);
router.delete("/pgs/:pgId", deletePG);

router.get("/bookings", listBookings);

router.get("/announcements", getAnnouncements);
router.post("/announcements", postAnnouncement);

module.exports = router;
