import workspaceService from './workspace.service.js';

export class WorkspaceController {
  async create(req, res, next) {
    try {
      const actorId = req.user.id || req.user._id;
      const orgId = req.user.orgId;
      const payload = {
        ...req.body,
        organizationId: req.body.organizationId || orgId,
      };
      const data = await workspaceService.createWorkspace(payload, actorId);
      res.success(data, 'Workspace created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const orgId = req.user.orgId;
      const isPlatform = req.user.role === 'Platform Super Admin' || req.user.isPlatform === true;
      const data = await workspaceService.getWorkspaces(orgId, isPlatform);
      res.success(data, 'Workspaces retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const orgId = req.user.orgId;
      const isPlatform = req.user.role === 'Platform Super Admin' || req.user.isPlatform === true;
      const data = await workspaceService.getWorkspaceById(id, orgId, isPlatform);
      res.success(data, 'Workspace retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const actorId = req.user.id || req.user._id;
      const orgId = req.user.orgId;
      const isPlatform = req.user.role === 'Platform Super Admin' || req.user.isPlatform === true;
      const data = await workspaceService.updateWorkspace(id, req.body, orgId, isPlatform, actorId);
      res.success(data, 'Workspace updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const actorId = req.user.id || req.user._id;
      const orgId = req.user.orgId;
      const isPlatform = req.user.role === 'Platform Super Admin' || req.user.isPlatform === true;
      const data = await workspaceService.deleteWorkspace(id, orgId, isPlatform, actorId);
      res.success(data, 'Workspace deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  // --- Modules ---

  async getModules(req, res, next) {
    try {
      const { workspaceId } = req.params;
      const orgId = req.user.orgId;
      const isPlatform = req.user.role === 'Platform Super Admin' || req.user.isPlatform === true;
      const data = await workspaceService.getWorkspaceModules(workspaceId, orgId, isPlatform);
      res.success(data, 'Modules retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async addModule(req, res, next) {
    try {
      const { workspaceId } = req.params;
      const actorId = req.user.id || req.user._id;
      const orgId = req.user.orgId;
      const isPlatform = req.user.role === 'Platform Super Admin' || req.user.isPlatform === true;
      const data = await workspaceService.addModule(workspaceId, orgId, isPlatform, req.body, actorId);
      res.success(data, 'Module added successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateModule(req, res, next) {
    try {
      const { workspaceId, moduleId } = req.params;
      const actorId = req.user.id || req.user._id;
      const orgId = req.user.orgId;
      const isPlatform = req.user.role === 'Platform Super Admin' || req.user.isPlatform === true;
      const data = await workspaceService.updateModule(workspaceId, orgId, isPlatform, moduleId, req.body, actorId);
      res.success(data, 'Module updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async toggleModule(req, res, next) {
    try {
      const { workspaceId, moduleId } = req.params;
      const { enabled } = req.body;
      const actorId = req.user.id || req.user._id;
      const orgId = req.user.orgId;
      const isPlatform = req.user.role === 'Platform Super Admin' || req.user.isPlatform === true;
      const data = await workspaceService.toggleModule(workspaceId, orgId, isPlatform, moduleId, enabled, actorId);
      res.success(data, 'Module toggled successfully');
    } catch (error) {
      next(error);
    }
  }

  async reorderModules(req, res, next) {
    try {
      const { workspaceId } = req.params;
      const { orders } = req.body;
      const actorId = req.user.id || req.user._id;
      const orgId = req.user.orgId;
      const isPlatform = req.user.role === 'Platform Super Admin' || req.user.isPlatform === true;
      const data = await workspaceService.reorderModules(workspaceId, orgId, isPlatform, orders, actorId);
      res.success(data, 'Modules reordered successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteModule(req, res, next) {
    try {
      const { workspaceId, moduleId } = req.params;
      const actorId = req.user.id || req.user._id;
      const orgId = req.user.orgId;
      const isPlatform = req.user.role === 'Platform Super Admin' || req.user.isPlatform === true;
      const data = await workspaceService.deleteModule(workspaceId, orgId, isPlatform, moduleId, actorId);
      res.success(data, 'Module deleted successfully');
    } catch (error) {
      next(error);
    }
  }

<<<<<<< HEAD
  // --- Members ---

  async getMembers(req, res, next) {
    try {
      const { workspaceId } = req.params;
      const orgId = req.user.orgId;
      const isPlatform = req.user.role === 'Platform Super Admin' || req.user.isPlatform === true;
      const data = await workspaceService.getWorkspaceMembers(workspaceId, orgId, isPlatform);
      res.success(data, 'Workspace members retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async addMember(req, res, next) {
    try {
      const { workspaceId } = req.params;
      const { identifier } = req.body;
      const actorId = req.user.id || req.user._id;
      const orgId = req.user.orgId;
      const isPlatform = req.user.role === 'Platform Super Admin' || req.user.isPlatform === true;
      const data = await workspaceService.addMember(workspaceId, orgId, isPlatform, identifier, actorId);
      res.success(data, 'Member added to workspace successfully');
    } catch (error) {
      next(error);
    }
  }

  async removeMember(req, res, next) {
    try {
      const { workspaceId, userId } = req.params;
      const actorId = req.user.id || req.user._id;
      const orgId = req.user.orgId;
      const isPlatform = req.user.role === 'Platform Super Admin' || req.user.isPlatform === true;
      const data = await workspaceService.removeMember(workspaceId, orgId, isPlatform, userId, actorId);
      res.success(data, 'Member removed from workspace successfully');
    } catch (error) {
      next(error);
    }
  }


  // --- Current Sidebar Config ---

  async getCurrentModules(req, res, next) {
    try {
      const orgId = req.user.orgId;
      const actorId = req.user.id || req.user._id;
      const data = await workspaceService.getCurrentWorkspaceModules(orgId, actorId);
      res.success(data, 'Current workspace modules retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new WorkspaceController();
