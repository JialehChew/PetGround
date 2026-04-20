/**
 * Grooming duration by pet size (minutes).
 */
const DURATION_BY_SIZE = {
  small: 60,
  medium: 90,
  large: 120,
  xlarge: 120,
};

const PET_SIZES = ["small", "medium", "large", "xlarge"];

function durationMinutesForGrooming(petSize) {
  const d = DURATION_BY_SIZE[petSize];
  return d == null ? null : d;
}

/**
 * Boarding: 11:00 MYT check-in on checkInYmd → 17:00 MYT checkout next calendar day.
 * checkInYmd: "YYYY-MM-DD"
 */
function computeBoardingWindow(checkInYmd) {
  const parts = checkInYmd.split("-").map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, mo, d] = parts;
  const start = new Date(Date.UTC(y, mo - 1, d, 11 - 8, 0, 0, 0));
  const end = new Date(Date.UTC(y, mo - 1, d + 1, 17 - 8, 0, 0, 0));
  const minutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
  return { start, end, durationMinutes: minutes };
}

/** Calendar date at midnight UTC from YYYY-MM-DD */
function utcMidnightFromYmd(ymd) {
  const parts = String(ymd).slice(0, 10).split("-").map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, mo, d] = parts;
  return new Date(Date.UTC(y, mo - 1, d, 0, 0, 0, 0));
}

module.exports = {
  DURATION_BY_SIZE,
  PET_SIZES,
  durationMinutesForGrooming,
  computeBoardingWindow,
  utcMidnightFromYmd,
};
