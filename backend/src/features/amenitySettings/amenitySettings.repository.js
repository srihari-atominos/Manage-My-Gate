import AmenitySettings from './amenitySettings.model.js';

class AmenitySettingsRepository {
  async getSettings(orgId) {
    let settings = await AmenitySettings.findOne({ orgId });
    if (!settings) {
      settings = await AmenitySettings.create({ orgId });
    }
    return settings;
  }

  async updateSettings(orgId, data, session = null) {
    const options = { returnDocument: 'after', upsert: true, runValidators: true };
    if (session) options.session = session;
    
    return await AmenitySettings.findOneAndUpdate(
      { orgId },
      { $set: data },
      options
    );
  }
}

export default new AmenitySettingsRepository();
