// Middleware to check if user is a pet owner
const isOwner = (req, res, next) => {
  if (req.user && req.user.role === "owner") {
    return next();
  }
  return res.status(403).json({ error: "Access denied. Owner role required." });
};

// Middleware to check if user is a groomer
const isGroomer = (req, res, next) => {
  if (req.user && req.user.role === "groomer") {
    return next();
  }
  return res
    .status(403)
    .json({ error: "Access denied. Groomer role required." });
};

// Middleware to check if user is either an owner or a groomer
const isAuthenticated = (req, res, next) => {
  if (req.user && (req.user.role === "owner" || req.user.role === "groomer" || req.user.role === "admin")) {
    return next();
  }
  return res
    .status(403)
    .json({ error: "Access denied. Authentication required." });
};

// Middleware to check if user is an admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  }
  return res.status(403).json({ error: "Access denied. Admin role required." });
};

module.exports = { isOwner, isGroomer, isAdmin, isAuthenticated };
