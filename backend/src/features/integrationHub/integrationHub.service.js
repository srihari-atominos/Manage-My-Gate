import integrationHubRepository from './integrationHub.repository.js';
import { verifyProviderConnection } from './utils/providers/index.js';
import { encryptGCM, decrypt, decryptGCM } from './utils/crypto.util.js';
import { getCatalogEntry, PLATFORM_ONLY_PROVIDERS } from './integrationHub.catalog.js';
import auditLogService from '../auditLog/auditLog.services.js';
import logger from '../../utils/logger.utils.js';
import HttpError from '../../utils/httpError.utils.js';

const decryptCredentialDoc = (cred) =>
  cred.authTag ? decryptGCM(cred.encryptedValue, cred.iv, cred.authTag) : decrypt(cred.encryptedValue, cred.iv, cred.authTag);

/** Never put a credential value in a log or an audit entry: only names and outcomes. */
const audit = async (action, { orgId, userId, connection, details = {} }) => {
  try {
    await auditLogService.logEvent({
      actorId: userId || undefined,
      action: `Integration Hub: ${action}`,
      targetId: orgId,
      metadata: {
        connectionId: String(connection?._id || ''),
        provider: connection?.provider || '',
        accountLabel: connection?.accountLabel || '',
        ...details,
      },
    });
  } catch (err) {
    logger.warn(`[IntegrationHub] audit log failed: ${err.message}`);
  }
};

const sanitizeConnection = (connection) => ({
  id: connection._id,
  provider: connection.provider,
  accountLabel: connection.accountLabel,
  status: connection.status,
  configuredKeys: (connection.credentials || []).map((c) => c.key),
  lastCheck: connection.lastCheck || null,
});

/**
 * Service class for orchestrating the business logic of integrationHub.
 */
export class IntegrationHubService {
  /** Platform-level providers (login OTP, platform mail, ...) may only be configured by platform admins. */
  assertMayConfigure(provider, isPlatform) {
    if (PLATFORM_ONLY_PROVIDERS.includes(String(provider).toLowerCase()) && !isPlatform) {
      throw new HttpError(403, 'Only platform administrators can configure this integration.');
    }
  }

  /**
   * Keep only the fields this provider defines and drop empty optional ones, so junk keys are never stored.
   * Required fields are checked by the validator and the provider verifier.
   */
  pickKnownFields(provider, credentials = {}) {
    const entry = getCatalogEntry(provider);
    if (!entry) throw new HttpError(400, `Unsupported provider: ${provider}`);
    const picked = {};
    for (const field of entry.fields) {
      const value = credentials[field.name];
      if (value === undefined || value === null || String(value).trim() === '') continue;
      picked[field.name] = String(value).trim();
    }
    return picked;
  }

  encryptAll(credentials) {
    return Object.entries(credentials).map(([key, value]) => {
      const { encryptedValue, iv, authTag } = encryptGCM(String(value));
      return { key, encryptedValue, iv, authTag };
    });
  }

  decryptAll(connection) {
    const out = {};
    for (const cred of connection.credentials || []) out[cred.key] = decryptCredentialDoc(cred);
    return out;
  }

  /**
   * Connect an integration by validating the connection and saving the credentials.
   */
  async connect(userId, orgId, provider, accountLabel, credentials, { isPlatform = false } = {}) {
    if (!userId || !orgId || !provider || !accountLabel || !credentials) {
      throw new HttpError(400, 'User ID, Organization ID, provider, accountLabel, and credentials are required.');
    }
    const providerLower = provider.toLowerCase();
    this.assertMayConfigure(providerLower, isPlatform);

    const clean = this.pickKnownFields(providerLower, credentials);
    if (Object.keys(clean).length === 0) {
      throw new HttpError(400, 'No credential values were provided.');
    }

    try {
      await verifyProviderConnection(providerLower, clean);
    } catch (err) {
      throw new HttpError(400, err.message);
    }

    const connection = await integrationHubRepository.upsertConnection(
      userId,
      orgId,
      providerLower,
      accountLabel,
      this.encryptAll(clean),
      'connected'
    );

    await audit('Integration Connected', { orgId, userId, connection, details: { keys: Object.keys(clean) } });
    return sanitizeConnection(connection);
  }

  /**
   * Paginated connections for a community, without secrets.
   */
  async getList(orgId, provider, page = 1, limit = 10) {
    if (!orgId) {
      throw new HttpError(400, 'Organization ID is required.');
    }
    const safeLimit = Math.min(Math.max(1, Number(limit) || 10), 100);
    const safePage = Math.max(1, Number(page) || 1);
    const { data, totalRecords } = await integrationHubRepository.getConnectionsPaginated(
      orgId,
      provider,
      (safePage - 1) * safeLimit,
      safeLimit
    );

    return {
      data: data.map((conn) => ({
        id: conn._id,
        provider: conn.provider,
        accountLabel: conn.accountLabel,
        status: conn.status,
        configuredKeys: conn.configuredKeys || [],
        lastCheck: conn.lastCheck || null,
        createdAt: conn.createdAt,
        updatedAt: conn.updatedAt,
      })),
      pagination: {
        totalRecords,
        currentPage: safePage,
        totalPages: Math.ceil(totalRecords / safeLimit) || 1,
        limit: safeLimit,
      },
    };
  }

  /**
   * Delete a connection after checking it is not in use by any role of THIS community.
   */
  async deleteConnection(connectionId, orgId, { userId = null, isPlatform = false } = {}) {
    if (!connectionId || !orgId) {
      throw new HttpError(400, 'Connection ID and Organization ID are required.');
    }
    const existing = await integrationHubRepository.getConnectionById(connectionId, orgId);
    if (!existing) throw new HttpError(404, `No connection found for ID: ${connectionId}`);
    this.assertMayConfigure(existing.provider, isPlatform);

    // Dynamic import to prevent circular dependency
    const roleService = (await import('../role/role.services.js')).default;
    if (await roleService.isConnectionInUse(connectionId)) {
      throw new HttpError(409, 'Cannot delete. This connection is currently mapped to an active role. Update its credentials instead, or remove it from the role first.');
    }

    const connection = await integrationHubRepository.deleteConnectionById(connectionId, orgId);
    if (!connection) throw new HttpError(404, `No connection found for ID: ${connectionId}`);

    await audit('Integration Disconnected', { orgId, userId, connection });
    return { id: connection._id, provider: connection.provider, status: 'disconnected' };
  }

  /**
   * Change the label and/or rotate credentials. Blank credential fields keep the stored value, so an admin can
   * replace just the secret without re-typing everything; the result is verified before it is saved.
   */
  async updateConnection(connectionId, orgId, { accountLabel, credentials } = {}, { userId = null, isPlatform = false } = {}) {
    if (!connectionId || !orgId) {
      throw new HttpError(400, 'Connection ID and Organization ID are required.');
    }
    const existing = await integrationHubRepository.getConnectionById(connectionId, orgId);
    if (!existing) throw new HttpError(404, `No connection found for ID: ${connectionId}`);
    this.assertMayConfigure(existing.provider, isPlatform);

    const patch = {};
    if (accountLabel) patch.accountLabel = String(accountLabel).trim();

    let changedKeys = [];
    if (credentials && Object.keys(credentials).length > 0) {
      const incoming = this.pickKnownFields(existing.provider, credentials);
      changedKeys = Object.keys(incoming);
      if (changedKeys.length > 0) {
        const merged = { ...this.decryptAll(existing), ...incoming };
        try {
          await verifyProviderConnection(existing.provider, merged);
        } catch (err) {
          throw new HttpError(400, err.message);
        }
        patch.credentials = this.encryptAll(merged);
        patch.lastCheck = { ok: true, at: new Date(), message: 'Verified when updated' };
      }
    }
    if (Object.keys(patch).length === 0) {
      throw new HttpError(400, 'Nothing to update.');
    }

    let connection;
    try {
      connection = await integrationHubRepository.updateConnection(connectionId, orgId, patch);
    } catch (err) {
      if (err?.code === 11000) {
        throw new HttpError(409, 'Another connection of this provider already uses that label.');
      }
      throw err;
    }
    if (!connection) throw new HttpError(404, `No connection found for ID: ${connectionId}`);

    await audit(changedKeys.length ? 'Integration Credentials Updated' : 'Integration Label Updated', {
      orgId,
      userId,
      connection,
      details: { keys: changedKeys, labelChanged: Boolean(accountLabel) },
    });
    return sanitizeConnection(connection);
  }

  /** Backwards-compatible alias: label-only update. */
  async updateConnectionLabel(connectionId, orgId, newLabel, options = {}) {
    if (!newLabel) throw new HttpError(400, 'Connection ID, Organization ID, and new label are required.');
    return this.updateConnection(connectionId, orgId, { accountLabel: newLabel }, options);
  }

  /**
   * "Test connection": re-verifies the STORED credentials with the provider and records the outcome.
   * Does not change `status`, so a temporary network problem never switches a working integration off.
   */
  async testConnection(connectionId, orgId, { userId = null, isPlatform = false } = {}) {
    const existing = await integrationHubRepository.getConnectionById(connectionId, orgId);
    if (!existing) throw new HttpError(404, `No connection found for ID: ${connectionId}`);
    this.assertMayConfigure(existing.provider, isPlatform);

    let ok = true;
    let message = 'Connection works.';
    try {
      await verifyProviderConnection(existing.provider, this.decryptAll(existing));
    } catch (err) {
      ok = false;
      message = String(err.message || 'Verification failed').slice(0, 300);
    }
    const check = { ok, at: new Date(), message };
    await integrationHubRepository.recordCheck(connectionId, orgId, check);
    await audit('Integration Tested', { orgId, userId, connection: existing, details: { ok } });
    return { id: existing._id, provider: existing.provider, ...check };
  }

  /**
   * Retrieve and decrypt credentials for a specific connection.
   * Strictly for internal cross-feature use. Supports both GCM and CBC decryption.
   * @param {string} connectionId - ID of the connection
   * @param {string} [expectedOrgId=null] - Optional expected Organization ID to enforce tenant isolation
   * @returns {Promise<object>} Raw decrypted credentials key-value object
   */
  async getDecryptedCredentialsById(connectionId, expectedOrgId = null) {
    if (!connectionId) {
      throw new HttpError(400, 'Connection ID is required.');
    }
    const connection = await integrationHubRepository.getConnectionById(connectionId, orgId);
    if (!connection) {
      throw new HttpError(404, `Connection with ID ${connectionId} not found.`);
    }

    if (connection.orgId && !connection.isGlobal) {
      if (!expectedOrgId) {
        throw new HttpError(400, 'Tenant context (expectedOrgId) is required for tenant-scoped integration credentials.');
      }
      if (String(connection.orgId) !== String(expectedOrgId)) {
        throw new HttpError(403, 'Access denied: Integration connection belongs to another organization.');
      }
    }

    const decryptedCredentials = {};
    for (const cred of connection.credentials) {
      if (cred.authTag) {
        decryptedCredentials[cred.key] = decryptGCM(cred.encryptedValue, cred.iv, cred.authTag);
      } else {
        decryptedCredentials[cred.key] = decrypt(cred.encryptedValue, cred.iv, cred.authTag);
      }
    }

    return decryptedCredentials;
  }

  /**
   * Whether a community has a usable Razorpay connection.
   */
  async isProviderConfigured(orgId, provider = 'razorpay') {
    if (!orgId) return false;
    const connection = await integrationHubRepository.findConnectionByOrgAndProvider(orgId, provider);
    if (!connection || connection.status !== 'connected' || !Array.isArray(connection.credentials)) {
      return false;
    }
    const credKeys = connection.credentials.map((c) => c.key);
    const hasKeyId = credKeys.includes('keyId') || credKeys.includes('key_id');
    const hasKeySecret = credKeys.includes('keySecret') || credKeys.includes('key_secret');
    return hasKeyId && hasKeySecret;
  }

  /**
   * Decrypted credentials for a community by provider key (payments and other internal services).
   */
  async getDecryptedCredentials(orgId, provider = 'razorpay') {
    if (!orgId) {
      throw new HttpError(400, 'Organization ID is required.');
    }

    const connection = await integrationHubRepository.findConnectionByOrgAndProvider(orgId, provider);
    let decryptedCredentials = {};
    let isConfigured = false;

    if (connection && connection.status === 'connected' && connection.credentials) {
      decryptedCredentials = this.decryptAll(connection);
      const keyId = decryptedCredentials.keyId || decryptedCredentials.key_id;
      const keySecret = decryptedCredentials.keySecret || decryptedCredentials.key_secret;
      if (keyId && keySecret) {
        isConfigured = true;
      }
    }

    const keyId = decryptedCredentials.keyId || decryptedCredentials.key_id || '';
    const keySecret = decryptedCredentials.keySecret || decryptedCredentials.key_secret || '';

    return {
      ...decryptedCredentials,
      keyId,
      keySecret,
      key_id: keyId,
      key_secret: keySecret,
      isConfigured,
    };
  }

  async findSmtpConnection(orgId, session = null) {
    if (!orgId) {
      throw new HttpError(400, 'Organization ID is required.');
    }
    return await integrationHubRepository.findSmtpConnection(orgId, session);
  }

  /**
   * Platform-level connection by provider (read from the PLATFORM organisation only, never from a community).
   */
  async getGlobalConnectionByProvider(provider, session = null) {
    if (!provider) {
      throw new HttpError(400, 'Provider is required.');
    }
    return await integrationHubRepository.findPlatformConnection(provider, { session });
  }
}

export default new IntegrationHubService();
