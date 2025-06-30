const Appointment = require('../models/Appointment');
const { google } = require('googleapis');
const axios = require('axios');

// Replace with your actual credentials (these can be stored in env vars)
const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oAuth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

exports.bookAppointment = async (req, res) => {
  try {
    const { name, email, service, date } = req.body;

    const newAppointment = new Appointment({ name, email, service, date });

    const event = {
      summary: `${service} with ${name}`,
      description: `Auto-scheduled via AppointmentAgent.`,
      start: {
        dateTime: new Date(date),
        timeZone: 'Asia/Kolkata'
      },
      end: {
        dateTime: new Date(new Date(date).getTime() + 30 * 60000), // +30min
        timeZone: 'Asia/Kolkata'
      },
      attendees: [{ email }],
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    newAppointment.calendarEventLink = response.data.htmlLink;
    await newAppointment.save();

    res.status(200).json({
      status: 'success',
      message: 'Appointment booked',
      link: response.data.htmlLink
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Booking failed' });
  }
};

exports.checkAvailability = async (req, res) => {
  try {
    const { date_range } = req.body;
    const events = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date(date_range.start).toISOString(),
      timeMax: new Date(date_range.end).toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });

    res.status(200).json({
      status: 'success',
      slots: events.data.items
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Availability check failed' });
  }
};

exports.rescheduleAppointment = async (req, res) => {
  try {
    const { booking_id, new_slot } = req.body;
    const appointment = await Appointment.findById(booking_id);
    if (!appointment) throw new Error("Appointment not found");

    const eventId = appointment.calendarEventLink.split("eid=")[1];

    await calendar.events.patch({
      calendarId: 'primary',
      eventId,
      resource: {
        start: { dateTime: new Date(new_slot), timeZone: 'Asia/Kolkata' },
        end: { dateTime: new Date(new Date(new_slot).getTime() + 30 * 60000), timeZone: 'Asia/Kolkata' }
      }
    });

    appointment.date = new_slot;
    await appointment.save();

    res.status(200).json({ status: 'success', message: 'Appointment rescheduled' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Reschedule failed' });
  }
};

exports.cancelAppointment = async (req, res) => {
  try {
    const { booking_id } = req.body;
    const appointment = await Appointment.findById(booking_id);
    if (!appointment) throw new Error("Appointment not found");

    const eventId = appointment.calendarEventLink.split("eid=")[1];

    await calendar.events.delete({
      calendarId: 'primary',
      eventId
    });

    await Appointment.findByIdAndDelete(booking_id);

    res.status(200).json({
      status: 'success',
      message: 'Appointment canceled',
      link: appointment.calendarEventLink
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Cancellation failed' });
  }
};
