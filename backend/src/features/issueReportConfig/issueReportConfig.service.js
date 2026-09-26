import issueReportConfigRepository from './issueReportConfig.repository.js';
import HttpError from '../../utils/httpError.utils.js';

export class IssueReportConfigService {
  /**
   * Retrieve the current platform admin issue report email configuration.
   *
   * @returns {Promise<{ email: string, updatedAt: Date|null }>}
   */
  async getConfig() {
    const configDoc = await issueReportConfigRepository.getConfig();
    return {
      email: configDoc?.platformAdminEmail || '',
      updatedAt: configDoc?.updatedAt || null,
    };
  }

  /**
   * Helper method for internal features to retrieve the active email string.
   *
   * @returns {Promise<string>} Configured email string or empty string if unconfigured.
   */
  async getPlatformReportEmail() {
    const configDoc = await issueReportConfigRepository.getConfig();
    return (configDoc?.platformAdminEmail || '').trim();
  }

  /**
   * Update the platform admin issue report email configuration.
   *
   * @param {string} email - New email address
   * @param {string} userId - Authenticated Platform Admin User ID
   * @returns {Promise<{ email: string, updatedAt: Date }>}
   */
  async updateConfig(email, userId) {
    const rawEmail = (email || '').trim().toLowerCase();

    // Sanitize and validate email address syntax if provided
    if (rawEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(rawEmail)) {
        throw new HttpError(400, 'Invalid email address format.');
      }
    }

    const updatedDoc = await issueReportConfigRepository.updateConfig(rawEmail, userId);
    return {
      email: updatedDoc.platformAdminEmail || '',
      updatedAt: updatedDoc.updatedAt,
    };
  }
}

export const issueReportConfigService = new IssueReportConfigService();
export default issueReportConfigService;
