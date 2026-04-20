const SENSITIVE_HEADER_KEYS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "x-auth-token",
]);

const SENSITIVE_BODY_KEYS = new Set([
  "password",
  "newpassword",
  "currentpassword",
  "oldpassword",
  "token",
  "accesstoken",
  "refreshtoken",
]);

/**
 * Shallow-clone headers and redact known sensitive values (never log raw tokens).
 */
function redactHeaders(headers) {
  if (!headers || typeof headers !== "object") return headers;
  const out = { ...headers };
  for (const key of Object.keys(out)) {
    if (SENSITIVE_HEADER_KEYS.has(String(key).toLowerCase())) {
      out[key] = out[key] ? "[redacted]" : undefined;
    }
  }
  return out;
}

/**
 * Shallow-clone JSON body and redact common secret fields.
 */
function redactBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return body;
  }
  const out = { ...body };
  for (const key of Object.keys(out)) {
    if (SENSITIVE_BODY_KEYS.has(String(key).toLowerCase())) {
      out[key] = "[redacted]";
    }
  }
  return out;
}

function requestPath(req) {
  return req.originalUrl || req.path || "";
}

/**
 * Unified HTTP access log (one line per request, after response is sent).
 *
 * - Production: `[http] METHOD path status` only.
 * - Development: same line; optional verbose inbound line when DEBUG_HTTP=1 (never in production).
 * - DEBUG_HTTP=0 in development: suppress optional verbose (access line still printed).
 */
function requestDebugMiddleware() {
  return (req, res, next) => {
    const isProduction = process.env.NODE_ENV === "production";
    const verboseInbound = !isProduction && process.env.DEBUG_HTTP === "1";

    if (verboseInbound) {
      const path = requestPath(req);
      const ct = req.headers["content-type"] || "";
      const body = req.body;
      const bodyKeys =
        body && typeof body === "object" && !Array.isArray(body) ? Object.keys(body).join(",") : "";
      console.log(
        `[http-debug] ${req.method} ${path} origin=${req.headers.origin || "-"} content-type=${ct} jsonBodyKeys=${bodyKeys}`
      );
      if (process.env.DEBUG_HTTP_HEADERS === "1") {
        console.log("[http-debug] headers (redacted):", redactHeaders(req.headers));
        console.log("[http-debug] body (redacted):", redactBody(req.body));
      }
    }

    res.on("finish", () => {
      console.log(`[http] ${req.method} ${requestPath(req)} ${res.statusCode}`);
    });

    next();
  };
}

module.exports = { requestDebugMiddleware, redactHeaders, redactBody };
