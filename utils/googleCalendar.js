const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.REDIRECT_URI
);

oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

async function createGoogleEvent(summary, start, end, email) {
  const event = {
    summary,
    start: { dateTime: start },
    end: { dateTime: end },
    attendees: [{ email }],
  };

  const res = await calendar.events.insert({
    calendarId: 'primary',
    resource: event,
  });

  return res.data.htmlLink;
}

module.exports = { createGoogleEvent };
