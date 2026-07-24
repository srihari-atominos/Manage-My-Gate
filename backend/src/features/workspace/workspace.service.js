import workspaceRepository from './workspace.repository.js';
import workspaceEvents from './workspace.events.js';
import HttpError from '../../utils/httpError.utils.js';
import Organization from '../organization/organization.model.js';
import User from '../user/user.model.js';
import mongoose from 'mongoose';
import Workspace from './workspace.model.js';

export const DEFAULT_MODULES = [
  { moduleName: 'Visitor Management', moduleKey: 'visitor', route: '/visitor-management', icon: 'QrCode', displayOrder: 1, enabled: true, sidebarVisible: true },
  { moduleName: 'Villa Management', moduleKey: 'villas', route: '/villas', icon: 'Home', displayOrder: 2, enabled: true, sidebarVisible: true },
  { moduleName: 'User Management', moduleKey: 'users', route: '/users', icon: 'People', displayOrder: 3, enabled: true, sidebarVisible: true },
  { moduleName: 'Role Builder', moduleKey: 'roles', route: '/role-builder', icon: 'LockLocked', displayOrder: 4, enabled: true, sidebarVisible: true },
  { moduleName: 'Integration Hub', moduleKey: 'integrations', route: '/integrations', icon: 'Apps', displayOrder: 5, enabled: true, sidebarVisible: true },
  { moduleName: 'Amenities & Bookings', moduleKey: 'amenities', route: '/amenities', icon: 'Building', displayOrder: 6, enabled: true, sidebarVisible: true },
  { moduleName: 'Notice Board', moduleKey: 'notices', route: '/notices', icon: 'List', displayOrder: 7, enabled: true, sidebarVisible: true },
  { moduleName: 'Complaints / Maintenance', moduleKey: 'complaints', route: '/complaints', icon: 'Warning', displayOrder: 8, enabled: true, sidebarVisible: true },
  { moduleName: 'Billing & Invoices', moduleKey: 'billing', route: '/billing', icon: 'Speedometer', displayOrder: 9, enabled: true, sidebarVisible: true }
];

export class WorkspaceService {
  async createWorkspace(workspaceData, actorId, session = null) {
    const { workspaceName, organizationId } = workspaceData;

    // Check organization exists
    const org = await Organization.findById(organizationId).session(session);
    if (!org) {
      throw new HttpError(404, 'Organization not found.');
    }

    // Check name uniqueness in organization
    const existing = await workspaceRepository.findOne({ workspaceName, organizationId }, session);
    if (existing) {
      throw new HttpError(409, 'Workspace already exists.');
    }

    // Assign default modules and metadata
    const workspacePayload = {
      ...workspaceData,
      createdBy: actorId,
      modules: DEFAULT_MODULES,
      activityLogs: [
        {
          action: 'Workspace Created',
          performedBy: actorId,
          details: `Workspace "${workspaceName}" created and seeded with default modules.`,
        }
      ]
    };

    const workspace = await workspaceRepository.create(workspacePayload, session);

    workspaceEvents.emit('WORKSPACE_CREATED', {
      actorId,
      targetId: workspace._id,
      workspaceName,
    });

    return workspace;
  }

  async getWorkspaceById(id, orgId = null, isPlatform = false, session = null) {
    const workspace = await workspaceRepository.findById(id, session);
    if (!workspace) {
      throw new HttpError(404, `Workspace with ID ${id} not found.`);
    }

    // Tenant check
    if (!isPlatform && orgId && (!workspace.organizationId || workspace.organizationId.toString() !== orgId.toString())) {
      throw new HttpError(403, 'Forbidden. You do not have access to this workspace.');
    }

    return workspace;
  }

  async getWorkspaces(orgId = null, isPlatform = false, session = null) {
    const query = !isPlatform && orgId ? { organizationId: orgId } : {};
    return await workspaceRepository.find(query, session);
  }

  async updateWorkspace(id, updateData, orgId = null, isPlatform = false, actorId, session = null) {
    const workspace = await this.getWorkspaceById(id, orgId, isPlatform, session);

    if (updateData.workspaceName && updateData.workspaceName !== workspace.workspaceName) {
      // Check name uniqueness
      const existing = await workspaceRepository.findOne({
        workspaceName: updateData.workspaceName,
        organizationId: workspace.organizationId
      }, session);
      if (existing) {
        throw new HttpError(409, 'Workspace already exists.');
      }
    }

    const payload = {
      ...updateData,
      updatedBy: actorId,
    };

    const updated = await workspaceRepository.update(id, payload, session);

    await workspaceRepository.addActivityLog(id, {
      action: 'Workspace Updated',
      performedBy: actorId,
      details: 'Workspace general details updated.',
    }, session);

    workspaceEvents.emit('WORKSPACE_UPDATED', {
      actorId,
      targetId: id,
      updateData,
    });

    return updated;
  }

  async deleteWorkspace(id, orgId = null, isPlatform = false, actorId, session = null) {
    const workspace = await this.getWorkspaceById(id, orgId, isPlatform, session);

    await workspaceRepository.delete(id, session);

    workspaceEvents.emit('WORKSPACE_DELETED', {
      actorId,
      targetId: id,
      workspaceName: workspace.workspaceName,
    });

    return { message: 'Workspace deleted successfully.' };
  }

  // --- Modules Management ---

  async getWorkspaceModules(workspaceId, orgId = null, isPlatform = false, session = null) {
    const workspace = await this.getWorkspaceById(workspaceId, orgId, isPlatform, session);
    return workspace.modules || [];
  }

  async addModule(workspaceId, orgId = null, isPlatform = false, moduleData, actorId, session = null) {
    const workspace = await this.getWorkspaceById(workspaceId, orgId, isPlatform, session);

    // Prevent duplicates on moduleKey or route or icon
    const keyDup = workspace.modules.find(m => m.moduleKey === moduleData.moduleKey);
    if (keyDup) throw new HttpError(400, 'A module with this key already exists in the workspace.');

    const routeDup = workspace.modules.find(m => m.route === moduleData.route);
    if (routeDup) throw new HttpError(400, 'A module with this route already exists in the workspace.');

    const updated = await workspaceRepository.addModule(workspaceId, moduleData, session);

    await workspaceRepository.addActivityLog(workspaceId, {
      action: 'Module Added',
      performedBy: actorId,
      details: `Module "${moduleData.moduleName}" added.`,
    }, session);

    workspaceEvents.emit('MODULE_ADDED', {
      actorId,
      targetId: workspaceId,
      moduleKey: moduleData.moduleKey,
    });

    return updated.modules;
  }

  async updateModule(workspaceId, orgId = null, isPlatform = false, moduleId, moduleData, actorId, session = null) {
    const workspace = await this.getWorkspaceById(workspaceId, orgId, isPlatform, session);

    const targetModule = workspace.modules.id(moduleId);
    if (!targetModule) throw new HttpError(404, 'Module not found.');

    // Prevent duplicates
    if (moduleData.moduleKey && moduleData.moduleKey !== targetModule.moduleKey) {
      if (workspace.modules.find(m => m.moduleKey === moduleData.moduleKey)) {
        throw new HttpError(400, 'A module with this key already exists.');
      }
    }
    if (moduleData.route && moduleData.route !== targetModule.route) {
      if (workspace.modules.find(m => m.route === moduleData.route)) {
        throw new HttpError(400, 'A module with this route already exists.');
      }
    }

    const updated = await workspaceRepository.updateModule(workspaceId, moduleId, moduleData, session);

    await workspaceRepository.addActivityLog(workspaceId, {
      action: 'Module Updated',
      performedBy: actorId,
      details: `Module "${targetModule.moduleName}" updated.`,
    }, session);

    workspaceEvents.emit('MODULE_UPDATED', {
      actorId,
      targetId: workspaceId,
      moduleKey: targetModule.moduleKey,
    });

    return updated.modules;
  }

  async toggleModule(workspaceId, orgId = null, isPlatform = false, moduleId, enabled, actorId, session = null) {
    const workspace = await this.getWorkspaceById(workspaceId, orgId, isPlatform, session);
    const targetModule = workspace.modules.id(moduleId);
    if (!targetModule) throw new HttpError(404, 'Module not found.');

    const updated = await workspaceRepository.updateModule(workspaceId, moduleId, { enabled }, session);

    const actionText = enabled ? 'Module Enabled' : 'Module Disabled';
    await workspaceRepository.addActivityLog(workspaceId, {
      action: actionText,
      performedBy: actorId,
      details: `Module "${targetModule.moduleName}" status toggled to ${enabled}.`,
    }, session);

    workspaceEvents.emit(enabled ? 'MODULE_ENABLED' : 'MODULE_DISABLED', {
      actorId,
      targetId: workspaceId,
      moduleKey: targetModule.moduleKey,
    });

    return updated.modules;
  }

  async reorderModules(workspaceId, orgId = null, isPlatform = false, orders, actorId, session = null) {
    // orders = [{ moduleId: '...', displayOrder: 1 }]
    const workspace = await this.getWorkspaceById(workspaceId, orgId, isPlatform, session);

    const modulesList = workspace.modules.toObject();
    orders.forEach(ord => {
      const target = modulesList.find(m => m._id.toString() === ord.moduleId);
      if (target) {
        target.displayOrder = ord.displayOrder;
      }
    });

    // Sort by displayOrder
    modulesList.sort((a, b) => a.displayOrder - b.displayOrder);

    const updated = await workspaceRepository.reorderModules(workspaceId, modulesList, session);

    await workspaceRepository.addActivityLog(workspaceId, {
      action: 'Module Reordered',
      performedBy: actorId,
      details: 'Workspace modules order updated.',
    }, session);

    workspaceEvents.emit('MODULES_REORDERED', {
      actorId,
      targetId: workspaceId,
    });

    return updated.modules;
  }

  async deleteModule(workspaceId, orgId = null, isPlatform = false, moduleId, actorId, session = null) {
    const workspace = await this.getWorkspaceById(workspaceId, orgId, isPlatform, session);
    const targetModule = workspace.modules.id(moduleId);
    if (!targetModule) throw new HttpError(404, 'Module not found.');

    const updated = await workspaceRepository.deleteModule(workspaceId, moduleId, session);

    await workspaceRepository.addActivityLog(workspaceId, {
      action: 'Module Deleted',
      performedBy: actorId,
      details: `Module "${targetModule.moduleName}" deleted.`,
    }, session);

    workspaceEvents.emit('MODULE_DELETED', {
      actorId,
      targetId: workspaceId,
      moduleKey: targetModule.moduleKey,
    });

    return updated.modules;
  }


  // --- Current Workspace bootstrap (self-healing) ---

  async getCurrentWorkspaceModules(orgId, actorId, session = null) {
    if (!orgId) return [];

    let workspace = await workspaceRepository.findOne({ organizationId: orgId }, session);
    if (!workspace) {
      // Self-healing bootstrap: Get organization name and create workspace
      const org = await Organization.findById(orgId).session(session);
      const name = org ? org.name : 'Default Workspace';
      
      workspace = await this.createWorkspace({
        workspaceName: `${name} Workspace`,
        description: 'Auto-bootstrapped workspace context.',
        organizationId: orgId,
        status: 'Active',
      }, actorId, session);
    }

    // Filter enabled modules
    const enabledModules = (workspace.modules || [])
      .filter(m => m.enabled)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    return enabledModules;
  }
}

export default new WorkspaceService();
