import invoiceService from './invoice.services.js';

export class InvoiceController {
  /**
   * Fetch personal outstanding dues and compliance info for a user.
   */
  async getMyDues(req, res, next) {
    try {
      // req.user contains the authenticated user context
      const data = await invoiceService.getUserDuesOverview(req.user);
      res.success(data, 'Outstanding dues retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Manually trigger billing generation for ad-hoc / missed cycles.
   */
  async triggerManual(req, res, next) {
    try {
      const data = await invoiceService.triggerManualBilling(req.body);
      res.success(data, 'Manual billing cycle generated successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resend WhatsApp links for existing unpaid invoices of an assessment.
   */
  async triggerWhatsApp(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const { assessmentId, billingPeriodString } = req.body;
      const data = await invoiceService.resendWhatsAppLinks(assessmentId, billingPeriodString, orgId);
      res.success(data, 'WhatsApp links resent successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark invoice as verification pending with offline payment cheque/NEFT ref.
   */
  async settleOffline(req, res, next) {
    try {
      const { id } = req.params;
      const { offlineReference, amount, offlineAmount } = req.body;
      const amountToUse = offlineAmount !== undefined ? offlineAmount : amount;
      const data = await invoiceService.logOfflinePayment(id, offlineReference, amountToUse);
      res.success(data, 'Offline payment recorded and pending clearance verification');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Approve a pending invoice offline payment.
   */
  async approvePayment(req, res, next) {
    try {
      const { id } = req.params;
      const adminUserId = req.user?.id || req.user?._id;
      const data = await invoiceService.approveOfflinePayment(id, adminUserId);
      res.success(data, 'Offline payment cleared and verified successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Fetch aggregated community billing dashboard metrics.
   */
  async getDashboardKPIs(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const data = await invoiceService.getDashboardKPIs(orgId);
      res.success(data, 'Dashboard billing KPIs retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Fetch all invoices for a community (filtered & paginated).
   */
  async getAllInvoices(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const data = await invoiceService.getInvoices(orgId, req.query);
      res.success(data, 'Community invoices retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
  /**
   * Handle Razorpay Webhooks
   */
  async handleRazorpayWebhook(req, res, next) {
    try {
      const signature = req.headers['x-razorpay-signature'];
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

      if (!signature || !secret) {
        return res.status(400).json({ error: 'Missing signature or secret' });
      }

      const expectedSignature = import('crypto').then(crypto => 
        crypto.createHmac('sha256', secret)
          .update(JSON.stringify(req.body))
          .digest('hex')
      );
      
      const crypto = await import('crypto');
      const expected = crypto.createHmac('sha256', secret).update(JSON.stringify(req.body)).digest('hex');

      if (expected !== signature) {
        return res.status(400).json({ error: 'Invalid signature' });
      }

      if (req.body.event === 'payment_link.paid') {
        const reference_id = req.body.payload.payment_link.entity.reference_id;
        const payment_id = req.body.payload.payment?.entity?.id || req.body.payload.payment_link?.entity?.payment_id;
        
        // Razorpay amounts are in paise (cents), divide by 100
        const amount_paid_paise = req.body.payload.payment?.entity?.amount || req.body.payload.payment_link?.entity?.amount_paid || 0;
        const amount_paid = amount_paid_paise / 100;
        
        await invoiceService.settleInvoiceFromWebhook(reference_id, {
          paymentId: payment_id,
          method: 'RAZORPAY',
          amount: amount_paid
        });
      }

      res.status(200).json({ status: 'ok' });
    } catch (error) {
      next(error);
    }
  }

  // --- Phase 1.5 Enterprise Route Stubs ---
  
  async downloadInvoicePdf(req, res, next) {
    try {
      // Stub: Generate and return PDF buffer
      res.status(501).json({ message: 'Invoice PDF generation not yet implemented in this phase' });
    } catch (error) {
      next(error);
    }
  }

  async getInvoiceTimeline(req, res, next) {
    try {
      const invoiceId = req.params.id;
      // Stub: Return auditHistory and payment ledgers
      res.status(501).json({ message: 'Timeline retrieval not yet implemented in this phase' });
    } catch (error) {
      next(error);
    }
  }

  async regeneratePaymentLink(req, res, next) {
    try {
      const invoiceId = req.params.id;
      // Stub: Expire old link, generate new, update invoice, dispatch event
      res.status(501).json({ message: 'Payment link regeneration not yet implemented in this phase' });
    } catch (error) {
      next(error);
    }
  }

}

export default new InvoiceController();
