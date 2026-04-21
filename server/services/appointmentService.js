/**
 * Slot conflict prevention: overlap query + GroomerDayLock bump in the same MongoDB transaction
 * (requires replica set). On standalone MongoDB, falls back to lock bump + check + save (small race window).
 */
const mongoose = require("mongoose");
const { Appointment } = require("../models/Appointment");
const GroomerDayLock = require("../models/GroomerDayLock");
const { deriveAppointmentDateKey } = require("../utils/slotKeys");

/** HTTP 409 body for i18n (frontend maps code → locale string). */
const SLOT_CONFLICT_MESSAGE = "该时间段已被预约";
const SLOT_CONFLICT_CODE = "SLOT_CONFLICT";

function slotConflictBody() {
  return {
    message: SLOT_CONFLICT_MESSAGE,
    code: SLOT_CONFLICT_CODE,
  };
}

function groomerDayLockId(groomerId, startTime) {
  return `${groomerId.toString()}_${deriveAppointmentDateKey(startTime)}`;
}

/**
 * Time overlap with active appointments only.
 * Excluded from blocking: cancelled, completed.
 * Boarding vs boarding: allowed (multiple pets same night / same groomer).
 * Boarding vs grooming (basic/full): still conflicts when intervals overlap.
 * Grooming vs anything: conflicts when intervals overlap.
 */
function buildOverlapFilter(groomerId, startTime, endTime, excludeAppointmentId, newServiceType) {
  const q = {
    groomerId,
    status: { $nin: ["cancelled", "completed"] },
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  };
  if (excludeAppointmentId) {
    const normalizedExcludeId = mongoose.isValidObjectId(excludeAppointmentId)
      ? new mongoose.Types.ObjectId(excludeAppointmentId)
      : excludeAppointmentId;
    q._id = { $ne: normalizedExcludeId };
  }
  if (newServiceType === "boarding") {
    q.serviceType = { $in: ["basic", "full"] };
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
  const q = Appointment.findOne(filter);
  if (session) q.session(session);
  return q.lean();
}

function throwSlotConflict() {
  const err = new Error(SLOT_CONFLICT_MESSAGE);
  err.statusCode = 409;
  err.code = SLOT_CONFLICT_CODE;
  err.isSlotConflict = true;
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
  for (const groomerId of groomerIds) {
    const doc = buildAppointmentDoc(groomerId);
    try {
      await insertAppointmentWithSlotGuard(doc);
      return doc;
    } catch (err) {
      if (err?.isSlotConflict) continue;
      if (isDuplicateKeyError(err)) continue;
      throw err;
    }
  }
  // no groomer can take this slot
  throwSlotConflict();
}

module.exports = {
  SLOT_CONFLICT_MESSAGE,
  SLOT_CONFLICT_CODE,
  slotConflictBody,
  buildOverlapFilter,
  findBlockingOverlap,
  insertAppointmentWithSlotGuard,
  insertAppointmentWithAutoAssignedGroomer,
  saveAppointmentUpdateWithSlotGuard,
  isDuplicateKeyError,
};
