const express = require('express');
const router = express.Router();
const { bookAppointment, getAppointments, cancelAppointment } = require('../controllers/appointmentController');

// POST /api/appointments - Book new appointment
router.post('/', bookAppointment);

// GET /api/appointments - Get all appointments (optional, for admin)
router.get('/', getAppointments);

// DELETE /api/appointments/:id - Cancel appointment
router.delete('/:id', cancelAppointment);

module.exports = router;


