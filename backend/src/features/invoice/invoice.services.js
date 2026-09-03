import mongoose from 'mongoose';
import invoiceRepository from './invoice.repository.js';
import villaService from '../villa/villa.services.js';
import userService from '../user/user.services.js';
import roleService from '../role/role.services.js';
import invoiceEventEmitter, { INVOICE_GENERATED, INVOICE_STATUS_UPDATED, SEND_WHATSAPP_LINK } from './invoice.events.js';
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

    // 2.5 Fetch Organization Billing Settings for Carry Forward isolation
    const Organization = (await import('../organization/organization.model.js')).default;
    const org = await Organization.findById(assessment.communityId).select('billingSettings').lean();
    const combineOutstanding = org?.billingSettings?.combineOutstandingInvoices || false;

    const invoicesToCreate = [];

    // Calculate billing period string (e.g. YYYY-MM, YYYY-Wxx, or YYYY-Qx)
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    
    let defaultPeriodString = assessment.billingPeriodString;
    if (!defaultPeriodString) {
      if (assessment.billingCycle === 'WEEKLY') {
        // Calculate standard ISO week string (e.g. 2026-W36)
        const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const dayNr = (target.getUTCDay() + 6) % 7;
        target.setUTCDate(target.getUTCDate() - dayNr + 3);
        const firstThursday = target.valueOf();
        target.setUTCMonth(0, 1);
        if (target.getUTCDay() !== 4) {
          target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
        }
        const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
        const weekYear = new Date(firstThursday).getUTCFullYear();
        defaultPeriodString = `${weekYear}-W${String(weekNum).padStart(2, '0')}`;
      } else {
        defaultPeriodString = `${year}-${month}`;
      }
    }

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
        const uType = (unit.type || '').toLowerCase().trim();
        if (['studio'].includes(uType)) {
          baseAmount = calc.tieredRates.studio || 0;
        } else if (['bhk1', '1bhk', '1bha', '1-bhk', '1 bhk'].includes(uType)) {
          baseAmount = calc.tieredRates.bhk1 || 0;
        } else if (['bhk2', '2bhk', '2bha', '2-bhk', '2 bhk', 'apartment'].includes(uType)) {
          baseAmount = calc.tieredRates.bhk2 || 0;
        } else if (['bhk3', '3bhk', '3bha', '3-bhk', '3 bhk'].includes(uType)) {
          baseAmount = calc.tieredRates.bhk3 || 0;
        } else if (['bhk4', '4bhk', '4bha', '4-bhk', '4 bhk', 'villa'].includes(uType)) {
          baseAmount = calc.tieredRates.bhk4 || 0;
        } else if (['penthouse'].includes(uType)) {
          baseAmount = calc.tieredRates.penthouse || 0;
        } else if (['duplex'].includes(uType)) {
          baseAmount = calc.tieredRates.duplex || 0;
        } else {
          baseAmount = calc.tieredRates.bhk2 || 0; // fallback standard
        }
      }

      baseAmount = Math.round(baseAmount * 100) / 100;
      const taxAmount = 0; // simple snapshot tax
      
      // -- NEW CARRY FORWARD LOGIC (Assessment-Specific vs Global) --
      let previousOutstanding = 0;
      const carryForwardHistory = [];
      try {
        const query = {
          targetUserId: targetUserId,
          status: { $in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'] },
          isDeleted: false,
          carryForwardEnabled: true
        };
        
        // Isolate carry forward by assessment unless combineOutstandingInvoices is true
        if (!combineOutstanding) {
          query.assessmentId = assessment._id;
        }

        const eligibleInvoices = await Invoice.find(query);
        
        for (const prevInv of eligibleInvoices) {
           previousOutstanding += prevInv.outstandingAmount;
           carryForwardHistory.push({
             invoiceId: prevInv._id,
             invoiceNumber: prevInv.invoiceNumber,
             amount: prevInv.outstandingAmount,
             billingPeriodString: prevInv.billingPeriodString,
             generatedDate: prevInv.createdAt
           });
        }
      } catch (err) {
        logger.warn(`Failed to fetch carry forward history for user ${targetUserId}`);
      }

      const totalAmount = Math.round((baseAmount + previousOutstanding + taxAmount) * 100) / 100;

      if (totalAmount <= 0) {
        logger.warn(`Skipping unit ${unit.unitNumber} - Total amount is ₹0 (Calculation type: ${calc.type}, Unit type: ${unit.type}).`);
        continue;
      }

      // Set dueDate to +10 days by default
      const dueDate = new Date();
      dueDate.setUTCDate(dueDate.getUTCDate() + 10);

      // Create snapshot object for invoice immutability
      const snapshot = {
        assessmentName: assessment.name,
        assessmentType: assessment.type,
        calculationMethod: assessment.calculationMethod,
        unitDetails: {
          unitId: unit._id,
          unitNumber: unit.unitNumber,
          type: unit.type,
          floorAreaSqFt: unit.floorAreaSqFt
        },
        residentDetails: {
          targetUserId,
          roles: targetRoleNames
        },
        billingConfiguration: org?.billingSettings || {}
      };

      invoicesToCreate.push({
        communityId: assessment.communityId,
        orgId: assessment.communityId,
        assessmentId: assessment._id,
        targetUserId,
        unitId: unit._id,
        billingPeriodString: defaultPeriodString,
        
        // Enterprise Fields
        snapshot,
        currentCharge: baseAmount,
        previousOutstanding,
        carryForwardHistory,
        subtotal: baseAmount + previousOutstanding,
        taxAmount,
        totalAmount,
        paidAmount: 0,
        outstandingAmount: totalAmount,
        dueDate,
        status: 'UNPAID',
        
        // Audit Trail Initial Event
        auditHistory: [{
          action: 'INVOICE_GENERATED',
          details: `Invoice generated via batch processor for period ${defaultPeriodString}`,
          date: new Date(),
          performedBy: null // System generated
        }],

        // Legacy fallback
        hardcodedAmount: baseAmount,
        totalDue: totalAmount
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

          // 1. Fetch targeted user
          let targetUser = null;
          try {
            targetUser = await userService.getUserById(insertedInvoice.targetUserId);
          } catch (err) {
            logger.warn(`Failed to fetch target user for invoice ${insertedInvoice._id}`);
          }

          let paymentLink = null;
          if (targetUser) {
            // 2. Generate Razorpay payment link
            paymentLink = await paymentService.createPaymentLink(insertedInvoice, targetUser);

            // 3. Save link to invoice
            if (paymentLink) {
              await Invoice.updateOne({ _id: insertedInvoice._id }, { $set: { paymentLink } });
              insertedInvoice.paymentLink = paymentLink;
            }
          }

          const invoiceObj = insertedInvoice.toObject ? insertedInvoice.toObject() : insertedInvoice;
          invoiceObj.communityId = assessment.communityId;

          // 4. Emit custom event payload
          invoiceEventEmitter.emit(INVOICE_GENERATED, {
            invoiceId: invoiceObj._id,
            amount: invoiceObj.totalAmount || invoiceObj.totalDue,
            targetPhone: targetUser?.contactSettings?.phone || targetUser?.phone || '',
            userName: targetUser?.name || targetUser?.username || 'Resident',
            paymentLink: paymentLink
          });
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

    // Persist last run metadata on the Assessment model if available
    const assessmentId = assessment._id || assessment.id;
    if (assessmentId) {
      try {
        const Assessment = (await import('../assessment/assessment.model.js')).default;
        await Assessment.findByIdAndUpdate(assessmentId, {
          $set: {
            lastRunAt: new Date(),
            lastBilledPeriod: defaultPeriodString,
            lastRunStats: {
              created,
              duplicatesSkipped,
              totalTargeted: invoicesToCreate.length,
            },
          },
        });
      } catch (err) {
        logger.warn(`Failed to update lastRun metadata for assessment ${assessmentId}: ${err.message}`);
      }
    }

    return {
      totalTargeted: invoicesToCreate.length,
      created,
      duplicatesSkipped,
      billingPeriodString: defaultPeriodString,
      lastRunAt: new Date(),
      lastBilledPeriod: defaultPeriodString,
    };
  }

  /**
   * Wrapper for manual trigger controller.
   */
  async triggerManualBilling(payload) {
    const Assessment = (await import('../assessment/assessment.model.js')).default;
    const assessment = await Assessment.findById(payload.assessmentId).lean();
    if (!assessment) throw new HttpError(404, 'Assessment template not found');

    // Merge manual override payload with template
    const mergedAssessment = { ...assessment, ...payload };
    return this.generateBatchInvoices(mergedAssessment);
  }

  /**
   * Resend WhatsApp Links for existing UNPAID invoices of a specific assessment and period.
   */
  async resendWhatsAppLinks(assessmentId, billingPeriodString, orgId) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info('resendWhatsAppLinks called', { assessmentId, billingPeriodString, correlationId });

    const invoices = await Invoice.find({
      assessmentId,
      billingPeriodString,
      orgId,
      status: 'UNPAID'
    });

    let resentCount = 0;
    for (const invoice of invoices) {
      let targetUser = null;
      try {
        targetUser = await userService.getUserById(invoice.targetUserId);
      } catch (err) {
        logger.warn(`Failed to fetch target user for invoice ${invoice._id}`);
      }

      if (targetUser) {
        let paymentLink = invoice.paymentLink;
        
        // If payment link is missing (e.g. legacy invoice), generate it now
        if (!paymentLink) {
          try {
            paymentLink = await paymentService.createPaymentLink(invoice, targetUser);
            if (paymentLink) {
              await Invoice.updateOne({ _id: invoice._id }, { $set: { paymentLink } });
              invoice.paymentLink = paymentLink;
            }
          } catch (err) {
            logger.error(`Failed to generate missing payment link for invoice ${invoice._id}`, err);
          }
        }

        if (paymentLink) {
          const targetPhone = targetUser?.contactSettings?.phone || targetUser?.phone;
          const userName = targetUser?.name || targetUser?.username || 'Resident';

          if (targetPhone) {
            invoiceEventEmitter.emit(SEND_WHATSAPP_LINK, {
              invoiceId: invoice._id,
              amount: invoice.totalDue,
              targetPhone,
              userName,
              paymentLink: invoice.paymentLink
            });
            resentCount++;
          }
        }
      }
    }

    logger.info(`Resent ${resentCount} WhatsApp links for assessment ${assessmentId}`);
    return { resentCount, totalFound: invoices.length };
  }

  /**
   * Idempotent payment webhook processor.
   */
  async processPaymentConfirmation(webhookData) {
    // legacy method preserved
  }

  /**
   * Webhook settlement logic with OCC and automated refund bugfix.
   */
  async settleInvoiceFromWebhook(invoiceId, paymentDetails) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info('settleInvoiceFromWebhook triggered', { invoiceId, paymentDetails, correlationId });

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      throw new HttpError(404, `Invoice with ID ${invoiceId} not found.`);
    }

    const Payment = (await import('../payment/payment.model.js')).default;
    
    // 1. Webhook Idempotency Lock
    if (paymentDetails.paymentId) {
      const existingPayment = await Payment.findOne({ gatewayTransactionId: paymentDetails.paymentId });
      if (existingPayment) {
        logger.info('Idempotency lock: Duplicate webhook ignored', { paymentId: paymentDetails.paymentId });
        return { success: true, message: 'Duplicate webhook skipped' };
      }
    }

    const amountPaid = paymentDetails.amount || 0;

    // 2. Overpayment Protection
    if (amountPaid > invoice.outstandingAmount) {
      logger.error('Overpayment detected, rejecting', { invoiceId, amountPaid, outstanding: invoice.outstandingAmount });
      
      // Attempt automated refund if possible
      if (paymentDetails.paymentId) {
         try {
           paymentService.processRefund(paymentDetails.paymentId).catch(err => {
             logger.error('Failed to issue gateway refund for overpayment:', { error: err.message });
           });
         } catch (err) {}
      }

      throw new HttpError(400, 'Payment amount exceeds outstanding amount. Refund initiated.');
    }

    // 3. Create definitive Payment Ledger record
    await Payment.create({
      referenceId: invoiceId,
      referenceType: 'Invoice',
      amount: amountPaid,
      status: 'success',
      gatewayTransactionId: paymentDetails.paymentId,
      paymentMethod: paymentDetails.method || 'RAZORPAY',
    });

    // 4. Calculate paidAmount = SUM(successful payments)
    const allSuccessfulPayments = await Payment.find({
      referenceId: invoiceId,
      status: 'success',
      isDeleted: false
    });
    
    const sumPaid = allSuccessfulPayments.reduce((sum, p) => sum + p.amount, 0);

    // 5. Update Invoice (Triggers Optimistic Lock Validation & Pre-Save calculations)
    invoice.paidAmount = sumPaid;
    // For backward compatibility (legacy)
    invoice.paid_at = new Date();
    invoice.paymentMethod = paymentDetails.method || 'RAZORPAY';

    await invoice.save();

    invoiceEventEmitter.emit(INVOICE_STATUS_UPDATED, invoice);

    return { success: true, invoice };
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
   * Settle payment with offline Bank Transfer.
   */
  async logOfflinePayment(invoiceId, offlineReference, amount, paymentMethod = 'BANK_TRANSFER', paymentDate = null, paymentScreenshot = null) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info('logOfflinePayment called', { invoiceId, offlineReference, amount, paymentMethod, correlationId });

    const Invoice = (await import('./invoice.model.js')).default;
    const Payment = (await import('../payment/payment.model.js')).default;

    const existingInvoice = await Invoice.findById(invoiceId);
    if (!existingInvoice) {
      throw new Error('Invoice not found');
    }

    if (existingInvoice.status === 'PAID') {
      throw new Error('Invoice is already fully settled.');
    }

    if (existingInvoice.status === 'VERIFICATION_PENDING') {
      throw new Error('An offline payment for this invoice is already pending verification.');
    }

    // Check duplicate payment reference if reference is provided
    const effectiveRef = offlineReference || `BANK-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    if (offlineReference) {
      const duplicateRef = await Payment.findOne({ paymentReference: offlineReference, status: { $ne: 'REJECTED' } });
      if (duplicateRef) {
        throw new Error('This payment reference number has already been submitted.');
      }
    }

    const updatePayload = {
      offlineReference: effectiveRef,
      paymentMethod: paymentMethod === 'NEFT' ? 'BANK_TRANSFER' : paymentMethod,
    };
    if (amount) {
      updatePayload.offlineAmount = amount;
    }
    if (paymentDate) {
      updatePayload.paymentDate = new Date(paymentDate);
    }
    if (paymentScreenshot) {
      updatePayload.paymentScreenshot = paymentScreenshot;
    }

    const updated = await invoiceRepository.updateStatusWithLock(
      invoiceId,
      'VERIFICATION_PENDING',
      updatePayload
    );

    const populated = await Invoice.findById(updated._id)
      .populate('targetUserId', 'name username email firstName lastName')
      .populate('unitId', 'unitNumber')
      .lean();

    const result = populated || (updated.toObject ? updated.toObject() : updated);

    // Create a pending Payment record
    try {
      await Payment.create({
        orgId: result.communityId || result.orgId,
        userId: (result.targetUserId && result.targetUserId._id) ? result.targetUserId._id : (result.targetUserId || result.orgId),
        invoiceId: result._id,
        residentId: (result.targetUserId && result.targetUserId._id) ? result.targetUserId._id : (result.targetUserId || result.orgId),
        villaId: (result.unitId && result.unitId._id) ? result.unitId._id : result.unitId,
        referenceId: result._id,
        referenceType: 'Invoice',
        amount: amount || result.totalAmount,
        status: 'VERIFICATION_PENDING',
        paymentCategory: 'OFFLINE',
        paymentMethod: paymentMethod === 'NEFT' ? 'BANK_TRANSFER' : paymentMethod,
        paymentReference: effectiveRef,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        proofDocument: paymentScreenshot || null,
        gateway: 'offline',
        gatewayTransactionId: effectiveRef,
      });
    } catch (err) {
      logger.error('Failed to log pending Payment record:', err);
    }

    invoiceEventEmitter.emit('OFFLINE_PAYMENT_SUBMITTED', {
      invoice: result,
      communityId: result.orgId || result.communityId,
      residentName: result.targetUserId ? `${result.targetUserId.firstName || ''} ${result.targetUserId.lastName || result.targetUserId.username || ''}`.trim() : 'Resident',
      reference: effectiveRef
    });

    return result;
  }

  /**
   * Approve/verify offline Bank Transfer payment (Admin only).
   */
  async approveOfflinePayment(invoiceId, adminUserId = null) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info('approveOfflinePayment called', { invoiceId, adminUserId, correlationId });

    const Invoice = (await import('./invoice.model.js')).default;
    const Payment = (await import('../payment/payment.model.js')).default;

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status === 'PAID') {
      throw new Error('Invoice is already marked as PAID.');
    }

    const amountToApply = invoice.offlineAmount || invoice.outstandingAmount || invoice.totalAmount;
    const offlineReference = invoice.offlineReference || `BANK-${Date.now()}`;
    const paymentMethod = invoice.paymentMethod || 'BANK_TRANSFER';
    
    const newOutstanding = Math.max(0, (invoice.outstandingAmount || invoice.totalAmount) - amountToApply);
    const finalStatus = newOutstanding > 0 ? 'PARTIALLY_PAID' : 'PAID';

    // Generate unique receipt number
    const yearStr = new Date().getFullYear();
    const randSeq = Math.floor(100000 + Math.random() * 900000);
    const receiptNumber = `BANK-${yearStr}-${randSeq}`;

    const updated = await invoiceRepository.updateStatusWithLock(
      invoiceId,
      finalStatus,
      {
        paid_at: new Date(),
        settled_at: new Date(),
        amount: amountToApply
      }
    );

    try {
      // Find existing pending payment or create new PAID payment
      let payment = await Payment.findOne({ invoiceId: invoice._id, status: 'VERIFICATION_PENDING' });
      if (payment) {
        payment.status = 'PAID';
        payment.verifiedBy = adminUserId || null;
        payment.verifiedAt = new Date();
        payment.processedBy = adminUserId || null;
        payment.receiptNumber = receiptNumber;
        await payment.save();
      } else {
        await Payment.create({
          orgId: invoice.communityId || invoice.orgId,
          userId: invoice.targetUserId,
          invoiceId: invoice._id,
          residentId: invoice.targetUserId,
          villaId: invoice.unitId,
          referenceId: invoice._id,
          referenceType: 'Invoice',
          amount: amountToApply,
          status: 'PAID',
          paymentCategory: 'OFFLINE',
          paymentMethod: paymentMethod,
          paymentReference: offlineReference,
          gatewayTransactionId: offlineReference,
          receiptNumber: receiptNumber,
          verifiedBy: adminUserId || null,
          verifiedAt: new Date(),
          processedBy: adminUserId || null,
          gateway: 'offline'
        });
      }
    } catch (err) {
      logger.error('Failed to create/update Payment record during approval:', err);
    }

    const populated = await Invoice.findById(updated._id)
      .populate('targetUserId', 'name username email firstName lastName')
      .populate('unitId', 'unitNumber')
      .lean();

    const result = populated || (updated.toObject ? updated.toObject() : updated);
    result.receiptNumber = receiptNumber;

    invoiceEventEmitter.emit(INVOICE_STATUS_UPDATED, result);

    return result;
  }

  /**
   * Reject offline Bank Transfer payment (Admin only).
   */
  async rejectOfflinePayment(invoiceId, adminUserId = null, rejectionReason = '') {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info('rejectOfflinePayment called', { invoiceId, adminUserId, rejectionReason, correlationId });

    const Invoice = (await import('./invoice.model.js')).default;
    const Payment = (await import('../payment/payment.model.js')).default;

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status !== 'VERIFICATION_PENDING') {
      throw new Error('Invoice is not in VERIFICATION_PENDING status.');
    }

    // Determine status reset (OVERDUE if past due date, else UNPAID)
    const now = new Date();
    const resetStatus = (invoice.dueDate && invoice.dueDate < now) ? 'OVERDUE' : 'UNPAID';

    invoice.status = resetStatus;
    invoice.rejectionReason = rejectionReason;
    invoice.offlineAmount = 0;
    invoice.offlineReference = null;
    await invoice.save();

    try {
      const payment = await Payment.findOne({ invoiceId: invoice._id, status: 'VERIFICATION_PENDING' });
      if (payment) {
        payment.status = 'REJECTED';
        payment.rejectionReason = rejectionReason;
        payment.verifiedBy = adminUserId || null;
        payment.verifiedAt = new Date();
        await payment.save();
      }
    } catch (err) {
      logger.error('Failed to update Payment status to REJECTED:', err);
    }

    const populated = await Invoice.findById(invoice._id)
      .populate('targetUserId', 'name username email firstName lastName')
      .populate('unitId', 'unitNumber')
      .lean();

    const result = populated || invoice.toObject();
    result.rejectionReason = rejectionReason;

    invoiceEventEmitter.emit('BANK_TRANSFER_REJECTED', result);

    return result;
  }

  /**
   * Record Cash Payment directly by Facility In-Charge / Admin.
   */
  async recordCashPayment(invoiceId, amount, facilityUserId) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info('recordCashPayment called', { invoiceId, amount, facilityUserId, correlationId });

    const Invoice = (await import('./invoice.model.js')).default;
    const Payment = (await import('../payment/payment.model.js')).default;

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status === 'PAID') {
      throw new Error('Invoice is already fully paid.');
    }

    const amountToApply = amount || invoice.outstandingAmount || invoice.totalAmount;
    if (amountToApply <= 0) {
      throw new Error('Invalid cash payment amount.');
    }

    const newOutstanding = Math.max(0, (invoice.outstandingAmount || invoice.totalAmount) - amountToApply);
    const finalStatus = newOutstanding > 0 ? 'PARTIALLY_PAID' : 'PAID';

    // Generate unique receipt number (CASH-YYYY-XXXXXX)
    const yearStr = new Date().getFullYear();
    const randSeq = Math.floor(100000 + Math.random() * 900000);
    const receiptNumber = `CASH-${yearStr}-${randSeq}`;

    // Update invoice
    invoice.status = finalStatus;
    invoice.paidAmount = (invoice.paidAmount || 0) + amountToApply;
    invoice.outstandingAmount = newOutstanding;
    invoice.paymentMethod = 'CASH';
    invoice.paid_at = new Date();
    invoice.settled_at = new Date();
    invoice.paymentCompletionDate = new Date();
    invoice.auditHistory.push({
      action: 'CASH_PAYMENT_RECORDED',
      details: `Cash payment of ₹${amountToApply} recorded. Receipt #${receiptNumber}`,
      performedBy: facilityUserId,
      source: 'ADMIN_PANEL',
      date: new Date()
    });
    await invoice.save();

    // Create canonical Payment record
    let payment;
    try {
      payment = await Payment.create({
        orgId: invoice.communityId || invoice.orgId,
        userId: invoice.targetUserId,
        invoiceId: invoice._id,
        residentId: invoice.targetUserId,
        villaId: invoice.unitId,
        referenceId: invoice._id,
        referenceType: 'Invoice',
        amount: amountToApply,
        status: 'PAID',
        paymentCategory: 'OFFLINE',
        paymentMethod: 'CASH',
        paymentDate: new Date(),
        receivedBy: facilityUserId,
        processedBy: facilityUserId,
        receiptNumber: receiptNumber,
        gateway: 'offline',
        gatewayTransactionId: receiptNumber
      });
    } catch (err) {
      logger.error('Failed to create Payment record for Cash payment:', err);
    }

    const populated = await Invoice.findById(invoice._id)
      .populate('targetUserId', 'name username email firstName lastName')
      .populate('unitId', 'unitNumber')
      .lean();

    const result = populated || invoice.toObject();
    result.receiptNumber = receiptNumber;
    result.payment = payment;

    invoiceEventEmitter.emit('CASH_PAYMENT_RECORDED', result);
    invoiceEventEmitter.emit(INVOICE_STATUS_UPDATED, result);

    return result;
  }

  /**
   * Search eligible unpaid/outstanding invoices for Cash collection universal search.
   */
  async searchCashEligible(searchQuery, orgId) {
    const Invoice = (await import('./invoice.model.js')).default;
    const Villa = (await import('../villa/villa.model.js')).default;
    const User = (await import('../user/user.model.js')).default;

    if (!searchQuery || !searchQuery.trim()) {
      return [];
    }

    const q = searchQuery.trim();
    const regex = new RegExp(q, 'i');

    // Find matching villas
    const matchingVillas = await Villa.find({
      $or: [{ unitNumber: regex }, { number: regex }, { block: regex }]
    }).select('_id');
    const villaIds = matchingVillas.map(v => v._id);

    // Find matching users
    const matchingUsers = await User.find({
      $or: [{ name: regex }, { firstName: regex }, { lastName: regex }, { username: regex }, { email: regex }, { phone: regex }, { phoneNumber: regex }]
    }).select('_id');
    const userIds = matchingUsers.map(u => u._id);

    const invoices = await Invoice.find({
      orgId: orgId,
      status: { $in: ['UNPAID', 'OVERDUE', 'PARTIALLY_PAID'] },
      $or: [
        { invoiceNumber: regex },
        { unitId: { $in: villaIds } },
        { targetUserId: { $in: userIds } }
      ]
    })
      .populate('targetUserId', 'name username email firstName lastName phone phoneNumber')
      .populate('unitId', 'unitNumber block type')
      .populate('assessmentId', 'title name')
      .lean();

    return invoices;
  }

  /**
   * Fetch cash collections history for facility staff.
   */
  async getCashCollections(facilityUserId, orgId, query = {}) {
    const Payment = (await import('../payment/payment.model.js')).default;
    
    const filter = {
      paymentMethod: 'CASH',
      status: 'PAID',
    };

    if (orgId) {
      filter.orgId = orgId;
    }

    // If specific facilityUserId provided and not requesting all
    if (facilityUserId && !query.allStaff) {
      filter.receivedBy = facilityUserId;
    }

    const payments = await Payment.find(filter)
      .populate('residentId', 'name username email firstName lastName phone')
      .populate('villaId', 'unitNumber block')
      .populate('invoiceId', 'invoiceNumber snapshot billingPeriodString')
      .populate('receivedBy', 'name username email')
      .sort({ createdAt: -1 })
      .lean();

    // Calculate today's collection summary
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let todayCount = 0;
    let todayAmount = 0;
    let totalCount = payments.length;
    let totalAmount = 0;

    for (const p of payments) {
      const amt = p.amount || 0;
      totalAmount += amt;
      const pDate = new Date(p.createdAt || p.paymentDate);
      if (pDate >= today) {
        todayCount++;
        todayAmount += amt;
      }
    }

    return {
      collections: payments,
      summary: {
        todayCashReceived: todayAmount,
        todayTransactions: todayCount,
        totalCashReceived: totalAmount,
        totalTransactions: totalCount
      }
    };
  }

  /**
   * Fetch portfolio dues and compliance info for a persona.
   */
  async getUserDuesOverview(userContext) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    const resolvedUserId = userContext.id || userContext._id;
    logger.info('getUserDuesOverview called', { userId: resolvedUserId, correlationId });

    const personalDues = await invoiceRepository.getUserPortfolioDues(resolvedUserId);
    const recentInvoices = await invoiceRepository.getUserRecentInvoices(resolvedUserId);

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
      recentInvoices,
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

  /**
   * Check if there are active invoices for an assessment template.
   */
  async checkActiveInvoicesForAssessment(assessmentId) {
    return await invoiceRepository.hasActiveInvoices(assessmentId);
  }

  /**
   * Check if any invoices exist for an assessment template.
   */
  async checkInvoicesExistForAssessment(assessmentId) {
    return await invoiceRepository.hasAnyInvoices(assessmentId);
  }

  /**
   * Fetch invoice by ID with optional transaction session.
   */
  async getInvoiceById(invoiceId, session = null) {
    const query = Invoice.findById(invoiceId);
    if (session) query.session(session);
    const invoice = await query;
    if (!invoice) {
      throw new HttpError(404, 'Invoice not found');
    }
    return invoice;
  }
}

export default new InvoiceService();
