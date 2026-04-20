const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/** @param {{ isVerified?: boolean, verificationToken?: string } | null | undefined} doc */
function displayEmailVerified(doc) {
  if (!doc) return true;
  if (doc.isVerified === true) return true;
  if (doc.verificationToken) return false;
  if (doc.isVerified === false) return false;
  return true;
}

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ["owner", "groomer", "admin"], required: true },
  phone: { type: String, default: "" },
  /** Email verified (legacy users without this field are treated as verified in API helpers). */
  isVerified: { type: Boolean },
  verificationToken: { type: String },
  verificationTokenExpires: { type: Date },
  /** Preferred language for emails: zh | en */
  preferredLocale: { type: String, enum: ["zh", "en"], default: "en" },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

UserSchema.statics.displayEmailVerified = displayEmailVerified;

UserSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.verificationToken;
    delete ret.verificationTokenExpires;
    ret.isVerified = displayEmailVerified(doc);
    return ret;
  },
});

module.exports = mongoose.model("User", UserSchema);
