import mongoose from 'mongoose';
import IntegrationHub from './integrationHub.model.js';

/**
 * Repository class handling database operations for the integration hub feature.
 */
export class IntegrationHubRepository {
  /**
   * Upsert an integration connection (single-document write, atomic without a transaction).
   */
  async upsertConnection(userId, orgId, provider, accountLabel, credentials, status, session) {
    return await IntegrationHub.findOneAndUpdate(
      { orgId, provider, accountLabel },
      { userId, credentials, status, lastCheck: { ok: true, at: new Date(), message: 'Verified when connected' } },
      {
        returnDocument: 'after',
        upsert: true,
        runValidators: true,
        session: session || null,
      }
    );
  }

  /**
   * Paginated list. Secrets never leave the database: only the NAMES of the configured keys and the last
   * health check are returned.
   */
  async getConnectionsPaginated(orgId, provider, skip, limit, session) {
    const match = { orgId: typeof orgId === 'string' ? new mongoose.Types.ObjectId(orgId) : orgId };
    if (provider) {
      match.provider = provider.toLowerCase();
    }

    const result = await IntegrationHub.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            { $addFields: { configuredKeys: { $map: { input: '$credentials', as: 'c', in: '$$c.key' } } } },
            { $project: { credentials: 0, __v: 0 } },
          ],
          metadata: [{ $count: 'totalRecords' }],
        },
      },
    ]).session(session || null);

    const data = result[0]?.data || [];
    const totalRecords = result[0]?.metadata[0]?.totalRecords || 0;

    return { data, totalRecords };
  }

  /** Connection by id. Pass orgId to enforce tenant ownership. */
  async getConnectionById(connectionId, orgId = null, session = null) {
    const filter = { _id: connectionId };
    if (orgId) filter.orgId = orgId;
    return await IntegrationHub.findOne(filter).session(session || null);
  }

  async updateConnection(connectionId, orgId, patch, session) {
    return await IntegrationHub.findOneAndUpdate(
      { _id: connectionId, orgId },
      { $set: patch },
      { returnDocument: 'after', runValidators: true, session: session || null }
    );
  }

  async recordCheck(connectionId, orgId, check) {
    return await IntegrationHub.findOneAndUpdate(
      { _id: connectionId, orgId },
      { $set: { lastCheck: check } },
      { returnDocument: 'after' }
    );
  }

  async deleteConnectionById(connectionId, orgId, session) {
    return await IntegrationHub.findOneAndDelete({ _id: connectionId, orgId }, { session: session || null });
  }

  /**
   * Active connection of one community for a provider.
   */
  async findConnectionByOrgAndProvider(orgId, provider, session = null) {
    return await IntegrationHub.findOne({
      orgId,
      provider: provider.toLowerCase(),
      status: 'connected',
    }).session(session || null);
  }

  async findSmtpConnection(orgId, session = null) {
    return await this.findConnectionByOrgAndProvider(orgId, 'smtp', session);
  }

  // ------------------------------------------------------------------ platform-level lookups
  // Credentials that serve EVERY community (login OTP e-mail/SMS, platform mail) must come from the
  // platform organisation only. Reading "any community's connection" would let one community's admin
  // receive other people's login codes by connecting a mailbox or SMS account they control.

  async getPlatformOrgIds() {
    const Organization = (await import('../organization/organization.model.js')).default;
    const orgs = await Organization.find({ isPlatform: true }).select('_id').lean();
    return orgs.map((o) => o._id);
  }

  /** Newest platform connection for a provider, or null. `anyStatus` also returns a disconnected one. */
  async findPlatformConnection(provider, { anyStatus = false, session = null } = {}) {
    const list = await this.findPlatformConnections(provider, { anyStatus, session });
    return list[0] || null;
  }

  async findPlatformConnections(provider, { anyStatus = false, session = null } = {}) {
    const platformIds = await this.getPlatformOrgIds();
    if (platformIds.length === 0) return [];
    const filter = { orgId: { $in: platformIds }, provider: String(provider).toLowerCase() };
    if (!anyStatus) filter.status = 'connected';
    return await IntegrationHub.find(filter).sort({ updatedAt: -1, createdAt: -1 }).session(session || null);
  }

  /** Kept for existing callers: now platform-scoped (see above). */
  async findGlobalConnectionByProvider(provider, session = null) {
    return await this.findPlatformConnection(provider, { session });
  }
}

export default new IntegrationHubRepository();
