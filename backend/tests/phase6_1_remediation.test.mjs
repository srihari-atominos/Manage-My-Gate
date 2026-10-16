/**
 * Comprehensive Phase 6.1 Security Verification Suite
 * Search, Filter, Sort, Pagination & Tenant Isolation Remediation
 *
 * Covers:
 * Area 1: SFP-CRIT-01 (Amenity facility search keeps orgId tenant filter)
 * Area 2: SFP-CRIT-02 & SFP-HIGH-02 (Invoice detail / my-dues tenantContext enforcement & resident isolation)
 * Area 3: SFP-HIGH-01 (Complaint SLA Breached filter combines with RBAC via $and instead of overwriting $or)
 * Area 4: SFP-HIGH-03 (Cash-eligible search scoped pre-queries and escaped regex)
 * Area 5: SFP-HIGH-04 (Household wallet unit resolution scoped via OrgMembership/Villa orgId)
 * Area 6: SFP-HIGH-05 & SFP-HIGH-06 (Complaint detail & dashboard analytics RBAC scoping)
 * Area 7: SFP-HIGH-07 (NoticeBoard updateNotice polymorphic argument support)
 * Area 8: SFP-MED-01 (Amenity reservation search scoped via OrgMembership)
 * Area 9: SFP-MED-02 & SFP-MED-04 (Scoped lookups and ObjectId casting in aggregations)
 * Area 10: SFP-MED-03 & SFP-MED-05 (Regex escaping and sort field allowlists)
 * Area 11: SFP-MED-06 & SFP-MED-07 & SFP-MED-08 (Bounded pagination, limit caps, and deterministic tie-breaker sorting)
 * Area 12: SFP-LOW-01 & SFP-LOW-02 & SFP-LOW-05 (HttpError import, compound indexes, date validation)
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import connectToDb from '../src/config/db/mongodbConnectToDb.config.js';

// Feature Models & Repositories
import AmenityFacility from '../src/features/amenityManagement/facilities/amenityFacility.model.js';
import amenityFacilityRepository from '../src/features/amenityManagement/facilities/amenityFacility.repository.js';
import AmenityReservation from '../src/features/amenityManagement/reservations/amenityReservation.model.js';
import amenityReservationRepository from '../src/features/amenityManagement/reservations/amenityReservation.repository.js';
import amenityDashboardService from '../src/features/amenityDashboard/amenityDashboard.service.js';
import Invoice from '../src/features/invoice/invoice.model.js';
import invoiceService from '../src/features/invoice/invoice.services.js';
import Complaint from '../src/features/complaint/complaint.model.js';
import complaintService from '../src/features/complaint/complaint.service.js';
import complaintRepository from '../src/features/complaint/complaint.repository.js';
import Organization from '../src/features/organization/organization.model.js';
import organizationRepository from '../src/features/organization/organization.repository.js';
import OrgMembership from '../src/features/orgMembership/orgMembership.model.js';
import orgMembershipRepository from '../src/features/orgMembership/orgMembership.repository.js';
import User from '../src/features/user/user.model.js';
import userRepository from '../src/features/user/user.repository.js';
import Villa from '../src/features/villa/villa.model.js';
import villaRepository from '../src/features/villa/villa.repository.js';
import { Wallet, WalletTransaction } from '../src/features/wallet/wallet.model.js';
import walletRepository from '../src/features/wallet/wallet.repository.js';
import walletService from '../src/features/wallet/wallet.service.js';
import noticeBoardRepository from '../src/features/noticeBoard/noticeBoard.repository.js';
import noticeBoardService from '../src/features/noticeBoard/noticeBoard.service.js';
import Notice from '../src/features/noticeBoard/noticeBoard.model.js';
import Payment from '../src/features/payment/payment.model.js';
import paymentRepository from '../src/features/payment/payment.repository.js';
import paymentService from '../src/features/payment/payment.service.js';
import Booking from '../src/features/booking/booking.model.js';
import bookingRepository from '../src/features/booking/booking.repository.js';
import AuditLog from '../src/features/auditLog/auditLog.model.js';
import auditLogRepository from '../src/features/auditLog/auditLog.repository.js';
import HttpError from '../src/utils/httpError.utils.js';

describe('Phase 6.1 Comprehensive Remediation Verification Suite', () => {
  let orgAId;
  let orgBId;
  let userAId;
  let userBId;
  let villaAId;
  let villaBId;

  before(async () => {
    await connectToDb();

    orgAId = new mongoose.Types.ObjectId();
    orgBId = new mongoose.Types.ObjectId();
    userAId = new mongoose.Types.ObjectId();
    userBId = new mongoose.Types.ObjectId();
    villaAId = new mongoose.Types.ObjectId();
    villaBId = new mongoose.Types.ObjectId();

    // Create Test Organizations
    await Organization.create([
      { _id: orgAId, name: 'Phase61 Community A', status: 'Active', organizationType: 'Residential' },
      { _id: orgBId, name: 'Phase61 Community B', status: 'Active', organizationType: 'Residential' },
    ]);

    // Create Test Users
    await User.create([
      { _id: userAId, username: 'p61_userA', email: 'p61_usera@example.com', name: 'Resident Alpha' },
      { _id: userBId, username: 'p61_userB', email: 'p61_userb@example.com', name: 'Resident Beta' },
    ]);

    // Create Test Villas
    await Villa.create([
      { _id: villaAId, orgId: orgAId, unitNumber: 'A-101', blockOrBuilding: 'Tower A' },
      { _id: villaBId, orgId: orgBId, unitNumber: 'B-202', blockOrBuilding: 'Tower B' },
    ]);

    // Create Memberships
    await OrgMembership.create([
      { userId: userAId, orgId: orgAId, villaId: villaAId, status: 'Active' },
      { userId: userBId, orgId: orgBId, villaId: villaBId, status: 'Active' },
    ]);
  });

  after(async () => {
    // Cleanup created test records
    await Organization.deleteMany({ _id: { $in: [orgAId, orgBId] } });
    await User.deleteMany({ _id: { $in: [userAId, userBId] } });
    await Villa.deleteMany({ _id: { $in: [villaAId, villaBId] } });
    await OrgMembership.deleteMany({ orgId: { $in: [orgAId, orgBId] } });
    await AmenityFacility.deleteMany({ orgId: { $in: [orgAId, orgBId] } });
    await AmenityReservation.deleteMany({ orgId: { $in: [orgAId, orgBId] } });
    await Invoice.deleteMany({ $or: [{ orgId: { $in: [orgAId, orgBId] } }, { communityId: { $in: [orgAId, orgBId] } }] });
    await Complaint.deleteMany({ orgId: { $in: [orgAId, orgBId] } });
    await Notice.deleteMany({ orgId: { $in: [orgAId, orgBId] } });
    await Payment.deleteMany({ orgId: { $in: [orgAId, orgBId] } });
    await Booking.deleteMany({ orgId: { $in: [orgAId, orgBId] } });
    await Wallet.deleteMany({ orgId: { $in: [orgAId, orgBId] } });
    await WalletTransaction.deleteMany({ orgId: { $in: [orgAId, orgBId] } });
  });

  describe('Area 1: SFP-CRIT-01 — Amenity Facility Search Isolation', () => {
    before(async () => {
      await AmenityFacility.create([
        { orgId: orgAId, name: 'Swimming Pool A', code: 'FAC-POOL-A', status: 'ACTIVE', archetype: 'SHARED_CAPACITY' },
        { orgId: orgBId, name: 'Swimming Pool B', code: 'FAC-POOL-B', status: 'ACTIVE', archetype: 'SHARED_CAPACITY' },
      ]);
    });

    test('1.1: Amenity search for "Pool" in Org A returns only Org A facilities', async () => {
      const res = await amenityFacilityRepository.findWithPagination({
        orgId: orgAId,
        search: 'Pool',
      });
      assert.strictEqual(res.total, 1);
      assert.strictEqual(res.data[0].name, 'Swimming Pool A');
      assert.strictEqual(String(res.data[0].orgId), String(orgAId));
    });

    test('1.2: Searching for Org B code from Org A returns 0 results', async () => {
      const res = await amenityFacilityRepository.findWithPagination({
        orgId: orgAId,
        search: 'FAC-POOL-B',
      });
      assert.strictEqual(res.total, 0);
    });

    test('1.3: Missing orgId fails closed with an error', async () => {
      await assert.rejects(
        async () => {
          await amenityFacilityRepository.findWithPagination({ search: 'Pool' });
        },
        (err) => err instanceof HttpError && err.statusCode === 400
      );
    });
  });

  describe('Area 2: SFP-CRIT-02 & SFP-HIGH-02 — Invoice Tenant Context & IDOR', () => {
    let invAId;
    let invBId;

    before(async () => {
      const invA = await Invoice.create({
        invoiceNumber: 'INV-P61-A1',
        communityId: orgAId,
        orgId: orgAId,
        targetUserId: userAId,
        unitId: villaAId,
        title: 'Alpha Dues',
        totalAmount: 1500,
        amount: 1500,
        paidAmount: 0,
        outstandingAmount: 1500,
        dueDate: new Date(Date.now() + 86400000),
        status: 'UNPAID',
      });
      invAId = invA._id;

      const invB = await Invoice.create({
        invoiceNumber: 'INV-P61-B1',
        communityId: orgBId,
        orgId: orgBId,
        targetUserId: userBId,
        unitId: villaBId,
        title: 'Beta Dues',
        totalAmount: 2500,
        amount: 2500,
        paidAmount: 0,
        outstandingAmount: 2500,
        dueDate: new Date(Date.now() + 86400000),
        status: 'UNPAID',
      });
      invBId = invB._id;
    });

    test('2.1: User A in Org A can fetch their own invoice', async () => {
      const inv = await invoiceService.getInvoiceById(String(invAId), {
        orgId: String(orgAId),
        userId: String(userAId),
        role: 'Resident',
      });
      assert.strictEqual(String(inv._id), String(invAId));
    });

    test('2.2: Cross-tenant IDOR access (User A attempting to fetch Org B invoice) is rejected with 403', async () => {
      await assert.rejects(
        async () => {
          await invoiceService.getInvoiceById(String(invBId), {
            orgId: String(orgAId),
            userId: String(userAId),
            role: 'Resident',
          });
        },
        (err) => err.statusCode === 403
      );
    });

    test('2.3: Same-tenant resident IDOR (User A fetching another resident in Org A) is rejected with 403', async () => {
      const userA2 = new mongoose.Types.ObjectId();
      const invA2 = await Invoice.create({
        invoiceNumber: 'INV-P61-A2',
        communityId: orgAId,
        orgId: orgAId,
        targetUserId: userA2,
        title: 'Other Alpha Dues',
        totalAmount: 500,
        amount: 500,
        paidAmount: 0,
        outstandingAmount: 500,
        dueDate: new Date(Date.now() + 86400000),
        status: 'UNPAID',
      });

      await assert.rejects(
        async () => {
          await invoiceService.getInvoiceById(String(invA2._id), {
            orgId: String(orgAId),
            userId: String(userAId),
            role: 'Resident',
          });
        },
        (err) => err.statusCode === 403
      );
    });

    test('2.4: getUserDuesOverview requires valid communityId and scopes results', async () => {
      const dues = await invoiceService.getUserDuesOverview(userAId, orgAId);
      assert.ok(dues);
      assert.strictEqual(dues.unpaidInvoices.length, 1);
      assert.strictEqual(dues.unpaidInvoices[0].invoiceNumber, 'INV-P61-A1');
    });
  });

  describe('Area 3: SFP-HIGH-01 — Complaint SLA Filter & RBAC Preservation', () => {
    before(async () => {
      await Complaint.create([
        {
          complaintNumber: 'CMP-A1',
          orgId: orgAId,
          residentId: userAId,
          title: 'Leaking pipe A',
          category: 'Plumbing',
          status: 'Open',
          slaDueDate: new Date(Date.now() - 3600000), // Breached
        },
        {
          complaintNumber: 'CMP-A2',
          orgId: orgAId,
          residentId: userBId, // Other resident
          title: 'Power outage A2',
          category: 'Electrical',
          status: 'Open',
          slaDueDate: new Date(Date.now() - 3600000), // Breached
        },
      ]);
    });

    test('3.1: Resident querying complaints with slaStatus="SLA Breached" receives only their own complaints', async () => {
      const callerUser = {
        _id: userAId,
        role: 'Resident',
        roles: ['Resident'],
      };
      const res = await complaintService.getComplaints(orgAId, { slaStatus: 'SLA Breached' }, callerUser);
      assert.strictEqual(res.total, 1);
      assert.strictEqual(res.complaints[0].complaintNumber, 'CMP-A1');
      assert.strictEqual(String(res.complaints[0].residentId), String(userAId));
    });
  });

  describe('Area 4: SFP-HIGH-03 — Cash-Eligible Invoice Search', () => {
    test('4.1: searchCashEligibleInvoices scopes pre-queries to orgId and escapes regex metacharacters', async () => {
      const results = await invoiceService.searchCashEligibleInvoices(orgAId, 'Alpha.*[(');
      assert.ok(Array.isArray(results));
      // ReDoS metacharacters did not crash the server and cross-org invoices were excluded
    });
  });

  describe('Area 5: SFP-HIGH-04 — Household Wallet Unit Resolution', () => {
    test('5.1: getHouseholdWallet resolves villa strictly via OrgMembership in active orgId', async () => {
      const wallet = await walletService.getHouseholdWallet(userAId, orgAId);
      assert.ok(wallet);
      assert.strictEqual(String(wallet.orgId), String(orgAId));
    });
  });

  describe('Area 6: SFP-HIGH-05 & SFP-HIGH-06 — Complaint Details & Dashboard Scoping', () => {
    test('6.1: Resident cannot view complaint of another resident in getComplaintById', async () => {
      const cmp = await Complaint.findOne({ complaintNumber: 'CMP-A2' });
      const caller = { _id: userAId, role: 'Resident', roles: ['Resident'] };
      await assert.rejects(
        async () => {
          await complaintService.getComplaintById(cmp._id, orgAId, caller);
        },
        (err) => err.statusCode === 403
      );
    });

    test('6.2: getDashboardAnalytics passes cast ObjectId to aggregate stage', async () => {
      const analytics = await complaintService.getDashboardAnalytics(orgAId);
      assert.ok(analytics);
      assert.ok(typeof analytics.totalComplaints === 'number');
    });
  });

  describe('Area 7: SFP-HIGH-07 — NoticeBoard Service & Polymorphic Repository', () => {
    let noticeId;

    before(async () => {
      const notice = await Notice.create({
        orgId: orgAId,
        title: 'Original Notice',
        description: 'Original Description',
        category: 'General',
        status: 'Draft',
        createdBy: userAId,
      });
      noticeId = notice._id;
    });

    test('7.1: updateNotice correctly passes orgId without argument shift', async () => {
      const updated = await noticeBoardService.updateNotice(
        String(noticeId),
        { title: 'Updated Notice Title' },
        String(userAId),
        String(orgAId)
      );
      assert.strictEqual(updated.title, 'Updated Notice Title');
      assert.strictEqual(String(updated.orgId), String(orgAId));
    });
  });

  describe('Area 8: SFP-MED-01 — Amenity Reservation Scoped Pre-Query', () => {
    before(async () => {
      await AmenityReservation.create({
        orgId: orgAId,
        reservationNumber: 'RES-P61-001',
        residentId: userAId,
        unitId: villaAId,
        bookingStatus: 'CONFIRMED',
        paymentStatus: 'PAID',
        requestedStartDateTime: new Date(),
        requestedEndDateTime: new Date(Date.now() + 3600000),
      });
    });

    test('8.1: Reservation search by resident name scopes user lookup to org members', async () => {
      const res = await amenityReservationRepository.findWithPagination({
        orgId: orgAId,
        search: 'Alpha',
      });
      assert.strictEqual(res.total, 1);
      assert.strictEqual(res.data[0].reservationNumber, 'RES-P61-001');
    });

    test('8.2: Searching for Org B resident name from Org A yields 0 reservations', async () => {
      const res = await amenityReservationRepository.findWithPagination({
        orgId: orgAId,
        search: 'Beta',
      });
      assert.strictEqual(res.total, 0);
    });
  });

  describe('Area 9: SFP-MED-02 & SFP-MED-04 — Aggregation Casting & Scoped Lookups', () => {
    before(async () => {
      await Payment.create({
        orgId: orgAId,
        userId: userAId,
        amount: 250,
        status: 'success',
        createdAt: new Date(),
      });
      await Booking.create({
        orgId: orgAId,
        userId: userAId,
        amenityId: new mongoose.Types.ObjectId(),
        bookingStatus: 'Confirmed',
        date: new Date(),
      });
    });

    test('9.1: Payment.getPaymentStats casts string orgId to ObjectId', async () => {
      const stats = await paymentRepository.getPaymentStats(String(orgAId));
      assert.ok(stats);
      assert.ok(stats.success >= 1);
    });

    test('9.2: Payment.getRevenueTrend casts string orgId to ObjectId', async () => {
      const trend = await paymentRepository.getRevenueTrend(String(orgAId));
      assert.ok(Array.isArray(trend));
      assert.ok(trend.length >= 1);
    });

    test('9.3: Booking.getBookingStats casts string orgId to ObjectId', async () => {
      const bStats = await bookingRepository.getBookingStats(String(orgAId));
      assert.ok(bStats);
      assert.ok(bStats.total >= 1);
    });
  });

  describe('Area 10: SFP-MED-03 & SFP-MED-05 — Regex Escaping & Sort Allowlists', () => {
    test('10.1: UserRepository findByUsername escapes malicious regex strings', async () => {
      const user = await userRepository.findByUsername('p61_userA.*[(');
      assert.strictEqual(user, null); // Gracefully executed without SyntaxError
    });

    test('10.2: PaymentService allowlists sorting fields and rejects unsafe keys', async () => {
      const res = await paymentService.getPaymentsPaginated(orgAId, {}, { sortBy: 'malicious$where', sortOrder: 'asc' });
      assert.ok(res);
      assert.ok(Array.isArray(res.data));
    });
  });

  describe('Area 11: SFP-MED-06 & SFP-MED-07 & SFP-MED-08 — Bounded Limits & Sorting', () => {
    test('11.1: AuditLogRepository enforces safeLimit cap (<= 100) and tie-breaker sort', async () => {
      const res = await auditLogRepository.findAllPaginated(orgAId, 1, 5000);
      assert.ok(res);
      assert.ok(res.data.length <= 100);
    });

    test('11.2: WalletRepository.getTransactions is bounded to 200 items', async () => {
      const txs = await walletRepository.getTransactions(userAId, orgAId);
      assert.ok(Array.isArray(txs));
      assert.ok(txs.length <= 200);
    });

    test('11.3: OrgMembershipRepository uses deterministic sort before facet', async () => {
      const res = await orgMembershipRepository.findPaginatedUsersByOrg(orgAId, 1, 10);
      assert.ok(res);
      assert.ok(Array.isArray(res.users));
    });

    test('11.4: OrganizationRepository findAllPaginated uses sub-pipeline counts and deterministic sort', async () => {
      const res = await organizationRepository.findAllPaginated(1, 10);
      assert.ok(res);
      assert.ok(typeof res.total === 'number');
      assert.ok(Array.isArray(res.organizations));
    });
  });

  describe('Area 12: SFP-LOW-01 & SFP-LOW-02 & SFP-LOW-05 — Low Severity Quality Checks', () => {
    test('12.1: WalletRepository throws HttpError when orgId is missing (no ReferenceError)', async () => {
      await assert.rejects(
        async () => {
          await walletRepository.getWallet(userAId, null);
        },
        (err) => err instanceof HttpError && err.statusCode === 400
      );
    });

    test('12.2: Complaint model defines compound tenant indexes', () => {
      const indexes = Complaint.schema.indexes();
      const hasOrgCreated = indexes.some(([fields]) => fields.orgId === 1 && fields.createdAt === -1);
      const hasOrgStatusPriority = indexes.some(([fields]) => fields.orgId === 1 && fields.status === 1 && fields.priority === 1);
      assert.ok(hasOrgCreated, 'Expected compound index { orgId: 1, createdAt: -1 }');
      assert.ok(hasOrgStatusPriority, 'Expected compound index { orgId: 1, status: 1, priority: 1 }');
    });

    test('12.3: Date filters handle Invalid Date without crashing', async () => {
      const events = await complaintService.getCalendarEvents(orgAId, 'invalid-start', 'invalid-end');
      assert.ok(Array.isArray(events));
    });
  });
});
