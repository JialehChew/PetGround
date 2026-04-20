const { Resend } = require("resend");
const { normalizeLang } = require("./locale");

let resendClient = null;

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!resendClient) resendClient = new Resend(key);
  return resendClient;
}

function defaultFrom() {
  return process.env.RESEND_FROM || "PetGround <onboarding@resend.dev>";
}

function apiPublicBase() {
  const port = process.env.PORT || 3000;
  return (
    process.env.API_PUBLIC_URL ||
    `http://localhost:${port}`
  );
}

function clientBase() {
  return process.env.CLIENT_URL || "http://localhost:5173";
}

/**
 * @param {{ to: string, subject: string, html: string }} opts
 */
async function sendMail(opts) {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY missing, skip:", opts.subject);
    return { skipped: true };
  }
  const { data, error } = await resend.emails.send({
    from: defaultFrom(),
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
  if (error) {
    console.error("[email] Resend error:", error);
    throw new Error(error.message || "Resend send failed");
  }
  return data;
}

function serviceLabel(serviceType, lang) {
  if (serviceType === "boarding") return lang === "zh" ? "宠物住宿" : "Pet boarding";
  if (serviceType === "basic") return lang === "zh" ? "基础美容" : "Basic grooming";
  return lang === "zh" ? "全套美容" : "Full grooming";
}

function formatSlotRange(startTime, endTime, lang) {
  const locale = lang === "zh" ? "zh-CN" : "en-US";
  const s = new Date(startTime);
  const e = new Date(endTime);
  const dateStr = s.toLocaleDateString(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const opt = { hour: "2-digit", minute: "2-digit", hour12: true };
  return {
    dateStr,
    timeRange: `${s.toLocaleTimeString(locale, opt)} – ${e.toLocaleTimeString(locale, opt)}`,
  };
}

/** @param {string} token */
async function sendVerificationEmail(email, name, token, lang) {
  const L = normalizeLang(lang);
  const verifyUrl = `${apiPublicBase().replace(/\/$/, "")}/api/auth/verify-email/${token}`;
  const subject =
    L === "zh" ? "PetGround - 请验证您的邮箱" : "PetGround - Verify Your Email";
  const html =
    L === "zh"
      ? `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;line-height:1.55;color:#333">
          <p style="font-size:16px;margin:0 0 12px">您好${name ? `，${name}` : ""}！</p>
          <p style="margin:0 0 12px">欢迎加入 PetGround。为便于向您发送预约与门店通知，请点击下方按钮完成<strong>邮箱验证</strong>。</p>
          <p style="margin:0 0 16px;font-size:14px;color:#555">说明：您的账号<strong>已经可以正常登录使用</strong>；验证邮箱是额外一步，帮助我们确认联系方式。</p>
          <p style="text-align:center;margin:28px 0">
            <a href="${verifyUrl}" style="background:#f59e0b;color:#111827;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:700;display:inline-block">验证邮箱</a>
          </p>
          <p style="margin:0 0 8px;font-size:13px;color:#555">若按钮无法打开，请复制以下链接到浏览器：</p>
          <p style="word-break:break-all;color:#2563eb;font-size:13px;margin:0 0 16px">${verifyUrl}</p>
          <p style="color:#666;font-size:12px;margin:0">链接 <strong>7 天内</strong>有效。若非您本人注册，请忽略本邮件。</p>
        </div>`
      : `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;line-height:1.55;color:#333">
          <p style="font-size:16px;margin:0 0 12px">Hi${name ? ` ${name}` : " there"},</p>
          <p style="margin:0 0 12px">Welcome to PetGround! Please verify your email so we can send booking updates and reminders to the right inbox.</p>
          <p style="margin:0 0 16px;font-size:14px;color:#555"><strong>Your account already works</strong> — you can sign in anytime. Email verification is an extra step to confirm your contact details.</p>
          <p style="text-align:center;margin:28px 0">
            <a href="${verifyUrl}" style="background:#f59e0b;color:#111827;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:700;display:inline-block">Verify my email</a>
          </p>
          <p style="margin:0 0 8px;font-size:13px;color:#555">If the button doesn’t work, copy and paste this link into your browser:</p>
          <p style="word-break:break-all;color:#2563eb;font-size:13px;margin:0 0 16px">${verifyUrl}</p>
          <p style="color:#666;font-size:12px;margin:0">This link expires in <strong>7 days</strong>. If you didn’t create an account, you can ignore this email.</p>
        </div>`;
  return sendMail({ to: email, subject, html });
}

async function sendPasswordResetEmail(email, resetToken, userName, lang) {
  const L = normalizeLang(lang);
  const resetUrl = `${clientBase().replace(/\/$/, "")}/reset-password/${resetToken}`;
  const subject = L === "zh" ? "PetGround - 重置密码" : "PetGround - Reset Your Password";
  const html =
    L === "zh"
      ? `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto">
          <p>您好 ${userName || "用户"}，</p>
          <p>我们收到了重置密码的请求。请点击按钮继续（1 小时内有效）：</p>
          <p style="text-align:center;margin:28px 0">
            <a href="${resetUrl}" style="background:#2563eb;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">重置密码</a>
          </p>
          <p style="word-break:break-all;font-size:13px;color:#444">${resetUrl}</p>
          <p style="color:#666;font-size:12px">如非本人操作，请忽略此邮件。</p>
        </div>`
      : `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto">
          <p>Hello ${userName || "there"},</p>
          <p>We received a request to reset your PetGround password. Use the button below (valid for 1 hour):</p>
          <p style="text-align:center;margin:28px 0">
            <a href="${resetUrl}" style="background:#2563eb;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">Reset password</a>
          </p>
          <p style="word-break:break-all;font-size:13px;color:#444">${resetUrl}</p>
          <p style="color:#666;font-size:12px">If you did not request this, you can ignore this email.</p>
        </div>`;
  return sendMail({ to: email, subject, html });
}

/**
 * Admin-set password: email the plaintext once (user should change after login).
 */
async function sendAdminNewPasswordEmail(email, userName, plainPassword, lang) {
  const L = normalizeLang(lang);
  const subject =
    L === "zh" ? "PetGround - 管理员已重置您的密码" : "PetGround - Your Password Was Reset";
  const html =
    L === "zh"
      ? `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto">
          <p>您好 ${userName || "用户"}，</p>
          <p>管理员已为您的账号设置新密码，请使用以下密码登录，并尽快在网站内修改为个人密码：</p>
          <p style="font-size:18px;font-weight:700;letter-spacing:1px;background:#f3f4f6;padding:12px 16px;border-radius:8px">${plainPassword}</p>
          <p><a href="${clientBase()}">${clientBase()}</a></p>
        </div>`
      : `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto">
          <p>Hello ${userName || "there"},</p>
          <p>An administrator reset your PetGround password. Sign in with the password below and change it in your account as soon as you can:</p>
          <p style="font-size:18px;font-weight:700;letter-spacing:1px;background:#f3f4f6;padding:12px 16px;border-radius:8px">${plainPassword}</p>
          <p><a href="${clientBase()}">${clientBase()}</a></p>
        </div>`;
  return sendMail({ to: email, subject, html });
}

async function sendBookingConfirmationEmail(
  userEmail,
  userName,
  appointmentDetails,
  isRescheduled = false,
  lang = "en"
) {
  const L = normalizeLang(lang);
  const {
    bookingReference,
    petName,
    petBreed,
    groomerName,
    serviceType,
    startTime,
    endTime,
    duration,
  } = appointmentDetails;
  const { dateStr, timeRange } = formatSlotRange(startTime, endTime, L);
  const svc = serviceLabel(serviceType, L);
  const subject =
    L === "zh"
      ? `${isRescheduled ? "预约已改期" : "预约已确认"} · #${bookingReference}`
      : `${isRescheduled ? "Appointment rescheduled" : "Booking confirmed"} · #${bookingReference}`;
  const title =
    L === "zh"
      ? isRescheduled
        ? "预约已改期"
        : "预约已确认"
      : isRescheduled
        ? "Appointment rescheduled"
        : "Booking confirmed";
  const lead =
    L === "zh"
      ? isRescheduled
        ? `您好 ${userName}，${petName} 的美容预约已更新，详情如下：`
        : `您好 ${userName}，已确认 ${petName} 的美容预约：`
      : isRescheduled
        ? `Hi ${userName}, your appointment for ${petName} has been updated:`
        : `Hi ${userName}, your appointment for ${petName} is confirmed:`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto">
    <h2 style="color:#111">${title}</h2>
    <p>${lead}</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:6px 0;color:#666">${L === "zh" ? "订单号" : "Reference"}</td><td><strong>#${bookingReference}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#666">${L === "zh" ? "日期" : "Date"}</td><td>${dateStr}</td></tr>
      <tr><td style="padding:6px 0;color:#666">${L === "zh" ? "时间" : "Time"}</td><td>${timeRange}</td></tr>
      <tr><td style="padding:6px 0;color:#666">${L === "zh" ? "时长" : "Duration"}</td><td>${duration} ${L === "zh" ? "分钟" : "minutes"}</td></tr>
      <tr><td style="padding:6px 0;color:#666">${L === "zh" ? "服务" : "Service"}</td><td>${svc}</td></tr>
      <tr><td style="padding:6px 0;color:#666">${L === "zh" ? "宠物" : "Pet"}</td><td>${petName} (${petBreed})</td></tr>
      <tr><td style="padding:6px 0;color:#666">${L === "zh" ? "美容师" : "Groomer"}</td><td>${groomerName}</td></tr>
    </table>
    <p><a href="${clientBase()}/appointments">${L === "zh" ? "管理预约" : "Manage appointment"}</a></p>
  </div>`;
  return sendMail({ to: userEmail, subject, html });
}

async function sendGroomerNotificationEmail(groomerEmail, groomerName, appointmentDetails, lang = "en") {
  const L = normalizeLang(lang);
  const {
    bookingReference,
    petName,
    petBreed,
    ownerName,
    serviceType,
    startTime,
    endTime,
    duration,
  } = appointmentDetails;
  const { dateStr, timeRange } = formatSlotRange(startTime, endTime, L);
  const svc = serviceLabel(serviceType, L);
  const subject =
    L === "zh"
      ? `新预约 · ${dateStr} ${timeRange}`
      : `New appointment · ${dateStr} ${timeRange}`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto">
    <h2 style="color:#111">${L === "zh" ? "新预约" : "New appointment"}</h2>
    <p>${L === "zh" ? `您好 ${groomerName}，有新的预约：` : `Hi ${groomerName}, a new appointment was booked:`}</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:6px 0;color:#666">${L === "zh" ? "订单号" : "Reference"}</td><td><strong>#${bookingReference}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#666">${L === "zh" ? "日期" : "Date"}</td><td>${dateStr}</td></tr>
      <tr><td style="padding:6px 0;color:#666">${L === "zh" ? "时间" : "Time"}</td><td>${timeRange}</td></tr>
      <tr><td style="padding:6px 0;color:#666">${L === "zh" ? "时长" : "Duration"}</td><td>${duration} ${L === "zh" ? "分钟" : "minutes"}</td></tr>
      <tr><td style="padding:6px 0;color:#666">${L === "zh" ? "服务" : "Service"}</td><td>${svc}</td></tr>
      <tr><td style="padding:6px 0;color:#666">${L === "zh" ? "宠物" : "Pet"}</td><td>${petName} (${petBreed})</td></tr>
      <tr><td style="padding:6px 0;color:#666">${L === "zh" ? "主人" : "Owner"}</td><td>${ownerName}</td></tr>
    </table>
    <p><a href="${clientBase()}/dashboard">${L === "zh" ? "打开工作台" : "Open dashboard"}</a></p>
  </div>`;
  return sendMail({ to: groomerEmail, subject, html });
}

async function sendCancellationEmails(
  ownerEmail,
  ownerName,
  groomerEmail,
  groomerName,
  appointmentDetails,
  ownerLang = "en",
  groomerLang = "en"
) {
  const Lo = normalizeLang(ownerLang);
  const Lg = normalizeLang(groomerLang);
  const { bookingReference, petName, petBreed, serviceType, startTime, endTime, duration } =
    appointmentDetails;
  const o = formatSlotRange(startTime, endTime, Lo);
  const g = formatSlotRange(startTime, endTime, Lg);
  const subjO =
    Lo === "zh"
      ? `预约已取消 · #${bookingReference}`
      : `Appointment cancelled · #${bookingReference}`;
  const subjG =
    Lg === "zh"
      ? `预约已取消 · ${g.dateStr}`
      : `Appointment cancelled · ${g.dateStr}`;
  const htmlO = `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto">
    <h2>${Lo === "zh" ? "预约已取消" : "Appointment cancelled"}</h2>
    <p>${Lo === "zh" ? `您好 ${ownerName}，` : `Hi ${ownerName},`}</p>
    <p>${Lo === "zh" ? `${petName} 的预约已取消。` : `The appointment for ${petName} has been cancelled.`}</p>
    <p>#${bookingReference} · ${o.dateStr} · ${o.timeRange}</p>
    <p>${serviceLabel(serviceType, Lo)} · ${duration} ${Lo === "zh" ? "分钟" : "min"}</p>
  </div>`;
  const htmlG = `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto">
    <h2>${Lg === "zh" ? "预约已取消" : "Appointment cancelled"}</h2>
    <p>${Lg === "zh" ? `您好 ${groomerName}，` : `Hi ${groomerName},`}</p>
    <p>${Lg === "zh" ? "以下预约已由客户或系统取消。" : "The following appointment was cancelled."}</p>
    <p>#${bookingReference} · ${g.dateStr} · ${g.timeRange}</p>
    <p>${serviceLabel(serviceType, Lg)} · ${petName} (${petBreed})</p>
  </div>`;
  await sendMail({ to: ownerEmail, subject: subjO, html: htmlO });
  await sendMail({ to: groomerEmail, subject: subjG, html: htmlG });
  return true;
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendAdminNewPasswordEmail,
  sendBookingConfirmationEmail,
  sendGroomerNotificationEmail,
  sendCancellationEmails,
};
