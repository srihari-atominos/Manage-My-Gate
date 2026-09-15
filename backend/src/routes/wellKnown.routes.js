import { Router } from 'express';
import config from '../config/config.js';
import { isPlaceholderValue, isValidAppleTeamId } from '../utils/configValidator.util.js';
import logger from '../utils/logger.utils.js';

const router = Router();

// Standard development debug keystore fingerprint used exclusively when NODE_ENV !== 'production'
const DEV_DEBUG_KEYSTORE_SHA256 = '88:88:CE:67:F7:40:9B:FC:E9:DB:E2:E9:41:E2:4D:32:DC:83:EE:A1:F4:A9:96:06:EA:7C:67:48:76:70:63:2C';

/**
 * GET /.well-known/assetlinks.json
 *
 * Serves Android Digital Asset Links for automatic deep-link verification.
 * Environment-driven; strictly avoids debug fingerprints in production.
 */
router.get('/assetlinks.json', (req, res) => {
  const isProduction = config.nodeEnv === 'production';
  const packageName = config.mobile?.androidPackageName || 'com.atominosconsulting.nahom';
  const rawSha256 = config.mobile?.androidPlaySigningSha256;

  let fingerprints = [];

  if (!isPlaceholderValue(rawSha256)) {
    fingerprints = [String(rawSha256).trim()];
  } else if (!isProduction) {
    // In local development, supply the documented debug keystore fingerprint
    fingerprints = [DEV_DEBUG_KEYSTORE_SHA256];
  } else {
    // In production without Play Signing SHA-256 configured:
    // Strictly do not fabricate or use debug certificates!
    res.setHeader('X-Android-App-Links', 'degraded-missing-signing-key');
    logger.warn('[AssetLinks] ANDROID_PLAY_SIGNING_SHA256 is unconfigured in production. Serving empty assetlinks target.');
  }

  const payload = fingerprints.length > 0
    ? [
        {
          relation: ['delegate_permission/common.handle_all_urls'],
          target: {
            namespace: 'android_app',
            package_name: packageName,
            sha256_cert_fingerprints: fingerprints,
          },
        },
      ]
    : [];

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', isProduction ? 'public, max-age=3600' : 'no-cache');
  return res.status(200).json(payload);
});

/**
 * GET /.well-known/apple-app-site-association
 *
 * Serves Apple App Site Association (AASA) for iOS Universal Links.
 * Environment-driven; eliminates placeholder <APPLE_TEAM_ID> and formats appID at runtime.
 */
router.get('/apple-app-site-association', (req, res) => {
  const isProduction = config.nodeEnv === 'production';
  const bundleId = config.mobile?.iosBundleId || 'com.atominosconsulting.nahom';
  const rawTeamId = config.mobile?.iosAppleTeamId;

  const hasValidTeamId = isValidAppleTeamId(rawTeamId);

  let details = [];
  let webcredentialApps = [];

  if (hasValidTeamId) {
    const appId = `${String(rawTeamId).trim()}.${bundleId}`;
    details = [
      {
        appID: appId,
        paths: [
          '/invite/*',
          '/invite/handoff/*',
          '/invite/app/*',
        ],
        components: [
          {
            '/': '/invite/*',
            comment: 'Canonical web invitation acceptance wizard',
          },
          {
            '/': '/invite/handoff/*',
            comment: 'Mobile invitation handoff redirect',
          },
          {
            '/': '/invite/app/*',
            comment: 'Mobile app invite handler',
          },
        ],
      },
    ];
    webcredentialApps = [appId];
  } else {
    // Missing or placeholder Team ID:
    // Return clean structure without <APPLE_TEAM_ID> to prevent Apple CDN syntax parse errors
    res.setHeader('X-iOS-Universal-Links', 'degraded-missing-team-id');
    if (isProduction) {
      logger.warn('[AASA] IOS_APPLE_TEAM_ID is unconfigured in production. Serving clean AASA with empty applinks details.');
    }
  }

  const payload = {
    applinks: {
      apps: [],
      details,
    },
    webcredentials: {
      apps: webcredentialApps,
    },
  };

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', isProduction ? 'public, max-age=3600' : 'no-cache');
  return res.status(200).json(payload);
});

export default router;
