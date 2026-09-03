import mongoose from 'mongoose';
import assessmentRepository from './assessment.repository.js';
import villaService from '../villa/villa.services.js';
import userService from '../user/user.services.js';
import roleService from '../role/role.services.js';
import invoiceService from '../invoice/invoice.services.js';
import Assessment from './assessment.model.js';
import HttpError from '../../utils/httpError.utils.js';
import logger, { loggerStorage } from '../../utils/logger.utils.js';

export class AssessmentService {
  /**
   * Fetch assessment template by ID.
   */
  async getAssessmentById(id) {
    const assessment = await assessmentRepository.findById(id);
    if (!assessment) {
      throw new HttpError(404, `Assessment template with ID ${id} not found`);
    }
    return assessment;
  }

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
        if (targetScope.type === 'SPECIFIC_UNITS') {
          if (/^[0-9a-fA-F]{24}$/.test(scopeId)) {
            await villaService.getUnitById(scopeId, orgId);
          }
        } else if (targetScope.type === 'VILLA_BLOCK') {
          // Validate block exists in community
          const matched = await villaService.getUnitsByBlockNames([scopeId], orgId);
          if (!matched || matched.length === 0) {
            logger.warn(`No active units found for block '${scopeId}' in community ${orgId}`);
          }
        } else if (targetScope.type === 'UNIT_TYPE') {
          const matched = await villaService.getUnitsByTypes([scopeId], orgId);
          if (!matched || matched.length === 0) {
            logger.warn(`No active units found for type '${scopeId}' in community ${orgId}`);
          }
        } else if (targetScope.type === 'SPECIFIC_USERS') {
          if (/^[0-9a-fA-F]{24}$/.test(scopeId)) {
            const user = await userService.getUserById(scopeId).catch(() => null);
            if (!user) {
              throw new HttpError(400, `Selected resident user '${scopeId}' was not found. Please select valid residents.`);
            }
          }
        }
      }
    }

    // Validate targetRoleIds if provided (multi-role capability)
    if (targetScope.targetRoleIds && targetScope.targetRoleIds.length > 0) {
      for (const roleId of targetScope.targetRoleIds) {
        if (/^[0-9a-fA-F]{24}$/.test(roleId)) {
          await roleService.getRoleById(roleId);
        }
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

    // Check if there are active invoices for this assessment via invoiceService
    const hasActiveInvoices = await invoiceService.checkActiveInvoicesForAssessment(id);

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

    // Check if any invoices are associated with this template via invoiceService
    const hasInvoices = await invoiceService.checkInvoicesExistForAssessment(id);

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

  /**
   * Daily scheduler executor for weekly assessments matching current day of week (0-6).
   */
  async executeScheduledWeeklyAssessments(dayOfWeek) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info('executeScheduledWeeklyAssessments called', { dayOfWeek, correlationId });

    const assessments = await assessmentRepository.findActiveByWeeklyDay(dayOfWeek);
    logger.info(`Found ${assessments.length} active weekly assessments for day-of-week: ${dayOfWeek}`);

    let generatedCount = 0;
    let failedCount = 0;

    for (const assessment of assessments) {
      try {
        await invoiceService.generateBatchInvoices(assessment);
        generatedCount++;
      } catch (err) {
        logger.error(`Failed to execute weekly auto-billing for assessment: ${assessment._id}. Error: ${err.message}`, {
          assessmentId: assessment._id,
          correlationId,
        });
        failedCount++;
      }
    }

    return {
      dayOfWeek,
      totalMatched: assessments.length,
      generatedCount,
      failedCount,
    };
  }

  /**
   * Manually trigger billing run for assessment template.
   */
  async runBilling(id, orgId) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info('runBilling manually triggered', { id, orgId, correlationId });

    const assessment = await assessmentRepository.findById(id);
    if (!assessment) {
      throw new HttpError(404, `Assessment template with ID ${id} not found`);
    }

    if (String(assessment.communityId) !== String(orgId)) {
      throw new HttpError(403, 'Forbidden: Assessment template belongs to another organization');
    }

    const stats = await invoiceService.generateBatchInvoices(assessment);

    logger.info('Manual billing run completed stats:', { id, stats, correlationId });
    return stats;
  }
}

export default new AssessmentService();
