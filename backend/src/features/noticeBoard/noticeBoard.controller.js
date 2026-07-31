import noticeService from './noticeBoard.service.js'
import mongoose from 'mongoose'

export class NoticeBoardController {
  /**
   * Create a new notice.
   */
  async create(req, res, next) {
    try {
      const orgId = req.tenant.orgId
      const userId = req.user._id || req.user.id

      const uploadedImages = (req.files || []).map((file) => ({
        url: `/public/uploads/notices/${file.filename}`,
        filename: file.originalname,
        uploadTimestamp: new Date(),
      }))

      const noticeData = {
        ...req.body,
        images: uploadedImages,
      }



      const notice = await noticeService.createNotice(noticeData, userId, orgId)
      res.success(notice, 'Notice created successfully', 201)
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get all notices with filters, search, pagination, and sorting.
   */
  async getAll(req, res, next) {
    try {
      const orgId = req.tenant.orgId
      const userId = req.user._id || req.user.id
      
      let page = parseInt(req.query.page, 10);
      if (isNaN(page) || page < 1) {
        page = 1;
      }
      let limit = parseInt(req.query.limit, 10);
      if (isNaN(limit) || limit < 1) {
        limit = 10;
      }

      // Extract permissions to restrict residents to Published notices only
      let permissions = [];
      if (req.user.roleId) {
        const rolePermissionService = (await import('../rolePermission/rolePermission.services.js')).default;
        const permissionsList = await rolePermissionService.getPermissionsByRoleId(req.user.roleId);
        permissions = permissionsList.map((p) => p.name);
      } else if (req.user.role && req.tenant?.orgId) {
        try {
          const roleService = (await import('../role/role.services.js')).default;
          const role = await roleService.getRoleByName(req.user.role, req.tenant.orgId);
          if (role) {
            const rolePermissionService = (await import('../rolePermission/rolePermission.services.js')).default;
            const permissionsList = await rolePermissionService.getPermissionsByRoleId(role._id);
            permissions = permissionsList.map((p) => p.name);
          }
        } catch (err) {
          console.error('[NoticeBoard Controller] Fallback permission resolution failed:', err.message);
        }
      }
      const userPermissions = permissions.map((p) => p.replace(':', '.'));
      const hasCreatePermission =
        req.user.role === 'Super Admin' ||
        req.user.role === 'Platform Super Admin' ||
        userPermissions.includes('notices.manage_notices') ||
        userPermissions.includes('notices:manage_notices');
      const restrictToPublished = !hasCreatePermission

      // Extract filters and search parameters
      const queryParams = {
        category: req.query.category,
        priority: req.query.priority,
        status: req.query.status,
        isPinned: req.query.isPinned,
        search: req.query.search,
        sortBy: req.query.sortBy,
        sortOrder: req.query.sortOrder,
        isBookmarked: req.query.isBookmarked,
        readStatus: req.query.readStatus,
      }

      const result = await noticeService.getAllNotices(
        orgId,
        userId,
        page,
        limit,
        queryParams,
        restrictToPublished,
      )
      res.success(result, 'Notices retrieved successfully')
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get a notice by ID.
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params
      const userId = req.user._id || req.user.id
      const notice = await noticeService.getNoticeById(id)

      const readByList = notice.readBy || []
      const bookmarkedByList = notice.bookmarkedBy || []

      const result = {
        ...notice.toObject(),
        isReadByUser: readByList.some((uid) => uid.toString() === userId.toString()),
        isBookmarkedByUser: bookmarkedByList.some((uid) => uid.toString() === userId.toString()),
        readerCount: readByList.length,
      }

      res.success(result, 'Notice retrieved successfully')
    } catch (error) {
      next(error)
    }
  }

  /**
   * Update a notice.
   */
  async update(req, res, next) {
    try {
      const { id } = req.params
      const orgId = req.tenant.orgId
      const userId = req.user._id || req.user.id

      const uploadedImages = (req.files || []).map((file) => ({
        url: `/public/uploads/notices/${file.filename}`,
        filename: file.originalname,
        uploadTimestamp: new Date(),
      }))

      let existingImages = []
      if (req.body.existingImages) {
        try {
          existingImages = JSON.parse(req.body.existingImages)
        } catch (e) {
          existingImages = Array.isArray(req.body.existingImages)
            ? req.body.existingImages
            : [req.body.existingImages]
        }
      }

      const finalImages = [...existingImages, ...uploadedImages]

      const noticeData = {
        ...req.body,
        images: finalImages,
      }



      const notice = await noticeService.updateNotice(id, noticeData, userId, orgId)
      res.success(notice, 'Notice updated successfully')
    } catch (error) {
      next(error)
    }
  }

  /**
   * Delete a notice.
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params
      const orgId = req.tenant.orgId
      const userId = req.user.id
      await noticeService.deleteNotice(id, orgId, userId)
      res.success({ id }, 'Notice deleted successfully')
    } catch (error) {
      next(error)
    }
  }

  /**
   * Toggle the pinned status of a notice.
   */
  async togglePin(req, res, next) {
    try {
      const { id } = req.params
      const orgId = req.tenant.orgId
      const userId = req.user._id || req.user.id
      const { isPinned } = req.body

      const notice = await noticeService.togglePinNotice(id, isPinned, userId, orgId)
      res.success(notice, `Notice successfully ${isPinned ? 'pinned' : 'unpinned'}`)
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get notice statistics.
   */
  async getStats(req, res, next) {
    try {
      const orgId = req.tenant.orgId
      const stats = await noticeService.getNoticeStats(orgId)
      res.success(stats, 'Notice statistics retrieved successfully')
    } catch (error) {
      next(error)
    }
  }

  /**
   * Mark a notice as read by the current user.
   */
  async markAsRead(req, res, next) {
    try {
      const { id } = req.params
      const orgId = req.tenant.orgId
      const userId = req.user._id || req.user.id
      const notice = await noticeService.markNoticeAsRead(id, userId, orgId)
      res.success(notice, 'Notice marked as read successfully')
    } catch (error) {
      next(error)
    }
  }

  /**
   * Bookmark or unbookmark a notice.
   */
  async bookmark(req, res, next) {
    try {
      const { id } = req.params
      const orgId = req.tenant.orgId
      const userId = req.user._id || req.user.id
      const { isBookmarked } = req.body
      const notice = await noticeService.bookmarkNotice(id, userId, orgId, isBookmarked)
      res.success(notice, `Notice successfully ${isBookmarked ? 'bookmarked' : 'unbookmarked'}`)
    } catch (error) {
      next(error)
    }
  }
}

export default new NoticeBoardController()
