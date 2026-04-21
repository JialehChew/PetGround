/**
 * Slot conflict prevention: overlap query + GroomerDayLock bump in the same MongoDB transaction
 * (requires replica set). On standalone MongoDB, falls back to lock bump + check + save (small race window).
 */
const mongoose = require("mongoose");
const { Appointment } = require("../models/Appointment");
const GroomerDayLock = require("../models/GroomerDayLock");
const { deriveAppointmentDateKey } = require("../utils/slotKeys");
const { normalizeToMinute } = require("../utils/date");

/** HTTP 409 body for i18n (frontend maps code → locale string). */
const SLOT_CONFLICT_MESSAGE = "该时间段已被预约";
const SLOT_CONFLICT_CODE = "SLOT_CONFLICT";
const BOARDING_CAPACITY = 8;
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
  console.log("UTC CHECK:", {
    startTime: normalizedStart,
    endTime: normalizedEnd,
    isoStart: normalizedStart.toISOString(),
    isoEnd: normalizedEnd.toISOString(),
  });
  if (newServiceType === "boarding") {
    const countQ = Appointment.countDocuments({
      groomerId,
      serviceType: "boarding",
      startTime: { $lt: normalizedEnd },
      endTime: { $gt: normalizedStart },
      status: { $nin: ["cancelled", "completed"] },
      ...(excludeAppointmentId && {
        _id: {
          $ne: mongoose.isValidObjectId(excludeAppointmentId)
            ? new mongoose.Types.ObjectId(excludeAppointmentId)
            : excludeAppointmentId,
        },
      }),
    });
    if (session) countQ.session(session);
    const count = await countQ;
    if (excludeAppointmentId) {
      console.log("BOARDING LOAD:", {
        groomerId: String(groomerId),
        count,
        capacity: BOARDING_CAPACITY,
      });
    }
    if (count >= BOARDING_CAPACITY) {
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
  const lockId = groomerDayLockId(appointmentDoc.groomerId, appointmentDoc.startTime);
  const session = await mongoose.startSession();

  const work = async (sess) => {
    await GroomerDayLock.findOneAndUpdate(
      { _id: lockId },
      { $inc: { seq: 1 } },
      { upsert: true, session: sess }
    );
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
    await session.withTransaction(async () => {
      await work(session);
    });
  } catch (err) {
    if (isTransactionUnsupportedError(err)) {
      await GroomerDayLock.findOneAndUpdate({ _id: lockId }, { $inc: { seq: 1 } }, { upsert: true });
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
    throw err;
  } finally {
    await session.endSession();
  }
}

/**
 * Reschedule / staff edits: same sequence with excludeAppointmentId.
 */
async function saveAppointmentUpdateWithSlotGuard(appointmentDoc, excludeAppointmentId) {
  const lockId = groomerDayLockId(appointmentDoc.groomerId, appointmentDoc.startTime);
  const session = await mongoose.startSession();

  const work = async (sess) => {
    await GroomerDayLock.findOneAndUpdate(
      { _id: lockId },
      { $inc: { seq: 1 } },
      { upsert: true, session: sess }
    );
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
    await session.withTransaction(async () => {
      await work(session);
    });
  } catch (err) {
    if (isTransactionUnsupportedError(err)) {
      await GroomerDayLock.findOneAndUpdate({ _id: lockId }, { $inc: { seq: 1 } }, { upsert: true });
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
  BOARDING_CAPACITY_FULL_CODE,
  slotConflictBody,
  boardingCapacityBody,
  buildOverlapFilter,
  findBlockingOverlap,
  insertAppointmentWithSlotGuard,
  insertAppointmentWithAutoAssignedGroomer,
  saveAppointmentUpdateWithSlotGuard,
  isDuplicateKeyError,
};
