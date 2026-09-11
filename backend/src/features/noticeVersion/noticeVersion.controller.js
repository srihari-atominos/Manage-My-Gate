import noticeVersionService from './noticeVersion.service.js';

export class NoticeVersionController {
  async getVersions(req, res, next) {
    try {
      const noticeId = req.params.id || req.params.noticeId;
      const orgId = req.orgId || req.user.currentOrgId || req.user.orgId;

      const versions = await noticeVersionService.getVersions(noticeId, orgId);
      res.status(200).json({
        success: true,
        message: 'Notice versions retrieved successfully.',
        data: versions,
      });
    } catch (error) {
      next(error);
    }
  }

  async getVersionByNumber(req, res, next) {
    try {
      const noticeId = req.params.id || req.params.noticeId;
      const version = req.params.version;
      const orgId = req.orgId || req.user.currentOrgId || req.user.orgId;

      const record = await noticeVersionService.getVersionByNumber(noticeId, version, orgId);
      res.status(200).json({
        success: true,
        message: `Notice version ${version} retrieved successfully.`,
        data: record,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new NoticeVersionController();
