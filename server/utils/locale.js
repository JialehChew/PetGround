/**
 * Resolve UI / email language from request (explicit body/query wins, then Accept-Language).
 * @param {import('express').Request} req
 * @returns {'zh' | 'en'}
 */
function pickLang(req) {
  const body = req.body || {};
  const query = req.query || {};
  const explicit = body.locale || query.locale;
  if (explicit === "zh" || explicit === "en") return explicit;
  const accept = String(req.headers["accept-language"] || "").toLowerCase();
  if (accept.includes("zh")) return "zh";
  return "en";
}

/**
 * @param {unknown} v
 * @returns {'zh' | 'en'}
 */
function normalizeLang(v) {
  return v === "zh" ? "zh" : "en";
}

/**
 * Use stored user preference when set; otherwise infer from the current HTTP request.
 * @param {{ preferredLocale?: string } | null | undefined} user
 * @param {import('express').Request} req
 */
function resolveLangFromUser(user, req) {
  if (user && (user.preferredLocale === "zh" || user.preferredLocale === "en")) {
    return user.preferredLocale;
  }
  return pickLang(req);
}

module.exports = { pickLang, normalizeLang, resolveLangFromUser };
