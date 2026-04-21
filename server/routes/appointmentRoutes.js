const express = require("express");
const router = express.Router();
const appointmentController = require("../controllers/appointmentController");
const groomerController = require("../controllers/groomerController");
const { verifyToken } = require("../utils/jwt");
const { isOwner, isAuthenticated } = require("../middleware/roleMiddleware");

router.use(verifyToken);
// book new appt (owner)
router.post("/", isOwner, appointmentController.createAppointment);
// groomer / staff books for a client (same conflict rules as owner flow)
router.post("/groomer-booking", isAuthenticated, appointmentController.createAppointmentAsGroomer);
// get all appts for current user
router.get("/", isAuthenticated, appointmentController.getUserAppointments);
// get available slots for groomer (alt route)
router.get(
  "/available-slots/:groomerId",
  isAuthenticated,
  groomerController.getGroomerAvailability
);

// //! commented out for now
// // workflow routes for groomers (must come before /:id routes to avoid conflicts)
// router.patch("/:id/acknowledge", isGroomer, appointmentController.acknowledgeAppointment);
// router.patch("/:id/pricing", isGroomer, appointmentController.setPricing);
// router.patch("/:id/start", isGroomer, appointmentController.startService);
// router.patch("/:id/complete", isGroomer, appointmentController.completeService);

// get a specific appt by id
router.get("/:id", isAuthenticated, appointmentController.getAppointmentById);
// admin/groomer: update boarding date range
router.put("/:id/boarding-dates", isAuthenticated, appointmentController.updateBoardingDates);
// reschedule / update (owner of appointment or assigned groomer)
router.put("/:id", isAuthenticated, appointmentController.updateAppointment);
// cancel (soft) — owner or assigned groomer
router.delete("/:id", isAuthenticated, appointmentController.deleteAppointment);

module.exports = router;
