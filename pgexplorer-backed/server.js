const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/booking", require("./routes/bookingRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/listings", require("./routes/listingRoutes"));
app.use("/api/student", require("./routes/studentRoutes"));
app.use("/api/owner", require("./routes/ownerRoutes"));
app.use("/api/pg", require("./routes/pgRoutes"));
const bookingRoutes = require("./routes/bookingRoutes");

app.use("/api/booking", bookingRoutes);

// app.use("/api/admin", require("./adminRoutes"));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
