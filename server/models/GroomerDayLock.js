const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * One document per groomer + calendar day (MYT date key).
 * Incremented inside MongoDB transactions before conflict check + appointment write
 * so concurrent bookings for the same groomer/day serialize on this document.
 */
const GroomerDayLockSchema = new Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("GroomerDayLock", GroomerDayLockSchema);
