const fs = require('fs');
const { google } = require('googleapis');
const express = require('express');
require('dotenv').config();

const app = express();

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];
const TOKEN_PATH = 'token.json';

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3000/oauth2callback'
);

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent' // This ensures we get a refresh token
});

console.log('🔗 Authorize this app by visiting this url:\n', authUrl);
console.log('\n📝 Make sure to copy the full URL and paste it in your browser');

// Set up local server to receive the auth code
app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.send('❌ No authorization code received. Please try again.');
  }

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    // Save the token to a file
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    
    res.send(`
      <h2>✅ Authorization successful!</h2>
      <p>Token saved to ${TOKEN_PATH}</p>
      <p>You can close this tab and stop the server.</p>
    `);
    
    console.log('🎉 Tokens saved successfully!');
    console.log('📄 Access token:', tokens.access_token ? '✅ Received' : '❌ Missing');
    console.log('🔄 Refresh token:', tokens.refresh_token ? '✅ Received' : '❌ Missing');
    
    if (!tokens.refresh_token) {
      console.log('⚠️  Warning: No refresh token received. You may need to revoke access in Google Console and try again.');
    }
    
    // Gracefully shutdown server
    setTimeout(() => {
      console.log('🛑 Shutting down server...');
      process.exit(0);
    }, 2000);
    
  } catch (err) {
    console.error('❌ Error retrieving access token:', err);
    res.send('❌ Error retrieving token. Check console for details.');
  }
});

app.listen(3000, () => {
  console.log('🚀 Server listening on http://localhost:3000');
  console.log('🔗 Click the authorization URL above to continue...');
});