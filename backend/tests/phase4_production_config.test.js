import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import bcrypt from 'bcrypt';

import config from '../src/config/config.js';
import { connectToDb } from '../src/config/db/mongodbConnectToDb.config.js';
import User from '../src/features/user/user.model.js';
import Organization from '../src/features/organization/organization.model.js';
import Role from '../src/features/role/role.model.js';
import OrgMembership from '../src/features/orgMembership/orgMembership.model.js';
import authService from '../src/features/auth/auth.services.js';
import wellKnownRouter from '../src/routes/wellKnown.routes.js';
import {
  isPlaceholderValue,
  isValidAppleTeamId,
  isValidSha256Fingerprint,
  isValidAppStoreId,
  validateMobileDeepLinkConfig,
} from '../src/utils/configValidator.util.js';

test('=== NAHOM PHASE 4: PRODUCTION CONFIGURATION & MOBILE DEEP-LINK TEST SUITE ===', async (t) => {
  await connectToDb();
  const timestamp = Date.now();
  let testOrg, testUser, testRole;

  // Ephemeral test HTTP server for testing .well-known routes
  const app = express();
  app.use('/.well-known', wellKnownRouter);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const serverPort = server.address().port;
  const baseUrl = `http://127.0.0.1:${serverPort}`;

  t.after(async () => {
    try {
      if (server?.closeAllConnections) {
        server.closeAllConnections();
      }
      await new Promise((resolve) => server.close(resolve));
    } catch (e) {
      // ignore
    }

    try {
      if (testOrg?._id) await Organization.deleteOne({ _id: testOrg._id });
      if (testUser?._id) await User.deleteOne({ _id: testUser._id });
      if (testRole?._id) await Role.deleteOne({ _id: testRole._id });
      if (testOrg?._id) await OrgMembership.deleteMany({ orgId: testOrg._id });
    } catch (e) {
      // ignore
    }

    try {
      await mongoose.disconnect();
    } catch (e) {
      // ignore
    }

    process.exit(0);
  });

  // --------------------------------------------------------------------------
  // TEST 1: Placeholder Detection & Format Validators
  // --------------------------------------------------------------------------
  await t.test('1. Placeholder & ID format validation rejects dummy values', () => {
    assert.equal(isPlaceholderValue('<APPLE_TEAM_ID>'), true, 'Should detect <APPLE_TEAM_ID> as placeholder');
    assert.equal(isPlaceholderValue('__CONFIGURE_PRODUCTION_VALUE__'), true, 'Should detect __CONFIGURE_PRODUCTION_VALUE__');
    assert.equal(isPlaceholderValue('6470000000'), true, 'Should detect legacy dummy App Store ID 6470000000');
    assert.equal(isPlaceholderValue('your_apple_team_id_here'), true, 'Should detect boilerplate template');
    assert.equal(isPlaceholderValue(''), true, 'Should detect empty string as placeholder');
    assert.equal(isPlaceholderValue(null), true, 'Should detect null as placeholder');
    assert.equal(isPlaceholderValue(undefined), true, 'Should detect undefined as placeholder');

    // Real formats
    assert.equal(isPlaceholderValue('9ABCD1234E'), false, 'Valid Apple Team ID is not placeholder');
    assert.equal(isPlaceholderValue('1234567890'), false, 'Valid App Store ID is not placeholder');

    // Apple Team ID format
    assert.equal(isValidAppleTeamId('9ABCD1234E'), true, '10-char alphanumeric is valid Apple Team ID');
    assert.equal(isValidAppleTeamId('ABCDE12345'), true, '10-char alphanumeric is valid Apple Team ID');
    assert.equal(isValidAppleTeamId('<APPLE_TEAM_ID>'), false, 'Placeholder is invalid Apple Team ID');
    assert.equal(isValidAppleTeamId('SHORT'), false, 'Short ID is invalid Apple Team ID');
    assert.equal(isValidAppleTeamId('TOOLONG1234567'), false, 'Long ID is invalid Apple Team ID');

    // SHA-256 Fingerprint format
    const validFingerprint = '88:88:CE:67:F7:40:9B:FC:E9:DB:E2:E9:41:E2:4D:32:DC:83:EE:A1:F4:A9:96:06:EA:7C:67:48:76:70:63:2C';
    assert.equal(isValidSha256Fingerprint(validFingerprint), true, 'Valid 32-byte colon-delimited SHA-256');
    assert.equal(isValidSha256Fingerprint('__CONFIGURE_PRODUCTION_VALUE__'), false, 'Placeholder is invalid SHA-256');
    assert.equal(isValidSha256Fingerprint('invalid_format'), false, 'Random string is invalid SHA-256');

    // App Store ID format
    assert.equal(isValidAppStoreId('1234567890'), true, '10-digit ID is valid App Store ID');
    assert.equal(isValidAppStoreId('6470000000'), false, 'Legacy dummy 6470000000 is rejected');
    assert.equal(isValidAppStoreId('not_a_number'), false, 'Non-numeric is invalid');
  });

  // --------------------------------------------------------------------------
  // TEST 2: Development Configuration Defaults
  // --------------------------------------------------------------------------
  await t.test('2. Development configuration initializes safely without throwing', () => {
    const devEnv = {
      NODE_ENV: 'development',
      ANDROID_PACKAGE_NAME: 'com.atominosconsulting.nahom',
      IOS_BUNDLE_ID: 'com.atominosconsulting.nahom',
      WEB_APP_URL: 'http://localhost:3004',
    };

    const result = validateMobileDeepLinkConfig({
      env: devEnv,
      config: { ...config, nodeEnv: 'development' },
      logger: { info: () => {}, warn: () => {}, error: () => {} },
    });

    assert.equal(result.isProduction, false);
    assert.equal(result.androidAppLinks.configured, true, 'Dev mode activates development debug keystore');
    assert.match(result.androidAppLinks.status, /Development debug keystore fallback active/);
    assert.equal(result.iosUniversalLinks.configured, false, 'Dev mode leaves unconfigured Team ID safe');
    assert.equal(result.iosAppStoreFallback.configured, false, 'Dev mode leaves unconfigured Store ID safe');
    assert.equal(result.errors.length, 0, 'No fatal errors thrown in development');
  });

  // --------------------------------------------------------------------------
  // TEST 3: Production Configuration with Missing / Placeholder Values
  // --------------------------------------------------------------------------
  await t.test('3. Production configuration identifies degraded states on placeholders', () => {
    const prodPlaceholderEnv = {
      NODE_ENV: 'production',
      ANDROID_PACKAGE_NAME: 'com.atominosconsulting.nahom',
      ANDROID_PLAY_SIGNING_SHA256: '__CONFIGURE_PRODUCTION_VALUE__',
      IOS_BUNDLE_ID: 'com.atominosconsulting.nahom',
      IOS_APPLE_TEAM_ID: '<APPLE_TEAM_ID>',
      IOS_APP_STORE_ID: '6470000000',
      WEB_APP_URL: 'https://app.managemygate.com',
    };

    const warningsLogged = [];
    const mockLogger = {
      info: () => {},
      warn: (msg) => warningsLogged.push(msg),
      error: () => {},
    };

    const result = validateMobileDeepLinkConfig({
      env: prodPlaceholderEnv,
      config: { ...config, nodeEnv: 'production' },
      logger: mockLogger,
    });

    assert.equal(result.isProduction, true);
    assert.equal(result.androidAppLinks.configured, false, 'Android App Links must NOT be marked configured on placeholder');
    assert.match(result.androidAppLinks.status, /DEGRADED/);
    assert.equal(result.iosUniversalLinks.configured, false, 'iOS Universal Links must NOT be marked configured on <APPLE_TEAM_ID>');
    assert.match(result.iosUniversalLinks.status, /DEGRADED/);
    assert.equal(result.iosAppStoreFallback.configured, false, 'iOS App Store fallback must NOT be marked configured on 6470000000');
    assert.match(result.iosAppStoreFallback.status, /DEGRADED/);
    assert.ok(result.warnings.length >= 3, 'Warnings must explain all unconfigured production variables');
    assert.ok(warningsLogged.length > 0, 'Warnings must be logged via logger.warn');
  });

  // --------------------------------------------------------------------------
  // TEST 4: Production Configuration with Valid Values
  // --------------------------------------------------------------------------
  await t.test('4. Production configuration fully passes when valid values are supplied', () => {
    const validProdEnv = {
      NODE_ENV: 'production',
      ANDROID_PACKAGE_NAME: 'com.atominosconsulting.nahom',
      ANDROID_PLAY_SIGNING_SHA256: '11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00',
      IOS_BUNDLE_ID: 'com.atominosconsulting.nahom',
      IOS_APPLE_TEAM_ID: '9ABCD1234E',
      IOS_APP_STORE_ID: '1234567890',
      WEB_APP_URL: 'https://app.managemygate.com',
    };

    const result = validateMobileDeepLinkConfig({
      env: validProdEnv,
      config: { ...config, nodeEnv: 'production' },
      logger: { info: () => {}, warn: () => {}, error: () => {} },
    });

    assert.equal(result.isProduction, true);
    assert.equal(result.androidAppLinks.configured, true);
    assert.match(result.androidAppLinks.status, /CONFIGURED/);
    assert.equal(result.iosUniversalLinks.configured, true);
    assert.match(result.iosUniversalLinks.status, /CONFIGURED/);
    assert.equal(result.iosAppStoreFallback.configured, true);
    assert.match(result.iosAppStoreFallback.status, /CONFIGURED/);
    assert.equal(result.webAppUrl.configured, true);
    assert.equal(result.warnings.length, 0);
  });

  // --------------------------------------------------------------------------
  // TEST 5: Zero Secret Leaks in Logging
  // --------------------------------------------------------------------------
  await t.test('5. Zero secrets logged during configuration validation', () => {
    const sensitiveTokens = [
      'SECRET_JWT_SIGNING_TOKEN_123',
      'SUPER_SECRET_ENCRYPTION_KEY_XYZ',
      'TOP_SECRET_MONGODB_PASSWORD',
      'PRIVATE_SMTP_AUTH_PASSWORD',
    ];

    const logsCaptured = [];
    const spyLogger = {
      info: (msg) => logsCaptured.push(msg),
      warn: (msg) => logsCaptured.push(msg),
      error: (msg) => logsCaptured.push(msg),
    };

    validateMobileDeepLinkConfig({
      env: {
        NODE_ENV: 'production',
        JWT_SECRET: sensitiveTokens[0],
        ENCRYPTION_KEY: sensitiveTokens[1],
        MONGO_ROOT_PASSWORD: sensitiveTokens[2],
        SMTP_PASSWORD: sensitiveTokens[3],
        ANDROID_PLAY_SIGNING_SHA256: '__CONFIGURE_PRODUCTION_VALUE__',
      },
      config: { ...config, nodeEnv: 'production' },
      logger: spyLogger,
    });

    const concatenatedLogs = logsCaptured.join(' ');
    for (const secret of sensitiveTokens) {
      assert.equal(
        concatenatedLogs.includes(secret),
        false,
        `Security violation: Secret ${secret} leaked into configuration logs!`
      );
    }
  });

  // --------------------------------------------------------------------------
  // TEST 6: Dynamic /.well-known/assetlinks.json Endpoint
  // --------------------------------------------------------------------------
  await t.test('6. Dynamic assetlinks.json serves correct Content-Type and handles dev vs prod', async () => {
    // 6a. Development request (should return dev debug fingerprint)
    config.nodeEnv = 'development';
    config.mobile.androidPlaySigningSha256 = null;

    const devRes = await fetch(`${baseUrl}/.well-known/assetlinks.json`);
    assert.equal(devRes.status, 200);
    assert.match(devRes.headers.get('content-type'), /application\/json/i);

    const devBody = await devRes.json();
    assert.ok(Array.isArray(devBody), 'Response must be JSON array');
    assert.equal(devBody[0]?.target?.package_name, 'com.atominosconsulting.nahom');
    assert.ok(devBody[0]?.target?.sha256_cert_fingerprints?.includes(
      '88:88:CE:67:F7:40:9B:FC:E9:DB:E2:E9:41:E2:4D:32:DC:83:EE:A1:F4:A9:96:06:EA:7C:67:48:76:70:63:2C'
    ));

    // 6b. Production request without configured signing SHA-256 (strictly no debug fingerprint)
    config.nodeEnv = 'production';
    config.mobile.androidPlaySigningSha256 = null;

    const prodDegradedRes = await fetch(`${baseUrl}/.well-known/assetlinks.json`);
    assert.equal(prodDegradedRes.status, 200);
    assert.match(prodDegradedRes.headers.get('content-type'), /application\/json/i);
    assert.equal(prodDegradedRes.headers.get('x-android-app-links'), 'degraded-missing-signing-key');

    const prodDegradedBody = await prodDegradedRes.json();
    const serializedBody = JSON.stringify(prodDegradedBody);
    assert.equal(serializedBody.includes('88:88:CE:67'), false, 'Debug fingerprint must never appear in production');

    // 6c. Production request with real configured Play signing SHA-256
    const prodSha = '33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22';
    config.mobile.androidPlaySigningSha256 = prodSha;

    const prodConfiguredRes = await fetch(`${baseUrl}/.well-known/assetlinks.json`);
    assert.equal(prodConfiguredRes.status, 200);
    const prodConfiguredBody = await prodConfiguredRes.json();
    assert.equal(prodConfiguredBody[0]?.target?.sha256_cert_fingerprints[0], prodSha);

    // Restore dev mode
    config.nodeEnv = 'development';
    config.mobile.androidPlaySigningSha256 = null;
  });

  // --------------------------------------------------------------------------
  // TEST 7: Dynamic /.well-known/apple-app-site-association Endpoint
  // --------------------------------------------------------------------------
  await t.test('7. Dynamic apple-app-site-association serves correct Content-Type and handles Team ID', async () => {
    // 7a. Unconfigured / placeholder Team ID -> clean structure, no <APPLE_TEAM_ID>
    config.mobile.iosAppleTeamId = '<APPLE_TEAM_ID>';

    const unconfiguredRes = await fetch(`${baseUrl}/.well-known/apple-app-site-association`);
    assert.equal(unconfiguredRes.status, 200);
    assert.match(unconfiguredRes.headers.get('content-type'), /application\/json/i);

    const unconfiguredBody = await unconfiguredRes.json();
    assert.deepEqual(unconfiguredBody.applinks.details, []);
    assert.deepEqual(unconfiguredBody.webcredentials.apps, []);
    const unconfiguredText = JSON.stringify(unconfiguredBody);
    assert.equal(unconfiguredText.includes('<APPLE_TEAM_ID>'), false, 'Output must never contain <APPLE_TEAM_ID>');

    // 7b. Configured valid Team ID -> correct appID: <TEAM_ID>.<BUNDLE_ID>
    config.mobile.iosAppleTeamId = '9ABCD1234E';
    config.mobile.iosBundleId = 'com.atominosconsulting.nahom';

    const configuredRes = await fetch(`${baseUrl}/.well-known/apple-app-site-association`);
    assert.equal(configuredRes.status, 200);
    assert.match(configuredRes.headers.get('content-type'), /application\/json/i);

    const configuredBody = await configuredRes.json();
    assert.equal(configuredBody.applinks.details[0].appID, '9ABCD1234E.com.atominosconsulting.nahom');
    assert.equal(configuredBody.webcredentials.apps[0], '9ABCD1234E.com.atominosconsulting.nahom');
    assert.ok(configuredBody.applinks.details[0].paths.includes('/invite/*'));
    assert.ok(configuredBody.applinks.details[0].paths.includes('/invite/handoff/*'));

    // Reset
    config.mobile.iosAppleTeamId = null;
  });

  // --------------------------------------------------------------------------
  // TEST 8: Dynamic Store Fallback in authService.createInviteHandoff
  // --------------------------------------------------------------------------
  await t.test('8. createInviteHandoff sets appStoreUrl to null when unconfigured (no id6470000000)', async () => {
    // Setup test organization & active user
    testOrg = await Organization.create({
      name: `Phase 4 Config Org ${timestamp}`,
      status: 'Active',
      organizationType: 'Residential',
    });

    testRole = await Role.create({
      name: `Resident_${timestamp}`,
      orgId: testOrg._id,
      isTenantRole: true,
    });

    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
    testUser = await User.create({
      name: 'Config Test User',
      email: `config_user_${timestamp}@example.com`,
      username: `config_user_${timestamp}`,
      password: hashedPassword,
      status: 'Active',
      organizationId: testOrg._id,
    });

    await OrgMembership.create({
      userId: testUser._id,
      orgId: testOrg._id,
      roleId: testRole._id,
      membershipStatus: 'Active',
      joinedAt: new Date(),
    });

    // Case A: Unconfigured App Store ID (null)
    config.mobile.iosAppStoreId = null;
    const handoffNull = await authService.createInviteHandoff(testUser._id, testOrg._id);

    assert.equal(handoffNull.appStoreUrl, null, 'appStoreUrl must be null when unconfigured');
    assert.ok(handoffNull.playStoreUrl.includes('com.atominosconsulting.nahom'), 'playStoreUrl contains package name');
    assert.ok(handoffNull.deepLink.includes('invite/handoff/'), 'deepLink is properly formatted');
    assert.ok(handoffNull.universalLink.includes('/invite/handoff/'), 'universalLink is properly formatted');

    // Case B: Placeholder App Store ID ('6470000000')
    config.mobile.iosAppStoreId = '6470000000';
    const handoffDummy = await authService.createInviteHandoff(testUser._id, testOrg._id);
    assert.equal(handoffDummy.appStoreUrl, null, 'appStoreUrl must be null when placeholder 6470000000 is supplied');

    // Case C: Valid real App Store ID ('1234567890')
    config.mobile.iosAppStoreId = '1234567890';
    const handoffValid = await authService.createInviteHandoff(testUser._id, testOrg._id);
    assert.equal(
      handoffValid.appStoreUrl,
      'https://apps.apple.com/app/manage-my-gate/id1234567890',
      'appStoreUrl must be dynamically constructed with valid ID'
    );

    // Reset
    config.mobile.iosAppStoreId = null;
  });
});
