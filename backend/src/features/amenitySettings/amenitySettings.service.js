import amenitySettingsRepository from './amenitySettings.repository.js';
import mongoose from 'mongoose';

class AmenitySettingsService {
  async getSettings(orgId) {
    return await amenitySettingsRepository.getSettings(orgId);
  }

  async updateSettings(orgId, data) {
    const session = await mongoose.startSession();
    let result;
    try {
      session.startTransaction();
      
      // Update settings
      result = await amenitySettingsRepository.updateSettings(orgId, data, session);

      // In a real app we might also emit an event for audit logging here
      
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
    
    return result;
  }
}

export default new AmenitySettingsService();
