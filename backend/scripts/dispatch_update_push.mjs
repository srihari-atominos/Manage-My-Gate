import axios from 'axios';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

async function main() {
  console.log('=== NAHOM Push Notification Dispatcher ===\n');

  const args = process.argv.slice(2);
  let directToken = null;
  let customMongoUri = null;

  const tokenIdx = args.indexOf('--token');
  if (tokenIdx !== -1 && args[tokenIdx + 1]) {
    directToken = args[tokenIdx + 1];
  }

  const mongoIdx = args.indexOf('--mongo');
  if (mongoIdx !== -1 && args[mongoIdx + 1]) {
    customMongoUri = args[mongoIdx + 1];
  }

  const pushTokens = [];

  // If direct token was provided, send to that token directly
  if (directToken) {
    console.log(`Direct token provided: ${directToken}`);
    pushTokens.push(directToken);
  } else {
    // Otherwise connect to MongoDB and fetch all active tokens
    const { default: config } = await import(`file://${path.join(backendRoot, 'src/config/config.js')}`);
    const mongoUri = customMongoUri || config?.mongodb?.uri || process.env.MONGODB_URI;

    if (!mongoUri) {
      console.error('No MONGODB_URI found. Provide via --mongo or use --token.');
      process.exit(1);
    }

    console.log(`Connecting to MongoDB...`);
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
      console.log('Connected to MongoDB successfully!\n');
    } catch (err) {
      console.error('MongoDB connection failed:', err.message);
      console.log('\n💡 Tip: To send directly to a specific phone token without connecting to MongoDB, run:');
      console.log('   node backend/scripts/dispatch_update_push.mjs --token "ExponentPushToken[xxxx]"');
      process.exit(1);
    }

    const db = mongoose.connection.db;
    console.log('Fetching active Android device tokens from deviceTokens collection...');
    const records = await db.collection('devicetokens').find({ isActive: true }).toArray();
    console.log(`Found ${records.length} active device token(s) in database.\n`);

    for (const r of records) {
      if (r.pushToken) pushTokens.push(r.pushToken);
    }

    await mongoose.disconnect();
  }

  if (pushTokens.length === 0) {
    console.log('⚠️  No push tokens to send to.');
    return;
  }

  // 2. Prepare Expo Push Notification messages
  const pushMessages = [];
  for (const pushToken of pushTokens) {
    if (!pushToken.startsWith('ExponentPushToken') && !pushToken.startsWith('ExpoPushToken')) {
      console.log(`Skipping invalid push token format: ${pushToken}`);
      continue;
    }

    pushMessages.push({
      to: pushToken,
      sound: 'default',
      title: 'NAHOM Update Available',
      body: 'A new version of NAHOM (v1.0.9) is now available on Google Play. Tap to update.',
      channelId: 'general',
      priority: 'high',
      data: {
        type: 'APP_UPDATE',
        version: '1.0.9',
        versionCode: 31,
        releaseType: 'IMPORTANT',
      },
    });
  }

  if (pushMessages.length === 0) {
    console.log('No valid Expo push tokens to dispatch.');
    return;
  }

  console.log(`Dispatching ${pushMessages.length} push notification(s) to Expo Push Service...`);

  try {
    const response = await axios.post(EXPO_PUSH_URL, pushMessages, {
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
    });

    console.log('\nExpo Push Service Response:');
    console.log(JSON.stringify(response.data, null, 2));

    const tickets = response.data?.data || [];
    let sentCount = 0;
    let failedCount = 0;

    for (const ticket of tickets) {
      if (ticket.status === 'ok') {
        sentCount++;
      } else {
        failedCount++;
        console.warn(`Delivery issue for token: ${ticket.message} (${ticket.details?.error})`);
      }
    }

    console.log(`\n🎉 Notification Summary: Sent: ${sentCount}, Failed: ${failedCount}`);
  } catch (err) {
    console.error('Failed to send push notifications to Expo:', err.response?.data || err.message);
  }
}

main();
