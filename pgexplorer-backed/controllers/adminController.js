const User = require("../models/user");
const PG = require("../models/PG");
const Booking = require("../models/Booking");
const Student = require("../models/Student");
const Owner = require("../models/owner");
const Announcement = require("../models/Announcement");
const cloudinary = require("../utils/cloudinary");

const ALLOWED_ANNOUNCEMENT_ROLES = new Set(["student", "owner", "admin"]);

const normalizeRoles = (value) => {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : [value];
  const normalized = raw
    .map((r) =>
      String(r || "")
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean);
  // If user explicitly sends "all", treat as broadcast to all roles.
  if (normalized.includes("all")) return [];
  // Dedupe + validate
  const out = [];
  for (const r of normalized) {
    if (!ALLOWED_ANNOUNCEMENT_ROLES.has(r)) continue;
    if (!out.includes(r)) out.push(r);
  }
  return out;
};

const safeInt = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

const isCloudinaryConfigured = () => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
    process.env;
  return Boolean(
    CLOUDINARY_CLOUD_NAME &&
    CLOUDINARY_API_KEY &&
    CLOUDINARY_API_SECRET &&
    [CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET].every(
      (v) => String(v || "").trim().length > 0,
    ),
  );
};

const parseCloudinaryVersion = (url) => {
  const m = String(url || "").match(/\/v(\d+)\//);
  return m ? Number(m[1]) : undefined;
};

const looksLocalUpload = ({ url, publicId }) => {
  const u = String(url || "");
  const pid = String(publicId || "");
  return pid.startsWith("local:") || u.includes("/uploads/");
};

exports.getDashboard = async (req, res) => {
  try {
    const [userCounts, pgCounts, bookingCounts] = await Promise.all([
      User.aggregate([
        { $group: { _id: "$role", count: { $sum: 1 } } },
        { $project: { _id: 0, role: "$_id", count: 1 } },
      ]),
      PG.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $project: { _id: 0, status: "$_id", count: 1 } },
      ]),
      Booking.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $project: { _id: 0, status: "$_id", count: 1 } },
      ]),
    ]);

    const topCities = await PG.aggregate([
      { $group: { _id: "$city", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, city: "$_id", count: 1 } },
    ]);

    const mostBooked = await Booking.aggregate([
      { $group: { _id: "$pg", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "pgs",
          localField: "_id",
          foreignField: "_id",
          as: "pg",
        },
      },
      { $unwind: { path: "$pg", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          pgId: "$_id",
          count: 1,
          name: "$pg.name",
          city: "$pg.city",
          rent: "$pg.rent",
        },
      },
    ]);

    const totalUsers = userCounts.reduce((sum, x) => sum + (x.count || 0), 0);
    const totalPGs = pgCounts.reduce((sum, x) => sum + (x.count || 0), 0);
    const totalBookings = bookingCounts.reduce(
      (sum, x) => sum + (x.count || 0),
      0,
    );

    // Return both legacy keys and UI-friendly keys.
    res.json({
      // Totals
      totalUsers,
      totalPGs,
      totalBookings,

      // UI keys
      usersByRole: userCounts,
      pgsByStatus: pgCounts,
      bookingsByStatus: bookingCounts,
      topCities,
      mostBooked,

      // Legacy keys
      userCounts,
      pgCounts,
      bookingCounts,
    });
  } catch (err) {
    console.error("ADMIN DASHBOARD ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.listUsers = async (req, res) => {
  try {
    const role = req.query.role ? String(req.query.role).trim() : "";
    const filter = {};
    if (role) filter.role = role;

    const limit = Math.min(200, Math.max(1, safeInt(req.query.limit) || 50));
    const page = Math.max(1, safeInt(req.query.page) || 1);
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("email role isBlocked createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    const userIds = users.map((u) => u._id);
    const [studentProfiles, ownerProfiles] = await Promise.all([
      Student.find({ userId: { $in: userIds } })
        .select("userId name")
        .lean(),
      Owner.find({ userId: { $in: userIds } })
        .select("userId name phone city")
        .lean(),
    ]);

    const studentNameByUserId = new Map(
      studentProfiles.map((s) => [String(s.userId), s.name]),
    );
    const ownerByUserId = new Map(
      ownerProfiles.map((o) => [String(o.userId), o]),
    );

    const shaped = users.map((u) => {
      const uid = String(u._id);
      const owner = ownerByUserId.get(uid);
      const name =
        u.role === "student"
          ? studentNameByUserId.get(uid) || ""
          : u.role === "owner"
            ? owner?.name || ""
            : "";

      return {
        ...u,
        name: name || undefined,
        ownerProfile:
          u.role === "owner"
            ? {
                phone: owner?.phone,
                city: owner?.city,
              }
            : undefined,
        blocked: Boolean(u.isBlocked),
      };
    });

    res.json({ users: shaped, page, limit, total });
  } catch (err) {
    console.error("ADMIN LIST USERS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.setUserBlocked = async (req, res) => {
  try {
    const blocked = Boolean(req.body.blocked);
    const target = await User.findById(req.params.userId).select(
      "email role isBlocked",
    );

    if (!target) return res.status(404).json({ message: "User not found" });

    if (String(target.role).toLowerCase() === "admin") {
      return res.status(403).json({ message: "Admins cannot be blocked" });
    }

    target.isBlocked = blocked;
    const updated = await target.save();
    res.json({
      _id: updated._id,
      email: updated.email,
      role: updated.role,
      isBlocked: updated.isBlocked,
      blocked: Boolean(updated.isBlocked),
    });
  } catch (err) {
    console.error("ADMIN BLOCK USER ERROR:", err);
    res.status(400).json({ message: "Invalid user id" });
  }
};

exports.listPGs = async (req, res) => {
  try {
    const status = req.query.status ? String(req.query.status) : "";
    const filter = {};
    if (status) filter.status = status;

    const pgs = await PG.find(filter)
      .populate("ownerId", "email")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    res.json(pgs);
  } catch (err) {
    console.error("ADMIN LIST PGS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getPGPropertyPaperUrl = async (req, res) => {
  try {
    if (!isCloudinaryConfigured()) {
      return res.status(503).json({
        message:
          "File storage is not configured. Configure Cloudinary to view property papers.",
      });
    }

    const pg = await PG.findById(req.params.pgId)
      .select("propertyPaper")
      .lean();

    if (!pg) return res.status(404).json({ message: "PG not found" });

    const url = String(pg.propertyPaper?.url || "");
    const publicId = String(pg.propertyPaper?.public_id || "");

    if (!url || !publicId) {
      return res.status(404).json({ message: "Property paper not found" });
    }

    if (looksLocalUpload({ url, publicId })) {
      return res.status(410).json({
        message:
          "This property paper was uploaded using local storage and is not available in production.",
      });
    }

    const version = parseCloudinaryVersion(url);
    const resourceType = url.includes("/raw/upload/") ? "raw" : "image";
    const isPdf =
      String(pg.propertyPaper?.mimeType || "").includes("pdf") ||
      url.toLowerCase().endsWith(".pdf") ||
      String(pg.propertyPaper?.originalName || "")
        .toLowerCase()
        .endsWith(".pdf");

    const signedUrl = cloudinary.url(publicId, {
      secure: true,
      sign_url: true,
      type: "upload",
      resource_type: resourceType,
      version,
      ...(isPdf ? { format: "pdf" } : null),
    });

    return res.json({ url: signedUrl });
  } catch (err) {
    console.error("ADMIN GET PROPERTY PAPER URL ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.setPGStatus = async (req, res) => {
  try {
    const allowed = new Set([
      "draft",
      "pending",
      "active",
      "inactive",
      "rejected",
    ]);
    const status = String(req.body.status || "").trim();
    if (!allowed.has(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updated = await PG.findByIdAndUpdate(
      req.params.pgId,
      { status },
      { new: true, runValidators: true },
    );

    if (!updated) return res.status(404).json({ message: "PG not found" });
    res.json(updated);
  } catch (err) {
    console.error("ADMIN SET PG STATUS ERROR:", err);
    res.status(400).json({ message: "Invalid PG id" });
  }
};

exports.deletePG = async (req, res) => {
  try {
    const pg = await PG.findById(req.params.pgId);
    if (!pg) return res.status(404).json({ message: "PG not found" });

    await Booking.deleteMany({ pg: pg._id });
    await PG.deleteOne({ _id: pg._id });
    res.json({ message: "PG deleted" });
  } catch (err) {
    console.error("ADMIN DELETE PG ERROR:", err);
    res.status(400).json({ message: "Invalid PG id" });
  }
};

exports.listBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate("pg")
      .populate("student", "email")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    res.json(bookings);
  } catch (err) {
    console.error("ADMIN LIST BOOKINGS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAnnouncements = async (req, res) => {
  try {
    const list = await Announcement.find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Keep payload stable for frontend
    res.json(
      list.map((a) => ({
        id: String(a._id),
        title: a.title || undefined,
        message: a.message,
        roles: Array.isArray(a.roles) ? a.roles : undefined,
        createdAt: a.createdAt
          ? new Date(a.createdAt).toISOString()
          : undefined,
      })),
    );
  } catch (err) {
    console.error("ADMIN GET ANNOUNCEMENTS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.postAnnouncement = async (req, res) => {
  try {
    const title = String(req.body.title || "").trim();
    const message = String(req.body.message || "").trim();
    if (!message)
      return res.status(400).json({ message: "Message is required" });

    const roles = normalizeRoles(req.body.roles);

    const created = await Announcement.create({
      title,
      message,
      roles: roles.length ? roles : undefined,
      createdBy: req.user._id,
    });

    const item = {
      id: String(created._id),
      title: created.title || undefined,
      message: created.message,
      roles: Array.isArray(created.roles) ? created.roles : undefined,
      createdAt: created.createdAt
        ? new Date(created.createdAt).toISOString()
        : new Date().toISOString(),
    };

    // Broadcast via Socket.IO if available
    const io = req.app.get("io");
    if (io) {
      if (roles.length === 0) {
        io.emit("announcement:new", item);
      } else {
        for (const r of roles) {
          io.to(`role:${r}`).emit("announcement:new", item);
        }
      }
    }

    res.status(201).json(item);
  } catch (err) {
    console.error("ADMIN POST ANNOUNCEMENT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
