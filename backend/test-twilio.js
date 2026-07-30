import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

const testNumber = process.argv[2];

if (!testNumber) {
  console.log('❌ Error: Please provide a WhatsApp number to send the test message to.');
  console.log('Usage: node test-twilio.js +919876543210');
  process.exit(1);
}

const formattedNumber = testNumber.startsWith('+') ? testNumber : `+${testNumber}`;

console.log(`Sending test WhatsApp message to ${formattedNumber}...`);

client.messages.create({
  body: 'Hello from Manage My Gate! This is a test WhatsApp message to verify Twilio connectivity.',
  from: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
  to: `whatsapp:${formattedNumber}`
})
.then(message => {
  console.log('✅ Message sent successfully!');
  console.log('Message SID:', message.sid);
})
.catch(err => {
  console.error('❌ Failed to send message:', err.message);
});
