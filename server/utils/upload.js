const path = require("path");
const multer = require("multer");
const { PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const r2 = require("../config/r2");

const upload = multer({
  storage: multer.memoryStorage(),
});

const uploadToR2 = async (file) => {
  const fileName = `${Date.now()}-${path.basename(file.originalname || "image")}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  );

  const publicBase = String(process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");
  return `${publicBase}/${fileName}`;
};

/** Best-effort delete when imageUrl is an object under R2_PUBLIC_URL (ignores legacy /uploads paths). */
const deleteFromR2ByPublicUrl = async (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== "string") return;
  const base = String(process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");
  if (!base || !imageUrl.startsWith(`${base}/`)) return;
  const key = imageUrl.slice(base.length + 1);
  if (!key) return;
  try {
    await r2.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key }));
  } catch (e) {
    console.error("R2 delete failed:", e.message);
  }
};

module.exports = { upload, uploadToR2, deleteFromR2ByPublicUrl };
