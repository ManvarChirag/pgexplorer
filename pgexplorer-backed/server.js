const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs");
const http = require("http");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
// Load backend env vars regardless of current working directory
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = express();

const server = http.createServer(app);

// Ensure uploads folder exists (used for local image fallback)
const uploadsPath = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

const getAllowedOrigins = () => {
  const devDefaults = ["http://localhost:3000", "http://localhost:3001"];
  const raw = process.env.FRONTEND_ORIGIN;
  const envOrigins =
    raw && raw.trim()
      ? raw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  // Always allow common local dev ports to avoid CORS "Network Error"
  // when CRA switches between 3000/3001.
  const merged = [...envOrigins, ...devDefaults];
  return [...new Set(merged)];
};

const allowedOrigins = getAllowedOrigins();

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

// Socket.IO for realtime chat/notifications/announcements
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

app.set("io", io);

// In-memory chat history (no DB schema changes)
const chatHistoryByRoom = new Map();
const pushChatMessage = (room, msg) => {
  const current = chatHistoryByRoom.get(room) || [];
  const next = [...current, msg].slice(-50);
  chatHistoryByRoom.set(room, next);
  return next;
};

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(); // allow unauthenticated connection (announcements)

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = { id: decoded.id, role: decoded.role };
    return next();
  } catch (err) {
    // invalid token: treat as unauthenticated
    return next();
  }
});

io.on("connection", (socket) => {
  if (socket.user?.id) {
    socket.join(`user:${socket.user.id}`);
    if (socket.user.role) socket.join(`role:${socket.user.role}`);
  }

  socket.on("chat:join", (payload) => {
    if (!socket.user?.id) return;

    const { pgId, studentId } = payload || {};
    if (!pgId) return;

    // Student joins their own room; owner must specify a studentId.
    const effectiveStudentId =
      socket.user.role === "student" ? socket.user.id : studentId;
    if (!effectiveStudentId) return;

    const room = `chat:${pgId}:${effectiveStudentId}`;
    socket.join(room);
    const history = chatHistoryByRoom.get(room) || [];
    socket.emit("chat:history", { room, messages: history });
  });

  socket.on("chat:send", (payload) => {
    if (!socket.user?.id) return;
    const { pgId, studentId, text } = payload || {};
    const msgText = String(text || "").trim();
    if (!pgId || !msgText) return;

    const effectiveStudentId =
      socket.user.role === "student" ? socket.user.id : studentId;
    if (!effectiveStudentId) return;

    const room = `chat:${pgId}:${effectiveStudentId}`;
    const msg = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      pgId: String(pgId),
      studentId: String(effectiveStudentId),
      senderId: String(socket.user.id),
      senderRole: socket.user.role,
      text: msgText,
      createdAt: new Date().toISOString(),
    };

    pushChatMessage(room, msg);
    io.to(room).emit("chat:message", { room, message: msg });
  });
});
app.use(express.json());
app.use(cookieParser());

app.use(
  helmet({
    // Allow the frontend (different origin) to load images from /uploads.
    // Without this, browsers may block <img> due to CORP being same-origin.
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.use("/uploads", express.static(uploadsPath));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/listings", require("./routes/listingRoutes"));
app.use("/api/student", require("./routes/studentRoutes"));
app.use("/api/owner", require("./routes/ownerRoutes"));
app.use("/api/pg", require("./routes/pgRoutes"));
app.use("/api/booking", require("./routes/bookingRoutes"));

app.use("/api/notifications", require("./routes/notificationRoutes"));

app.use("/api/admin", require("./routes/adminRoutes"));

// Consistent JSON error responses (especially for multer upload errors)
app.use((err, req, res, next) => {
  if (!err) return next();
  const status = err.name === "MulterError" ? 400 : 500;
  res.status(status).json({ message: err.message || "Server error" });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

const port = Number(process.env.PORT || 5000);
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
