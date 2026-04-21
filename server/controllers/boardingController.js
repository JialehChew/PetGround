const mongoose = require("mongoose");
const User = require("../models/User");
const { Appointment } = require("../models/Appointment");
const { BOARDING_CAPACITY, countBoardingOccupancyForDay } = require("../services/appointmentService");
const { ensureUTCDate, normalizeToUtcDayStart, parseYmdToUtcDayRange } = require("../utils/date");

function parseDateToUtcDayStart(raw) {
  if (!raw) throw new Error("Missing date");
  const str = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return parseYmdToUtcDayRange(str).start;
  }
  return normalizeToUtcDayStart(ensureUTCDate(str));
}

function addUtcDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function toYmd(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate()
  ).padStart(2, "0")}`;
}

exports.getOccupancy = async (req, res) => {
  try {
    const { startDate, endDate, groomerId } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate are required" });
    }

    let groomerTargetId = null;
    const isOwner = req.user?.role === "owner";
    const isAdmin = req.user?.role === "admin";
    if (groomerId && groomerId !== "all") {
      groomerTargetId = groomerId;
      const isSelf = String(groomerTargetId) === String(req.user?.id);
      if (!isAdmin && !isSelf) {
        return res.status(403).json({ error: "Not authorized to view this groomer's occupancy" });
      }
      if (!mongoose.isValidObjectId(groomerTargetId)) {
        return res.status(400).json({ error: "Invalid groomerId" });
      }
      const groomer = await User.findOne({ _id: groomerTargetId, role: "groomer" }).select("_id").lean();
      if (!groomer) {
        return res.status(404).json({ error: "Groomer not found" });
      }
      groomerTargetId = groomer._id;
    } else if (!isOwner && !isAdmin) {
      // groomer without explicit query falls back to self
      groomerTargetId = req.user?.id;
    }

    const startDay = parseDateToUtcDayStart(startDate);
    const endDay = parseDateToUtcDayStart(endDate);
    if (endDay < startDay) {
      return res.status(400).json({ error: "endDate must be greater than or equal to startDate" });
    }

    const data = [];
    const groomerCount = groomerTargetId
      ? 1
      : await User.countDocuments({
          role: "groomer",
        });
    const aggregateCapacity = Math.max(0, groomerCount) * BOARDING_CAPACITY;
    for (let d = new Date(startDay); d <= endDay; d = addUtcDays(d, 1)) {
      let occupied = 0;
      if (groomerTargetId) {
        occupied = await countBoardingOccupancyForDay({
          groomerId: groomerTargetId,
          dayStart: d,
        });
      } else {
        const dayStart = normalizeToUtcDayStart(d);
        const dayEnd = addUtcDays(dayStart, 1);
        occupied = await Appointment.countDocuments({
          serviceType: "boarding",
          status: { $nin: ["cancelled", "completed"] },
          $or: [
            {
              checkInDate: { $lt: dayEnd },
              checkOutDate: { $gt: dayStart },
            },
            {
              $and: [
                {
                  $or: [{ checkInDate: { $exists: false } }, { checkInDate: null }],
                },
                {
                  $or: [{ checkOutDate: { $exists: false } }, { checkOutDate: null }],
                },
                { startTime: { $lt: dayEnd } },
                { endTime: { $gt: dayStart } },
              ],
            },
          ],
        });
      }
      const capacity = groomerTargetId ? BOARDING_CAPACITY : aggregateCapacity;
      data.push({
        date: toYmd(d),
        occupied,
        capacity,
        isFull: capacity > 0 ? occupied >= capacity : true,
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching boarding occupancy:", error);
    return res.status(500).json({ error: "Failed to fetch boarding occupancy" });
  }
};
