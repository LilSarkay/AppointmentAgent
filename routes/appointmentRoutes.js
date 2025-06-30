const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');

router.post('/book', appointmentController.bookAppointment);
router.post('/available', appointmentController.checkAvailability);
router.post('/reschedule', appointmentController.rescheduleAppointment);
router.post('/cancel', appointmentController.cancelAppointment);

module.exports = router;
