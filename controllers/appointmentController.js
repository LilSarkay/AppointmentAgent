const Appointment = require('../models/Appointment');
const createCalendarEvent = require('../utils/googleCalendar');

// Book an appointment
const bookAppointment = async (req, res) => {
  try {
    const { user_info, selected_slot, service } = req.body;

    if (!user_info || !selected_slot || !service) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Save appointment to DB
    const appointment = new Appointment({
      user_info,
      selected_slot,
      service
    });

    await appointment.save();

    // Create Google Calendar event
    const endTime = new Date(new Date(selected_slot).getTime() + 30 * 60000); // +30 mins
    const calendarLink = await createCalendarEvent(
      `Appointment for ${user_info.name}`,
      `Service: ${service}`,
      selected_slot,
      endTime
    );

    res.status(200).json({
      status: 'success',
      message: 'Appointment booked successfully',
      appointment,
      calendar_link: calendarLink
    });
  } catch (err) {
    console.error('Booking error:', err);
    res.status(500).json({ message: 'Server error while booking appointment' });
  }
};

// Add other controllers if needed (CheckAvailability, Cancel, Reschedule)

module.exports = {
  bookAppointment,
  // Add others here as you implement them
};
