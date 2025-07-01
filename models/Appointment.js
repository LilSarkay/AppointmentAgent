const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  name: String,
  email: String,
  date: String,
  time: String,
  description: String,
});

module.exports = mongoose.model('Appointment', appointmentSchema);
