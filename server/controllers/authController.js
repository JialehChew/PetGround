const User = require("../models/User");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../utils/jwt");
const { pickLang } = require("../utils/locale");
const {
  sendPasswordResetEmail,
  sendVerificationEmail,
} = require("../services/emailService");

function userToPublicJson(userDoc) {
  return userDoc.toJSON();
}

/** Strip non-digits; if country code 60 is present, remove it so local numbers start with 0. */
function normalizeMalaysiaPhoneDigits(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("60") && d.length >= 11) d = d.slice(2);
  return d;
}

function isValidMalaysiaMobileLocal(digits) {
  return /^01\d{8,9}$/.test(digits);
}

function registerMsg(lang, zh, en) {
  return lang === "zh" ? zh : en;
}

function setRefreshTokenCookie(res, refreshToken) {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

function clearRefreshTokenCookie(res) {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
  });
}

function sendAuthSuccess(res, userDoc, message, status = 200) {
  const accessToken = generateAccessToken(userDoc);
  const refreshToken = generateRefreshToken(userDoc);
  setRefreshTokenCookie(res, refreshToken);
  return res.status(status).json({
    message,
    user: userToPublicJson(userDoc),
    token: accessToken,
    accessToken,
  });
}

// Register a new user (owner or groomer)
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    const bodyLang = req.body?.locale;
    const lang = bodyLang === "zh" || bodyLang === "en" ? bodyLang : pickLang(req);

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        error: registerMsg(lang, "请填写姓名、邮箱和密码", "Name, email, and password are required"),
      });
    }

    if (phone === undefined || phone === null || String(phone).trim() === "") {
      return res.status(400).json({
        error: registerMsg(lang, "请填写手机号", "Phone number is required"),
      });
    }

    const phoneDigits = normalizeMalaysiaPhoneDigits(phone);
    if (!isValidMalaysiaMobileLocal(phoneDigits)) {
      return res.status(400).json({
        error: registerMsg(
          lang,
          "手机号格式无效（马来西亚：以 01 开头，共 10 或 11 位数字）",
          "Invalid phone number. Use a Malaysia mobile starting with 01 (10 or 11 digits)."
        ),
      });
    }

    // Role is not user-selectable in public registration.
    // Groomer accounts are created by admin workflows.
    const role = "owner";

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    const phoneTaken = await User.findOne({ phone: phoneDigits });
    if (phoneTaken) {
      return res.status(400).json({
        error: registerMsg(lang, "该手机号已被注册", "This phone number is already registered"),
      });
    }
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpires = new Date(Date.now() + 7 * 24 * 3600 * 1000);

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user — account is usable immediately; email verification is optional follow-up
    const newUser = new User({
      name,
      email,
      phone: phoneDigits,
      password: hashedPassword,
      role,
      isVerified: false,
      verificationToken,
      verificationTokenExpires,
      preferredLocale: lang,
    });

    await newUser.save();

    let verificationEmailSent = true;
    let verificationEmailNotice = null;
    try {
      const sendResult = await sendVerificationEmail(
        newUser.email,
        newUser.name,
        verificationToken,
        lang
      );
      if (sendResult && sendResult.skipped) {
        verificationEmailSent = false;
        verificationEmailNotice =
          lang === "zh"
            ? "账号已创建，但系统尚未配置发信服务（例如 RESEND_API_KEY），验证邮件未发送。您仍可正常登录；配置好邮件后可请管理员协助验证邮箱。"
            : "Your account is ready, but outgoing email isn’t configured (e.g. RESEND_API_KEY), so we didn’t send a verification email. You can still sign in.";
      }
    } catch (err) {
      console.error("Verification email failed:", err);
      verificationEmailSent = false;
      verificationEmailNotice =
        lang === "zh"
          ? "账号已创建，但验证邮件发送失败（网络或服务异常）。您仍可正常登录；请稍后再试或联系门店。"
          : "Your account is ready, but we couldn’t send the verification email. You can still sign in — please try again later or contact the shop.";
    }

    const accessToken = generateAccessToken(newUser);
    const refreshToken = generateRefreshToken(newUser);
    setRefreshTokenCookie(res, refreshToken);
    res.status(201).json({
      message: "User registered successfully",
      user: userToPublicJson(newUser),
      token: accessToken,
      accessToken,
      verificationEmailSent,
      verificationEmailNotice,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Server error during registration" });
  }
};

/** GET /api/auth/verify-email/:token — marks email verified and redirects to the SPA */
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const client = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");
    const fail = () => res.redirect(`${client}/login?verify=invalid`);
    if (!token) return fail();

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: new Date() },
    });
    if (!user) return fail();

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    return res.redirect(`${client}/login?verify=success`);
  } catch (error) {
    console.error("verifyEmail error:", error);
    const client = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");
    return res.redirect(`${client}/login?verify=error`);
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    return sendAuthSuccess(res, user, "Login successful");
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error during login" });
  }
};

// Get current user profile
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json(userToPublicJson(user));
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Forgot password - send reset email
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.status(200).json({
        message: "If an account with that email exists, a password reset link has been sent.",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Set token and expiration (1 hour from now)
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    await user.save();

    const lang =
      user.preferredLocale === "zh" || user.preferredLocale === "en"
        ? user.preferredLocale
        : pickLang(req);

    // Send email
    try {
      await sendPasswordResetEmail(user.email, resetToken, user.name, lang);
      res.status(200).json({
        message: "If an account with that email exists, a password reset link has been sent.",
      });
    } catch (emailError) {
      // Reset the token if email fails
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      console.error("Email sending failed:", emailError);
      res.status(500).json({ error: "Failed to send password reset email" });
    }
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Reset password with token
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user password and clear reset token
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.status(200).json({ message: "Password has been reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/** PATCH /api/auth/me — update name, phone, and/or preferredLocale */
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, preferredLocale } = req.body || {};
    if (name === undefined && phone === undefined && preferredLocale === undefined) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (name !== undefined) {
      const n = String(name).trim();
      if (n.length < 2) {
        return res.status(400).json({ error: "Name must be at least 2 characters" });
      }
      user.name = n;
    }
    if (phone !== undefined) {
      user.phone = String(phone).trim().slice(0, 40);
    }
    if (preferredLocale !== undefined) {
      if (preferredLocale !== "zh" && preferredLocale !== "en") {
        return res.status(400).json({ error: "preferredLocale must be zh or en" });
      }
      user.preferredLocale = preferredLocale;
    }

    await user.save();
    return res.status(200).json(userToPublicJson(user));
  } catch (error) {
    console.error("updateProfile error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

/** POST /api/auth/me/password — change password while logged in */
exports.changeMyPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current password and new password are required" });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters long" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const match = await bcrypt.compare(String(currentPassword), user.password);
    if (!match) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(String(newPassword), salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return sendAuthSuccess(res, user, "Password updated successfully");
  } catch (error) {
    console.error("changeMyPassword error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

/** POST /api/auth/refresh — issue a new access token from refresh cookie */
exports.refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: "Refresh token missing" });
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (err) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    const user = await User.findById(payload.id);
    if (!user) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({ error: "User not found for refresh token" });
    }

    const accessToken = generateAccessToken(user);
    return res.status(200).json({
      token: accessToken,
      accessToken,
    });
  } catch (error) {
    console.error("refreshToken error:", error);
    return res.status(500).json({ error: "Server error during token refresh" });
  }
};

/** POST /api/auth/logout — clear refresh cookie + client token */
exports.logout = async (req, res) => {
  try {
    clearRefreshTokenCookie(res);
    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error("logout error:", error);
    return res.status(500).json({ error: "Server error during logout" });
  }
};
