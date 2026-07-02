import mongoose from 'mongoose';
import IntegrationHub from './integrationHub.model.js';

/**
 * Repository class handling database operations for the integration hub feature.
 */
export class IntegrationHubRepository {
  /**
   * Upsert an integration connection.
   * Creates the connection if not existing, otherwise updates credentials and status.
   * @param {string} userId - ID of the user configuring the connection
   * @param {string} orgId - ID of the owning organization
   * @param {string} provider - Provider key (openai, twilio, resend)
   * @param {string} accountLabel - Distinct label for the account
   * @param {Array<object>} credentials - Array of encrypted credential subdocuments
   * @param {string} status - Connection status ('connected' or 'disconnected')
   * @param {import('mongoose').ClientSession} [session] - Optional transaction session
   * @returns {Promise<object>} The updated or created document
   */
  async upsertConnection(userId, orgId, provider, accountLabel, credentials, status, session) {
    return await IntegrationHub.findOneAndUpdate(
      { orgId, provider, accountLabel },
      { userId, credentials, status },
      {
        new: true,
        upsert: true,
        runValidators: true,
        session: session || null,
      }
    );
  }

  /**
   * Paginated fetch for integration connections with secret exclusion.
   * @param {string} orgId - ID of the organization owning connections
   * @param {string} [provider] - Optional provider key
   * @param {number} skip - Number of documents to skip
   * @param {number} limit - Max documents to return
   * @param {import('mongoose').ClientSession} [session] - Optional transaction session
   * @returns {Promise<{ data: Array, totalRecords: number }>}
   */
  async getConnectionsPaginated(orgId, provider, skip, limit, session) {
    const match = { orgId: typeof orgId === 'string' ? new mongoose.Types.ObjectId(orgId) : orgId };
    if (provider) {
      match.provider = provider.toLowerCase();
    }

    const opts = session ? { session } : {};
    const result = await IntegrationHub.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                credentials: 0,
                __v: 0,
              }
            }
          ],
          metadata: [{ $count: 'totalRecords' }]
        }
      }
    ]).session(opts.session || null);

    const data = result[0]?.data || [];
    const totalRecords = result[0]?.metadata[0]?.totalRecords || 0;

    return { data, totalRecords };
  }

  /**
   * Find a specific connection document by its ID.
   * @param {string} connectionId - ID of the connection
   * @param {import('mongoose').ClientSession} [session] - Optional transaction session
   * @returns {Promise<object|null>} The integration connection document or null
   */
  async getConnectionById(connectionId, session) {
    return await IntegrationHub.findById(connectionId).session(session || null);
  }

  /**
   * Update the connection's account label.
   * @param {string} connectionId - ID of the connection
   * @param {string} orgId - Owner Organization ID
   * @param {string} newLabel - The new account label
   * @param {import('mongoose').ClientSession} [session] - Optional session
   * @returns {Promise<object|null>} The updated document
   */
  async updateConnectionLabel(connectionId, orgId, newLabel, session) {
    return await IntegrationHub.findOneAndUpdate(
      { _id: connectionId, orgId },
      { accountLabel: newLabel },
      {
        new: true,
        runValidators: true,
        session: session || null,
      }
    );
  }

  /**
   * Delete a connection by its ID and Organization ID.
   * @param {string} connectionId - ID of the connection
   * @param {string} orgId - Owner Organization ID
   * @param {import('mongoose').ClientSession} [session] - Optional session
   * @returns {Promise<object|null>} The deleted document
   */
  async deleteConnectionById(connectionId, orgId, session) {
    return await IntegrationHub.findOneAndDelete(
      { _id: connectionId, orgId },
      { session: session || null }
    );
  }

  /**
   * Find an active SMTP connection for an organization.
   * @param {string} orgId - Organization ID
   * @param {import('mongoose').ClientSession} [session] - Optional session
   * @returns {Promise<object|null>}
   */
  async findSmtpConnection(orgId, session = null) {
    return await IntegrationHub.findOne({
      orgId,
      provider: 'smtp',
      status: 'connected',
    }).session(session || null);
  }
}

export default new IntegrationHubRepository();
