const User = require("../models/User");
const Pet = require("../models/Pet");
const { Appointment } = require("../models/Appointment");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { sendAdminNewPasswordEmail } = require("../services/emailService");
const { ensureUTCDate } = require("../utils/date");

/**
 * Admin-only: create a groomer account.
 * Body: { name, email, password, phone? }
 */
exports.createGroomer = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      email,
      phone: phone || "",
      password: hashedPassword,
      role: "groomer",
      isVerified: true,
      verificationToken: undefined,
      verificationTokenExpires: undefined,
    });

    await newUser.save();

    return res.status(201).json({
      message: "Groomer created successfully",
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone || "",
        role: newUser.role,
        isVerified: User.displayEmailVerified(newUser),
      },
    });
  } catch (error) {
    console.error("Error creating groomer:", error);
    return res.status(500).json({ error: "Server error creating groomer" });
  }
};

/**
 * Admin-only: list users with optional search.
 * Query: ?q=<name_or_email>
 */
exports.getUsers = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const filter = {};
    if (q) {
      const rgx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ name: rgx }, { email: rgx }];
    }

    const users = await User.find(filter)
      .select("_id name email role phone createdAt isVerified verificationToken preferredLocale")
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();

    const ownerIds = users.filter((u) => u.role === "owner").map((u) => String(u._id));
    let petCountByOwner = {};
    if (ownerIds.length > 0) {
      const ownerObjIds = ownerIds.map((id) => new mongoose.Types.ObjectId(id));
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
      petCount: u.role === "owner" ? petCountByOwner[String(u._id)] || 0 : 0,
    }));

    return res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ error: "Server error fetching users" });
  }
};

/**
 * Admin-only: list all active pets for a specific owner.
 */
exports.getClientPets = async (req, res) => {
  try {
    const userId = req.params.id;
    const target = await User.findById(userId).select("_id role");
    if (!target) {
      return res.status(404).json({ error: "User not found" });
    }
    if (target.role !== "owner") {
      return res.status(400).json({ error: "Target user is not an owner" });
    }

    const pets = await Pet.find({ ownerId: userId, isDeleted: { $ne: true } }).sort({ createdAt: -1 });
    return res.status(200).json(pets);
  } catch (error) {
    console.error("Error fetching client pets:", error);
    return res.status(500).json({ error: "Server error fetching client pets" });
  }
};

/**
 * Admin-only: list appointments for a specific owner with optional date range.
 * Query:
 * - from: ISO datetime (inclusive)
 * - to: ISO datetime (inclusive)
 */
exports.getClientAppointments = async (req, res) => {
  try {
    const userId = req.params.id;
    const target = await User.findById(userId).select("_id role");
    if (!target) {
      return res.status(404).json({ error: "User not found" });
    }
    if (target.role !== "owner") {
      return res.status(400).json({ error: "Target user is not an owner" });
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

    const query = { ownerId: userId };
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
    console.error("Error fetching client appointments:", error);
    return res.status(500).json({ error: "Server error fetching client appointments" });
  }
};

/**
 * Admin-only: mark a user's email as verified (owner or groomer).
 */
exports.verifyUserEmail = async (req, res) => {
  try {
    const userId = req.params.id;
    const target = await User.findById(userId);
    if (!target) {
      return res.status(404).json({ error: "User not found" });
    }
    if (target.role === "admin") {
      return res.status(400).json({ error: "Admin accounts do not use this verification flow" });
    }

    target.isVerified = true;
    target.verificationToken = undefined;
    target.verificationTokenExpires = undefined;
    await target.save();

    return res.status(200).json({
      message: "User email marked as verified",
      user: {
        _id: target._id,
        isVerified: User.displayEmailVerified(target),
      },
    });
  } catch (error) {
    console.error("Error verifying user email:", error);
    return res.status(500).json({ error: "Server error verifying user" });
  }
};

/**
 * Admin-only: reset password (owner or groomer). Sends the new password by email when Resend is configured.
 * Body: { newPassword }
 */
exports.resetUserPassword = async (req, res) => {
  try {
    const userId = req.params.id;
    const { newPassword } = req.body || {};
    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }

    const target = await User.findById(userId);
    if (!target) {
      return res.status(404).json({ error: "User not found" });
    }
    if (target.role === "admin") {
      return res.status(400).json({ error: "Admin passwords cannot be reset from this endpoint" });
    }

    const salt = await bcrypt.genSalt(10);
    target.password = await bcrypt.hash(newPassword, salt);
    await target.save();

    const lang =
      target.preferredLocale === "zh" || target.preferredLocale === "en"
        ? target.preferredLocale
        : "en";

    let emailSent = true;
    try {
      await sendAdminNewPasswordEmail(target.email, target.name, String(newPassword), lang);
    } catch (emailErr) {
      console.error("Admin password reset email failed:", emailErr);
      emailSent = false;
    }

    return res.status(200).json({
      message: emailSent
        ? "Password reset successfully; email sent to the user"
        : "Password reset successfully; email could not be sent (check RESEND_API_KEY / RESEND_FROM)",
      emailSent,
    });
  } catch (error) {
    console.error("Error resetting user password:", error);
    return res.status(500).json({ error: "Server error resetting password" });
  }
};

/**
 * Admin-only: delete user (cannot delete self).
 */
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    if (req.user.id === userId) {
      return res.status(400).json({ error: "You cannot delete your own account" });
    }

    const target = await User.findById(userId).select("_id");
    if (!target) {
      return res.status(404).json({ error: "User not found" });
    }

    await User.deleteOne({ _id: userId });
    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({ error: "Server error deleting user" });
  }
};
