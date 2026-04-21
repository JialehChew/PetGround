require("dotenv").config();
const mongoose = require("mongoose");
const { Appointment } = require("../models/Appointment");

function buildMongoUri() {
  if (process.env.MONGODB_URI?.trim()) return process.env.MONGODB_URI.trim();
  const username = encodeURIComponent(process.env.MONGODB_USERNAME || "");
  const password = encodeURIComponent(process.env.MONGODB_PASSWORD || "");
  const cluster = process.env.MONGODB_CLUSTER || "";
  const database = process.env.MONGODB_DATABASE || "";
  return `mongodb+srv://${username}:${password}@${cluster}.dys46.mongodb.net/${database}?retryWrites=true&w=majority`;
}

async function run() {
  const fix = process.argv.includes("--fix");
  const mongoUri = buildMongoUri();
  await mongoose.connect(mongoUri);

  const stringStartCount = await Appointment.countDocuments({ startTime: { $type: "string" } });
  const stringEndCount = await Appointment.countDocuments({ endTime: { $type: "string" } });
  console.log("[time-audit] string startTime:", stringStartCount);
  console.log("[time-audit] string endTime:", stringEndCount);

  if (!fix) {
    console.log("[time-audit] dry run complete (use --fix to convert string to Date).");
    return;
  }

  const cursor = Appointment.find({
    $or: [{ startTime: { $type: "string" } }, { endTime: { $type: "string" } }],
  }).cursor();
  let converted = 0;
  for await (const doc of cursor) {
    if (typeof doc.startTime === "string") doc.startTime = new Date(doc.startTime);
    if (typeof doc.endTime === "string") doc.endTime = new Date(doc.endTime);
    if (Number.isNaN(new Date(doc.startTime).getTime()) || Number.isNaN(new Date(doc.endTime).getTime())) {
      continue;
    }
    await doc.save();
    converted += 1;
  }
  console.log("[time-audit] converted docs:", converted);
}

run()
  .catch((err) => {
    console.error("[time-audit] failed:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
