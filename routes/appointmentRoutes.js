const express = require('express');
const router = express.Router();
const controller = require('../controllers/appointmentController');

router.post('/check-availability', controller.CheckAvailability);
router.post('/book', controller.BookSlot);
router.put('/reschedule', controller.RescheduleSlot);
router.delete('/cancel', controller.CancelSlot);

module.exports = router;
