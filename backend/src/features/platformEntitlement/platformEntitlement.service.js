import repository from './platformEntitlement.repository.js';
import events from './platformEntitlement.events.js';
import HttpError from '../../utils/httpError.utils.js';

export class PlatformEntitlementService {
  /**
   * Verify if a feature key is actively entitled for a specific organization.
   * Replaces hardcoded workspace flags.
   * @param {string} orgId
   * @param {string} featureKey
   * @param {ClientSession} [session=null]
   * @returns {Promise<boolean>}
   */
  async verifyEntitlement(orgId, featureKey, session = null) {
    if (!orgId || !featureKey) {
      return false;
    }

    const entitlement = await repository.findByOrgAndFeature(orgId, featureKey, session);

    if (!entitlement) {
      return false;
    }

    if (entitlement.status !== 'ACTIVE') {
      return false;
    }

    if (entitlement.expiryDate && entitlement.expiryDate <= new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Detailed entitlement verification with metadata response.
   * @param {string} orgId
   * @param {string} featureKey
   * @param {ClientSession} [session=null]
   */
  async checkEntitlementStatus(orgId, featureKey, session = null) {
    const isEntitled = await this.verifyEntitlement(orgId, featureKey, session);
    const entitlement = await repository.findByOrgAndFeature(orgId, featureKey, session);

    return {
      organisationId: orgId,
      featureKey,
      isEntitled,
      entitlement: entitlement || null,
    };
  }

  /**
   * Grant or update a feature entitlement for an organization.
   * @param {Object} payload
   * @param {ClientSession} [session=null]
   */
  async grantEntitlement(payload, session = null) {
    const { organisationId, subscriptionId, featureKey } = payload;

    if (!organisationId || !subscriptionId || !featureKey) {
      throw new HttpError(400, 'organisationId, subscriptionId, and featureKey are required.');
    }

    const entitlementData = {
      organisationId,
      subscriptionId,
      featureKey,
      status: payload.status || 'ACTIVE',
      quantity: payload.quantity !== undefined ? payload.quantity : 1,
      expiryDate: payload.expiryDate || null,
    };

    const entitlement = await repository.upsertEntitlement(
      organisationId,
      featureKey,
      entitlementData,
      session
    );

    events.emit('entitlementGranted', entitlement);
    return entitlement;
  }

  /**
   * Batch activate feature entitlements for an organization.
   * @param {string} organisationId
   * @param {string} subscriptionId
   * @param {Array<string>} featureKeys
   * @param {ClientSession} [session=null]
   */
  async activateBatch(organisationId, subscriptionId, featureKeys = [], session = null) {
    if (!organisationId || !subscriptionId) {
      throw new HttpError(400, 'organisationId and subscriptionId are required for batch activation.');
    }

    const activated = [];
    for (const key of featureKeys) {
      const entitlement = await this.grantEntitlement(
        {
          organisationId,
          subscriptionId,
          featureKey: key,
          status: 'ACTIVE',
        },
        session
      );
      activated.push(entitlement);
    }
    return activated;
  }

  /**
   * Get all entitlements for an Organization.
   * @param {string} orgId
   * @param {ClientSession} [session=null]
   */
  async getEntitlementsByOrgId(orgId, session = null) {
    return await repository.findByOrganisationId(orgId, session);
  }

  /**
   * List entitlements with pagination.
   * @param {Object} queryOptions
   */
  async listEntitlements(queryOptions) {
    return await repository.findAllPaginated(queryOptions);
  }

  /**
   * Update entitlement status (e.g. SUSPENDED, EXPIRED, INACTIVE).
   * @param {string} id
   * @param {string} status
   * @param {ClientSession} [session=null]
   */
  async updateStatus(id, status, session = null) {
    const entitlement = await repository.findById(id, session);
    if (!entitlement) {
      throw new HttpError(404, `Entitlement with ID ${id} not found.`);
    }

    const updated = await repository.updateById(id, { status }, session);
    events.emit('entitlementStatusUpdated', updated);
    return updated;
  }
}

export default new PlatformEntitlementService();
