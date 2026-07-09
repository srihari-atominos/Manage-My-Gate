import complaintSettingsRepository from './complaintSettings.repository.js';
import HttpError from '../../utils/httpError.utils.js';
import { EventEmitter } from 'events';

// Internal event bus for decoupled operations
export const complaintSettingsEvents = new EventEmitter();

class ComplaintSettingsService {
  async getSettings(orgId) {
    if (!orgId) throw new HttpError(400, 'Organization ID is required');
    const settings = await complaintSettingsRepository.getSettings(orgId);
    return settings;
  }

  async updateSettings(orgId, updateData) {
    if (!orgId) throw new HttpError(400, 'Organization ID is required');
    const updatedSettings = await complaintSettingsRepository.updateSettings(orgId, updateData);
    
    // Broadcast event on successful update
    complaintSettingsEvents.emit('settings.updated', { orgId, settings: updatedSettings });
    
    return updatedSettings;
  }
}

export default new ComplaintSettingsService();
