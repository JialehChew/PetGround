const multer = require("multer");
const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");
const { PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const r2 = require("../config/r2");

const upload = multer({
  storage: multer.memoryStorage(),
});

function getNormalizedPublicBase() {
  return String(process.env.R2_PUBLIC_URL || "").trim().replace(/\/$/, "");
}

/** Returns object key only if URL is under our R2 public base (no traversal). */
function extractR2KeyFromPublicUrl(imageUrl) {
  const base = getNormalizedPublicBase();
  if (!base || !imageUrl || typeof imageUrl !== "string") return null;

  const trimmed = imageUrl.trim().split("?")[0];
  const prefix = `${base}/`;
  if (!trimmed.startsWith(prefix)) return null;

  const key = trimmed.slice(prefix.length);
  if (!key || key.includes("..") || key.includes("/") || key.includes("\\")) return null;

  return key;
}

const uploadToR2 = async (file) => {
  if (!file || !file.buffer || !Buffer.isBuffer(file.buffer)) {
    throw new Error("Invalid file buffer");
  }

  const fileName = `${uuidv4()}.webp`;

  let processedBuffer;
  try {
    processedBuffer = await sharp(file.buffer)
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch (err) {
    console.error("Sharp image processing failed:", err);
    throw new Error("Image processing failed");
  }

  try {
    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: fileName,
        Body: processedBuffer,
        ContentType: "image/webp",
      })
    );
  } catch (err) {
    console.error("R2 PutObject failed:", err);
    throw new Error("Upload to storage failed");
  }

  const publicBase = getNormalizedPublicBase();
  return `${publicBase}/${fileName}`;
};

const deleteFromR2ByPublicUrl = async (imageUrl) => {
  try {
    const key = extractR2KeyFromPublicUrl(imageUrl);
    if (!key) return;

    await r2.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key }));
  } catch (e) {
    console.error("R2 delete failed:", e.message);
  }
};

module.exports = { upload, uploadToR2, deleteFromR2ByPublicUrl };
