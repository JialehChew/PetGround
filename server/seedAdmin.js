const dotenv = require("dotenv");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

dotenv.config();

const ADMIN = {
  name: "系统管理员",
  email: "admin@petground.com",
  password: "Admin123456",
  role: "admin",
  phone: "012-3456789",
};

async function connectMongo() {
  const mongoUri = process.env.MONGODB_URI?.trim();
  if (!mongoUri) {
    throw new Error("MONGODB_URI is missing. Please set it in server/.env.");
  }
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
}

async function seedAdmin() {
  try {
    await connectMongo();

    const existing = await User.findOne({ email: ADMIN.email });
    if (existing) {
      console.log(`ℹ️ Admin 账号已存在：${ADMIN.email}`);
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(ADMIN.password, salt);

    await User.create({
      name: ADMIN.name,
      email: ADMIN.email,
      password: hashedPassword,
      role: ADMIN.role,
      phone: ADMIN.phone,
    });

    console.log(
      "✅ Admin 账号创建成功！邮箱: admin@petground.com  密码: Admin123456"
    );
  } catch (error) {
    console.error("❌ 创建 Admin 账号失败：", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedAdmin();

