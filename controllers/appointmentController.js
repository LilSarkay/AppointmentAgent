const fs = require('fs');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const Appointment = require('../models/Appointment');

const TOKEN_PATH = 'token.json';
const credentials = JSON.parse(fs.readFileSync('credentials.json'));
const token = JSON.parse(fs.readFileSync(TOKEN_PATH));

const { client_secret, client_id, redirect_uris } = credentials.installed;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
oAuth2Client.setCredentials(token);

// Set up Google Calendar
const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

exports.bookAppointment = async (req, res) => {
  try {
    const { name, email, date, time, description } = req.body;

    if (!name || !email || !date || !time || !description) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields (name, email, date, time, description)'
      });
    }

    // Save to DB
    const appointment = new Appointment({ name, email, date, time, description });
    await appointment.save();

    const eventStartTime = new Date(`${date}T${time}`);
    const eventEndTime = new Date(eventStartTime.getTime() + 30 * 60000); // 30 minutes later

    const event = {
      summary: `Appointment with ${name}`,
      description,
      start: { dateTime: eventStartTime.toISOString(), timeZone: 'Asia/Kolkata' },
      end: { dateTime: eventEndTime.toISOString(), timeZone: 'Asia/Kolkata' },
      attendees: [{ email }],
      conferenceData: {
        createRequest: {
          requestId: `${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      }
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: 1
    });

    const meetLink = response.data.hangoutLink || 'Google Meet link not available';
    const eventHtmlLink = response.data.htmlLink;

    // Send confirmation email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: `"Saanvi" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Appointment Confirmed with Saanvi',
      html: `
        <h2>Your appointment has been scheduled.</h2>
        <p><strong>Description:</strong> ${description}</p>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Time:</strong> ${time}</p>
        <p><strong>Join Meeting:</strong> <a href="${meetLink}">${meetLink}</a></p>
        <p><strong>View on Calendar:</strong> <a href="${eventHtmlLink}">${eventHtmlLink}</a></p>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      status: 'success',
      message: 'Appointment booked and confirmation email sent',
      calendarLink: eventHtmlLink,
      meetLink
    });

  } catch (error) {
    console.error('Booking failed:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Booking failed',
      error: error.message
    });
  }
};
