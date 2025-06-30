const { google } = require('googleapis');
const fs = require('fs');
const Appointment = require('../models/Appointment');

// Load token
const TOKEN_PATH = 'token.json';
const token = JSON.parse(fs.readFileSync(TOKEN_PATH));

// Setup OAuth2 client
const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);
oAuth2Client.setCredentials(token);

// Google Calendar API
const calendar = google.calendar({
  version: 'v3',
  auth: oAuth2Client
});

exports.bookAppointment = async (req, res) => {
  try {
    const { name, email, date, time, description } = req.body;

    if (!name || !email || !date || !time || !description) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields'
      });
    }

    // Save to MongoDB
    const appointment = new Appointment({ name, email, date, time, description });
    await appointment.save();

    // Create event
    const eventStart = new Date(`${date}T${time}`);
    const eventEnd = new Date(eventStart.getTime() + 30 * 60000); // 30 mins later

    const event = {
      summary: `Appointment with ${name}`,
      description: description,
      start: { dateTime: eventStart.toISOString(), timeZone: 'Asia/Kolkata' },
      end: { dateTime: eventEnd.toISOString(), timeZone: 'Asia/Kolkata' },
      attendees: [{ email }],
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event
    });

    res.status(200).json({
      status: 'success',
      message: 'Appointment booked successfully.',
      calendarLink: response.data.htmlLink
    });

  } catch (error) {
    console.error('❌ Booking failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Booking failed'
    });
  }
};
