import mongoose from 'mongoose';
import invoiceRepository from './invoice.repository.js';
import villaService from '../villa/villa.services.js';
import userService from '../user/user.services.js';
import roleService from '../role/role.services.js';
import invoiceEventEmitter, { INVOICE_GENERATED, INVOICE_STATUS_UPDATED } from './invoice.events.js';
import Invoice from './invoice.model.js';
import HttpError from '../../utils/httpError.utils.js';
import logger, { loggerStorage } from '../../utils/logger.utils.js';
import paymentService from '../payment/payment.service.js';

export class InvoiceService {
  /**
   * Generates batch invoices for a given assessment template.
   */
  async generateBatchInvoices(assessment) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info('generateBatchInvoices service called', { assessmentId: assessment._id, correlationId });

    // 1. Fetch targeted units (Villas) based on scope
    let units = [];
    const scopeType = assessment.targetScope?.type || 'ALL_COMMUNITY';
    const scopeIds = assessment.targetScope?.scopeIds || [];

    if (scopeType === 'ALL_COMMUNITY') {
      units = await villaService.getUnitsByOrgId(assessment.communityId);
    } else if (scopeType === 'SPECIFIC_UNITS') {
      units = await villaService.getUnitsByVillaIds(scopeIds);
    } else if (scopeType === 'SPECIFIC_USERS') {
      units = await villaService.getUnitsByResidentUserIds(scopeIds);
    } else if (scopeType === 'VILLA_BLOCK') {
      units = await villaService.getUnitsByBlockNames(scopeIds, assessment.communityId);
    } else if (scopeType === 'UNIT_TYPE') {
      units = await villaService.getUnitsByTypes(scopeIds, assessment.communityId);
    } else if (scopeIds.length > 0) {
      units = await villaService.getUnitsByVillaIds(scopeIds);
    }

    logger.info(`Found ${units.length} candidate units matching assessment scope`);

    // 2. Fetch targeted dynamic roles (to compare user's role lists)
    const targetRoles = await roleService.getRolesByIds(assessment.targetScope.targetRoleIds || []);
    const targetRoleNames = targetRoles.map((r) => r.name.toLowerCase());

    const invoicesToCreate = [];

    // Calculate billing period string (e.g. YYYY-MM based on current UTC calendar)
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const defaultPeriodString = `${year}-${month}`;

    for (const unit of units) {
      // Find tenant and owner resident assignments
      const tenantResident = (unit.residents || []).find((r) => r.residencyType === 'Tenant');
      const ownerResident = (unit.residents || []).find((r) =>
        ['Resident Owner', 'Non-Resident Owner'].includes(r.residencyType)
      ) || { userId: unit.primaryResidentId };

      let targetUserId = null;
      
      // Occupancy Fallback Logic
      const targetsTenant = targetRoleNames.some(name => name.includes('tenant'));
      if (targetsTenant && tenantResident && tenantResident.userId) {
        targetUserId = tenantResident.userId;
      } else if (ownerResident && ownerResident.userId) {
        targetUserId = ownerResident.userId;
      }

      if (!targetUserId) {
        logger.warn(`Skipping unit ${unit.unitNumber} - No target resident user found.`);
        continue;
      }

      // Calculate totalDue based on calculationMethod
      let baseAmount = 0;
      const calc = assessment.calculationMethod;
      if (calc.type === 'FLAT_RATE') {
        baseAmount = calc.flatAmount || 0;
      } else if (calc.type === 'PER_SQ_FT') {
        baseAmount = (calc.ratePerSqFt || 0) * (unit.floorAreaSqFt || 0);
      } else if (calc.type === 'TIERED_BHK') {
        const uType = (unit.type || '').toLowerCase();
        if (uType === 'studio') baseAmount = calc.tieredRates.studio || 0;
        else if (uType === 'bhk1') baseAmount = calc.tieredRates.bhk1 || 0;
        else if (uType === 'bhk2' || uType === 'apartment') baseAmount = calc.tieredRates.bhk2 || 0;
        else if (uType === 'bhk3') baseAmount = calc.tieredRates.bhk3 || 0;
        else if (uType === 'bhk4' || uType === 'villa') baseAmount = calc.tieredRates.bhk4 || 0;
        else if (uType === 'penthouse') baseAmount = calc.tieredRates.penthouse || 0;
        else if (uType === 'duplex') baseAmount = calc.tieredRates.duplex || 0;
        else baseAmount = calc.tieredRates.bhk2 || 0; // fallback standard
      }

      const taxAmount = 0; // simple snapshot tax
      const totalDue = baseAmount + taxAmount;

      if (totalDue <= 0) {
        logger.warn(`Skipping unit ${unit.unitNumber} - Total due amount is ₹0 (Calculation type: ${calc.type}, Unit type: ${unit.type}).`);
        continue;
      }

      // Set dueDate to +10 days by default
      const dueDate = new Date();
      dueDate.setUTCDate(dueDate.getUTCDate() + 10);

      invoicesToCreate.push({
        communityId: assessment.communityId,
        assessmentId: assessment._id,
        targetUserId,
        unitId: unit._id, // Villa collection maps to unitId
        billingPeriodString: defaultPeriodString,
        hardcodedAmount: baseAmount,
        taxAmount,
        totalDue,
        dueDate,
        status: 'UNPAID',
      });

    }

    let created = 0;
    let duplicatesSkipped = 0;

    // Process one-by-one to support safe duplicate skipping & precise event emission
    for (const invoiceData of invoicesToCreate) {
      try {
        const createdInvoices = await invoiceRepository.createBatch([invoiceData]);
        if (createdInvoices && createdInvoices.length > 0) {
          const insertedInvoice = createdInvoices[0];
          created++;
          const invoiceObj = insertedInvoice.toObject ? insertedInvoice.toObject() : insertedInvoice;
          // Attach communityId for organization-wide socket broadcasting
          invoiceObj.communityId = assessment.communityId;
          invoiceEventEmitter.emit(INVOICE_GENERATED, invoiceObj);
        }
      } catch (error) {
        if (error instanceof HttpError && error.statusCode === 409) {
          duplicatesSkipped++;
        } else {
          throw error;
        }
      }
    }

    logger.info(`Batch invoice generation completed. Created: ${created}, Skipped: ${duplicatesSkipped}`);

    return {
      totalTargeted: invoicesToCreate.length,
      created,
      duplicatesSkipped,
    };
  }

  /**
   * Manually trigger generateBatchInvoices for ad-hoc or missed cycles.
   */
  async triggerManualBilling(payload) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info('triggerManualBilling service called', { payload, correlationId });

    const assessment = await Assessment.findById(payload.assessmentId);
    if (!assessment) {
      throw new HttpError(404, `Assessment template not found`);
    }

    return await this.generateBatchInvoices(assessment);
  }

  /**
   * Idempotent payment webhook processor.
   */
  async processPaymentConfirmation(webhookData) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    const { invoiceId, transactionId } = webhookData;
    logger.info('processPaymentConfirmation webhook triggered', { invoiceId, transactionId, correlationId });

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      throw new HttpError(404, `Invoice with ID ${invoiceId} not found.`);
    }

    // Webhook double payment prevention
    if (invoice.status === 'PAID') {
      logger.error('CONCURRENT_PAYMENT_CONFLICT detected. Triggering automated refund.', {
        invoiceId,
        transactionId,
        correlationId,
      });

      // Asynchronously trigger refund
      paymentService.processRefund(transactionId).catch((err) => {
        logger.error('Failed to issue gateway refund on concurrent payments conflict:', {
          transactionId,
          error: err.message,
          correlationId,
        });
      });

      return {
        success: false,
        conflict: true,
        message: 'Concurrent payment conflict. Refund initiated.',
      };
    }

    // Apply update with state validation lock
    const updated = await invoiceRepository.updateStatusWithLock(invoiceId, 'PAID', {
      paid_at: new Date(),
      paymentMethod: webhookData.paymentMethod || 'UPI',
      offlineReference: webhookData.offlineReference || null,
    });

    invoiceEventEmitter.emit(INVOICE_STATUS_UPDATED, updated);

    return {
      success: true,
      invoice: updated,
    };
  }

  /**
   * Settle invoice payment transactionally with session and OCC support.
   */
  async settleInvoicePayment(invoiceId, paymentData = {}, session = null) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info('settleInvoicePayment called', { invoiceId, paymentData, correlationId });

    const updated = await invoiceRepository.updateStatusWithLock(
      invoiceId,
      'PAID',
      paymentData,
      session
    );

    invoiceEventEmitter.emit(INVOICE_STATUS_UPDATED, updated);
    return updated;
  }

  /**
   * Settle payment with offline cheque / NEFT / cash.
   */
  async logOfflinePayment(invoiceId, offlineReference) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info('logOfflinePayment called', { invoiceId, offlineReference, correlationId });

    const updated = await invoiceRepository.updateStatusWithLock(
      invoiceId,
      'VERIFICATION_PENDING',
      { offlineReference }
    );

    invoiceEventEmitter.emit(INVOICE_STATUS_UPDATED, updated);

    return updated;
  }

  /**
   * Approve/verify offline payment (Admin only).
   */
  async approveOfflinePayment(invoiceId) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info('approveOfflinePayment called', { invoiceId, correlationId });

    const updated = await invoiceRepository.updateStatusWithLock(
      invoiceId,
      'PAID',
      {
        paid_at: new Date(),
        settled_at: new Date(),
      }
    );

    invoiceEventEmitter.emit(INVOICE_STATUS_UPDATED, updated);

    return updated;
  }

  /**
   * Fetch portfolio dues and compliance info for a persona.
   */
  async getUserDuesOverview(userContext) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    const resolvedUserId = userContext.id || userContext._id;
    logger.info('getUserDuesOverview called', { userId: resolvedUserId, correlationId });

    const personalDues = await invoiceRepository.getUserPortfolioDues(resolvedUserId);

    const secondaryCompliance = [];

    // Check if user has Owner role using roleService (Dynamic role check)
    let isOwner = false;
    if (userContext.roles && userContext.roles.length > 0) {
      try {
        const roles = await roleService.getRolesByIds(userContext.roles);
        isOwner = roles.some((r) => r.name.toLowerCase().includes('owner'));
      } catch (err) {
        logger.error('Failed to resolve roles for portfolio dues check:', err);
      }
    }

    if (isOwner) {
      // Find units owned by this user
      const ownedUnits = await villaService.getUnitsByOwner(resolvedUserId);
      
      for (const unit of ownedUnits) {
        // Find if occupied by tenant
        const tenant = (unit.residents || []).find((r) => r.residencyType === 'Tenant');
        if (tenant && tenant.userId) {
          // Fetch tenant details
          let tenantUser = null;
          try {
            tenantUser = await userService.getUserById(tenant.userId);
          } catch (err) {
            logger.warn(`Tenant details not resolved for user ${tenant.userId}`);
          }

          // Fetch outstanding unpaid tenant invoices for this unit
          const tenantInvoices = await Invoice.find({
            unitId: unit._id,
            targetUserId: tenant.userId,
            status: { $in: ['UNPAID', 'VERIFICATION_PENDING'] },
          });

          for (const inv of tenantInvoices) {
            secondaryCompliance.push({
              unit: unit.unitNumber,
              tenantName: tenantUser ? (tenantUser.name || tenantUser.username) : 'Tenant',
              amountDue: inv.totalDue,
              status: inv.status,
            });
          }
        }
      }
    }

    return {
      personalDues,
      secondaryCompliance,
    };
  }

  /**
   * Fetch aggregated dashboard KPIs for a community.
   */
  async getDashboardKPIs(communityId) {
    if (!communityId) {
      throw new HttpError(400, 'Community ID (communityId) is required');
    }
    return await invoiceRepository.getDashboardKPIs(communityId);
  }

  /**
   * Fetch paginated and populated invoices for a community.
   */
  async getInvoices(orgId, query) {
    return await invoiceRepository.getInvoices(orgId, query);
  }
}

export default new InvoiceService();
