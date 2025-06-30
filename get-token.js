const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const express = require('express');

const app = express();

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TOKEN_PATH = 'token.json';

const oAuth2Client = new google.auth.OAuth2(
  '775901402758-p456ntpt29vkoh87kb5aa2v19i6g7bnt.apps.googleusercontent.com',
  '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',
  'http://localhost:3000/oauth2callback'
);

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
});

console.log('Authorize this app by visiting this url:\n', authUrl);

// Set up local server to receive the auth code
app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send('No code received.');

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    // Save the token to a file
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    res.send('✅ Authorization successful! You can close this tab.');
    console.log('🎉 Refresh token saved:', tokens.refresh_token);
  } catch (err) {
    console.error('Error retrieving access token', err);
    res.send('❌ Error retrieving token.');
  }
});

app.listen(3000, () => {
  console.log('🚀 Listening on http://localhost:3000');
});
