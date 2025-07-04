const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const chrono = require('chrono-node');
const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const Appointment = require('../models/Appointment');

// Load token from file (fallback to environment variables)
const TOKEN_PATH = path.join(__dirname, '../token.json');
let tokens = {};

try {
  if (fs.existsSync(TOKEN_PATH)) {
    tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    console.log('✅ Token file loaded successfully');
  }
} catch (error) {
  console.log('⚠️  No token file found, using environment variables only');
}

// Initialize Google OAuth2 client
const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.REDIRECT_URI
);

// Set credentials (prefer file token, fallback to env refresh token)
if (tokens.refresh_token) {
  oAuth2Client.setCredentials(tokens);
  console.log('✅ Using refresh token from file');
} else if (process.env.REFRESH_TOKEN) {
  oAuth2Client.setCredentials({
    refresh_token: process.env.REFRESH_TOKEN
  });
  console.log('✅ Using refresh token from environment variables');
} else {
  console.error('❌ No refresh token found! Please run get-token.js first');
}

const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

exports.bookAppointment = async (req, res) => {
  try {
    const { name, email, description } = req.body;

    // Validate required fields
    if (!name || !email || !description) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Missing required fields: name, email, and description are required' 
      });
    }

    // Validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Invalid email format' 
      });
    }

    // Parse natural language date from description
    const parsedDate = chrono.parseDate(description, { 
      timezone: 'Asia/Kolkata',
      forwardDate: true // Prefer future dates
    });

    if (!parsedDate) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Could not parse date/time from description. Please include a clear date and time.' 
      });
    }

    // Check if date is in the past
    if (parsedDate < new Date()) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Cannot schedule appointments in the past' 
      });
    }

    const istDate = moment(parsedDate).tz('Asia/Kolkata');
    const date = istDate.format('YYYY-MM-DD');
    const time = istDate.format('HH:mm:ss');

    const startTime = new Date(parsedDate);
    const endTime = new Date(startTime.getTime() + 30 * 60000); // 30 minutes

    // Create calendar event
    const event = {
      summary: `Appointment with ${name}`,
      description: `${description}\n\nClient: ${name}\nEmail: ${email}`,
      start: { 
        dateTime: startTime.toISOString(), 
        timeZone: 'Asia/Kolkata' 
      },
      end: { 
        dateTime: endTime.toISOString(), 
        timeZone: 'Asia/Kolkata' 
      },
      attendees: [{ email }],
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 24 hours before
          { method: 'popup', minutes: 30 }, // 30 minutes before
        ],
      },
    };

    console.log('📅 Creating calendar event...');
    const calendarResponse = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      resource: event,
      conferenceDataVersion: 1,
    });

    const meetLink = calendarResponse.data.hangoutLink || calendarResponse.data.conferenceData?.entryPoints?.[0]?.uri;
    
    if (!meetLink) {
      console.warn('⚠️  No Google Meet link generated');
    }

    console.log('✅ Calendar event created successfully');

    // Send confirmation email
    console.log('📧 Sending confirmation email...');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'Appointment Confirmation - Saanvi Ravikiran',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #4285f4; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h2 style="margin: 0;">Appointment Confirmed! 🎉</h2>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #333;">Hi <strong>${name}</strong>,</p>
            <p style="color: #666;">Your appointment has been successfully scheduled with <strong>Saanvi Ravikiran</strong>.</p>
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4285f4;">
              <h3 style="margin-top: 0; color: #4285f4;">📅 Appointment Details</h3>
              <p style="margin: 10px 0;"><strong>📆 Date:</strong> ${istDate.format('MMMM DD, YYYY')}</p>
              <p style="margin: 10px 0;"><strong>⏰ Time:</strong> ${istDate.format('hh:mm A')} IST</p>
              <p style="margin: 10px 0;"><strong>📝 Description:</strong> ${description}</p>
              ${meetLink ? `<p style="margin: 10px 0;"><strong>🔗 Google Meet:</strong> <a href="${meetLink}" style="color: #4285f4; text-decoration: none;">${meetLink}</a></p>` : ''}
            </div>
            
            <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #2e7d32;"><strong>📱 What's Next?</strong></p>
              <ul style="color: #2e7d32; margin: 10px 0;">
                <li>You'll receive a calendar invitation shortly</li>
                <li>Join the meeting using the Google Meet link above</li>
                <li>Feel free to reply to this email if you have any questions</li>
              </ul>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              If you need to reschedule or cancel, please contact us as soon as possible.
            </p>
            
            <p style="color: #333;">Best regards,<br><strong>Saanvi Ravikiran</strong></p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully');

    // Save to DB
    console.log('💾 Saving appointment to database...');
    const newAppointment = new Appointment({ 
      name, 
      email, 
      date, 
      time, 
      description, 
      meetLink: meetLink || null,
      calendarEventId: calendarResponse.data.id
    });
    await newAppointment.save();
    console.log('✅ Appointment saved to database');

    res.status(200).json({
      status: 'success',
      message: 'Appointment booked successfully! 🎉',
      appointment: {
        id: newAppointment._id,
        name,
        email,
        date: istDate.format('MMMM DD, YYYY'),
        time: istDate.format('hh:mm A'),
        description,
        meetLink: meetLink || null,
        calendarEventId: calendarResponse.data.id
      }
    });
  } catch (error) {
    console.error('❌ Booking failed:', error);
    
    // More specific error handling
    if (error.code === 403) {
      return res.status(403).json({ 
        status: 'error', 
        message: 'Calendar access denied. Please check your Google Calendar permissions.' 
      });
    }
    
    if (error.code === 401) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Authentication failed. Please run get-token.js to refresh your tokens.' 
      });
    }
    
    res.status(500).json({ 
      status: 'error', 
      message: 'Booking failed. Please try again.', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

// Get all appointments
exports.getAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find().sort({ createdAt: -1 });
    res.status(200).json({
      status: 'success',
      data: appointments
    });
  } catch (error) {
    console.error('Error fetching appointments:', error.message);
    res.status(500).json({ status: 'error', message: 'Failed to fetch appointments' });
  }
};

// Get appointment by ID
exports.getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ status: 'error', message: 'Appointment not found' });
    }
    res.status(200).json({
      status: 'success',
      data: appointment
    });
  } catch (error) {
    console.error('Error fetching appointment:', error.message);
    res.status(500).json({ status: 'error', message: 'Failed to fetch appointment' });
  }
};

// Update appointment
exports.updateAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!appointment) {
      return res.status(404).json({ status: 'error', message: 'Appointment not found' });
    }
    res.status(200).json({
      status: 'success',
      data: appointment
    });
  } catch (error) {
    console.error('Error updating appointment:', error.message);
    res.status(500).json({ status: 'error', message: 'Failed to update appointment' });
  }
};

// Delete appointment
exports.deleteAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndDelete(req.params.id);
    if (!appointment) {
      return res.status(404).json({ status: 'error', message: 'Appointment not found' });
    }
    res.status(200).json({
      status: 'success',
      message: 'Appointment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting appointment:', error.message);
    res.status(500).json({ status: 'error', message: 'Failed to delete appointment' });
  }
};