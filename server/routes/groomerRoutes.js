const express = require("express");
const router = express.Router();
const groomerController = require("../controllers/groomerController");
const { verifyToken } = require("../utils/jwt");
const { isAuthenticated, isGroomer } = require("../middleware/roleMiddleware");

router.use(verifyToken);

// get all groomers
router.get("/", isAuthenticated, groomerController.getAllGroomers);
// get groomer by id
router.get("/:id", isAuthenticated, groomerController.getGroomerById);
// get all available slots for groomer
// eg: /api/groomers/:id/availability?date=2023-04-15&duration=60
router.get("/:id/availability", isAuthenticated, groomerController.getGroomerAvailability);

// schedule mgmt routes
// get groomer schedule (calendar view)
router.get("/:id/schedule", isAuthenticated, groomerController.getGroomerSchedule);
// create time block
router.post("/time-blocks", isGroomer, groomerController.createTimeBlock);
// update time block
router.put("/time-blocks/:timeBlockId", isGroomer, groomerController.updateTimeBlock);
// delete time block
router.delete("/time-blocks/:timeBlockId", isGroomer, groomerController.deleteTimeBlock);

module.exports = router;
