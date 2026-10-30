import axios from 'axios';

const API_BASE = process.env.API_BASE_URL || 'https://managemygate.e3esg.com/api/v1';

async function main() {
  const args = process.argv.slice(2);
  let token = process.env.ADMIN_TOKEN;

  // Check if token was provided via --token
  const tokenArgIdx = args.indexOf('--token');
  if (tokenArgIdx !== -1 && args[tokenArgIdx + 1]) {
    token = args[tokenArgIdx + 1];
  }

  // If no token, check email & password from args or prompt
  if (!token) {
    const email = args[0] || process.env.ADMIN_EMAIL;
    const password = args[1] || process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      console.log('Usage:');
      console.log('  node backend/scripts/publish_release_31.mjs <admin_email> <password>');
      console.log('Or:');
      console.log('  node backend/scripts/publish_release_31.mjs --token <YOUR_JWT_TOKEN>');
      process.exit(1);
    }

    console.log(`[1/4] Logging in as ${email}...`);
    try {
      const loginRes = await axios.post(`${API_BASE}/auth/login`, {
        email,
        password,
      });

      token = loginRes.data?.data?.token || loginRes.data?.token;
      if (!token) {
        console.error('Login succeeded but token was not found in response:', loginRes.data);
        process.exit(1);
      }
      console.log(' Login successful! Retrieved token.');
    } catch (err) {
      console.error(' Login failed:', err.response?.data?.message || err.message);
      process.exit(1);
    }
  }

  let client = axios.create({
    baseURL: API_BASE,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  // Check if token has platform access, or switch to System Platform
  try {
    const payloadBase64 = token.split('.')[1];
    const decoded = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
    if (!decoded.isPlatform) {
      console.log('Switching context to System Platform (isPlatform: true)...');
      const switchRes = await client.post('/auth/switch-context', {
        targetOrgId: '6abde26a5d90ebdcb8761728',
      });
      const newToken = switchRes.data?.data?.token;
      if (newToken) {
        token = newToken;
        client = axios.create({
          baseURL: API_BASE,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        console.log('Switched to System Platform successfully!');
      }
    }
  } catch (err) {
    console.log('Context check note:', err.response?.data?.message || err.message);
  }

  console.log('[2/4] Creating or finding Release 31 (version 1.0.9)...');
  const releasePayload = {
    platform: 'android',
    applicationId: 'com.atominosconsulting.nahom',
    version: '1.0.9',
    versionCode: 31,
    releaseType: 'IMPORTANT',
    gracePeriodDays: 7,
    status: 'AVAILABLE',
    releaseNotes: [
      'Seamless in-app background updates via Google Play',
      'Faster visitor check-ins and gate notifications',
      'Improved invoice tracking and payment receipts',
      'General bug fixes and performance improvements',
    ],
  };

  let releaseId;
  try {
    const createRes = await client.post('/app-updates/admin/releases', releasePayload);
    releaseId = createRes.data?.data?._id;
    console.log(` Created Release successfully! ID: ${releaseId}`);
  } catch (err) {
    if (err.response?.status === 409) {
      console.log(' Release 31 already exists in backend. Fetching existing release ID...');
      const listRes = await client.get('/app-updates/admin/releases?platform=android&limit=10');
      const existing = (listRes.data?.data?.releases || []).find((r) => r.versionCode === 31);
      if (existing) {
        releaseId = existing._id;
        console.log(` Found existing release ID: ${releaseId}`);
      } else {
        console.error('Could not find existing release ID:', listRes.data);
        process.exit(1);
      }
    } else {
      console.error(' Failed to create release:', err.response?.data?.message || err.message);
      process.exit(1);
    }
  }

  console.log('[3/4] Publishing Release 31 to make it AVAILABLE...');
  try {
    await client.post(`/app-updates/admin/releases/${releaseId}/publish`, {});
    console.log(' Release 31 is now officially PUBLISHED and AVAILABLE!');
  } catch (err) {
    console.log(' Publish call note:', err.response?.data?.message || err.message);
  }

  console.log('[4/4] Announcing Release (triggering push notifications)...');
  try {
    const announceRes = await client.post(`/app-updates/admin/releases/${releaseId}/announce`, {});
    console.log(' Push notifications announced:', announceRes.data?.message || 'Sent successfully!');
  } catch (err) {
    console.log(' Announcement note:', err.response?.data?.message || err.message);
  }

  console.log('\n[VERIFICATION] Checking live public policy...');
  try {
    const policyRes = await axios.get(`${API_BASE}/app-updates/policy?platform=android&versionCode=30`);
    console.log('Live Server Policy Response:');
    console.log(JSON.stringify(policyRes.data, null, 2));

    if (policyRes.data?.data?.hasUpdate) {
      console.log('\n SUCCESS! The backend is now reporting hasUpdate: true!');
      console.log('When you open the NAHOM app on your phone, the pop-up will now appear immediately!');
    } else {
      console.log('\n WARNING: Server is still reporting hasUpdate: false. Check the status in MongoDB.');
    }
  } catch (err) {
    console.error('Failed to verify live policy:', err.message);
  }
}

main();
