const PG = require("../models/PG");
const cloudinary = require("../utils/cloudinary");

// =====================
// ADD PG LISTING (Owner)
// =====================
exports.addPG = async (req, res) => {
  try {
    const {
      title,
      description,
      address,
      city,
      rent,
      roomType,
      contactPhone,
      deposit,
      nearbyCollege,
      facilities,
    } = req.body;

    if (
      !title ||
      !description ||
      !address ||
      !city ||
      !rent ||
      !roomType ||
      !contactPhone
    ) {
      return res.status(400).json({
        message: "Required fields are missing",
      });
    }

    const pg = await PG.create({
      ownerId: req.user._id,
      name: title, // title → name
      city,
      rent,
      gender: roomType, // map correctly
      amenities: facilities,
    });

    res.status(201).json({
      message: "PG created successfully",
      pgId: pg._id,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create listing",
      error: error.message,
    });
  }
};

// =====================
// UPLOAD IMAGES TO LISTING
// =====================
exports.uploadListingImages = async (req, res) => {
  try {
    const { listingId } = req.params;

    const pg = await PG.findById(listingId);
    if (!pg) {
      return res.status(404).json({ message: "PG not found" });
    }

    if (pg.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const uploadedImages = [];

    for (const file of req.files) {
      const result = await cloudinary.uploader.upload(file.path);
      uploadedImages.push({
        url: result.secure_url,
        public_id: result.public_id,
      });
    }

    pg.images = pg.images || [];
    pg.images.push(...uploadedImages);
    await pg.save();

    res.status(200).json({
      message: "Images uploaded successfully",
      images: uploadedImages,
    });
  } catch (error) {
    res.status(500).json({
      message: "Image upload failed",
      error: error.message,
    });
  }
};
