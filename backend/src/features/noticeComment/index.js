import noticeCommentService, { NoticeCommentService } from './noticeComment.service.js';
import noticeCommentController, { NoticeCommentController } from './noticeComment.controller.js';
import noticeCommentRouter from './noticeComment.routes.js';
import noticeCommentRepository, { NoticeCommentRepository } from './noticeComment.repository.js';
import NoticeComment from './noticeComment.model.js';

export {
  NoticeComment,
  NoticeCommentRepository,
  noticeCommentRepository,
  NoticeCommentService,
  noticeCommentService,
  NoticeCommentController,
  noticeCommentController,
  noticeCommentRouter,
};

export default noticeCommentService;
