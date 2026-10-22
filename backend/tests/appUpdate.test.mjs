import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compareVersions, AppUpdateService } from '../src/features/appUpdate/appUpdate.service.js';
import { RELEASE_TYPES, RELEASE_STATUSES, ANNOUNCEMENT_STATUSES } from '../src/features/appUpdate/appUpdate.model.js';

describe('AppUpdate Service — Version Comparison & Grace Period Policy', () => {
  it('correctly compares semantic version numbers (1.10.0 > 1.9.0)', () => {
    assert.equal(compareVersions('1.10.0', '1.9.0'), 1);
    assert.equal(compareVersions('1.9.0', '1.10.0'), -1);
    assert.equal(compareVersions('1.2.0', '1.2.0'), 0);
    assert.equal(compareVersions('2.0.0', '1.99.99'), 1);
    assert.equal(compareVersions('1.0.8', '1.0.9'), -1);
    assert.equal(compareVersions('1.2.0-beta.1', '1.2.0'), 0);
  });

  it('evaluates NORMAL release as optional update without blocking resident', async () => {
    const service = new AppUpdateService();
    // Stub repository
    const mockRelease = {
      platform: 'android',
      applicationId: 'com.atominosconsulting.nahom',
      version: '1.2.0',
      versionCode: 32,
      releaseType: RELEASE_TYPES.NORMAL,
      gracePeriodDays: 0,
      gracePeriodDeadline: null,
      minSupportedVersion: null,
      minSupportedVersionCode: null,
      releaseNotes: ['New amenity booking enhancements'],
      status: RELEASE_STATUSES.AVAILABLE,
      storeUrl: 'https://play.google.com/store/apps/details?id=com.atominosconsulting.nahom',
    };

    const originalGet = (await import('../src/features/appUpdate/appUpdate.repository.js')).default.getLatestAvailableRelease;
    (await import('../src/features/appUpdate/appUpdate.repository.js')).default.getLatestAvailableRelease = async () => mockRelease;

    try {
      // Installed version 1.0.8 (code 30) vs Available 1.2.0 (code 32)
      const policy = await service.getReleasePolicy({
        platform: 'android',
        applicationId: 'com.atominosconsulting.nahom',
        installedVersion: '1.0.8',
        installedVersionCode: 30,
      });

      assert.equal(policy.hasUpdate, true);
      assert.equal(policy.action, 'OPTIONAL');
      assert.equal(policy.isSupported, true);
      assert.equal(policy.releaseType, 'NORMAL');
      assert.deepEqual(policy.releaseNotes, ['New amenity booking enhancements']);
    } finally {
      (await import('../src/features/appUpdate/appUpdate.repository.js')).default.getLatestAvailableRelease = originalGet;
    }
  });

  it('evaluates IMPORTANT release within 7-day grace period as optional prompt with remaining days', async () => {
    const service = new AppUpdateService();
    const effectiveAt = new Date();
    const deadline = new Date(effectiveAt.getTime() + 7 * 24 * 60 * 60 * 1000);

    const mockRelease = {
      platform: 'android',
      applicationId: 'com.atominosconsulting.nahom',
      version: '1.2.0',
      versionCode: 32,
      releaseType: RELEASE_TYPES.IMPORTANT,
      gracePeriodDays: 7,
      gracePeriodDeadline: deadline,
      effectiveAt,
      minSupportedVersion: null,
      minSupportedVersionCode: null,
      releaseNotes: ['Important UPI payment fix'],
      status: RELEASE_STATUSES.AVAILABLE,
      storeUrl: 'https://play.google.com/store/apps/details?id=com.atominosconsulting.nahom',
    };

    const repo = (await import('../src/features/appUpdate/appUpdate.repository.js')).default;
    const originalGet = repo.getLatestAvailableRelease;
    repo.getLatestAvailableRelease = async () => mockRelease;

    try {
      const policy = await service.getReleasePolicy({
        platform: 'android',
        applicationId: 'com.atominosconsulting.nahom',
        installedVersion: '1.0.8',
        installedVersionCode: 30,
      });

      assert.equal(policy.hasUpdate, true);
      assert.equal(policy.action, 'OPTIONAL');
      assert.equal(policy.isSupported, true);
      assert.equal(policy.releaseType, 'IMPORTANT');
      assert.ok(policy.daysRemaining > 0 && policy.daysRemaining <= 7);
    } finally {
      repo.getLatestAvailableRelease = originalGet;
    }
  });

  it('enforces MANDATORY update for IMPORTANT release after grace period deadline has expired', async () => {
    const service = new AppUpdateService();
    // Deadline passed 2 days ago
    const expiredDeadline = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    const mockRelease = {
      platform: 'android',
      applicationId: 'com.atominosconsulting.nahom',
      version: '1.2.0',
      versionCode: 32,
      releaseType: RELEASE_TYPES.IMPORTANT,
      gracePeriodDays: 7,
      gracePeriodDeadline: expiredDeadline,
      minSupportedVersion: null,
      minSupportedVersionCode: null,
      releaseNotes: ['Critical security upgrade'],
      status: RELEASE_STATUSES.AVAILABLE,
      storeUrl: 'https://play.google.com/store/apps/details?id=com.atominosconsulting.nahom',
    };

    const repo = (await import('../src/features/appUpdate/appUpdate.repository.js')).default;
    const originalGet = repo.getLatestAvailableRelease;
    repo.getLatestAvailableRelease = async () => mockRelease;

    try {
      const policy = await service.getReleasePolicy({
        platform: 'android',
        applicationId: 'com.atominosconsulting.nahom',
        installedVersion: '1.0.8',
        installedVersionCode: 30,
      });

      assert.equal(policy.hasUpdate, true);
      assert.equal(policy.action, 'MANDATORY');
      assert.equal(policy.isSupported, false);
      assert.equal(policy.daysRemaining, 0);
    } finally {
      repo.getLatestAvailableRelease = originalGet;
    }
  });

  it('enforces MANDATORY update immediately for CRITICAL release (0-day grace period)', async () => {
    const service = new AppUpdateService();
    const mockRelease = {
      platform: 'android',
      applicationId: 'com.atominosconsulting.nahom',
      version: '1.2.0',
      versionCode: 32,
      releaseType: RELEASE_TYPES.CRITICAL,
      gracePeriodDays: 0,
      gracePeriodDeadline: new Date(),
      minSupportedVersion: null,
      minSupportedVersionCode: null,
      releaseNotes: ['Urgent security patch for gate credentials'],
      status: RELEASE_STATUSES.AVAILABLE,
      storeUrl: 'https://play.google.com/store/apps/details?id=com.atominosconsulting.nahom',
    };

    const repo = (await import('../src/features/appUpdate/appUpdate.repository.js')).default;
    const originalGet = repo.getLatestAvailableRelease;
    repo.getLatestAvailableRelease = async () => mockRelease;

    try {
      const policy = await service.getReleasePolicy({
        platform: 'android',
        applicationId: 'com.atominosconsulting.nahom',
        installedVersion: '1.0.8',
        installedVersionCode: 30,
      });

      assert.equal(policy.hasUpdate, true);
      assert.equal(policy.action, 'MANDATORY');
      assert.equal(policy.isSupported, false);
      assert.equal(policy.releaseType, 'CRITICAL');
      assert.equal(policy.daysRemaining, 0);
    } finally {
      repo.getLatestAvailableRelease = originalGet;
    }
  });

  it('returns action NONE when installed version is up to date', async () => {
    const service = new AppUpdateService();
    const mockRelease = {
      platform: 'android',
      applicationId: 'com.atominosconsulting.nahom',
      version: '1.2.0',
      versionCode: 32,
      releaseType: RELEASE_TYPES.CRITICAL,
      status: RELEASE_STATUSES.AVAILABLE,
      storeUrl: 'https://play.google.com/store/apps/details?id=com.atominosconsulting.nahom',
    };

    const repo = (await import('../src/features/appUpdate/appUpdate.repository.js')).default;
    const originalGet = repo.getLatestAvailableRelease;
    repo.getLatestAvailableRelease = async () => mockRelease;

    try {
      // Installed version code 32 matches available 32
      const policy = await service.getReleasePolicy({
        platform: 'android',
        applicationId: 'com.atominosconsulting.nahom',
        installedVersion: '1.2.0',
        installedVersionCode: 32,
      });

      assert.equal(policy.hasUpdate, false);
      assert.equal(policy.action, 'NONE');
      assert.equal(policy.isSupported, true);
    } finally {
      repo.getLatestAvailableRelease = originalGet;
    }
  });

  it('enforces MANDATORY update when installed version is below minSupportedVersionCode', async () => {
    const service = new AppUpdateService();
    const mockRelease = {
      platform: 'android',
      applicationId: 'com.atominosconsulting.nahom',
      version: '1.2.0',
      versionCode: 32,
      releaseType: RELEASE_TYPES.NORMAL, // Even if release is NORMAL
      minSupportedVersion: '1.1.0',
      minSupportedVersionCode: 31,
      status: RELEASE_STATUSES.AVAILABLE,
      storeUrl: 'https://play.google.com/store/apps/details?id=com.atominosconsulting.nahom',
    };

    const repo = (await import('../src/features/appUpdate/appUpdate.repository.js')).default;
    const originalGet = repo.getLatestAvailableRelease;
    repo.getLatestAvailableRelease = async () => mockRelease;

    try {
      // Installed code 30 is less than minSupportedVersionCode 31
      const policy = await service.getReleasePolicy({
        platform: 'android',
        applicationId: 'com.atominosconsulting.nahom',
        installedVersion: '1.0.8',
        installedVersionCode: 30,
      });

      assert.equal(policy.hasUpdate, true);
      assert.equal(policy.action, 'MANDATORY');
      assert.equal(policy.isSupported, false);
    } finally {
      repo.getLatestAvailableRelease = originalGet;
    }
  });

  it('prevents announcing unpublished draft releases', async () => {
    const service = new AppUpdateService();
    const repo = (await import('../src/features/appUpdate/appUpdate.repository.js')).default;
    const originalFind = repo.findById;
    repo.findById = async () => ({
      _id: 'mock-id',
      version: '1.2.0',
      status: RELEASE_STATUSES.DRAFT, // Not AVAILABLE
    });

    try {
      await assert.rejects(
        async () => {
          await service.announceRelease('mock-id', 'admin-id', false);
        },
        {
          statusCode: 400,
          message: 'Cannot announce an unpublished or unavailable release.',
        }
      );
    } finally {
      repo.findById = originalFind;
    }
  });

  it('prevents duplicate announcements unless force=true', async () => {
    const service = new AppUpdateService();
    const repo = (await import('../src/features/appUpdate/appUpdate.repository.js')).default;
    const originalFind = repo.findById;
    repo.findById = async () => ({
      _id: 'mock-id',
      version: '1.2.0',
      status: RELEASE_STATUSES.AVAILABLE,
      announcementStatus: ANNOUNCEMENT_STATUSES.ANNOUNCED,
    });

    try {
      await assert.rejects(
        async () => {
          await service.announceRelease('mock-id', 'admin-id', false);
        },
        {
          statusCode: 409,
          message: 'Release has already been announced. Pass force=true to re-broadcast.',
        }
      );
    } finally {
      repo.findById = originalFind;
    }
  });
});
