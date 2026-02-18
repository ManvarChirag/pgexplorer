const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const cloudinary = require("../utils/cloudinary");
const mongoose = require("mongoose");

const PG = require("../models/PG");
const Booking = require("../models/Booking");
const Owner = require("../models/owner");

const ALLOWED_ROOM_TYPES = new Set(["single", "shared"]);

const normalizeRoomType = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const toNonNegativeInt = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.trunc(n));
};

const validateRoomCounts = ({ totalRooms, availableRooms }) => {
  if (totalRooms < 0 || availableRooms < 0) {
    return "Rooms cannot be negative";
  }
  if (availableRooms > totalRooms) {
    return "Available rooms cannot be greater than total rooms";
  }
  return null;
};

const isCloudinaryConfigured = () => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
    process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return false;
  }
  // treat placeholder values as not configured
  if (
    [CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET].some(
      (v) => String(v).toLowerCase().includes("xxxx"),
    )
  ) {
    return false;
  }
  return true;
};

const toNumberOrZero = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const parseAmenities = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

const toBool = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value !== "string") return false;
  return value.toLowerCase() === "true" || value === "1";
};

router.post(
  "/add",
  auth,
  upload.fields([
    { name: "images", maxCount: 5 },
    { name: "propertyPaper", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
    const owner = await Owner.findOne({ userId: req.user._id });
    if (!owner) {
      return res.status(403).json({ message: "Only owners can add PG" });
    }

    const { name, city, rent } = req.body;
    if (!name || !city || !rent) {
      return res
        .status(400)
        .json({ message: "name, city and rent are required" });
    }

    const imageFiles = Array.isArray(req.files?.images) ? req.files.images : [];
    const paperFile = Array.isArray(req.files?.propertyPaper)
      ? req.files.propertyPaper[0]
      : null;

    if (!imageFiles || imageFiles.length < 1) {
      return res.status(400).json({ message: "At least 1 image is required" });
    }

    if (!paperFile) {
      return res
        .status(400)
        .json({ message: "PG property paper is required" });
    }

    const images = [];
    const cloudEnabled = isCloudinaryConfigured();
    for (const file of imageFiles) {
      if (cloudEnabled) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: "pgexplorer/pgs",
        });
        images.push({ url: result.secure_url, public_id: result.public_id });
      } else {
        // Local fallback: file is saved under /uploads by multer
        images.push({
          url: `${req.protocol}://${req.get("host")}/uploads/${file.filename}`,
          public_id: `local:${file.filename}`,
        });
      }
    }

    let propertyPaper;
    if (cloudEnabled) {
      const result = await cloudinary.uploader.upload(paperFile.path, {
        folder: "pgexplorer/property-papers",
        resource_type: "auto",
      });
      propertyPaper = {
        url: result.secure_url,
        public_id: result.public_id,
        originalName: paperFile.originalname,
        mimeType: paperFile.mimetype,
      };
    } else {
      propertyPaper = {
        url: `${req.protocol}://${req.get("host")}/uploads/${paperFile.filename}`,
        public_id: `local:${paperFile.filename}`,
        originalName: paperFile.originalname,
        mimeType: paperFile.mimetype,
      };
    }

    const roomType = req.body.roomType
      ? normalizeRoomType(req.body.roomType)
      : "single";
    if (roomType && !ALLOWED_ROOM_TYPES.has(roomType)) {
      return res
        .status(400)
        .json({ message: "Room type must be single or shared" });
    }

    const totalRooms = toNonNegativeInt(req.body.totalRooms);
    const availableRooms = toNonNegativeInt(req.body.availableRooms);
    const roomErr = validateRoomCounts({ totalRooms, availableRooms });
    if (roomErr) {
      return res.status(400).json({ message: roomErr });
    }

    const pg = await PG.create({
      // Store the User id for ownership checks (matches PG model definition)
      ownerId: req.user._id,
      status: "pending",
      name: String(req.body.name),
      city: String(req.body.city),
      rent: toNumberOrZero(req.body.rent),
      gender: req.body.gender ? String(req.body.gender) : undefined,
      roomType,
      ac:
        String(req.body.ac).toLowerCase() === "true" ||
        String(req.body.ac) === "1",
      deposit: toNumberOrZero(req.body.deposit),
      maintenance: toNumberOrZero(req.body.maintenance),
      address: req.body.address ? String(req.body.address) : "",
      description: req.body.description ? String(req.body.description) : "",
      rules: req.body.rules ? String(req.body.rules) : "",
      totalRooms,
      availableRooms,
      amenities: parseAmenities(req.body.amenities),
      images,
      propertyPaper,
    });

      res.status(201).json(pg);
    } catch (err) {
      console.error("ADD PG ERROR:", err);
      res.status(500).json({ message: err.message || "Server error" });
    }
});

// Owner: list PGs created by current owner
router.get("/mine", auth, async (req, res) => {
  try {
    const owner = await Owner.findOne({ userId: req.user._id });
    if (!owner) {
      return res
        .status(403)
        .json({ message: "Only owners can view their PGs" });
    }

    const pgs = await PG.find({ ownerId: req.user._id }).sort({
      createdAt: -1,
    });
    res.json(pgs);
  } catch (err) {
    console.error("PG MINE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Owner: update PG (basic fields)
router.put("/:id", auth, async (req, res) => {
  try {
    const owner = await Owner.findOne({ userId: req.user._id });
    if (!owner) {
      return res.status(403).json({ message: "Only owners can update PG" });
    }

    const pg = await PG.findById(req.params.id);
    if (!pg) {
      return res.status(404).json({ message: "PG not found" });
    }

    if (String(pg.ownerId) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (typeof req.body.roomType !== "undefined") {
      const rt = req.body.roomType ? normalizeRoomType(req.body.roomType) : "";
      if (!rt || !ALLOWED_ROOM_TYPES.has(rt)) {
        return res
          .status(400)
          .json({ message: "Room type must be single or shared" });
      }
    }

    const updates = {
      ...(typeof req.body.name !== "undefined"
        ? { name: String(req.body.name) }
        : {}),
      ...(typeof req.body.city !== "undefined"
        ? { city: String(req.body.city) }
        : {}),
      ...(typeof req.body.gender !== "undefined"
        ? { gender: req.body.gender ? String(req.body.gender) : "" }
        : {}),
      ...(typeof req.body.roomType !== "undefined"
        ? { roomType: normalizeRoomType(req.body.roomType) }
        : {}),
      ...(typeof req.body.ac !== "undefined"
        ? { ac: toBool(req.body.ac) }
        : {}),
      ...(typeof req.body.rent !== "undefined"
        ? { rent: toNumberOrZero(req.body.rent) }
        : {}),
      ...(typeof req.body.deposit !== "undefined"
        ? { deposit: toNumberOrZero(req.body.deposit) }
        : {}),
      ...(typeof req.body.maintenance !== "undefined"
        ? { maintenance: toNumberOrZero(req.body.maintenance) }
        : {}),
      ...(typeof req.body.address !== "undefined"
        ? { address: req.body.address ? String(req.body.address) : "" }
        : {}),
      ...(typeof req.body.description !== "undefined"
        ? {
            description: req.body.description
              ? String(req.body.description)
              : "",
          }
        : {}),
      ...(typeof req.body.rules !== "undefined"
        ? { rules: req.body.rules ? String(req.body.rules) : "" }
        : {}),
      ...(typeof req.body.totalRooms !== "undefined"
        ? { totalRooms: toNonNegativeInt(req.body.totalRooms) }
        : {}),
      ...(typeof req.body.availableRooms !== "undefined"
        ? { availableRooms: toNonNegativeInt(req.body.availableRooms) }
        : {}),
      ...(typeof req.body.status !== "undefined"
        ? { status: String(req.body.status) }
        : {}),
      ...(typeof req.body.amenities !== "undefined"
        ? { amenities: parseAmenities(req.body.amenities) }
        : {}),
    };

    const wantsTotalUpdate = typeof updates.totalRooms !== "undefined";
    const wantsAvailableUpdate = typeof updates.availableRooms !== "undefined";

    let nextTotalRooms = wantsTotalUpdate ? updates.totalRooms : pg.totalRooms;
    let nextAvailableRooms = wantsAvailableUpdate
      ? updates.availableRooms
      : pg.availableRooms;

    // Room validations (optimized): keep consistent with approved bookings.
    if (wantsTotalUpdate || wantsAvailableUpdate) {
      const approvedCount = await Booking.countDocuments({
        pg: pg._id,
        status: "approved",
      });

      if (toNonNegativeInt(nextTotalRooms) < approvedCount) {
        return res.status(400).json({
          message: `Total rooms cannot be less than approved bookings (${approvedCount})`,
        });
      }

      const maxAvailable = Math.max(
        0,
        toNonNegativeInt(nextTotalRooms) - approvedCount,
      );

      // If owner only updates totalRooms, derive the correct availableRooms automatically.
      if (wantsTotalUpdate && !wantsAvailableUpdate) {
        updates.availableRooms = maxAvailable;
        nextAvailableRooms = maxAvailable;
      }

      // If availableRooms is provided, it must not exceed actual free rooms.
      if (
        wantsAvailableUpdate &&
        toNonNegativeInt(nextAvailableRooms) > maxAvailable
      ) {
        return res.status(400).json({
          message: `Available rooms cannot exceed free rooms (${maxAvailable})`,
        });
      }
    }

    const roomErr = validateRoomCounts({
      totalRooms: toNonNegativeInt(nextTotalRooms),
      availableRooms: toNonNegativeInt(nextAvailableRooms),
    });
    if (roomErr) {
      return res.status(400).json({ message: roomErr });
    }

    const updated = await PG.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    res.json(updated);
  } catch (err) {
    console.error("PG UPDATE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Owner: delete PG
router.delete("/:id", auth, async (req, res) => {
  try {
    const owner = await Owner.findOne({ userId: req.user._id });
    if (!owner) {
      return res.status(403).json({ message: "Only owners can delete PG" });
    }

    const pg = await PG.findById(req.params.id);
    if (!pg) {
      return res.status(404).json({ message: "PG not found" });
    }

    if (String(pg.ownerId) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    await PG.deleteOne({ _id: pg._id });
    res.json({ message: "PG deleted" });
  } catch (err) {
    console.error("PG DELETE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/search", async (req, res) => {
  try {
    const {
      city,
      gender,
      minRent,
      maxRent,
      roomType,
      ac,
      amenities,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    if (city) filter.city = city;
    if (gender) filter.gender = gender;
    if (roomType) {
      const rt = normalizeRoomType(roomType);
      if (!ALLOWED_ROOM_TYPES.has(rt)) {
        return res
          .status(400)
          .json({ message: "Room type must be single or shared" });
      }
      filter.roomType = rt;
    }
    if (typeof ac !== "undefined" && ac !== "") {
      filter.ac = String(ac).toLowerCase() === "true" || String(ac) === "1";
    }

    if (minRent || maxRent) {
      filter.rent = {};
      if (minRent) filter.rent.$gte = Number(minRent);
      if (maxRent) filter.rent.$lte = Number(maxRent);
    }

    if (amenities) {
      const list = String(amenities)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (list.length) {
        filter.amenities = { $all: list };
      }
    }

    const skip = (page - 1) * limit;

    const pgs = await PG.find(filter)
      .sort({ createdAt: -1 }) // latest first
      .skip(skip)
      .limit(Number(limit));

    res.json(pgs);
  } catch (err) {
    console.error("PG SEARCH ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Public: fetch multiple PGs by ids (for favorites)
// NOTE: keep this BEFORE '/:id' so it isn't treated as an id.
router.get("/by-ids", async (req, res) => {
  try {
    const raw = String(req.query.ids ?? "").trim();
    if (!raw) return res.json([]);

    const ids = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const unique = Array.from(new Set(ids)).slice(0, 50);
    const validIds = unique.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) return res.json([]);

    const pgs = await PG.find({ _id: { $in: validIds } }).sort({
      createdAt: -1,
    });
    res.json(pgs);
  } catch (err) {
    console.error("PG BY-IDS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Public: fetch PG details by id
// NOTE: keep this AFTER /search so '/search' isn't treated as an id.
router.get("/:id", async (req, res) => {
  try {
    const pg = await PG.findById(req.params.id);
    if (!pg) {
      return res.status(404).json({ message: "PG not found" });
    }
    res.json(pg);
  } catch (err) {
    res.status(400).json({ message: "Invalid PG id" });
  }
});

module.exports = router;
