const { google } = require('googleapis');
const fs = require('fs');
const Appointment = require('../models/Appointment');

const TOKEN_PATH = 'token.json';
const token = JSON.parse(fs.readFileSync(TOKEN_PATH));

const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);
oAuth2Client.setCredentials(token);

const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

exports.bookAppointment = async (req, res) => {
  try {
    const { name, email, date, time, description } = req.body;

    // Validation
    if (!date || !time) {
      return res.status(400).json({ status: 'error', message: 'Missing date or time' });
    }

    const dateString = `${date}T${time}`;
    const eventStartTime = new Date(dateString);

    if (isNaN(eventStartTime.getTime())) {
      return res.status(400).json({ status: 'error', message: 'Invalid date/time format' });
    }

    const eventEndTime = new Date(eventStartTime.getTime() + 30 * 60000);

    const event = {
      summary: `Appointment with ${name}`,
      description,
      start: { dateTime: eventStartTime.toISOString() },
      end: { dateTime: eventEndTime.toISOString() },
    };

    await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    const appointment = new Appointment({ name, email, date, time, description });
    await appointment.save();

    res.status(200).json({
      status: 'success',
      message: 'Appointment booked and added to calendar',
    });
  } catch (error) {
    console.error('Booking failed:', error.message);
    res.status(500).json({ status: 'error', message: 'Booking failed' });
  }
};
