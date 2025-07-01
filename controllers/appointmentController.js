const { google } = require('googleapis');
const Appointment = require('../models/Appointment');

// Set up OAuth2 client using .env variables
const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

// Use refresh token from .env
oAuth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

exports.bookAppointment = async (req, res) => {
  try {
    const { name, email, date, time, description } = req.body;

    if (!name || !email || !date || !time || !description) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required appointment fields.',
      });
    }

    const appointment = new Appointment({ name, email, date, time, description });
    await appointment.save();

    const eventStartTime = new Date(`${date}T${time}`);
    const eventEndTime = new Date(eventStartTime.getTime() + 30 * 60000); // 30 mins later

    if (isNaN(eventStartTime.getTime()) || isNaN(eventEndTime.getTime())) {
      throw new Error('Invalid date-time format.');
    }

    const event = {
      summary: `Appointment with ${name}`,
      description: description,
      start: { dateTime: eventStartTime.toISOString(), timeZone: 'Asia/Kolkata' },
      end: { dateTime: eventEndTime.toISOString(), timeZone: 'Asia/Kolkata' },
      attendees: [{ email }],
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    res.status(200).json({
      status: 'success',
      message: 'Appointment booked successfully',
      calendarLink: response.data.htmlLink,
    });

  } catch (error) {
    console.error('Booking failed:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Booking failed: ' + error.message,
    });
  }
};
