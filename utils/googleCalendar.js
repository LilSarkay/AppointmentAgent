const fs = require('fs');
const { google } = require('googleapis');
const path = require('path');

// Load credentials from token.json
const TOKEN_PATH = path.join(__dirname, '../token.json');
const credentials = JSON.parse(fs.readFileSync(TOKEN_PATH));

// Create oAuth2 client
const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  'http://localhost:3000/oauth2callback'
);

oAuth2Client.setCredentials(credentials);

const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

async function createCalendarEvent({ summary, description, startTime, endTime }) {
  const event = {
    summary,
    description,
    start: {
      dateTime: startTime,
      timeZone: 'Asia/Kolkata',
    },
    end: {
      dateTime: endTime,
      timeZone: 'Asia/Kolkata',
    },
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
  });

  return response.data;
}

module.exports = {
  createCalendarEvent,
};
