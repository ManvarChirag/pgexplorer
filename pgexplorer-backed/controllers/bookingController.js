const Booking = require("../models/Booking");
const PG = require("../models/PG");
const Owner = require("../models/owner");
const Student = require("../models/Student");
const User = require("../models/user");
const { sendEmail } = require("../utils/email");

/*
================================
Student → Create Booking
POST /api/booking/request/:listingId
================================
*/
exports.createBookingRequest = async (req, res) => {
  try {
    const { listingId } = req.params;

    // 1️⃣ Find PG
    const pg = await PG.findById(listingId);
    if (!pg) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // 1.5️⃣ Block booking when no rooms are available
    if (Number(pg.availableRooms || 0) <= 0) {
      return res.status(400).json({ message: "No rooms available" });
    }

    // 2️⃣ Prevent duplicate booking
    const existingBooking = await Booking.findOne({
      pg: pg._id,
      student: req.user._id,
      status: { $ne: "cancelled" },
    });

    if (existingBooking) {
      return res.status(400).json({ message: "You already requested this PG" });
    }

    const booking = await Booking.create({
      pg: pg._id,
      student: req.user._id,
      status: "pending",
    });

    // Realtime notify owner + email
    const io = req.app.get("io");
    if (io && pg.ownerId) {
      io.to(`user:${String(pg.ownerId)}`).emit("booking:new", {
        bookingId: String(booking._id),
        pgId: String(pg._id),
        pgName: pg.name,
        city: pg.city,
        createdAt: booking.createdAt,
      });
    }

    try {
      const ownerUser = pg.ownerId
        ? await User.findById(pg.ownerId).select("email")
        : null;
      if (ownerUser?.email) {
        await sendEmail({
          to: ownerUser.email,
          subject: "New booking request - PG Explorer",
          text: `You received a new booking request for ${pg.name} (${pg.city}).`,
        });
      }
    } catch (e) {
      console.warn("Owner booking email failed:", e?.message || e);
    }

    res.status(201).json({
      message: "Booking request sent",
      booking,
    });
  } catch (error) {
    console.error("Create booking error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/*
================================
Student → Cancel Own Booking
DELETE /api/booking/:bookingId
================================
*/
exports.cancelStudentBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .populate("pg", "name city rent")
      .exec();

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (String(booking.student) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (booking.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Only pending bookings can be cancelled" });
    }

    booking.status = "cancelled";
    await booking.save();

    // Realtime notify owner (if booking includes PG)
    const io = req.app.get("io");
    if (io && booking.pg?._id) {
      const pg = await PG.findById(booking.pg._id).select("ownerId name city");
      if (pg?.ownerId) {
        io.to(`user:${String(pg.ownerId)}`).emit("booking:cancelled", {
          bookingId: String(booking._id),
          pgId: String(pg._id),
          pgName: pg.name,
          city: pg.city,
        });
      }
    }

    res.json({ message: "Booking cancelled", booking });
  } catch (error) {
    console.error("Cancel booking error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/*
================================
Owner → View Bookings
GET /api/booking/owner
================================
*/

exports.getOwnerBookings = async (req, res) => {
  try {
    // Owner identity (supports legacy data where PG.ownerId accidentally stored Owner._id)
    const ownerProfile = await Owner.findOne({ userId: req.user._id }).select(
      "_id",
    );

    // 1) Fetch bookings + PG + student user (for email)
    const bookings = await Booking.find()
      .populate("pg")
      .populate("student", "email")
      .sort({ createdAt: -1 })
      .lean();

    // 2) Filter to only bookings for PGs owned by this user
    const ownerBookings = bookings.filter((b) => {
      const ownerId = b?.pg?.ownerId;
      if (!ownerId) return false;

      const ownerIdStr = ownerId.toString();
      if (ownerIdStr === req.user._id.toString()) return true;

      // Legacy compatibility
      if (ownerProfile && ownerIdStr === ownerProfile._id.toString())
        return true;

      return false;
    });

    // 3) Attach student name (Booking.student references User, name lives in Student profile)
    const studentUserIds = Array.from(
      new Set(
        ownerBookings
          .map((b) => b?.student?._id)
          .filter(Boolean)
          .map((id) => id.toString()),
      ),
    );

    const studentProfiles = await Student.find(
      { userId: { $in: studentUserIds } },
      "name userId",
    ).lean();

    const nameByUserId = new Map(
      studentProfiles.map((s) => [s.userId.toString(), s.name]),
    );

    const enriched = ownerBookings.map((b) => {
      const student = b.student
        ? {
            ...b.student,
            name: nameByUserId.get(b.student._id.toString()) ?? undefined,
          }
        : b.student;

      return { ...b, student };
    });

    res.json(enriched);
  } catch (error) {
    console.error("Owner bookings error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/*
================================
Student → View Own Bookings
GET /api/booking/student
================================
*/
exports.getStudentBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ student: req.user._id })
      .populate("pg", "name city rent gender")
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    console.error("Student bookings error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/*
================================
Student → View One Booking (Summary)
GET /api/booking/student/:bookingId
================================
*/
exports.getStudentBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .populate(
        "pg",
        "name city rent gender roomType ac address amenities images totalRooms availableRooms",
      )
      .exec();

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (String(booking.student) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    res.json(booking);
  } catch (error) {
    console.error("Student booking by id error:", error);
    res.status(400).json({ message: "Invalid booking id" });
  }
};

/*
================================
Owner → Approve / Reject Booking
PUT /api/booking/:bookingId/status  
================================
*/
exports.updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;

    // 1️⃣ Validate status
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // 2️⃣ Find booking + PG for ownership check
    const booking = await Booking.findById(req.params.bookingId)
      .populate("pg", "ownerId")
      .exec();

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // 3️⃣ Authorization check (owner must own the PG)
    const ownerProfile = await Owner.findOne({ userId: req.user._id }).select(
      "_id",
    );

    const pgOwnerId = booking?.pg?.ownerId;
    if (!pgOwnerId) {
      return res.status(400).json({ message: "Booking PG is missing" });
    }

    const pgOwnerIdStr = pgOwnerId.toString();
    const isOwnerUser = pgOwnerIdStr === req.user._id.toString();
    const isLegacyOwner =
      ownerProfile && pgOwnerIdStr === ownerProfile._id.toString();

    if (!isOwnerUser && !isLegacyOwner) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // 4️⃣ Allow update only if pending
    if (booking.status !== "pending") {
      return res.status(400).json({ message: "Booking already processed" });
    }

    // 5️⃣ If approving, decrement available rooms first (prevents overbooking)
    const pgId = booking.pg?._id ? booking.pg._id : booking.pg;
    let pgAfterApproval = null;
    if (status === "approved") {
      pgAfterApproval = await PG.findOneAndUpdate(
        { _id: pgId, availableRooms: { $gt: 0 } },
        { $inc: { availableRooms: -1 } },
        // Use both options for compatibility across mongoose/mongodb driver versions
        { new: true, returnDocument: "after" },
      ).select("availableRooms");

      if (!pgAfterApproval) {
        return res
          .status(400)
          .json({ message: "No rooms available. Cannot approve booking." });
      }
    }

    // 6️⃣ Update booking status
    booking.status = status;
    await booking.save();

    // 7️⃣ OPTIONAL: auto-reject others only when no rooms remain
    if (
      status === "approved" &&
      pgAfterApproval &&
      Number(pgAfterApproval.availableRooms || 0) <= 0
    ) {
      await Booking.updateMany(
        {
          pg: pgId,
          _id: { $ne: booking._id },
          status: "pending",
        },
        { status: "rejected" },
      );
    }

    const updatedBooking = await Booking.findById(booking._id)
      .populate("student", "email")
      .populate("pg", "name city rent");

    // Add student name if available
    let studentName;
    if (updatedBooking?.student?._id) {
      const studentProfile = await Student.findOne({
        userId: updatedBooking.student._id,
      }).select("name");
      studentName = studentProfile?.name;
    }

    const bookingJson = updatedBooking.toObject();
    if (bookingJson.student && studentName) {
      bookingJson.student.name = studentName;
    }

    const availability =
      status === "approved" && pgAfterApproval
        ? {
            pgId: String(pgId),
            availableRooms: Number(pgAfterApproval.availableRooms || 0),
          }
        : undefined;

    res.json({
      message: `Booking ${status} successfully`,
      booking: bookingJson,
      availability,
    });

    // Realtime notify student + email
    const io = req.app.get("io");
    if (io && updatedBooking?.student?._id) {
      io.to(`user:${String(updatedBooking.student._id)}`).emit(
        "booking:updated",
        {
          bookingId: String(updatedBooking._id),
          status: String(status),
          pgId: updatedBooking.pg?._id
            ? String(updatedBooking.pg._id)
            : undefined,
          pgName: updatedBooking.pg?.name,
          city: updatedBooking.pg?.city,
          updatedAt: new Date().toISOString(),
        },
      );
    }

    try {
      const studentEmail = updatedBooking?.student?.email;
      if (studentEmail) {
        await sendEmail({
          to: studentEmail,
          subject: `Booking ${status} - PG Explorer`,
          text: `Your booking for ${updatedBooking.pg?.name || "PG"} was ${status}.`,
        });
      }
    } catch (e) {
      console.warn("Student booking update email failed:", e?.message || e);
    }
  } catch (error) {
    console.error("Update booking error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
