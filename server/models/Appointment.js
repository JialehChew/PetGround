const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { deriveAppointmentDateKey, deriveTimeSlotKey } = require("../utils/slotKeys");
const { computeBoardingWindow } = require("../utils/bookingHelpers");

const AppointmentSchema = new Schema({
  // Manual walk-in bookings may not have a pet/owner selected yet.
  petId: { type: Schema.Types.ObjectId, ref: "Pet", required: false, default: null },
  ownerId: { type: Schema.Types.ObjectId, ref: "User", required: false, default: null },
  groomerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  serviceType: { type: String, enum: ["basic", "full", "boarding"], required: true },
  /** Grooming: 60/90/120; boarding: overnight span in minutes */
  duration: { type: Number, required: true, min: 30, max: 60 * 72 },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true }, // ISO 8601 format (e.g., 2025-03-15T14:30:00Z)
  checkInDate: { type: Date },
  checkOutDate: { type: Date },
  petSize: { type: String, enum: ["small", "medium", "large", "xlarge"] },
  status: {
    type: String,
    enum: ["confirmed", "in_progress", "completed", "cancelled", "no_show"],
    default: "confirmed",
  },

  // groomer workflow fields
  groomerAcknowledged: { type: Boolean, default: false },
  appointmentSource: {
    type: String,
    enum: ["owner_booking", "groomer_created", "phone_booking", "online"],
    default: "owner_booking",
  },

  // pricing fields
  pricingStatus: {
    type: String,
    enum: ["pending", "estimated", "confirmed"],
    default: "pending",
  },
  totalCost: { type: Number, default: null },
  priceHistory: [
    {
      amount: { type: Number, required: true },
      setAt: { type: Date, default: Date.now },
      reason: { type: String, required: true },
      setBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
  ],

  // service tracking
  actualStartTime: { type: Date },
  actualEndTime: { type: Date },
  actualDuration: { type: Number },

  // additional fields
  specialInstructions: { type: String },
  groomerNotes: { type: String },
  photos: [
    {
      url: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now },
      description: { type: String },
    },
  ],

  // cancellation tracking
  cancellationReason: { type: String },
  cancellationFee: { type: Number },
  noShowFee: { type: Number },

  // payment tracking
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "refunded"],
    default: "pending",
  },

  // communication tracking
  reminderSent: { type: Boolean, default: false },
  confirmationSent: { type: Boolean, default: false },

  // denormalized keys for indexing / queries (MYT calendar day + hour bucket)
  appointmentDateKey: { type: String },
  timeSlotKey: { type: String },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// compound index for groomer + day + slot bucket; partial unique prevents double-book same instant
AppointmentSchema.index({ groomerId: 1, appointmentDateKey: 1, timeSlotKey: 1 });
// Same instant only forbidden for grooming — multiple boarding may share identical check-in startTime
AppointmentSchema.index(
  { groomerId: 1, startTime: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $ne: "cancelled" },
      serviceType: { $in: ["basic", "full"] },
    },
  }
);

// biz hours config
const BUSINESS_HOURS = {
  0: { start: 10, end: 19 }, // Sunday: 10am-7pm MYT
  1: { start: 11, end: 20 }, // Monday: 11am-8pm MYT
  2: { start: 11, end: 20 }, // Tuesday: 11am-8pm MYT
  3: null, // Wednesday: Closed
  4: { start: 11, end: 20 }, // Thursday: 11am-8pm MYT
  5: { start: 11, end: 20 }, // Friday: 11am-8pm MYT
  6: { start: 10, end: 19 }, // Saturday: 10am-7pm MYT
};

// MYT weekday (0–6) from an UTC instant (aligns with slot / biz-hour logic)
AppointmentSchema.statics.getMYTDayOfWeek = function (utcDate) {
  const d = utcDate instanceof Date ? utcDate : new Date(utcDate);
  const myt = new Date(d.getTime() + 8 * 60 * 60 * 1000);
  return myt.getUTCDay();
};

// helper function to check if a day is a business day
AppointmentSchema.statics.isBusinessDay = function (date) {
  const dayOfWeek = new Date(date).getDay();
  return BUSINESS_HOURS[dayOfWeek] !== null;
};

/** Business day using Malaysia calendar day of the given UTC timestamp */
AppointmentSchema.statics.isBusinessDayMYT = function (utcInstant) {
  const dow = this.getMYTDayOfWeek(utcInstant);
  return BUSINESS_HOURS[dow] !== null;
};

// helper function to get business hours for a specific day
AppointmentSchema.statics.getBusinessHours = function (date) {
  const dayOfWeek = new Date(date).getDay();
  return BUSINESS_HOURS[dayOfWeek];
};

AppointmentSchema.statics.getBusinessHoursForMYTInstant = function (utcInstant) {
  const dow = this.getMYTDayOfWeek(utcInstant);
  return BUSINESS_HOURS[dow];
};

// instance methods are useful when working with individual appointment instances
// ie. one specific appt at a time
// check if the appointment can be modified (>24h before start)
AppointmentSchema.methods.canModify = function () {
  const currentTime = new Date();
  const appointmentTime = new Date(this.startTime);
  // calculate difference in hours
  const hoursDifference = (appointmentTime - currentTime) / (1000 * 60 * 60);
  return hoursDifference > 24; // returns true if more than 24 hrs before start
};

// instance method to check if appointment should be marked as completed
AppointmentSchema.methods.shouldBeCompleted = function () {
  const currentTime = new Date();
  const appointmentEndTime = new Date(this.endTime);
  // checks if current time is after appointment end time and if status is confirmed
  return currentTime > appointmentEndTime && this.status === "confirmed";
};

// custom helper method to update status of confirmed appointments that have ended
AppointmentSchema.statics.updateCompletedAppointments = async function (appointments) {
  const currentTime = new Date();
  const updatedAppointments = [];

  for (const appointment of appointments) {
    if (
      (appointment.status === "confirmed" || appointment.status === "in_progress") &&
      new Date(appointment.endTime) < currentTime
    ) {
      appointment.status = "completed";
      appointment.updatedAt = currentTime;
      // set actual end time if it was in progress
      if (appointment.status === "in_progress" && !appointment.actualEndTime) {
        appointment.actualEndTime = currentTime;
        appointment.actualDuration = Math.round(
          (currentTime - new Date(appointment.actualStartTime || appointment.startTime)) /
            (1000 * 60)
        );
      }
      await appointment.save();
      updatedAppointments.push(appointment._id);
    }
  }

  return updatedAppointments;
};

// custom method to check for time conflicts, super impt job of checking whether potential appt overlaps with existing one
AppointmentSchema.statics.checkForConflicts = async function (
  groomerId,
  startTime,
  endTime,
  excludeAppointmentId = null // optional param to exclude current appt from check, used when updating existing appt
) {
  const query = {
    groomerId,
    // only cancelled appointments free the slot (completed / no_show / in_progress still occupy until cancelled)
    status: { $ne: "cancelled" },
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  };
  // finds existing appointments that overlap with proposed time slot
  // find appointments where
  // the existing appointment's start time is before (lt) the new appointment's end time
  // AND
  // the existing appointment's end time is after (gt) the new appointment's start time

  // this condition captures all possible overlap scenarios
  /* 
  S1: New appt starts during existing appt
  Existing:  |------------| 10:00 - 11:00
  New:              |------------| 10:30 - 11:30
  S2: New appt ends during existing appt
  Existing:          |------------|  10:00 - 11:00
  New:      |------------| 09:30 - 10:30
  S3: New appt completely inside existing appt
  Existing:  |---------------| 09:00 - 11:00
  New:          |-----| 09:30 - 10:30
  S4: New appt completely contains existing appt
  Existing:     |-----| 09:30 - 10:30
  New:      |--------------| 09:00 - 11:00
  */

  // exclude the current appointment if updating
  if (excludeAppointmentId) {
    query._id = { $ne: excludeAppointmentId };
  }
  // executes query to get all appts that satisfy the conditions
  const conflictingAppointments = await this.find(query);
  // returns true if there are any conflicting appointments
  return conflictingAppointments.length > 0;
};

// middleware (pre-save validation)
AppointmentSchema.pre("save", function (next) {
  if (this.startTime && this.endTime) {
    this.appointmentDateKey = deriveAppointmentDateKey(this.startTime);
    this.timeSlotKey = deriveTimeSlotKey(this.startTime);
  }

  if (this.startTime >= this.endTime) {
    const err = new Error("Start time must be before end time");
    return next(err);
  }

  const isBoarding = this.serviceType === "boarding";

  if (isBoarding) {
    if (!this.checkInDate || !this.checkOutDate) {
      return next(new Error("住宿预约需提供入住日与退房日"));
    }
    let checkInYmd;
    if (this.checkInDate instanceof Date) {
      const d = this.checkInDate;
      checkInYmd = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
        d.getUTCDate()
      ).padStart(2, "0")}`;
    } else {
      checkInYmd = String(this.checkInDate).slice(0, 10);
    }
    const win = computeBoardingWindow(checkInYmd);
    if (!win) return next(new Error("入住日期格式无效"));
    const eps = 2 * 60 * 1000;
    if (Math.abs(win.start.getTime() - this.startTime.getTime()) > eps) {
      return next(new Error("住宿入住时间须为当天 11:00 (MYT)"));
    }
    if (Math.abs(win.end.getTime() - this.endTime.getTime()) > eps) {
      return next(new Error("住宿退房时间须为翌日 17:00 (MYT)"));
    }
    if (!this.constructor.isBusinessDayMYT(this.startTime)) {
      return next(new Error("入住日为本店休息日，无法预约住宿"));
    }
  } else {
    if (!this.constructor.isBusinessDayMYT(this.startTime)) {
      const err = new Error("Appointments cannot be scheduled on days when we are closed");
      return next(err);
    }

    const businessHours = this.constructor.getBusinessHoursForMYTInstant(this.startTime);
    if (!businessHours) {
      return next(new Error("Appointments cannot be scheduled on days when we are closed"));
    }

    const startTimeInMYT = new Date(this.startTime.getTime() + 8 * 60 * 60 * 1000);
    const endTimeInMYT = new Date(this.endTime.getTime() + 8 * 60 * 60 * 1000);
    const startHour = startTimeInMYT.getUTCHours();
    const endHour = endTimeInMYT.getUTCHours();
    const endMinute = endTimeInMYT.getUTCMinutes();

    if (
      startHour < businessHours.start ||
      endHour > businessHours.end ||
      (endHour === businessHours.end && endMinute > 0)
    ) {
      const err = new Error("Appointment must be within business hours");
      return next(err);
    }
  }

  this.updatedAt = Date.now();
  next();
});

// added these static methods to simplify availability checks, controller will be a lot cleaner
// appointments that still occupy slots (only cancelled frees the calendar; name kept for callers)
AppointmentSchema.statics.getGroomerConfirmedAppointments = async function (groomerId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const dayKey = deriveAppointmentDateKey(new Date(date));

  return await this.find({
    groomerId,
    status: { $ne: "cancelled" },
    $or: [
      { appointmentDateKey: dayKey },
      {
        appointmentDateKey: { $exists: false },
        startTime: { $gte: startOfDay, $lte: endOfDay },
      },
      // overnight boarding / any appt spanning this calendar day (MYT overlap via stored UTC)
      { startTime: { $lt: endOfDay }, endTime: { $gt: startOfDay } },
    ],
  }).sort({ startTime: 1 });
};

AppointmentSchema.statics.getAvailableTimeSlots = async function (groomerId, date, duration) {
  // check if it's a business day
  if (!this.isBusinessDay(date)) {
    return []; // no slots available on closed days
  }

  // get business hours for this specific day
  const businessHours = this.getBusinessHours(date);
  if (!businessHours) {
    return [];
  }

  const appointments = await this.getGroomerConfirmedAppointments(groomerId, date);

  // get TimeBlock model from the exports
  const TimeBlock = require("./Appointment").TimeBlock;

  // get all time blocks for this day
  const timeBlocks = await TimeBlock.getGroomerTimeBlocks(groomerId, date);

  const dayDate = new Date(date);
  const slots = [];

  // 30-minute grid supports 60 / 90 / 120 min grooming
  const step = 30;
  for (let hour = businessHours.start; hour < businessHours.end; hour++) {
    for (let minute = 0; minute < 60; minute += step) {
      const slotStartMYT = hour + minute / 60;
      const slotEndMYT = slotStartMYT + duration / 60;

      if (slotEndMYT <= businessHours.end) {
        const slotStart = new Date(dayDate);
        slotStart.setUTCHours(hour - 8, minute, 0, 0);
        const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);

        slots.push({
          start: slotStart,
          end: slotEnd,
          available: true,
        });
      }
    }
  }

  // mark slots as unavailable if they conflict with existing appointments
  for (const appointment of appointments) {
    const appointmentStart = new Date(appointment.startTime);
    const appointmentEnd = new Date(appointment.endTime);

    for (const slot of slots) {
      if (slot.start < appointmentEnd && slot.end > appointmentStart) {
        slot.available = false;
      }
    }
  }

  // mark slots as unavailable if they conflict with time blocks
  for (const timeBlock of timeBlocks) {
    const blockStart = new Date(timeBlock.startTime);
    const blockEnd = new Date(timeBlock.endTime);

    for (const slot of slots) {
      if (slot.start < blockEnd && slot.end > blockStart) {
        slot.available = false;
      }
    }
  }

  // filter out past time slots for the current day
  const now = new Date();
  const currentTime = now.getTime();

  return slots.filter((slot) => {
    // keep the slot if it's available and not in the past
    return slot.available && slot.start.getTime() > currentTime;
  });
};

// timeblock model for groomer availability management
const TimeBlockSchema = new Schema({
  groomerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  blockType: {
    type: String,
    enum: ["unavailable", "break", "lunch", "personal", "maintenance"],
    default: "unavailable",
  },
  reason: { type: String },
  isRecurring: { type: Boolean, default: false },
  recurringPattern: {
    frequency: { type: String, enum: ["daily", "weekly", "monthly"] },
    daysOfWeek: [{ type: Number, min: 0, max: 6 }], // 0 = Sunday, 6 = Saturday
    endDate: { type: Date },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// validation to ensure startTime is before endTime
TimeBlockSchema.pre("save", function (next) {
  if (this.startTime >= this.endTime) {
    const err = new Error("Start time must be before end time");
    return next(err);
  }
  this.updatedAt = Date.now();
  next();
});

// static method to get all time blocks for a groomer on a specific date
TimeBlockSchema.statics.getGroomerTimeBlocks = async function (groomerId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return await this.find({
    groomerId,
    startTime: { $lt: endOfDay },
    endTime: { $gt: startOfDay },
  }).sort({ startTime: 1 });
};

// static method to check for conflicts with existing time blocks
TimeBlockSchema.statics.checkForTimeBlockConflicts = async function (
  groomerId,
  startTime,
  endTime,
  excludeBlockId = null
) {
  const query = {
    groomerId,
    $or: [{ startTime: { $lt: endTime }, endTime: { $gt: startTime } }],
  };

  if (excludeBlockId) {
    query._id = { $ne: excludeBlockId };
  }

  const conflictingBlocks = await this.find(query);
  return conflictingBlocks.length > 0;
};

const TimeBlock = mongoose.model("TimeBlock", TimeBlockSchema);

module.exports = {
  Appointment: mongoose.model("Appointment", AppointmentSchema),
  TimeBlock: TimeBlock,
};
