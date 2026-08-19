import crmTaskRepository from './crmTask.repository.js';
import crmTaskEvents from './crmTask.events.js';
import crmInquiryService from '../crmInquiry/crmInquiry.service.js';
import HttpError from '../../utils/httpError.utils.js';

export class CrmTaskService {
  /**
   * Create a new CRM Task.
   * @param {Object} payload
   */
  async createTask(payload) {
    if (payload.relatedInquiryId) {
      // Cross-feature service call to validate related CRM Inquiry
      await crmInquiryService.getInquiryById(payload.relatedInquiryId);
    }

    const newTask = await crmTaskRepository.create(payload);

    if (payload.relatedInquiryId) {
      try {
        const inquiry = await crmInquiryService.getInquiryById(payload.relatedInquiryId);
        await crmInquiryService.appendTimelineEvent(inquiry._id, {
          eventType: 'TASK_ASSIGNED',
          actorId: payload.assignedToId || null,
          actorName: 'System',
          metadata: { taskId: newTask._id, title: newTask.title, priority: newTask.priority, dueDate: newTask.dueDate },
        });
      } catch (inquiryErr) {
        // Do not fail task creation if timeline append fails
      }
    }

    // Emit domain event
    crmTaskEvents.emit('taskCreated', newTask);

    return newTask;
  }

  /**
   * Get paginated list of CRM tasks.
   * @param {Object} queryParams
   */
  async getTasks(queryParams) {
    return await crmTaskRepository.getTasksPaginated(queryParams);
  }

  /**
   * Get a single CRM task by ID.
   * @param {string} id
   */
  async getTaskById(id) {
    const task = await crmTaskRepository.findById(id);
    if (!task) {
      throw new HttpError(404, 'CRM Task not found');
    }
    return task;
  }

  /**
   * Update an existing CRM task.
   * @param {string} id
   * @param {Object} updatePayload
   */
  async updateTask(id, updatePayload) {
    const existing = await crmTaskRepository.findById(id);
    if (!existing) {
      throw new HttpError(404, 'CRM Task not found');
    }

    if (updatePayload.relatedInquiryId && updatePayload.relatedInquiryId !== String(existing.relatedInquiryId?._id || existing.relatedInquiryId)) {
      // Cross-feature service call to validate new related CRM Inquiry
      await crmInquiryService.getInquiryById(updatePayload.relatedInquiryId);
    }

    const updatedTask = await crmTaskRepository.updateById(id, updatePayload);

    // Emit domain event
    crmTaskEvents.emit('taskUpdated', updatedTask);

    return updatedTask;
  }

  /**
   * Delete a CRM task.
   * @param {string} id
   */
  async deleteTask(id) {
    const existing = await crmTaskRepository.findById(id);
    if (!existing) {
      throw new HttpError(404, 'CRM Task not found');
    }

    const deletedTask = await crmTaskRepository.deleteById(id);

    // Emit domain event
    crmTaskEvents.emit('taskDeleted', id);

    return deletedTask;
  }
}

export default new CrmTaskService();
