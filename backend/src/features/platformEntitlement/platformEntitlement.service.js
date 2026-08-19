import PlatformEntitlement from './platformEntitlement.model.js';
import platformSubscriptionService from '../platformSubscription/platformSubscription.service.js';
import HttpError from '../../utils/httpError.utils.js';
import EventEmitter from 'events';

export const platformEntitlementEvents = new EventEmitter();

export class PlatformEntitlementService {
  /**
   * Handle subscription.activated Event with Entitlement Versioning (Mandatory Correction 4).
   */
  async handleSubscriptionActivatedEvent(payload) {
    const { subscriptionId, organizationId } = payload;
    const subscription = await platformSubscriptionService.getSubscriptionById(subscriptionId);

    // Archive previous version if exists
    const existingCurrent = await PlatformEntitlement.findOne({ organizationId, isCurrentVersion: true }).exec();
    let nextVersion = 1;

    if (existingCurrent) {
      nextVersion = existingCurrent.profileVersion + 1;
      await PlatformEntitlement.findByIdAndUpdate(existingCurrent._id, {
        isCurrentVersion: false,
        deactivatedAt: new Date(),
      });
    }

    const newEntitlement = await PlatformEntitlement.create({
      organizationId: organizationId || subscription.organizationId,
      sourceSubscriptionId: subscription._id,
      profileVersion: nextVersion,
      isCurrentVersion: true,
      features: {
        visitorManagement: true,
        amenityBooking: true,
        villaBilling: true,
        iotIntegration: true,
        mobileAccess: true,
        crmAccess: true,
      },
      quotas: {
        maxVillas: 200,
        maxUsers: 1000,
        maxGuards: 20,
        storageGb: 100,
        apiUsageLimit: 50000,
      },
      activatedAt: new Date(),
    });

    platformEntitlementEvents.emit('entitlements.activated', {
      entitlementId: newEntitlement._id,
      organizationId: newEntitlement.organizationId,
      subscriptionId: subscription._id,
      orderId: subscription.orderId,
      correlationId: payload.correlationId,
    });

    return newEntitlement;
  }

  async getEntitlements(organizationId) {
    if (!organizationId) {
      return await PlatformEntitlement.find().sort({ createdAt: -1 }).exec();
    }
    return await PlatformEntitlement.find({ organizationId }).sort({ profileVersion: -1 }).exec();
  }

  async getCurrentEntitlement(organizationId) {
    const entitlement = await PlatformEntitlement.findOne({ organizationId, isCurrentVersion: true }).exec();
    if (!entitlement) {
      throw new HttpError(404, `No active entitlements found for organization '${organizationId}'`);
    }
    return entitlement;
  }
}

export default new PlatformEntitlementService();
