import repository from './platformSubscription.repository.js';
import events from './platformSubscription.events.js';
import HttpError from '../../utils/httpError.utils.js';

export class PlatformSubscriptionService {
  /**
   * Create or update a platform subscription for an organization.
   * @param {Object} subscriptionData
   * @param {ClientSession} [session=null]
   */
  async createSubscription(subscriptionData, session = null) {
    const { organisationId, planName } = subscriptionData;

    if (!organisationId || !planName) {
      throw new HttpError(400, 'Both organisationId and planName are required.');
    }

    const payload = {
      organisationId,
      orderId: subscriptionData.orderId || null,
      planName,
      status: subscriptionData.status || 'ACTIVE',
      billingPeriodStart: subscriptionData.billingPeriodStart || new Date(),
      billingPeriodEnd: subscriptionData.billingPeriodEnd || null,
    };

    const subscription = await repository.upsertByOrganisationId(organisationId, payload, session);
    events.emit('subscriptionCreated', subscription);
    return subscription;
  }

  /**
   * Get subscription by ID.
   * @param {string} id
   * @param {ClientSession} [session=null]
   */
  async getSubscriptionById(id, session = null) {
    const subscription = await repository.findById(id, session);
    if (!subscription) {
      throw new HttpError(404, `Platform subscription with ID ${id} not found.`);
    }
    return subscription;
  }

  /**
   * Get subscription by Organisation ID.
   * @param {string} organisationId
   * @param {ClientSession} [session=null]
   */
  async getSubscriptionByOrgId(organisationId, session = null) {
    const subscription = await repository.findByOrganisationId(organisationId, session);
    if (!subscription) {
      throw new HttpError(404, `No active subscription found for organisation ${organisationId}.`);
    }
    return subscription;
  }

  /**
   * List platform subscriptions with filters and pagination.
   * @param {Object} queryOptions
   */
  async listSubscriptions(queryOptions) {
    return await repository.findAllPaginated(queryOptions);
  }

  /**
   * Update subscription status.
   * @param {string} id
   * @param {string} status
   * @param {ClientSession} [session=null]
   */
  async updateSubscriptionStatus(id, status, session = null) {
    const subscription = await this.getSubscriptionById(id, session);
    const updated = await repository.updateById(subscription._id, { status }, session);
    events.emit('subscriptionStatusUpdated', updated);
    return updated;
  }

  /**
   * Cancel subscription.
   * @param {string} id
   * @param {ClientSession} [session=null]
   */
  async cancelSubscription(id, session = null) {
    return await this.updateSubscriptionStatus(id, 'CANCELLED', session);
  }
}

export default new PlatformSubscriptionService();
