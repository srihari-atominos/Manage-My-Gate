import crmTaskService from './crmTask.service.js';

export class CrmTaskController {
  /**
   * Create a new CRM Task.
   */
  async create(req, res, next) {
    try {
      const data = await crmTaskService.createTask(req.body);
      res.success(data, 'CRM Task created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all CRM Tasks (paginated).
   */
  async getAll(req, res, next) {
    try {
      const data = await crmTaskService.getTasks(req.query);
      res.success(data, 'CRM Tasks retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single CRM Task by ID.
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const data = await crmTaskService.getTaskById(id);
      res.success(data, 'CRM Task retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a CRM Task.
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const data = await crmTaskService.updateTask(id, req.body);
      res.success(data, 'CRM Task updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a CRM Task.
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const data = await crmTaskService.deleteTask(id);
      res.success(data, 'CRM Task deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new CrmTaskController();
