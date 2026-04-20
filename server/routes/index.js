const express = require("express");
const router = express.Router();

router.use("/auth", require("./authRoutes"));
router.use("/admin", require("./adminRoutes"));
router.use("/appointments", require("./appointmentRoutes"));
router.use("/groomers", require("./groomerRoutes"));
router.use("/pets", require("./petRoutes"));
router.use("/promotions", require("./promotionRoutes"));

module.exports = router;