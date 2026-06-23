import mongoose from 'mongoose';
import integrationHubRepository from './integrationHub.repository.js';
import { verifyProviderConnection } from './utils/providers/index.js';
import { encrypt, decrypt } from './utils/crypto.util.js';
import HttpError from '../../utils/httpError.utils.js';

/**
 * Service class for orchestrating the business logic of integrationHub.
 */
export class IntegrationHubService {
  /**
   * Connect an integration by validating the connection and saving the credentials.
   * @param {string} userId - User identifier
   * @param {string} provider - Provider key (openai, twilio, resend)
   * @param {object} credentials - Key-value pair of raw credentials
   * @returns {Promise<object>} Sanitized integration record details
   */
  async connect(userId, provider, accountLabel, credentials) {
    if (!userId || !provider || !accountLabel || !credentials) {
      throw new HttpError(400, 'User ID, provider, accountLabel, and credentials are required.');
    }

    // 1. Verify connection against the provider API
    try {
      await verifyProviderConnection(provider, credentials);
    } catch (err) {
      throw new HttpError(400, err.message);
    }

    // 2. Encrypt all credentials securely
    const encryptedCredentials = Object.entries(credentials).map(([key, value]) => {
      if (!value) {
        throw new HttpError(400, `Value for credential key "${key}" cannot be empty.`);
      }
      const { encryptedValue, iv } = encrypt(value);
      return {
        key,
        encryptedValue,
        iv,
      };
    });

    // 3. Database transaction for atomic persistence
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const connection = await integrationHubRepository.upsertConnection(
        userId,
        provider.toLowerCase(),
        accountLabel,
        encryptedCredentials,
        'connected',
        session
      );
      await session.commitTransaction();

      // Return sanitized output (never return encryptedValue or iv to client)
      return {
        id: connection._id,
        provider: connection.provider,
        accountLabel: connection.accountLabel,
        status: connection.status,
        configuredKeys: connection.credentials.map((c) => c.key),
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Get paginated connections for a user, omitting secrets.
   * @param {string} userId - User identifier
   * @param {string} [provider] - Optional provider filter
   * @param {number} [page=1] - Current page number
   * @param {number} [limit=10] - Records per page
   * @returns {Promise<object>} Paginated data payload
   */
  async getList(userId, provider, page = 1, limit = 10) {
    if (!userId) {
      throw new HttpError(400, 'User ID is required.');
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const skip = (page - 1) * limit;
      const { data, totalRecords } = await integrationHubRepository.getConnectionsPaginated(
        userId,
        provider,
        skip,
        limit,
        session
      );
      await session.commitTransaction();

      const totalPages = Math.ceil(totalRecords / limit);

      const formatted = data.map((conn) => ({
        id: conn._id,
        provider: conn.provider,
        accountLabel: conn.accountLabel,
        status: conn.status,
        createdAt: conn.createdAt,
        updatedAt: conn.updatedAt,
      }));

      return {
        data: formatted,
        pagination: {
          totalRecords,
          currentPage: page,
          totalPages: totalPages || 1,
          limit,
        },
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Delete an integration connection after checking it is not in use by any role.
   * @param {string} connectionId - ID of connection to delete
   * @param {string} userId - User identifier of owner
   * @returns {Promise<object>} Deletion metadata
   */
  async deleteConnection(connectionId, userId) {
    if (!connectionId || !userId) {
      throw new HttpError(400, 'Connection ID and User ID are required.');
    }

    // Dynamic import to prevent circular dependency
    const roleService = (await import('../role/role.services.js')).default;
    
    // Check if the connection is mapped to any role
    const inUse = await roleService.isConnectionInUse(connectionId);
    if (inUse) {
      throw new HttpError(409, 'Cannot delete. This connection is currently mapped to an active role.');
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const connection = await integrationHubRepository.deleteConnectionById(connectionId, userId, session);
      if (!connection) {
        throw new HttpError(404, `No connection found for ID: ${connectionId}`);
      }
      await session.commitTransaction();

      return {
        id: connection._id,
        provider: connection.provider,
        status: 'disconnected',
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Update the account label of a connection.
   * @param {string} connectionId - ID of the connection
   * @param {string} userId - Owner user ID
   * @param {string} newLabel - The new account label
   * @returns {Promise<object>} Updated connection metadata
   */
  async updateConnectionLabel(connectionId, userId, newLabel) {
    if (!connectionId || !userId || !newLabel) {
      throw new HttpError(400, 'Connection ID, User ID, and new label are required.');
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const connection = await integrationHubRepository.updateConnectionLabel(
        connectionId,
        userId,
        newLabel,
        session
      );
      if (!connection) {
        throw new HttpError(404, `No connection found for ID: ${connectionId}`);
      }
      await session.commitTransaction();

      return {
        id: connection._id,
        provider: connection.provider,
        accountLabel: connection.accountLabel,
        status: connection.status,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Retrieve and decrypt credentials for a specific connection.
   * Strictly for internal cross-feature use.
   * @param {string} connectionId - ID of the connection
   * @returns {Promise<object>} Raw decrypted credentials key-value object
   */
  async getDecryptedCredentialsById(connectionId) {
    if (!connectionId) {
      throw new HttpError(400, 'Connection ID is required.');
    }

    const connection = await integrationHubRepository.getConnectionById(connectionId);
    if (!connection) {
      throw new HttpError(404, `Connection with ID ${connectionId} not found.`);
    }

    const decryptedCredentials = {};
    for (const cred of connection.credentials) {
      decryptedCredentials[cred.key] = decrypt(cred.encryptedValue, cred.iv);
    }

    return decryptedCredentials;
  }
}

export default new IntegrationHubService();
