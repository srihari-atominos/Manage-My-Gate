import IssueReportConfig from './issueReportConfig.model.js';

export class IssueReportConfigRepository {
  /**
   * Find or initialize the singleton platform issue report configuration document.
   *
   * @param {import('mongoose').ClientSession|null} [session=null]
   * @returns {Promise<Object>} Mongoose document
   */
  async getConfig(session = null) {
    const options = { new: true, upsert: true, setDefaultsOnInsert: true };
    if (session) options.session = session;

    return await IssueReportConfig.findOneAndUpdate(
      { key: 'PLATFORM_ADMIN_REPORT_EMAIL' },
      { $setOnInsert: { key: 'PLATFORM_ADMIN_REPORT_EMAIL', platformAdminEmail: '' } },
      options
    ).exec();
  }

  /**
   * Update the configured platform admin email address.
   *
   * @param {string} email - Validated email address (or empty string)
   * @param {string|null} updatedBy - UserId of the Platform Admin making the update
   * @param {import('mongoose').ClientSession|null} [session=null]
   * @returns {Promise<Object>} Updated Mongoose document
   */
  async updateConfig(email, updatedBy = null, session = null) {
    const options = { new: true, upsert: true, setDefaultsOnInsert: true };
    if (session) options.session = session;

    const normalizedEmail = (email || '').trim().toLowerCase();

    return await IssueReportConfig.findOneAndUpdate(
      { key: 'PLATFORM_ADMIN_REPORT_EMAIL' },
      {
        $set: {
          platformAdminEmail: normalizedEmail,
          updatedBy: updatedBy || null,
        },
      },
      options
    ).exec();
  }
}

export const issueReportConfigRepository = new IssueReportConfigRepository();
export default issueReportConfigRepository;
