const multer = require("multer");
const AppError = require("../utils/AppError");

/**
 * Express 4-arg error handler: structured JSON, no sensitive leakage on 5xx.
 */
function errorMiddleware(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const isProduction = process.env.NODE_ENV === "production";

  if (err && err.message === "Not allowed by CORS") {
    return res.status(403).json({
      error: "Origin not allowed by CORS",
      code: "CORS_FORBIDDEN",
    });
  }

  if (err instanceof AppError) {
    const payload = {
      error: err.message,
      ...(err.code ? { code: err.code } : {}),
    };
    return res.status(err.statusCode).json(payload);
  }

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "Image too large. Max size is 5MB.",
        code: err.code,
      });
    }
    return res.status(400).json({
      error: err.message || "Upload error",
      code: err.code,
    });
  }

  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      error: "Invalid identifier",
      code: "CAST_ERROR",
    });
  }

  console.error("[error] Unhandled:", err);

  return res.status(500).json({
    error: isProduction ? "Internal server error" : err.message || "Internal server error",
    code: "INTERNAL_ERROR",
  });
}

module.exports = errorMiddleware;
