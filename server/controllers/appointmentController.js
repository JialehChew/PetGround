const { Appointment } = require("../models/Appointment");
const User = require("../models/User");
const Pet = require("../models/Pet");
const {
  durationMinutesForGrooming,
  computeBoardingWindow,
  PET_SIZES,
  utcMidnightFromYmd,
} = require("../utils/bookingHelpers");
const { deriveAppointmentDateKey } = require("../utils/slotKeys");
const {
  sendBookingConfirmationEmail,
  sendGroomerNotificationEmail,
  sendCancellationEmails,
} = require("../services/emailService");
const { resolveLangFromUser } = require("../utils/locale");
const {
  insertAppointmentWithSlotGuard,
  insertAppointmentWithAutoAssignedGroomer,
  saveAppointmentUpdateWithSlotGuard,
  slotConflictBody,
  isDuplicateKeyError,
} = require("../services/appointmentService");
const { ensureUTCMinuteDate, normalizeToMinute } = require("../utils/date");

function respondSlotConflict(res) {
  const body = slotConflictBody();
  return res.status(409).json({ ...body, error: body.message });
}

function assertPetSize(pet, message = "请先为宠物设置体型后再预约") {
  if (!pet || !pet.size || !PET_SIZES.includes(pet.size)) {
    return message;
  }
  return null;
}

/** Map Mongoose / runtime errors to HTTP status + message for API clients */
function formatSaveError(error) {
  if (!error) return { statusCode: 500, details: "Unknown error" };
  if (error.name === "ValidationError" && error.errors) {
    const details = Object.values(error.errors)
      .map((e) => e.message)
      .join("; ");
    return { statusCode: 400, details: details || error.message };
  }
  const code = error.statusCode;
  if (typeof code === "number" && code >= 400 && code < 600) {
    return { statusCode: code, details: error.message || String(error) };
  }
  return { statusCode: 500, details: error.message || String(error) };
}

exports.createAppointment = async (req, res) => {
  try {
    // only pet owners can book appts
    if (req.user.role !== "owner") {
      return res.status(403).json({ error: "Only pet owners can book appointments" });
    }
    const { petId, groomerId, serviceType, startTime, checkInDate } = req.body;

    if (!petId || !serviceType) {
      return res.status(400).json({ error: "Missing required appointment information" });
    }

    if (!["basic", "full", "boarding"].includes(serviceType)) {
      return res.status(400).json({ error: "Invalid service type" });
    }

    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({ error: "Pet not found" });
    }
    if (pet.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ error: "You can only book appointments for your own pets" });
    }

    const sizeErr = assertPetSize(pet);
    if (sizeErr) return res.status(400).json({ error: sizeErr });

    let appointmentStart;
    let appointmentEnd;
    let duration;
    let checkInMid;
    let checkOutMid;

    if (serviceType === "boarding") {
      const ymd = (checkInDate || "").toString().slice(0, 10);
      if (!ymd) {
        return res.status(400).json({ error: "住宿预约需提供入住日期" });
      }
      const win = computeBoardingWindow(ymd);
      if (!win) return res.status(400).json({ error: "入住日期无效" });
      appointmentStart = win.start;
      appointmentEnd = win.end;
      duration = win.durationMinutes;
      checkInMid = utcMidnightFromYmd(ymd);
      checkOutMid = utcMidnightFromYmd(deriveAppointmentDateKey(win.end));
      if (!checkInMid || !checkOutMid) {
        return res.status(400).json({ error: "入住日期无效" });
      }
    } else {
      if (!startTime) {
        return res.status(400).json({ error: "Missing required appointment information" });
      }
      try {
        appointmentStart = ensureUTCMinuteDate(startTime);
      } catch (e) {
        return res.status(400).json({ error: "Invalid date format, must be ISO UTC string" });
      }
      duration = durationMinutesForGrooming(pet.size);
      if (!duration) {
        return res.status(400).json({ error: "无法根据体型计算服务时长" });
      }
      appointmentEnd = normalizeToMinute(new Date(appointmentStart.getTime() + duration * 60 * 1000));
    }
    appointmentStart = normalizeToMinute(appointmentStart);
    appointmentEnd = normalizeToMinute(appointmentEnd);

    let resolvedGroomerId = groomerId || null;
    if (resolvedGroomerId) {
      const groomer = await User.findOne({ _id: resolvedGroomerId, role: "groomer" });
      if (!groomer) {
        return res.status(404).json({ error: "Groomer not found" });
      }
    }

    const currentTime = new Date();
    if (appointmentStart < currentTime) {
      return res.status(400).json({ error: "Cannot book appointments in the past" });
    }

    if (appointmentStart >= appointmentEnd) {
      return res.status(400).json({ error: "Start time must be before end time" });
    }

    const buildAppointment = (gid) =>
      new Appointment({
        petId,
        ownerId: req.user.id,
        groomerId: gid,
        serviceType,
        duration,
        startTime: appointmentStart,
        endTime: appointmentEnd,
        checkInDate: serviceType === "boarding" ? checkInMid : undefined,
        checkOutDate: serviceType === "boarding" ? checkOutMid : undefined,
        status: "confirmed",
        groomerAcknowledged: false,
        appointmentSource: "owner_booking",
        pricingStatus: "pending",
        totalCost: null,
        paymentStatus: "pending",
        reminderSent: false,
        confirmationSent: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    let newAppointment;
    if (resolvedGroomerId) {
      newAppointment = buildAppointment(resolvedGroomerId);
      try {
        await insertAppointmentWithSlotGuard(newAppointment);
      } catch (err) {
        if (err?.isSlotConflict) return respondSlotConflict(res);
        if (isDuplicateKeyError(err)) return respondSlotConflict(res);
        throw err;
      }
    } else {
      const groomers = await User.find({ role: "groomer" }).select("_id").sort({ _id: 1 }).lean();
      if (!groomers || groomers.length === 0) {
        return res.status(400).json({ error: "No groomers available for auto-assignment" });
      }
      const groomerIds = groomers.map((g) => g._id);
      try {
        newAppointment = await insertAppointmentWithAutoAssignedGroomer(buildAppointment, groomerIds);
      } catch (err) {
        if (err?.isSlotConflict) return respondSlotConflict(res);
        if (isDuplicateKeyError(err)) return respondSlotConflict(res);
        throw err;
      }
    }

    // populate the appt with pet, owner, and groomer details for the email
    const populatedAppointment = await Appointment.findById(newAppointment._id)
      .populate("petId", "name species breed size imageUrl notesForGroomer")
      .populate("ownerId", "name email preferredLocale")
      .populate("groomerId", "name email preferredLocale");

    try {
      const appointmentDetails = {
        bookingReference: populatedAppointment._id.toString().slice(-8).toUpperCase(),
        petName: populatedAppointment.petId?.name || "Pet",
        petBreed: populatedAppointment.petId?.breed || "Unknown breed",
        groomerName: populatedAppointment.groomerId?.name || "Groomer",
        ownerName: populatedAppointment.ownerId?.name || "Pet Owner",
        serviceType: populatedAppointment.serviceType,
        startTime: populatedAppointment.startTime,
        endTime: populatedAppointment.endTime,
        duration: populatedAppointment.duration,
      };

      const ownerLang = resolveLangFromUser(populatedAppointment.ownerId, req);
      const groomerLang = resolveLangFromUser(populatedAppointment.groomerId, req);

      await sendBookingConfirmationEmail(
        populatedAppointment.ownerId.email,
        populatedAppointment.ownerId.name,
        appointmentDetails,
        false,
        ownerLang
      );

      await sendGroomerNotificationEmail(
        populatedAppointment.groomerId.email,
        populatedAppointment.groomerId.name,
        appointmentDetails,
        groomerLang
      );
    } catch (emailError) {
      console.error("Failed to send emails:", emailError);
    }

    res.status(201).json({
      message: "Appointment booked successfully",
      appointment: populatedAppointment,
    });
  } catch (error) {
    console.error("Error booking appointment:", error);
    const { statusCode, details } = formatSaveError(error);
    const isBoarding = req.body?.serviceType === "boarding";
    res.status(statusCode).json({
      error: isBoarding ? "Failed to create boarding appointment" : "Failed to create appointment",
      details,
      ...(process.env.NODE_ENV === "development" && { stack: error?.stack }),
    });
  }
};

/**
 * Groomer books on behalf of a pet owner (walk-in / phone). Same slot rules as owner booking.
 */
exports.createAppointmentAsGroomer = async (req, res) => {
  try {
    if (req.user.role !== "groomer" && req.user.role !== "admin") {
      return res.status(403).json({ error: "Only groomers or admins can use this booking endpoint" });
    }

    const {
      petId,
      startTime,
      serviceType,
      specialInstructions,
      appointmentSource: rawSource,
      checkInDate,
      petSize: bodyPetSize,
    } = req.body;
    let groomerId = req.user.id;
    // admin can book on behalf of any groomer (or fallback to first groomer)
    if (req.user.role === "admin") {
      if (req.body?.groomerId) {
        groomerId = req.body.groomerId;
      } else {
        const firstGroomer = await User.findOne({ role: "groomer" }).select("_id").sort({ _id: 1 }).lean();
        if (!firstGroomer) {
          return res.status(400).json({ error: "No groomers available for booking" });
        }
        groomerId = firstGroomer._id.toString();
      }
    }

    // API: 'online' | 'phone' | 'groomer_created' → stored enum values
    let appointmentSource = "groomer_created";
    if (rawSource === "online") appointmentSource = "online";
    else if (rawSource === "phone" || rawSource === "phone_booking") appointmentSource = "phone_booking";
    else if (rawSource === "groomer_created") appointmentSource = "groomer_created";
    if (!serviceType) {
      return res.status(400).json({ error: "Missing required appointment information" });
    }

    if (!["basic", "full", "boarding"].includes(serviceType)) {
      return res.status(400).json({ error: "Invalid service type" });
    }

    let ownerId = null;
    let resolvedPetId = null;
    let pet = null;
    if (petId) {
      pet = await Pet.findById(petId);
      if (!pet) {
        return res.status(404).json({ error: "Pet not found" });
      }
      resolvedPetId = pet._id;
      ownerId = pet.ownerId;
    }

    const effectiveSize = pet?.size && PET_SIZES.includes(pet.size) ? pet.size : bodyPetSize;
    if (!effectiveSize || !PET_SIZES.includes(effectiveSize)) {
      return res.status(400).json({ error: "请选择宠物体型（建档宠物请补全体型，或手动选择体型）" });
    }

    let appointmentStart;
    let appointmentEnd;
    let duration;
    let checkInMid;
    let checkOutMid;

    if (serviceType === "boarding") {
      const ymd = (checkInDate || "").toString().slice(0, 10);
      if (!ymd) {
        return res.status(400).json({ error: "住宿预约需提供入住日期" });
      }
      const win = computeBoardingWindow(ymd);
      if (!win) return res.status(400).json({ error: "入住日期无效" });
      appointmentStart = win.start;
      appointmentEnd = win.end;
      duration = win.durationMinutes;
      checkInMid = utcMidnightFromYmd(ymd);
      checkOutMid = utcMidnightFromYmd(deriveAppointmentDateKey(win.end));
      if (!checkInMid || !checkOutMid) return res.status(400).json({ error: "入住日期无效" });
    } else {
      if (!startTime) {
        return res.status(400).json({ error: "Missing start time for grooming appointment" });
      }
      try {
        appointmentStart = ensureUTCMinuteDate(startTime);
      } catch (e) {
        return res.status(400).json({ error: "Invalid date format, must be ISO UTC string" });
      }
      duration = durationMinutesForGrooming(effectiveSize);
      appointmentEnd = normalizeToMinute(new Date(appointmentStart.getTime() + duration * 60 * 1000));
    }
    appointmentStart = normalizeToMinute(appointmentStart);
    appointmentEnd = normalizeToMinute(appointmentEnd);

    const groomer = await User.findOne({ _id: groomerId, role: "groomer" });
    if (!groomer) {
      return res.status(404).json({ error: "Groomer not found" });
    }

    const currentTime = new Date();
    if (appointmentStart < currentTime) {
      return res.status(400).json({ error: "Cannot book appointments in the past" });
    }

    if (appointmentStart >= appointmentEnd) {
      return res.status(400).json({ error: "Start time must be before end time" });
    }

    const newAppointment = new Appointment({
      petId: resolvedPetId,
      ownerId,
      groomerId,
      serviceType,
      duration,
      startTime: appointmentStart,
      endTime: appointmentEnd,
      checkInDate: serviceType === "boarding" ? checkInMid : undefined,
      checkOutDate: serviceType === "boarding" ? checkOutMid : undefined,
      petSize: !resolvedPetId ? effectiveSize : undefined,
      status: "confirmed",
      groomerAcknowledged: false,
      appointmentSource,
      pricingStatus: "pending",
      totalCost: null,
      paymentStatus: "pending",
      reminderSent: false,
      confirmationSent: false,
      specialInstructions: specialInstructions || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    try {
      await insertAppointmentWithSlotGuard(newAppointment);
    } catch (err) {
      if (err?.isSlotConflict) return respondSlotConflict(res);
      if (isDuplicateKeyError(err)) return respondSlotConflict(res);
      throw err;
    }

    const populatedAppointment = await Appointment.findById(newAppointment._id)
      .populate("petId", "name species breed size imageUrl notesForGroomer")
      .populate("ownerId", "name email preferredLocale")
      .populate("groomerId", "name email preferredLocale");

    try {
      const appointmentDetails = {
        bookingReference: populatedAppointment._id.toString().slice(-8).toUpperCase(),
        petName: populatedAppointment.petId?.name || "Pet",
        petBreed: populatedAppointment.petId?.breed || "Unknown breed",
        groomerName: populatedAppointment.groomerId?.name || "Groomer",
        ownerName: populatedAppointment.ownerId?.name || "Pet Owner",
        serviceType: populatedAppointment.serviceType,
        startTime: populatedAppointment.startTime,
        endTime: populatedAppointment.endTime,
        duration: populatedAppointment.duration,
      };

      const ownerLang = resolveLangFromUser(populatedAppointment.ownerId, req);
      const groomerLang = resolveLangFromUser(populatedAppointment.groomerId, req);

      if (populatedAppointment.ownerId?.email) {
        await sendBookingConfirmationEmail(
          populatedAppointment.ownerId.email,
          populatedAppointment.ownerId.name,
          appointmentDetails,
          false,
          ownerLang
        );
      }
      await sendGroomerNotificationEmail(
        populatedAppointment.groomerId.email,
        populatedAppointment.groomerId.name,
        appointmentDetails,
        groomerLang
      );
    } catch (emailError) {
      console.error("Failed to send staff-booking emails:", emailError);
    }

    res.status(201).json({
      message: "Appointment booked successfully",
      appointment: populatedAppointment,
    });
  } catch (error) {
    console.error("Error booking appointment (groomer):", error);
    const { statusCode, details } = formatSaveError(error);
    const isBoarding = req.body?.serviceType === "boarding";
    res.status(statusCode).json({
      error: isBoarding ? "Failed to create boarding appointment" : "Failed to create appointment",
      details,
      ...(process.env.NODE_ENV === "development" && { stack: error?.stack }),
    });
  }
};

// get all appts for current user (owner or groomer)
exports.getUserAppointments = async (req, res) => {
  try {
    console.log("Getting appointments for user:", req.user.id, "Role:", req.user.role);

    const userId = req.user.id;
    const { status } = req.query;

    let query = {};

    // filter by role
    if (req.user.role === "owner") {
      query.ownerId = userId;
    } else if (req.user.role === "groomer") {
      // Staff visibility requirement: groomers can see major records, not only self.
      // Keep owner scoped while exposing all appointments for staff operations.
      query = {};
    }

    // filter by status if provided
    if (
      status &&
      ["confirmed", "in_progress", "completed", "cancelled", "no_show"].includes(status)
    ) {
      query.status = status;
    }

    console.log("Query:", query);

    // get appts with populated pet and groomer/owner details
    const appointments = await Appointment.find(query)
      .populate("petId", "name species breed age notes size imageUrl notesForGroomer")
      .populate("ownerId", "name email phone")
      .populate("groomerId", "name email")
      .lean(); // add lean() for better perf

    console.log("Found appointments:", appointments.length);

    // automatically update status of appointments that have ended
    const currentTime = new Date();
    const updatedAppointments = [];

    for (const appointment of appointments) {
      if (
        (appointment.status === "confirmed" || appointment.status === "in_progress") &&
        new Date(appointment.endTime) < currentTime
      ) {
        // update db
        const updateData = {
          status: "completed",
          updatedAt: currentTime,
        };

        // set actual end time if it was in progress
        if (appointment.status === "in_progress" && !appointment.actualEndTime) {
          updateData.actualEndTime = currentTime;
          if (appointment.actualStartTime) {
            updateData.actualDuration = Math.round(
              (currentTime - new Date(appointment.actualStartTime)) / (1000 * 60)
            );
          }
        }

        await Appointment.findByIdAndUpdate(appointment._id, updateData);

        // update local object
        appointment.status = "completed";
        appointment.updatedAt = currentTime;
        updatedAppointments.push(appointment._id);
      }
    }

    if (updatedAppointments.length > 0) {
      console.log(`Automatically marked ${updatedAppointments.length} appointments as completed`);
    }

    // sort appointments by start time (newest first)
    appointments.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

    res.status(200).json(appointments);
  } catch (error) {
    console.error("Detailed error fetching appointments:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      error: "Server error fetching appointments",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// get specific appt by id
exports.getAppointmentById = async (req, res) => {
  try {
    const appointmentId = req.params.id;

    const appointment = await Appointment.findById(appointmentId)
      .populate("petId", "name species breed age notes size imageUrl notesForGroomer")
      .populate("ownerId", "name email phone")
      .populate("groomerId", "name email");

    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    // check if appt shld be marked as completed
    const currentTime = new Date();
    if (
      (appointment.status === "confirmed" || appointment.status === "in_progress") &&
      new Date(appointment.endTime) < currentTime
    ) {
      appointment.status = "completed";

      // set actual end time if it was in progress
      if (appointment.status === "in_progress" && !appointment.actualEndTime) {
        appointment.actualEndTime = currentTime;
        if (appointment.actualStartTime) {
          appointment.actualDuration = Math.round(
            (currentTime - new Date(appointment.actualStartTime)) / (1000 * 60)
          );
        }
      }

      appointment.updatedAt = currentTime;
      await appointment.save();
      console.log(`Automatically marked appointment ${appointment._id} as completed`);
    }

    // checks if user authorized to view appt
    const ownerId = appointment.ownerId && appointment.ownerId._id ? appointment.ownerId._id.toString() : null;
    const groomerId = appointment.groomerId && appointment.groomerId._id ? appointment.groomerId._id.toString() : null;
    if (req.user.role === "owner" && (!ownerId || ownerId !== req.user.id)) {
      return res.status(403).json({ error: "Not authorized to view this appointment" });
    }
    res.status(200).json(appointment);
  } catch (error) {
    console.error("Error fetching appointment:", error);
    res.status(500).json({ error: "Server error fetching appointment details" });
  }
};

// reschedule appt (owners only)
exports.updateAppointment = async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const { petId, groomerId, serviceType, startTime, checkInDate } = req.body;

    if (!petId || !groomerId || !serviceType) {
      return res.status(400).json({ error: "Missing required appointment information" });
    }

    if (!["basic", "full", "boarding"].includes(serviceType)) {
      return res.status(400).json({ error: "Invalid service type" });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }
    const isOwnerOfAppointment =
      req.user.role === "owner" && appointment.ownerId.toString() === req.user.id;
    const isAssignedGroomer =
      req.user.role === "groomer" && appointment.groomerId.toString() === req.user.id;
    if (!isOwnerOfAppointment && !isAssignedGroomer) {
      return res.status(403).json({ error: "Not authorized to update this appointment" });
    }
    if (isAssignedGroomer && groomerId !== req.user.id) {
      return res.status(403).json({ error: "Cannot reassign this appointment to another groomer" });
    }
    if (!appointment.canModify()) {
      return res.status(400).json({
        error: "Cannot modify appointments less than 24 hours before start time",
      });
    }

    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({ error: "Pet not found" });
    }
    if (req.user.role === "owner" && pet.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Pet does not belong to you" });
    }
    const sizeErr = assertPetSize(pet);
    if (sizeErr) return res.status(400).json({ error: sizeErr });

    let appointmentStart;
    let appointmentEnd;
    let duration;
    let checkInMid;
    let checkOutMid;

    if (serviceType === "boarding") {
      const ymd = (checkInDate || "").toString().slice(0, 10);
      if (!ymd) {
        return res.status(400).json({ error: "住宿预约需提供入住日期" });
      }
      const win = computeBoardingWindow(ymd);
      if (!win) return res.status(400).json({ error: "入住日期无效" });
      appointmentStart = win.start;
      appointmentEnd = win.end;
      duration = win.durationMinutes;
      checkInMid = utcMidnightFromYmd(ymd);
      checkOutMid = utcMidnightFromYmd(deriveAppointmentDateKey(win.end));
      if (!checkInMid || !checkOutMid) return res.status(400).json({ error: "入住日期无效" });
    } else {
      if (!startTime) {
        return res.status(400).json({ error: "Missing start time for grooming appointment" });
      }
      try {
        appointmentStart = ensureUTCMinuteDate(startTime);
      } catch (e) {
        return res.status(400).json({ error: "Invalid date format, must be ISO UTC string" });
      }
      duration = durationMinutesForGrooming(pet.size);
      if (!duration) {
        return res.status(400).json({ error: "无法根据体型计算服务时长" });
      }
      appointmentEnd = normalizeToMinute(new Date(appointmentStart.getTime() + duration * 60 * 1000));
    }
    appointmentStart = normalizeToMinute(appointmentStart);
    appointmentEnd = normalizeToMinute(appointmentEnd);

    const currentTime = new Date();
    if (appointmentStart < currentTime) {
      return res.status(400).json({ error: "Cannot reschedule to a time in the past" });
    }

    appointment.petId = petId;
    appointment.groomerId = groomerId;
    appointment.serviceType = serviceType;
    appointment.duration = duration;
    appointment.startTime = appointmentStart;
    appointment.endTime = appointmentEnd;
    if (serviceType === "boarding") {
      appointment.checkInDate = checkInMid;
      appointment.checkOutDate = checkOutMid;
    } else {
      appointment.checkInDate = null;
      appointment.checkOutDate = null;
    }
    appointment.updatedAt = new Date();
    appointment.status = "confirmed";

    try {
      await saveAppointmentUpdateWithSlotGuard(appointment, appointment._id);
    } catch (err) {
      if (err?.isSlotConflict) return respondSlotConflict(res);
      if (isDuplicateKeyError(err)) return respondSlotConflict(res);
      throw err;
    }

    // populate the appointment with pet, owner, and groomer details for the email
    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate("petId", "name species breed size imageUrl notesForGroomer")
      .populate("ownerId", "name email preferredLocale")
      .populate("groomerId", "name email preferredLocale");

    // send rescheduled appointment confirmation email and groomer notification
    try {
      const appointmentDetails = {
        bookingReference: populatedAppointment._id.toString().slice(-8).toUpperCase(),
        petName: populatedAppointment.petId?.name || "Pet",
        petBreed: populatedAppointment.petId?.breed || "Unknown breed",
        groomerName: populatedAppointment.groomerId?.name || "Groomer",
        ownerName: populatedAppointment.ownerId?.name || "Pet Owner",
        serviceType: populatedAppointment.serviceType,
        startTime: populatedAppointment.startTime,
        endTime: populatedAppointment.endTime,
        duration: populatedAppointment.duration,
      };

      const ownerLang = resolveLangFromUser(populatedAppointment.ownerId, req);
      const groomerLang = resolveLangFromUser(populatedAppointment.groomerId, req);

      // send confirmation email to pet owner
      await sendBookingConfirmationEmail(
        populatedAppointment.ownerId.email,
        populatedAppointment.ownerId.name,
        appointmentDetails,
        true,
        ownerLang
      );

      console.log(
        "Rescheduled appointment confirmation email sent for appointment:",
        populatedAppointment._id
      );

      // Send notification email to groomer about rescheduled appointment
      await sendGroomerNotificationEmail(
        populatedAppointment.groomerId.email,
        populatedAppointment.groomerId.name,
        appointmentDetails,
        groomerLang
      );

      console.log(
        "Groomer notification email sent for rescheduled appointment:",
        populatedAppointment._id
      );
    } catch (emailError) {
      console.error("Failed to send rescheduled appointment emails:", emailError);
      // Don't fail the appointment update if email fails
    }

    res.status(200).json({
      message: "Appointment updated successfully",
      appointment: populatedAppointment,
    });
  } catch (error) {
    console.error("Error updating appointment:", error);
    res.status(500).json({ error: "Server error updating appointment" });
  }
};

// delete an appt (owners only)
exports.deleteAppointment = async (req, res) => {
  try {
    const appointmentId = req.params.id;

    const appointment = await Appointment.findById(appointmentId)
      .populate("petId", "name species breed imageUrl notesForGroomer")
      .populate("ownerId", "name email preferredLocale")
      .populate("groomerId", "name email preferredLocale");

    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    const ownerId = appointment.ownerId && appointment.ownerId._id ? appointment.ownerId._id.toString() : null;
    const isAdmin = req.user.role === "admin";
    const isOwnerOfAppointment = req.user.role === "owner" && ownerId === req.user.id;
    const isAssignedGroomer =
      req.user.role === "groomer" && appointment.groomerId._id.toString() === req.user.id;
    if (!isAdmin && !isOwnerOfAppointment && !isAssignedGroomer) {
      return res.status(403).json({ error: "Not authorized to cancel this appointment" });
    }

    // check if appt can be modified
    if (!appointment.canModify()) {
      return res.status(400).json({
        error: "Cannot delete appointments less than 24 hours before start time",
      });
    }

    if (appointment.status === "cancelled") {
      return res.status(400).json({ error: "Appointment is already cancelled" });
    }

    // prepare appt details for email
    const appointmentDetails = {
      bookingReference: appointment._id.toString().slice(-8).toUpperCase(),
      petName: appointment.petId?.name || "Pet",
      petBreed: appointment.petId?.breed || "Unknown breed",
      serviceType: appointment.serviceType,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      duration: appointment.duration,
    };

    try {
      const ownerLang = resolveLangFromUser(appointment.ownerId, req);
      const groomerLang = resolveLangFromUser(appointment.groomerId, req);
      await sendCancellationEmails(
        appointment.ownerId.email,
        appointment.ownerId.name,
        appointment.groomerId.email,
        appointment.groomerId.name,
        appointmentDetails,
        ownerLang,
        groomerLang
      );
      console.log("Cancellation emails sent for appointment:", appointment._id);
    } catch (emailError) {
      console.error("Failed to send cancellation emails:", emailError);
    }

    // soft cancel — frees the slot (status cancelled excluded from conflict / availability)
    appointment.status = "cancelled";
    appointment.updatedAt = new Date();
    appointment.cancellationReason =
      req.body?.cancellationReason ||
      (isAdmin ? "admin_cancelled" : isAssignedGroomer ? "groomer_cancelled" : "owner_cancelled");
    await appointment.save();

    const cancelled = await Appointment.findById(appointmentId)
      .populate("petId", "name species breed imageUrl notesForGroomer")
      .populate("ownerId", "name email")
      .populate("groomerId", "name email");

    res.status(200).json({
      message: "Appointment cancelled successfully",
      appointment: cancelled,
    });
  } catch (error) {
    console.error("Error deleting appointment:", error);
    res.status(500).json({ error: "Server error deleting appointment" });
  }
};

// Workflow Actions for Groomers

// acknowledge appointment (groomers only)
exports.acknowledgeAppointment = async (req, res) => {
  try {
    // only groomers can acknowledge appointments
    if (req.user.role !== "groomer") {
      return res.status(403).json({ error: "Only groomers can acknowledge appointments" });
    }

    const appointmentId = req.params.id;
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    // check if groomer is assigned to this appointment
    if (appointment.groomerId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to acknowledge this appointment" });
    }

    // update groomer acknowledged flag
    appointment.groomerAcknowledged = true;
    appointment.updatedAt = new Date();
    await appointment.save();

    // populate appointment for response
    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate("petId", "name species breed imageUrl notesForGroomer")
      .populate("ownerId", "name email")
      .populate("groomerId", "name email");

    res.status(200).json({
      message: "Appointment acknowledged successfully",
      appointment: populatedAppointment,
    });
  } catch (error) {
    console.error("Error acknowledging appointment:", error);
    res.status(500).json({ error: "Server error acknowledging appointment" });
  }
};

// set pricing for appointment (groomers only)
exports.setPricing = async (req, res) => {
  try {
    // only groomers can set pricing
    if (req.user.role !== "groomer") {
      return res.status(403).json({ error: "Only groomers can set pricing" });
    }

    const appointmentId = req.params.id;
    const { totalCost, pricingStatus = "estimated", reason } = req.body;

    if (!totalCost || totalCost <= 0) {
      return res.status(400).json({ error: "Valid total cost is required" });
    }

    if (!reason) {
      return res.status(400).json({ error: "Reason for pricing is required" });
    }

    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    // check if groomer is assigned to this appointment
    if (appointment.groomerId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to set pricing for this appointment" });
    }

    // add to price history
    appointment.priceHistory.push({
      amount: totalCost,
      setAt: new Date(),
      reason: reason,
      setBy: req.user.id,
    });

    // update current pricing
    appointment.totalCost = totalCost;
    appointment.pricingStatus = pricingStatus;
    appointment.updatedAt = new Date();
    await appointment.save();

    // populate appointment for response
    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate("petId", "name species breed imageUrl notesForGroomer")
      .populate("ownerId", "name email")
      .populate("groomerId", "name email")
      .populate("priceHistory.setBy", "name");

    res.status(200).json({
      message: "Pricing set successfully",
      appointment: populatedAppointment,
    });
  } catch (error) {
    console.error("Error setting pricing:", error);
    res.status(500).json({ error: "Server error setting pricing" });
  }
};

// start service (groomers only)
exports.startService = async (req, res) => {
  try {
    // only groomers can start service
    if (req.user.role !== "groomer") {
      return res.status(403).json({ error: "Only groomers can start service" });
    }

    const appointmentId = req.params.id;
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    // check if groomer is assigned to this appointment
    if (appointment.groomerId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to start this service" });
    }

    // check if appointment is in correct status
    if (appointment.status !== "confirmed") {
      return res.status(400).json({ error: "Can only start confirmed appointments" });
    }

    // check if appointment has been acknowledged
    if (!appointment.groomerAcknowledged) {
      return res
        .status(400)
        .json({ error: "Appointment must be acknowledged before starting service" });
    }

    // update status and set actual start time
    appointment.status = "in_progress";
    appointment.actualStartTime = new Date();
    appointment.updatedAt = new Date();
    await appointment.save();

    // populate appointment for response
    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate("petId", "name species breed age notes imageUrl notesForGroomer")
      .populate("ownerId", "name email phone")
      .populate("groomerId", "name email");

    res.status(200).json({
      message: "Service started successfully",
      appointment: populatedAppointment,
    });
  } catch (error) {
    console.error("Error starting service:", error);
    res.status(500).json({ error: "Server error starting service" });
  }
};

// complete service (groomers only)
exports.completeService = async (req, res) => {
  try {
    // only groomers can complete service
    if (req.user.role !== "groomer") {
      return res.status(403).json({ error: "Only groomers can complete service" });
    }

    const appointmentId = req.params.id;
    const { groomerNotes, photos } = req.body;

    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    // check if groomer is assigned to this appointment
    if (appointment.groomerId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to complete this service" });
    }

    // check if appointment is in correct status
    if (appointment.status !== "in_progress") {
      return res.status(400).json({ error: "Can only complete appointments that are in progress" });
    }

    // update status and set completion details
    appointment.status = "completed";
    appointment.actualEndTime = new Date();

    // calculate actual duration if we have actual start time
    if (appointment.actualStartTime) {
      appointment.actualDuration = Math.round(
        (appointment.actualEndTime - appointment.actualStartTime) / (1000 * 60)
      );
    }

    // add groomer notes if provided
    if (groomerNotes) {
      appointment.groomerNotes = groomerNotes;
    }

    // add photos if provided
    if (photos && Array.isArray(photos)) {
      appointment.photos = photos.map((photo) => ({
        url: photo.url,
        uploadedAt: new Date(),
        description: photo.description || "",
      }));
    }

    appointment.updatedAt = new Date();
    await appointment.save();

    // populate appointment for response
    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate("petId", "name species breed age notes imageUrl notesForGroomer")
      .populate("ownerId", "name email phone")
      .populate("groomerId", "name email");

    res.status(200).json({
      message: "Service completed successfully",
      appointment: populatedAppointment,
    });
  } catch (error) {
    console.error("Error completing service:", error);
    res.status(500).json({ error: "Server error completing service" });
  }
};
