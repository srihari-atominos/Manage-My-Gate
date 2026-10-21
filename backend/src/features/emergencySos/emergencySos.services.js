import mongoose from 'mongoose';
import emergencySosRepository from './emergencySos.repository.js';
import emergencySosEvents from './emergencySos.events.js';
import notificationService from '../notification/notification.service.js';
import OrgMembership from '../orgMembership/orgMembership.model.js';
import User from '../user/user.model.js';
import HttpError from '../../utils/httpError.utils.js';
import logger from '../../utils/logger.utils.js';

class EmergencySosService {
  /**
   * Trigger an Emergency SOS Panic Alert from a resident.
   */
  async triggerSos(userId, orgId, payload = {}) {
    if (!userId || !orgId) {
      throw new HttpError(400, 'User ID and Organization context are required to trigger SOS.');
    }

    // 1. Fetch user profile details
    const userDoc = await User.findById(userId).select('name username phone email villaNumber activeVillaNumber unitNumber accessibleUnits').lean();
    if (!userDoc) {
      throw new HttpError(404, 'User not found.');
    }

    // 2. Resolve resident unit number & block
    let unitNumber = payload.unitNumber || userDoc.activeVillaNumber || userDoc.villaNumber || userDoc.unitNumber;
    let blockOrBuilding = payload.blockOrBuilding || '';

    if (!unitNumber) {
      // Look up membership record if not directly on user doc
      const membership = await OrgMembership.findOne({ userId, orgId, status: 'Active' })
        .populate('villaId', 'unitNumber blockOrBuilding')
        .lean();
      if (membership?.villaId) {
        unitNumber = membership.villaId.unitNumber || '';
        blockOrBuilding = membership.villaId.blockOrBuilding || '';
      }
    }

    if (!unitNumber) {
      unitNumber = 'Pending Unit Verification';
    }

    const residentName = userDoc.name || userDoc.username || userDoc.email?.split('@')[0] || 'Resident';
    const residentPhone = payload.phone || userDoc.phone || '';

    // 3. Prevent duplicate active alerts if one was just triggered within 60 seconds
    const existingActive = await emergencySosRepository.findActiveByUser(userId, orgId);
    if (existingActive) {
      logger.info(`[Emergency SOS Service] Resident ${userId} already has active alert ${existingActive._id}. Returning active record.`);
      return existingActive;
    }

    const alertData = {
      orgId: new mongoose.Types.ObjectId(orgId),
      userId: new mongoose.Types.ObjectId(userId),
      residentName,
      residentPhone,
      unitNumber,
      blockOrBuilding,
      alertType: payload.alertType || 'Security',
      status: 'ACTIVE',
      coordinates: {
        latitude: payload.latitude || payload.coordinates?.latitude || null,
        longitude: payload.longitude || payload.coordinates?.longitude || null,
      },
      address: payload.address || '',
      notes: payload.notes || '',
    };

    // 4. Save with Mongoose transaction
    let savedAlert = null;
    const session = await mongoose.startSession();
    let transactionStarted = false;
    try {
      session.startTransaction();
      transactionStarted = true;

      savedAlert = await emergencySosRepository.create(alertData, session);
      await session.commitTransaction();
    } catch (dbError) {
      if (transactionStarted) {
        try {
          await session.abortTransaction();
        } catch {
          // ignore rollback abort errors
        }
      }
      // Retry without session if standalone MongoDB does not support transactions
      if (/retryable writes|Transaction numbers are only allowed|does not support transactions/i.test(dbError.message)) {
        savedAlert = await emergencySosRepository.create(alertData, null);
      } else {
        throw dbError;
      }
    } finally {
      session.endSession();
    }

    // 5. Emit real-time socket event via decoupled event bus
    emergencySosEvents.emit('SOS_TRIGGERED', savedAlert);

    // 6. Deliver emergency push notifications to active security guards & admins in org
    this._notifySecurityPersonnel(orgId, savedAlert).catch((pushErr) => {
      logger.error('[Emergency SOS Service] Background security notification failed:', pushErr);
    });

    return savedAlert;
  }

  /**
   * Helper to dispatch emergency push notifications to guards & admins.
   */
  async _notifySecurityPersonnel(orgId, alert) {
    try {
      const memberships = await OrgMembership.find({ orgId, status: 'Active' })
        .populate('roleIds', 'name')
        .populate('roleId', 'name')
        .lean();

      const recipientIds = new Set();
      for (const m of memberships) {
        const roles = [
          ...(Array.isArray(m.roleIds) ? m.roleIds : []),
          ...(m.roleId ? [m.roleId] : []),
        ];
        const isSecurityOrAdmin = roles.some((r) => {
          const rName = String(r?.name || r || '').toLowerCase().replace(/[\s_-]+/g, '');
          return (
            rName === 'securityguard' ||
            rName === 'guard' ||
            rName === 'security' ||
            rName === 'admin' ||
            rName === 'superadmin' ||
            rName === 'facilitymanager'
          );
        });

        if (isSecurityOrAdmin && m.userId && String(m.userId) !== String(alert.userId)) {
          recipientIds.add(String(m.userId));
        }
      }

      for (const recipientId of recipientIds) {
        await notificationService.createNotification({
          recipientId,
          orgId,
          title: `EMERGENCY ALERT: ${alert.alertType.toUpperCase()} - Unit ${alert.unitNumber}`,
          body: `${alert.residentName} triggered a ${alert.alertType} emergency alert from Unit ${alert.unitNumber}. Immediate assistance required!`,
          type: 'EMERGENCY_SOS',
          metadata: {
            sosId: String(alert._id),
            alertType: alert.alertType,
            unitNumber: alert.unitNumber,
            latitude: alert.coordinates?.latitude,
            longitude: alert.coordinates?.longitude,
            residentPhone: alert.residentPhone,
          },
          actionUrl: '/(resident)/settings',
        });
      }
    } catch (err) {
      logger.error('[Emergency SOS Service] Error notifying security staff:', err);
    }
  }

  /**
   * Get active emergency SOS alert for the logged-in resident.
   */
  async getActiveSos(userId, orgId) {
    return await emergencySosRepository.findActiveByUser(userId, orgId);
  }

  /**
   * Cancel an emergency SOS alert (resident false alarm).
   */
  async cancelSos(sosId, userId, orgId) {
    const alert = await emergencySosRepository.findById(sosId);
    if (!alert) {
      throw new HttpError(404, 'Emergency alert not found.');
    }

    if (String(alert.userId?._id || alert.userId) !== String(userId)) {
      throw new HttpError(403, 'You are not authorized to cancel this emergency alert.');
    }

    if (alert.status === 'RESOLVED' || alert.status === 'CANCELLED') {
      return alert;
    }

    const updated = await emergencySosRepository.updateById(sosId, {
      status: 'CANCELLED',
      resolutionNotes: 'Cancelled by resident (False alarm)',
      resolvedAt: new Date(),
    });

    emergencySosEvents.emit('SOS_STATUS_UPDATED', updated);
    return updated;
  }

  /**
   * Acknowledge an emergency SOS alert (Guardhouse response).
   */
  async acknowledgeSos(sosId, guardUserId, orgId) {
    const alert = await emergencySosRepository.findById(sosId);
    if (!alert) {
      throw new HttpError(404, 'Emergency alert not found.');
    }

    if (String(alert.orgId) !== String(orgId)) {
      throw new HttpError(403, 'Cross-organization SOS operation denied.');
    }

    const updated = await emergencySosRepository.updateById(sosId, {
      status: 'ACKNOWLEDGED',
      acknowledgedBy: guardUserId,
      acknowledgedAt: new Date(),
    });

    emergencySosEvents.emit('SOS_STATUS_UPDATED', updated);
    return updated;
  }

  /**
   * Resolve an emergency SOS alert (Incident closed).
   */
  async resolveSos(sosId, actorId, orgId, resolutionNotes = '') {
    const alert = await emergencySosRepository.findById(sosId);
    if (!alert) {
      throw new HttpError(404, 'Emergency alert not found.');
    }

    if (String(alert.orgId) !== String(orgId)) {
      throw new HttpError(403, 'Cross-organization SOS operation denied.');
    }

    const updated = await emergencySosRepository.updateById(sosId, {
      status: 'RESOLVED',
      resolvedBy: actorId,
      resolvedAt: new Date(),
      resolutionNotes: resolutionNotes || 'Resolved by security team',
    });

    emergencySosEvents.emit('SOS_STATUS_UPDATED', updated);
    return updated;
  }

  /**
   * List paginated SOS alerts for guard or admin view.
   */
  async listSosAlerts(orgId, query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filters = {
      status: query.status,
      alertType: query.alertType,
      unitNumber: query.unitNumber,
      search: query.search,
    };

    const { total, records } = await emergencySosRepository.listPaginated(orgId, filters, skip, limit);

    return {
      records,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export default new EmergencySosService();
