import noticeVersionService, { NoticeVersionService } from './noticeVersion.service.js';
import noticeVersionController, { NoticeVersionController } from './noticeVersion.controller.js';
import noticeVersionRouter from './noticeVersion.routes.js';
import noticeVersionRepository, { NoticeVersionRepository } from './noticeVersion.repository.js';
import NoticeVersion from './noticeVersion.model.js';

export {
  NoticeVersion,
  NoticeVersionRepository,
  noticeVersionRepository,
  NoticeVersionService,
  noticeVersionService,
  NoticeVersionController,
  noticeVersionController,
  noticeVersionRouter,
};

export default noticeVersionService;
