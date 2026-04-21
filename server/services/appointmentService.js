/**
 * Slot conflict prevention: overlap query + GroomerDayLock bump in the same MongoDB transaction
 * (requires replica set). On standalone MongoDB, falls back to lock bump + check + save (small race window).
 */
const mongoose = require("mongoose");
const { Appointment } = require("../models/Appointment");
const GroomerDayLock = require("../models/GroomerDayLock");
const { deriveAppointmentDateKey } = require("../utils/slotKeys");
const { normalizeToMinute, normalizeToUtcDayStart } = require("../utils/date");

/** HTTP 409 body for i18n (frontend maps code → locale string). */
const SLOT_CONFLICT_MESSAGE = "该时间段已被预约";
const SLOT_CONFLICT_CODE = "SLOT_CONFLICT";
const BOARDING_CAPACITY = 8;
const MAX_BOARDING_DAYS = 30;
const BOARDING_CAPACITY_FULL_CODE = "BOARDING_CAPACITY_FULL";
const BOARDING_CAPACITY_FULL_MESSAGE = "寄宿容量已满";
const CONFLICT_GROUPS = {
  grooming: ["basic", "full"],
  boarding: ["boarding"],
};

function getConflictTypes(currentServiceType) {
  if (!currentServiceType) {
    return [...CONFLICT_GROUPS.grooming, ...CONFLICT_GROUPS.boarding];
  }
  if (CONFLICT_GROUPS.grooming.includes(currentServiceType)) {
    return CONFLICT_GROUPS.grooming;
  }
  if (CONFLICT_GROUPS.boarding.includes(currentServiceType)) {
    return CONFLICT_GROUPS.boarding;
  }
  // fallback: unknown service types only conflict with same type
  return [currentServiceType];
}

function slotConflictBody() {
  return {
    message: SLOT_CONFLICT_MESSAGE,
    code: SLOT_CONFLICT_CODE,
  };
}

function boardingCapacityBody() {
  return {
    message: BOARDING_CAPACITY_FULL_MESSAGE,
    code: BOARDING_CAPACITY_FULL_CODE,
  };
}

function groomerDayLockId(groomerId, startTime) {
  return `${groomerId.toString()}_${deriveAppointmentDateKey(startTime)}`;
}

function addUtcDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function getLegacyBoardingRange(startTime, endTime) {
  const normalizedStart = normalizeToUtcDayStart(startTime);
  const normalizedEnd = normalizeToUtcDayStart(endTime);
  const endInstant = new Date(endTime);
  const hasPartialCheckoutDay = endInstant.getTime() > normalizedEnd.getTime();
  let checkout = hasPartialCheckoutDay ? addUtcDays(normalizedEnd, 1) : normalizedEnd;
  if (checkout <= normalizedStart) {
    checkout = addUtcDays(normalizedStart, 1);
  }
  return { checkInDate: normalizedStart, checkOutDate: checkout };
}

function resolveBoardingDateRange(appointmentLike) {
  if (appointmentLike?.checkInDate && appointmentLike?.checkOutDate) {
    const checkInDate = normalizeToUtcDayStart(appointmentLike.checkInDate);
    const checkOutDate = normalizeToUtcDayStart(appointmentLike.checkOutDate);
    return { checkInDate, checkOutDate };
  }
  return getLegacyBoardingRange(appointmentLike.startTime, appointmentLike.endTime);
}

function buildBoardingOverlapFilter(rangeStart, rangeEnd) {
  return {
    $or: [
      {
        checkInDate: { $lt: rangeEnd },
        checkOutDate: { $gt: rangeStart },
      },
      {
        $and: [
          {
            $or: [{ checkInDate: { $exists: false } }, { checkInDate: null }],
          },
          {
            $or: [{ checkOutDate: { $exists: false } }, { checkOutDate: null }],
          },
          { startTime: { $lt: rangeEnd } },
          { endTime: { $gt: rangeStart } },
        ],
      },
    ],
  };
}

async function countBoardingOccupancyForDay({
  groomerId,
  dayStart,
  excludeAppointmentId = null,
  session = null,
}) {
  const normalizedDayStart = normalizeToUtcDayStart(dayStart);
  const dayEnd = addUtcDays(normalizedDayStart, 1);
  const query = {
    groomerId,
    serviceType: "boarding",
    status: { $nin: ["cancelled", "completed"] },
    ...buildBoardingOverlapFilter(normalizedDayStart, dayEnd),
  };
  if (excludeAppointmentId) {
    query._id = {
      $ne: mongoose.isValidObjectId(excludeAppointmentId)
        ? new mongoose.Types.ObjectId(excludeAppointmentId)
        : excludeAppointmentId,
    };
  }
  const countQ = Appointment.countDocuments(query);
  if (session) countQ.session(session);
  return countQ;
}

async function isBoardingAvailable({
  groomerId,
  checkInDate,
  checkOutDate,
  capacity = BOARDING_CAPACITY,
  excludeAppointmentId = null,
  session = null,
}) {
  const start = normalizeToUtcDayStart(checkInDate);
  const end = normalizeToUtcDayStart(checkOutDate);
  for (let d = new Date(start); d < end; d = addUtcDays(d, 1)) {
    const count = await countBoardingOccupancyForDay({
      groomerId,
      dayStart: d,
      excludeAppointmentId,
      session,
    });
    if (count >= capacity) return false;
  }
  return true;
}

function getBoardingLockIds(groomerId, checkInDate, checkOutDate) {
  const ids = [];
  for (let d = new Date(checkInDate); d < checkOutDate; d = addUtcDays(d, 1)) {
    ids.push(`${groomerId.toString()}_${deriveAppointmentDateKey(d)}_boarding`);
  }
  return ids.sort();
}

function getLockIdsForAppointment(appointmentLike) {
  if (appointmentLike?.serviceType !== "boarding") {
    return [groomerDayLockId(appointmentLike.groomerId, appointmentLike.startTime)];
  }
  const { checkInDate, checkOutDate } = resolveBoardingDateRange(appointmentLike);
  return getBoardingLockIds(appointmentLike.groomerId, checkInDate, checkOutDate);
}

/**
 * Time overlap with active appointments in the same service conflict group.
 * Excluded from blocking: cancelled, completed.
 */
function buildOverlapFilter(groomerId, startTime, endTime, excludeAppointmentId, newServiceType) {
  const normalizedStart = normalizeToMinute(startTime);
  const normalizedEnd = normalizeToMinute(endTime);
  const conflictTypes = getConflictTypes(newServiceType);
  const q = {
    groomerId,
    status: { $nin: ["cancelled", "completed"] },
    serviceType: { $in: conflictTypes },
    startTime: { $lt: normalizedEnd },
    endTime: { $gt: normalizedStart },
  };
  if (excludeAppointmentId) {
    const normalizedExcludeId = mongoose.isValidObjectId(excludeAppointmentId)
      ? new mongoose.Types.ObjectId(excludeAppointmentId)
      : excludeAppointmentId;
    q._id = { $ne: normalizedExcludeId };
  }
  return q;
}

async function findBlockingOverlap(
  groomerId,
  startTime,
  endTime,
  excludeAppointmentId,
  session,
  newServiceType
) {
  const filter = buildOverlapFilter(groomerId, startTime, endTime, excludeAppointmentId, newServiceType);
  const normalizedStart = normalizeToMinute(startTime);
  const normalizedEnd = normalizeToMinute(endTime);
  if (newServiceType === "boarding") {
    const available = await isBoardingAvailable({
      groomerId,
      checkInDate: normalizedStart,
      checkOutDate: normalizedEnd,
      capacity: BOARDING_CAPACITY,
      excludeAppointmentId,
      session,
    });
    if (!available) {
      throwBoardingCapacityFull();
    }
    return null;
  }

  const q = Appointment.findOne(filter).select("_id startTime endTime status serviceType groomerId");
  if (session) q.session(session);
  const existing = await q.lean();

  if (excludeAppointmentId) {
    console.log(
      "UPDATE TARGET:",
      String(excludeAppointmentId),
      "startTime:",
      normalizedStart.toISOString(),
      "endTime:",
      normalizedEnd.toISOString(),
      "groomerId:",
      String(groomerId),
      "serviceType:",
      newServiceType
    );
    if (existing) {
      console.log("CONFLICT FOUND:", {
        _id: existing._id,
        startTime: existing.startTime,
        endTime: existing.endTime,
        status: existing.status,
        serviceType: existing.serviceType,
        groomerId: existing.groomerId,
      });
    } else {
      console.log("CONFLICT FOUND:", null);
    }
  }

  return existing;
}

function throwSlotConflict() {
  const err = new Error(SLOT_CONFLICT_MESSAGE);
  err.statusCode = 409;
  err.code = SLOT_CONFLICT_CODE;
  err.isSlotConflict = true;
  throw err;
}

function throwBoardingCapacityFull() {
  const err = new Error(BOARDING_CAPACITY_FULL_MESSAGE);
  err.statusCode = 409;
  err.code = BOARDING_CAPACITY_FULL_CODE;
  err.isCapacityFull = true;
  throw err;
}

function isTransactionUnsupportedError(err) {
  const msg = String(err?.message || "");
  return (
    msg.includes("replica set") ||
    msg.includes("Transaction numbers are only allowed") ||
    err?.code === 20 ||
    err?.codeName === "IllegalOperation"
  );
}

/**
 * Serialize same-groomer/same-day writes, then overlap-check, then save (create).
 */
async function insertAppointmentWithSlotGuard(appointmentDoc) {
  const lockIds = getLockIdsForAppointment(appointmentDoc);
  const session = await mongoose.startSession();

  const work = async (sess) => {
    for (const lockId of lockIds) {
      await GroomerDayLock.findOneAndUpdate(
        { _id: lockId },
        { $inc: { seq: 1 } },
        { upsert: true, session: sess }
      );
    }
    const hit = await findBlockingOverlap(
      appointmentDoc.groomerId,
      appointmentDoc.startTime,
      appointmentDoc.endTime,
      null,
      sess,
      appointmentDoc.serviceType
    );
    if (hit) throwSlotConflict();
    await appointmentDoc.save({ session: sess });
  };

  try {
    await session.withTransaction(
      async () => {
        await work(session);
      },
      {
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
      }
    );
  } catch (err) {
    if (isTransactionUnsupportedError(err)) {
      for (const lockId of lockIds) {
        await GroomerDayLock.findOneAndUpdate({ _id: lockId }, { $inc: { seq: 1 } }, { upsert: true });
      }
      const hit = await findBlockingOverlap(
        appointmentDoc.groomerId,
        appointmentDoc.startTime,
        appointmentDoc.endTime,
        null,
        null,
        appointmentDoc.serviceType
      );
      if (hit) throwSlotConflict();
      await appointmentDoc.save();
      return;
    }
    if (err?.isSlotConflict) throw err;
    if (err?.isCapacityFull) throw err;
    throw err;
  } finally {
    await session.endSession();
  }
}

/**
 * Reschedule / staff edits: same sequence with excludeAppointmentId.
 */
async function saveAppointmentUpdateWithSlotGuard(appointmentDoc, excludeAppointmentId) {
  const lockIds = getLockIdsForAppointment(appointmentDoc);
  const session = await mongoose.startSession();

  const work = async (sess) => {
    for (const lockId of lockIds) {
      await GroomerDayLock.findOneAndUpdate(
        { _id: lockId },
        { $inc: { seq: 1 } },
        { upsert: true, session: sess }
      );
    }
    const hit = await findBlockingOverlap(
      appointmentDoc.groomerId,
      appointmentDoc.startTime,
      appointmentDoc.endTime,
      excludeAppointmentId,
      sess,
      appointmentDoc.serviceType
    );
    if (hit) throwSlotConflict();
    await appointmentDoc.save({ session: sess });
  };

  try {
    await session.withTransaction(
      async () => {
        await work(session);
      },
      {
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
      }
    );
  } catch (err) {
    if (isTransactionUnsupportedError(err)) {
      for (const lockId of lockIds) {
        await GroomerDayLock.findOneAndUpdate({ _id: lockId }, { $inc: { seq: 1 } }, { upsert: true });
      }
      const hit = await findBlockingOverlap(
        appointmentDoc.groomerId,
        appointmentDoc.startTime,
        appointmentDoc.endTime,
        excludeAppointmentId,
        null,
        appointmentDoc.serviceType
      );
      if (hit) throwSlotConflict();
      await appointmentDoc.save();
      return;
    }
    if (err?.isSlotConflict) throw err;
    if (err?.isCapacityFull) throw err;
    throw err;
  } finally {
    await session.endSession();
  }
}

/**
 * Boarding date-only update guard:
 * 1) serialize affected boarding days by lock docs
 * 2) re-check daily capacity in same transaction
 * 3) save appointment
 */
async function saveBoardingDateUpdateWithCapacityGuard(appointmentDoc, excludeAppointmentId) {
  const { checkInDate, checkOutDate } = resolveBoardingDateRange(appointmentDoc);
  const lockIds = getBoardingLockIds(appointmentDoc.groomerId, checkInDate, checkOutDate);
  const session = await mongoose.startSession();

  const work = async (sess) => {
    for (const lockId of lockIds) {
      await GroomerDayLock.findOneAndUpdate(
        { _id: lockId },
        { $inc: { seq: 1 } },
        { upsert: true, session: sess }
      );
    }
    const available = await isBoardingAvailable({
      groomerId: appointmentDoc.groomerId,
      checkInDate,
      checkOutDate,
      capacity: BOARDING_CAPACITY,
      excludeAppointmentId,
      session: sess,
    });
    if (!available) {
      throwBoardingCapacityFull();
    }
    await appointmentDoc.save({ session: sess });
  };

  try {
    await session.withTransaction(
      async () => {
        await work(session);
      },
      {
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
      }
    );
  } catch (err) {
    if (isTransactionUnsupportedError(err)) {
      for (const lockId of lockIds) {
        await GroomerDayLock.findOneAndUpdate({ _id: lockId }, { $inc: { seq: 1 } }, { upsert: true });
      }
      const available = await isBoardingAvailable({
        groomerId: appointmentDoc.groomerId,
        checkInDate,
        checkOutDate,
        capacity: BOARDING_CAPACITY,
        excludeAppointmentId,
      });
      if (!available) {
        throwBoardingCapacityFull();
      }
      await appointmentDoc.save();
      return;
    }
    if (err?.isCapacityFull) throw err;
    throw err;
  } finally {
    await session.endSession();
  }
}

function isDuplicateKeyError(err) {
  return err && (err.code === 11000 || err.code === 11001);
}

/**
 * Auto-assign a groomer by trying insert across candidates.
 * Picks the first groomer that can take the slot (slot guard enforces conflicts).
 *
 * @param {(groomerId: any) => any} buildAppointmentDoc - factory returning a NEW Appointment mongoose doc
 * @param {Array<any>} groomerIds - candidate groomer ids
 * @returns {Promise<any>} the saved appointment doc
 */
async function insertAppointmentWithAutoAssignedGroomer(buildAppointmentDoc, groomerIds) {
  let sawBoardingCapacityFull = false;
  for (const groomerId of groomerIds) {
    const doc = buildAppointmentDoc(groomerId);
    try {
      await insertAppointmentWithSlotGuard(doc);
      return doc;
    } catch (err) {
      if (err?.isSlotConflict) continue;
      if (err?.isCapacityFull) {
        sawBoardingCapacityFull = true;
        continue;
      }
      if (isDuplicateKeyError(err)) continue;
      throw err;
    }
  }
  // no groomer can take this slot
  if (sawBoardingCapacityFull) {
    throwBoardingCapacityFull();
  }
  throwSlotConflict();
}

module.exports = {
  SLOT_CONFLICT_MESSAGE,
  SLOT_CONFLICT_CODE,
  BOARDING_CAPACITY,
  MAX_BOARDING_DAYS,
  BOARDING_CAPACITY_FULL_CODE,
  slotConflictBody,
  boardingCapacityBody,
  buildOverlapFilter,
  findBlockingOverlap,
  insertAppointmentWithSlotGuard,
  insertAppointmentWithAutoAssignedGroomer,
  saveAppointmentUpdateWithSlotGuard,
  saveBoardingDateUpdateWithCapacityGuard,
  isBoardingAvailable,
  countBoardingOccupancyForDay,
  resolveBoardingDateRange,
  isDuplicateKeyError,
};
