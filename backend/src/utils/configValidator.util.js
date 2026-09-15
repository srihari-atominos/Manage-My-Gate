import appConfig from '../config/config.js';
import appLogger from './logger.utils.js';

/**
 * Checks whether a given configuration value represents an unconfigured placeholder or dummy value.
 *
 * @param {*} value - The configuration string or value to test
 * @returns {boolean} True if the value is missing or an unconfigured placeholder
 */
export const isPlaceholderValue = (value) => {
  if (value === null || value === undefined) return true;
  const str = String(value).trim();
  if (str.length === 0) return true;

  const placeholderPatterns = [
    /^<.*>$/,                               // e.g. <APPLE_TEAM_ID>
    /^__CONFIGURE_.*__$/i,                   // e.g. __CONFIGURE_PRODUCTION_VALUE__
    /^6470000000$/,                          // legacy dummy App Store ID
    /^your_.*_here$/i,                       // boilerplate templates
    /^todo$/i,
    /^dummy$/i,
    /^test_mock/i,
  ];

  return placeholderPatterns.some((pattern) => pattern.test(str));
};

/**
 * Validates the format of an Apple Developer Team ID (10 alphanumeric characters).
 *
 * @param {string} teamId
 * @returns {boolean}
 */
export const isValidAppleTeamId = (teamId) => {
  if (!teamId || isPlaceholderValue(teamId)) return false;
  return /^[A-Z0-9]{10}$/i.test(String(teamId).trim());
};

/**
 * Validates the format of an Android Play App Signing SHA-256 fingerprint.
 * Supports colon-delimited (32 hex bytes) or 64 contiguous hex chars.
 *
 * @param {string} fingerprint
 * @returns {boolean}
 */
export const isValidSha256Fingerprint = (fingerprint) => {
  if (!fingerprint || isPlaceholderValue(fingerprint)) return false;
  const str = String(fingerprint).trim();
  const colonDelimited = /^([0-9A-Fa-f]{2}:){31}[0-9A-Fa-f]{2}$/;
  const contiguous = /^[0-9A-Fa-f]{64}$/;
  return colonDelimited.test(str) || contiguous.test(str);
};

/**
 * Validates the format of an Apple App Store numeric ID (typically 9 to 11 digits).
 *
 * @param {string} appStoreId
 * @returns {boolean}
 */
export const isValidAppStoreId = (appStoreId) => {
  if (!appStoreId || isPlaceholderValue(appStoreId)) return false;
  return /^\d{9,11}$/.test(String(appStoreId).trim());
};

/**
 * Validates mobile deep-link, Universal Links, App Links, and store fallback configurations.
 * Reports degradation statuses clearly in production without leaking secrets.
 *
 * @param {object} [options={}] - Optional overrides for testing
 * @param {object} [options.env=process.env] - Environment variables map
 * @param {object} [options.config=appConfig] - Config object
 * @param {object} [options.logger=appLogger] - Logger instance
 * @returns {object} Validation summary with status per feature
 */
export const validateMobileDeepLinkConfig = (options = {}) => {
  const env = options.env || process.env;
  const cfg = options.config || appConfig;
  const log = options.logger || appLogger;

  const nodeEnv = env.NODE_ENV || cfg.nodeEnv || 'development';
  const isProduction = nodeEnv === 'production';

  const androidPackage = cfg.mobile?.androidPackageName || env.ANDROID_PACKAGE_NAME || 'com.atominosconsulting.nahom';
  const rawSha256 = env.ANDROID_PLAY_SIGNING_SHA256 || cfg.mobile?.androidPlaySigningSha256;
  const rawTeamId = env.IOS_APPLE_TEAM_ID || cfg.mobile?.iosAppleTeamId;
  const rawBundleId = cfg.mobile?.iosBundleId || env.IOS_BUNDLE_ID || 'com.atominosconsulting.nahom';
  const rawStoreId = env.IOS_APP_STORE_ID || cfg.mobile?.iosAppStoreId;
  const webUrl = cfg.webAppUrl || env.WEB_APP_URL || env.WEB_CLIENT_URL || env.CLIENT_URL;

  const warnings = [];
  const errors = [];

  // 1. Android App Links Validation
  let androidStatus = '';
  let androidConfigured = false;
  if (isProduction) {
    if (isPlaceholderValue(rawSha256)) {
      androidStatus = 'DEGRADED — ANDROID_PLAY_SIGNING_SHA256 is not configured (Android App Links will not auto-verify on devices)';
      warnings.push('ANDROID_PLAY_SIGNING_SHA256 is missing or placeholder in production.');
    } else if (!isValidSha256Fingerprint(rawSha256)) {
      androidStatus = 'DEGRADED — ANDROID_PLAY_SIGNING_SHA256 format is invalid (expected 32 colon-separated hex bytes)';
      warnings.push('ANDROID_PLAY_SIGNING_SHA256 has invalid format.');
    } else {
      androidStatus = `CONFIGURED (Package: ${androidPackage})`;
      androidConfigured = true;
    }
  } else {
    // Development mode
    if (!isPlaceholderValue(rawSha256)) {
      androidStatus = `CONFIGURED (Custom SHA-256, Package: ${androidPackage})`;
      androidConfigured = true;
    } else {
      androidStatus = `CONFIGURED (Development debug keystore fallback active, Package: ${androidPackage})`;
      androidConfigured = true;
    }
  }

  // 2. iOS Universal Links Validation
  let iosUniversalStatus = '';
  let iosUniversalConfigured = false;
  if (isPlaceholderValue(rawTeamId)) {
    iosUniversalStatus = 'DEGRADED — IOS_APPLE_TEAM_ID is not configured (iOS Universal Links will not route to native app)';
    if (isProduction) {
      warnings.push('IOS_APPLE_TEAM_ID is missing or placeholder in production.');
    }
  } else if (!isValidAppleTeamId(rawTeamId)) {
    iosUniversalStatus = 'DEGRADED — IOS_APPLE_TEAM_ID format is invalid (expected 10-character alphanumeric string)';
    warnings.push('IOS_APPLE_TEAM_ID has invalid format.');
  } else {
    iosUniversalStatus = `CONFIGURED (Team ID: ${String(rawTeamId).trim()}, Bundle ID: ${rawBundleId})`;
    iosUniversalConfigured = true;
  }

  // 3. iOS App Store Fallback Validation
  let iosStoreStatus = '';
  let iosStoreConfigured = false;
  if (isPlaceholderValue(rawStoreId)) {
    iosStoreStatus = 'DEGRADED — IOS_APP_STORE_ID is not configured (Web handoff will present search guidance instead of direct store link)';
    if (isProduction) {
      warnings.push('IOS_APP_STORE_ID is not configured.');
    }
  } else if (!isValidAppStoreId(rawStoreId)) {
    iosStoreStatus = 'DEGRADED — IOS_APP_STORE_ID format is invalid (expected 9-11 digit numeric ID)';
    warnings.push('IOS_APP_STORE_ID has invalid format.');
  } else {
    iosStoreStatus = `CONFIGURED (App Store ID: ${String(rawStoreId).trim()})`;
    iosStoreConfigured = true;
  }

  // 4. Web App URL Validation
  let webUrlStatus = '';
  let webUrlConfigured = false;
  if (!webUrl || isPlaceholderValue(webUrl)) {
    webUrlStatus = 'DEGRADED — WEB_APP_URL is not configured';
    warnings.push('WEB_APP_URL is missing or placeholder.');
  } else {
    webUrlStatus = `CONFIGURED (${webUrl.trim().replace(/\/+$/, '')})`;
    webUrlConfigured = true;
  }

  // Structured Logging (Safe: Zero secrets logged)
  if (isProduction) {
    log.info('[MobileConfig] ================================================================');
    log.info('[MobileConfig] NAHOM PRODUCTION MOBILE DEEP-LINK CONFIGURATION AUDIT');
    log.info(`[MobileConfig] Android App Links:       ${androidStatus}`);
    log.info(`[MobileConfig] iOS Universal Links:     ${iosUniversalStatus}`);
    log.info(`[MobileConfig] iOS App Store Fallback:  ${iosStoreStatus}`);
    log.info(`[MobileConfig] Web App Base URL:        ${webUrlStatus}`);
    if (warnings.length > 0) {
      log.warn(`[MobileConfig] Notice: ${warnings.length} mobile configuration variable(s) require Azure App Service settings for complete production activation.`);
    }
    log.info('[MobileConfig] ================================================================');
  } else {
    log.info('[MobileConfig] Mobile deep-link configuration initialized (Development mode).');
  }

  return {
    nodeEnv,
    isProduction,
    androidAppLinks: {
      status: androidStatus,
      configured: androidConfigured,
      packageName: androidPackage,
    },
    iosUniversalLinks: {
      status: iosUniversalStatus,
      configured: iosUniversalConfigured,
      bundleId: rawBundleId,
      teamId: isPlaceholderValue(rawTeamId) ? null : String(rawTeamId).trim(),
    },
    iosAppStoreFallback: {
      status: iosStoreStatus,
      configured: iosStoreConfigured,
      appStoreId: isPlaceholderValue(rawStoreId) ? null : String(rawStoreId).trim(),
    },
    webAppUrl: {
      status: webUrlStatus,
      configured: webUrlConfigured,
      url: webUrl ? webUrl.trim().replace(/\/+$/, '') : null,
    },
    warnings,
    errors,
  };
};

export default {
  isPlaceholderValue,
  isValidAppleTeamId,
  isValidSha256Fingerprint,
  isValidAppStoreId,
  validateMobileDeepLinkConfig,
};
