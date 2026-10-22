import appUpdateService from './appUpdate.service.js';

class AppUpdateController {
  /**
   * Public endpoint to get client update policy
   */
  async getPolicy(req, res, next) {
    try {
      const { platform, applicationId, version, versionCode } = req.query;
      const policy = await appUpdateService.getReleasePolicy({
        platform,
        applicationId,
        installedVersion: version,
        installedVersionCode: versionCode,
      });
      res.success(policy, 'App release policy retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin endpoint to create a draft release
   */
  async createRelease(req, res, next) {
    try {
      const adminUserId = req.user?.id || req.user?._id;
      const release = await appUpdateService.createRelease(req.body, adminUserId);
      res.status(201).success(release, 'Release created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin endpoint to update a release
   */
  async updateRelease(req, res, next) {
    try {
      const adminUserId = req.user?.id || req.user?._id;
      const updated = await appUpdateService.updateRelease(req.params.id, req.body, adminUserId);
      res.success(updated, 'Release updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin endpoint to publish an existing release
   */
  async publishRelease(req, res, next) {
    try {
      const adminUserId = req.user?.id || req.user?._id;
      const effectiveAt = req.body?.effectiveAt || null;
      const published = await appUpdateService.publishRelease(req.params.id, adminUserId, effectiveAt);
      res.success(published, 'Release published successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin endpoint to trigger a release push announcement
   */
  async announceRelease(req, res, next) {
    try {
      const adminUserId = req.user?.id || req.user?._id;
      const force = Boolean(req.body?.force);
      const correlationId = req.id || req.headers['x-request-id'] || null;
      const announced = await appUpdateService.announceRelease(req.params.id, adminUserId, force, correlationId);
      res.success(announced, 'Release announcement initiated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin endpoint to list releases
   */
  async listReleases(req, res, next) {
    try {
      const result = await appUpdateService.listReleases(req.query);
      res.success(result, 'Releases retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin endpoint to get release details by ID
   */
  async getReleaseById(req, res, next) {
    try {
      const release = await appUpdateService.getReleaseById(req.params.id);
      res.success(release, 'Release details retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new AppUpdateController();
