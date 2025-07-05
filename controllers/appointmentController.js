const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const chrono = require('chrono-node');
const moment = require('moment-timezone');
const Appointment = require('../models/Appointment');

// Initialize Google OAuth2 client using environment variables
const createOAuth2Client = () => {
  try {
    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.REDIRECT_URI
    );

    oAuth2Client.setCredentials({
      refresh_token: process.env.REFRESH_TOKEN
    });

    return oAuth2Client;
  } catch (error) {
    console.error('Error creating OAuth2 client:', error);
    throw new Error('Failed to initialize Google OAuth2 client');
  }
};

// Create email transporter
const createEmailTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

exports.bookAppointment = async (req, res) => {
  try {
    const { name, email, description } = req.body;

    // Validation
    if (!name || !email || !description) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Missing required fields: name, email, description' 
      });
    }

    // Email validation
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Invalid email format' 
      });
    }

    // Parse natural language date from description
    const parsedDate = chrono.parseDate(description, { timezone: 'Asia/Kolkata' });

    if (!parsedDate) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Could not parse date/time from description. Please include a specific date and time.' 
      });
    }

    // Check if the date is in the past
    if (parsedDate < new Date()) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Cannot schedule appointments in the past' 
      });
    }

    const istDate = moment(parsedDate).tz('Asia/Kolkata');
    const date = istDate.format('YYYY-MM-DD');
    const time = istDate.format('HH:mm:ss');

    // Check for existing appointment at the same time
    const existingAppointment = await Appointment.findOne({ 
      date, 
      time,
      status: 'confirmed'
    });

    if (existingAppointment) {
      return res.status(409).json({ 
        status: 'error', 
        message: 'Time slot already booked. Please choose a different time.' 
      });
    }

    const startTime = new Date(`${date}T${time}`);
    const endTime = new Date(startTime.getTime() + 30 * 60000); // 30 minutes

    // Initialize Google Calendar
    const oAuth2Client = createOAuth2Client();
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

    const event = {
      summary: `Appointment with ${name}`,
      description: `${description}\n\nClient Email: ${email}`,
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
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 30 }, // 30 minutes before
        ],
      },
    };

    // Create calendar event
    let calendarResponse;
    let meetLink = null;
    let googleEventId = null;

    try {
      calendarResponse = await calendar.events.insert({
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        resource: event,
        conferenceDataVersion: 1,
      });

      meetLink = calendarResponse.data.hangoutLink || calendarResponse.data.conferenceData?.entryPoints?.[0]?.uri;
      googleEventId = calendarResponse.data.id;
    } catch (calendarError) {
      console.error('Calendar creation failed:', calendarError);
      return res.status(500).json({ 
        status: 'error', 
        message: 'Failed to create calendar event. Please try again.' 
      });
    }

    // Send confirmation email
    try {
      const transporter = createEmailTransporter();
      
      const emailContent = `
Hi ${name},

Your appointment has been successfully scheduled with Saanvi Ravikiran.

📅 Appointment Details:
• Date: ${istDate.format('dddd, MMMM Do YYYY')}
• Time: ${istDate.format('h:mm A')} (IST)
• Description: ${description}
${meetLink ? `• Google Meet Link: ${meetLink}` : ''}

Please save this information and join the meeting at the scheduled time.

If you need to reschedule or cancel, please contact us as soon as possible.

Best regards,
Saanvi Ravikiran
      `.trim();

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Appointment Confirmation - Saanvi Ravikiran',
        text: emailContent,
        html: emailContent.replace(/\n/g, '<br>').replace(/•/g, '&bull;')
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Don't fail the whole process if email fails
    }

    // Save to database
    const newAppointment = new Appointment({ 
      name, 
      email, 
      date, 
      time, 
      description,
      googleEventId,
      meetLink,
      status: 'confirmed'
    });
    
    await newAppointment.save();

    res.status(201).json({
      status: 'success',
      message: 'Appointment booked successfully',
      data: {
        id: newAppointment._id,
        name,
        email,
        date: istDate.format('YYYY-MM-DD'),
        time: istDate.format('HH:mm'),
        meetLink,
        description
      }
    });

  } catch (error) {
    console.error('Booking failed:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Internal server error. Please try again later.' 
    });
  }
};

exports.getAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ status: 'confirmed' })
      .sort({ date: 1, time: 1 })
      .select('-googleEventId'); // Don't expose Google event ID

    res.status(200).json({
      status: 'success',
      count: appointments.length,
      data: appointments
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch appointments' 
    });
  }
};

exports.cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Appointment not found' 
      });
    }

    // Update appointment status
    appointment.status = 'cancelled';
    await appointment.save();

    // Optionally cancel Google Calendar event
    if (appointment.googleEventId) {
      try {
        const oAuth2Client = createOAuth2Client();
        const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
        
        await calendar.events.delete({
          calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
          eventId: appointment.googleEventId,
        });
      } catch (calendarError) {
        console.error('Failed to delete calendar event:', calendarError);
        // Don't fail the cancellation if calendar deletion fails
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Appointment cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to cancel appointment' 
    });
  }
};
