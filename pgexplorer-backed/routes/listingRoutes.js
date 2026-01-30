const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const { addPG } = require("../controllers/listingController");

// =====================
// OWNER: ADD PG LISTING
// =====================
router.post("/add-pg", authMiddleware, roleMiddleware("owner"), addPG);

module.exports = router;
const upload = require("../middleware/uploadMiddleware");
const { uploadListingImages } = require("../controllers/listingController");

// =====================
// OWNER: UPLOAD PG IMAGES
// =====================
router.post(
  "/:listingId/upload-images",
  authMiddleware,
  roleMiddleware("owner"),
  upload.array("images", 5),
  uploadListingImages
);
