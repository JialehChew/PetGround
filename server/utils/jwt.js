const jwt = require("jsonwebtoken");
require("dotenv").config();

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET || "supersecret123";
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET || "supersecret123";
const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";

const buildTokenPayload = (user) => ({
  id: user._id,
  email: user.email,
  role: user.role,
});

const generateAccessToken = (user) => jwt.sign(buildTokenPayload(user), ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });

const generateRefreshToken = (user) =>
  jwt.sign(buildTokenPayload(user), REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });

// Backward-compatible alias used across existing controllers.
const generateToken = generateAccessToken;

const verifyRefreshToken = (token) => jwt.verify(token, REFRESH_TOKEN_SECRET);

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }
  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token." });
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateToken,
  verifyRefreshToken,
  verifyToken,
};
