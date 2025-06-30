const fs = require('fs');
const { google } = require('googleapis');
const Appointment = require('../models/Appointment');

const CREDENTIALS = JSON.parse(fs.readFileSync('credentials.json'));
const TOKEN_PATH = 'token.json';

const oAuth2Client = new google.auth.OAuth2(
  CREDENTIALS.installed.client_id,
  CREDENTIALS.installed.client_secret,
  CREDENTIALS.installed.redirect_uris[0]
);

if (fs.existsSync(TOKEN_PATH)) {
  const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
  oAuth2Client.setCredentials(token);
} else {
  console.error('❌ token.json missing. Please generate one using get-token.js');
  process.exit(1);
}

const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

exports.bookAppointment = async (req, res) => {
  try {
    const { name, email, dateTime } = req.body;
    const appointment = new Appointment({ name, email, dateTime });
    await appointment.save();

    const event = {
      summary: `Appointment with ${name}`,
      description: `Scheduled via AppointmentAgent`,
      start: {
        dateTime: new Date(dateTime).toISOString(),
        timeZone: 'Asia/Kolkata',
      },
      end: {
        dateTime: new Date(new Date(dateTime).getTime() + 30 * 60000).toISOString(),
        timeZone: 'Asia/Kolkata',
      },
      attendees: [{ email }],
    };

    await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    res.status(200).json({ status: 'success', message: 'Appointment booked and event created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Booking failed' });
  }
};
