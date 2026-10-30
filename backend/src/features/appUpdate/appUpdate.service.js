import mongoose from 'mongoose';
import appUpdateRepository from './appUpdate.repository.js';
import { RELEASE_TYPES, RELEASE_STATUSES, ANNOUNCEMENT_STATUSES } from './appUpdate.model.js';
import appUpdateEvents, { APP_UPDATE_EVENT_NAMES } from './appUpdate.events.js';
import HttpError from '../../utils/httpError.utils.js';
import logger from '../../utils/logger.utils.js';

/**
 * Compare two dotted version strings (semver-like: "1.2.0" vs "1.10.0").
 * Negative if a < b, 0 if equal, positive if a > b.
 */
export const compareVersions = (a = '0.0.0', b = '0.0.0') => {
  const parse = (v) =>
    String(v || '0')
      .split('-')[0]
      .split('.')
      .map((n) => parseInt(n, 10) || 0);

  const pa = parse(a);
  const pb = parse(b);
  const len = Math.max(pa.length, pb.length);

  for (let i = 0; i < len; i += 1) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na < nb) return -1;
    if (na > nb) return 1;
  }
  return 0;
};

export class AppUpdateService {
  /**
   * Resolve public release policy for a client based on its installed version / versionCode.
   */
  async getReleasePolicy({
    platform = 'android',
    applicationId = 'com.atominosconsulting.nahom',
    installedVersion = null,
    installedVersionCode = null,
  }) {
    const latestRelease = await appUpdateRepository.getLatestAvailableRelease(platform, applicationId);

    if (!latestRelease) {
      return {
        platform,
        applicationId,
        hasUpdate: false,
        action: 'NONE',
        isSupported: true,
        latestVersion: null,
        latestVersionCode: null,
        releaseType: null,
        releaseNotes: [],
        gracePeriodDays: 0,
        gracePeriodDeadline: null,
        daysRemaining: null,
        minSupportedVersion: null,
        minSupportedVersionCode: null,
        storeUrl: 'https://play.google.com/store/apps/details?id=' + applicationId,
      };
    }

    const numericInstalledCode = Number(installedVersionCode) || 0;
    const installedSemver = installedVersion ? String(installedVersion).trim() : null;

    // Check if build ordering says an update exists
    const hasBuildUpdate = numericInstalledCode > 0
      ? numericInstalledCode < latestRelease.versionCode
      : (installedSemver ? compareVersions(installedSemver, latestRelease.version) < 0 : false);

    // Minimum supported version enforcement
    let isBelowMinSupported = false;
    if (latestRelease.minSupportedVersionCode && numericInstalledCode > 0) {
      isBelowMinSupported = numericInstalledCode < latestRelease.minSupportedVersionCode;
    } else if (latestRelease.minSupportedVersion && installedSemver) {
      isBelowMinSupported = compareVersions(installedSemver, latestRelease.minSupportedVersion) < 0;
    }

    const now = new Date();
    let action = 'NONE';
    let isSupported = true;
    let daysRemaining = null;

    if (hasBuildUpdate || isBelowMinSupported) {
      if (isBelowMinSupported || latestRelease.releaseType === RELEASE_TYPES.CRITICAL) {
        // Critical updates or builds below minimum supported version are mandatory immediately
        action = 'MANDATORY';
        isSupported = false;
        daysRemaining = 0;
      } else if (latestRelease.releaseType === RELEASE_TYPES.IMPORTANT) {
        const deadline = latestRelease.gracePeriodDeadline
          ? new Date(latestRelease.gracePeriodDeadline)
          : null;

        if (deadline && now > deadline) {
          // Grace period expired
          action = 'MANDATORY';
          isSupported = false;
          daysRemaining = 0;
        } else {
          // Within grace period
          action = 'OPTIONAL';
          isSupported = true;
          if (deadline) {
            const diffMs = deadline.getTime() - now.getTime();
            daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
          } else {
            daysRemaining = latestRelease.gracePeriodDays || 7;
          }
        }
      } else {
        // NORMAL release
        action = 'OPTIONAL';
        isSupported = true;
      }
    }

    return {
      platform: latestRelease.platform,
      applicationId: latestRelease.applicationId,
      hasUpdate: hasBuildUpdate,
      action,
      isSupported,
      latestVersion: latestRelease.version,
      latestVersionCode: latestRelease.versionCode,
      releaseType: latestRelease.releaseType,
      releaseNotes: Array.isArray(latestRelease.releaseNotes) ? latestRelease.releaseNotes : [],
      gracePeriodDays: latestRelease.gracePeriodDays,
      gracePeriodDeadline: latestRelease.gracePeriodDeadline,
      daysRemaining,
      minSupportedVersion: latestRelease.minSupportedVersion,
      minSupportedVersionCode: latestRelease.minSupportedVersionCode,
      storeUrl: latestRelease.storeUrl,
    };
  }

  /**
   * Create a new draft release configuration.
   */
  async createRelease(payload, adminUserId) {
    const {
      platform = 'android',
      applicationId = 'com.atominosconsulting.nahom',
      version,
      versionCode,
      releaseType = RELEASE_TYPES.NORMAL,
      gracePeriodDays,
      minSupportedVersion = null,
      minSupportedVersionCode = null,
      releaseNotes = [],
      storeUrl,
    } = payload;

    const existing = await appUpdateRepository.findByPlatformAndVersionCode(platform, applicationId, versionCode);
    if (existing) {
      throw new HttpError(409, `Release with versionCode ${versionCode} already exists for platform ${platform}.`);
    }

    const resolvedGraceDays = releaseType === RELEASE_TYPES.CRITICAL
      ? 0
      : (typeof gracePeriodDays === 'number' ? Math.max(0, gracePeriodDays) : (releaseType === RELEASE_TYPES.IMPORTANT ? 7 : 0));

    const releaseData = {
      platform,
      applicationId,
      version: version.trim(),
      versionCode: Number(versionCode),
      releaseType,
      gracePeriodDays: resolvedGraceDays,
      gracePeriodDeadline: null,
      minSupportedVersion: minSupportedVersion ? minSupportedVersion.trim() : null,
      minSupportedVersionCode: minSupportedVersionCode ? Number(minSupportedVersionCode) : null,
      releaseNotes: Array.isArray(releaseNotes)
        ? releaseNotes.map((n) => String(n).trim()).filter(Boolean)
        : (typeof releaseNotes === 'string' ? [releaseNotes.trim()] : []),
      status: RELEASE_STATUSES.DRAFT,
      announcementStatus: ANNOUNCEMENT_STATUSES.NOT_ANNOUNCED,
      storeUrl: storeUrl?.trim() || undefined,
      createdBy: adminUserId,
      updatedBy: adminUserId,
    };

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const created = await appUpdateRepository.create(releaseData, session);
      await session.commitTransaction();
      logger.info(`App update release draft created: v${version} (Code: ${versionCode}, Type: ${releaseType})`);
      return created;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Update an existing release.
   */
  async updateRelease(id, payload, adminUserId) {
    const release = await appUpdateRepository.findById(id);
    if (!release) {
      throw new HttpError(404, 'Release configuration not found.');
    }

    if (release.status === RELEASE_STATUSES.RETIRED) {
      throw new HttpError(400, 'Cannot modify a retired release.');
    }

    const updateFields = {
      updatedBy: adminUserId,
    };

    if (payload.version) updateFields.version = payload.version.trim();
    if (payload.releaseType) updateFields.releaseType = payload.releaseType;
    if (Array.isArray(payload.releaseNotes)) {
      updateFields.releaseNotes = payload.releaseNotes.map((n) => String(n).trim()).filter(Boolean);
    }
    if (payload.minSupportedVersion !== undefined) {
      updateFields.minSupportedVersion = payload.minSupportedVersion ? payload.minSupportedVersion.trim() : null;
    }
    if (payload.minSupportedVersionCode !== undefined) {
      updateFields.minSupportedVersionCode = payload.minSupportedVersionCode ? Number(payload.minSupportedVersionCode) : null;
    }
    if (payload.storeUrl) updateFields.storeUrl = payload.storeUrl.trim();

    if (payload.gracePeriodDays !== undefined) {
      updateFields.gracePeriodDays = Math.max(0, Number(payload.gracePeriodDays));
      if (release.effectiveAt) {
        updateFields.gracePeriodDeadline = new Date(
          new Date(release.effectiveAt).getTime() + updateFields.gracePeriodDays * 24 * 60 * 60 * 1000
        );
      }
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const updated = await appUpdateRepository.updateById(id, updateFields, session);
      await session.commitTransaction();
      logger.info(`App update release ${id} updated.`);
      return updated;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Mark a release as AVAILABLE after administrator confirms Play Store publication.
   */
  async publishRelease(id, adminUserId, effectiveDate = null) {
    const release = await appUpdateRepository.findById(id);
    if (!release) {
      throw new HttpError(404, 'Release configuration not found.');
    }

    if (release.status === RELEASE_STATUSES.RETIRED) {
      throw new HttpError(400, 'Cannot publish a retired release.');
    }

    const now = new Date();
    const effectiveAt = effectiveDate ? new Date(effectiveDate) : (release.effectiveAt || now);
    const graceDays = typeof release.gracePeriodDays === 'number' ? release.gracePeriodDays : 7;
    const gracePeriodDeadline = new Date(effectiveAt.getTime() + graceDays * 24 * 60 * 60 * 1000);

    const updateData = {
      status: RELEASE_STATUSES.AVAILABLE,
      publishedAt: release.publishedAt || now,
      effectiveAt,
      gracePeriodDeadline,
      updatedBy: adminUserId,
    };

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const published = await appUpdateRepository.updateById(id, updateData, session);
      await session.commitTransaction();

      logger.info(`App update release published: v${published.version} (Code: ${published.versionCode})`);
      appUpdateEvents.emit(APP_UPDATE_EVENT_NAMES.RELEASE_PUBLISHED, { release: published });
      return published;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Trigger push notification announcement for an available release.
   * Idempotent: checks announcement status to prevent duplicates unless explicitly forced.
   */
  async announceRelease(id, adminUserId, force = false, correlationId = null) {
    const release = await appUpdateRepository.findById(id);
    if (!release) {
      throw new HttpError(404, 'Release configuration not found.');
    }

    if (release.status !== RELEASE_STATUSES.AVAILABLE) {
      throw new HttpError(400, 'Cannot announce an unpublished or unavailable release.');
    }

    if (release.announcementStatus === ANNOUNCEMENT_STATUSES.ANNOUNCED && !force) {
      throw new HttpError(409, 'Release has already been announced. Pass force=true to re-broadcast.');
    }

    const now = new Date();
    const updateData = {
      $set: {
        announcementStatus: ANNOUNCEMENT_STATUSES.ANNOUNCED,
        announcedAt: now,
        updatedBy: adminUserId,
      },
      $inc: { announcementCount: 1 },
    };

    const updated = await appUpdateRepository.updateById(id, updateData);
    logger.info(`Release announcement initiated for v${release.version}`);

    // Emit event for push delivery
    appUpdateEvents.emit(APP_UPDATE_EVENT_NAMES.RELEASE_ANNOUNCED, {
      release: updated,
      correlationId,
    });

    return updated;
  }

  /**
   * List releases with pagination for administrative inspection.
   */
  async listReleases(query) {
    const { platform, applicationId, status, page = 1, limit = 10 } = query;
    return await appUpdateRepository.listReleases({
      platform,
      applicationId,
      status,
      page: Number(page) || 1,
      limit: Math.min(50, Math.max(1, Number(limit) || 10)),
    });
  }

  /**
   * Get single release by ID
   */
  async getReleaseById(id) {
    const release = await appUpdateRepository.findById(id);
    if (!release) {
      throw new HttpError(404, 'Release not found.');
    }
    return release;
  }
}

export default new AppUpdateService();
