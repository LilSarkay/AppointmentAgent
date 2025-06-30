const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const Appointment = require('../models/Appointment');

// Load client secrets from environment variables
const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

// Load token from token.json
const tokenPath = path.join(__dirname, '../token.json');
const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
oAuth2Client.setCredentials(token);

const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

// Book Appointment
exports.bookAppointment = async (req, res) => {
  try {
    const { name, email, service, date, time } = req.body;

    const appointment = new Appointment({
      name,
      email,
      service,
      date,
      time,
    });

    await appointment.save();

    const event = {
      summary: `Appointment with ${name}`,
      description: `Service: ${service}`,
      start: {
        dateTime: new Date(`${date}T${time}`),
        timeZone: 'Asia/Kolkata',
      },
      end: {
        dateTime: new Date(new Date(`${date}T${time}`).getTime() + 30 * 60000),
        timeZone: 'Asia/Kolkata',
      },
      attendees: [{ email }],
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    res.status(201).json({
      status: 'success',
      message: 'Booking confirmed!',
      calendarLink: response.data.htmlLink,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 'error',
      message: 'Booking failed',
    });
  }
};
