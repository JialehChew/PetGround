/**
 * Operational HTTP error: safe to expose message + status to clients when appropriate.
 */
class AppError extends Error {
  /**
   * @param {string} message - Human-readable error (English for API consistency)
   * @param {number} [statusCode=500]
   * @param {string|null} [code=null] - Stable machine code for clients (e.g. NO_IMAGE_FILE)
   * @param {{ isOperational?: boolean }} [options]
   */
  constructor(message, statusCode = 500, code = null, options = {}) {
    super(message);
    this.name = "AppError";
    this.statusCode = Number.isInteger(statusCode) ? statusCode : 500;
    this.code = code;
    this.isOperational = options.isOperational !== false;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
