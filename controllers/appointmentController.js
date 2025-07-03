const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const chrono = require('chrono-node');
const moment = require('moment-timezone');
const fs = require('fs');
const Appointment = require('../models/Appointment');

// Load token and credentials
const TOKEN_PATH = 'token.json';
const CREDENTIALS_PATH = 'credentials.json';

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
const token = JSON.parse(fs.readFileSync(TOKEN_PATH));

const oAuth2Client = new google.auth.OAuth2(
  credentials.installed.client_id,
  credentials.installed.client_secret,
  credentials.installed.redirect_uris[0]
);
oAuth2Client.setCredentials(token);

const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

exports.bookAppointment = async (req, res) => {
  try {
    const { name, email, description } = req.body;

    if (!name || !email || !description) {
      return res.status(400).json({ status: 'error', message: 'Missing required fields' });
    }

    // 🔥 Parse natural language date from description
    const parsedDate = chrono.parseDate(description, { timezone: 'Asia/Kolkata' });

    if (!parsedDate) {
      return res.status(400).json({ status: 'error', message: 'Could not parse date/time from input' });
    }

    const istDate = moment(parsedDate).tz('Asia/Kolkata');
    const date = istDate.format('YYYY-MM-DD');
    const time = istDate.format('HH:mm:ss');

    const startTime = new Date(`${date}T${time}`);
    const endTime = new Date(startTime.getTime() + 30 * 60000); // 30 minutes

    const event = {
      summary: `Appointment with ${name}`,
      description,
      start: { dateTime: startTime.toISOString(), timeZone: 'Asia/Kolkata' },
      end: { dateTime: endTime.toISOString(), timeZone: 'Asia/Kolkata' },
      attendees: [{ email }],
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
        },
      },
    };

    const calendarResponse = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: 1,
    });

    const meetLink = calendarResponse.data.hangoutLink;

    // 💌 Send confirmation email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Appointment Confirmation - Saanvi Ravikiran',
      text: `Hi ${name},\n\nYour appointment has been scheduled with Saanvi.\n\nDetails:\nDate: ${date}\nTime: ${time}\nDescription: ${description}\nGoogle Meet Link: ${meetLink}\n\nThank you.`,
    });

    // Save to DB
    const newAppointment = new Appointment({ name, email, date, time, description });
    await newAppointment.save();

    res.status(200).json({
      status: 'success',
      message: 'Appointment booked successfully',
      meetLink,
    });
  } catch (error) {
    console.error('Booking failed:', error.message);
    res.status(500).json({ status: 'error', message: 'Booking failed' });
  }
};
