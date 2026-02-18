const Booking = require("../models/Booking");
const PG = require("../models/PG");
const Announcement = require("../models/Announcement");

const parseSince = (raw) => {
  if (!raw) return null;

  // allow epoch millis or ISO string
  const asNumber = Number(raw);
  if (!Number.isNaN(asNumber) && Number.isFinite(asNumber)) {
    const d = new Date(asNumber);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(String(raw));
  return Number.isNaN(d.getTime()) ? null : d;
};

const bookingToEvent = (b, sinceDate) => {
  const createdAt = b.createdAt ? new Date(b.createdAt) : null;
  const updatedAt = b.updatedAt ? new Date(b.updatedAt) : null;

  const pgId = b.pg && typeof b.pg === "object" ? b.pg._id : b.pg;
  const pgName = b.pg && typeof b.pg === "object" ? b.pg.name : undefined;
  const city = b.pg && typeof b.pg === "object" ? b.pg.city : undefined;

  const payload = {
    bookingId: String(b._id),
    status: b.status,
    pgId: pgId ? String(pgId) : undefined,
    pgName,
    city,
    createdAt: createdAt ? createdAt.toISOString() : undefined,
    updatedAt: updatedAt ? updatedAt.toISOString() : undefined,
  };

  // Treat newly created bookings after `since` as booking:new.
  if (sinceDate && createdAt && createdAt > sinceDate) {
    return { type: "booking:new", payload, ts: createdAt };
  }

  // For initial sync (no since), treat pending as a new request.
  if (!sinceDate && b.status === "pending") {
    return { type: "booking:new", payload, ts: createdAt || updatedAt };
  }

  // If cancelled, surface as a cancelled event.
  if (b.status === "cancelled") {
    return { type: "booking:cancelled", payload, ts: updatedAt || createdAt };
  }

  return { type: "booking:updated", payload, ts: updatedAt || createdAt };
};

exports.getNotifications = async (req, res) => {
  try {
    const since = parseSince(req.query.since);

    // Sync booking-based notifications + persisted announcements.
    const role = String(req.user?.role || "");
    const userId = req.user?._id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    let bookingQuery = {};

    const includeBookings = role === "student" || role === "owner";

    if (role === "student") {
      bookingQuery.student = userId;
    } else if (role === "owner") {
      const pgs = await PG.find({ ownerId: userId }).select("_id").lean();
      const pgIds = pgs.map((p) => p._id);
      bookingQuery.pg = { $in: pgIds };
    }

    const announcementsQuery = {
      $or: [{ roles: { $exists: false } }, { roles: { $size: 0 } }, { roles: role }],
    };
    if (since) announcementsQuery.createdAt = { $gt: since };

    const [updatedBookings, pendingRequests, anns] = await Promise.all([
      includeBookings
        ? Booking.find({
            ...bookingQuery,
            ...(since ? { updatedAt: { $gt: since } } : {}),
          })
            .populate("pg", "name city")
            .sort({ updatedAt: -1 })
            .limit(50)
            .lean()
        : Promise.resolve([]),

      // Instagram-like: for owners, always include CURRENT pending requests
      role === "owner"
        ? Booking.find({
            ...(bookingQuery.pg ? { pg: bookingQuery.pg } : {}),
            status: "pending",
          })
            .populate("pg", "name city")
            .sort({ createdAt: -1 })
            .limit(50)
            .lean()
        : Promise.resolve([]),

      Announcement.find(announcementsQuery)
        .sort({ createdAt: -1 })
        .limit(since ? 50 : 20)
        .lean(),
    ]);

    // Merge and de-duplicate by bookingId
    const mergedById = new Map();
    for (const b of [...pendingRequests, ...updatedBookings]) {
      if (!b?._id) continue;
      mergedById.set(String(b._id), b);
    }

    const merged = Array.from(mergedById.values())
      .sort((a, b) => {
        const at = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const bt = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return bt - at;
      })
      .slice(0, 50);

    const bookingEvents = merged
      .map((b) => bookingToEvent(b, since))
      .filter(Boolean)
      .map((e) => ({ type: e.type, payload: e.payload }));

    const announcementEvents = (Array.isArray(anns) ? anns : []).map((a) => ({
      type: "announcement",
      payload: {
        id: String(a._id),
        title: a.title || undefined,
        message: a.message,
        roles: Array.isArray(a.roles) ? a.roles : undefined,
        createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : undefined,
      },
    }));

    // Merge (client sorts newest-first).
    const events = [...announcementEvents, ...bookingEvents].slice(0, 50);

    return res.json({ since: since ? since.toISOString() : null, events });
  } catch (err) {
    console.error("GET NOTIFICATIONS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
