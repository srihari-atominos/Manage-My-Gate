import 'dotenv/config';
import { google } from 'googleapis';

async function test() {
  try {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
    console.log('Credentials loaded:', !!GOOGLE_CLIENT_ID, !!GOOGLE_CLIENT_SECRET, !!GOOGLE_REFRESH_TOKEN);

    const oAuth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      'urn:ietf:wg:oauth:2.0:oob'
    );
    oAuth2Client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });

    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

    const event = {
      summary: 'Test Meeting',
      start: { dateTime: new Date().toISOString(), timeZone: 'UTC' },
      end: { dateTime: new Date(Date.now() + 3600000).toISOString(), timeZone: 'UTC' },
      conferenceData: {
        createRequest: {
          requestId: `test-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    };

    console.log('Sending request to Google Calendar...');
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: 1,
    });
    console.log('Success! Meet Link:', response.data.hangoutLink);
  } catch (err) {
    console.error('Error:', err.message);
    if (err.errors) console.error(err.errors);
  }
}
test();
