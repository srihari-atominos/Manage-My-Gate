import UserIdentity from './userIdentity.model.js';
import HttpError from '../../utils/httpError.utils.js';
import googleProvider from './providerAdapters/google.provider.js';
import microsoftProvider from './providerAdapters/microsoft.provider.js';

export class UserIdentityService {
  constructor() {
    this.adapters = {
      google: googleProvider,
      microsoft: microsoftProvider,
    };
  }

  /**
   * Delegates token verification and normalization to the appropriate provider adapter.
   * @param {string} provider - Provider name (e.g., 'google', 'microsoft')
   * @param {string} token - The raw ID token from the provider
   * @returns {Promise<object>} - Normalized identity data { provider, providerId, providerEmail, profileData }
   */
  async verifyAndNormalizeProviderToken(provider, token) {
    const adapter = this.adapters[provider];
    if (!adapter) {
      throw new HttpError(400, `SSO Provider '${provider}' is not supported yet.`);
    }
    const rawPayload = await adapter.verifyToken(token);
    return adapter.normalizeIdentity(rawPayload);
  }

  /**
   * Finds a user identity by provider and providerId.
   * @param {string} provider - Identity provider name
   * @param {string} providerId - ID from the provider
   * @param {object} [session] - Mongoose session
   */
  async getIdentityByProviderId(provider, providerId, session = null) {
    return await UserIdentity.findOne({ provider, providerId }).session(session);
  }

  /**
   * Links a user to a new identity provider.
   * @param {string} userId - Internal user ID
   * @param {object} identityData - Provider details { provider, providerId, providerEmail, profileData }
   * @param {object} [session] - Mongoose session
   */
  async linkIdentity(userId, identityData, session = null) {
    const existing = await UserIdentity.findOne({
      userId,
      provider: identityData.provider,
    }).session(session);

    if (existing) {
      throw new HttpError(400, `User is already linked to ${identityData.provider}`);
    }

    // Double check that no other user is linked to this exact provider identity
    const identityTaken = await UserIdentity.findOne({
      provider: identityData.provider,
      providerId: identityData.providerId
    }).session(session);
    if (identityTaken) {
      throw new HttpError(400, `This ${identityData.provider} account is already linked to another user.`);
    }

    const identity = new UserIdentity({
      userId,
      ...identityData,
    });

    return await identity.save({ session });
  }

  /**
   * Gets all linked identities for a user.
   * @param {string} userId - Internal user ID
   */
  async getUserIdentities(userId) {
    return await UserIdentity.find({ userId });
  }

  /**
   * Unlinks an identity from a user.
   * @param {string} userId - Internal user ID
   * @param {string} provider - Provider to unlink
   * @param {object} [session] - Mongoose session
   */
  async unlinkIdentity(userId, provider, session = null) {
    return await UserIdentity.findOneAndDelete({ userId, provider }).session(session);
  }
}

export default new UserIdentityService();
