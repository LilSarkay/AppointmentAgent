const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const chrono = require('chrono-node');
const nodemailer = require('nodemailer');
const Appointment = require('../models/Appointment');

// Load Google OAuth2 credentials
const credentials = JSON.parse(fs.readFileSync('credentials.json'));
const token = JSON.parse(fs.readFileSync('token.json'));

const oAuth2Client = new google.auth.OAuth2(
  credentials.installed.client_id,
  credentials.installed.client_secret,
  credentials.installed.redirect_uris[0]
);
oAuth2Client.setCredentials(token);

const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

exports.bookAppointment = async (req, res) => {
  try {
    const { name, email, date, time, description } = req.body;

    // Safety check
    if (!name || !email || !date || !time || !description) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: name, email, date, time, description'
      });
    }

    // Parse date + time using chrono
    const fullDateTime = chrono.parseDate(`${date} ${time}`, {
      timezone: 'Asia/Kolkata'
    });

    if (!fullDateTime || isNaN(fullDateTime)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid date or time format'
      });
    }

    const eventStartTime = new Date(fullDateTime);
    const eventEndTime = new Date(eventStartTime.getTime() + 30 * 60000); // 30 minutes later

    const event = {
      summary: `Appointment with ${name}`,
      description,
      start: {
        dateTime: eventStartTime.toISOString(),
        timeZone: 'Asia/Kolkata',
      },
      end: {
        dateTime: eventEndTime.toISOString(),
        timeZone: 'Asia/Kolkata',
      },
      attendees: [{ email }],
      conferenceData: {
        createRequest: {
          requestId: `${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      },
    };

    const calendarResponse = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: 1,
    });

    const meetLink = calendarResponse.data?.hangoutLink || 'Not available';

    // Save appointment in MongoDB
    const newAppointment = new Appointment({
      name,
      email,
      date,
      time,
      description,
    });
    await newAppointment.save();

    // Send confirmation email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Saanvi Ravikiran" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Appointment Confirmation',
      text: `Hi ${name},\n\nYour appointment with Saanvi has been confirmed.\n\nDetails:\nTopic: ${description}\nDate: ${date}\nTime: ${time}\n\nGoogle Meet link: ${meetLink}\n\nThanks,\nSaanvi's Assistant`,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      status: 'success',
      message: 'Appointment booked and added to calendar',
      meetLink,
    });

  } catch (error) {
    console.error('Booking failed:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Booking failed'
    });
  }
};
git 