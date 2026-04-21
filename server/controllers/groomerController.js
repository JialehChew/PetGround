const mongoose = require("mongoose");
const User = require("../models/User");
const Pet = require("../models/Pet");
const { Appointment, TimeBlock } = require("../models/Appointment");
const {
  ensureUTCDate,
  ensureUTCMinuteDate,
  parseYmdToUtcDayRange,
  parseUtcDayRangeFromIso,
} = require("../utils/date");

async function assertGroomerKnowsOwner(groomerId, ownerId) {
  if (!ownerId) return false;
  const ok = await Appointment.exists({ groomerId, ownerId });
  return Boolean(ok);
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseDayRangeInput(input) {
  const value = String(input || "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return parseYmdToUtcDayRange(value);
  }
  return parseUtcDayRangeFromIso(value);
}

exports.getAllGroomers = async (req, res) => {
  try {
    // find all users with role groomer
    const groomers = await User.find({ role: "groomer" }).select("-password");

    res.status(200).json(groomers);
  } catch (error) {
    console.error("Error fetching groomers:", error);
    res.status(500).json({ error: "Server error fetching groomers" });
  }
};

exports.getGroomerById = async (req, res) => {
  try {
    const groomerId = req.params.id;
    const groomer = await User.findOne({
      _id: groomerId,
      role: "groomer",
    }).select("-password");

    if (!groomer) {
      return res.status(404).json({ error: "Groomer not found" });
    }
    res.status(200).json(groomer);
  } catch (error) {
    console.error("Error fetching groomer:", error);
    res.status(500).json({ error: "Server error fetching groomer details" });
  }
};

// get groomer available time slots on specific date
exports.getGroomerAvailability = async (req, res) => {
  try {
    const groomerId = req.params.id;
    const { date, duration } = req.query;

    // query params validation
    if (!date) {
      return res.status(400).json({ error: "Date parameter is required (YYYY-MM-DD)" });
    }

    const appointmentDuration = parseInt(duration, 10) || 60;

    if (![60, 90, 120].includes(appointmentDuration)) {
      return res.status(400).json({ error: "Duration must be 60, 90, or 120 minutes" });
    }

    let appointmentDate;
    try {
      const dayRange = parseDayRangeInput(date);
      appointmentDate = dayRange.start;
    } catch (e) {
      return res.status(400).json({ error: "Invalid date format. Use ISO UTC string." });
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (appointmentDate < today) {
      return res.status(400).json({ error: "Cannot book appointments for past dates" });
    }

    // Special: aggregate slots across all groomers.
    // Useful for admin/staff booking flows where groomer isn't pre-selected.
    if (groomerId === "all") {
      const groomers = await User.find({ role: "groomer" }).select("_id").lean();
      if (!groomers || groomers.length === 0) {
        return res.status(200).json([]);
      }
      const allSlots = await Promise.all(
        groomers.map((g) =>
          Appointment.getAvailableTimeSlots(g._id, appointmentDate, appointmentDuration).catch(() => [])
        )
      );
      const byStart = new Map();
      for (const slots of allSlots) {
        for (const slot of slots) {
          const key = new Date(slot.start).toISOString();
          if (!byStart.has(key)) byStart.set(key, slot);
        }
      }
      return res
        .status(200)
        .json(Array.from(byStart.values()).sort((a, b) => new Date(a.start) - new Date(b.start)));
    }

    const groomer = await User.findOne({ _id: groomerId, role: "groomer" });
    if (!groomer) {
      return res.status(404).json({ error: "Groomer not found" });
    }

    // model static method to get available time slots (this now considers time blocks)
    const availableSlots = await Appointment.getAvailableTimeSlots(groomerId, appointmentDate, appointmentDuration);
    return res.status(200).json(availableSlots);
  } catch (error) {
    console.error("Error fetching groomer availability:", error);
    res.status(500).json({ error: "Server error fetching groomer availability" });
  }
};

// get groomer schedule for a specific date range (calendar view)
exports.getGroomerSchedule = async (req, res) => {
  try {
    // only staff can view schedule data
    if (req.user.role !== "groomer" && req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    const groomerId = req.params.id || req.user.id;

    // groomers can request "all" (staff-wide visibility), but not arbitrary other groomer IDs
    if (req.user.role === "groomer" && groomerId !== req.user.id && groomerId !== "all") {
      return res.status(403).json({ error: "You can only view your own schedule or all schedules" });
    }

    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Start date and end date are required (ISO UTC)" });
    }

    let start;
    let end;
    try {
      const startRange = parseDayRangeInput(startDate);
      const endRange = parseDayRangeInput(endDate);
      start = startRange.start;
      end = endRange.end;
    } catch (e) {
      return res.status(400).json({ error: "Invalid date format. Use ISO UTC string." });
    }

    // Staff can request an aggregated schedule using /groomers/all/schedule.
    // Admin can also fallback to aggregated view when a non-groomer id is passed.
    let targetQuery = { groomerId };
    let targetBlockQuery = { groomerId };
    let responseGroomerId = groomerId;

    const explicitAll = groomerId === "all";
    const requestedIsGroomer = explicitAll ? false : await User.exists({ _id: groomerId, role: "groomer" });
    const shouldAggregate =
      explicitAll || (req.user.role === "admin" && !requestedIsGroomer);

    if (shouldAggregate) {
      const groomers = await User.find({ role: "groomer" }).select("_id").lean();
      const ids = groomers.map((g) => g._id);
      targetQuery = { groomerId: { $in: ids } };
      targetBlockQuery = { groomerId: { $in: ids } };
      responseGroomerId = "all";
    }

    // Appointments overlapping range (includes overnight boarding on checkout day)
    const appointments = await Appointment.find({
      ...targetQuery,
      startTime: { $lt: end },
      endTime: { $gt: start },
    })
      .populate("petId", "name species breed age notes imageUrl notesForGroomer")
      .populate("ownerId", "name email phone")
      .populate("groomerId", "name email")
      .sort({ startTime: 1 });

    // get time blocks in date range
    const timeBlocks = await TimeBlock.find({
      ...targetBlockQuery,
      startTime: { $lt: end },
      endTime: { $gt: start },
    }).sort({ startTime: 1 });

    res.status(200).json({
      appointments,
      timeBlocks,
      groomerId: responseGroomerId,
      startDate,
      endDate,
    });
  } catch (error) {
    console.error("Error fetching groomer schedule:", error);
    res.status(500).json({ error: "Server error fetching groomer schedule" });
  }
};

// create time block (groomer blocks off time)
exports.createTimeBlock = async (req, res) => {
  try {
    // only groomers can create time blocks for themselves
    if (req.user.role !== "groomer") {
      return res.status(403).json({ error: "Only groomers can create time blocks" });
    }

    const { startTime, endTime, blockType, reason, isRecurring, recurringPattern } = req.body;

    if (!startTime || !endTime) {
      return res.status(400).json({ error: "Start time and end time are required" });
    }

    let blockStart;
    let blockEnd;
    try {
      blockStart = ensureUTCMinuteDate(startTime);
      blockEnd = ensureUTCMinuteDate(endTime);
    } catch (e) {
      return res.status(400).json({ error: "Invalid date format, must be ISO UTC string" });
    }

    if (blockStart >= blockEnd) {
      return res.status(400).json({ error: "Start time must be before end time" });
    }

    // check for conflicts with existing appointments
    const appointmentConflicts = await Appointment.checkForConflicts(
      req.user.id,
      blockStart,
      blockEnd
    );

    if (appointmentConflicts) {
      return res.status(409).json({
        message: "该时间段已被预约",
        code: "SLOT_CONFLICT",
        error: "Time block conflicts with existing appointments",
      });
    }

    // check for conflicts with existing time blocks
    const timeBlockConflicts = await TimeBlock.checkForTimeBlockConflicts(
      req.user.id,
      blockStart,
      blockEnd
    );

    if (timeBlockConflicts) {
      return res.status(409).json({
        error: "Time block conflicts with existing time blocks",
      });
    }

    // create time block
    const timeBlock = new TimeBlock({
      groomerId: req.user.id,
      startTime: blockStart,
      endTime: blockEnd,
      blockType: blockType || "unavailable",
      reason,
      isRecurring: isRecurring || false,
      recurringPattern: isRecurring ? recurringPattern : undefined,
    });

    await timeBlock.save();

    res.status(201).json({
      message: "Time block created successfully",
      timeBlock,
    });
  } catch (error) {
    console.error("Error creating time block:", error);
    res.status(500).json({ error: "Server error creating time block" });
  }
};

// update time block
exports.updateTimeBlock = async (req, res) => {
  try {
    if (req.user.role !== "groomer") {
      return res.status(403).json({ error: "Only groomers can update time blocks" });
    }

    const timeBlockId = req.params.timeBlockId;
    const { startTime, endTime, blockType, reason, isRecurring, recurringPattern } = req.body;

    const timeBlock = await TimeBlock.findById(timeBlockId);
    if (!timeBlock) {
      return res.status(404).json({ error: "Time block not found" });
    }

    if (timeBlock.groomerId.toString() !== req.user.id) {
      return res.status(403).json({ error: "You can only update your own time blocks" });
    }

    if (startTime && endTime) {
      let blockStart;
      let blockEnd;
      try {
        blockStart = ensureUTCMinuteDate(startTime);
        blockEnd = ensureUTCMinuteDate(endTime);
      } catch (e) {
        return res.status(400).json({ error: "Invalid date format, must be ISO UTC string" });
      }

      if (blockStart >= blockEnd) {
        return res.status(400).json({ error: "Start time must be before end time" });
      }

      // check for conflicts (excluding current time block)
      const appointmentConflicts = await Appointment.checkForConflicts(
        req.user.id,
        blockStart,
        blockEnd
      );

      if (appointmentConflicts) {
        return res.status(409).json({
          message: "该时间段已被预约",
          code: "SLOT_CONFLICT",
          error: "Updated time block would conflict with existing appointments",
        });
      }

      const timeBlockConflicts = await TimeBlock.checkForTimeBlockConflicts(
        req.user.id,
        blockStart,
        blockEnd,
        timeBlockId
      );

      if (timeBlockConflicts) {
        return res.status(409).json({
          error: "Updated time block would conflict with existing time blocks",
        });
      }

      timeBlock.startTime = blockStart;
      timeBlock.endTime = blockEnd;
    }

    if (blockType) timeBlock.blockType = blockType;
    if (reason !== undefined) timeBlock.reason = reason;
    if (isRecurring !== undefined) timeBlock.isRecurring = isRecurring;
    if (recurringPattern !== undefined) timeBlock.recurringPattern = recurringPattern;

    await timeBlock.save();

    res.status(200).json({
      message: "Time block updated successfully",
      timeBlock,
    });
  } catch (error) {
    console.error("Error updating time block:", error);
    res.status(500).json({ error: "Server error updating time block" });
  }
};

// delete time block
exports.deleteTimeBlock = async (req, res) => {
  try {
    if (req.user.role !== "groomer") {
      return res.status(403).json({ error: "Only groomers can delete time blocks" });
    }

    const timeBlockId = req.params.timeBlockId;
    const timeBlock = await TimeBlock.findById(timeBlockId);

    if (!timeBlock) {
      return res.status(404).json({ error: "Time block not found" });
    }

    if (timeBlock.groomerId.toString() !== req.user.id) {
      return res.status(403).json({ error: "You can only delete your own time blocks" });
    }

    await TimeBlock.deleteOne({ _id: timeBlockId });

    res.status(200).json({ message: "Time block deleted successfully" });
  } catch (error) {
    console.error("Error deleting time block:", error);
    res.status(500).json({ error: "Server error deleting time block" });
  }
};

/**
 * Groomer: list pet owners who have at least one appointment with this groomer.
 * Query: ?q=name_or_email
 */
exports.getMyClients = async (req, res) => {
  try {
    if (req.user.role !== "groomer") {
      return res.status(403).json({ error: "Only groomers can view their client list" });
    }

    const groomerId = req.user.id;
    const q = String(req.query.q || "").trim();

    const ownerIdsRaw = await Appointment.distinct("ownerId", {
      groomerId,
      ownerId: { $ne: null },
    });

    const ownerIds = ownerIdsRaw
      .map((id) => (id && id.toString ? id.toString() : String(id)))
      .filter(Boolean);

    if (ownerIds.length === 0) {
      return res.status(200).json([]);
    }

    const filter = {
      _id: { $in: ownerIds.map((id) => new mongoose.Types.ObjectId(id)) },
      role: "owner",
    };
    if (q) {
      const rgx = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ name: rgx }, { email: rgx }];
    }

    const users = await User.find(filter)
      .select("_id name email role phone createdAt isVerified verificationToken preferredLocale")
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();

    const ownerIdStrs = users.map((u) => String(u._id));
    let petCountByOwner = {};
    if (ownerIdStrs.length > 0) {
      const ownerObjIds = ownerIdStrs.map((id) => new mongoose.Types.ObjectId(id));
      const petCounts = await Pet.aggregate([
        { $match: { isDeleted: { $ne: true }, ownerId: { $in: ownerObjIds } } },
        { $group: { _id: "$ownerId", count: { $sum: 1 } } },
      ]);
      petCountByOwner = petCounts.reduce((acc, row) => {
        acc[String(row._id)] = row.count;
        return acc;
      }, {});
    }

    const rows = users.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      phone: u.phone || "",
      createdAt: u.createdAt,
      preferredLocale: u.preferredLocale === "zh" ? "zh" : "en",
      isVerified: User.displayEmailVerified(u),
      petCount: petCountByOwner[String(u._id)] || 0,
    }));

    return res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching groomer clients:", error);
    return res.status(500).json({ error: "Server error fetching clients" });
  }
};

/**
 * Groomer: single owner summary (must have appointment history with this groomer).
 */
exports.getMyClientById = async (req, res) => {
  try {
    if (req.user.role !== "groomer") {
      return res.status(403).json({ error: "Only groomers can view client details" });
    }

    const groomerId = req.user.id;
    const userId = req.params.userId;

    const allowed = await assertGroomerKnowsOwner(groomerId, userId);
    if (!allowed) {
      return res.status(403).json({ error: "You do not have access to this client" });
    }

    const target = await User.findById(userId)
      .select("_id name email role phone createdAt isVerified verificationToken preferredLocale")
      .lean();

    if (!target || target.role !== "owner") {
      return res.status(404).json({ error: "Client not found" });
    }

    const petCount = await Pet.countDocuments({ ownerId: userId, isDeleted: { $ne: true } });

    return res.status(200).json({
      _id: target._id,
      name: target.name,
      email: target.email,
      role: target.role,
      phone: target.phone || "",
      createdAt: target.createdAt,
      preferredLocale: target.preferredLocale === "zh" ? "zh" : "en",
      isVerified: User.displayEmailVerified(target),
      petCount,
    });
  } catch (error) {
    console.error("Error fetching groomer client:", error);
    return res.status(500).json({ error: "Server error fetching client" });
  }
};

/**
 * Groomer: pets for an owner (same as admin list) if relationship exists.
 */
exports.getMyClientPets = async (req, res) => {
  try {
    if (req.user.role !== "groomer") {
      return res.status(403).json({ error: "Only groomers can view client pets" });
    }

    const groomerId = req.user.id;
    const userId = req.params.userId;

    const allowed = await assertGroomerKnowsOwner(groomerId, userId);
    if (!allowed) {
      return res.status(403).json({ error: "You do not have access to this client" });
    }

    const target = await User.findById(userId).select("_id role").lean();
    if (!target || target.role !== "owner") {
      return res.status(404).json({ error: "Client not found" });
    }

    const pets = await Pet.find({ ownerId: userId, isDeleted: { $ne: true } }).sort({ createdAt: -1 });
    return res.status(200).json(pets);
  } catch (error) {
    console.error("Error fetching groomer client pets:", error);
    return res.status(500).json({ error: "Server error fetching client pets" });
  }
};

/**
 * Groomer: appointments for this owner with THIS groomer only; optional date range on startTime.
 */
exports.getMyClientAppointments = async (req, res) => {
  try {
    if (req.user.role !== "groomer") {
      return res.status(403).json({ error: "Only groomers can view client appointments" });
    }

    const groomerId = req.user.id;
    const userId = req.params.userId;

    const allowed = await assertGroomerKnowsOwner(groomerId, userId);
    if (!allowed) {
      return res.status(403).json({ error: "You do not have access to this client" });
    }

    const target = await User.findById(userId).select("_id role").lean();
    if (!target || target.role !== "owner") {
      return res.status(404).json({ error: "Client not found" });
    }

    let from = null;
    let to = null;
    try {
      from = req.query.from ? ensureUTCDate(String(req.query.from)) : null;
      to = req.query.to ? ensureUTCDate(String(req.query.to)) : null;
    } catch (e) {
      return res.status(400).json({ error: "Invalid date format, must be ISO UTC string" });
    }
    const startTime = {};
    if (from && !Number.isNaN(from.getTime())) startTime.$gte = from;
    if (to && !Number.isNaN(to.getTime())) startTime.$lte = to;

    const query = { ownerId: userId, groomerId };
    if (Object.keys(startTime).length > 0) {
      query.startTime = startTime;
    }

    const appointments = await Appointment.find(query)
      .populate("petId", "name species breed age notes size imageUrl notesForGroomer")
      .populate("ownerId", "name email phone")
      .populate("groomerId", "name email")
      .sort({ startTime: -1 })
      .lean();

    return res.status(200).json(appointments);
  } catch (error) {
    console.error("Error fetching groomer client appointments:", error);
    return res.status(500).json({ error: "Server error fetching client appointments" });
  }
};
