const multer = require("multer");
const path = require("path");

const uploadsDir = path.join(__dirname, "..", "uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const base = path
      .basename(file.originalname || "image", ext)
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 60);
    cb(
      null,
      `${Date.now()}_${Math.random().toString(16).slice(2)}_${base}${ext}`,
    );
  },
});

const fileFilter = (req, file, cb) => {
  const field = String(file.fieldname || "");
  const mime = String(file.mimetype || "");
  const ext = path.extname(file.originalname || "").toLowerCase();

  // Default behavior: only allow images.
  // Special case for PG property papers: allow PDF or image.
  if (field === "propertyPaper") {
    const looksLikePdf =
      mime === "application/pdf" ||
      mime === "application/x-pdf" ||
      mime === "application/acrobat" ||
      mime === "application/vnd.pdf" ||
      ext === ".pdf";

    if (looksLikePdf || mime.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF or image files are allowed"), false);
    }
    return;
  }

  if (mime.startsWith("image/")) cb(null, true);
  else cb(new Error("Only image files are allowed"), false);
};

const upload = multer({
  storage,
  fileFilter,
});

module.exports = upload;
