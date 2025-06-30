const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  name: String,
  email: String,
  service: String,
  date: Date,
  calendarEventLink: String
});

module.exports = mongoose.model('Appointment', appointmentSchema);
