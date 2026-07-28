import mongoose from 'mongoose';
import platformInvoiceRepository from './platformInvoice.repository.js';
import platformInvoiceEvents from './platformInvoice.events.js';
import platformOrderService from '../platformOrder/platformOrder.service.js';
import HttpError from '../../utils/httpError.utils.js';

/**
 * Generate a standard invoice number in format INV-YYYYMMDD-XXXX
 */
const generateInvoiceNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${dateStr}-${randomSuffix}`;
};

class PlatformInvoiceService {
  /**
   * Generate an invoice from a platform order.
   * MUST NOT generate the PDF synchronously. Emits 'invoice.created' event instead.
   * Accepts external session or manages internal transaction.
   * 
   * @param {Object|string} params - { orderId, gstin, hsnSacCode, isInterstate } or orderId string
   * @param {ClientSession} [externalSession=null]
   */
  async generateInvoiceFromOrder(params, externalSession = null) {
    const orderId = typeof params === 'string' ? params : params.orderId;
    const gstin = typeof params === 'object' ? params.gstin || '' : '';
    const hsnSacCode = typeof params === 'object' && params.hsnSacCode ? params.hsnSacCode : '998313';
    const isInterstate = typeof params === 'object' ? Boolean(params.isInterstate) : false;

    if (!orderId) {
      throw new HttpError(400, 'Order ID is required to generate a platform invoice.');
    }

    // 1. Cross-feature call to platformOrderService (DO NOT touch repository directly)
    const order = await platformOrderService.getOrderById(orderId);
    if (!order) {
      throw new HttpError(404, `Platform order with ID '${orderId}' not found.`);
    }

    // 2. Check if invoice already exists for this order
    const existingInvoice = await platformInvoiceRepository.findByOrderId(orderId, externalSession);
    if (existingInvoice) {
      throw new HttpError(409, `An invoice has already been generated for order ID '${orderId}'.`);
    }

    // 3. Extract subtotal, tax and calculate GST breakdown
    const orderSnapshot = order.orderSnapshot || {};
    const subtotal = Number(orderSnapshot.subtotal || order.subtotal || 0);
    const taxAmount = Number(orderSnapshot.taxAmount || order.taxAmount || 0);
    const totalAmount = Number(orderSnapshot.totalAmount || order.totalAmount || (subtotal + taxAmount));
    const currency = orderSnapshot.currency || order.currency || 'INR';

    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (isInterstate) {
      igstAmount = Number(taxAmount.toFixed(2));
    } else {
      const halfTax = Number((taxAmount / 2).toFixed(2));
      cgstAmount = halfTax;
      sgstAmount = halfTax;
    }

    const amounts = {
      subtotal: Number(subtotal.toFixed(2)),
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalAmount: Number(totalAmount.toFixed(2)),
    };

    const invoiceNumber = generateInvoiceNumber();
    const organisationId = order.organisationId?._id || order.organisationId;

    const invoicePayload = {
      invoiceNumber,
      orderId,
      organisationId,
      currency,
      hsnSacCode,
      amounts,
      gstin,
      status: 'UNPAID',
      pdfUrl: null,
    };

    // Manage session/transaction
    if (externalSession) {
      const newInvoice = await platformInvoiceRepository.create(invoicePayload, externalSession);
      platformInvoiceEvents.emit('invoice.created', newInvoice);
      return newInvoice;
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const newInvoice = await platformInvoiceRepository.create(invoicePayload, session);

      await session.commitTransaction();

      // Emit event after transaction commits (asynchronous PDF worker will pick this up)
      platformInvoiceEvents.emit('invoice.created', newInvoice);

      return newInvoice;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Update invoice status safely within a transaction.
   * @param {string} invoiceId
   * @param {string} targetStatus
   */
  async updateInvoiceStatus(invoiceId, targetStatus) {
    const validStatuses = ['DRAFT', 'UNPAID', 'PAID', 'VOID'];

    if (!validStatuses.includes(targetStatus)) {
      throw new HttpError(
        400,
        `Invalid status '${targetStatus}'. Allowed: ${validStatuses.join(', ')}`
      );
    }

    const existingInvoice = await platformInvoiceRepository.findById(invoiceId);
    if (!existingInvoice) {
      throw new HttpError(404, `Platform invoice with ID '${invoiceId}' not found.`);
    }

    const previousStatus = existingInvoice.status;

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const updatedInvoice = await platformInvoiceRepository.updateStatus(
        invoiceId,
        targetStatus,
        session
      );

      await session.commitTransaction();

      platformInvoiceEvents.emit('platform_invoice_status_updated', {
        invoice: updatedInvoice,
        previousStatus,
        newStatus: targetStatus,
      });

      return updatedInvoice;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Retrieve paginated list of platform invoices.
   * @param {Object} queryParams
   */
  async getAllInvoices(queryParams) {
    return await platformInvoiceRepository.findAllPaginated(queryParams);
  }

  /**
   * Get platform invoice by ID.
   * @param {string} invoiceId
   */
  async getInvoiceById(invoiceId) {
    const invoice = await platformInvoiceRepository.findById(invoiceId);
    if (!invoice) {
      throw new HttpError(404, `Platform invoice with ID '${invoiceId}' not found.`);
    }
    return invoice;
  }

  /**
   * Get platform invoice by invoice number.
   * @param {string} invoiceNumber
   */
  async getInvoiceByNumber(invoiceNumber) {
    const invoice = await platformInvoiceRepository.findByInvoiceNumber(invoiceNumber);
    if (!invoice) {
      throw new HttpError(404, `Platform invoice number '${invoiceNumber}' not found.`);
    }
    return invoice;
  }

  /**
   * Update invoice details within a transaction.
   * @param {string} id
   * @param {Object} updateData
   */
  async updateInvoice(id, updateData) {
    const existingInvoice = await platformInvoiceRepository.findById(id);
    if (!existingInvoice) {
      throw new HttpError(404, `Platform invoice with ID '${id}' not found.`);
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const updatedInvoice = await platformInvoiceRepository.updateById(id, updateData, session);

      await session.commitTransaction();

      return updatedInvoice;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Delete invoice within a transaction.
   * @param {string} id
   */
  async deleteInvoice(id) {
    const existingInvoice = await platformInvoiceRepository.findById(id);
    if (!existingInvoice) {
      throw new HttpError(404, `Platform invoice with ID '${id}' not found.`);
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const deletedInvoice = await platformInvoiceRepository.deleteById(id, session);

      await session.commitTransaction();

      platformInvoiceEvents.emit('platform_invoice_deleted', deletedInvoice);

      return deletedInvoice;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

export default new PlatformInvoiceService();
