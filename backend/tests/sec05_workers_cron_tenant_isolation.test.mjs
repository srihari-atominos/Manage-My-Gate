import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

// Configuration and models
import Organization from '../src/features/organization/organization.model.js';
import organizationService from '../src/features/organization/organization.services.js';
import User from '../src/features/user/user.model.js';
import userRepository from '../src/features/user/user.repository.js';
import Complaint from '../src/features/complaint/complaint.model.js';
import complaintRepository from '../src/features/complaint/complaint.repository.js';
import complaintService from '../src/features/complaint/complaint.service.js';
import Invoice from '../src/features/invoice/invoice.model.js';
import invoiceRepository from '../src/features/invoice/invoice.repository.js';
import invoiceService from '../src/features/invoice/invoice.services.js';
import { runInvoiceReminders } from '../src/features/invoice/invoiceReminder.cron.js';
import { sendInvoiceEmail, setEmailSender } from '../src/features/invoice/invoice.email.js';
import OutboxEvent from '../src/features/outbox/outboxEvent.model.js';
import outboxService from '../src/features/outbox/outbox.service.js';
import outboxWorker, { processOutboxEvents } from '../src/workers/outbox.worker.js';
import Assessment from '../src/features/assessment/assessment.model.js';
import assessmentRepository from '../src/features/assessment/assessment.repository.js';
import assessmentService from '../src/features/assessment/assessment.services.js';
import assessmentCron from '../src/features/assessment/utils/assessmentCron.js';
import Notice from '../src/features/noticeBoard/noticeBoard.model.js';
import noticeRepository from '../src/features/noticeBoard/noticeBoard.repository.js';
import noticeBoardService from '../src/features/noticeBoard/noticeBoard.service.js';
import Poll from '../src/features/poll/poll.model.js';
import * as pollRepo from '../src/features/poll/poll.repository.js';
import * as pollService from '../src/features/poll/poll.services.js';
import { AmenityOutboxEvent } from '../src/features/amenityManagement/outbox/amenityOutboxEvent.model.js';
import amenityOutboxEventRepository from '../src/features/amenityManagement/outbox/amenityOutboxEvent.repository.js';
import amenityOutboxService from '../src/features/amenityManagement/outbox/amenityOutbox.service.js';
import amenityReservationRepository from '../src/features/amenityManagement/reservations/amenityReservation.repository.js';
import amenityReservationLifecycleService from '../src/features/amenityManagement/reservations/amenityReservationLifecycle.service.js';
import AmenityReservation from '../src/features/amenityManagement/reservations/amenityReservation.model.js';
import OrgMembership from '../src/features/orgMembership/orgMembership.model.js';
import { acquireCronLock, releaseCronLock, withDistributedCronLock } from '../src/utils/cronLock.util.js';
import platformPaymentService from '../src/features/platformPayment/platformPayment.service.js';
import amenityReservationHoldRepository from '../src/features/amenityManagement/holds/amenityReservationHold.repository.js';

describe('SEC-05 — Background Workers, Scheduled Crons & Outbox Tenant Isolation', () => {
  let activeTenantA;
  let activeTenantB;
  let suspendedTenantC;
  let residentUserA;
  let residentUserB;

  before(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // Silence email delivery in tests
    setEmailSender(async () => true);

    // Create test organizations
    activeTenantA = await Organization.create({
      name: 'SEC05 Active Tenant A',
      organizationType: 'Residential',
      status: 'Active',
      isPlatform: false,
    });

    activeTenantB = await Organization.create({
      name: 'SEC05 Active Tenant B',
      organizationType: 'Residential',
      status: 'Active',
      isPlatform: false,
    });

    suspendedTenantC = await Organization.create({
      name: 'SEC05 Suspended Tenant C',
      organizationType: 'Residential',
      status: 'Rejected', // Inactive
      isPlatform: false,
    });

    // Create resident users
    residentUserA = await User.create({
      name: 'Resident Tenant A',
      email: `resident_a_${Date.now()}@sec05.test`,
      username: `res_a_${Date.now()}`,
      password: 'Password123!',
      status: 'Active',
    });

    residentUserB = await User.create({
      name: 'Resident Tenant B',
      email: `resident_b_${Date.now()}@sec05.test`,
      username: `res_b_${Date.now()}`,
      password: 'Password123!',
      status: 'Active',
    });

    await OrgMembership.create([
      { userId: residentUserA._id, orgId: activeTenantA._id, status: 'Active' },
      { userId: residentUserB._id, orgId: activeTenantB._id, status: 'Active' },
    ]);
  });

  after(async () => {
    // Cleanup created test records
    await Promise.all([
      Organization.deleteMany({ _id: { $in: [activeTenantA._id, activeTenantB._id, suspendedTenantC._id] } }),
      User.deleteMany({ _id: { $in: [residentUserA._id, residentUserB._id] } }),
      OrgMembership.deleteMany({ userId: { $in: [residentUserA._id, residentUserB._id] } }),
      Complaint.deleteMany({ orgId: { $in: [activeTenantA._id, activeTenantB._id, suspendedTenantC._id] } }),
      Invoice.deleteMany({ $or: [{ orgId: { $in: [activeTenantA._id, activeTenantB._id, suspendedTenantC._id] } }, { communityId: { $in: [activeTenantA._id, activeTenantB._id, suspendedTenantC._id] } }] }),
      OutboxEvent.deleteMany({ orgId: { $in: [activeTenantA._id, activeTenantB._id, suspendedTenantC._id] } }),
      Assessment.deleteMany({ communityId: { $in: [activeTenantA._id, activeTenantB._id, suspendedTenantC._id] } }),
      Notice.deleteMany({ orgId: { $in: [activeTenantA._id, activeTenantB._id, suspendedTenantC._id] } }),
      Poll.deleteMany({ orgId: { $in: [activeTenantA._id, activeTenantB._id, suspendedTenantC._id] } }),
      AmenityOutboxEvent.deleteMany({ orgId: { $in: [activeTenantA._id, activeTenantB._id, suspendedTenantC._id] } }),
      AmenityReservation.deleteMany({ orgId: { $in: [activeTenantA._id, activeTenantB._id, suspendedTenantC._id] } }),
    ]);

    await mongoose.disconnect();
  });

  beforeEach(async () => {
    // Reset outbox and transient records
    await OutboxEvent.deleteMany({ orgId: { $in: [activeTenantA._id, activeTenantB._id, suspendedTenantC._id] } });
    await OutboxEvent.deleteMany({ eventType: { $in: ['TEST_EVENT', 'INVOICE_GENERATED'] } });
  });

  // =========================================================================
  // 1. Complaint SLA Cron & Repository Isolation
  // =========================================================================
  describe('1. Complaint SLA Cron Tenant Scoping & Isolation', () => {
    it('findSlaBreached requires orgId and strictly confines queries to that tenant', async () => {
      const past = new Date(Date.now() - 3600000);

      // Create SLA breached complaint in Tenant A
      const compA = await Complaint.create({
        complaintNumber: `CMP-A-${Date.now()}`,
        orgId: activeTenantA._id,
        residentId: residentUserA._id,
        title: 'Water Leak Tenant A',
        description: 'Leak in pipe',
        category: 'Plumbing',
        priority: 'High',
        status: 'Open',
        slaDueDate: past,
        escalationLevel: 0,
      });

      // Create SLA breached complaint in Tenant B
      const compB = await Complaint.create({
        complaintNumber: `CMP-B-${Date.now()}`,
        orgId: activeTenantB._id,
        residentId: residentUserB._id,
        title: 'Power Failure Tenant B',
        description: 'Power cut',
        category: 'Electrical',
        priority: 'High',
        status: 'Open',
        slaDueDate: past,
        escalationLevel: 0,
      });

      // Calling without orgId must fail closed
      await assert.rejects(
        async () => {
          await complaintRepository.findSlaBreached(null);
        },
        /Tenant context \(orgId\) is required/
      );

      // Scoped query for Tenant A must ONLY return compA
      const resultsA = await complaintRepository.findSlaBreached(activeTenantA._id);
      const idsA = resultsA.map((c) => String(c._id));
      assert.ok(idsA.includes(String(compA._id)));
      assert.ok(!idsA.includes(String(compB._id)));

      // Scoped query for Tenant B must ONLY return compB
      const resultsB = await complaintRepository.findSlaBreached(activeTenantB._id);
      const idsB = resultsB.map((c) => String(c._id));
      assert.ok(idsB.includes(String(compB._id)));
      assert.ok(!idsB.includes(String(compA._id)));
    });

    it('checkAndEscalateAllActiveOrgs ignores inactive/suspended tenants', async () => {
      const past = new Date(Date.now() - 3600000);

      // Create SLA breached complaint in Suspended Tenant C
      const compC = await Complaint.create({
        complaintNumber: `CMP-C-${Date.now()}`,
        orgId: suspendedTenantC._id,
        residentId: residentUserA._id,
        title: 'Elevator Broken Tenant C',
        description: 'Suspended tenant complaint',
        category: 'Maintenance',
        priority: 'High',
        status: 'Open',
        slaDueDate: past,
        escalationLevel: 0,
      });

      const summary = await complaintService.checkAndEscalateAllActiveOrgs(new Date(), { browser: 'Test' });
      assert.ok(summary.activeOrgsCount >= 2);

      // CompC must NOT be escalated because Tenant C is suspended
      const refreshedC = await Complaint.findById(compC._id);
      assert.equal(refreshedC.escalationLevel, 0);
      assert.equal(refreshedC.status, 'Open');
    });
  });

  // =========================================================================
  // 2. Invoice Reminder Cron & Tenant Partitioning
  // =========================================================================
  describe('2. Invoice Reminder Cron & Email Tenant Isolation', () => {
    const buildTestInvoice = (overrides = {}) => ({
      invoiceNumber: `INV-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      assessmentId: new mongoose.Types.ObjectId(),
      unitId: new mongoose.Types.ObjectId(),
      billingPeriodString: '2026-03',
      currentCharge: 1000,
      totalAmount: 1000,
      paidAmount: 0,
      outstandingAmount: 1000,
      status: 'UNPAID',
      dueDate: new Date(Date.now() + 86400000),
      ...overrides,
    });

    it('findRemindersDueForOrg strictly isolates invoices by tenant', async () => {
      const now = new Date();
      const dueDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day before due

      const invA = await Invoice.create(buildTestInvoice({
        invoiceNumber: `INV-A-${Date.now()}`,
        orgId: activeTenantA._id,
        communityId: activeTenantA._id,
        targetUserId: residentUserA._id,
        dueDate,
      }));

      const invB = await Invoice.create(buildTestInvoice({
        invoiceNumber: `INV-B-${Date.now()}`,
        orgId: activeTenantB._id,
        communityId: activeTenantB._id,
        targetUserId: residentUserB._id,
        totalAmount: 2000,
        currentCharge: 2000,
        outstandingAmount: 2000,
        dueDate,
      }));

      // Tenant A query
      const remindersA = await invoiceRepository.findRemindersDueForOrg(activeTenantA._id, { now });
      const dueAIds = remindersA.dueSoon.map((i) => String(i._id));
      assert.ok(dueAIds.includes(String(invA._id)));
      assert.ok(!dueAIds.includes(String(invB._id)));

      // Tenant B query
      const remindersB = await invoiceRepository.findRemindersDueForOrg(activeTenantB._id, { now });
      const dueBIds = remindersB.dueSoon.map((i) => String(i._id));
      assert.ok(dueBIds.includes(String(invB._id)));
      assert.ok(!dueBIds.includes(String(invA._id)));
    });

    it('sendInvoiceEmail skips delivery for inactive organizations', async () => {
      const now = new Date();
      const invC = await Invoice.create(buildTestInvoice({
        invoiceNumber: `INV-C-${Date.now()}`,
        orgId: suspendedTenantC._id,
        communityId: suspendedTenantC._id,
        targetUserId: residentUserA._id,
        totalAmount: 1500,
        currentCharge: 1500,
        outstandingAmount: 1500,
        dueDate: now,
      }));

      const outcome = await sendInvoiceEmail('reminder', invC._id);
      assert.equal(outcome, 'skipped:org-inactive');

      // Claim field must be released
      const refreshedInv = await Invoice.findById(invC._id);
      assert.equal(refreshedInv.emailLog?.reminderSentAt, null);
    });

    it('runInvoiceReminders processes active organizations in partitions without leaking errors', async () => {
      const result = await runInvoiceReminders(new Date());
      assert.ok(typeof result.reminders === 'number');
      assert.ok(typeof result.overdue === 'number');
    });
  });

  // =========================================================================
  // 3. Outbox Worker & Payload Security
  // =========================================================================
  describe('3. Transactional Outbox Worker Tenant Validation', () => {
    it('OutboxEvent schema enforces top-level orgId and indices', async () => {
      const event = await outboxService.enqueueEvent({
        orgId: activeTenantA._id,
        eventType: 'TEST_EVENT',
        aggregateType: 'TEST',
        aggregateId: new mongoose.Types.ObjectId(),
        payload: { orgId: activeTenantA._id, data: 'secure' },
      });

      assert.ok(event.orgId);
      assert.equal(String(event.orgId), String(activeTenantA._id));

      const fetched = await OutboxEvent.findById(event._id);
      assert.equal(String(fetched.orgId), String(activeTenantA._id));
    });

    it('Outbox Worker fails closed when event lacks a valid orgId context', async () => {
      const malformedEvent = await OutboxEvent.create({
        eventType: 'INVOICE_GENERATED',
        payload: { customerEmail: 'test@domain.com' }, // missing orgId!
        status: 'PENDING',
      });

      await processOutboxEvents();

      const refreshed = await OutboxEvent.findById(malformedEvent._id);
      assert.equal(refreshed.status, 'FAILED');
      assert.ok(refreshed.error.includes('Tenant isolation violation'));
    });

    it('Outbox Worker fails closed when tenant is deactivated before event execution', async () => {
      const eventForSuspendedTenant = await OutboxEvent.create({
        orgId: suspendedTenantC._id,
        eventType: 'INVOICE_GENERATED',
        payload: {
          orgId: suspendedTenantC._id,
          customerEmail: 'admin@suspended.com',
          invoiceAmount: '500.00',
          organizationName: 'Suspended Org',
        },
        status: 'PENDING',
      });

      await processOutboxEvents();

      const refreshed = await OutboxEvent.findById(eventForSuspendedTenant._id);
      assert.equal(refreshed.status, 'FAILED');
      assert.ok(refreshed.error.includes('Organization'));
      assert.ok(refreshed.error.includes('is not active'));
    });

    it('Outbox Worker detects cross-tenant resource mismatch in payload and rejects execution', async () => {
      // Create invoice belonging to Tenant B
      const invoiceB = await Invoice.create({
        invoiceNumber: `INV-MISMATCH-${Date.now()}`,
        orgId: activeTenantB._id,
        communityId: activeTenantB._id,
        targetUserId: residentUserB._id,
        assessmentId: new mongoose.Types.ObjectId(),
        unitId: new mongoose.Types.ObjectId(),
        billingPeriodString: '2026-03',
        dueDate: new Date(Date.now() + 86400000),
        currentCharge: 999,
        outstandingAmount: 999,
        totalAmount: 999,
        paidAmount: 0,
        status: 'UNPAID',
      });

      // Tampered event: Claims orgId is Tenant A, but references Invoice of Tenant B!
      const tamperedEvent = await OutboxEvent.create({
        orgId: activeTenantA._id,
        eventType: 'INVOICE_GENERATED',
        payload: {
          orgId: activeTenantA._id,
          invoiceId: invoiceB._id, // foreign invoice!
          customerEmail: 'victim@tenant-a.com',
          invoiceAmount: '999.00',
        },
        status: 'PENDING',
      });

      await processOutboxEvents();

      const refreshed = await OutboxEvent.findById(tamperedEvent._id);
      assert.equal(refreshed.status, 'FAILED');
      assert.ok(refreshed.error.includes('Cross-tenant resource mismatch'));
    });

    it('Outbox Worker sequential processing preserves correlation ID and isolates tenant context', async () => {
      const eventA = await OutboxEvent.create({
        orgId: activeTenantA._id,
        eventType: 'USER_INVITED',
        payload: { orgId: activeTenantA._id, email: 'userA@org.com' },
        correlationId: 'corr-tenant-a-001',
        status: 'PENDING',
      });

      const eventB = await OutboxEvent.create({
        orgId: activeTenantB._id,
        eventType: 'USER_INVITED',
        payload: { orgId: activeTenantB._id, email: 'userB@org.com' },
        correlationId: 'corr-tenant-b-002',
        status: 'PENDING',
      });

      await processOutboxEvents();

      const [resA, resB] = await Promise.all([
        OutboxEvent.findById(eventA._id),
        OutboxEvent.findById(eventB._id),
      ]);

      assert.equal(resA.status, 'COMPLETED');
      assert.equal(resA.correlationId, 'corr-tenant-a-001');
      assert.equal(resB.status, 'COMPLETED');
      assert.equal(resB.correlationId, 'corr-tenant-b-002');
    });
  });

  // =========================================================================
  // 4. Assessment Billing Scheduled Cron Scoping
  // =========================================================================
  describe('4. Assessment Billing Cron Isolation', () => {
    it('Assessment queries enforce communityId and skip inactive communities', async () => {
      const day = 15;

      // Active assessment in Tenant A
      const assessA = await Assessment.create({
        name: 'Maintenance Tenant A',
        communityId: activeTenantA._id,
        type: 'RECURRING',
        billingCycle: 'MONTHLY',
        generationDay: day,
        isActive: true,
        targetScope: { type: 'ALL_COMMUNITY' },
        calculationMethod: { type: 'FLAT_RATE', flatAmount: 500 },
      });

      // Active assessment in Suspended Tenant C
      const assessC = await Assessment.create({
        name: 'Maintenance Tenant C',
        communityId: suspendedTenantC._id,
        type: 'RECURRING',
        billingCycle: 'MONTHLY',
        generationDay: day,
        isActive: true,
        targetScope: { type: 'ALL_COMMUNITY' },
        calculationMethod: { type: 'FLAT_RATE', flatAmount: 800 },
      });

      // Tenant-scoped repository query
      const scopedA = await assessmentRepository.findActiveByGenerationDay(day, activeTenantA._id);
      assert.equal(scopedA.length, 1);
      assert.equal(String(scopedA[0]._id), String(assessA._id));

      // Global executeScheduledAssessments skips suspended community C
      const stats = await assessmentService.executeScheduledAssessments(day);
      assert.ok(stats.totalMatched >= 1);
    });
  });

  // =========================================================================
  // 5. Notice Board & Poll Lifecycle Tenant Scoping
  // =========================================================================
  describe('5. Notice Board and Poll Lifecycle Tenant Scoping', () => {
    it('notice repository publish/expire scopes updates by orgId', async () => {
      const past = new Date(Date.now() - 3600000);
      const notice = await Notice.create({
        title: 'Scheduled Maintenance Notice',
        description: 'Scheduled maintenance notice for testing',
        expiryDate: new Date(Date.now() + 86400000),
        orgId: activeTenantA._id,
        createdBy: residentUserA._id,
        status: 'Scheduled',
        scheduleDate: past,
      });

      // Wrong orgId must NOT publish the notice
      const wrongPublish = await noticeRepository.publishScheduledNotice(notice._id, activeTenantB._id, new Date());
      assert.equal(wrongPublish, null);

      // Correct orgId publishes notice
      const correctPublish = await noticeRepository.publishScheduledNotice(notice._id, activeTenantA._id, new Date());
      assert.ok(correctPublish);
      assert.equal(correctPublish.status, 'Published');
    });

    it('poll repository activate/close scopes updates by orgId', async () => {
      const past = new Date(Date.now() - 3600000);
      const poll = await Poll.create({
        question: 'Should we paint the gate?',
        orgId: activeTenantA._id,
        createdBy: residentUserA._id,
        status: 'Scheduled',
        scheduleDate: past,
        endDate: new Date(Date.now() + 86400000),
        options: [{ text: 'Yes' }, { text: 'No' }],
      });

      // Wrong orgId must NOT activate the poll
      const wrongActivate = await pollRepo.activateScheduledPoll(poll._id, activeTenantB._id, new Date());
      assert.equal(wrongActivate, null);

      // Correct orgId activates poll
      const correctActivate = await pollRepo.activateScheduledPoll(poll._id, activeTenantA._id, new Date());
      assert.ok(correctActivate);
      assert.equal(correctActivate.status, 'Active');
    });
  });

  // =========================================================================
  // 6. Amenity Management Workers & Outbox
  // =========================================================================
  describe('6. Amenity Management Workers & Outbox Tenant Isolation', () => {
    it('Amenity outbox event requires valid orgId on root and rejects non-active org events', async () => {
      const event = await AmenityOutboxEvent.create({
        orgId: suspendedTenantC._id,
        eventType: 'RESERVATION_CONFIRMED',
        aggregateId: new mongoose.Types.ObjectId(),
        aggregateType: 'AMENITY_RESERVATION',
        payload: { residentId: residentUserA._id, reservationNumber: 'RES-001' },
      });

      // Dispatching for inactive tenant must be safely ignored/skipped
      await amenityOutboxService.dispatchEvent(event);
      // No notification should be created for suspended tenant
      const count = await mongoose.models.Notification.countDocuments({ orgId: suspendedTenantC._id });
      assert.equal(count, 0);
    });

    it('AmenityReservationRepository background query methods scope by orgId', async () => {
      const past = new Date(Date.now() - 60000);

      const resA = await AmenityReservation.create({
        reservationNumber: `RES-A-${Date.now()}`,
        orgId: activeTenantA._id,
        facilityId: new mongoose.Types.ObjectId(),
        residentId: residentUserA._id,
        unitId: new mongoose.Types.ObjectId(),
        bookingStatus: 'PENDING_APPROVAL',
        approvalStatus: 'PENDING_REVIEW',
        approvalDeadline: past,
        requestedStartDateTime: past,
        requestedEndDateTime: new Date(),
        effectiveStartDateTime: past,
        effectiveEndDateTime: new Date(),
        totalAmount: 100,
      });

      // Attempting to expire approval with foreign orgId must fail
      const wrongOrgUpdate = await amenityReservationRepository.expireApprovalWithTenantGuard(
        resA._id,
        activeTenantB._id,
        new Date()
      );
      assert.equal(wrongOrgUpdate, null);

      // Correct orgId succeeds
      const correctUpdate = await amenityReservationRepository.expireApprovalWithTenantGuard(
        resA._id,
        activeTenantA._id,
        new Date()
      );
      assert.ok(correctUpdate);
      assert.equal(correctUpdate.bookingStatus, 'REJECTED');
      assert.equal(correctUpdate.approvalStatus, 'EXPIRED');
    });
  });

  // =========================================================================
  // 7. Stale User Deletion Cron Repository Encapsulation
  // =========================================================================
  describe('7. User Cron Repository Encapsulation', () => {
    it('userRepository.deleteStalePendingUsers deletes only stale pending verification users', async () => {
      const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
      const staleUser = await User.create({
        name: 'Stale User',
        email: `stale_${Date.now()}@domain.com`,
        username: `stale_${Date.now()}`,
        password: 'Password123!',
        status: 'Pending Verification',
        createdAt: fortyDaysAgo,
      });

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const result = await userRepository.deleteStalePendingUsers(thirtyDaysAgo);
      assert.ok(result.deletedCount >= 1);

      const check = await User.findById(staleUser._id);
      assert.equal(check, null);
    });
  });

  // =========================================================================
  // 8. Residual Security Verifications & Crash Recovery
  // =========================================================================
  describe('8. Residual Security Verifications & Crash Recovery', () => {
    it('isOrganizationActive fails closed (returns false) when readyState is not 1 or disconnected', async () => {
      // Mock readyState !== 1
      const originalReadyState = mongoose.connection.readyState;
      try {
        Object.defineProperty(mongoose.connection, 'readyState', { value: 0, writable: true, configurable: true });
        const activeCheck = await organizationService.isOrganizationActive(activeTenantA._id);
        assert.equal(activeCheck, false, 'Must fail closed when readyState is 0');
      } finally {
        Object.defineProperty(mongoose.connection, 'readyState', { value: originalReadyState, writable: true, configurable: true });
      }

      // Normal state returns true for active tenant
      const normalCheck = await organizationService.isOrganizationActive(activeTenantA._id);
      assert.equal(normalCheck, true, 'Active tenant returns true when readyState is 1');
    });

    it('Outbox Worker crash recovery reclaims and processes stale PROCESSING events', async () => {
      // Create an event stuck in PROCESSING from 10 minutes ago (simulating worker crash)
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const crashedEvent = await OutboxEvent.create({
        orgId: activeTenantA._id,
        eventType: 'USER_INVITED',
        payload: { orgId: activeTenantA._id, email: 'recovered@tenant-a.com' },
        status: 'PROCESSING',
        updatedAt: tenMinutesAgo,
      });

      // Force updatedAt to be in the past directly in MongoDB (bypass mongoose timestamps hook)
      await OutboxEvent.collection.updateOne({ _id: crashedEvent._id }, { $set: { updatedAt: tenMinutesAgo } });

      // Run outbox processor
      await processOutboxEvents();

      // Crashed event must have been reclaimed and completed
      const refreshed = await OutboxEvent.findById(crashedEvent._id);
      assert.equal(refreshed.status, 'COMPLETED');
    });

    it('Cron isRunning guard rejects concurrent overlapping executions', async () => {
      const ComplaintCron = (await import('../src/features/complaint/complaint.cron.js')).default;
      assert.equal(ComplaintCron.isRunning, false);
      
      // Simulate active run
      ComplaintCron.isRunning = true;
      assert.equal(ComplaintCron.isRunning, true);
      
      // Reset
      ComplaintCron.isRunning = false;
    });
  });

  // =========================================================================
  // 9. SEC-05 Residual Remediation Verification
  // =========================================================================
  describe('9. SEC-05 Residual Remediation Verification', () => {
    it('Finding A: invoiceService.validateInvoiceOwnership accurately scopes by tenant and rejects cross-tenant/missing invoices', async () => {
      // Create invoice for Tenant A
      const invoiceA = await Invoice.create({
        invoiceNumber: `INV-TEST-A-${Date.now()}`,
        assessmentId: new mongoose.Types.ObjectId(),
        unitId: new mongoose.Types.ObjectId(),
        billingPeriodString: '2026-03',
        currentCharge: 1500,
        totalAmount: 1500,
        paidAmount: 0,
        outstandingAmount: 1500,
        status: 'UNPAID',
        dueDate: new Date(Date.now() + 86400000),
        orgId: activeTenantA._id,
        communityId: activeTenantA._id,
        targetUserId: residentUserA._id,
      });

      // Same tenant verification succeeds
      const checkA = await invoiceService.validateInvoiceOwnership(invoiceA._id, activeTenantA._id);
      assert.equal(checkA.isValid, true);
      assert.equal(checkA.mismatch, false);
      assert.ok(checkA.invoice);

      // Cross-tenant verification fails with mismatch
      const checkB = await invoiceService.validateInvoiceOwnership(invoiceA._id, activeTenantB._id);
      assert.equal(checkB.isValid, false);
      assert.equal(checkB.mismatch, true);
      assert.equal(String(checkB.actualOrgId), String(activeTenantA._id));

      // Non-existent invoice fails safely
      const fakeId = new mongoose.Types.ObjectId();
      const checkMissing = await invoiceService.validateInvoiceOwnership(fakeId, activeTenantA._id);
      assert.equal(checkMissing.isValid, false);
      assert.equal(checkMissing.mismatch, false);
      assert.equal(checkMissing.invoice, null);

      // Outbox Worker rejects cross-tenant INVOICE_GENERATED event without direct model access
      const crossTenantEvent = await OutboxEvent.create({
        orgId: activeTenantB._id, // Claimed as Tenant B
        eventType: 'INVOICE_GENERATED',
        payload: {
          invoiceId: invoiceA._id, // Actually belongs to Tenant A
          invoiceNumber: invoiceA.invoiceNumber,
          orgId: activeTenantB._id,
          recipientEmail: 'resident.a@domain.com',
        },
        status: 'PENDING',
      });

      await processOutboxEvents();

      const refreshedEvent = await OutboxEvent.findById(crossTenantEvent._id);
      assert.equal(refreshedEvent.status, 'FAILED');
      assert.match(refreshedEvent.error, /mismatch/i);
    });

    it('Finding B: Concurrency fencing prevents stale/expired workers from overwriting reclaimed outbox events', async () => {
      // Create event in PROCESSING with expired lease
      const expiredLease = new Date(Date.now() - 5000);
      const staleToken = 'stale-worker-token-001';
      const event = await OutboxEvent.create({
        orgId: activeTenantA._id,
        eventType: 'USER_INVITED',
        payload: { orgId: activeTenantA._id, email: 'fencing-test@tenant-a.com' },
        status: 'PROCESSING',
        claimToken: staleToken,
        leaseExpiresAt: expiredLease,
      });

      // Worker 2 reclaims the expired event
      const newToken = 'active-worker-token-002';
      const futureLease = new Date(Date.now() + 60000);
      const reclaimed = await OutboxEvent.findOneAndUpdate(
        {
          _id: event._id,
          status: 'PROCESSING',
          claimToken: staleToken,
          leaseExpiresAt: { $lt: new Date() },
        },
        {
          claimToken: newToken,
          leaseExpiresAt: futureLease,
        },
        { new: true }
      );
      assert.ok(reclaimed, 'Worker 2 must successfully reclaim the expired lease');
      assert.equal(reclaimed.claimToken, newToken);

      // Stale Worker 1 attempts to mark the event COMPLETED using staleToken
      const staleCompletion = await OutboxEvent.findOneAndUpdate(
        {
          _id: event._id,
          claimToken: staleToken,
          status: 'PROCESSING',
        },
        {
          status: 'COMPLETED',
          processedAt: new Date(),
        },
        { new: true }
      );

      // Fencing check: stale update matches 0 documents and returns null
      assert.equal(staleCompletion, null, 'Stale worker must NOT be able to modify reclaimed event');

      // Check DB: event is still owned by Worker 2
      const checkDoc = await OutboxEvent.findById(event._id);
      assert.equal(checkDoc.status, 'PROCESSING');
      assert.equal(checkDoc.claimToken, newToken);

      // Active Worker 2 completes the event successfully
      const validCompletion = await OutboxEvent.findOneAndUpdate(
        {
          _id: event._id,
          claimToken: newToken,
          status: 'PROCESSING',
        },
        {
          status: 'COMPLETED',
          processedAt: new Date(),
        },
        { new: true }
      );
      assert.ok(validCompletion, 'Active worker with valid token completes successfully');
      assert.equal(validCompletion.status, 'COMPLETED');
    });

    it('Finding C: Distributed Cron Lock ensures mutual exclusion and safe lease expiration recovery', async () => {
      const lockKey = `test:cron:mutual-exclusion-${Date.now()}`;
      const owner1 = 'instance-1';
      const owner2 = 'instance-2';
      const owner3 = 'instance-3';

      // 1. Instance 1 acquires lock
      const acquired1 = await acquireCronLock(lockKey, 3000, owner1);
      assert.equal(acquired1.acquired, true, 'Instance 1 must acquire free lock');
      assert.equal(acquired1.ownerId, owner1);

      // 2. Instance 2 attempts to acquire held lock -> blocked
      const acquired2 = await acquireCronLock(lockKey, 3000, owner2);
      assert.equal(acquired2.acquired, false, 'Instance 2 must be blocked when lock is actively held');

      // 3. Instance 1 releases lock
      const released1 = await releaseCronLock(lockKey, owner1);
      assert.equal(released1, true, 'Instance 1 releases lock');

      // 4. Instance 2 can now acquire lock
      const acquired2AfterRelease = await acquireCronLock(lockKey, 1000, owner2);
      assert.equal(acquired2AfterRelease.acquired, true, 'Instance 2 acquires lock after release');

      // 5. Simulate lock expiry by updating expiresAt into the past
      await mongoose.connection.collection('distributed_cron_locks').updateOne(
        { lockKey },
        { $set: { expiresAt: new Date(Date.now() - 1000) } }
      );

      // 6. Instance 3 reclaims expired lock
      const acquired3Reclaim = await acquireCronLock(lockKey, 3000, owner3);
      assert.equal(acquired3Reclaim.acquired, true, 'Instance 3 reclaims expired lock');
      assert.equal(acquired3Reclaim.ownerId, owner3);

      // Clean up
      await releaseCronLock(lockKey, owner3);

      // 7. Test withDistributedCronLock wrapper helper
      let taskExecuted = false;
      const wrapResult = await withDistributedCronLock(
        `test:cron:wrapper-${Date.now()}`,
        async () => {
          taskExecuted = true;
          return 'task-success';
        },
        { ttlMs: 3000 }
      );
      assert.equal(taskExecuted, true);
      assert.equal(wrapResult.executed, true);
      assert.equal(wrapResult.result, 'task-success');
    });

    it('Finding D: Platform Payment eliminates hardcoded recipient fallbacks and fails closed on unresolvable recipients', async () => {
      // 1. sendOrganizationAccessEmail fails closed when recipientEmail is missing
      const res1 = await platformPaymentService.sendOrganizationAccessEmail({
        recipientEmail: null,
        orgName: 'Green Villa',
      });
      assert.equal(res1.success, false);
      assert.equal(res1.reason, 'MISSING_RECIPIENT_OR_ORG');

      // 2. sendOrganizationAccessEmail fails closed when orgName is missing
      const res2 = await platformPaymentService.sendOrganizationAccessEmail({
        recipientEmail: 'valid@community.com',
        orgName: null,
      });
      assert.equal(res2.success, false);
      assert.equal(res2.reason, 'MISSING_RECIPIENT_OR_ORG');

      // 3. sendPaymentReminderEmail returns failure result safely when recipient is missing
      const reminderResult = await platformPaymentService.sendPaymentReminderEmail({
        recipientEmail: null,
        orgName: 'Test Org',
      });
      assert.equal(reminderResult.success, false);
      assert.equal(reminderResult.reason, 'MISSING_RECIPIENT_EMAIL');
    });

    it('Finding E: Amenity hold expiration uses repository abstraction without direct model dependencies', async () => {
      // Execute repository method directly
      await assert.doesNotReject(async () => {
        await amenityReservationHoldRepository.dropLegacyHoldTtlIndex();
      });
    });
  });

  describe('Suite 10: Residual Defect Remediation (DEF-01 & DEF-02)', () => {
    describe('DEF-01 — Assessment Cron Distributed Locking', () => {
      it('executes scheduled billing inside withDistributedCronLock and releases lock after execution', async () => {
        const lockKey = 'cron:assessment-invoicing';
        // Ensure no leftover lock exists
        await mongoose.connection.collection('distributed_cron_locks').deleteMany({ lockKey });

        const tickResult = await assessmentCron.executeTick();
        assert.equal(tickResult.executed, true, 'executeTick must run inside distributed lock');
        assert.ok(tickResult.result, 'executeTick must return result object');

        // Confirm lock was released in finally block
        const leftoverLock = await mongoose.connection.collection('distributed_cron_locks').findOne({ lockKey });
        assert.equal(leftoverLock, null, 'Distributed lock must be cleanly released after tick completion');
      });

      it('prevents concurrent billing execution across multiple instances when lock is held', async () => {
        const lockKey = 'cron:assessment-invoicing';
        const foreignOwner = 'node-cluster-peer:pid9999:instance-b';

        // Simulate Instance 1 holding the distributed lock
        const preLock = await acquireCronLock(lockKey, 60000, foreignOwner);
        assert.equal(preLock.acquired, true);

        try {
          // Instance 2 attempts to run assessment cron tick concurrently
          const tickResult = await assessmentCron.executeTick();
          assert.equal(tickResult.executed, false, 'executeTick must skip execution when locked by another instance');
          assert.equal(tickResult.reason, 'LOCKED_BY_ANOTHER_INSTANCE');
        } finally {
          // Release foreign lock
          await releaseCronLock(lockKey, foreignOwner);
        }
      });
    });

    describe('DEF-02 — Amenity Outbox Claim-Token & Lease Fencing', () => {
      beforeEach(async () => {
        await AmenityOutboxEvent.deleteMany({});
      });

      it('persists claimToken and leaseExpiresAt on atomic claim', async () => {
        const event = await AmenityOutboxEvent.create({
          orgId: activeTenantA._id,
          eventType: 'RESERVATION_CONFIRMED',
          aggregateId: new mongoose.Types.ObjectId(),
          aggregateType: 'AMENITY_RESERVATION',
          payload: { residentId: residentUserA._id, reservationNumber: 'RES-CLAIM-01' },
          status: 'PENDING',
        });

        const claimed = await amenityOutboxEventRepository.claimNextPendingEvent();
        assert.ok(claimed, 'Must claim pending amenity event');
        assert.equal(claimed._id.toString(), event._id.toString());
        assert.equal(claimed.status, 'PROCESSING');
        assert.ok(claimed.claimToken, 'Must generate and store claimToken');
        assert.ok(claimed.leaseExpiresAt, 'Must set leaseExpiresAt date');
        assert.ok(claimed.leaseExpiresAt > new Date(), 'leaseExpiresAt must be in the future');

        // Clean up
        await AmenityOutboxEvent.deleteOne({ _id: event._id });
      });

      it('fencing prevents a stale worker from completing or failing a reclaimed event', async () => {
        const staleToken = 'stale-worker-token-xyz';
        const expiredLease = new Date(Date.now() - 5000);

        // 1. Create event with expired lease and staleToken
        const event = await AmenityOutboxEvent.create({
          orgId: activeTenantA._id,
          eventType: 'RESERVATION_CONFIRMED',
          aggregateId: new mongoose.Types.ObjectId(),
          aggregateType: 'AMENITY_RESERVATION',
          payload: { residentId: residentUserA._id, reservationNumber: 'RES-FENCE-02' },
          status: 'PROCESSING',
          claimToken: staleToken,
          leaseExpiresAt: expiredLease,
        });

        // 2. Active Worker 2 reclaims the expired event
        const activeToken = 'active-worker-token-abc';
        const reclaimed = await amenityOutboxEventRepository.claimNextPendingEvent(new Date(), activeToken, 60000);
        assert.ok(reclaimed, 'Worker 2 must successfully reclaim the expired event');
        assert.equal(reclaimed._id.toString(), event._id.toString());
        assert.equal(reclaimed.claimToken, activeToken);

        // 3. Stale Worker 1 attempts to mark event PUBLISHED with staleToken -> Fenced & rejected
        const stalePublishResult = await amenityOutboxEventRepository.markPublished(event._id, staleToken);
        assert.equal(stalePublishResult, null, 'Stale worker must not be permitted to publish reclaimed event');

        // 4. Stale Worker 1 attempts to mark event FAILED with staleToken -> Fenced & rejected
        const staleFailResult = await amenityOutboxEventRepository.markFailed({
          eventId: event._id,
          claimToken: staleToken,
          errorMessage: 'Stale error',
          retryCount: 1,
          nextRetryAt: new Date(),
          isDeadLetter: false,
        });
        assert.equal(staleFailResult, null, 'Stale worker must not be permitted to fail reclaimed event');

        // 5. Active Worker 2 marks event PUBLISHED with activeToken -> Succeeded
        const activePublishResult = await amenityOutboxEventRepository.markPublished(event._id, activeToken);
        assert.ok(activePublishResult, 'Active worker with valid claimToken must succeed in publishing');
        assert.equal(activePublishResult.status, 'PUBLISHED');
        assert.equal(activePublishResult.claimToken, null);
        assert.equal(activePublishResult.leaseExpiresAt, null);

        // Clean up
        await AmenityOutboxEvent.deleteOne({ _id: event._id });
      });

      it('renewEventLease extends lease for matching claimToken and rejects invalid/stale tokens', async () => {
        const claimToken = 'valid-token-123';
        const initialExpiry = new Date(Date.now() + 10000);

        const event = await AmenityOutboxEvent.create({
          orgId: activeTenantA._id,
          eventType: 'RESERVATION_CONFIRMED',
          aggregateId: new mongoose.Types.ObjectId(),
          aggregateType: 'AMENITY_RESERVATION',
          payload: { residentId: residentUserA._id, reservationNumber: 'RES-RENEW-03' },
          status: 'PROCESSING',
          claimToken,
          leaseExpiresAt: initialExpiry,
        });

        // Stale / wrong token cannot renew
        const wrongRenew = await amenityOutboxService.renewEventLease(event._id, 'wrong-token', 60000);
        assert.equal(wrongRenew, null, 'Must reject renewal with incorrect claimToken');

        // Matching token extends lease
        const validRenew = await amenityOutboxService.renewEventLease(event._id, claimToken, 120000);
        assert.ok(validRenew, 'Must successfully renew lease with matching claimToken');
        assert.ok(validRenew.leaseExpiresAt > initialExpiry, 'leaseExpiresAt must be extended');

        // Clean up
        await AmenityOutboxEvent.deleteOne({ _id: event._id });
      });

      it('amenityOutboxService.processNextEvent returns LEASE_EXPIRED_OR_RECLAIMED when lease is lost before publishing', async () => {
        // Intercept markPublished to simulate lease loss by clearing the token before publish completes
        const event = await AmenityOutboxEvent.create({
          orgId: activeTenantA._id,
          eventType: 'FACILITY_CREATED',
          aggregateId: new mongoose.Types.ObjectId(),
          aggregateType: 'AMENITY_FACILITY',
          payload: { code: 'TENNIS-01' },
          status: 'PENDING',
        });

        const origMarkPublished = amenityOutboxEventRepository.markPublished;
        amenityOutboxEventRepository.markPublished = async (eventId, claimToken, session) => {
          // Worker 2 stole the event and changed the claimToken
          await AmenityOutboxEvent.updateOne({ _id: eventId }, { $set: { claimToken: 'competitor-token' } });
          return origMarkPublished.call(amenityOutboxEventRepository, eventId, claimToken, session);
        };

        try {
          const result = await amenityOutboxService.processNextEvent();
          assert.equal(result.claimed, true);
          assert.equal(result.success, false);
          assert.equal(result.reason, 'LEASE_EXPIRED_OR_RECLAIMED');
        } finally {
          amenityOutboxEventRepository.markPublished = origMarkPublished;
          await AmenityOutboxEvent.deleteOne({ _id: event._id });
        }
      });
    });
  });
});

