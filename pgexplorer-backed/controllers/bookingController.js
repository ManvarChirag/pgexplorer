const Booking = require("../models/Booking");
const PG = require("../models/PG");
const Owner = require("../models/owner");
const Student = require("../models/Student");
const User = require("../models/user");
const { sendEmail } = require("../utils/email");
const PDFDocument = require("pdfkit");

const toNonNegativeInt = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.trunc(n));
};

const getApprovedBookingCountsByPgId = async (pgIds) => {
  const ids = Array.isArray(pgIds) ? pgIds.filter(Boolean) : [];
  if (ids.length === 0) return new Map();

  const rows = await Booking.aggregate([
    { $match: { status: "approved", pg: { $in: ids } } },
    { $group: { _id: "$pg", count: { $sum: 1 } } },
  ]);

  const map = new Map();
  for (const row of rows) {
    map.set(String(row._id), toNonNegativeInt(row.count));
  }
  return map;
};

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
    const pg = await PG.findById(listingId).select(
      "ownerId name city totalRooms availableRooms",
    );
    if (!pg) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // 1.5️⃣ Block booking when no rooms are available
    const totalRooms = toNonNegativeInt(pg.totalRooms);
    const approvedCount = await Booking.countDocuments({
      pg: pg._id,
      status: "approved",
    });
    const computedAvailableRooms = Math.max(
      0,
      totalRooms - toNonNegativeInt(approvedCount),
    );

    // Best-effort: keep stored field in sync so owner/admin views stay sensible.
    if (Number(pg.availableRooms || 0) !== computedAvailableRooms) {
      await PG.updateOne(
        { _id: pg._id },
        { $set: { availableRooms: computedAvailableRooms } },
      );
    }

    if (computedAvailableRooms <= 0) {
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
      .sort({ createdAt: -1 })
      .lean();

    const pgIds = Array.from(
      new Set(
        bookings
          .map((b) => b.pg)
          .filter(Boolean)
          .map(String),
      ),
    );

    const pgDocs = await PG.find({ _id: { $in: pgIds } })
      .select("name city rent gender totalRooms status")
      .lean();

    const pgById = new Map(pgDocs.map((pg) => [String(pg._id), pg]));

    const approvedCountByPgId = await getApprovedBookingCountsByPgId(
      pgDocs.map((p) => p._id),
    );

    const enriched = bookings.map((b) => {
      const pgId = b.pg ? String(b.pg) : "";
      const pg = pgId ? pgById.get(pgId) : null;

      if (!pg) {
        return {
          ...b,
          pgId,
          pg: {
            name: "PG deleted",
            city: "",
            rent: null,
            isDeleted: true,
          },
        };
      }

      const totalRooms = toNonNegativeInt(pg.totalRooms);
      const bookedRooms = approvedCountByPgId.get(String(pg._id)) ?? 0;
      const availableRooms = Math.max(0, totalRooms - bookedRooms);

      return {
        ...b,
        pgId,
        pg: {
          ...pg,
          availableRooms,
          isDeleted: pg.status === "inactive",
        },
      };
    });

    res.json(enriched);
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
    const booking = await Booking.findById(req.params.bookingId).lean();

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (String(booking.student) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const pgId = booking.pg ? String(booking.pg) : "";
    const pg = booking.pg
      ? await PG.findById(booking.pg)
          .select(
            "name city rent gender roomType ac address amenities images totalRooms status",
          )
          .lean()
      : null;

    if (!pg) {
      return res.json({
        ...booking,
        pgId,
        pg: {
          name: "PG deleted",
          city: "",
          rent: null,
          isDeleted: true,
        },
      });
    }

    const bookedRooms = await Booking.countDocuments({
      pg: pg._id,
      status: "approved",
    });
    const totalRooms = toNonNegativeInt(pg.totalRooms);
    const availableRooms = Math.max(
      0,
      totalRooms - toNonNegativeInt(bookedRooms),
    );

    res.json({
      ...booking,
      pgId,
      pg: {
        ...pg,
        availableRooms,
        isDeleted: pg.status === "inactive",
      },
    });
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

    // 5️⃣ If approving, ensure rooms are available (computed via approved bookings)
    const pgId = booking.pg?._id ? booking.pg._id : booking.pg;
    let availableRoomsAfterApproval;
    if (status === "approved") {
      const pg = await PG.findById(pgId).select("totalRooms");
      if (!pg) {
        return res.status(400).json({ message: "Booking PG is missing" });
      }

      const totalRooms = toNonNegativeInt(pg.totalRooms);
      const approvedCount = await Booking.countDocuments({
        pg: pgId,
        status: "approved",
      });
      const computedAvailableRooms = Math.max(
        0,
        totalRooms - toNonNegativeInt(approvedCount),
      );

      if (computedAvailableRooms <= 0) {
        return res
          .status(400)
          .json({ message: "No rooms available. Cannot approve booking." });
      }

      availableRoomsAfterApproval = Math.max(0, computedAvailableRooms - 1);
    }

    // 6️⃣ Update booking status
    booking.status = status;
    await booking.save();

    if (status === "approved") {
      await PG.updateOne(
        { _id: pgId },
        { $set: { availableRooms: Number(availableRoomsAfterApproval || 0) } },
      );
    }

    // 7️⃣ OPTIONAL: auto-reject others only when no rooms remain
    if (
      status === "approved" &&
      Number(availableRoomsAfterApproval || 0) <= 0
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
      status === "approved"
        ? {
            pgId: String(pgId),
            availableRooms: Number(availableRoomsAfterApproval || 0),
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

/*
================================
Owner/Student → Download Invoice (PDF)
GET /api/booking/:bookingId/invoice
================================
*/
exports.downloadBookingInvoice = async (req, res) => {
  try {
    const bookingId = req.params.bookingId;

    const booking = await Booking.findById(bookingId)
      .populate("pg", "name city rent address ownerId")
      .populate("student", "email")
      .exec();

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.status !== "approved") {
      return res
        .status(400)
        .json({ message: "Invoice is available only for approved bookings" });
    }

    // Authorization: student who created the booking OR owner of the PG.
    const isStudent =
      String(booking.student?._id || booking.student) === String(req.user._id);

    let isOwner = false;
    const pgOwnerId = booking?.pg?.ownerId;
    if (pgOwnerId) {
      const pgOwnerIdStr = pgOwnerId.toString();
      if (pgOwnerIdStr === req.user._id.toString()) {
        isOwner = true;
      } else {
        // Legacy compatibility: some PGs stored Owner._id instead of User._id
        const ownerProfile = await Owner.findOne({
          userId: req.user._id,
        }).select("_id");
        if (ownerProfile && pgOwnerIdStr === ownerProfile._id.toString()) {
          isOwner = true;
        }
      }
    }

    if (!isStudent && !isOwner) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Optional enrichment: student name (from Student profile)
    let studentName;
    if (booking?.student?._id) {
      const studentProfile = await Student.findOne({
        userId: booking.student._id,
      }).select("name");
      studentName = studentProfile?.name;
    }

    const pg = booking.pg;
    const invoiceNo = `INV-${String(booking._id).slice(-8).toUpperCase()}`;
    const issuedAt = booking.updatedAt || new Date();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="invoice-${booking._id}.pdf"`,
    );

    const doc = new PDFDocument({ size: "A4", margin: 48 });
    doc.pipe(res);

    const money = (value) => {
      const n = Number(value);
      if (!Number.isFinite(n)) return "-";
      return `₹${n.toLocaleString("en-IN")}`;
    };

    const titleCase = (value) => {
      const s = String(value || "").trim();
      if (!s) return "-";
      return s
        .toLowerCase()
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    };

    const pageWidth = doc.page.width;
    const marginLeft = doc.page.margins.left;
    const marginRight = doc.page.margins.right;
    const contentX = marginLeft;
    const contentWidth = pageWidth - marginLeft - marginRight;

    const ink = "#111827";
    const muted = "#6B7280";
    const border = "#E5E7EB";
    const surface = "#F9FAFB";
    const accent = "#1D4ED8"; // blue

    const pageBottomY = () => doc.page.height - doc.page.margins.bottom;
    const ensureSpace = (requiredHeight) => {
      if (y + requiredHeight <= pageBottomY()) return;
      doc.addPage();
      y = doc.page.margins.top;
    };

    // ===== Header bar (full-width) =====
    const headerBarH = 92;
    doc.save().rect(0, 0, pageWidth, headerBarH).fill(accent).restore();

    doc
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .fontSize(22)
      .text("PG Explorer", contentX, 26);
    doc
      .fillColor("#E5E7EB")
      .font("Helvetica")
      .fontSize(10)
      .text("Booking Invoice", contentX, 54);

    doc
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .fontSize(18)
      .text("INVOICE", contentX, 30, { width: contentWidth, align: "right" });

    // Start content below the header
    let y = headerBarH + 22;

    // ===== Meta strip =====
    const metaH = 56;
    ensureSpace(metaH);
    doc
      .save()
      .roundedRect(contentX, y, contentWidth, metaH, 10)
      .fill(surface)
      .restore();
    doc
      .strokeColor(border)
      .lineWidth(1)
      .roundedRect(contentX, y, contentWidth, metaH, 10)
      .stroke();

    const metaX = contentX + 14;
    const metaPadY = 8;
    const metaY = y + metaPadY;
    const metaGap = 18;
    const metaColW = (contentWidth - 28 - metaGap) / 2;
    const metaRightX = metaX + metaColW + metaGap;

    const issuedDate = new Date(issuedAt);
    const issuedDateText = new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(issuedDate);
    const issuedTimeText = new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(issuedDate);
    // Keep this compact; the bullet separator tends to look like "extra space" in PDFs.
    const issuedText = `${issuedDateText} ${String(issuedTimeText).trim()}`;
    const bookingIdText = String(booking._id);
    const statusText = String(booking.status || "").toUpperCase();

    const metaLine = (label, value, x, yLine) => {
      doc
        .fillColor(muted)
        .font("Helvetica")
        .fontSize(9)
        .text(label, x, yLine, { width: metaColW });
      doc
        .fillColor(ink)
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(value, x, yLine + 11, { width: metaColW, lineBreak: false });
    };

    const metaRowGap = 24;
    metaLine("Invoice No", invoiceNo, metaX, metaY);
    metaLine("Issued", issuedText, metaX, metaY + metaRowGap);
    metaLine("Booking ID", bookingIdText, metaRightX, metaY);
    metaLine("Status", statusText, metaRightX, metaY + metaRowGap);

    y += metaH + 18;

    // ===== Two-column details blocks =====
    const gap = 14;
    const colWidth = (contentWidth - gap) / 2;
    const boxPadding = 12;

    const boxInnerWidth = (w) => w - boxPadding * 2;

    const measureBoxHeight = ({ w, title, lines }) => {
      const innerW = boxInnerWidth(w);
      const titleH = doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .heightOfString(String(title || ""), { width: innerW });

      let total = 0;
      for (const line of lines) {
        const label = String(line?.label ?? "");
        const value = String(line?.value ?? "-");
        const labelH = doc
          .font("Helvetica")
          .fontSize(9)
          .heightOfString(label, { width: innerW });
        const valueH = doc
          .font("Helvetica")
          .fontSize(10)
          .heightOfString(value, { width: innerW });

        total += labelH + 2 + valueH + 10;
      }

      // padding + title + gap + content + bottom padding
      return Math.ceil(boxPadding + titleH + 10 + total + boxPadding);
    };

    const drawBox = ({ x, yTop, w, h, title, lines }) => {
      doc.save().roundedRect(x, yTop, w, h, 10).fill(surface).restore();
      doc
        .strokeColor(border)
        .lineWidth(1)
        .roundedRect(x, yTop, w, h, 10)
        .stroke();

      const tx = x + boxPadding;
      const innerW = boxInnerWidth(w);
      let ty = yTop + boxPadding;

      doc
        .fillColor(ink)
        .font("Helvetica-Bold")
        .fontSize(11)
        .text(String(title || ""), tx, ty, { width: innerW });
      const titleH = doc.heightOfString(String(title || ""), { width: innerW });
      ty += titleH + 10;

      for (const line of lines) {
        const label = String(line?.label ?? "");
        const value = String(line?.value ?? "-");

        doc
          .fillColor(muted)
          .font("Helvetica")
          .fontSize(9)
          .text(label, tx, ty, { width: innerW });
        const labelH = doc.heightOfString(label, { width: innerW });
        ty += labelH + 2;

        doc
          .fillColor(ink)
          .font("Helvetica")
          .fontSize(10)
          .text(value, tx, ty, { width: innerW });
        const valueH = doc.heightOfString(value, { width: innerW });
        ty += valueH + 10;
      }
    };

    const leftX = contentX;
    const rightX = contentX + colWidth + gap;
    const boxTop = y;

    const studentDisplayName = studentName ? titleCase(studentName) : "-";
    const studentEmail = booking.student?.email || "-";

    const pgName = pg?.name ? titleCase(pg.name) : "-";
    const pgCity = pg?.city ? titleCase(pg.city) : "-";
    const pgAddress = pg?.address ? String(pg.address) : "-";
    const rent = money(pg?.rent);
    const status = String(booking.status || "").toUpperCase();
    const requestedAtText = booking.createdAt
      ? new Date(booking.createdAt).toLocaleString()
      : "-";
    const updatedAtText = booking.updatedAt
      ? new Date(booking.updatedAt).toLocaleString()
      : "-";

    const leftBoxSpec = {
      w: colWidth,
      title: "Billed To",
      lines: [
        { label: "Student Name", value: studentDisplayName },
        { label: "Email", value: studentEmail },
      ],
    };

    const rightBoxSpec = {
      w: colWidth,
      title: "Booking Details",
      lines: [
        { label: "PG", value: pgName },
        { label: "City", value: pgCity },
        { label: "Address", value: pgAddress },
        { label: "Monthly Rent", value: rent },
        { label: "Status", value: status },
        { label: "Requested", value: requestedAtText },
        { label: "Last Update", value: updatedAtText },
      ],
    };

    const boxHeight = Math.max(
      measureBoxHeight(leftBoxSpec),
      measureBoxHeight(rightBoxSpec),
    );

    ensureSpace(boxHeight);

    drawBox({
      x: leftX,
      yTop: boxTop,
      w: colWidth,
      h: boxHeight,
      title: leftBoxSpec.title,
      lines: leftBoxSpec.lines,
    });

    drawBox({
      x: rightX,
      yTop: boxTop,
      w: colWidth,
      h: boxHeight,
      title: rightBoxSpec.title,
      lines: rightBoxSpec.lines,
    });

    y = boxTop + boxHeight + 18;

    // ===== Items table =====
    ensureSpace(160);
    doc
      .fillColor(ink)
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("Items", contentX, y);
    y += 12;

    const tableX = contentX;
    const tableW = contentWidth;
    const rowH = 28;
    const tableHeaderH = 30;
    const colDesc = Math.floor(tableW * 0.58);
    const colQty = Math.floor(tableW * 0.12);
    const colUnit = Math.floor(tableW * 0.15);
    const colAmt = tableW - colDesc - colQty - colUnit;
    const cellPadX = 10;

    const drawCellText = (
      text,
      x,
      y,
      w,
      align = "left",
      bold = false,
      color = ink,
      options = {},
    ) => {
      doc
        .fillColor(color)
        .font(bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(10)
        .text(String(text ?? ""), x + cellPadX, y, {
          width: Math.max(0, w - cellPadX * 2),
          align,
          ...options,
        });
    };

    // Header row
    doc.save().rect(tableX, y, tableW, tableHeaderH).fill(accent).restore();

    drawCellText(
      "Description",
      tableX,
      y + 9,
      colDesc,
      "left",
      true,
      "#FFFFFF",
    );
    drawCellText(
      "Qty",
      tableX + colDesc,
      y + 9,
      colQty,
      "center",
      true,
      "#FFFFFF",
      { lineBreak: false },
    );
    drawCellText(
      "Unit Price",
      tableX + colDesc + colQty,
      y + 9,
      colUnit,
      "right",
      true,
      "#FFFFFF",
      { lineBreak: false },
    );
    drawCellText(
      "Amount",
      tableX + colDesc + colQty + colUnit,
      y + 9,
      colAmt,
      "right",
      true,
      "#FFFFFF",
      { lineBreak: false },
    );
    y += tableHeaderH;

    // Item row
    doc.strokeColor(border).lineWidth(1).rect(tableX, y, tableW, rowH).stroke();

    // Column separators (body row)
    doc
      .strokeColor(border)
      .lineWidth(1)
      .moveTo(tableX + colDesc, y)
      .lineTo(tableX + colDesc, y + rowH)
      .stroke();
    doc
      .moveTo(tableX + colDesc + colQty, y)
      .lineTo(tableX + colDesc + colQty, y + rowH)
      .stroke();
    doc
      .moveTo(tableX + colDesc + colQty + colUnit, y)
      .lineTo(tableX + colDesc + colQty + colUnit, y + rowH)
      .stroke();

    drawCellText(`Booking for ${pgName}`, tableX, y + 8, colDesc);
    drawCellText("1", tableX + colDesc, y + 8, colQty, "center", false, ink, {
      lineBreak: false,
    });
    drawCellText(
      rent,
      tableX + colDesc + colQty,
      y + 8,
      colUnit,
      "right",
      false,
      ink,
      { lineBreak: false },
    );
    drawCellText(
      rent,
      tableX + colDesc + colQty + colUnit,
      y + 8,
      colAmt,
      "right",
      false,
      ink,
      { lineBreak: false },
    );
    y += rowH + 10;

    // Totals
    const totalLabelX = tableX + tableW - (colUnit + colAmt);
    const totalValueX = tableX + tableW - colAmt;
    doc
      .strokeColor(border)
      .moveTo(totalLabelX, y)
      .lineTo(tableX + tableW, y)
      .stroke();
    y += 10;
    drawCellText("Total", totalLabelX, y, colUnit, "right", true);
    drawCellText(rent, totalValueX, y, colAmt - 10, "right", true);
    y += 30;

    // Footer
    doc
      .fillColor(muted)
      .font("Helvetica")
      .fontSize(9)
      .text(
        "This is a system-generated invoice for booking confirmation. No signature required.",
        contentX,
        y,
        { width: contentWidth, align: "center" },
      );

    doc.end();
  } catch (error) {
    console.error("Download invoice error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
