import mongoose from 'mongoose';
import logger from '../../utils/logger.utils.js';
import {
  createPendingActionProposal,
  verifyPendingAction,
  lockActionForExecution,
  acquireExecutionLease,
  isLeaseActive,
  recordActionSuccess,
  recordActionFailure,
  cancelPendingAction,
  cancelActiveProposalsForUser,
  getPendingActionById,
} from './aiAssistant.actions.js';
import { canCreateResidentPass, assertPassAccess } from '../visitorPass/visitorPass.policy.js';

// Dynamically or statically imported feature services for clean decoupling
let communityFinanceService = null;
let personalExpenseService = null;
let invoiceServices = null;
let assessmentService = null;
let amenityService = null;
let complaintService = null;
let amenityBookingService = null;
let visitorPassService = null;
let visitorLogService = null;
let blacklistService = null;
let parseReceiptTextFn = null;
let noticeBoardService = null;
let noticeAcknowledgementService = null;
let staffUnitAssociationService = null;
let staffAttendanceService = null;
let villaServices = null;
let pollServices = null;
let walletService = null;
let userPreferenceService = null;
let notificationService = null;
let adminAnalyticsService = null;

let injectedServices = {};

export function setTestServices(services = {}) {
  injectedServices = services || {};
}

export function resetTestServices() {
  injectedServices = {};
  communityFinanceService = null;
  personalExpenseService = null;
  invoiceServices = null;
  assessmentService = null;
  amenityService = null;
  complaintService = null;
  amenityBookingService = null;
  visitorPassService = null;
  visitorLogService = null;
  blacklistService = null;
  parseReceiptTextFn = null;
  noticeBoardService = null;
  noticeAcknowledgementService = null;
  staffUnitAssociationService = null;
  staffAttendanceService = null;
  villaServices = null;
  pollServices = null;
  walletService = null;
  userPreferenceService = null;
  notificationService = null;
  adminAnalyticsService = null;
}

async function loadServices() {
  if (injectedServices.communityFinanceService !== undefined) {
    communityFinanceService = injectedServices.communityFinanceService;
  }
  if (injectedServices.personalExpenseService !== undefined) {
    personalExpenseService = injectedServices.personalExpenseService;
  }
  if (injectedServices.invoiceServices !== undefined) {
    invoiceServices = injectedServices.invoiceServices;
  }
  if (injectedServices.assessmentService !== undefined) {
    assessmentService = injectedServices.assessmentService;
  }
  if (injectedServices.amenityService !== undefined) {
    amenityService = injectedServices.amenityService;
  }
  if (injectedServices.complaintService !== undefined) {
    complaintService = injectedServices.complaintService;
  }
  if (injectedServices.amenityBookingService !== undefined) {
    amenityBookingService = injectedServices.amenityBookingService;
  }
  if (injectedServices.visitorPassService !== undefined) {
    visitorPassService = injectedServices.visitorPassService;
  }
  if (injectedServices.visitorLogService !== undefined) {
    visitorLogService = injectedServices.visitorLogService;
  }
  if (injectedServices.blacklistService !== undefined) {
    blacklistService = injectedServices.blacklistService;
  }
  if (injectedServices.parseReceiptText !== undefined) {
    parseReceiptTextFn = injectedServices.parseReceiptText;
  }
  if (injectedServices.noticeBoardService !== undefined) {
    noticeBoardService = injectedServices.noticeBoardService;
  }
  if (injectedServices.noticeAcknowledgementService !== undefined) {
    noticeAcknowledgementService = injectedServices.noticeAcknowledgementService;
  }
  if (injectedServices.staffUnitAssociationService !== undefined) {
    staffUnitAssociationService = injectedServices.staffUnitAssociationService;
  }
  if (injectedServices.staffAttendanceService !== undefined) {
    staffAttendanceService = injectedServices.staffAttendanceService;
  }
  if (injectedServices.villaServices !== undefined) {
    villaServices = injectedServices.villaServices;
  }
  if (injectedServices.pollServices !== undefined) {
    pollServices = injectedServices.pollServices;
  }
  if (injectedServices.walletService !== undefined) {
    walletService = injectedServices.walletService;
  }
  if (injectedServices.userPreferenceService !== undefined) {
    userPreferenceService = injectedServices.userPreferenceService;
  }
  if (injectedServices.notificationService !== undefined) {
    notificationService = injectedServices.notificationService;
  }
  if (injectedServices.adminAnalyticsService !== undefined) {
    adminAnalyticsService = injectedServices.adminAnalyticsService;
  }

  if (!communityFinanceService && mongoose.connection?.readyState === 1) {
    try {
      const mod = await import('../communityFinance/communityFinance.service.js');
      communityFinanceService = mod.default || mod;
    } catch (e) {
      logger.warn(`Failed to import communityFinanceService: ${e.message}`);
    }
  }
  if (!personalExpenseService && mongoose.connection?.readyState === 1) {
    try {
      const mod = await import('../personalExpense/personalExpense.service.js');
      personalExpenseService = mod.default || mod;
    } catch (e) {
      logger.warn(`Failed to import personalExpenseService: ${e.message}`);
    }
  }
  if (!invoiceServices && mongoose.connection?.readyState === 1) {
    try {
      const mod = await import('../invoice/invoice.services.js');
      invoiceServices = mod.default || mod;
    } catch (e) {
      logger.warn(`Failed to import invoiceServices: ${e.message}`);
    }
  }
  if (!assessmentService && mongoose.connection?.readyState === 1) {
    try {
      const mod = await import('../assessment/assessment.services.js');
      assessmentService = mod.default || mod;
    } catch (e) {
      logger.warn(`Failed to import assessmentService: ${e.message}`);
    }
  }
  if (!amenityService && mongoose.connection?.readyState === 1) {
    try {
      const mod = await import('../amenity/amenity.services.js');
      amenityService = mod.default || mod;
    } catch (e) {
      logger.warn(`Failed to import amenityService: ${e.message}`);
    }
  }
  if (!amenityBookingService && mongoose.connection?.readyState === 1) {
    try {
      const mod = await import('../amenityBooking/amenityBooking.services.js');
      amenityBookingService = mod.default || mod;
    } catch (e) {
      logger.warn(`Failed to import amenityBookingService: ${e.message}`);
    }
  }
  if (!complaintService && mongoose.connection?.readyState === 1) {
    try {
      const mod = await import('../complaint/complaint.service.js');
      complaintService = mod.default || mod;
    } catch (e) {
      logger.warn(`Failed to import complaintService: ${e.message}`);
    }
  }
  if (!visitorPassService && mongoose.connection?.readyState === 1) {
    try {
      const mod = await import('../visitorPass/visitorPass.service.js');
      visitorPassService = mod.default || mod;
    } catch (e) {
      logger.warn(`Failed to import visitorPassService: ${e.message}`);
    }
  }
  if (!visitorLogService && mongoose.connection?.readyState === 1) {
    try {
      const mod = await import('../visitorLog/visitorLog.service.js');
      visitorLogService = mod.default || mod;
    } catch (e) {
      logger.warn(`Failed to import visitorLogService: ${e.message}`);
    }
  }
  if (!blacklistService && mongoose.connection?.readyState === 1) {
    try {
      const mod = await import('../blacklist/blacklist.service.js');
      blacklistService = mod.default || mod;
    } catch (e) {
      logger.warn(`Failed to import blacklistService: ${e.message}`);
    }
  }
  if (!noticeBoardService && mongoose.connection?.readyState === 1) {
    try {
      const mod = await import('../noticeBoard/noticeBoard.service.js');
      noticeBoardService = mod.default || mod;
    } catch (e) {
      logger.warn(`Failed to import noticeBoardService: ${e.message}`);
    }
  }
  if (!noticeAcknowledgementService && mongoose.connection?.readyState === 1) {
    try {
      const mod = await import('../noticeAcknowledgement/noticeAcknowledgement.service.js');
      noticeAcknowledgementService = mod.default || mod;
    } catch (e) {
      logger.warn(`Failed to import noticeAcknowledgementService: ${e.message}`);
    }
  }
  if (!staffUnitAssociationService && mongoose.connection?.readyState === 1) {
    try {
      const mod = await import('../staffUnitAssociation/staffUnitAssociation.service.js');
      staffUnitAssociationService = mod.default || mod;
    } catch (e) {
      logger.warn(`Failed to import staffUnitAssociationService: ${e.message}`);
    }
  }
  if (!staffAttendanceService && mongoose.connection?.readyState === 1) {
    try {
      const mod = await import('../staffAttendance/staffAttendance.service.js');
      staffAttendanceService = mod.default || mod;
    } catch (e) {
      logger.warn(`Failed to import staffAttendanceService: ${e.message}`);
    }
  }
  if (!villaServices && mongoose.connection?.readyState === 1) {
    try {
      const mod = await import('../villa/villa.services.js');
      villaServices = mod.default || mod;
    } catch (e) {
      logger.warn(`Failed to import villaServices: ${e.message}`);
    }
  }
  if (!pollServices && mongoose.connection?.readyState === 1) {
    try {
      const mod = await import('../poll/poll.services.js');
      pollServices = mod.default || mod;
    } catch (e) {
      logger.warn(`Failed to import pollServices: ${e.message}`);
    }
  }
  if (!walletService && mongoose.connection?.readyState === 1) {
    try {
      const mod = await import('../wallet/wallet.service.js');
      walletService = mod.default || mod;
    } catch (e) {
      logger.warn(`Failed to import walletService: ${e.message}`);
    }
  }
  if (!userPreferenceService && mongoose.connection?.readyState === 1) {
    try {
      const mod = await import('../userPreference/userPreference.service.js');
      userPreferenceService = mod.default || mod;
    } catch (e) {
      logger.warn(`Failed to import userPreferenceService: ${e.message}`);
    }
  }
  if (!notificationService && mongoose.connection?.readyState === 1) {
    try {
      const mod = await import('../notification/notification.service.js');
      notificationService = mod.default || mod;
    } catch (e) {
      logger.warn(`Failed to import notificationService: ${e.message}`);
    }
  }
  if (!adminAnalyticsService && mongoose.connection?.readyState === 1) {
    try {
      const mod = await import('../adminAnalytics/adminAnalytics.service.js');
      adminAnalyticsService = mod.default || mod;
    } catch (e) {
      logger.warn(`Failed to import adminAnalyticsService: ${e.message}`);
    }
  }
  if (!parseReceiptTextFn) {
    try {
      const mod = await import('../personalExpense/ocr/receiptParser.js');
      parseReceiptTextFn = mod.parseReceiptText;
    } catch (e) {
      logger.warn(`Failed to import parseReceiptText: ${e.message}`);
    }
  }
}

/**
 * Tool / Function Declarations registered with Google Gemini.
 */
export const ASSISTANT_TOOL_DECLARATIONS = [
  {
    name: 'get_community_finance_summary',
    description: 'Retrieve real authorized community financial summary (total community expenses incurred, expense category breakdown, collections, net balance) for the current month or a specified period. Use this when the user asks about community expenses, maintenance collections, or community budget.',
    parameters: {
      type: 'OBJECT',
      properties: {
        period: {
          type: 'STRING',
          description: 'Target month in YYYY-MM format (e.g. "2026-10") or "current_month". Defaults to current month.',
        },
      },
    },
  },
  {
    name: 'get_personal_expense_summary',
    description: "Retrieve the authenticated resident's personal expense summary, monthly personal budget, personal spending breakdown, category expenses (e.g. Groceries, Food, Utilities), budget utilization, and recent transactions. Use this when the user asks about their personal expenses or personal wallet/budget.",
    parameters: {
      type: 'OBJECT',
      properties: {
        period: {
          type: 'STRING',
          description: 'Target month in YYYY-MM format (e.g. "2026-10") or "current_month" or "previous_month". Defaults to current month.',
        },
        category: {
          type: 'STRING',
          description: 'Optional expense category keyword to filter or inspect (e.g. "Groceries", "Food", "Utilities", "Shopping", "Transport").',
        },
      },
    },
  },
  {
    name: 'prepare_personal_expense',
    description: 'Prepare a proposal to record a personal expense transaction in the resident personal expense manager. Validates amount, category, date, and payment method, then creates an action proposal requiring confirmation. The expense is NOT recorded until confirmed.',
    parameters: {
      type: 'OBJECT',
      properties: {
        amount: {
          type: 'NUMBER',
          description: 'Expense amount in Rupees (e.g. 450). Must be greater than zero.',
        },
        category: {
          type: 'STRING',
          description: 'Category keyword (e.g. "Groceries", "Food", "Transport", "Shopping", "Utilities", "Medical", "Entertainment", "Other").',
        },
        merchantOrSource: {
          type: 'STRING',
          description: 'Payee, merchant name, or expense title (e.g. "Supermarket", "Milk and Eggs", "Uber", "Electric Bill").',
        },
        date: {
          type: 'STRING',
          description: 'Transaction date in YYYY-MM-DD format (e.g. "2026-10-28"). Defaults to today.',
        },
        paymentMethod: {
          type: 'STRING',
          description: 'Payment method: "UPI", "CASH", "CARD", "BANK_TRANSFER", "WALLET", or "OTHER". Defaults to "UPI".',
        },
        notes: {
          type: 'STRING',
          description: 'Optional additional notes for the expense entry.',
        },
      },
      required: ['amount'],
    },
  },
  {
    name: 'preview_receipt_ocr',
    description: 'Parse raw receipt text or payment confirmation proof into structured expense details (merchant, total amount, items, date, category) for personal expense logging.',
    parameters: {
      type: 'OBJECT',
      properties: {
        receiptText: {
          type: 'STRING',
          description: 'Raw OCR or transcribed text from receipt, invoice, or payment screenshot.',
        },
      },
      required: ['receiptText'],
    },
  },
  {
    name: 'get_resident_dues_and_invoices',
    description: "Retrieve the authenticated resident's maintenance charges, outstanding dues, unpaid invoices, and payment status.",
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'prepare_assessment_creation',
    description: 'Prepare an administrative proposal to create a community maintenance assessment template or bulk billing run for residents (e.g. "November Maintenance", ₹10,000 for all residents). Validates administrator permissions, formats target scope and calculation method, and presents an HMAC confirmation card for the admin to review and confirm before creating in the database.',
    parameters: {
      type: 'OBJECT',
      properties: {
        name: {
          type: 'STRING',
          description: 'Name or title of the assessment (e.g. "November Maintenance", "Q4 Society Maintenance", "Water Supply Repair").',
        },
        flatAmount: {
          type: 'NUMBER',
          description: 'Flat maintenance amount per unit/resident in INR (e.g. 10000).',
        },
        billingCycle: {
          type: 'STRING',
          description: 'Billing cycle frequency: "MONTHLY" (default), "QUARTERLY", "ANNUALLY", "WEEKLY", or "AD_HOC".',
        },
        type: {
          type: 'STRING',
          description: 'Assessment type: "RECURRING" (default) or "ONE_TIME".',
        },
        targetScopeType: {
          type: 'STRING',
          description: 'Target audience scope: "ALL_COMMUNITY" (default for all residents), "VILLA_BLOCK", "UNIT_TYPE", or "SPECIFIC_UNITS".',
        },
        description: {
          type: 'STRING',
          description: 'Optional description of the maintenance assessment.',
        },
      },
      required: ['name', 'flatAmount'],
    },
  },
  {
    name: 'get_amenities_catalog',
    description: 'Retrieve the active community amenities, operating hours, capacity, and booking rules for the community.',
    parameters: {
      type: 'OBJECT',
      properties: {
        category: {
          type: 'STRING',
          description: 'Optional category filter (e.g. Sports, Clubhouse, Fitness).',
        },
      },
    },
  },
  {
    name: 'get_my_complaints',
    description: "Retrieve the authenticated resident's recent complaints, maintenance requests, or helpdesk tickets and their live status, SLA targets, and timeline.",
    parameters: {
      type: 'OBJECT',
      properties: {
        status: {
          type: 'STRING',
          description: 'Optional filter by ticket status (e.g. OPEN, ASSIGNED, IN_PROGRESS, RESOLVED, ALL).',
        },
        complaintNumber: {
          type: 'STRING',
          description: 'Optional ticket number to look up specific complaint (e.g. "CMP-2026-000001").',
        },
      },
    },
  },
  {
    name: 'prepare_complaint',
    description: 'Prepare a proposal to raise a maintenance complaint or helpdesk ticket. Validates issue title, category, priority, and location, then creates an action proposal requiring confirmation. The ticket is NOT lodged until confirmed.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: {
          type: 'STRING',
          description: 'Short title or summary of the issue (e.g. "Water leakage under kitchen sink", "Corridor light flickering").',
        },
        description: {
          type: 'STRING',
          description: 'Detailed description of the complaint.',
        },
        category: {
          type: 'STRING',
          description: 'Category: "Plumbing", "Electrical", "Carpentry", "Cleaning", "Security", "Lift", or "General Maintenance".',
        },
        priority: {
          type: 'STRING',
          description: 'Priority level: "Low", "Medium", "High", or "Critical". Defaults to "Medium".',
        },
        location: {
          type: 'STRING',
          description: 'Location or unit number (e.g. "Flat 402" or "Block B 3rd Floor").',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'prepare_complaint_cancellation',
    description: 'Prepare a proposal to cancel an open or submitted maintenance ticket. Verifies resident ownership and pre-assignment state, then creates a pending proposal with an HMAC confirmation token. The ticket is NOT cancelled until confirmed.',
    parameters: {
      type: 'OBJECT',
      properties: {
        complaintId: {
          type: 'STRING',
          description: 'The complaint ticket number (e.g. "CMP-2026-000001") or internal complaint ID.',
        },
        reason: {
          type: 'STRING',
          description: 'Optional reason for ticket cancellation.',
        },
      },
      required: ['complaintId'],
    },
  },
  {
    name: 'check_amenity_availability',
    description: 'Check available booking slots, operational timings, and pricing for a specific community amenity (e.g. Badminton, Swimming Pool, Gym, Tennis Court, Banquet Hall) for today or a specific date.',
    parameters: {
      type: 'OBJECT',
      properties: {
        amenityName: {
          type: 'STRING',
          description: 'The name or keyword of the amenity to check (e.g. "Badminton", "Gym", "Tennis", "Pool", "Hall").',
        },
        date: {
          type: 'STRING',
          description: 'Target booking date in YYYY-MM-DD format (e.g. "2026-10-28"). Defaults to today or tomorrow if requested.',
        },
      },
      required: ['amenityName'],
    },
  },
  {
    name: 'get_my_bookings',
    description: "Retrieve the authenticated resident's active, upcoming, or past amenity bookings, slot times, and access pass QR codes. Supports filtering by date range (e.g. for 'next week', 'tomorrow', or specific dates) and status.",
    parameters: {
      type: 'OBJECT',
      properties: {
        status: {
          type: 'STRING',
          description: 'Optional filter by booking status (e.g. "pending", "approved", "confirmed", "checked-in", "cancelled").',
        },
        startDate: {
          type: 'STRING',
          description: 'Optional start date filter in YYYY-MM-DD format (e.g. "2026-10-28").',
        },
        endDate: {
          type: 'STRING',
          description: 'Optional end date filter in YYYY-MM-DD format (e.g. "2026-11-04").',
        },
        dateRangeLabel: {
          type: 'STRING',
          description: 'Optional human-readable label for the date range (e.g. "next week", "tomorrow", "this weekend").',
        },
      },
    },
  },
  {
    name: 'prepare_amenity_booking',
    description: 'Prepare a booking proposal for an amenity on a selected date and slot time. Validates availability, calculates the estimated price, and returns an action card with an HMAC confirmation token for the resident to confirm before execution.',
    parameters: {
      type: 'OBJECT',
      properties: {
        amenityName: {
          type: 'STRING',
          description: 'Name or keyword of the amenity to book (e.g. "Badminton", "Gym", "Tennis").',
        },
        date: {
          type: 'STRING',
          description: 'Booking date in YYYY-MM-DD format (e.g. "2026-10-28").',
        },
        slotTime: {
          type: 'STRING',
          description: 'Desired start time in HH:mm format (e.g. "06:00", "18:00").',
        },
      },
      required: ['amenityName', 'date'],
    },
  },
  {
    name: 'prepare_amenity_booking_cancellation',
    description: 'Prepare a proposal to cancel an existing amenity booking. Verifies ownership and cancellation rules, calculates the refund, and returns a confirmation card with an HMAC token. The booking is NOT cancelled until confirmed.',
    parameters: {
      type: 'OBJECT',
      properties: {
        bookingId: {
          type: 'STRING',
          description: 'Optional specific booking ID to cancel.',
        },
        amenityName: {
          type: 'STRING',
          description: 'Optional amenity name to identify the booking to cancel (e.g. "Badminton", "Tennis").',
        },
      },
    },
  },
  {
    name: 'prepare_amenity_creation',
    description: 'Prepare an administrative proposal to create a new amenity facility in the community Amenity Master catalog (e.g. Basketball Court, Swimming Pool, Tennis Court). Validates parameters, prepares pricing rules, capacity, and returns an HMAC confirmation card for the administrator to review and confirm before creating.',
    parameters: {
      type: 'OBJECT',
      properties: {
        name: {
          type: 'STRING',
          description: 'Name of the amenity facility to create (e.g. "Basketball Court", "Badminton Court 1", "Tennis Court").',
        },
        type: {
          type: 'STRING',
          description: 'Amenity category type: "court", "sports", "clubhouse", "pool", "gym", "hall", "Event Space", "Fitness", "Sports", "Workspace", "Wellness", or "other".',
        },
        pricingType: {
          type: 'STRING',
          description: 'Pricing model: "hourly" (default for slot-based facilities), "daily", "session", or "fixed".',
        },
        ratePerHour: {
          type: 'NUMBER',
          description: 'Rate or fee per slot / hour in INR (e.g. 500). Defaults to 0 for free facilities.',
        },
        capacity: {
          type: 'NUMBER',
          description: 'Maximum capacity or headcount per slot (e.g. 10). Minimum 1.',
        },
        slotDurationMinutes: {
          type: 'NUMBER',
          description: 'Duration of each bookable slot in minutes (e.g. 60, 45, 30). Defaults to 60.',
        },
        openTime: {
          type: 'STRING',
          description: 'Daily opening time in HH:mm format (e.g. "06:00"). Defaults to "06:00".',
        },
        closeTime: {
          type: 'STRING',
          description: 'Daily closing time in HH:mm format (e.g. "22:00"). Defaults to "22:00".',
        },
        location: {
          type: 'STRING',
          description: 'Physical location within the community (e.g. "Sports Complex", "Clubhouse Ground Floor").',
        },
        description: {
          type: 'STRING',
          description: 'Short description of the facility and equipment provided.',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'prepare_poll_creation',
    description: 'Prepare an administrative proposal to create a community voting poll or resident opinion survey (e.g. "Should we renovate the swimming pool?", "Clubhouse weekend operating hours"). Validates administrator permissions, formats options, and presents an HMAC confirmation card for the admin to review and confirm before publishing to the active polls board.',
    parameters: {
      type: 'OBJECT',
      properties: {
        question: {
          type: 'STRING',
          description: 'The poll question or headline (e.g. "Should we renovate the swimming pool?", "Preferred gym weekend hours").',
        },
        options: {
          type: 'ARRAY',
          description: 'List of choice options for residents to vote on (e.g. ["Yes", "No", "Maybe"] or ["6:00 AM", "7:00 AM", "8:00 AM"]). Defaults to ["Yes", "No"] if omitted.',
          items: {
            type: 'STRING',
          },
        },
        category: {
          type: 'STRING',
          description: 'Poll category: "General" (default), "Amenities", "Maintenance", "Security", "Finance", or "Social".',
        },
        endDate: {
          type: 'STRING',
          description: 'Optional closing date for the poll in YYYY-MM-DD or ISO format. Defaults to 7 days from creation.',
        },
        isAnonymous: {
          type: 'BOOLEAN',
          description: 'Whether resident votes should be anonymous. Defaults to false.',
        },
        description: {
          type: 'STRING',
          description: 'Optional additional background context or description for the poll.',
        },
      },
      required: ['question'],
    },
  },
  {
    name: 'prepare_notice_creation',
    description: 'Prepare an administrative proposal to publish an official notice or broadcast announcement on the community Notice Board (e.g. "Water Supply Maintenance Shutdown tomorrow 10am-2pm", "Notice for Annual General Meeting"). Validates administrator permissions, formats priority and category, and presents an HMAC confirmation card for the admin to review and confirm before publishing.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: {
          type: 'STRING',
          description: 'Headline or title of the notice (e.g. "Water Supply Maintenance Shutdown", "Security Guidelines Update").',
        },
        description: {
          type: 'STRING',
          description: 'Full text body or announcement details for the notice.',
        },
        category: {
          type: 'STRING',
          description: 'Notice category: "General" (default), "Maintenance", "Security", "Events", "Billing", or "Rules".',
        },
        priority: {
          type: 'STRING',
          description: 'Priority level: "Low", "Medium" (default), "High", or "Critical".',
        },
        isPinned: {
          type: 'BOOLEAN',
          description: 'Whether this notice should be pinned to the top of the community notice board. Defaults to false.',
        },
        requiresAcknowledgement: {
          type: 'BOOLEAN',
          description: 'Whether residents must explicitly acknowledge or mark this notice as read. Defaults to false.',
        },
        expiryDate: {
          type: 'STRING',
          description: 'Optional expiration date in YYYY-MM-DD format after which the notice is archived.',
        },
      },
      required: ['title', 'description'],
    },
  },
  {
    name: 'prepare_visitor_pass',
    description: 'Prepare a proposal to create a visitor pass for a guest. Validates visitor details, date, time window, checks blacklist, and returns an action card with an HMAC confirmation token. The pass is NOT created until confirmed.',
    parameters: {
      type: 'OBJECT',
      properties: {
        visitorName: {
          type: 'STRING',
          description: 'Full name of the visitor or guest.',
        },
        date: {
          type: 'STRING',
          description: 'Arrival date in YYYY-MM-DD format (e.g. "2026-10-29").',
        },
        time: {
          type: 'STRING',
          description: 'Expected arrival time in HH:mm format (e.g. "17:00").',
        },
        phone: {
          type: 'STRING',
          description: 'Optional contact phone number of the visitor.',
        },
        vehicleNumber: {
          type: 'STRING',
          description: 'Optional vehicle license plate number.',
        },
        passType: {
          type: 'STRING',
          description: 'Pass type: "GUEST", "DELIVERY", "CAB", or "SERVICE". Defaults to "GUEST".',
        },
        purpose: {
          type: 'STRING',
          description: 'Optional purpose of visit.',
        },
      },
      required: ['visitorName', 'date'],
    },
  },
  {
    name: 'prepare_visitor_pass_revocation',
    description: 'Prepare a proposal to revoke or cancel an active or upcoming visitor pass. Inspects resident active passes, verifies ownership, and creates a pending proposal with an HMAC confirmation token. The pass is NOT revoked until confirmed.',
    parameters: {
      type: 'OBJECT',
      properties: {
        passId: {
          type: 'STRING',
          description: 'Optional specific ID of the pass to revoke.',
        },
        visitorName: {
          type: 'STRING',
          description: 'Optional visitor name to identify the pass to revoke.',
        },
        shortKey: {
          type: 'STRING',
          description: 'Optional pass entry short key (e.g. "VP-84920").',
        },
      },
    },
  },
  {
    name: 'confirm_pending_action',
    description: 'Execute a previously prepared action proposal (visitor pass creation, pass revocation, amenity booking, booking cancellation, personal expense creation, complaint submission, or complaint cancellation) after explicit user confirmation. Enforces HMAC cryptographic verification, tenant isolation, idempotency, and real database mutations.',
    parameters: {
      type: 'OBJECT',
      properties: {
        actionId: {
          type: 'STRING',
          description: 'The unique ID of the pending action proposal to execute.',
        },
        confirmationToken: {
          type: 'STRING',
          description: 'The HMAC confirmation token associated with the proposal.',
        },
      },
      required: ['actionId'],
    },
  },
  {
    name: 'cancel_pending_action',
    description: 'Explicitly cancel a pending action proposal when the user rejects, says no, or requests cancellation.',
    parameters: {
      type: 'OBJECT',
      properties: {
        actionId: {
          type: 'STRING',
          description: 'The ID of the pending action to cancel.',
        },
      },
    },
  },
  {
    name: 'get_my_visitor_passes',
    description: "Retrieve the authenticated resident's active, upcoming, or past visitor passes and guest invitations. Supports filtering by status ('ACTIVE', 'PENDING', 'EXPIRED', 'REVOKED', or 'ALL') and keyword search.",
    parameters: {
      type: 'OBJECT',
      properties: {
        status: {
          type: 'STRING',
          description: "Optional filter by pass status: 'ACTIVE', 'PENDING', 'EXPIRED', 'REVOKED', or 'ALL'. Defaults to active and upcoming passes.",
        },
        search: {
          type: 'STRING',
          description: 'Optional keyword to search visitor name or vehicle number.',
        },
      },
    },
  },
  {
    name: 'get_visitor_history',
    description: 'Retrieve authorized visitor entry and exit log history for the resident household. Can filter for visitors currently checked in inside the community or past visitor logs.',
    parameters: {
      type: 'OBJECT',
      properties: {
        status: {
          type: 'STRING',
          description: "Optional status filter: 'INSIDE' for visitors currently inside the community, 'CHECKED_OUT' for past visitors, or 'ALL'.",
        },
        limit: {
          type: 'NUMBER',
          description: 'Maximum number of log entries to retrieve (1 to 10). Defaults to 5.',
        },
      },
    },
  },
  {
    name: 'get_pending_gate_approvals',
    description: "Retrieve pending walk-in visitor entry requests waiting at the security gate for the resident's approval.",
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'get_community_notices',
    description: 'Retrieve published community notices, circulars, and announcements. Supports filtering by category, priority (Normal, High, Critical), or search keywords.',
    parameters: {
      type: 'OBJECT',
      properties: {
        search: {
          type: 'STRING',
          description: 'Optional keyword to search notice title and content.',
        },
        category: {
          type: 'STRING',
          description: 'Optional category filter: Maintenance, General, Security, Event, Rule, or ALL.',
        },
        priority: {
          type: 'STRING',
          description: 'Optional priority filter: Normal, High, Critical, or ALL.',
        },
        limit: {
          type: 'NUMBER',
          description: 'Maximum notices to retrieve (1 to 10). Defaults to 5.',
        },
      },
    },
  },
  {
    name: 'get_notice_details',
    description: 'Retrieve detailed information, instructions, and acknowledgement requirements for a specific community notice.',
    parameters: {
      type: 'OBJECT',
      properties: {
        noticeId: {
          type: 'STRING',
          description: 'The unique ID of the notice.',
        },
      },
      required: ['noticeId'],
    },
  },
  {
    name: 'prepare_notice_acknowledgement',
    description: 'Prepare a confirmation card to formally acknowledge an urgent community notice that requires resident acknowledgement.',
    parameters: {
      type: 'OBJECT',
      properties: {
        noticeId: {
          type: 'STRING',
          description: 'The unique ID of the notice to acknowledge.',
        },
      },
      required: ['noticeId'],
    },
  },
  {
    name: 'search_staff_directory',
    description: 'Search the community staff directory and domestic help roster (security, housekeeping, maintenance, maids, drivers).',
    parameters: {
      type: 'OBJECT',
      properties: {
        search: {
          type: 'STRING',
          description: 'Optional name or role search keyword.',
        },
        department: {
          type: 'STRING',
          description: 'Optional department filter (Housekeeping, Maintenance, Security, Management).',
        },
        limit: {
          type: 'NUMBER',
          description: 'Maximum results to return (1 to 10). Defaults to 5.',
        },
      },
    },
  },
  {
    name: 'get_my_unit_staff',
    description: 'Retrieve domestic help and service staff currently allocated to the resident household or unit.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'get_active_staff_attendance',
    description: 'Check which domestic staff or service technicians allocated to the resident unit are currently inside the gated community.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'get_my_household_members',
    description: 'View the resident household profile, co-residents, owners, and tenants registered to the resident unit.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'get_my_vehicles_and_parking',
    description: 'Retrieve assigned parking slots and vehicle access details for the resident unit.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'get_active_polls',
    description: 'List active community polls and surveys, voting deadlines, available choices, and whether the resident has voted.',
    parameters: {
      type: 'OBJECT',
      properties: {
        limit: {
          type: 'NUMBER',
          description: 'Maximum polls to retrieve (1 to 10). Defaults to 5.',
        },
        search: {
          type: 'STRING',
          description: 'Optional search keyword for poll titles.',
        },
      },
    },
  },
  {
    name: 'get_poll_details',
    description: 'Retrieve full details for a specific community poll, including question, choice options, and results breakdown if authorized.',
    parameters: {
      type: 'OBJECT',
      properties: {
        pollId: {
          type: 'STRING',
          description: 'The unique ID of the poll.',
        },
      },
      required: ['pollId'],
    },
  },
  {
    name: 'prepare_poll_vote',
    description: 'Prepare an action confirmation card to cast a vote on an active community poll.',
    parameters: {
      type: 'OBJECT',
      properties: {
        pollId: {
          type: 'STRING',
          description: 'The unique ID of the poll to vote on.',
        },
        selectedOptionIndex: {
          type: 'NUMBER',
          description: '0-based index of the chosen option.',
        },
        selectedOptionIndices: {
          type: 'ARRAY',
          description: 'Optional array of 0-based indices for multi-choice polls.',
          items: {
            type: 'NUMBER',
          },
        },
      },
      required: ['pollId'],
    },
  },
  {
    name: 'get_my_settings_and_preferences',
    description: 'Retrieve user application preferences, active dashboard quick actions, and unread notification alerts.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'get_admin_analytics_summary',
    description: 'Administrative tool: Retrieve high-level community management and platform KPIs (open inquiries, pending approvals, subscriptions). Restricted to Community Admin and Super Admin.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'navigate_to_screen',
    description: 'Navigate the resident to an authorized screen in the NAHOM application.',
    parameters: {
      type: 'OBJECT',
      properties: {
        screenId: {
          type: 'STRING',
          description: 'The exact ID of the authorized feature screen to navigate to.',
        },
        userGuidance: {
          type: 'STRING',
          description: 'Conversational explanation to accompany the action button.',
        },
      },
      required: ['screenId'],
    },
  },
];

/**
 * Checks if a user has permission to view community-wide finances.
 */
function hasFinancePermission(user) {
  if (!user) return false;
  if (user.isPlatform === true || user.role === 'Super Admin' || user.role === 'Platform Super Admin' || user.role === 'Admin' || user.role === 'Community Admin') {
    return true;
  }
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return perms.includes('billing:view_expense') || perms.includes('billing:dashboard') || perms.includes('*');
}

/**
 * Checks if a user has administrative permission for complaints.
 */
function hasComplaintAdminPermission(user) {
  if (!user) return false;
  if (
    user.isPlatform === true ||
    user.role === 'Super Admin' ||
    user.role === 'Platform Super Admin' ||
    user.role === 'Admin' ||
    user.role === 'Community Admin' ||
    user.role === 'FacilityManager' ||
    user.role === 'Manager' ||
    user.role === 'Facility Manager'
  ) {
    return true;
  }
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return perms.includes('complaints:manage') || perms.includes('complaints:admin') || perms.includes('*');
}

/**
 * Checks if a user has general administrative roles.
 */
function hasAdminRole(user) {
  if (!user) return false;
  return (
    user.isPlatform === true ||
    user.role === 'Super Admin' ||
    user.role === 'SuperAdmin' ||
    user.role === 'Platform Super Admin' ||
    user.role === 'Admin' ||
    user.role === 'Community Admin' ||
    user.role === 'CommunityManager' ||
    user.role === 'FacilityManager' ||
    user.role === 'Manager' ||
    user.role === 'Facility Manager'
  );
}

/**
 * Checks if a user has permission to configure or manage amenities in Amenity Master.
 */
function hasAmenityAdminPermission(user) {
  if (!user) return false;
  if (hasAdminRole(user)) return true;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return (
    perms.includes('amenities:master') ||
    perms.includes('amenities:amenities') ||
    perms.includes('amenities:create') ||
    perms.includes('amenities.create') ||
    perms.includes('amenities:manage') ||
    perms.includes('*')
  );
}

/**
 * Checks if a user has permission to configure or manage assessments in Assessment Manager.
 */
function hasAssessmentAdminPermission(user) {
  if (!user) return false;
  if (hasAdminRole(user)) return true;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return (
    perms.includes('billing:assessments') ||
    perms.includes('billing:assessment_manager') ||
    perms.includes('billing:manage') ||
    perms.includes('*')
  );
}

/**
 * Checks if a user has permission to configure or manage community polls.
 */
function hasPollAdminPermission(user) {
  if (!user) return false;
  if (hasAdminRole(user)) return true;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return (
    perms.includes('polls:create') ||
    perms.includes('polls:manage') ||
    perms.includes('manage_polls') ||
    perms.includes('manage_notices') ||
    perms.includes('polls') ||
    perms.includes('*')
  );
}

/**
 * Checks if a user has permission to post or manage notices on the community notice board.
 */
function hasNoticeAdminPermission(user) {
  if (!user) return false;
  if (hasAdminRole(user)) return true;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return (
    perms.includes('notices:create') ||
    perms.includes('notices:manage') ||
    perms.includes('manage_notices') ||
    perms.includes('notices') ||
    perms.includes('*')
  );
}

/**
 * Formats a period string (e.g. "2026-10", "previous_month", "all", "October") into readable month/year and bounds.
 */
function resolvePeriodBounds(period) {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1; // 1-12

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  if (period === 'all' || period === 'all_time' || period === 'all-time' || period === 'overall') {
    return {
      periodKey: 'all',
      startDate: null,
      endDate: null,
      readablePeriod: 'All Time',
    };
  }

  if (period === 'previous_month' || period === 'last_month') {
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  } else if (period && typeof period === 'string') {
    const trimmed = period.trim().toLowerCase();
    if (/^\d{4}-\d{2}$/.test(trimmed)) {
      const [y, m] = trimmed.split('-').map(Number);
      if (m >= 1 && m <= 12) {
        year = y;
        month = m;
      }
    } else {
      const matchedIdx = monthNames.findIndex((m) => trimmed.includes(m.toLowerCase()));
      if (matchedIdx !== -1) {
        month = matchedIdx + 1;
        const yearMatch = trimmed.match(/\b(20\d\d)\b/);
        if (yearMatch) {
          year = Number(yearMatch[1]);
        }
      }
    }
  }

  const mm = String(month).padStart(2, '0');
  const periodKey = `${year}-${mm}`;
  const startDate = `${periodKey}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${periodKey}-${String(lastDay).padStart(2, '0')}`;

  const readablePeriod = `${monthNames[month - 1]} ${year}`;

  return { periodKey, startDate, endDate, readablePeriod };
}

/**
 * Securely executes an authorized backend data tool or navigation request.
 * Strictly enforces tenant isolation, role authorization, and existing business services.
 *
 * @param {object} user - Authenticated user context
 * @param {object} tenant - Verified tenant context
 * @param {string} toolName - Name of the declared tool
 * @param {object} toolArgs - Arguments generated by the model
 * @param {Array} authorizedFeatures - Feature allowlist for this user
 * @returns {Promise<{ success: boolean, data?: any, action?: object, error?: string }>}
 */
export async function executeAssistantTool(user, tenant, toolName, toolArgs = {}, authorizedFeatures = []) {
  await loadServices();

  const orgId = tenant?.orgId || user?.orgId;
  const userId = user?.id || user?._id;

  try {
    switch (toolName) {
      // 1. Community Finance Summary
      case 'get_community_finance_summary': {
        const isPermitted = hasFinancePermission(user);
        const { periodKey, startDate, endDate, readablePeriod } = resolvePeriodBounds(toolArgs?.period);

        if (!isPermitted) {
          return {
            success: true,
            data: {
              authorized: false,
              message: 'Community financial overviews and total community expenses are restricted to community administrators. You can ask for your personal maintenance charges, invoices, or personal expenses.',
            },
            action: {
              type: 'navigation',
              label: 'View My Invoices',
              route: '/(resident)/billing/my-dues',
              targetName: 'My Invoices & Dues',
              category: 'financial_billing',
            },
          };
        }

        if (!communityFinanceService || typeof communityFinanceService.getDashboard !== 'function') {
          return { success: false, error: 'Community finance service is currently unavailable.' };
        }

        const filterQuery = { timezone: 'Asia/Kolkata' };
        if (startDate && endDate) {
          filterQuery.startDate = startDate;
          filterQuery.endDate = endDate;
        }

        const dashboard = await communityFinanceService.getDashboard(orgId, filterQuery);

        const totalExpenses = Number(
          dashboard?.overview?.totalExpensesIncurred ??
          dashboard?.expenses?.summary?.totalExpensesIncurred ??
          dashboard?.totalExpensesIncurred ??
          0
        );
        const totalCollections = Number(
          dashboard?.overview?.grossSuccessfulCollections ??
          dashboard?.grossSuccessfulCollections ??
          0
        );
        const netCollections = Number(
          dashboard?.overview?.netCollectionsAfterRefunds ??
          dashboard?.netCollectionsAfterRefunds ??
          0
        );
        const netSurplusOrDeficit = Number(
          dashboard?.overview?.netSurplusOrDeficit ??
          dashboard?.netSurplusOrDeficit ??
          0
        );
        const maintenanceCollections = Number(
          dashboard?.overview?.maintenanceCollections ??
          (typeof dashboard?.collections === 'object' && !Array.isArray(dashboard?.collections) ? dashboard?.collections?.maintenanceCollections : 0) ??
          0
        );
        const amenityCollections = Number(
          dashboard?.overview?.amenityCollections ??
          (typeof dashboard?.collections === 'object' && !Array.isArray(dashboard?.collections) ? dashboard?.collections?.amenityCollections : 0) ??
          0
        );
        const cumulativeArrears = Number(
          dashboard?.overview?.outstandingDues ??
          dashboard?.invoices?.outstandingDues ??
          0
        );

        const categoryBreakdown = (
          dashboard?.breakdowns?.expense ||
          dashboard?.expenseCategoryAggregates ||
          []
        )
          .slice(0, 5)
          .map((cat) => ({
            category: cat.category || cat._id || 'General',
            amount: Number(cat.amount || 0),
            count: cat.count || 0,
            percentage: Number(cat.percentage || 0),
          }));

        const recentExpenses = (dashboard?.expenses?.records || [])
          .slice(0, 5)
          .map((exp) => ({
            id: String(exp._id),
            expenseNumber: exp.expenseNumber,
            name: exp.name || exp.description || 'Community Expense',
            category: exp.category || 'General',
            amount: Number(exp.totalAmount || 0),
            date: exp.expenseDate ? new Date(exp.expenseDate).toISOString().split('T')[0] : null,
            settlementStatus: exp.settlementStatus || 'UNPAID',
          }));

        const allTimeExpenses = Array.isArray(dashboard?.allTimeSeries) && dashboard.allTimeSeries.length > 0
          ? Math.round(dashboard.allTimeSeries.reduce((s, t) => s + Number(t.expense || 0), 0) * 100) / 100
          : totalExpenses;

        return {
          success: true,
          data: {
            authorized: true,
            period: readablePeriod,
            periodKey,
            currency: '₹ (INR)',
            totalCommunityExpenses: totalExpenses,
            allTimeTotalCommunityExpenses: allTimeExpenses,
            totalCollections,
            netCollections,
            netSurplusOrDeficit,
            isSurplus: netSurplusOrDeficit >= 0,
            maintenanceCollections,
            amenityCollections,
            cumulativeArrears,
            topExpenseCategories: categoryBreakdown,
            recentCommunityExpenses: recentExpenses,
          },
          action: {
            type: 'navigation',
            label: 'View Finance Details',
            route: '/(resident)/admin/billing/community-finance',
            targetName: 'Community Finance Overview',
            category: 'financial_billing',
          },
        };
      }

      // 2. Personal Expense Summary (Resident Utility)
      case 'get_personal_expense_summary': {
        const { periodKey, readablePeriod } = resolvePeriodBounds(toolArgs?.period);

        if (!personalExpenseService || typeof personalExpenseService.dashboard !== 'function') {
          return { success: false, error: 'Personal expense service is currently unavailable.' };
        }

        const pDashboard = await personalExpenseService.dashboard(user, periodKey);

        const income = Number(pDashboard?.incomeMinor || 0) / 100;
        const expense = Number(pDashboard?.expenseMinor || 0) / 100;
        const balance = Number(pDashboard?.balanceMinor || 0) / 100;

        const categories = (pDashboard?.categoryBreakdown || []).map((c) => ({
          category: c.name || c._id || 'General',
          amount: Number(c.amountMinor || 0) / 100,
        }));

        const budgets = (pDashboard?.budgets || []).map((b) => {
          const budgetLimit = Number(b.amountMinor || 0) / 100;
          const catSpent = categories.find((c) => c.category.toLowerCase() === (b.categoryName || '').toLowerCase() || c.id === b.categoryId)?.amount || 0;
          const remaining = Math.max(0, budgetLimit - catSpent);
          const utilization = budgetLimit > 0 ? Math.round((catSpent / budgetLimit) * 100) : 0;
          return {
            categoryId: b.categoryId,
            categoryName: b.categoryName,
            budgetLimit,
            spent: catSpent,
            remaining,
            utilizationPercent: utilization,
          };
        });

        const recentTransactions = (pDashboard?.recentTransactions || []).slice(0, 5).map((t) => ({
          id: t._id || t.id,
          merchantOrSource: t.merchantOrSource || t.categoryName || 'Expense',
          categoryName: t.categoryName || 'General',
          amount: Number(t.amountMinor || 0) / 100,
          date: t.transactionDate,
          paymentMethod: t.paymentMethod || 'UPI',
          type: t.type || 'EXPENSE',
        }));

        let filteredCategory = null;
        if (toolArgs?.category) {
          const kw = String(toolArgs.category).toLowerCase().trim();
          const match = categories.find((c) => c.category.toLowerCase().includes(kw));
          if (match) {
            filteredCategory = match;
          }
        }

        return {
          success: true,
          data: {
            period: readablePeriod,
            periodKey,
            currency: '₹ (INR)',
            personalIncome: income,
            personalExpenses: expense,
            netBalance: balance,
            topCategories: categories.slice(0, 5),
            categoryBreakdown: categories,
            budgets,
            recentTransactions,
            ...(filteredCategory ? { filteredCategory } : {}),
          },
          action: {
            type: 'navigation',
            label: 'Open Expense Manager',
            route: '/(resident)/expense-manager',
            targetName: 'Personal Expense Manager',
            category: 'personal_finance',
          },
        };
      }

      // 2b. Prepare Personal Expense Creation
      case 'prepare_personal_expense': {
        const amount = Number(toolArgs?.amount);
        if (amount == null || !Number.isFinite(amount) || isNaN(amount) || amount <= 0) {
          return { success: false, error: 'Please provide a valid expense amount greater than zero.' };
        }

        const rawCat = (toolArgs?.category || '').trim();
        let categoryId = 'other_expense';
        let categoryName = 'Other Expense';
        const presetCategories = [
          { id: 'food_dining', name: 'Food and Dining', match: /food|dining|restaurant|lunch|dinner|breakfast|cafe|swiggy|zomato/i },
          { id: 'groceries', name: 'Groceries', match: /grocer|supermarket|vegetable|fruit|milk|provisions|zepto|blinkit|instamart/i },
          { id: 'transport', name: 'Transport', match: /transport|fuel|petrol|diesel|cab|taxi|uber|ola|auto|metro|toll/i },
          { id: 'shopping', name: 'Shopping', match: /shop|cloth|amazon|flipkart|myntra|shoes|electronics/i },
          { id: 'utilities', name: 'Utilities', match: /utility|utilities|electricity|power|water|gas|wifi|broadband|internet|recharge/i },
          { id: 'rent', name: 'Rent', match: /rent|lease/i },
          { id: 'medical', name: 'Medical', match: /med|doctor|pharmacy|hospital|health|medicine|apollo/i },
          { id: 'entertainment', name: 'Entertainment', match: /entertain|movie|cinema|netflix|prime|hotstar|game|event/i },
          { id: 'other_expense', name: 'Other Expense', match: /.*/ },
        ];
        if (rawCat) {
          const matched = presetCategories.find(p => p.id === rawCat.toLowerCase() || p.match.test(rawCat));
          if (matched) {
            categoryId = matched.id;
            categoryName = matched.name;
          }
        }

        const dateStr = toolArgs?.date || new Date().toISOString().split('T')[0];
        const validMethods = ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'WALLET', 'OTHER'];
        const rawMethod = (toolArgs?.paymentMethod || 'UPI').trim().toUpperCase();
        const paymentMethod = validMethods.includes(rawMethod) ? rawMethod : 'UPI';
        const merchantOrSource = (toolArgs?.merchantOrSource || '').trim() || categoryName;
        const notes = toolArgs?.notes ? String(toolArgs.notes).trim() : undefined;

        const actionParams = {
          amount,
          categoryId,
          categoryName,
          transactionDate: dateStr,
          paymentMethod,
          paymentSettlement: 'PAID',
          merchantOrSource,
          ...(notes ? { notes } : {}),
        };

        const summary = `Record personal expense of ₹${amount} for ${merchantOrSource} (${categoryName}) on ${dateStr}`;

        const proposal = createPendingActionProposal({
          actionType: 'CREATE_PERSONAL_EXPENSE',
          userId,
          orgId,
          params: actionParams,
          summary,
        });

        return {
          success: true,
          data: {
            proposalReady: true,
            actionId: proposal.actionId,
            confirmationToken: proposal.confirmationToken,
            expiresAt: proposal.expiresAt,
            actionType: 'CREATE_PERSONAL_EXPENSE',
            summary,
            amount,
            category: categoryName,
            categoryId,
            merchantOrSource,
            date: dateStr,
            paymentMethod,
            message: `I have prepared your personal expense entry: ₹${amount} for ${merchantOrSource} (${categoryName}) on ${dateStr} via ${paymentMethod}. Please confirm to record this transaction.`,
          },
          action: {
            type: 'confirmation',
            actionType: 'CREATE_PERSONAL_EXPENSE',
            actionId: proposal.actionId,
            confirmationToken: proposal.confirmationToken,
            title: 'Confirm Personal Expense',
            confirmLabel: 'Confirm Expense',
            cancelLabel: 'Cancel',
            summary,
            details: {
              'Amount': `₹${amount}`,
              'For / Merchant': merchantOrSource,
              'Category': categoryName,
              'Date': dateStr,
              'Payment': paymentMethod,
            },
          },
        };
      }

      // 2c. Preview Receipt OCR
      case 'preview_receipt_ocr': {
        const text = toolArgs?.receiptText;
        if (!text || typeof text !== 'string') {
          return { success: false, error: 'Receipt text is required for preview.' };
        }

        let parsed = null;
        if (typeof injectedServices.parseReceiptText === 'function') {
          parsed = injectedServices.parseReceiptText(text);
        } else if (typeof parseReceiptTextFn === 'function') {
          parsed = parseReceiptTextFn(text);
        } else {
          try {
            const mod = await import('../personalExpense/ocr/receiptParser.js');
            parsed = mod.parseReceiptText(text);
          } catch (e) {
            logger.warn(`Failed to run receipt parser: ${e.message}`);
          }
        }

        if (!parsed) {
          return { success: false, error: 'Could not parse receipt text.' };
        }

        return {
          success: true,
          data: {
            extracted: true,
            totalAmount: parsed.totalAmount,
            currency: '₹ (INR)',
            merchant: parsed.merchant || 'Unknown Merchant',
            category: parsed.inferredCategory?.category || 'General',
            receiptDate: parsed.receiptDate || new Date().toISOString().split('T')[0],
            documentType: parsed.documentType,
            itemsCount: (parsed.items || []).length,
            items: (parsed.items || []).slice(0, 5),
            suggestedNotes: parsed.suggestedNotes,
            message: `Receipt parsed: Found ${parsed.merchant || 'merchant'} for ₹${parsed.totalAmount || 0} on ${parsed.receiptDate || 'recent date'}. Would you like me to prepare an expense entry with these details?`,
          },
          action: {
            type: 'navigation',
            label: 'Open Expense Manager',
            route: '/(resident)/expense-manager',
            targetName: 'Personal Expense Manager',
            category: 'personal_finance',
          },
        };
      }

      // 3. Resident Dues & Invoices
      case 'get_resident_dues_and_invoices': {
        if (!invoiceServices || typeof invoiceServices.getUserDuesOverview !== 'function') {
          return { success: false, error: 'Invoice service is currently unavailable.' };
        }

        const duesOverview = await invoiceServices.getUserDuesOverview(user, orgId);

        const totalOutstanding = Number(
          duesOverview?.personalDues?.totalPortfolioDue ??
          duesOverview?.personalDues?.totalOutstanding ??
          0
        );

        const unitBreakdown = duesOverview?.personalDues?.unitBreakdown || [];
        const rawRecent = duesOverview?.recentInvoices || [];

        // Sum invoice demand across active invoices
        const totalDemand = unitBreakdown.reduce((sum, inv) => {
          return sum + Number(inv.totalDue || inv.currentCharge || 0);
        }, 0);

        // Sum paid amount
        const totalPaid = unitBreakdown.reduce((sum, inv) => {
          return sum + Number(inv.paidAmount || 0);
        }, 0);

        // Calculate overdue amount
        const now = new Date();
        const overdueAmount = Number(
          duesOverview?.personalDues?.overdueAmount ??
          unitBreakdown.reduce((sum, inv) => {
            const isOverdue = inv.status === 'OVERDUE' || (inv.dueDate && new Date(inv.dueDate) < now && Number(inv.outstandingAmount || 0) > 0);
            return isOverdue ? sum + Number(inv.outstandingAmount || 0) : sum;
          }, 0)
        );

        // Extract distinct billing periods
        const billingPeriods = [...new Set(unitBreakdown.map(inv => inv.billingPeriodString).filter(Boolean))];

        const unpaidInvoices = unitBreakdown.slice(0, 5).map((inv) => ({
          invoiceNumber: inv.invoiceNumber,
          billingPeriod: inv.billingPeriodString || 'Current Period',
          totalDue: Number(inv.totalDue || inv.currentCharge || 0),
          paidAmount: Number(inv.paidAmount || 0),
          outstandingAmount: Number(inv.outstandingAmount || 0),
          status: inv.status,
          dueDate: inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'Due on receipt',
          isOverdue: inv.status === 'OVERDUE' || (inv.dueDate && new Date(inv.dueDate) < now),
        }));

        const verifiedRecentPayments = rawRecent
          .filter((inv) => inv.status === 'PAID' || Number(inv.paidAmount || 0) > 0)
          .slice(0, 3)
          .map((inv) => ({
            invoiceNumber: inv.invoiceNumber,
            paidAmount: Number(inv.paidAmount || inv.totalAmount || 0),
            paymentDate: inv.paid_at || inv.paymentDate ? new Date(inv.paid_at || inv.paymentDate).toLocaleDateString() : 'Recorded',
            paymentMethod: inv.paymentMethod || 'Online',
            status: inv.status,
          }));

        return {
          success: true,
          data: {
            currency: '₹ (INR)',
            totalOutstandingDues: totalOutstanding,
            totalDemand,
            totalPaid,
            overdueAmount,
            hasOutstandingDues: totalOutstanding > 0,
            isFullyPaid: totalOutstanding === 0,
            billingPeriods,
            unpaidInvoices,
            verifiedRecentPayments,
          },
          action: {
            type: 'navigation',
            label: 'View My Invoices',
            route: '/(resident)/billing/my-dues',
            targetName: 'My Invoices & Dues',
            category: 'financial_billing',
          },
        };
      }

      case 'prepare_assessment_creation': {
        if (!assessmentService || typeof assessmentService.createAssessment !== 'function') {
          return { success: false, error: 'Assessment service is currently unavailable.' };
        }

        if (!hasAssessmentAdminPermission(user)) {
          return {
            success: false,
            error: 'Permission Denied: Only community administrators or billing managers can configure community maintenance assessments.',
          };
        }

        const name = (toolArgs?.name || '').trim();
        const flatAmount = Number(toolArgs?.flatAmount ?? 0);

        if (!name) {
          return {
            success: false,
            error: 'Assessment name is required to create a community maintenance assessment.',
          };
        }

        if (isNaN(flatAmount) || flatAmount <= 0) {
          return {
            success: false,
            error: 'A valid positive flat amount is required to configure a maintenance assessment.',
          };
        }

        const type = (toolArgs?.type || 'RECURRING').toUpperCase();
        const billingCycle = (toolArgs?.billingCycle || (type === 'ONE_TIME' ? 'AD_HOC' : 'MONTHLY')).toUpperCase();
        const targetScopeType = (toolArgs?.targetScopeType || 'ALL_COMMUNITY').toUpperCase();
        const description = (toolArgs?.description || `${name} community assessment`).trim();

        const actionParams = {
          communityId: orgId,
          name,
          type: ['RECURRING', 'ONE_TIME', 'CAPITAL_REPAIR'].includes(type) ? type : 'RECURRING',
          billingCycle: ['MONTHLY', 'QUARTERLY', 'ANNUALLY', 'WEEKLY', 'AD_HOC'].includes(billingCycle) ? billingCycle : 'MONTHLY',
          generationDay: 1,
          triggerMode: 'IMMEDIATE',
          collectionMethod: 'LUMP_SUM',
          totalInstallments: 1,
          targetScope: {
            type: ['ALL_COMMUNITY', 'VILLA_BLOCK', 'UNIT_TYPE', 'SPECIFIC_UNITS', 'SPECIFIC_USERS'].includes(targetScopeType) ? targetScopeType : 'ALL_COMMUNITY',
            scopeIds: [],
            targetRole: 'BOTH',
            targetRoleIds: [],
          },
          calculationMethod: {
            type: 'FLAT_RATE',
            flatAmount,
          },
          dueGraceDays: 15,
          description,
        };

        const summary = `Create maintenance assessment "${name}" for ${targetScopeType === 'ALL_COMMUNITY' ? 'all community residents' : targetScopeType} of ₹${flatAmount.toLocaleString('en-IN')} (${billingCycle.toLowerCase()}).`;

        const proposal = createPendingActionProposal({
          actionType: 'CREATE_ASSESSMENT',
          userId,
          orgId,
          params: actionParams,
          summary,
        });

        return {
          success: true,
          data: {
            proposalReady: true,
            confirmationRequired: true,
            actionId: proposal.actionId,
            confirmationToken: proposal.confirmationToken,
            expiresAt: proposal.expiresAt,
            actionType: 'CREATE_ASSESSMENT',
            summary,
            assessmentName: name,
            amount: `₹${flatAmount.toLocaleString('en-IN')}`,
            scope: targetScopeType === 'ALL_COMMUNITY' ? 'All Residents' : targetScopeType,
            billingCycle,
            message: `I have prepared the proposal for assessment "${name}" (₹${flatAmount.toLocaleString('en-IN')} for ${targetScopeType === 'ALL_COMMUNITY' ? 'all community residents' : targetScopeType}). Please confirm to create the assessment template.`,
          },
          action: {
            type: 'confirmation',
            actionType: 'CREATE_ASSESSMENT',
            actionId: proposal.actionId,
            confirmationToken: proposal.confirmationToken,
            title: `Create Assessment: ${name}`,
            targetName: 'Assessment Manager',
            route: '/(resident)/admin/billing/assessments',
            confirmLabel: 'Confirm & Create',
            cancelLabel: 'Cancel',
            summary,
            details: {
              'Assessment': name,
              'Scope': targetScopeType === 'ALL_COMMUNITY' ? 'All Residents' : targetScopeType,
              'Amount': `₹${flatAmount.toLocaleString('en-IN')}`,
              'Cycle': billingCycle,
            },
          },
        };
      }

            // 4. Amenities Catalog
      case 'get_amenities_catalog': {
        if (!amenityService || typeof amenityService.getAllAmenities !== 'function') {
          return { success: false, error: 'Amenity service is currently unavailable.' };
        }

        const rawList = await amenityService.getAllAmenities(orgId, { status: 'active' });
        const list = Array.isArray(rawList) && rawList.length > 0
          ? rawList
          : await amenityService.getAllAmenities(orgId, {}).catch(() => []);

        const catalog = (Array.isArray(list) ? list : []).filter(a => !a.isDeleted).slice(0, 6).map((a) => {
          const rate = a.pricing?.baseRate || 0;
          const pType = a.pricing?.pricingType || 'hourly';
          const priceDisplay = rate === 0 ? 'Free' : `₹${rate}/${pType}`;
          const openTime = a.bookingRules?.openTime || '06:00';
          const closeTime = a.bookingRules?.closeTime || '22:00';

          return {
            id: a._id,
            name: a.name,
            category: a.category || a.type || 'General',
            type: a.type,
            capacity: a.capacity,
            pricing: priceDisplay,
            operationalHours: `${openTime} - ${closeTime}`,
            location: a.location || 'Community Premises',
          };
        });

        const hasAdminAccess = hasFinancePermission(user) || (Array.isArray(user?.permissions) && user.permissions.includes('amenities:master'));

        return {
          success: true,
          data: {
            count: catalog.length,
            amenities: catalog,
            emptyMessage: catalog.length === 0
              ? 'No active amenities are currently listed in the community catalog.'
              : undefined,
          },
          action: {
            type: 'navigation',
            label: catalog.length === 0 && hasAdminAccess ? 'Configure Amenity Master' : 'Discover Amenities',
            route: catalog.length === 0 && hasAdminAccess ? '/(resident)/admin/amenities/master' : '/(resident)/amenities/discover',
            targetName: catalog.length === 0 && hasAdminAccess ? 'Amenity Master' : 'Discover Amenities',
            category: 'amenities',
          },
        };
      }

      // 4b. Check Specific Amenity Availability
      case 'check_amenity_availability': {
        if (!amenityService || typeof amenityService.getAllAmenities !== 'function') {
          return { success: false, error: 'Amenity service is currently unavailable.' };
        }

        const amenityKeyword = (toolArgs?.amenityName || '').trim();
        const dateStr = toolArgs?.date || new Date().toISOString().split('T')[0];

        const allAmenities = await amenityService.getAllAmenities(orgId, {});
        const targetAmenity = (Array.isArray(allAmenities) ? allAmenities : []).find((a) => {
          if (!a || a.isDeleted) return false;
          const aName = (a.name || '').toLowerCase();
          const aType = (a.type || '').toLowerCase();
          const kw = amenityKeyword.toLowerCase();
          return aName.includes(kw) || kw.includes(aName) || aType.includes(kw);
        });

        if (!targetAmenity) {
          return {
            success: true,
            data: {
              found: false,
              message: `Could not find an amenity matching "${amenityKeyword}". Available amenities: ${(allAmenities || []).map(a => a.name).join(', ') || 'None'}.`,
            },
            action: {
              type: 'navigation',
              label: 'Discover Amenities',
              route: '/(resident)/amenities/discover',
              targetName: 'Discover Amenities',
              category: 'amenities',
            },
          };
        }

        let slots = [];
        try {
          slots = await amenityService.getAvailableSlots(targetAmenity._id, orgId, dateStr);
        } catch (slotErr) {
          logger.warn(`[AIAssistantTools] getAvailableSlots failed: ${slotErr.message}`);
        }

        const rate = targetAmenity.pricing?.baseRate || 0;
        const pType = targetAmenity.pricing?.pricingType || 'hourly';
        const priceDisplay = rate === 0 ? 'Free' : `₹${rate}/${pType}`;
        const sampleSlots = (slots || []).slice(0, 8).map(s => `${s.startTime} - ${s.endTime}`);

        return {
          success: true,
          data: {
            found: true,
            amenityId: targetAmenity._id,
            name: targetAmenity.name,
            category: targetAmenity.type || targetAmenity.category,
            location: targetAmenity.location || 'Community Premises',
            date: dateStr,
            pricing: priceDisplay,
            availableSlotsCount: slots.length,
            availableSlots: sampleSlots,
            operatingHours: `${targetAmenity.bookingRules?.openTime || '06:00'} - ${targetAmenity.bookingRules?.closeTime || '22:00'}`,
          },
          action: {
            type: 'navigation',
            label: `Book ${targetAmenity.name}`,
            route: `/(resident)/amenities/${targetAmenity._id}?date=${dateStr}`,
            targetName: targetAmenity.name,
            category: 'amenities',
          },
        };
      }

      // 4c. My Bookings
      case 'get_my_bookings': {
        if (!amenityBookingService || typeof amenityBookingService.getMyBookings !== 'function') {
          return { success: false, error: 'Amenity booking service is currently unavailable.' };
        }

        const filters = {};
        if (toolArgs?.status) filters.status = toolArgs.status;
        if (toolArgs?.startDate) filters.startDate = toolArgs.startDate;
        if (toolArgs?.endDate) filters.endDate = toolArgs.endDate;

        const bookings = await amenityBookingService.getMyBookings(userId, orgId, filters);
        const list = (Array.isArray(bookings) ? bookings : []).slice(0, 5).map(b => ({
          bookingId: b.bookingId || b._id,
          amenityName: b.amenity?.name || b.amenityName || 'Community Facility',
          bookingDate: b.bookingDate ? new Date(b.bookingDate).toLocaleDateString() : 'Upcoming',
          timeSlot: `${b.startTime || ''} - ${b.endTime || ''}`,
          status: b.status,
          hasPass: Boolean(b.qrCode || b.accessPassCode),
        }));

        const rangeLabel = toolArgs?.dateRangeLabel || (toolArgs?.startDate ? `for ${toolArgs.startDate}` : '');
        const emptyMsg = list.length === 0
          ? `You do not have any active amenity bookings ${rangeLabel ? rangeLabel : 'at this time'}.`.replace(/\s+/g, ' ')
          : undefined;

        return {
          success: true,
          data: {
            count: list.length,
            dateRangeLabel: toolArgs?.dateRangeLabel,
            startDate: toolArgs?.startDate,
            endDate: toolArgs?.endDate,
            bookings: list,
            emptyMessage: emptyMsg,
          },
          action: {
            type: 'navigation',
            label: 'View My Bookings',
            route: '/(resident)/amenities/my-bookings',
            targetName: 'My Amenity Bookings',
            category: 'amenities',
          },
        };
      }

      // 4d. Prepare Amenity Booking Proposal
      case 'prepare_amenity_booking': {
        if (!amenityService || typeof amenityService.getAllAmenities !== 'function') {
          return { success: false, error: 'Amenity service is currently unavailable.' };
        }

        const amenityKeyword = (toolArgs?.amenityName || '').trim();
        const dateStr = toolArgs?.date || new Date().toISOString().split('T')[0];
        const slotTime = toolArgs?.slotTime || '10:00';

        const allAmenities = await amenityService.getAllAmenities(orgId, {});
        const targetAmenity = (Array.isArray(allAmenities) ? allAmenities : []).find((a) => {
          if (!a || a.isDeleted) return false;
          const aName = (a.name || '').toLowerCase();
          const aType = (a.type || '').toLowerCase();
          const kw = amenityKeyword.toLowerCase();
          return aName.includes(kw) || kw.includes(aName) || aType.includes(kw);
        });

        if (!targetAmenity) {
          return {
            success: false,
            error: `Could not find amenity "${amenityKeyword}" to prepare booking.`,
          };
        }

        if (targetAmenity.status && targetAmenity.status !== 'active') {
          return {
            success: false,
            error: `${targetAmenity.name} is currently ${targetAmenity.status} and cannot be booked.`,
          };
        }

        // Calculate slot end time (default to 1 hour slot)
        const [h, m] = slotTime.split(':').map(Number);
        const endH = (h + 1) % 24;
        const endTime = `${String(endH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;

        // Verify slot availability
        if (typeof amenityService.getAvailableSlots === 'function') {
          try {
            const slots = await amenityService.getAvailableSlots(targetAmenity._id, orgId, dateStr);
            const hasSlot = (slots || []).some((s) => s.startTime === slotTime);
            if (slots && slots.length > 0 && !hasSlot) {
              const openList = slots.slice(0, 4).map((s) => `${s.startTime} - ${s.endTime}`).join(', ');
              return {
                success: false,
                error: `Slot ${slotTime} is not available for ${targetAmenity.name} on ${dateStr}. Available slots: ${openList}`,
              };
            }
          } catch (slotErr) {
            logger.warn(`[AIAssistantTools] slot check warning: ${slotErr.message}`);
          }
        }

        const rate = targetAmenity.pricing?.baseRate || 0;
        const priceDisplay = rate === 0 ? 'Free' : `₹${rate}`;

        let residentWalletBalance = 0;
        let isWalletShort = false;
        if (rate > 0 && walletService && typeof walletService.getWallet === 'function') {
          try {
            const w = await walletService.getWallet(userId, orgId);
            residentWalletBalance = w ? (Number(w.balance) || 0) : 0;
            isWalletShort = residentWalletBalance < rate;
          } catch (wErr) {
            logger.warn(`[AIAssistantTools] Wallet check warning: ${wErr.message}`);
          }
        }

        const actionParams = {
          amenityId: String(targetAmenity._id),
          amenityName: targetAmenity.name,
          dateStr,
          startTime: slotTime,
          endTime,
          numberOfPersons: 1,
          estimatedCost: priceDisplay,
          rateAmount: rate,
          walletBalance: residentWalletBalance,
          isWalletShort,
          preferredPaymentMethod: isWalletShort ? 'ONLINE' : 'WALLET',
        };

        const summary = `Booking for ${targetAmenity.name} on ${dateStr} from ${slotTime} to ${endTime} (${priceDisplay})${isWalletShort ? ' [Insufficient wallet - Online payment required]' : ''}`;

        const proposal = createPendingActionProposal({
          actionType: 'CREATE_AMENITY_BOOKING',
          userId,
          orgId,
          params: actionParams,
          summary,
        });

        const proposalMessage = isWalletShort
          ? `I have prepared your reservation for ${targetAmenity.name} on ${dateStr} from ${slotTime} to ${endTime} (${priceDisplay}). Note: Your wallet balance is ₹${residentWalletBalance}, which is insufficient for this booking. Please click below to proceed with Online Payment (Google Pay, PhonePe, UPI, Card).`
          : `I have prepared your booking for ${targetAmenity.name} on ${dateStr} from ${slotTime} to ${endTime} (${priceDisplay}). Please confirm your reservation to complete it.`;

        const details = {
          'Amenity': targetAmenity.name,
          'Date': dateStr,
          'Time': `${slotTime} - ${endTime}`,
          'Cost': priceDisplay,
        };
        if (rate > 0) {
          details['Payment Method'] = isWalletShort ? 'Online Payment (GPay, PhonePe, UPI, Cards)' : `Digital Wallet (₹${residentWalletBalance} available)`;
          if (isWalletShort) {
            details['Wallet Status'] = `₹${residentWalletBalance} (Insufficient - ₹${rate - residentWalletBalance} short)`;
          }
        }

        const confirmLabel = isWalletShort ? 'Click to Pay Online (GPay / PhonePe / UPI)' : 'Confirm Booking';
        const actionRoute = `/(resident)/amenities/${targetAmenity._id}?date=${dateStr}&slot=${slotTime}${isWalletShort ? '&payOnline=1' : ''}`;

        return {
          success: true,
          data: {
            proposalReady: true,
            confirmationRequired: true,
            actionId: proposal.actionId,
            confirmationToken: proposal.confirmationToken,
            expiresAt: proposal.expiresAt,
            actionType: 'CREATE_AMENITY_BOOKING',
            summary,
            amenityId: String(targetAmenity._id),
            amenityName: targetAmenity.name,
            date: dateStr,
            slotTime: `${slotTime} - ${endTime}`,
            estimatedCost: priceDisplay,
            walletBalance: residentWalletBalance,
            isWalletShort,
            preferredPaymentMethod: isWalletShort ? 'ONLINE' : 'WALLET',
            message: proposalMessage,
          },
          action: {
            type: 'confirmation',
            actionType: 'CREATE_AMENITY_BOOKING',
            actionId: proposal.actionId,
            confirmationToken: proposal.confirmationToken,
            title: `Confirm ${targetAmenity.name} Booking`,
            targetName: `Book ${targetAmenity.name}`,
            route: actionRoute,
            confirmLabel,
            cancelLabel: 'Cancel',
            summary,
            details,
          },
        };
      }

      // 4e. Prepare Amenity Booking Cancellation
      case 'prepare_amenity_booking_cancellation': {
        if (!amenityBookingService || typeof amenityBookingService.getMyBookings !== 'function') {
          return { success: false, error: 'Amenity booking service is currently unavailable.' };
        }

        let targetBooking = null;
        if (toolArgs?.bookingId) {
          if (typeof amenityBookingService.getBookingById === 'function') {
            targetBooking = await amenityBookingService.getBookingById(toolArgs.bookingId, orgId).catch(() => null);
          }
          if (!targetBooking && typeof amenityBookingService.getMyBookings === 'function') {
            const myBookings = await amenityBookingService.getMyBookings(userId, orgId, {});
            const list = Array.isArray(myBookings) ? myBookings : (myBookings?.items || []);
            targetBooking = list.find((b) => String(b._id) === String(toolArgs.bookingId));
          }
        } else {
          const myBookings = await amenityBookingService.getMyBookings(userId, orgId, { status: 'confirmed' });
          const list = Array.isArray(myBookings) ? myBookings : (myBookings?.items || []);
          if (toolArgs?.amenityName) {
            const kw = String(toolArgs.amenityName).toLowerCase().trim();
            targetBooking = list.find((b) => (b.amenity?.name || b.amenityName || '').toLowerCase().includes(kw));
          } else if (list.length === 1) {
            targetBooking = list[0];
          }
        }

        if (!targetBooking) {
          return {
            success: false,
            error: 'Could not find an active or confirmed booking matching your request to cancel.',
          };
        }

        const bookingUserId = String(targetBooking.userId?._id || targetBooking.userId);
        if (bookingUserId !== String(userId) && !hasFinancePermission(user)) {
          return {
            success: false,
            error: 'Forbidden. You can only cancel bookings made by your account.',
          };
        }

        if (['rejected', 'cancelled', 'checked-in', 'completed'].includes(targetBooking.status)) {
          return {
            success: false,
            error: `Booking cannot be cancelled because its current status is ${targetBooking.status}.`,
          };
        }

        const aName = targetBooking.amenity?.name || targetBooking.amenityName || 'Amenity Facility';
        const bDate = targetBooking.bookingDate ? new Date(targetBooking.bookingDate).toLocaleDateString() : 'Upcoming';
        const timeSlot = `${targetBooking.startTime || ''} - ${targetBooking.endTime || ''}`;
        const bookingId = String(targetBooking._id);
        const summary = `Cancel booking for ${aName} on ${bDate} (${timeSlot})`;

        const proposal = createPendingActionProposal({
          actionType: 'CANCEL_AMENITY_BOOKING',
          userId,
          orgId,
          params: { bookingId, amenityName: aName, date: bDate, timeSlot },
          summary,
        });

        return {
          success: true,
          data: {
            proposalReady: true,
            actionId: proposal.actionId,
            confirmationToken: proposal.confirmationToken,
            expiresAt: proposal.expiresAt,
            actionType: 'CANCEL_AMENITY_BOOKING',
            summary,
            bookingId,
            amenityName: aName,
            date: bDate,
            timeSlot,
            message: `Are you sure you want to cancel your booking for ${aName} on ${bDate} (${timeSlot})? Please confirm to cancel.`,
          },
          action: {
            type: 'confirmation',
            actionType: 'CANCEL_AMENITY_BOOKING',
            actionId: proposal.actionId,
            confirmationToken: proposal.confirmationToken,
            title: `Cancel ${aName} Booking`,
            confirmLabel: 'Cancel Booking',
            cancelLabel: 'Keep Booking',
            summary,
            details: {
              'Amenity': aName,
              'Date': bDate,
              'Slot': timeSlot,
            },
          },
        };
      }

      case 'prepare_amenity_creation': {
        if (!amenityService || typeof amenityService.createAmenity !== 'function') {
          return { success: false, error: 'Amenity service is currently unavailable.' };
        }

        if (!hasAmenityAdminPermission(user)) {
          return {
            success: false,
            error: 'Permission Denied: Only community administrators and facility managers can configure or add new amenities to Amenity Master.',
          };
        }

        const name = (toolArgs?.name || '').trim();
        if (!name) {
          return {
            success: false,
            error: 'Amenity name is required to create a new amenity facility.',
          };
        }

        // Check for duplicate amenity name in this community
        const allExisting = await amenityService.getAllAmenities(orgId, {}).catch(() => []);
        const duplicate = (Array.isArray(allExisting) ? allExisting : []).find(
          (a) => !a.isDeleted && (a.name || '').toLowerCase() === name.toLowerCase()
        );
        if (duplicate) {
          return {
            success: false,
            error: `An amenity with the name "${name}" already exists in the community catalog.`,
          };
        }

        const rawType = (toolArgs?.type || '').toLowerCase();
        let normalizedType = 'court';
        if (rawType.includes('gym') || rawType.includes('fitness') || rawType.includes('workout')) {
          normalizedType = 'gym';
        } else if (rawType.includes('pool') || rawType.includes('swim')) {
          normalizedType = 'pool';
        } else if (rawType.includes('club') || rawType.includes('lounge')) {
          normalizedType = 'clubhouse';
        } else if (rawType.includes('hall') || rawType.includes('party') || rawType.includes('event')) {
          normalizedType = 'hall';
        } else if (rawType.includes('sport')) {
          normalizedType = 'Sports';
        } else if (rawType.includes('court') || rawType.includes('basket') || rawType.includes('tennis') || rawType.includes('badminton') || rawType.includes('squash')) {
          normalizedType = 'court';
        } else {
          normalizedType = 'court';
        }

        const pricingType = (toolArgs?.pricingType || 'hourly').toLowerCase();
        const ratePerHour = Math.max(0, Number(toolArgs?.ratePerHour ?? 0));
        const capacity = Math.max(1, Number(toolArgs?.capacity || 10));
        const slotDurationMinutes = Math.max(15, Number(toolArgs?.slotDurationMinutes || 60));
        const openTime = toolArgs?.openTime || '06:00';
        const closeTime = toolArgs?.closeTime || '22:00';
        const location = toolArgs?.location || 'Community Campus';
        const description = toolArgs?.description || `${name} facility.`;
        const priceDisplay = ratePerHour > 0 ? `₹${ratePerHour} per slot` : 'Free';

        const actionParams = {
          name,
          type: normalizedType,
          description,
          location,
          capacity,
          pricing: {
            baseRate: ratePerHour,
            pricingType: pricingType === 'daily' ? 'daily' : 'hourly',
            peakRateMultiplier: 1.0,
            weekendRateMultiplier: 1.0,
            holidayRateMultiplier: 1.0,
            securityDeposit: 0,
            taxPercentage: 0,
            cancellationChargePercentage: 0,
            dynamicPricingEnabled: false,
          },
          ratePerHour,
          openDays: [0, 1, 2, 3, 4, 5, 6],
          bookingRules: {
            slotDurationMinutes,
            bufferTimeMinutes: 0,
            openTime,
            closeTime,
            maxBookingsPerUserPerSlot: 1,
            advanceBookingDays: 7,
            minAdvanceBookingHours: 0,
            isCancellationEnabled: true,
            cancellationRefundRules: [
              { cancelBeforeHours: 2, refundPercentage: 100 },
            ],
            weeklyOffDays: [],
          },
          maxBookingsPerUserPerSlot: 1,
          status: 'active',
        };

        const summary = `Create new facility "${name}" (${normalizedType}) in Amenity Master with capacity of ${capacity} members, priced at ${priceDisplay} (${openTime} - ${closeTime}).`;

        const proposal = createPendingActionProposal({
          actionType: 'CREATE_AMENITY',
          userId,
          orgId,
          params: actionParams,
          summary,
        });

        return {
          success: true,
          data: {
            proposalReady: true,
            confirmationRequired: true,
            actionId: proposal.actionId,
            confirmationToken: proposal.confirmationToken,
            expiresAt: proposal.expiresAt,
            actionType: 'CREATE_AMENITY',
            summary,
            amenityName: name,
            type: normalizedType,
            capacity,
            rate: priceDisplay,
            timings: `${openTime} - ${closeTime}`,
            message: `I have prepared the configuration to add "${name}" to the Amenity Master catalog. Please review the details below and confirm to create it.`,
          },
          action: {
            type: 'confirmation',
            actionType: 'CREATE_AMENITY',
            actionId: proposal.actionId,
            confirmationToken: proposal.confirmationToken,
            title: `Create Amenity: ${name}`,
            targetName: 'Amenity Master',
            route: '/(resident)/amenities/admin-master',
            confirmLabel: 'Confirm & Create',
            cancelLabel: 'Cancel',
            summary,
            details: {
              'Amenity': name,
              'Type': normalizedType,
              'Capacity': `${capacity} members`,
              'Price': priceDisplay,
              'Hours': `${openTime} - ${closeTime}`,
            },
          },
        };
      }

      case 'prepare_poll_creation': {
        if (!pollServices || (typeof pollServices.createPoll !== 'function' && typeof pollServices.default?.createPoll !== 'function')) {
          return { success: false, error: 'Poll service is currently unavailable.' };
        }

        if (!hasPollAdminPermission(user)) {
          return {
            success: false,
            error: 'Permission Denied: Only community administrators and poll managers can create community voting polls.',
          };
        }

        const question = (toolArgs?.question || toolArgs?.title || '').trim();
        if (!question) {
          return { success: false, error: 'Poll question or headline is required.' };
        }

        let rawOptions = toolArgs?.options;
        if (typeof rawOptions === 'string') {
          rawOptions = rawOptions.split(/,|\n/).map((s) => s.trim()).filter(Boolean);
        }
        if (!Array.isArray(rawOptions) || rawOptions.length < 2) {
          rawOptions = ['Yes', 'No'];
        }
        const options = rawOptions.map((opt) => (typeof opt === 'string' ? opt.trim() : (opt.text || '').trim())).filter(Boolean);

        const category = toolArgs?.category || 'General';
        const isAnonymous = Boolean(toolArgs?.isAnonymous);
        const endDate = toolArgs?.endDate ? new Date(toolArgs.endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const actionParams = {
          question,
          title: question,
          options,
          category,
          isAnonymous,
          endDate: endDate.toISOString(),
          votingMode: 'ONE_PER_USER',
          choiceType: 'SINGLE_CHOICE',
          description: toolArgs?.description || '',
        };

        const summary = `Create Poll: "${question}" with options [${options.join(', ')}]`;

        const proposal = createPendingActionProposal({
          actionType: 'CREATE_POLL',
          userId,
          orgId,
          params: actionParams,
          summary,
        });

        return {
          success: true,
          data: {
            proposalReady: true,
            confirmationRequired: true,
            actionId: proposal.actionId,
            confirmationToken: proposal.confirmationToken,
            expiresAt: proposal.expiresAt,
            actionType: 'CREATE_POLL',
            summary,
            question,
            options,
            category,
            isAnonymous,
            endDate: endDate.toISOString().split('T')[0],
            message: `I have prepared the community poll: "${question}" with options ${options.map((o) => `"${o}"`).join(', ')}. Please confirm to publish this poll for community voting.`,
          },
          action: {
            type: 'confirmation',
            actionType: 'CREATE_POLL',
            actionId: proposal.actionId,
            confirmationToken: proposal.confirmationToken,
            title: `Create Poll: "${question}"`,
            targetName: 'Community Polls',
            route: '/(resident)/polls/active',
            confirmLabel: 'Confirm & Publish Poll',
            cancelLabel: 'Cancel',
            summary,
            details: {
              'Question': question,
              'Options': options.join(' | '),
              'Category': category,
              'Anonymous': isAnonymous ? 'Yes' : 'No',
              'Closes On': endDate.toISOString().split('T')[0],
            },
          },
        };
      }

      case 'prepare_notice_creation': {
        if (!noticeBoardService || (typeof noticeBoardService.createNotice !== 'function' && typeof noticeBoardService.default?.createNotice !== 'function')) {
          return { success: false, error: 'Notice board service is currently unavailable.' };
        }

        if (!hasNoticeAdminPermission(user)) {
          return {
            success: false,
            error: 'Permission Denied: Only community administrators and notice managers can post official notices on the Notice Board.',
          };
        }

        const title = (toolArgs?.title || '').trim();
        const description = (toolArgs?.description || toolArgs?.content || toolArgs?.body || '').trim();
        if (!title) {
          return { success: false, error: 'Notice title is required.' };
        }
        if (!description) {
          return { success: false, error: 'Notice description or announcement body is required.' };
        }

        const category = toolArgs?.category || 'General';
        const priority = ['Low', 'Medium', 'High', 'Critical'].includes(toolArgs?.priority) ? toolArgs.priority : 'Medium';
        const isPinned = Boolean(toolArgs?.isPinned);
        const requiresAcknowledgement = Boolean(toolArgs?.requiresAcknowledgement);
        const expiryDate = toolArgs?.expiryDate ? new Date(toolArgs.expiryDate).toISOString() : null;

        const actionParams = {
          title,
          description,
          category,
          priority,
          isPinned,
          requiresAcknowledgement,
          expiryDate,
          status: 'Published',
        };

        const summary = `Post Notice: "${title}" (${priority} Priority, ${category})`;

        const proposal = createPendingActionProposal({
          actionType: 'CREATE_NOTICE',
          userId,
          orgId,
          params: actionParams,
          summary,
        });

        return {
          success: true,
          data: {
            proposalReady: true,
            confirmationRequired: true,
            actionId: proposal.actionId,
            confirmationToken: proposal.confirmationToken,
            expiresAt: proposal.expiresAt,
            actionType: 'CREATE_NOTICE',
            summary,
            title,
            description,
            category,
            priority,
            isPinned,
            requiresAcknowledgement,
            message: `I have prepared the community notice: "${title}" [${priority} Priority]. Please review and confirm to publish it to the Notice Board.`,
          },
          action: {
            type: 'confirmation',
            actionType: 'CREATE_NOTICE',
            actionId: proposal.actionId,
            confirmationToken: proposal.confirmationToken,
            title: `Publish Notice: "${title}"`,
            targetName: 'Community Notice Board',
            route: '/(resident)/notices',
            confirmLabel: 'Confirm & Publish Notice',
            cancelLabel: 'Cancel',
            summary,
            details: {
              'Title': title,
              'Category': category,
              'Priority': priority,
              'Pinned': isPinned ? 'Yes' : 'No',
              'Requires Read Receipt': requiresAcknowledgement ? 'Yes' : 'No',
            },
          },
        };
      }

      // 5. Resident Complaints & Tickets
      case 'get_my_complaints': {
        if (!complaintService || typeof complaintService.getComplaints !== 'function') {
          return { success: false, error: 'Complaint service is currently unavailable.' };
        }

        const filter = { residentId: userId };
        if (toolArgs?.status && toolArgs.status !== 'ALL') {
          const s = String(toolArgs.status).trim().toLowerCase();
          if (s === 'open' || s === 'pending') {
            filter.status = { $in: ['Open', 'Submitted', 'Waiting For Assignment', 'Waiting For Acceptance', 'Assigned', 'Accepted', 'In Progress'] };
          } else if (s === 'resolved' || s === 'completed' || s === 'closed') {
            filter.status = { $in: ['Work Completed', 'Completed', 'Closed', 'Resolved'] };
          } else if (s === 'assigned') {
            filter.status = { $in: ['Assigned', 'Accepted', 'In Progress'] };
          } else {
            filter.status = toolArgs.status;
          }
        }

        if (toolArgs?.complaintNumber) {
          filter.complaintNumber = toolArgs.complaintNumber;
        }

        const result = await complaintService.getComplaints(orgId, filter, { page: 1, limit: 5 }, { createdAt: -1 });
        const rawItems = result?.data || result?.items || result?.complaints || (Array.isArray(result) ? result : []);
        const complaints = rawItems.map((c) => ({
          complaintNumber: c.complaintNumber || c._id,
          id: c._id,
          title: c.title || c.subject,
          category: c.category,
          status: c.status,
          priority: c.priority,
          department: c.department || 'General Maintenance',
          slaDueDate: c.slaDueDate ? new Date(c.slaDueDate).toLocaleDateString() : null,
          slaStatus: c.slaStatus || 'Within SLA',
          createdAt: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : null,
        }));

        return {
          success: true,
          data: {
            count: complaints.length,
            complaints,
            emptyMessage: complaints.length === 0
              ? 'You do not have any complaints matching your request at this time.'
              : undefined,
          },
          action: {
            type: 'navigation',
            label: 'Open Complaint Board',
            route: '/(resident)/complaints/manage',
            targetName: 'Complaint Board',
            category: 'complaints_helpdesk',
          },
        };
      }

      // 5b. Prepare Complaint Submission Proposal
      case 'prepare_complaint': {
        const title = String(toolArgs?.title || '').trim();
        if (!title || title.length < 3) {
          return { success: false, error: 'Please provide a clear title or description for the complaint.' };
        }

        const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
        const rawPriority = String(toolArgs?.priority || 'Medium').trim();
        const priority = validPriorities.find(p => p.toLowerCase() === rawPriority.toLowerCase()) || 'Medium';

        const category = toolArgs?.category || 'General Maintenance';
        const description = toolArgs?.description || title;
        const locationFlat = toolArgs?.location || user?.flat || user?.unit || 'Resident Unit';

        const actionParams = {
          title,
          description,
          category,
          priority,
          location: { flat: locationFlat },
          residentEmail: user?.email,
          residentMobile: user?.phone || user?.mobile,
        };

        const summary = `Lodge complaint: ${title} (${category}, ${priority} priority, Unit: ${locationFlat})`;

        const proposal = createPendingActionProposal({
          actionType: 'CREATE_COMPLAINT',
          userId,
          orgId,
          params: actionParams,
          summary,
        });

        return {
          success: true,
          data: {
            proposalReady: true,
            actionId: proposal.actionId,
            confirmationToken: proposal.confirmationToken,
            expiresAt: proposal.expiresAt,
            actionType: 'CREATE_COMPLAINT',
            summary,
            title,
            category,
            priority,
            location: locationFlat,
            message: `I have prepared your complaint request: "${title}" under ${category} with ${priority} priority for ${locationFlat}. Please confirm to submit this ticket.`,
          },
          action: {
            type: 'confirmation',
            actionType: 'CREATE_COMPLAINT',
            actionId: proposal.actionId,
            confirmationToken: proposal.confirmationToken,
            title: 'Confirm Complaint Submission',
            confirmLabel: 'Submit Complaint',
            cancelLabel: 'Cancel',
            summary,
            details: {
              'Issue': title,
              'Category': category,
              'Priority': priority,
              'Unit': locationFlat,
            },
          },
        };
      }

      // 5c. Prepare Complaint Cancellation Proposal
      case 'prepare_complaint_cancellation': {
        if (!complaintService) {
          return { success: false, error: 'Complaint service is currently unavailable.' };
        }

        const targetRef = String(toolArgs?.complaintId || '').trim();
        if (!targetRef) {
          return { success: false, error: 'Please provide the complaint ticket number or ID to cancel.' };
        }

        let targetComplaint = null;
        if (typeof complaintService.getComplaintById === 'function') {
          targetComplaint = await complaintService.getComplaintById(targetRef, orgId).catch(() => null);
        }

        if (!targetComplaint && typeof complaintService.getComplaints === 'function') {
          const listRes = await complaintService.getComplaints(orgId, {
            residentId: userId,
            complaintNumber: targetRef,
          }, { page: 1, limit: 10 }, {});
          const list = listRes?.data || listRes?.items || (Array.isArray(listRes) ? listRes : []);
          targetComplaint = list.find(c =>
            String(c._id) === targetRef ||
            c.complaintNumber?.toLowerCase() === targetRef.toLowerCase() ||
            (c.title || '').toLowerCase().includes(targetRef.toLowerCase())
          );
        }

        if (!targetComplaint) {
          if (typeof complaintService.getComplaints === 'function') {
            const listRes = await complaintService.getComplaints(orgId, { residentId: userId }, { page: 1, limit: 10 }, {});
            const list = listRes?.data || listRes?.items || (Array.isArray(listRes) ? listRes : []);
            targetComplaint = list.find(c =>
              String(c._id) === targetRef ||
              c.complaintNumber?.toLowerCase() === targetRef.toLowerCase() ||
              (c.title || '').toLowerCase().includes(targetRef.toLowerCase())
            );
          }
        }

        if (!targetComplaint) {
          return {
            success: false,
            error: `Could not find any active complaint ticket matching "${targetRef}".`,
          };
        }

        // Validate ownership
        const complaintResidentId = String(targetComplaint.residentId?._id || targetComplaint.residentId);
        if (complaintResidentId !== String(userId) && !hasComplaintAdminPermission(user)) {
          return {
            success: false,
            error: 'Forbidden. You can only cancel complaints logged by your account.',
          };
        }

        // Validate status
        if (targetComplaint.status === 'Cancelled') {
          return { success: false, error: 'This complaint is already cancelled.' };
        }

        const cancellableStatuses = ['Submitted', 'Open', 'Waiting For Assignment'];
        if (!cancellableStatuses.includes(targetComplaint.status)) {
          return {
            success: false,
            error: `A complaint can only be cancelled before it is assigned (Current status: ${targetComplaint.status}). Please contact community management.`,
          };
        }

        const complaintId = String(targetComplaint._id);
        const complaintNumber = targetComplaint.complaintNumber || complaintId;
        const title = targetComplaint.title || 'Maintenance Issue';
        const reason = toolArgs?.reason || 'Cancelled by resident via AI Assistant';
        const summary = `Cancel complaint ticket ${complaintNumber}: ${title}`;

        const proposal = createPendingActionProposal({
          actionType: 'CANCEL_COMPLAINT',
          userId,
          orgId,
          params: {
            complaintId,
            complaintNumber,
            title,
            reason,
          },
          summary,
        });

        return {
          success: true,
          data: {
            proposalReady: true,
            actionId: proposal.actionId,
            confirmationToken: proposal.confirmationToken,
            expiresAt: proposal.expiresAt,
            actionType: 'CANCEL_COMPLAINT',
            summary,
            complaintId,
            complaintNumber,
            title,
            message: `Are you sure you want to cancel complaint ticket ${complaintNumber} ("${title}")? Please confirm to proceed.`,
          },
          action: {
            type: 'confirmation',
            actionType: 'CANCEL_COMPLAINT',
            actionId: proposal.actionId,
            confirmationToken: proposal.confirmationToken,
            title: `Cancel Complaint #${complaintNumber}`,
            confirmLabel: 'Cancel Ticket',
            cancelLabel: 'Keep Ticket',
            summary,
            details: {
              'Ticket #': complaintNumber,
              'Issue': title,
              'Status': targetComplaint.status,
            },
          },
        };
      }

      // 6. Resident Visitor Passes
      case 'get_my_visitor_passes': {
        if (!visitorPassService || typeof visitorPassService.getActivePasses !== 'function') {
          return { success: false, error: 'Visitor pass service is currently unavailable.' };
        }

        const isManager = hasFinancePermission(user) || (Array.isArray(user?.permissions) && user.permissions.includes('visitor:admin'));
        const options = {
          skip: 0,
          limit: 5,
        };

        if (toolArgs?.status && toolArgs.status !== 'ALL') {
          options.statuses = [toolArgs.status.toUpperCase()];
        } else {
          options.statuses = ['PENDING', 'ACTIVE', 'REVOKED', 'EXPIRED'];
        }

        if (toolArgs?.search) {
          options.search = String(toolArgs.search).trim();
        }

        if (!isManager) {
          options.createdById = userId;
        }

        const result = await visitorPassService.getActivePasses(orgId, options);
        const passList = (result?.data || (Array.isArray(result) ? result : [])).slice(0, 5).map((p) => ({
          passId: p._id,
          visitorName: p.visitorDetails?.name || 'Guest',
          phone: p.visitorDetails?.phone || '',
          passType: p.passType || 'VISITOR',
          status: p.status,
          validityStart: p.validity?.startDate ? new Date(p.validity.startDate).toLocaleDateString() : null,
          validityEnd: p.validity?.endDate ? new Date(p.validity.endDate).toLocaleDateString() : null,
          timeWindow: `${p.validity?.timeWindowStart || 'Anytime'} - ${p.validity?.timeWindowEnd || 'Anytime'}`,
          shortKey: p.shortKey || null,
          vehicleNumber: p.vehicleDetails?.number || null,
        }));

        return {
          success: true,
          data: {
            count: passList.length,
            totalRecords: result?.totalRecords ?? passList.length,
            passes: passList,
            emptyMessage: passList.length === 0
              ? 'You do not have any active or upcoming visitor passes at this time.'
              : undefined,
          },
          action: {
            type: 'navigation',
            label: 'View Visitor Passes',
            route: '/(resident)/visitor',
            targetName: 'Resident Visitor Passes',
            category: 'visitor_management',
          },
        };
      }

      // 7. Visitor Entry/Exit Logs & Inside Status
      case 'get_visitor_history': {
        if (!visitorLogService) {
          return { success: false, error: 'Visitor log service is currently unavailable.' };
        }

        const statusFilter = (toolArgs?.status || '').toUpperCase();
        let logs = [];
        let currentlyInsideCount = 0;

        if (statusFilter === 'INSIDE') {
          const insideLogs = await visitorLogService.getActiveLogsInside(orgId, user);
          logs = Array.isArray(insideLogs) ? insideLogs : [];
          currentlyInsideCount = logs.length;
        } else {
          const limit = Math.min(Number(toolArgs?.limit) || 5, 10);
          const filters = {};
          if (statusFilter && statusFilter !== 'ALL') {
            filters.logStatus = statusFilter;
          }
          const historyResult = await visitorLogService.getHistoryLogs(orgId, 0, limit, filters, user);
          logs = historyResult?.data || (Array.isArray(historyResult) ? historyResult : []);
        }

        const formatted = logs.slice(0, 6).map((l) => ({
          logId: l._id,
          visitorName: l.visitorName || l.visitorDetails?.name || 'Visitor',
          entryType: l.entryType || 'PRE_APPROVED',
          logStatus: l.logStatus,
          entryTime: l.entryTime ? new Date(l.entryTime).toLocaleString() : 'Not Checked In',
          exitTime: l.exitTime ? new Date(l.exitTime).toLocaleString() : null,
          vehicleNumber: l.vehicleNumber || null,
          gateName: l.gateName || 'Main Gate',
        }));

        return {
          success: true,
          data: {
            count: formatted.length,
            currentlyInsideCount,
            logs: formatted,
            emptyMessage: formatted.length === 0
              ? 'No visitor entry logs found for your unit for this period.'
              : undefined,
          },
          action: {
            type: 'navigation',
            label: 'View Visitor Log',
            route: '/(resident)/visitor',
            targetName: 'Visitor Security Log',
            category: 'visitor_management',
          },
        };
      }

      // 8. Pending Gate Walk-In Approvals
      case 'get_pending_gate_approvals': {
        if (!visitorLogService || typeof visitorLogService.getPendingApprovals !== 'function') {
          return { success: false, error: 'Visitor log service is currently unavailable.' };
        }

        const pendingList = await visitorLogService.getPendingApprovals(orgId, user);
        const approvals = (Array.isArray(pendingList) ? pendingList : []).map((p) => ({
          logId: p._id,
          visitorName: p.visitorName || p.visitorDetails?.name || 'Walk-in Visitor',
          purpose: p.purpose || 'Personal Visit',
          gateName: p.gateName || 'Main Security Gate',
          requestedAt: p.createdAt ? new Date(p.createdAt).toLocaleTimeString() : 'Just now',
          phone: p.visitorDetails?.phone || '',
        }));

        return {
          success: true,
          data: {
            count: approvals.length,
            pendingApprovals: approvals,
            hasPendingApprovals: approvals.length > 0,
            emptyMessage: approvals.length === 0
              ? 'You have no pending visitor approvals waiting at the gate.'
              : undefined,
          },
          action: {
            type: 'navigation',
            label: 'Review Gate Approvals',
            route: '/(resident)/visitor',
            targetName: 'Gate Console & Approvals',
            category: 'visitor_management',
          },
        };
      }

      // 8b. Prepare Visitor Pass Creation Proposal
      case 'prepare_visitor_pass': {
        const isPermitted = canCreateResidentPass(user);
        if (!isPermitted) {
          return {
            success: false,
            error: 'You do not have permission to issue visitor passes. Please contact your community admin.',
          };
        }

        const visitorName = String(toolArgs?.visitorName || '').trim();
        if (!visitorName) {
          return { success: false, error: 'Visitor name is required to prepare a pass.' };
        }

        const dateStr = toolArgs?.date || new Date().toISOString().split('T')[0];
        const timeStr = toolArgs?.time || '10:00';
        const phone = toolArgs?.phone ? String(toolArgs.phone).trim() : undefined;
        if (phone && phone.replace(/\D/g, '').length < 10) {
          return { success: false, error: 'Please provide a valid 10-digit phone number for the visitor.' };
        }
        const vehicleNumber = toolArgs?.vehicleNumber ? String(toolArgs.vehicleNumber).trim().toUpperCase() : undefined;
        const passType = ['GUEST', 'DELIVERY', 'CAB', 'SERVICE'].includes(String(toolArgs?.passType || '').toUpperCase())
          ? toolArgs.passType.toUpperCase()
          : 'GUEST';
        const purpose = toolArgs?.purpose || 'Personal Visit';

        // Check blacklist
        if (blacklistService && typeof blacklistService.checkMatch === 'function') {
          const matched = await blacklistService.checkMatch(orgId, {
            name: visitorName,
            phone,
            plate: vehicleNumber,
          });
          if (matched && (matched._id || matched.isBlacklisted || matched.reason)) {
            return {
              success: false,
              error: `Visitor cannot receive a pass (Community Blacklist): ${matched.reason || 'This person is on the community blacklist.'}`,
            };
          }
        }

        const startDate = `${dateStr}T00:00:00.000Z`;
        const endDate = `${dateStr}T23:59:59.999Z`;

        const actionParams = {
          visitorName,
          phone,
          vehicleNumber,
          passType,
          purpose,
          dateStr,
          timeStr,
          startDate,
          endDate,
          timeWindowStart: timeStr,
          timeWindowEnd: '23:59',
        };

        const summary = `Visitor Pass for ${visitorName} on ${dateStr} at ${timeStr} (${passType})`;

        const proposal = createPendingActionProposal({
          actionType: 'CREATE_VISITOR_PASS',
          userId,
          orgId,
          params: actionParams,
          summary,
        });

        return {
          success: true,
          data: {
            proposalReady: true,
            actionId: proposal.actionId,
            confirmationToken: proposal.confirmationToken,
            expiresAt: proposal.expiresAt,
            actionType: 'CREATE_VISITOR_PASS',
            summary,
            visitorName,
            date: dateStr,
            time: timeStr,
            phone,
            vehicleNumber,
            passType,
            message: `I have prepared a ${passType} pass for ${visitorName} on ${dateStr} at ${timeStr}. Would you like me to confirm and create this pass?`,
          },
          action: {
            type: 'confirmation',
            actionType: 'CREATE_VISITOR_PASS',
            actionId: proposal.actionId,
            confirmationToken: proposal.confirmationToken,
            title: `Confirm Visitor Pass`,
            confirmLabel: 'Confirm Pass',
            cancelLabel: 'Cancel',
            summary,
            details: {
              'Visitor': visitorName,
              'Date': dateStr,
              'Time': timeStr,
              'Type': passType,
              ...(phone ? { 'Phone': phone } : {}),
              ...(vehicleNumber ? { 'Vehicle': vehicleNumber } : {}),
            },
          },
        };
      }

      // 8c. Prepare Visitor Pass Revocation Proposal
      case 'prepare_visitor_pass_revocation': {
        if (!visitorPassService) {
          return { success: false, error: 'Visitor pass service is currently unavailable.' };
        }

        let targetPass = null;
        const getPasses = visitorPassService.getActivePasses || visitorPassService.getUserPasses;

        if (toolArgs?.passId) {
          if (typeof visitorPassService.getPassById === 'function') {
            targetPass = await visitorPassService.getPassById(toolArgs.passId, orgId).catch(() => null);
          }
          if (!targetPass && typeof getPasses === 'function') {
            const result = await getPasses.call(visitorPassService, orgId, {
              createdById: userId,
              statuses: ['PENDING', 'ACTIVE'],
              limit: 20,
            });
            const passes = result?.data || (Array.isArray(result) ? result : (result?.items || []));
            targetPass = passes.find((p) => String(p._id) === String(toolArgs.passId));
          }
        } else if (typeof getPasses === 'function') {
          const result = await getPasses.call(visitorPassService, orgId, {
            createdById: userId,
            statuses: ['PENDING', 'ACTIVE'],
            limit: 20,
          });
          const passes = result?.data || (Array.isArray(result) ? result : (result?.items || []));
          if (toolArgs?.visitorName) {
            const kw = String(toolArgs.visitorName).toLowerCase().trim();
            targetPass = passes.find((p) => (p.visitorDetails?.name || '').toLowerCase().includes(kw));
          } else if (toolArgs?.shortKey) {
            targetPass = passes.find((p) => p.shortKey === toolArgs.shortKey);
          } else if (passes.length === 1) {
            targetPass = passes[0];
          }
        }

        if (!targetPass) {
          return {
            success: false,
            error: 'Could not find an active or pending visitor pass matching your request to revoke.',
          };
        }

        // Check ownership
        if (String(targetPass.createdById?._id || targetPass.createdById) !== String(userId) && !hasAdminRole(user)) {
          return {
            success: false,
            error: 'Forbidden. You can only revoke visitor passes created by your household.',
          };
        }

        if (['REVOKED', 'EXPIRED'].includes(targetPass.status)) {
          return {
            success: false,
            error: `This visitor pass is already ${targetPass.status.toLowerCase()}.`,
          };
        }

        const vName = targetPass.visitorDetails?.name || 'Guest';
        const passId = String(targetPass._id);
        const shortKey = targetPass.shortKey || '';
        const summary = `Revoke Visitor Pass for ${vName} (${shortKey || passId})`;

        const proposal = createPendingActionProposal({
          actionType: 'REVOKE_VISITOR_PASS',
          userId,
          orgId,
          params: { passId, visitorName: vName, shortKey },
          summary,
        });

        return {
          success: true,
          data: {
            proposalReady: true,
            actionId: proposal.actionId,
            confirmationToken: proposal.confirmationToken,
            expiresAt: proposal.expiresAt,
            actionType: 'REVOKE_VISITOR_PASS',
            summary,
            passId,
            visitorName: vName,
            message: `Are you sure you want to revoke the visitor pass for ${vName} (${shortKey || passId})? Please confirm to proceed.`,
          },
          action: {
            type: 'confirmation',
            actionType: 'REVOKE_VISITOR_PASS',
            actionId: proposal.actionId,
            confirmationToken: proposal.confirmationToken,
            title: 'Confirm Pass Revocation',
            confirmLabel: 'Revoke Pass',
            cancelLabel: 'Keep Pass',
            summary,
            details: {
              'Visitor': vName,
              'Pass ID': shortKey || passId,
              'Current Status': targetPass.status,
            },
          },
        };
      }

      // 9a. Community Notices & Announcements
      case 'get_community_notices': {
        if (!noticeBoardService) {
          return { success: false, error: 'Notice board service is currently unavailable.' };
        }
        const isManager = hasComplaintAdminPermission(user);
        const limit = Math.min(Number(toolArgs?.limit) || 5, 10);
        const queryParams = {};
        if (toolArgs?.search) queryParams.search = String(toolArgs.search).trim();
        if (toolArgs?.category && toolArgs.category !== 'ALL') queryParams.category = String(toolArgs.category).trim();
        if (toolArgs?.priority && toolArgs.priority !== 'ALL') queryParams.priority = String(toolArgs.priority).trim();
        if (toolArgs?.readStatus) queryParams.readStatus = String(toolArgs.readStatus).trim();

        const noticesRes = await noticeBoardService.getAllNotices(
          orgId,
          userId,
          1,
          limit,
          queryParams,
          !isManager
        );

        const noticesList = noticesRes?.data || (Array.isArray(noticesRes) ? noticesRes : []);
        const formatted = noticesList.slice(0, limit).map((n) => ({
          noticeId: String(n._id || n.id),
          title: n.title,
          description: n.description?.slice(0, 200) || '',
          category: n.category || 'General',
          priority: n.priority || 'Normal',
          isCritical: Boolean(n.isCritical),
          isPinned: Boolean(n.isPinned),
          requiresAcknowledgement: Boolean(n.requiresAcknowledgement),
          acknowledgementDeadline: n.acknowledgementDeadline ? new Date(n.acknowledgementDeadline).toLocaleDateString() : null,
          publishedAt: n.createdAt ? new Date(n.createdAt).toLocaleDateString() : null,
          authorName: n.createdBy?.name || n.createdBy?.username || 'Community Management',
        }));

        return {
          success: true,
          data: {
            count: formatted.length,
            totalRecords: noticesRes?.totalRecords ?? formatted.length,
            notices: formatted,
            emptyMessage: formatted.length === 0
              ? 'There are no active community notices matching your query at this time.'
              : undefined,
          },
          action: {
            type: 'navigation',
            label: 'View Community Notices',
            route: '/(resident)/notices',
            targetName: 'Community Notice Board',
            category: 'notice_board',
          },
        };
      }

      // 9b. Notice Details
      case 'get_notice_details': {
        if (!noticeBoardService) {
          return { success: false, error: 'Notice board service is currently unavailable.' };
        }
        const noticeId = String(toolArgs?.noticeId || '').trim();
        if (!noticeId) {
          return { success: false, error: 'Please provide a valid noticeId.' };
        }

        let notice = null;
        try {
          notice = await noticeBoardService.getNoticeById(noticeId, null, userId, orgId, user);
        } catch (err) {
          return { success: false, error: err.message || 'Notice not found or unauthorized.' };
        }

        if (!notice) {
          return { success: false, error: `Notice with ID "${noticeId}" was not found.` };
        }

        return {
          success: true,
          data: {
            noticeId: String(notice._id || notice.id),
            title: notice.title,
            description: notice.description,
            category: notice.category,
            priority: notice.priority,
            status: notice.status,
            isCritical: Boolean(notice.isCritical),
            requiresAcknowledgement: Boolean(notice.requiresAcknowledgement),
            acknowledgementDeadline: notice.acknowledgementDeadline ? new Date(notice.acknowledgementDeadline).toLocaleString() : null,
            expiryDate: notice.expiryDate ? new Date(notice.expiryDate).toLocaleDateString() : null,
            attachmentsCount: notice.attachments?.length || 0,
            author: notice.createdBy?.name || 'Community Admin',
          },
          action: {
            type: 'navigation',
            label: 'Open Notice',
            route: '/(resident)/notices',
            targetName: 'Community Notice',
            category: 'notice_board',
          },
        };
      }

      // 9c. Prepare Notice Acknowledgement
      case 'prepare_notice_acknowledgement': {
        if (!noticeBoardService || !noticeAcknowledgementService) {
          return { success: false, error: 'Notice acknowledgement service is currently unavailable.' };
        }
        const noticeId = String(toolArgs?.noticeId || '').trim();
        if (!noticeId) {
          return { success: false, error: 'Notice ID is required for acknowledgement.' };
        }

        let notice = null;
        try {
          notice = await noticeBoardService.getNoticeById(noticeId, null, userId, orgId, user);
        } catch (err) {
          return { success: false, error: err.message || 'Notice not found or not accessible.' };
        }

        if (!notice) {
          return { success: false, error: 'Notice not found.' };
        }
        if (!notice.requiresAcknowledgement) {
          return { success: false, error: 'This notice does not require formal acknowledgement.' };
        }
        if (notice.acknowledgementDeadline && new Date() > new Date(notice.acknowledgementDeadline)) {
          return { success: false, error: 'The acknowledgement deadline for this notice has already passed.' };
        }

        const title = notice.title || 'Community Notice';
        const summary = `Acknowledge critical notice: "${title}"`;

        const proposal = createPendingActionProposal({
          actionType: 'ACKNOWLEDGE_NOTICE',
          userId,
          orgId,
          params: {
            noticeId: String(notice._id || notice.id),
            noticeTitle: title,
            category: notice.category,
            priority: notice.priority,
          },
          summary,
        });

        return {
          success: true,
          data: {
            proposalReady: true,
            actionId: proposal.actionId,
            confirmationToken: proposal.confirmationToken,
            expiresAt: proposal.expiresAt,
            actionType: 'ACKNOWLEDGE_NOTICE',
            summary,
            noticeId: String(notice._id || notice.id),
            title,
            message: `Please confirm that you have read and acknowledge the critical community notice: "${title}".`,
          },
          action: {
            type: 'confirmation',
            actionType: 'ACKNOWLEDGE_NOTICE',
            actionId: proposal.actionId,
            confirmationToken: proposal.confirmationToken,
            title: 'Acknowledge Critical Notice',
            confirmLabel: 'Confirm & Acknowledge',
            cancelLabel: 'Dismiss',
            summary,
            details: {
              'Notice': title,
              'Category': notice.category,
              'Priority': notice.priority,
            },
          },
        };
      }

      // 10a. Search Staff Directory & Domestic Help
      case 'search_staff_directory': {
        if (!staffUnitAssociationService || typeof staffUnitAssociationService.getEligibleStaff !== 'function') {
          return { success: false, error: 'Staff directory service is currently unavailable.' };
        }

        const staffList = await staffUnitAssociationService.getEligibleStaff(orgId);
        const search = (toolArgs?.search || '').toLowerCase().trim();
        const department = (toolArgs?.department || '').toLowerCase().trim();
        const limit = Math.min(Number(toolArgs?.limit) || 5, 10);

        let filtered = Array.isArray(staffList) ? staffList : [];
        if (department && department !== 'all') {
          filtered = filtered.filter((s) => (s.department || '').toLowerCase().includes(department));
        }
        if (search) {
          filtered = filtered.filter(
            (s) =>
              (s.name || '').toLowerCase().includes(search) ||
              (s.department || '').toLowerCase().includes(search) ||
              (s.designation || '').toLowerCase().includes(search)
          );
        }

        const formatted = filtered.slice(0, limit).map((s) => ({
          technicianId: s._id || s.technicianId,
          name: s.name,
          department: s.department || 'General',
          designation: s.designation || 'Staff',
          photoUrl: s.photoUrl || null,
          rating: s.rating ?? null,
        }));

        return {
          success: true,
          data: {
            count: formatted.length,
            totalEligibleStaff: filtered.length,
            staff: formatted,
            emptyMessage: formatted.length === 0 ? 'No staff members found matching your search criteria.' : undefined,
          },
          action: {
            type: 'navigation',
            label: 'View Staff Directory',
            route: '/(resident)/staff',
            targetName: 'Community Staff & Domestic Help',
            category: 'staff_management',
          },
        };
      }

      // 10b. Get My Unit Staff
      case 'get_my_unit_staff': {
        if (!staffUnitAssociationService || typeof staffUnitAssociationService.getAssociations !== 'function') {
          return { success: false, error: 'Staff association service is currently unavailable.' };
        }

        const isManager = hasComplaintAdminPermission(user);
        const associations = await staffUnitAssociationService.getAssociations(
          userId,
          orgId,
          { status: 'Active' },
          isManager
        );

        const list = Array.isArray(associations) ? associations : [];
        const formatted = list.slice(0, 10).map((a) => ({
          associationId: a._id,
          staffName: a.technicianId?.name || 'Staff Member',
          department: a.technicianId?.department || 'Domestic Help',
          designation: a.technicianId?.designation || '',
          unitNumber: a.villaId?.unitNumber || 'Your Unit',
          serviceType: a.serviceType || 'Daily Help',
          schedule: a.accessSchedule?.timeWindow
            ? `${a.accessSchedule.timeWindow.start} - ${a.accessSchedule.timeWindow.end}`
            : 'All Day',
          status: a.status,
        }));

        return {
          success: true,
          data: {
            count: formatted.length,
            staffAssociations: formatted,
            emptyMessage: formatted.length === 0
              ? 'No domestic help or service staff are currently linked to your unit.'
              : undefined,
          },
          action: {
            type: 'navigation',
            label: 'Manage Unit Staff',
            route: '/(resident)/staff',
            targetName: 'My Domestic Help',
            category: 'staff_management',
          },
        };
      }

      // 10c. Get Active Staff Attendance Inside Community
      case 'get_active_staff_attendance': {
        if (!staffAttendanceService || typeof staffAttendanceService.getActiveStaffForMyUnits !== 'function') {
          return { success: false, error: 'Staff attendance service is currently unavailable.' };
        }

        const isManager = hasComplaintAdminPermission(user);
        const activeSessions = await staffAttendanceService.getActiveStaffForMyUnits(userId, orgId, isManager);
        const sessions = Array.isArray(activeSessions) ? activeSessions : [];

        const formatted = sessions.map((s) => ({
          staffName: s.name,
          department: s.department,
          designation: s.designation,
          checkInTime: s.checkInTime ? new Date(s.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Checked In',
          checkInGate: s.checkInGate || 'Main Gate',
          allocatedUnits: s.unitNumbers || [],
        }));

        return {
          success: true,
          data: {
            count: formatted.length,
            activeInsideStaff: formatted,
            emptyMessage: formatted.length === 0
              ? 'None of your allocated domestic staff or technicians are currently checked in inside the community.'
              : undefined,
          },
          action: {
            type: 'navigation',
            label: 'Staff Attendance',
            route: '/(resident)/staff',
            targetName: 'Staff Gate Attendance',
            category: 'staff_management',
          },
        };
      }

      // 11a. Household Members
      case 'get_my_household_members': {
        if (!villaServices) {
          return { success: false, error: 'Unit management service is currently unavailable.' };
        }

        const units = await villaServices.getUnitsByResidentUserIds([userId]);
        const userUnits = (Array.isArray(units) ? units : []).filter((u) => String(u.orgId) === String(orgId));

        if (userUnits.length === 0) {
          return {
            success: true,
            data: {
              unitsCount: 0,
              householdMembers: [],
              message: 'No registered units found for your account in this community workspace.',
            },
            action: {
              type: 'navigation',
              label: 'View Profile',
              route: '/(resident)/profile',
              targetName: 'My Profile',
              category: 'profile',
            },
          };
        }

        const household = [];
        for (const u of userUnits) {
          let details = null;
          try {
            details = await villaServices.getVillaDetailsWithResidents(u._id, orgId);
          } catch (e) {
            details = {
              villa: u,
              residents: (u.residents || []).map((r) => ({
                id: String(r.userId),
                name: 'Resident',
                residentType: r.residencyType,
                joinedAt: r.assignedAt,
              })),
            };
          }

          household.push({
            unitId: String(u._id),
            unitNumber: u.unitNumber,
            blockOrBuilding: u.blockOrBuilding || '',
            type: u.type,
            occupancyStatus: u.status,
            parkingSlots: u.metadata?.parkingSlots || [],
            residents: (details?.residents || []).map((r) => ({
              id: r.id,
              name: r.name,
              role: r.residentType || 'Resident',
              email: r.email,
              phone: r.phone ? `${r.phone.slice(0, 3)}****${r.phone.slice(-3)}` : '',
              isCurrentUser: String(r.id) === String(userId),
              joinedAt: r.joinedAt ? new Date(r.joinedAt).toLocaleDateString() : null,
            })),
          });
        }

        return {
          success: true,
          data: {
            unitsCount: household.length,
            units: household,
          },
          action: {
            type: 'navigation',
            label: 'My Household',
            route: '/(resident)/profile',
            targetName: 'Household Profile',
            category: 'profile',
          },
        };
      }

      // 11b. Registered Vehicles & Parking Slots
      case 'get_my_vehicles_and_parking': {
        if (!villaServices) {
          return { success: false, error: 'Unit management service is currently unavailable.' };
        }

        const units = await villaServices.getUnitsByResidentUserIds([userId]);
        const userUnits = (Array.isArray(units) ? units : []).filter((u) => String(u.orgId) === String(orgId));

        const parkingAllocations = [];
        for (const u of userUnits) {
          const slots = u.metadata?.parkingSlots || [];
          parkingAllocations.push({
            unitNumber: u.unitNumber,
            block: u.blockOrBuilding || '',
            slots: slots.length > 0 ? slots : ['Allocated Unit Slot'],
          });
        }

        let recentVehicles = [];
        if (visitorPassService && typeof visitorPassService.getActivePasses === 'function') {
          try {
            const passesRes = await visitorPassService.getActivePasses(orgId, { createdById: userId, limit: 5 });
            const passData = passesRes?.data || (Array.isArray(passesRes) ? passesRes : []);
            recentVehicles = passData
              .filter((p) => p.vehicleDetails?.number)
              .map((p) => ({
                vehicleNumber: p.vehicleDetails.number,
                vehicleType: p.vehicleDetails.vehicleType || 'Guest Vehicle',
                associatedVisitor: p.visitorDetails?.name,
                passStatus: p.status,
              }));
          } catch (e) {}
        }

        return {
          success: true,
          data: {
            unitsChecked: userUnits.length,
            parkingAllocations,
            recentVisitorVehicles: recentVehicles,
            registrationNotice: 'Resident vehicle RFID stickers are issued directly by community security administration.',
          },
          action: {
            type: 'navigation',
            label: 'Unit & Parking Info',
            route: '/(resident)/profile',
            targetName: 'Resident Profile & Parking',
            category: 'profile',
          },
        };
      }

      // 12a. Active Polls & Surveys
      case 'get_active_polls': {
        if (!pollServices || typeof pollServices.getActivePolls !== 'function') {
          return { success: false, error: 'Polls and surveys service is currently unavailable.' };
        }

        const limit = Math.min(Number(toolArgs?.limit) || 5, 10);
        const search = toolArgs?.search ? String(toolArgs.search).trim() : null;

        const pollsRes = await pollServices.getActivePolls(orgId, userId, 1, limit, search, null, user);
        const pollList = pollsRes?.data || (Array.isArray(pollsRes) ? pollsRes : []);

        const formatted = [];
        for (const p of pollList) {
          let hasVoted = false;
          if (typeof pollServices.checkIfUserVoted === 'function') {
            hasVoted = await pollServices.checkIfUserVoted(p._id, orgId, userId).catch(() => false);
          }
          formatted.push({
            pollId: String(p._id),
            title: p.title,
            question: p.question,
            choiceType: p.choiceType || 'SINGLE_CHOICE',
            options: (p.options || []).map((opt, i) => ({
              index: i,
              text: opt.text || opt,
            })),
            endDate: p.endDate ? new Date(p.endDate).toLocaleString() : 'No Deadline',
            hasVoted: Boolean(hasVoted),
            resultsVisibility: p.resultsVisibility || 'AFTER_VOTE',
            status: p.status || 'Active',
          });
        }

        return {
          success: true,
          data: {
            count: formatted.length,
            totalActivePolls: pollsRes?.totalRecords ?? formatted.length,
            polls: formatted,
            emptyMessage: formatted.length === 0
              ? 'There are currently no active community polls or surveys.'
              : undefined,
          },
          action: {
            type: 'navigation',
            label: 'View Community Polls',
            route: '/(resident)/polls',
            targetName: 'Community Polls & Surveys',
            category: 'polls',
          },
        };
      }

      // 12b. Poll Details
      case 'get_poll_details': {
        if (!pollServices || typeof pollServices.getPollById !== 'function') {
          return { success: false, error: 'Poll service is currently unavailable.' };
        }

        const pollId = String(toolArgs?.pollId || '').trim();
        if (!pollId) {
          return { success: false, error: 'Please provide a pollId.' };
        }

        const isManager = hasComplaintAdminPermission(user);
        let poll = null;
        try {
          poll = await pollServices.getPollById(pollId, orgId, userId, isManager);
        } catch (err) {
          return { success: false, error: err.message || 'Poll not found.' };
        }

        if (!poll) {
          return { success: false, error: `Poll with ID "${pollId}" not found.` };
        }

        let hasVoted = false;
        let userVote = null;
        if (typeof pollServices.checkIfUserVoted === 'function') {
          hasVoted = await pollServices.checkIfUserVoted(pollId, orgId, userId).catch(() => false);
          if (hasVoted && typeof pollServices.getUserVote === 'function') {
            userVote = await pollServices.getUserVote(pollId, orgId, userId).catch(() => null);
          }
        }

        let results = null;
        if (typeof pollServices.canUserViewResults === 'function' && pollServices.canUserViewResults(poll, userId, hasVoted, isManager)) {
          if (typeof pollServices.getPollResults === 'function') {
            results = await pollServices.getPollResults(pollId, orgId, userId, isManager).catch(() => null);
          }
        }

        return {
          success: true,
          data: {
            pollId: String(poll._id),
            title: poll.title,
            question: poll.question,
            choiceType: poll.choiceType,
            maxChoices: poll.maxChoices || 1,
            options: (poll.options || []).map((o, idx) => ({
              index: idx,
              text: o.text || o,
              votesCount: results?.options?.[idx]?.votesCount ?? undefined,
              percentage: results?.options?.[idx]?.percentage ?? undefined,
            })),
            endDate: poll.endDate ? new Date(poll.endDate).toLocaleString() : 'No Deadline',
            status: poll.status,
            hasVoted,
            userSelectedIndices: userVote?.selectedOptions || [],
            resultsAvailable: Boolean(results),
            totalVotes: results?.totalVotes ?? undefined,
          },
          action: {
            type: 'navigation',
            label: 'Open Poll',
            route: '/(resident)/polls',
            targetName: 'Community Poll',
            category: 'polls',
          },
        };
      }

      // 12c. Prepare Poll Vote Proposal
      case 'prepare_poll_vote': {
        if (!pollServices || typeof pollServices.getPollById !== 'function') {
          return { success: false, error: 'Poll service is currently unavailable.' };
        }

        const pollId = String(toolArgs?.pollId || '').trim();
        if (!pollId) {
          return { success: false, error: 'Poll ID is required.' };
        }

        const poll = await pollServices.getPollById(pollId, orgId, userId, false).catch(() => null);
        if (!poll) {
          return { success: false, error: 'Poll not found.' };
        }

        if (poll.status !== 'Active') {
          return { success: false, error: `Voting is not open on this poll (Status: ${poll.status}).` };
        }
        if (poll.endDate && new Date(poll.endDate) < new Date()) {
          return { success: false, error: 'This poll has passed its deadline and is closed for voting.' };
        }

        if (typeof pollServices.checkIfUserVoted === 'function') {
          const alreadyVoted = await pollServices.checkIfUserVoted(pollId, orgId, userId).catch(() => false);
          if (alreadyVoted) {
            return { success: false, error: 'You have already cast your vote on this poll.' };
          }
        }

        let selectedIndices = [];
        if (toolArgs?.selectedOptionIndex !== undefined) {
          selectedIndices = [Number(toolArgs.selectedOptionIndex)];
        } else if (Array.isArray(toolArgs?.selectedOptionIndices)) {
          selectedIndices = toolArgs.selectedOptionIndices.map(Number);
        }

        if (selectedIndices.length === 0 || selectedIndices.some((idx) => isNaN(idx) || idx < 0 || idx >= (poll.options?.length || 0))) {
          return { success: false, error: `Please choose a valid option between 0 and ${(poll.options?.length || 1) - 1}.` };
        }

        const chosenOptionTexts = selectedIndices.map((idx) => poll.options[idx]?.text || `Option ${idx + 1}`);
        const title = poll.title || 'Community Poll';
        const summary = `Cast vote on poll "${title}": [${chosenOptionTexts.join(', ')}]`;

        const proposal = createPendingActionProposal({
          actionType: 'CAST_POLL_VOTE',
          userId,
          orgId,
          params: {
            pollId,
            pollTitle: title,
            selectedOptionIndex: selectedIndices[0],
            selectedOptionIndices: selectedIndices,
            chosenOptionTexts,
          },
          summary,
        });

        return {
          success: true,
          data: {
            proposalReady: true,
            actionId: proposal.actionId,
            confirmationToken: proposal.confirmationToken,
            expiresAt: proposal.expiresAt,
            actionType: 'CAST_POLL_VOTE',
            summary,
            pollId,
            pollTitle: title,
            chosenOptionTexts,
            message: `Are you sure you want to vote for "${chosenOptionTexts.join(', ')}" on "${title}"? Please confirm to cast your ballot.`,
          },
          action: {
            type: 'confirmation',
            actionType: 'CAST_POLL_VOTE',
            actionId: proposal.actionId,
            confirmationToken: proposal.confirmationToken,
            title: 'Confirm Poll Ballot',
            confirmLabel: 'Cast Vote',
            cancelLabel: 'Cancel',
            summary,
            details: {
              'Poll': title,
              'Your Vote': chosenOptionTexts.join(', '),
              'Deadline': poll.endDate ? new Date(poll.endDate).toLocaleDateString() : 'Active',
            },
          },
        };
      }

      // 13. Settings & Preferences
      case 'get_my_settings_and_preferences': {
        let pref = null;
        if (userPreferenceService && typeof userPreferenceService.getUserPreferences === 'function') {
          try {
            pref = await userPreferenceService.getUserPreferences(userId, { orgId });
          } catch (e) {}
        }

        let unreadNotificationsCount = 0;
        if (notificationService && typeof notificationService.getUserNotifications === 'function') {
          try {
            const notifs = await notificationService.getUserNotifications(userId, 1, 5, orgId);
            const items = notifs?.notifications || notifs?.data || (Array.isArray(notifs) ? notifs : []);
            unreadNotificationsCount = items.filter((n) => !n.isRead).length;
          } catch (e) {}
        }

        return {
          success: true,
          data: {
            activeQuickActions: pref?.activeQuickActions || ['visitor_invite', 'amenity_booking', 'pay_dues', 'complaints'],
            isCustomized: Boolean(pref?.isCustomized),
            unreadNotificationsCount,
            themeSupport: 'System, Light, Dark supported via Mobile Settings screen',
            languageSupport: 'English, Arabic (RTL) supported',
          },
          action: {
            type: 'navigation',
            label: 'Open Settings',
            route: '/(resident)/settings',
            targetName: 'Application Settings',
            category: 'settings',
          },
        };
      }

      // 14. Admin Analytics KPI Summary
      case 'get_admin_analytics_summary': {
        if (!hasFinancePermission(user) && !hasComplaintAdminPermission(user)) {
          return {
            success: false,
            error: 'Access restricted: Administrative analytics require Community Admin or Super Admin role permissions.',
            action: {
              type: 'navigation',
              label: 'Go to Resident Dashboard',
              route: '/(resident)/dashboard',
              targetName: 'Resident Dashboard',
              category: 'dashboard',
            },
          };
        }

        let stats = { openEnquiries: 0, pendingApprovals: 0, activeTrials: 0, activeSubscriptions: 0 };
        if (adminAnalyticsService && typeof adminAnalyticsService.getDashboardStats === 'function') {
          try {
            stats = await adminAnalyticsService.getDashboardStats();
          } catch (e) {}
        }

        return {
          success: true,
          data: {
            openEnquiries: stats.openEnquiries || 0,
            pendingApprovals: stats.pendingApprovals || 0,
            activeTrials: stats.activeTrials || 0,
            activeSubscriptions: stats.activeSubscriptions || 0,
            retrievedAt: new Date().toISOString(),
          },
          action: {
            type: 'navigation',
            label: 'View Analytics Dashboard',
            route: '/(admin)/dashboard',
            targetName: 'Executive Analytics',
            category: 'admin_dashboard',
          },
        };
      }

      // 8d. Confirm and Execute Pending Action
      case 'confirm_pending_action': {
        const actionId = toolArgs?.actionId;
        const confirmationToken = toolArgs?.confirmationToken;

        const verification = await verifyPendingAction({
          actionId,
          confirmationToken,
          userId,
          orgId,
        });

        if (!verification.valid) {
          return {
            success: false,
            error: verification.error,
          };
        }

        if (verification.idempotentReplay) {
          logger.info(`[AIAssistantTools] Idempotent replay for action [${actionId}]`);
          let replayTitle = 'Action Confirmed';
          let replayRoute = '/(resident)/dashboard';
          const ref = verification.executionResult?.shortKey ||
                      verification.executionResult?.bookingId ||
                      verification.executionResult?.passId ||
                      verification.executionResult?.transactionId ||
                      verification.executionResult?.complaintNumber ||
                      verification.executionResult?.complaintId ||
                      verification.executionResult?.noticeId ||
                      verification.executionResult?.pollId;

          if (verification.action.actionType.includes('VISITOR')) {
            replayTitle = verification.action.actionType.includes('REVOKE') ? 'Visitor Pass Revoked' : 'Visitor Pass Issued';
            replayRoute = '/(resident)/visitor';
          } else if (verification.action.actionType.includes('AMENITY')) {
            replayTitle = verification.action.actionType.includes('CANCEL') ? 'Amenity Booking Cancelled' : 'Amenity Booking Confirmed';
            replayRoute = '/(resident)/amenities/my-bookings';
          } else if (verification.action.actionType === 'CREATE_PERSONAL_EXPENSE') {
            replayTitle = 'Expense Recorded';
            replayRoute = '/(resident)/expense-manager';
          } else if (verification.action.actionType === 'CREATE_COMPLAINT') {
            replayTitle = 'Complaint Submitted';
            replayRoute = '/(resident)/complaints/manage';
          } else if (verification.action.actionType === 'CANCEL_COMPLAINT') {
            replayTitle = 'Ticket Cancelled';
            replayRoute = '/(resident)/complaints/manage';
          } else if (verification.action.actionType === 'ACKNOWLEDGE_NOTICE') {
            replayTitle = 'Notice Acknowledged';
            replayRoute = '/(resident)/notices';
          } else if (verification.action.actionType === 'CAST_POLL_VOTE') {
            replayTitle = 'Vote Recorded';
            replayRoute = '/(resident)/polls';
          } else if (verification.action.actionType === 'CREATE_POLL') {
            replayTitle = 'Community Poll Published';
            replayRoute = '/(resident)/polls/active';
          } else if (verification.action.actionType === 'CREATE_NOTICE') {
            replayTitle = 'Notice Published';
            replayRoute = '/(resident)/notices';
          }

          const cachedAction = {
            type: 'action_result',
            status: 'success',
            actionType: verification.action.actionType,
            title: replayTitle,
            message: verification.executionResult?.message || 'Action was already completed successfully.',
            referenceId: ref,
            route: replayRoute,
          };
          return {
            success: true,
            executed: true,
            idempotentReplay: true,
            actionType: verification.action.actionType,
            data: verification.executionResult,
            action: cachedAction,
            message: 'Action was already completed successfully. (Idempotent response)',
          };
        }

        const actionRecord = verification.action;
        const lease = await acquireExecutionLease(actionId);
        if (!lease || !lease.acquired) {
          return {
            success: false,
            error: 'Action is currently executing or in an invalid state.',
          };
        }

        // Verify that the worker still holds the lease before executing domain mutations
        const stillActive = await isLeaseActive(actionId, lease.leaseToken);
        if (!stillActive) {
          return {
            success: false,
            error: 'Execution lease expired or was preempted by another worker before writing to domain.',
          };
        }

        try {
          let executionResult = null;

          if (actionRecord.actionType === 'CREATE_VISITOR_PASS') {
            if (!visitorPassService || typeof visitorPassService.createPass !== 'function') {
              throw new Error('Visitor pass service is currently unavailable.');
            }

            const p = actionRecord.params;
            const villaId = user?.villaId || user?.tenantMembership?.villaId;

            // Deterministic domain recovery check via unique clientReference (with getActivePasses fallback)
            let existingPass = null;
            if (typeof visitorPassService.getPassByClientReference === 'function') {
              existingPass = await visitorPassService.getPassByClientReference(orgId, userId, actionRecord.actionId).catch(() => null);
            } else if (typeof visitorPassService.getActivePasses === 'function') {
              const checkPasses = await visitorPassService.getActivePasses(orgId, { createdById: userId, limit: 5 }).catch(() => null);
              const passes = checkPasses?.data || (Array.isArray(checkPasses) ? checkPasses : []);
              existingPass = passes.find(
                (pass) =>
                  pass.clientReference === actionRecord.actionId ||
                  (pass.visitorDetails?.name === p.visitorName &&
                    pass.validity?.startDate &&
                    new Date(pass.validity.startDate).toISOString().slice(0, 10) === p.dateStr &&
                    pass.createdAt &&
                    Date.now() - new Date(pass.createdAt).getTime() < 300000)
              );
            }

            let createdPass = existingPass;
            if (!createdPass) {
              try {
                createdPass = await visitorPassService.createPass({
                  orgId,
                  createdById: userId,
                  passType: p.passType || 'GUEST',
                  status: 'PENDING',
                  clientReference: actionRecord.actionId,
                  visitorDetails: {
                    name: p.visitorName,
                    ...(p.phone ? { phone: p.phone } : {}),
                  },
                  validity: {
                    startDate: new Date(p.startDate),
                    endDate: new Date(p.endDate),
                    timeWindowStart: p.timeWindowStart || '10:00',
                    timeWindowEnd: p.timeWindowEnd || '23:59',
                  },
                  ...(p.vehicleNumber ? { vehicleDetails: { number: p.vehicleNumber } } : {}),
                  ...(p.purpose ? { purpose: p.purpose } : {}),
                  ...(villaId ? { villaId } : {}),
                });
              } catch (createErr) {
                if (createErr.code === 11000 || String(createErr.message || '').includes('E11000')) {
                  if (typeof visitorPassService.getPassByClientReference === 'function') {
                    createdPass = await visitorPassService.getPassByClientReference(orgId, userId, actionRecord.actionId).catch(() => null);
                  }
                }
                if (!createdPass) throw createErr;
              }
            }

            executionResult = {
              passId: String(createdPass._id || createdPass.id),
              visitorName: p.visitorName,
              shortKey: createdPass.shortKey || 'VP-PASS',
              status: createdPass.status || 'PENDING',
              validityDate: p.dateStr,
              timeWindow: `${p.timeWindowStart} - ${p.timeWindowEnd}`,
              message: `Visitor pass created successfully for ${p.visitorName}! Pass ID: ${createdPass._id || createdPass.id}, Entry Code: ${createdPass.shortKey || 'Active'}.`,
            };
          } else if (actionRecord.actionType === 'REVOKE_VISITOR_PASS') {
            if (!visitorPassService || typeof visitorPassService.revokePass !== 'function') {
              throw new Error('Visitor pass service is currently unavailable.');
            }

            const p = actionRecord.params;
            try {
              await visitorPassService.revokePass(p.passId, orgId, null, {
                actorId: userId,
                source: 'ai_assistant',
                reason: 'Revoked via AI Assistant',
              });
            } catch (revokeErr) {
              if (!String(revokeErr?.message || '').toLowerCase().includes('already revoked')) {
                throw revokeErr;
              }
            }

            executionResult = {
              passId: p.passId,
              visitorName: p.visitorName,
              status: 'REVOKED',
              message: `Visitor pass for ${p.visitorName} has been revoked successfully.`,
            };
          } else if (actionRecord.actionType === 'CREATE_AMENITY_BOOKING') {
            if (!amenityBookingService || typeof amenityBookingService.createBooking !== 'function') {
              throw new Error('Amenity booking service is currently unavailable.');
            }

            const p = actionRecord.params;
            const deterministicBookingId = `BKG-AI-${actionRecord.actionId.replace(/^act_/, '')}`;

            // Check if booking already exists with this deterministic bookingId
            let existingBooking = null;
            if (typeof amenityBookingService.getBookingById === 'function') {
              existingBooking = await amenityBookingService.getBookingById(deterministicBookingId, orgId).catch(() => null);
            }

            let createdBooking = existingBooking;
            if (!createdBooking) {
              const bookingPayload = {
                orgId,
                amenityId: p.amenityId,
                userId,
                bookingId: deterministicBookingId,
                bookingDate: p.dateStr,
                startTime: p.startTime,
                endTime: p.endTime,
                numberOfPersons: p.numberOfPersons || 1,
                paymentMethod: p.preferredPaymentMethod || 'WALLET',
              };

              try {
                createdBooking = await amenityBookingService.createBooking(bookingPayload);
              } catch (bookErr) {
                if (bookErr.code === 11000 || String(bookErr.message || '').includes('E11000')) {
                  if (typeof amenityBookingService.getBookingById === 'function') {
                    createdBooking = await amenityBookingService.getBookingById(deterministicBookingId, orgId).catch(() => null);
                  }
                }
                // Handle insufficient wallet balance gracefully
                if (!createdBooking && (String(bookErr?.message || '').toLowerCase().includes('insufficient wallet balance') || p.isWalletShort)) {
                  executionResult = {
                    bookingId: deterministicBookingId,
                    amenityName: p.amenityName,
                    date: p.dateStr,
                    timeSlot: `${p.startTime} - ${p.endTime}`,
                    status: 'pending_payment',
                    paymentMethod: 'ONLINE',
                    requiresOnlinePayment: true,
                    rate: p.estimatedCost,
                    walletBalance: p.walletBalance || 0,
                    route: `/(resident)/amenities/booking/${p.amenityId}?date=${p.dateStr}&slot=${p.startTime}&payOnline=1`,
                    message: `Your reservation request for ${p.amenityName} has been held! Your wallet balance is insufficient, so please click below to complete payment via Online Payment (Google Pay, PhonePe, UPI, or Card).`,
                  };
                } else if (!createdBooking) {
                  throw bookErr;
                }
              }
            }

            if (createdBooking && !executionResult) {
              const isPendingPayment = p.isWalletShort || createdBooking.status === 'pending' || createdBooking.paymentStatus === 'pending';
              executionResult = {
                bookingId: String(createdBooking._id || createdBooking.bookingId),
                amenityName: p.amenityName,
                date: p.dateStr,
                timeSlot: `${p.startTime} - ${p.endTime}`,
                status: isPendingPayment ? 'pending_payment' : (createdBooking.status || 'confirmed'),
                paymentMethod: isPendingPayment ? 'ONLINE' : 'WALLET',
                requiresOnlinePayment: isPendingPayment,
                qrCode: createdBooking.qrCode || null,
                route: `/(resident)/amenities/booking/${p.amenityId}?date=${p.dateStr}&slot=${p.startTime}&payOnline=1`,
                message: isPendingPayment
                  ? `Your reservation request for ${p.amenityName} has been held! Your wallet balance is insufficient, so please click below to complete online payment of ${p.estimatedCost} via Google Pay, PhonePe, UPI, or Card.`
                  : `Booking confirmed for ${p.amenityName} on ${p.dateStr} (${p.startTime} - ${p.endTime}). Booking ID: ${createdBooking._id || createdBooking.bookingId}.`,
              };
            }
          } else if (actionRecord.actionType === 'CANCEL_AMENITY_BOOKING') {
            if (!amenityBookingService || typeof amenityBookingService.cancelBooking !== 'function') {
              throw new Error('Amenity booking service is currently unavailable.');
            }

            const p = actionRecord.params;
            let cancelResult = null;
            try {
              cancelResult = await amenityBookingService.cancelBooking(
                p.bookingId,
                userId,
                orgId,
                'Cancelled via AI Assistant',
                false
              );
            } catch (cancelErr) {
              let recovered = null;
              if (typeof amenityBookingService.getBookingById === 'function') {
                recovered = await amenityBookingService.getBookingById(p.bookingId, orgId).catch(() => null);
              }
              if (recovered && (recovered.status === 'cancelled' || String(cancelErr?.message || '').toLowerCase().includes('cannot be cancelled'))) {
                cancelResult = { refundAmount: recovered.pricingDetails?.refundAmount ?? null };
              } else {
                throw cancelErr;
              }
            }

            executionResult = {
              bookingId: p.bookingId,
              amenityName: p.amenityName,
              status: 'cancelled',
              refundAmount: cancelResult?.refundAmount ?? null,
              message: `Booking for ${p.amenityName} (ID: ${p.bookingId}) has been cancelled successfully.`,
            };
          } else if (actionRecord.actionType === 'CREATE_PERSONAL_EXPENSE') {
            if (!personalExpenseService || typeof personalExpenseService.createTransaction !== 'function') {
              throw new Error('Personal expense service is currently unavailable.');
            }

            const p = actionRecord.params;
            const expensePayload = {
              type: 'EXPENSE',
              amount: p.amount,
              categoryId: p.categoryId,
              transactionDate: p.transactionDate,
              paymentMethod: p.paymentMethod || 'UPI',
              paymentSettlement: p.paymentSettlement || 'PAID',
              merchantOrSource: p.merchantOrSource,
              reference: actionRecord.actionId,
              ...(p.notes ? { notes: p.notes } : {}),
            };

            const userContext = {
              id: userId,
              _id: userId,
              orgId,
            };

            // Deterministic lookup by reference (with repo fallback)
            let existingTx = null;
            if (typeof personalExpenseService.getTransactionByReference === 'function') {
              existingTx = await personalExpenseService.getTransactionByReference(userContext, actionRecord.actionId).catch(() => null);
            } else if (personalExpenseService?.repo && typeof personalExpenseService.repo.listTransactions === 'function') {
              const checkTx = await personalExpenseService.repo.listTransactions({ ...userContext, isDeleted: false, reference: actionRecord.actionId }, { skip: 0, limit: 1 }).catch(() => null);
              existingTx = checkTx?.items?.[0] || null;
            }

            let createdTx = existingTx;
            let txResult = null;
            if (!createdTx) {
              try {
                txResult = await personalExpenseService.createTransaction(userContext, expensePayload);
                createdTx = txResult?.transaction || txResult;
              } catch (txErr) {
                if (txErr.code === 11000 || String(txErr.message || '').includes('E11000')) {
                  if (typeof personalExpenseService.getTransactionByReference === 'function') {
                    createdTx = await personalExpenseService.getTransactionByReference(userContext, actionRecord.actionId).catch(() => null);
                  }
                }
                if (!createdTx) throw txErr;
              }
            }

            const txId = String(createdTx?._id || createdTx?.id || 'TX-SUCCESS');

            executionResult = {
              transactionId: txId,
              amount: p.amount,
              categoryName: p.categoryName,
              merchantOrSource: p.merchantOrSource,
              transactionDate: p.transactionDate,
              paymentMethod: p.paymentMethod,
              duplicateWarning: Boolean(txResult?.duplicateWarning),
              message: `Personal expense of ₹${p.amount} for "${p.merchantOrSource}" has been recorded successfully!${txResult?.duplicateWarning ? ' (Note: Possible duplicate transaction detected)' : ''}`,
            };
          } else if (actionRecord.actionType === 'CREATE_COMPLAINT') {
            if (!complaintService || typeof complaintService.createComplaint !== 'function') {
              throw new Error('Complaint service is currently unavailable.');
            }

            const p = actionRecord.params;
            const residentName = user?.name || user?.fullName || 'Resident';

            // Deterministic domain recovery check via aiAnalysisMetadata.aiStatus (with getComplaints fallback)
            let existingComplaint = null;
            if (typeof complaintService.getComplaintByAiStatus === 'function') {
              existingComplaint = await complaintService.getComplaintByAiStatus(orgId, userId, actionRecord.actionId).catch(() => null);
            } else if (typeof complaintService.getComplaints === 'function') {
              const checkComplaints = await complaintService.getComplaints(orgId, { residentId: userId }, { page: 1, limit: 5 }, {}).catch(() => null);
              const list = checkComplaints?.data || (Array.isArray(checkComplaints) ? checkComplaints : []);
              existingComplaint = list.find(
                (c) =>
                  c.aiAnalysisMetadata?.aiStatus === actionRecord.actionId ||
                  (c.title === p.title && c.createdAt && Date.now() - new Date(c.createdAt).getTime() < 300000)
              );
            }

            const complaintData = {
              title: p.title,
              description: p.description || p.title,
              category: p.category || 'General Maintenance',
              priority: p.priority || 'Medium',
              location: p.location || { flat: user?.flat || 'Resident Flat' },
              residentEmail: p.residentEmail || user?.email,
              residentMobile: p.residentMobile || user?.phone || user?.mobile,
              ignoreDuplicateWarning: true,
              aiAnalysisMetadata: {
                aiStatus: actionRecord.actionId,
                aiTags: ['ai_proposal', actionRecord.actionId],
              },
            };

            let createdComplaint = existingComplaint;
            if (!createdComplaint) {
              try {
                createdComplaint = await complaintService.createComplaint(
                  orgId,
                  userId,
                  residentName,
                  complaintData,
                  { source: 'ai_assistant' }
                );
              } catch (cErr) {
                if (cErr.code === 11000 || String(cErr.message || '').includes('E11000')) {
                  if (typeof complaintService.getComplaintByAiStatus === 'function') {
                    createdComplaint = await complaintService.getComplaintByAiStatus(orgId, userId, actionRecord.actionId).catch(() => null);
                  }
                }
                if (!createdComplaint) throw cErr;
              }
            }

            const cNumber = createdComplaint.complaintNumber || String(createdComplaint._id);
            executionResult = {
              complaintId: String(createdComplaint._id),
              complaintNumber: cNumber,
              title: p.title,
              status: createdComplaint.status || 'Open',
              priority: createdComplaint.priority || p.priority,
              slaDueDate: createdComplaint.slaDueDate,
              message: `Complaint registered successfully! Ticket #${cNumber}. Priority: ${createdComplaint.priority || p.priority}. Status: ${createdComplaint.status || 'Open'}.`,
            };
          } else if (actionRecord.actionType === 'CANCEL_COMPLAINT') {
            if (!complaintService || typeof complaintService.cancelComplaint !== 'function') {
              throw new Error('Complaint service is currently unavailable.');
            }

            const p = actionRecord.params;
            const userName = user?.name || user?.fullName || 'Resident';
            const userRole = user?.role || 'Resident';

            await complaintService.cancelComplaint(
              p.complaintId,
              orgId,
              userId,
              userName,
              userRole,
              p.reason || 'Cancelled via AI Assistant',
              { source: 'ai_assistant' }
            );

            executionResult = {
              complaintId: p.complaintId,
              complaintNumber: p.complaintNumber,
              status: 'Cancelled',
              message: `Complaint ticket #${p.complaintNumber || p.complaintId} has been cancelled successfully.`,
            };
          } else if (actionRecord.actionType === 'ACKNOWLEDGE_NOTICE') {
            if (!noticeAcknowledgementService || typeof noticeAcknowledgementService.acknowledgeNotice !== 'function') {
              throw new Error('Notice acknowledgement service is currently unavailable.');
            }

            const p = actionRecord.params;
            const unitId = user?.villaId || user?.tenantMembership?.villaId || null;

            try {
              await noticeAcknowledgementService.acknowledgeNotice(p.noticeId, userId, orgId, unitId);
            } catch (err) {
              if (!err.message?.toLowerCase().includes('already acknowledged')) {
                throw err;
              }
            }

            executionResult = {
              noticeId: p.noticeId,
              noticeTitle: p.noticeTitle,
              acknowledgedAt: new Date().toISOString(),
              message: `You have successfully acknowledged critical notice "${p.noticeTitle}".`,
            };
          } else if (actionRecord.actionType === 'CAST_POLL_VOTE') {
            if (!pollServices || typeof pollServices.voteOnPoll !== 'function') {
              throw new Error('Poll service is currently unavailable.');
            }

            const p = actionRecord.params;
            let alreadyVoted = false;
            if (typeof pollServices.hasResidentVoted === 'function') {
              alreadyVoted = await pollServices.hasResidentVoted(p.pollId, orgId, userId).catch(() => false);
            }

            if (!alreadyVoted) {
              try {
                await pollServices.voteOnPoll(p.pollId, orgId, userId, {
                  selectedOptionIndex: p.selectedOptionIndex,
                  selectedOptionIndices: p.selectedOptionIndices,
                  allowUnvote: false,
                });
              } catch (err) {
                if (!err.message?.toLowerCase().includes('already voted')) {
                  throw err;
                }
              }
            }

            executionResult = {
              pollId: p.pollId,
              pollTitle: p.pollTitle,
              chosenOptions: p.chosenOptionTexts || [],
              votedAt: new Date().toISOString(),
              message: `Your ballot for "${(p.chosenOptionTexts || []).join(', ')}" on "${p.pollTitle}" has been recorded successfully!`,
            };
          } else if (actionRecord.actionType === 'CREATE_AMENITY') {
            if (!amenityService || typeof amenityService.createAmenity !== 'function') {
              throw new Error('Amenity service is currently unavailable.');
            }

            if (!hasAmenityAdminPermission(user)) {
              throw new Error('Permission denied: only community administrators can create amenities.');
            }

            const p = actionRecord.params;

            // Deterministic check to avoid duplicate on retry/replay
            let createdAmenity = null;
            const existingAmenities = await amenityService.getAllAmenities(orgId, {}).catch(() => []);
            createdAmenity = (Array.isArray(existingAmenities) ? existingAmenities : []).find(
              (a) => !a.isDeleted && (a.name || '').toLowerCase() === (p.name || '').toLowerCase()
            );

            if (!createdAmenity) {
              createdAmenity = await amenityService.createAmenity(orgId, p);
            }

            const amenityId = String(createdAmenity._id || createdAmenity.id);
            const amenityCode = createdAmenity.code || `FAC-${p.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8)}`;

            executionResult = {
              amenityId,
              amenityCode,
              name: p.name,
              type: p.type,
              capacity: p.capacity,
              ratePerHour: p.ratePerHour,
              status: createdAmenity.status || 'active',
              message: `Amenity facility "${p.name}" has been created successfully in Amenity Master! Facility ID: ${amenityId}, Code: ${amenityCode}.`,
            };
          } else if (actionRecord.actionType === 'CREATE_ASSESSMENT') {
            if (!assessmentService || typeof assessmentService.createAssessment !== 'function') {
              throw new Error('Assessment service is currently unavailable.');
            }

            if (!hasAssessmentAdminPermission(user)) {
              throw new Error('Permission denied: only community administrators can create assessments.');
            }

            const p = actionRecord.params;

            let createdAssessment = null;
            if (typeof assessmentService.getAssessments === 'function') {
              const existing = await assessmentService.getAssessments({ communityId: orgId, name: p.name }).catch(() => null);
              const list = existing?.assessments || existing?.data || (Array.isArray(existing) ? existing : []);
              createdAssessment = list.find((a) => (a.name || '').toLowerCase() === (p.name || '').toLowerCase());
            }

            if (!createdAssessment) {
              createdAssessment = await assessmentService.createAssessment(p);
            }

            const assessmentId = String(createdAssessment._id || createdAssessment.id);

            executionResult = {
              assessmentId,
              name: p.name,
              amount: p.calculationMethod?.flatAmount,
              scope: p.targetScope?.type,
              status: 'Created',
              message: `Assessment template "${p.name}" has been created successfully! Assessment ID: ${assessmentId}.`,
            };
          } else if (actionRecord.actionType === 'CREATE_POLL') {
            const createPollFn = pollServices?.createPoll || pollServices?.default?.createPoll;
            if (typeof createPollFn !== 'function') {
              throw new Error('Poll service is currently unavailable.');
            }

            if (!hasPollAdminPermission(user)) {
              throw new Error('Permission denied: only community administrators can create polls.');
            }

            const p = actionRecord.params;
            const createdPoll = await createPollFn({
              orgId,
              createdBy: userId,
              title: p.title || p.question,
              question: p.question || p.title,
              options: p.options,
              category: p.category || 'General',
              isAnonymous: p.isAnonymous || false,
              endDate: p.endDate,
              votingMode: p.votingMode || 'ONE_PER_USER',
              choiceType: p.choiceType || 'SINGLE_CHOICE',
              description: p.description || '',
              status: 'Active',
            });

            const pollId = String(createdPoll._id || createdPoll.id);
            executionResult = {
              pollId,
              question: p.question || p.title,
              optionsCount: Array.isArray(p.options) ? p.options.length : 0,
              status: 'Active',
              route: '/(resident)/polls/active',
              message: `Community poll "${p.question || p.title}" has been created successfully! Poll ID: ${pollId}.`,
            };
          } else if (actionRecord.actionType === 'CREATE_NOTICE') {
            const createNoticeFn = noticeBoardService?.createNotice || noticeBoardService?.default?.createNotice;
            if (typeof createNoticeFn !== 'function') {
              throw new Error('Notice board service is currently unavailable.');
            }

            if (!hasNoticeAdminPermission(user)) {
              throw new Error('Permission denied: only community administrators can create notices.');
            }

            const p = actionRecord.params;
            const createdNotice = await createNoticeFn(
              {
                title: p.title,
                description: p.description,
                category: p.category || 'General',
                priority: p.priority || 'Medium',
                isPinned: Boolean(p.isPinned),
                requiresAcknowledgement: Boolean(p.requiresAcknowledgement),
                expiryDate: p.expiryDate,
                status: 'Published',
              },
              userId,
              orgId
            );

            const noticeId = String(createdNotice._id || createdNotice.id);
            executionResult = {
              noticeId,
              title: p.title,
              priority: p.priority,
              category: p.category,
              status: 'Published',
              route: '/(resident)/notices',
              message: `Community notice "${p.title}" [${p.priority} Priority] has been published successfully to the Notice Board! Notice ID: ${noticeId}.`,
            };
          } else {
            throw new Error(`Unsupported action type: ${actionRecord.actionType}`);
          }

          await recordActionSuccess(actionId, executionResult, lease.leaseToken);

          let resTitle = 'Action Completed';
          let resRoute = '/(resident)/dashboard';
          const resRef = executionResult.shortKey ||
                         executionResult.assessmentId ||
                         executionResult.amenityCode ||
                         executionResult.amenityId ||
                         executionResult.bookingId ||
                         executionResult.passId ||
                         executionResult.transactionId ||
                         executionResult.complaintNumber ||
                         executionResult.complaintId ||
                         executionResult.noticeId ||
                         executionResult.pollId;

          if (actionRecord.actionType.includes('VISITOR')) {
            resTitle = actionRecord.actionType.includes('REVOKE') ? 'Visitor Pass Revoked' : 'Visitor Pass Issued';
            resRoute = '/(resident)/visitor';
          } else if (actionRecord.actionType === 'CREATE_AMENITY') {
            resTitle = 'Amenity Facility Created';
            resRoute = '/(resident)/amenities/admin-master';
          } else if (actionRecord.actionType === 'CREATE_ASSESSMENT') {
            resTitle = 'Assessment Template Created';
            resRoute = '/(resident)/admin/billing/assessments';
          } else if (actionRecord.actionType.includes('AMENITY')) {
            resTitle = actionRecord.actionType.includes('CANCEL') ? 'Amenity Booking Cancelled' : 'Amenity Booking Confirmed';
            resRoute = '/(resident)/amenities/my-bookings';
          } else if (actionRecord.actionType === 'CREATE_PERSONAL_EXPENSE') {
            resTitle = 'Expense Recorded';
            resRoute = '/(resident)/expense-manager';
          } else if (actionRecord.actionType === 'CREATE_COMPLAINT') {
            resTitle = 'Complaint Submitted';
            resRoute = '/(resident)/complaints/manage';
          } else if (actionRecord.actionType === 'CANCEL_COMPLAINT') {
            resTitle = 'Ticket Cancelled';
            resRoute = '/(resident)/complaints/manage';
          } else if (actionRecord.actionType === 'ACKNOWLEDGE_NOTICE') {
            resTitle = 'Notice Acknowledged';
            resRoute = '/(resident)/notices';
          } else if (actionRecord.actionType === 'CAST_POLL_VOTE') {
            resTitle = 'Vote Recorded';
            resRoute = '/(resident)/polls';
          } else if (actionRecord.actionType === 'CREATE_POLL') {
            resTitle = 'Community Poll Published';
            resRoute = '/(resident)/polls/active';
          } else if (actionRecord.actionType === 'CREATE_NOTICE') {
            resTitle = 'Notice Published';
            resRoute = '/(resident)/notices';
          }

          if (executionResult?.status === 'pending_payment') {
            resTitle = 'Online Payment Required';
            resRoute = executionResult.route || resRoute;
          }

          const resultAction = {
            type: 'action_result',
            status: 'success',
            actionType: actionRecord.actionType,
            title: resTitle,
            message: executionResult.message,
            referenceId: resRef,
            route: resRoute,
          };

          return {
            success: true,
            executed: true,
            actionType: actionRecord.actionType,
            data: executionResult,
            action: resultAction,
            message: executionResult.message,
          };
        } catch (execErr) {
          await recordActionFailure(actionId, execErr, lease.leaseToken).catch(() => {});
          logger.error(`[AIAssistantTools] Failed executing action ${actionId}: ${execErr.message}`);
          return {
            success: false,
            error: execErr.message || 'Execution failed.',
          };
        }
      }

      // 8e. Cancel Pending Action Explicitly
      case 'cancel_pending_action': {
        const actionId = toolArgs?.actionId;
        if (actionId) {
          cancelPendingAction({ actionId, userId, orgId });
        } else {
          cancelActiveProposalsForUser(userId, orgId);
        }
        return {
          success: true,
          cancelled: true,
          data: { cancelled: true, actionId },
          action: {
            type: 'action_result',
            status: 'cancelled',
            title: 'Action Cancelled',
            message: 'The pending request was cancelled. No changes were made.',
          },
          message: 'The pending request was cancelled. No changes were made.',
        };
      }

      // 9. Navigation to Screen
      case 'navigate_to_screen': {
        const screenId = toolArgs?.screenId;
        const target = authorizedFeatures.find((f) => f.id === screenId);

        if (!target) {
          return {
            success: false,
            error: `Feature "${screenId}" is not authorized or does not exist for this account.`,
          };
        }

        return {
          success: true,
          data: {
            screenId,
            targetName: target.name,
            targetRoute: target.route,
            category: target.category,
          },
          action: {
            type: 'navigation',
            label: `Open ${target.name}`,
            route: target.route,
            screenId: target.id,
            targetName: target.name,
            category: target.category,
          },
        };
      }

      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (err) {
    logger.error(`[AIAssistantTools] Error executing tool '${toolName}': ${err.message}`, { stack: err.stack });
    return { success: false, error: `Failed to retrieve data: ${err.message}` };
  }
}
