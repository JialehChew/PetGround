const express = require("express");
const router = express.Router();
const boardingController = require("../controllers/boardingController");
const { verifyToken } = require("../utils/jwt");
const { isAuthenticated } = require("../middleware/roleMiddleware");

router.use(verifyToken);

router.get("/occupancy", isAuthenticated, boardingController.getOccupancy);

module.exports = router;
