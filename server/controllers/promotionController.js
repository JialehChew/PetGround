const multer = require("multer");
const Promotion = require("../models/Promotion");
const AppError = require("../utils/AppError");
const { uploadToR2, deleteFromR2ByPublicUrl } = require("../utils/upload");

const isProduction = process.env.NODE_ENV === "production";

const fileFilter = (req, file, cb) => {
  if (!file.mimetype || !file.mimetype.startsWith("image/")) {
    return cb(new Error("Only image files are allowed"));
  }
  cb(null, true);
};

const uploadPromotionImage = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

const toPublicPromotion = (doc) => ({
  _id: doc._id,
  title: doc.title,
  description: doc.description || "",
  imageUrl: doc.imageUrl,
  validUntil: doc.validUntil,
  isActive: doc.isActive,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

exports.uploadPromotionImage = uploadPromotionImage;
exports.handlePromotionUpload = (req, res, next) => {
  uploadPromotionImage.single("image")(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(new AppError("Image too large. Max size is 5MB.", 400, err.code));
      }
      return next(new AppError(err.message || "Upload error", 400, err.code || "MULTER_ERROR"));
    }

    return next(new AppError(err.message || "Failed to upload image", 400, "UPLOAD_FAILED"));
  });
};

exports.createPromotion = async (req, res) => {
  const { title, description, validUntil } = req.body || {};

  if (!isProduction && process.env.DEBUG_HTTP === "1") {
    console.log("[createPromotion] content-type:", req.headers["content-type"]);
    console.log("[createPromotion] body keys:", Object.keys(req.body || {}));
    console.log(
      "[createPromotion] req.file:",
      req.file ? { mimetype: req.file.mimetype, size: req.file.size } : null
    );
  }

  if (!title || !String(title).trim()) {
    throw new AppError("Title is required", 400, "TITLE_REQUIRED");
  }
  if (!validUntil) {
    throw new AppError("validUntil is required", 400, "VALID_UNTIL_REQUIRED");
  }
  if (!req.file) {
    throw new AppError(
      "No image file received. Please upload with field name 'image'.",
      400,
      "NO_IMAGE_FILE"
    );
  }

  const validUntilDate = new Date(validUntil);
  if (Number.isNaN(validUntilDate.getTime())) {
    throw new AppError("Invalid validUntil date", 400, "INVALID_VALID_UNTIL");
  }

  let imageUrl;
  try {
    imageUrl = await uploadToR2(req.file);
  } catch (err) {
    console.error("[createPromotion] uploadToR2 failed:", err);
    throw new AppError("Image processing or upload failed", 500, "UPLOAD_FAILED");
  }

  const promotion = await Promotion.create({
    title: String(title).trim(),
    description: String(description || "").trim(),
    validUntil: validUntilDate,
    imageUrl,
    isActive: true,
    createdBy: req.user.id,
  });

  return res.status(201).json({
    message: "Promotion created successfully",
    promotion: toPublicPromotion(promotion),
  });
};

exports.getAdminPromotions = async (req, res) => {
  const rows = await Promotion.find({})
    .sort({ createdAt: -1 })
    .limit(300)
    .lean();

  return res.status(200).json(rows.map(toPublicPromotion));
};

exports.getPublicPromotions = async (req, res) => {
  const now = new Date();
  const rows = await Promotion.find({
    isActive: true,
    validUntil: { $gte: now },
  })
    .sort({ validUntil: 1, createdAt: -1 })
    .limit(20)
    .lean();

  return res.status(200).json(rows.map(toPublicPromotion));
};

exports.deletePromotion = async (req, res) => {
  const { id } = req.params;
  const doc = await Promotion.findById(id);
  if (!doc) {
    throw new AppError("Promotion not found", 404, "PROMOTION_NOT_FOUND");
  }

  try {
    await deleteFromR2ByPublicUrl(String(doc.imageUrl || ""));
  } catch (e) {
    console.error("[deletePromotion] R2 delete error:", e);
  }

  await Promotion.deleteOne({ _id: id });
  return res.status(200).json({ message: "Promotion deleted successfully" });
};
