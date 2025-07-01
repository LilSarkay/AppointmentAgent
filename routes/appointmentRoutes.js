const express = require('express');
const router = express.Router();
const { bookAppointment } = require('../controllers/appointmentController');

router.post('/', bookAppointment);

module.exports = router;


