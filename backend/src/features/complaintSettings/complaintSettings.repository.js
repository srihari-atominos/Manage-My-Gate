import ComplaintSettings from './complaintSettings.model.js';
import HttpError from '../../utils/httpError.utils.js';

class ComplaintSettingsRepository {
  async getSettings(orgId) {
    let settings = await ComplaintSettings.findOne({ orgId });
    if (!settings) {
      // Create default settings if none exist
      settings = await ComplaintSettings.create({ orgId });
    }
    return settings;
  }

  async updateSettings(orgId, updateData) {
    const settings = await ComplaintSettings.findOneAndUpdate(
      { orgId },
      { $set: updateData },
      { returnDocument: 'after', runValidators: true, upsert: true }
    );
    return settings;
  }
}

export default new ComplaintSettingsRepository();
