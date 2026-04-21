const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { verifyToken } = require("../utils/jwt");

// Public routes
router.get("/verify-email/:token", authController.verifyEmail);
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh", authController.refreshToken);
router.post("/logout", authController.logout);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password/:token", authController.resetPassword);

// Protected route - requires authentication
router.get("/me", verifyToken, authController.getCurrentUser);
router.patch("/me", verifyToken, authController.updateProfile);
router.post("/me/password", verifyToken, authController.changeMyPassword);

module.exports = router;
