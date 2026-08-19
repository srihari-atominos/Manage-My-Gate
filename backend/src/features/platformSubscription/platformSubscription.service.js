import mongoose from 'mongoose';
import PlatformSubscription from './platformSubscription.model.js';
import ActivationExecution from './activationExecution.model.js';
import RenewalJob from './renewalJob.model.js';
import platformOrderService from '../platformOrder/platformOrder.service.js';
import HttpError from '../../utils/httpError.utils.js';
import EventEmitter from 'events';

export const platformSubscriptionEvents = new EventEmitter();

export class PlatformSubscriptionService {
  /**
   * Handle payment.completed event with Exactly-Once Activation Guarantee (Mandatory Correction 1).
   */
  async handlePaymentCompletedEvent(payload) {
    const { paymentId, invoiceId, orderId, organizationId, isTrial, trialDays = 14, planName } = payload;
    const activationKey = paymentId ? `ACT-SUB-${paymentId}` : (orderId ? `ACT-SUB-ORD-${orderId}` : `ACT-SUB-${Date.now()}-${Math.random()}`);

    // 1. Exactly-Once Check: Skip if already executed
    const existingExecution = await ActivationExecution.findOne({ activationKey }).exec();
    if (existingExecution && existingExecution.status === 'COMPLETED') {
      console.log(`[SubscriptionService] Exactly-Once Activation already completed for key: ${activationKey}`);
      return await PlatformSubscription.findOne({ orderId }).exec();
    }

    const execution = existingExecution || await ActivationExecution.create({
      paymentId: paymentId || null,
      invoiceId: invoiceId || null,
      organizationId: organizationId || null,
      activationKey,
      status: 'STARTED',
    });

    try {
      const order = orderId ? await platformOrderService.getOrderById(orderId).catch(() => null) : null;
      const subSeq = Math.floor(1000 + Math.random() * 9000);
      const subscriptionNumber = `SUB-2026-${subSeq}`;

      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 1);

      const trialDuration = parseInt(trialDays, 10) || 14;
      const trialEndDate = new Date(startDate.getTime() + trialDuration * 86400000);

      const selectedPlan = planName || order?.pricingSnapshot?.planName || order?.pricingSnapshot?.tier || 'COMMUNITY_ENTERPRISE';
      const subStatus = (isTrial || order?.isTrial) ? 'TRIALING' : 'ACTIVE';

      const subData = {
        subscriptionNumber,
        organizationId: organizationId || order?.organizationId || new mongoose.Types.ObjectId(),
        orderId: order ? order._id : null,
        planName: selectedPlan,
        tier: selectedPlan,
        billingFrequency: order?.billingFrequency || 'YEARLY',
        startDate,
        endDate,
        trialStartDate: startDate,
        trialEndDate,
        renewalDate: endDate,
        status: subStatus,
        entitlementProfile: order?.pricingSnapshot || {},
      };

      const subscription = await PlatformSubscription.create(subData);

      // Create initial Renewal Job (Mandatory Correction 3)
      await RenewalJob.create({
        subscriptionId: subscription._id,
        renewalDate: endDate,
        status: 'PENDING',
      }).catch(() => null);

      // Mark ActivationExecution as COMPLETED
      await ActivationExecution.findByIdAndUpdate(execution._id, {
        status: 'COMPLETED',
        completedAt: new Date(),
      }).catch(() => null);

      platformSubscriptionEvents.emit('subscription.activated', {
        subscriptionId: subscription._id,
        organizationId: subscription.organizationId,
        orderId: subscription.orderId,
        correlationId: payload.correlationId,
      });

      return subscription;
    } catch (err) {
      await ActivationExecution.findByIdAndUpdate(execution._id, { status: 'FAILED' });
      throw err;
    }
  }

  async getSubscriptions(query = {}) {
    const Organization = (await import('../organization/organization.model.js')).default;
    
    // Auto-drop stale organisationId_1 index if it exists in MongoDB
    try {
      await PlatformSubscription.collection.dropIndex('organisationId_1').catch(() => null);
    } catch (e) {
      // Ignore if index doesn't exist
    }

    // Auto-heal/sync missing subscriptions for non-platform organizations
    const orgs = await Organization.find({ isPlatform: { $ne: true } }).exec();
    for (const org of orgs) {
      const existingSub = await PlatformSubscription.findOne({
        $or: [
          { organizationId: org._id },
          { organisationId: org._id }
        ]
      }).exec();

      if (!existingSub) {
        const subSeq = Math.floor(1000 + Math.random() * 9000);
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + 1);

        await PlatformSubscription.create({
          subscriptionNumber: `SUB-2026-${subSeq}`,
          organizationId: org._id,
          organisationId: org._id,
          planName: org.subscriptionPlan || 'COMMUNITY_STARTER',
          billingFrequency: 'YEARLY',
          startDate,
          endDate,
          renewalDate: endDate,
          status: 'ACTIVE',
          entitlementProfile: { selectedAddOns: org.allowedFeatures || ['visitor', 'villas', 'users', 'roles', 'complaints'] }
        }).catch(() => null);
      }
    }

    return await PlatformSubscription.find(query)
      .populate('organizationId', 'name allowedFeatures status contactEmail')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getSubscriptionById(id) {
    const sub = await PlatformSubscription.findById(id)
      .populate('organizationId', 'name allowedFeatures status contactEmail')
      .exec();
    if (!sub) throw new HttpError(404, `Subscription '${id}' not found`);
    return sub;
  }

  async getRenewalJob(subscriptionId) {
    return await RenewalJob.findOne({ subscriptionId }).exec();
  }

  async suspendSubscription(id) {
    const sub = await this.getSubscriptionById(id);
    return await PlatformSubscription.findByIdAndUpdate(sub._id, { status: 'SUSPENDED' }, { returnDocument: 'after' });
  }

  async cancelSubscription(id) {
    const sub = await this.getSubscriptionById(id);
    return await PlatformSubscription.findByIdAndUpdate(sub._id, { status: 'CANCELLED' }, { returnDocument: 'after' });
  }

  /**
   * Evaluates organization subscription status against Trial Expiry & Term End Date.
   * Auto-expires trial or term if elapsed without renewal.
   */
  async checkAndEvaluateSubscriptionStatus(organizationId) {
    if (!organizationId) return { status: 'ACTIVE', accessGranted: true };

    let subscription = await PlatformSubscription.findOne({ organizationId })
      .sort({ createdAt: -1 })
      .exec();

    if (!subscription) {
      return { status: 'ACTIVE', accessGranted: true };
    }

    const now = new Date();

    // Check Free Trial Expiration
    if (subscription.status === 'TRIALING' || subscription.status === 'TRIAL') {
      if (subscription.trialEndDate && new Date(subscription.trialEndDate) < now) {
        subscription.status = 'EXPIRED';
        await subscription.save().catch(() => null);
        return {
          status: 'EXPIRED',
          accessGranted: false,
          reason: 'Your Free Trial has expired. Please complete your subscription renewal to restore access.',
          subscription
        };
      }
      return { status: 'TRIALING', accessGranted: true, subscription };
    }

    // Check Active Term Expiration (Monthly / Yearly)
    if (subscription.status === 'ACTIVE') {
      if (subscription.endDate && new Date(subscription.endDate) < now) {
        subscription.status = 'EXPIRED';
        await subscription.save().catch(() => null);
        return {
          status: 'EXPIRED',
          accessGranted: false,
          reason: 'Your Monthly/Annual subscription plan has expired. Please renew to continue workspace access.',
          subscription
        };
      }
      return { status: 'ACTIVE', accessGranted: true, subscription };
    }

    if (['EXPIRED', 'SUSPENDED', 'CANCELLED'].includes(subscription.status)) {
      return {
        status: subscription.status,
        accessGranted: false,
        reason: `Subscription is currently ${subscription.status}. Please complete renewal.`,
        subscription
      };
    }

    return { status: subscription.status || 'ACTIVE', accessGranted: true, subscription };
  }

  /**
   * Renew Subscription for Organization (Restores access for Monthly or Annual period).
   */
  async renewSubscription(organizationId, payload = {}) {
    const billingFrequency = payload.billingFrequency || 'YEARLY';
    const Organization = (await import('../organization/organization.model.js')).default;

    let subscription = await PlatformSubscription.findOne({
      $or: [
        { organizationId },
        { _id: payload.subscriptionId || organizationId }
      ]
    }).sort({ createdAt: -1 }).exec();

    const targetOrgId = subscription?.organizationId || organizationId;

    const startDate = new Date();
    let endDate = new Date(startDate);

    if (payload.customYears && parseInt(payload.customYears, 10) > 0) {
      endDate.setFullYear(endDate.getFullYear() + parseInt(payload.customYears, 10));
    } else if (payload.customMonths && parseInt(payload.customMonths, 10) > 0) {
      endDate.setMonth(endDate.getMonth() + parseInt(payload.customMonths, 10));
    } else if (payload.endDate) {
      endDate = new Date(payload.endDate);
    } else if (billingFrequency === 'MONTHLY') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (billingFrequency === 'SIX_MONTHS') {
      endDate.setMonth(endDate.getMonth() + 6);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    let finalAllowedFeatures = null;
    if (Array.isArray(payload.allowedFeatures)) {
      finalAllowedFeatures = payload.allowedFeatures;
    } else if (Array.isArray(payload.selectedAddOns)) {
      finalAllowedFeatures = payload.selectedAddOns.map(a => (typeof a === 'string' ? a : a.code || a.key || a.name));
    }

    if (subscription) {
      subscription.status = 'ACTIVE';
      subscription.startDate = startDate;
      subscription.endDate = endDate;
      subscription.renewalDate = endDate;
      subscription.billingFrequency = billingFrequency;
      if (finalAllowedFeatures) {
        subscription.entitlementProfile = {
          ...(subscription.entitlementProfile || {}),
          selectedAddOns: finalAllowedFeatures
        };
      }
      await subscription.save();
    } else {
      subscription = await PlatformSubscription.create({
        subscriptionNumber: `SUB-${Date.now().toString().slice(-6)}`,
        organizationId: targetOrgId,
        organisationId: targetOrgId,
        planName: payload.planName || 'COMMUNITY_STARTER',
        billingFrequency,
        startDate,
        endDate,
        renewalDate: endDate,
        status: 'ACTIVE',
        entitlementProfile: { selectedAddOns: finalAllowedFeatures || ['visitor', 'villas', 'users', 'roles', 'complaints'] }
      });
    }

    // Sync allowedFeatures with the Organization document in MongoDB
    if (targetOrgId && finalAllowedFeatures) {
      const orgIdToUpdate = typeof targetOrgId === 'object' ? targetOrgId._id : targetOrgId;
      const org = await Organization.findById(orgIdToUpdate).catch(() => null);
      if (org) {
        org.allowedFeatures = finalAllowedFeatures;
        if (payload.planName) org.subscriptionPlan = payload.planName;
        org.status = 'Active';
        await org.save().catch(() => null);
        console.log(`[renewSubscription] Updated Organization '${org.name}' allowedFeatures to:`, finalAllowedFeatures);
      }
    }

    await subscription.populate('organizationId', 'name allowedFeatures status contactEmail');
    return subscription;
  }
}

export default new PlatformSubscriptionService();
