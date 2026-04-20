const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const promotionController = require("../controllers/promotionController");
const { verifyToken } = require("../utils/jwt");
const { isAdmin } = require("../middleware/roleMiddleware");

router.use(verifyToken);

// Admin-only: create groomer users
router.post("/groomers", isAdmin, adminController.createGroomer);
router.get("/users", isAdmin, adminController.getUsers);
router.get("/users/:id/pets", isAdmin, adminController.getClientPets);
router.get("/users/:id/appointments", isAdmin, adminController.getClientAppointments);
router.patch("/users/:id/verify-email", isAdmin, adminController.verifyUserEmail);
router.patch("/users/:id/reset-password", isAdmin, adminController.resetUserPassword);
router.delete("/users/:id", isAdmin, adminController.deleteUser);
router.get("/promotions", isAdmin, promotionController.getAdminPromotions);
router.post(
  "/promotions",
  isAdmin,
  promotionController.handlePromotionUpload,
  promotionController.createPromotion
);
router.delete("/promotions/:id", isAdmin, promotionController.deletePromotion);

module.exports = router;

