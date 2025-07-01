const { google } = require('googleapis');
const fs = require('fs');
const Appointment = require('../models/Appointment');
require('dotenv').config();

// Load credentials and token from files
const CREDENTIALS_PATH = 'credentials.json';
const TOKEN_PATH = 'token.json';

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
const token = JSON.parse(fs.readFileSync(TOKEN_PATH));

const { client_secret, client_id, redirect_uris } = credentials.installed;
const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

oAuth2Client.setCredentials(token);

const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

exports.bookAppointment = async (req, res) => {
  try {
    const { name, email, date, time, description } = req.body;

    if (!name || !email || !date || !time || !description) {
      return res.status(400).json({ status: 'error', message: 'Missing required fields' });
    }

    const appointment = new Appointment({ name, email, date, time, description });
    await appointment.save();

    const eventStartTime = new Date(`${date}T${time}`);
    const eventEndTime = new Date(eventStartTime.getTime() + 30 * 60000); // 30 minutes later

    if (isNaN(eventStartTime)) {
      throw new Error('Invalid date-time format');
    }

    const event = {
      summary: `Appointment with ${name}`,
      description,
      start: { dateTime: eventStartTime.toISOString() },
      end: { dateTime: eventEndTime.toISOString() },
      attendees: [{ email }],
    };

    const calendarResponse = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    return res.status(200).json({
      status: 'success',
      message: 'Appointment booked and added to calendar',
      calendarEventLink: calendarResponse.data.htmlLink,
    });
  } catch (error) {
    console.error('Booking failed:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Booking failed',
      detail: error.message,
    });
  }
};
