import crypto from 'crypto';
import mongoose from 'mongoose';
import platformOrderRepository from './platformOrder.repository.js';
import platformOrderEvents from './platformOrder.events.js';
import platformQuoteService from '../platformQuote/platformQuote.service.js';
import HttpError from '../../utils/httpError.utils.js';

export const ORDER_ALLOWED_TRANSITIONS = {
  DRAFT: ['PENDING_CUSTOMER_CONFIRMATION', 'CONFIRMED', 'CANCELLED'],
  PENDING_CUSTOMER_CONFIRMATION: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['EXPIRED', 'CANCELLED'],
  CANCELLED: [],
  EXPIRED: [],
};

export class PlatformOrderService {
  /**
   * Generate SHA-256 pricing checksum (Mandatory Correction 3).
   */
  generatePricingChecksum(pricingSnapshot, subtotal, discountAmount, vatAmount, totalAmount) {
    const rawData = JSON.stringify({
      planName: pricingSnapshot?.planName,
      basePrice: pricingSnapshot?.basePrice,
      perUnitRate: pricingSnapshot?.perUnitRate,
      subtotal: parseFloat(subtotal) || 0,
      discountAmount: parseFloat(discountAmount) || 0,
      vatAmount: parseFloat(vatAmount) || 0,
      totalAmount: parseFloat(totalAmount) || 0,
    });
    return crypto.createHash('sha256').update(rawData).digest('hex');
  }

  /**
   * Generate order number: ORD-{YEAR}-{SEQ}
   */
  generateOrderNumber() {
    const year = new Date().getFullYear();
    const seq = Math.floor(1000 + Math.random() * 9000);
    return `ORD-${year}-${seq}`;
  }

  /**
   * Atomic Transactional Quote to Order Conversion (Gap 1, 2, 3, 7).
   * @param {string} quoteId
   * @param {string} conversionId - Idempotency key
   * @param {string|null} actorId
   * @param {string} actorName
   */
  async convertQuoteToOrder(quoteId, conversionId = null, actorId = null, actorName = 'System') {
    // 1. Idempotency Check: Return existing order if conversionId matches
    if (conversionId) {
      const existingOrder = await platformOrderRepository.findByConversionId(conversionId);
      if (existingOrder) {
        return {
          order: existingOrder,
          message: 'Order already converted for this idempotency key.',
          isDuplicateRequest: true,
        };
      }
    }

    const quote = await platformQuoteService.getQuoteById(quoteId);

    // 2. Strict Order Creation Authority Checks
    if (quote.status !== 'ACCEPTED') {
      throw new HttpError(400, `Order creation requires Quote status ACCEPTED. Current status: '${quote.status}'`);
    }
    if (!quote.isLocked) {
      throw new HttpError(400, 'Quote must be locked before converting to order.');
    }
    if (!quote.isLatestVersion) {
      throw new HttpError(400, 'Only the latest version of an accepted quote can be converted to an order.');
    }
    if (quote.orderEligibility === 'ORDER_CREATED' || quote.convertedToOrderAt) {
      throw new HttpError(400, 'Quote has already been converted to an order.');
    }
    if (quote.orderConversionLock) {
      throw new HttpError(400, 'Quote is currently locked for order conversion.');
    }

    // Compute checksum
    const computedChecksum = this.generatePricingChecksum(
      quote.pricingSnapshot,
      quote.subtotal,
      quote.discountAmount,
      quote.vatAmount,
      quote.totalAmount
    );

    const orderNumber = this.generateOrderNumber();
    const effectiveConversionId = conversionId || `CONV-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const orderData = {
      orderNumber,
      conversionId: effectiveConversionId,
      quoteId: quote._id,
      organizationId: quote.organizationId || null,
      accountManagerId: actorId || null,
      customerSnapshot: {
        customerName: quote.customerSnapshot.customerName,
        contactEmail: quote.customerSnapshot.contactEmail,
        contactPhone: quote.customerSnapshot.contactPhone,
      },
      communitySnapshot: {
        organizationName: quote.communitySnapshot.organizationName,
        villaCount: quote.communitySnapshot.villaCount,
      },
      pricingSnapshot: quote.pricingSnapshot,
      pricingChecksum: computedChecksum,
      unitCount: quote.unitCount,
      subtotal: quote.subtotal,
      discountAmount: quote.discountAmount,
      setupFee: quote.setupFee,
      vatAmount: quote.vatAmount,
      totalAmount: quote.totalAmount,
      currency: quote.currency || 'INR',
      status: 'DRAFT',
      contractStartDate: new Date(),
      contractEndDate: new Date(Date.now() + 365 * 24 * 3600 * 1000),
      billingFrequency: 'YEARLY',
      paymentTerms: 'NET_30',
      createdBy: actorId || null,
    };

    // Execute atomic session transaction if replica set available
    let session = null;
    try {
      const isReplicaSet = mongoose.connection.topology?.description?.type && mongoose.connection.topology.description.type !== 'Single';
      if (isReplicaSet) {
        session = await mongoose.startSession();
        session.startTransaction();
      }
    } catch (sessionErr) {
      session = null;
    }

    try {
      // Create Order
      const newOrder = await platformOrderRepository.create(orderData, session);

      // Lock & Update Quote
      const PlatformQuote = (await import('../platformQuote/platformQuote.model.js')).default;
      await PlatformQuote.findByIdAndUpdate(
        quote._id,
        {
          orderEligibility: 'ORDER_CREATED',
          orderConversionLock: true,
          convertedToOrderAt: new Date(),
          convertedToOrderBy: actorId || null,
        },
        session ? { session } : {}
      );

      // Append Timeline Event
      await platformOrderRepository.createTimelineEvent(
        {
          orderId: newOrder._id,
          orderNumber: newOrder.orderNumber,
          eventType: 'ORDER_CREATED',
          fromStatus: null,
          toStatus: 'DRAFT',
          actorId: actorId || null,
          actorName,
          timestamp: new Date(),
          metadata: { quoteNumber: quote.quoteNumber, totalAmount: newOrder.totalAmount },
        },
        session
      );

      if (session && session.inTransaction()) {
        await session.commitTransaction();
      }
      if (session) session.endSession();

      platformOrderEvents.emit('order_created', newOrder);

      return {
        order: newOrder,
        message: 'Order created successfully from accepted quote.',
        isDuplicateRequest: false,
      };
    } catch (err) {
      if (session && session.inTransaction()) {
        await session.abortTransaction();
      }
      if (session) session.endSession();
      throw err;
    }
  }

  /**
   * Confirm Order & Generate Billing Schedule (Mandatory Correction 3).
   */
  async confirmOrder(orderId, actorId = null, actorName = 'System') {
    const order = await this.getOrderById(orderId);
    if (order.status !== 'DRAFT' && order.status !== 'PENDING_CUSTOMER_CONFIRMATION') {
      throw new HttpError(400, `Order cannot be confirmed from status '${order.status}'`);
    }

    const contractPdfUrl = `/api/v1/platform/orders/${order._id}/contract-pdf`;
    const contractPdfChecksum = crypto.createHash('sha256').update(order.orderNumber + order.totalAmount).digest('hex');

    const updatePayload = {
      status: 'CONFIRMED',
      confirmedAt: new Date(),
      confirmedBy: actorId || null,
      contractPdfUrl,
      contractPdfChecksum,
    };

    const updatedOrder = await platformOrderRepository.updateById(order._id, updatePayload);

    // Create Billing Schedule Items
    const schedules = [];
    const frequency = order.billingFrequency || 'YEARLY';
    const total = order.totalAmount;
    const installmentsCount = frequency === 'MONTHLY' ? 12 : 1;
    const installmentAmount = Math.round((total / installmentsCount) * 100) / 100;

    for (let i = 1; i <= installmentsCount; i++) {
      const billingDate = new Date(order.contractStartDate);
      billingDate.setMonth(billingDate.getMonth() + (i - 1));

      const dueDate = new Date(billingDate);
      dueDate.setDate(dueDate.getDate() + 30); // NET_30

      schedules.push({
        orderId: order._id,
        organizationId: order.organizationId || null,
        installmentNumber: i,
        billingDate,
        dueDate,
        amount: i === installmentsCount ? total - installmentAmount * (installmentsCount - 1) : installmentAmount,
        currency: order.currency || 'INR',
        status: 'SCHEDULED',
      });
    }

    await platformOrderRepository.createBillingSchedules(schedules);

    // Append Timeline Event
    await platformOrderRepository.createTimelineEvent({
      orderId: updatedOrder._id,
      orderNumber: updatedOrder.orderNumber,
      eventType: 'ORDER_CONFIRMED',
      fromStatus: order.status,
      toStatus: 'CONFIRMED',
      actorId: actorId || null,
      actorName,
      timestamp: new Date(),
      metadata: { installmentsCount, contractPdfUrl },
    });

    platformOrderEvents.emit('order_confirmed', updatedOrder);
    return updatedOrder;
  }

  /**
   * Create Commercial Order Amendment (Mandatory Correction 1).
   */
  async createAmendment(orderId, amendmentData, actorId = null, actorName = 'System') {
    const order = await this.getOrderById(orderId);

    const count = (await platformOrderRepository.findAmendmentsByOrderId(order._id)).length + 1;
    const amendmentNumber = `AMD-${order.orderNumber}-${count}`;

    const newAmendment = await platformOrderRepository.createAmendment({
      orderId: order._id,
      amendmentNumber,
      amendmentType: amendmentData.amendmentType || 'CORRECTION',
      previousSnapshot: order.pricingSnapshot,
      newSnapshot: amendmentData.newSnapshot || order.pricingSnapshot,
      reason: amendmentData.reason || 'Commercial contract adjustment',
      effectiveDate: amendmentData.effectiveDate || new Date(),
      approvedBy: actorId || null,
      approvedAt: new Date(),
    });

    await platformOrderRepository.createTimelineEvent({
      orderId: order._id,
      orderNumber: order.orderNumber,
      eventType: 'ORDER_AMENDED',
      category: 'SYSTEM',
      actorId: actorId || null,
      actorName,
      timestamp: new Date(),
      metadata: { amendmentNumber, amendmentType: newAmendment.amendmentType },
    });

    return newAmendment;
  }

  /**
   * Get Order by ID or orderNumber.
   */
  async getOrderById(id) {
    if (!id) throw new HttpError(400, 'Order ID is required');
    const idStr = String(id._id || id);
    let order = null;
    if (idStr.match(/^[0-9a-fA-F]{24}$/)) {
      order = await platformOrderRepository.findById(idStr);
    }
    if (!order) {
      order = await platformOrderRepository.findById(idStr);
    }
    if (!order) {
      throw new HttpError(404, `Platform Order '${idStr}' not found`);
    }
    return order;
  }

  /**
   * Get Order Timeline.
   */
  async getOrderTimeline(orderId) {
    const order = await this.getOrderById(orderId);
    return await platformOrderRepository.findTimelineByOrderId(order._id);
  }

  /**
   * Get Order Billing Schedules.
   */
  async getBillingSchedules(orderId) {
    const order = await this.getOrderById(orderId);
    return await platformOrderRepository.findBillingSchedulesByOrderId(order._id);
  }

  /**
   * Get Order Amendments.
   */
  async getAmendments(orderId) {
    const order = await this.getOrderById(orderId);
    return await platformOrderRepository.findAmendmentsByOrderId(order._id);
  }

  /**
   * Get Paginated Orders.
   */
  async getOrders(queryParams) {
    return await platformOrderRepository.getOrdersPaginated(queryParams);
  }
}

export default new PlatformOrderService();
