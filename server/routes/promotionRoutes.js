const express = require("express");
const router = express.Router();
const promotionController = require("../controllers/promotionController");

// Public endpoint: homepage promotions
router.get("/", promotionController.getPublicPromotions);

module.exports = router;
