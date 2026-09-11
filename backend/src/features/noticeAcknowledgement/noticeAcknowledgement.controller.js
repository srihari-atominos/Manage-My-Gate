import noticeAcknowledgementService from './noticeAcknowledgement.service.js';

export class NoticeAcknowledgementController {
  async acknowledge(req, res, next) {
    try {
      const noticeId = req.params.id || req.params.noticeId;
      const userId = req.user.id || req.user._id;
      const orgId = req.orgId || req.user.currentOrgId || req.user.orgId;
      const { unitId } = req.body || {};

      const result = await noticeAcknowledgementService.acknowledgeNotice(noticeId, userId, orgId, unitId);
      res.status(201).json({
        success: true,
        message: 'Notice acknowledged successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAcknowledgements(req, res, next) {
    try {
      const noticeId = req.params.id || req.params.noticeId;
      const userId = req.user.id || req.user._id;
      const orgId = req.orgId || req.user.currentOrgId || req.user.orgId;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;

      const result = await noticeAcknowledgementService.getAcknowledgements(noticeId, orgId, userId, page, limit);
      res.status(200).json({
        success: true,
        message: 'Notice acknowledgements retrieved successfully.',
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new NoticeAcknowledgementController();
