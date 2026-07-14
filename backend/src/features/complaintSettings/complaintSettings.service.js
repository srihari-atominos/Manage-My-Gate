import complaintSettingsRepository from './complaintSettings.repository.js';
import HttpError from '../../utils/httpError.utils.js';
import { EventEmitter } from 'events';
import auditLogService from '../auditLog/auditLog.services.js';

// Internal event bus for decoupled operations
export const complaintSettingsEvents = new EventEmitter();

class ComplaintSettingsService {
  async getSettings(orgId) {
    if (!orgId) throw new HttpError(400, 'Organization ID is required');
    const settings = await complaintSettingsRepository.getSettings(orgId);
    return settings;
  }

  async updateSettings(orgId, updateData, user) {
    if (!orgId) throw new HttpError(400, 'Organization ID is required');
    
    // Fetch old settings for diffing
    const oldSettings = await complaintSettingsRepository.getSettings(orgId);
    const updatedSettings = await complaintSettingsRepository.updateSettings(orgId, updateData);
    
    // Perform audit diff on Categories -> Suggested Issues
    if (user && oldSettings && updatedSettings) {
      const oldCats = oldSettings.categories || [];
      const newCats = updatedSettings.categories || [];
      
      newCats.forEach(newCat => {
        const oldCat = oldCats.find(c => c.name === newCat.name);
        if (!oldCat) return; // New category logic is handled elsewhere if needed
        
        const oldIssues = oldCat.suggestedIssues || [];
        const newIssues = newCat.suggestedIssues || [];
        
        newIssues.forEach(newIssue => {
          const oldIssue = oldIssues.find(i => i.name === newIssue.name);
          
          if (!oldIssue) {
            // Added
            this.logAudit(user, orgId, `Suggested Issue Added`, { category: newCat.name, issue: newIssue.name });
          } else {
            // Edited, Disabled, Enabled, Archived, Reordered
            if (oldIssue.isActive !== newIssue.isActive) {
              const action = newIssue.isActive ? 'Enabled' : 'Disabled';
              this.logAudit(user, orgId, `Suggested Issue ${action}`, { category: newCat.name, issue: newIssue.name, previousValue: oldIssue.isActive, newValue: newIssue.isActive });
            }
            if (!oldIssue.isArchived && newIssue.isArchived) {
              this.logAudit(user, orgId, `Suggested Issue Archived`, { category: newCat.name, issue: newIssue.name });
            }
            if (oldIssue.order !== newIssue.order) {
              this.logAudit(user, orgId, `Suggested Issue Reordered`, { category: newCat.name, issue: newIssue.name, previousValue: oldIssue.order, newValue: newIssue.order });
            }
          }
        });
        
        // Deleted
        oldIssues.forEach(oldIssue => {
          const stillExists = newIssues.find(i => i.name === oldIssue.name);
          if (!stillExists) {
            this.logAudit(user, orgId, `Suggested Issue Deleted`, { category: newCat.name, issue: oldIssue.name });
          }
        });
      });
    }
    
    // Broadcast event on successful update
    complaintSettingsEvents.emit('settings.updated', { orgId, settings: updatedSettings });
    
    return updatedSettings;
  }
  
  logAudit(user, orgId, action, metadata) {
    try {
      auditLogService.logEvent({
        actorId: user.id || user._id,
        action,
        targetId: orgId,
        metadata: {
          ...metadata,
          userRole: user.roleName,
          tenant: orgId
        }
      });
    } catch (e) {
      console.error('Failed to log audit event:', e);
    }
  }
}

export default new ComplaintSettingsService();
