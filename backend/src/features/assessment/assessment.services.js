import mongoose from 'mongoose';
import assessmentRepository from './assessment.repository.js';
import villaService from '../villa/villa.services.js';
import userService from '../user/user.services.js';
import roleService from '../role/role.services.js';
import invoiceService from '../invoice/invoice.services.js';
import Assessment from './assessment.model.js';
import Invoice from '../invoice/invoice.model.js';
import HttpError from '../../utils/httpError.utils.js';
import logger, { loggerStorage } from '../../utils/logger.utils.js';

export class AssessmentService {
  /**
   * Validate scope IDs depending on targetScope.type and targetRoleIds depending on role exists.
   */
  async validateAssessmentScope(data) {
    const orgId = data.communityId;
    const { targetScope } = data;

    if (!targetScope) return;

    // Validate scopeIds based on scope type
    if (targetScope.scopeIds && targetScope.scopeIds.length > 0) {
      for (const scopeId of targetScope.scopeIds) {
        if (targetScope.type === 'VILLA_BLOCK' || targetScope.type === 'SPECIFIC_UNITS') {
          // validate unit/villa existence
          await villaService.getUnitById(scopeId, orgId);
        } else if (targetScope.type === 'SPECIFIC_USERS') {
          // validate user existence
          await userService.getUserById(scopeId);
        }
      }
    }

    // Validate targetRoleIds if provided (multi-role capability)
    if (targetScope.targetRoleIds && targetScope.targetRoleIds.length > 0) {
      for (const roleId of targetScope.targetRoleIds) {
        await roleService.getRoleById(roleId);
      }
    }
  }

  /**
   * Create a new assessment template.
   */
  async createAssessment(data) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info('createAssessment service called', { data, correlationId });

    if (!data.communityId) {
      throw new HttpError(400, 'Community ID (communityId) is required');
    }

    // Cross-service validation
    await this.validateAssessmentScope(data);

    return await assessmentRepository.create(data);
  }

  /**
   * Update assessment template rules.
   */
  async updateAssessment(id, updateData) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info('updateAssessment service called', { id, updateData, correlationId });

    const existing = await assessmentRepository.findById(id);
    if (!existing) {
      throw new HttpError(404, `Assessment with ID ${id} not found`);
    }

    // If changing communityId or scope, validate scope
    const mergedData = { ...existing.toObject(), ...updateData };
    await this.validateAssessmentScope(mergedData);

    const updatedAssessment = await assessmentRepository.updateTemplate(id, updateData);

    // Check if there are active invoices for this assessment
    const hasActiveInvoices = await Invoice.exists({
      assessmentId: id,
      status: { $in: ['UNPAID', 'VERIFICATION_PENDING'] },
    }) !== null;

    return {
      updatedAssessment,
      hasActiveInvoices,
    };
  }

  /**
   * Fetch paginated/filtered assessments.
   */
  async getAssessments(query) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info('getAssessments service called', { query, correlationId });

    const { page = 1, limit = 10, communityId, type, isActive } = query;
    const filter = {};

    if (communityId) filter.communityId = new mongoose.Types.ObjectId(communityId);
    if (type) filter.type = type;

    // Default to active-only templates if isActive query parameter is not provided
    const activeFilterVal = isActive !== undefined ? isActive : 'true';
    if (activeFilterVal !== 'all') {
      filter.isActive = activeFilterVal === 'true';
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const result = await Assessment.aggregate([
      { $match: filter },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: take }],
          metadata: [{ $count: 'totalRecords' }],
        },
      },
    ]);

    const data = result[0]?.data || [];
    const totalRecords = result[0]?.metadata[0]?.totalRecords || 0;
    const totalPages = Math.ceil(totalRecords / take);

    return {
      data,
      pagination: {
        totalRecords,
        currentPage: parseInt(page, 10),
        totalPages: totalPages || 1,
        limit: take,
      },
    };
  }

  /**
   * Delete or archive assessment template safely.
   */
  async deleteAssessment(id) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info('deleteAssessment service called', { id, correlationId });

    const existing = await assessmentRepository.findById(id);
    if (!existing) {
      throw new HttpError(404, `Assessment template with ID ${id} not found`);
    }

    // Check if any invoices are associated with this template
    const hasInvoices = await Invoice.exists({ assessmentId: id }) !== null;

    if (hasInvoices) {
      // Soft delete: set isActive to false
      await assessmentRepository.updateTemplate(id, { isActive: false });
      return {
        status: 'archived',
        message: 'Assessment template archived successfully. Active invoice histories have been preserved.',
      };
    } else {
      // Hard delete: remove physically
      await assessmentRepository.delete(id);
      return {
        status: 'deleted',
        message: 'Assessment template deleted successfully.',
      };
    }
  }

  /**
   * Daily scheduler executor to search and execute assessments matching current day or last day of month.
   */
  async executeScheduledAssessments(dayIndicator) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info('executeScheduledAssessments called', { dayIndicator, correlationId });

    const assessments = await assessmentRepository.findActiveByGenerationDay(dayIndicator);
    logger.info(`Found ${assessments.length} active assessments for day: ${dayIndicator}`);

    let generatedCount = 0;
    let failedCount = 0;

    for (const assessment of assessments) {
      try {
        await invoiceService.generateBatchInvoices(assessment);
        generatedCount++;
      } catch (err) {
        logger.error(`Failed to execute auto-billing for assessment: ${assessment._id}. Error: ${err.message}`, {
          assessmentId: assessment._id,
          correlationId,
        });
        failedCount++;
      }
    }

    return {
      dayIndicator,
      totalMatched: assessments.length,
      generatedCount,
      failedCount,
    };
  }
}

export default new AssessmentService();
