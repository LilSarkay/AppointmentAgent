const { google } = require('googleapis');
const fs = require('fs');
const Appointment = require('../models/Appointment');

// Load token from file
const TOKEN_PATH = 'token.json';
const token = JSON.parse(fs.readFileSync(TOKEN_PATH));

// Setup OAuth2 client
const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);
oAuth2Client.setCredentials(token);

// Calendar instance
const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

exports.bookAppointment = async (req, res) => {
  try {
    const { name, email, date, time, description } = req.body;

    // Save to DB
    const appointment = new Appointment({ name, email, date, time, description });
    await appointment.save();

    const eventStartTime = new Date(`${date}T${time}`);
    const eventEndTime = new Date(eventStartTime.getTime() + 30 * 60000); // 30 minutes later

    const event = {
      summary: `Appointment with ${name}`,
      description: description,
      start: { dateTime: eventStartTime.toISOString() },
      end: { dateTime: eventEndTime.toISOString() },
    };

    await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    res.status(200).json({ status: 'success', message: 'Appointment booked and added to calendar' });
  } catch (error) {
    console.error('Booking failed:', error.message);
    res.status(500).json({ status: 'error', message: 'Booking failed' });
  }
};
