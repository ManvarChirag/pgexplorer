/* eslint-disable no-console */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/user");

const usage = () => {
  console.log(
    "Usage: node scripts/createAdmin.js <email> <password>\n" +
      "Example: node scripts/createAdmin.js admin@pgexplorer.com Admin@12345",
  );
};

const main = async () => {
  const email = String(process.argv[2] || "")
    .trim()
    .toLowerCase();
  const password = String(process.argv[3] || "");

  if (!email || !password) {
    usage();
    process.exit(1);
  }

  if (!process.env.MONGO_URI) {
    console.error("Missing MONGO_URI in backend .env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== "admin") {
      console.error(
        `User already exists with role '${existing.role}'. Refusing to change role automatically.`,
      );
      process.exit(2);
    }

    const salt = await bcrypt.genSalt(10);
    existing.passwordHash = await bcrypt.hash(password, salt);
    existing.isEmailVerified = true;
    existing.isBlocked = false;
    await existing.save();

    console.log("Admin already exists. Password updated:", email);
    process.exit(0);
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const admin = await User.create({
    email,
    passwordHash,
    role: "admin",
    isEmailVerified: true,
  });

  console.log("Created admin:");
  console.log({ id: String(admin._id), email: admin.email, role: admin.role });
  process.exit(0);
};

main().catch((err) => {
  console.error("Failed to create admin:", err);
  process.exit(1);
});
