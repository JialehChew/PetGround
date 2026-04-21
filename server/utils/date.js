const ISO_UTC_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?Z$/;
const YMD_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function ensureUTCDate(value) {
  if (typeof value !== "string" || !ISO_UTC_REGEX.test(value)) {
    throw new Error("Invalid date format, must be ISO UTC string");
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error("Invalid date format, must be ISO UTC string");
  }
  return d;
}

function normalizeToMinute(date) {
  const d = new Date(date);
  d.setUTCSeconds(0, 0);
  return d;
}

function ensureUTCMinuteDate(value) {
  return normalizeToMinute(ensureUTCDate(value));
}

function normalizeToUtcDayStart(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error("Invalid date value");
  }
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function parseYmdToUtcDayRange(ymd) {
  if (typeof ymd !== "string" || !YMD_REGEX.test(ymd)) {
    throw new Error("Invalid date format, must be YYYY-MM-DD");
  }
  const [year, month, day] = ymd.split("-").map((v) => Number(v));
  const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  return { start, end };
}

function parseUtcDayRangeFromIso(isoString) {
  const d = ensureUTCDate(isoString);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const day = d.getUTCDate();
  return {
    start: new Date(Date.UTC(year, month, day, 0, 0, 0, 0)),
    end: new Date(Date.UTC(year, month, day, 23, 59, 59, 999)),
  };
}

module.exports = {
  ensureUTCDate,
  normalizeToMinute,
  ensureUTCMinuteDate,
  normalizeToUtcDayStart,
  parseYmdToUtcDayRange,
  parseUtcDayRangeFromIso,
};
