/**
 * Malaysia calendar day / hour keys (UTC+8), consistent with business-hour slot logic in Appointment model.
 */

function deriveAppointmentDateKey(startTime) {
  const d = new Date(startTime.getTime() + 8 * 60 * 60 * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function deriveTimeSlotKey(startTime) {
  const d = new Date(startTime.getTime() + 8 * 60 * 60 * 1000);
  const dateKey = deriveAppointmentDateKey(startTime);
  const h = String(d.getUTCHours()).padStart(2, "0");
  return `${dateKey}_${h}`;
}

module.exports = { deriveAppointmentDateKey, deriveTimeSlotKey };
