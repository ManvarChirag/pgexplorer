const jwt = require("jsonwebtoken");
const User = require("../models/user");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    // 1. Check token
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "Access denied. No token provided." });
    }

    // 2. Extract token
    const token = authHeader.split(" ")[1];
    // 3. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Attach user to request
    req.user = await User.findById(decoded.id).select("-passwordHash");

    if (!req.user) {
      return res.status(401).json({ message: "Invalid token" });
    }

    if (req.user.isBlocked) {
      return res.status(403).json({ message: "User is blocked" });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: "Token verification failed" });
  }
};

module.exports = authMiddleware;
