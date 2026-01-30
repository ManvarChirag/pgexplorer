const Booking = require("../models/Booking");
const PG = require("../models/PG");

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

    // 2️⃣ Prevent duplicate booking
    const existingBooking = await Booking.findOne({
      pg: pg._id,
      student: req.user._id,
    });

    if (existingBooking) {
      return res.status(400).json({ message: "You already requested this PG" });
    }

    const booking = await Booking.create({
      pg: pg._id,
      student: req.user._id,
      status: "pending",
    });

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
Owner → View Bookings
GET /api/booking/owner
================================
*/



exports.getOwnerBookings = async (req, res) => {
  try {
    // 1️⃣ Get all bookings (no filter)
    const bookings = await Booking.find()
      .populate("pg")
      .populate("student", "name email");

    // 2️⃣ Manually filter by PG owner
    const ownerBookings = bookings.filter(
      (b) =>
        b.pg &&
        b.pg.ownerId &&
        b.pg.ownerId.toString() === req.user._id.toString(),
    );

    res.json(ownerBookings);
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

    // 2️⃣ Find booking
    const booking = await Booking.findById(req.params.bookingId);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // 3️⃣ Authorization check
    if (booking.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // 4️⃣ Allow update only if pending
    if (booking.status !== "pending") {
      return res.status(400).json({ message: "Booking already processed" });
    }

    // 5️⃣ Update status
    booking.status = status;
    await booking.save();

    // 6️⃣ OPTIONAL (Recommended): auto-reject others if approved
    if (status === "approved") {
      await Booking.updateMany(
        {
          pg: booking.pg,
          _id: { $ne: booking._id },
          status: "pending",
        },
        { status: "rejected" },
      );
    }

    const updatedBooking = await Booking.findById(booking._id)
      .populate("student", "name email")
      .populate("pg", "name city rent");

    res.json({
      message: `Booking ${status} successfully`,
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Update booking error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
