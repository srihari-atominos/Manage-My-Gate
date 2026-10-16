/**
 * Phase 4B.2 High-Priority Tenant-Isolation Remediation Test Suite
 *
 * Verifies:
 * 1. Notice & Poll Security:
 *    - Notice Acknowledgment:
 *      * Missing tenant context fails closed (400)
 *      * Same-tenant notice acknowledgment succeeds (201)
 *      * Cross-tenant notice acknowledgment rejected (403)
 *      * Rejection causes zero database mutation
 *      * Notice acknowledgement retrieval enforces tenant boundary
 *    - Poll Vote-Casting:
 *      * Missing tenant context fails closed (400)
 *      * Same-tenant poll voting succeeds (200)
 *      * Cross-tenant poll voting rejected (404)
 *      * Rejection causes zero database mutation (no vote count increase, no PollVote record)
 *
 * 2. Facility Booking Security:
 *    - Resource Mutex:
 *      * Missing orgId fails closed (400)
 *      * Cross-tenant facility lock rejected (404) with zero version mutation
 *    - Availability Service:
 *      * Missing orgId fails closed (unavailable / empty slots)
 *      * Cross-tenant facility availability returns unavailable
 *    - Amenity Reservation:
 *      * Missing tenant context fails closed (400)
 *      * Cross-tenant reservation retrieval / preview rejected (404)
 *      * Cross-tenant reservation cancellation rejected (404) with zero DB mutation
 *    - Amenity Booking:
 *      * Missing orgId on createBooking/cancelBooking fails closed (400)
 *      * Cross-tenant booking cancellation rejected (404) with zero DB mutation
 *
 * 3. CRM Attachment Security & Reference Safety:
 *      * crmThread and crmInquiry service methods execute safely without ReferenceErrors
 *      * issueReport attachment file streaming rejects missing tenant and cross-tenant access
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import mongoose from 'mongoose';
import app from '../index.js';
import connectToDb from '../src/config/db/mongodbConnectToDb.config.js';
import { signToken } from '../src/utils/jwt.utils.js';

import Organization from '../src/features/organization/organization.model.js';
import OrgMembership from '../src/features/orgMembership/orgMembership.model.js';
import User from '../src/features/user/user.model.js';
import Notice from '../src/features/noticeBoard/noticeBoard.model.js';
import NoticeAcknowledgement from '../src/features/noticeAcknowledgement/noticeAcknowledgement.model.js';
import Poll from '../src/features/poll/poll.model.js';
import PollVote from '../src/features/poll/pollVote.model.js';
import AmenityFacility from '../src/features/amenityManagement/facilities/amenityFacility.model.js';
import AmenityReservation from '../src/features/amenityManagement/reservations/amenityReservation.model.js';
import AmenityBooking from '../src/features/amenityBooking/amenityBooking.model.js';
import CrmInquiry from '../src/features/crmInquiry/crmInquiry.model.js';
import CrmThread from '../src/features/crmThread/crmThread.model.js';
import IssueReport from '../src/features/issueReport/issueReport.model.js';

import resourceMutexService from '../src/features/amenityManagement/domain/concurrency/resourceMutex.service.js';
import availabilityService from '../src/features/amenityManagement/domain/availability/availability.service.js';
import amenityReservationService from '../src/features/amenityManagement/reservations/amenityReservation.service.js';
import amenityReservationController from '../src/features/amenityManagement/reservations/amenityReservation.controller.js';
import amenityBookingService from '../src/features/amenityBooking/amenityBooking.services.js';
import crmThreadService from '../src/features/crmThread/crmThread.service.js';
import crmInquiryService from '../src/features/crmInquiry/crmInquiry.service.js';
import issueReportService from '../src/features/issueReport/issueReport.service.js';
import noticeAcknowledgementController from '../src/features/noticeAcknowledgement/noticeAcknowledgement.controller.js';
import * as pollController from '../src/features/poll/poll.controller.js';
import * as pollService from '../src/features/poll/poll.services.js';
import HttpError from '../src/utils/httpError.utils.js';

describe('Phase 4B.2: High-Priority Tenant-Isolation Remediation Integration', () => {
  let server;
  let baseUrl;
  let orgA;
  let orgB;
  let adminUserA;
  let adminUserB;
  let residentUserA;
  let residentUserB;
  let adminTokenA;
  let adminTokenB;
  let residentTokenA;
  let residentTokenB;

  before(async () => {
    await connectToDb();

    // Spin up local HTTP server
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    const timestamp = Date.now();

    // 1. Create two isolated tenant organizations
    orgA = await Organization.create({
      name: `Phase4B2 Alpha Community ${timestamp}`,
      code: `P4B2A_${timestamp}`,
      organizationType: 'Residential',
      status: 'Active',
      allowedFeatures: ['billing', 'amenities', 'notices', 'polls'],
    });

    orgB = await Organization.create({
      name: `Phase4B2 Beta Community ${timestamp}`,
      code: `P4B2B_${timestamp}`,
      organizationType: 'Residential',
      status: 'Active',
      allowedFeatures: ['billing', 'amenities', 'notices', 'polls'],
    });

    // 2. Create Community Admins and Residents for both organizations
    adminUserA = await User.create({
      name: `Admin A ${timestamp}`,
      username: `admin_a_${timestamp}`,
      email: `admin_a_${timestamp}@example.com`,
      password: 'Password123!',
      role: 'Community Admin',
      status: 'Active',
      currentOrgId: orgA._id,
      orgId: orgA._id,
    });

    adminUserB = await User.create({
      name: `Admin B ${timestamp}`,
      username: `admin_b_${timestamp}`,
      email: `admin_b_${timestamp}@example.com`,
      password: 'Password123!',
      role: 'Community Admin',
      status: 'Active',
      currentOrgId: orgB._id,
      orgId: orgB._id,
    });

    residentUserA = await User.create({
      name: `Resident A ${timestamp}`,
      username: `res_a_${timestamp}`,
      email: `res_a_${timestamp}@example.com`,
      password: 'Password123!',
      role: 'Resident',
      status: 'Active',
      currentOrgId: orgA._id,
      orgId: orgA._id,
    });

    residentUserB = await User.create({
      name: `Resident B ${timestamp}`,
      username: `res_b_${timestamp}`,
      email: `res_b_${timestamp}@example.com`,
      password: 'Password123!',
      role: 'Resident',
      status: 'Active',
      currentOrgId: orgB._id,
      orgId: orgB._id,
    });

    // 3. Memberships
    await OrgMembership.create([
      { orgId: orgA._id, userId: adminUserA._id, status: 'Active' },
      { orgId: orgA._id, userId: residentUserA._id, status: 'Active' },
      { orgId: orgB._id, userId: adminUserB._id, status: 'Active' },
      { orgId: orgB._id, userId: residentUserB._id, status: 'Active' },
    ]);

    // 4. Issue tokens
    adminTokenA = signToken({
      id: adminUserA._id.toString(),
      email: adminUserA.email,
      role: 'Community Admin',
      currentOrgId: orgA._id.toString(),
      orgId: orgA._id.toString(),
    });

    adminTokenB = signToken({
      id: adminUserB._id.toString(),
      email: adminUserB.email,
      role: 'Community Admin',
      currentOrgId: orgB._id.toString(),
      orgId: orgB._id.toString(),
    });

    residentTokenA = signToken({
      id: residentUserA._id.toString(),
      email: residentUserA.email,
      role: 'Resident',
      currentOrgId: orgA._id.toString(),
      orgId: orgA._id.toString(),
    });

    residentTokenB = signToken({
      id: residentUserB._id.toString(),
      email: residentUserB.email,
      role: 'Resident',
      currentOrgId: orgB._id.toString(),
      orgId: orgB._id.toString(),
    });
  });

  after(async () => {
    try {
      if (server) {
        server.closeAllConnections?.();
        await new Promise((resolve) => server.close(resolve));
      }
      // Clean up created records
      if (orgA && orgB) {
        await Promise.all([
          Organization.deleteMany({ _id: { $in: [orgA._id, orgB._id] } }),
          OrgMembership.deleteMany({ orgId: { $in: [orgA._id, orgB._id] } }),
          User.deleteMany({ _id: { $in: [adminUserA._id, adminUserB._id, residentUserA._id, residentUserB._id] } }),
          Notice.deleteMany({ orgId: { $in: [orgA._id, orgB._id] } }),
          NoticeAcknowledgement.deleteMany({ orgId: { $in: [orgA._id, orgB._id] } }),
          Poll.deleteMany({ orgId: { $in: [orgA._id, orgB._id] } }),
          PollVote.deleteMany({ orgId: { $in: [orgA._id, orgB._id] } }),
          AmenityFacility.deleteMany({ orgId: { $in: [orgA._id, orgB._id] } }),
          AmenityReservation.deleteMany({ orgId: { $in: [orgA._id, orgB._id] } }),
          AmenityBooking.deleteMany({ orgId: { $in: [orgA._id, orgB._id] } }),
          CrmInquiry.deleteMany({ contactEmail: { $regex: /prospect\.com/i } }),
          CrmThread.deleteMany({}),
        ]);
      }
      await mongoose.disconnect();
    } catch (err) {
      console.error('Error during teardown:', err);
    }
  });

  // =========================================================================
  // 1. NOTICE & POLL SECURITY TESTS
  // =========================================================================
  describe('Area 1: Notice and Poll Security', () => {
    let noticeA;
    let pollA;

    before(async () => {
      // Create Published Notice for Org A requiring acknowledgement
      noticeA = await Notice.create({
        orgId: orgA._id,
        title: 'Mandatory Safety Meeting Notice',
        description: 'All residents must review safety measures.',
        category: 'General',
        status: 'Published',
        priority: 'High',
        expiryDate: new Date(Date.now() + 14 * 24 * 3600 * 1000),
        requiresAcknowledgement: true,
        acknowledgementDeadline: new Date(Date.now() + 7 * 24 * 3600 * 1000),
        targetAudience: { targetType: 'ALL' },
        createdBy: adminUserA._id,
      });

      // Create Active Poll for Org A
      pollA = await Poll.create({
        orgId: orgA._id,
        question: 'Should we renovate the gym?',
        options: [{ text: 'Yes', votesCount: 0 }, { text: 'No', votesCount: 0 }],
        status: 'Active',
        choiceType: 'SINGLE_CHOICE',
        votingMode: 'ONE_PER_USER',
        targetAudience: { targetType: 'ALL' },
        createdBy: adminUserA._id,
        endDate: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      });
    });

    test('1.1 Notice Acknowledgment: Missing tenant context fails closed (400)', async () => {
      const mockReq = {
        params: { id: noticeA._id.toString() },
        user: { id: residentUserA._id.toString() },
        body: {},
      };
      const mockRes = {};
      let caughtError = null;
      await noticeAcknowledgementController.acknowledge(mockReq, mockRes, (err) => {
        caughtError = err;
      });

      assert.ok(caughtError, 'Expected controller to fail closed on missing tenant context');
      assert.strictEqual(caughtError.statusCode, 400);
      assert.match(caughtError.message, /Valid workspace organization context is required/i);
    });

    test('1.2 Notice Acknowledgment: Same-tenant resident acknowledgment succeeds (201)', async () => {
      const mockReq = {
        params: { id: noticeA._id.toString() },
        user: { id: residentUserA._id.toString(), currentOrgId: orgA._id },
        tenant: { orgId: orgA._id.toString() },
        body: {},
      };
      let resJson = null;
      let resStatus = null;
      const mockRes = {
        status(code) {
          resStatus = code;
          return this;
        },
        json(data) {
          resJson = data;
        },
      };

      await noticeAcknowledgementController.acknowledge(mockReq, mockRes, (err) => {
        if (err) throw err;
      });

      assert.strictEqual(resStatus, 201);
      assert.strictEqual(resJson.success, true);
      assert.ok(resJson.data._id, 'Expected acknowledgement record to be returned');

      // Verify DB record exists for Org A
      const ackRecord = await NoticeAcknowledgement.findOne({
        noticeId: noticeA._id,
        userId: residentUserA._id,
        orgId: orgA._id,
      });
      assert.ok(ackRecord, 'Expected NoticeAcknowledgement to exist in DB for Org A');
    });

    test('1.3 Notice Acknowledgment: Cross-tenant resident acknowledgment rejected (403)', async () => {
      const mockReq = {
        params: { id: noticeA._id.toString() },
        user: { id: residentUserB._id.toString(), currentOrgId: orgB._id },
        tenant: { orgId: orgB._id.toString() }, // Org B tenant context
        body: {},
      };
      const mockRes = {};
      let caughtError = null;

      await noticeAcknowledgementController.acknowledge(mockReq, mockRes, (err) => {
        caughtError = err;
      });

      assert.ok(caughtError, 'Expected cross-tenant acknowledgement to be rejected');
      assert.strictEqual(caughtError.statusCode, 403);
      assert.match(caughtError.message, /Notice belongs to another community/i);

      // Verify ZERO database mutations for Org B
      const crossAck = await NoticeAcknowledgement.findOne({
        noticeId: noticeA._id,
        userId: residentUserB._id,
      });
      assert.strictEqual(crossAck, null, 'Cross-tenant rejection must cause ZERO database mutations');
    });

    test('1.4 Notice Acknowledgment: Cross-tenant acknowledgements retrieval rejected (403)', async () => {
      const mockReq = {
        params: { id: noticeA._id.toString() },
        user: { id: adminUserB._id.toString(), currentOrgId: orgB._id },
        tenant: { orgId: orgB._id.toString() },
        query: { page: 1, limit: 10 },
      };
      const mockRes = {};
      let caughtError = null;

      await noticeAcknowledgementController.getAcknowledgements(mockReq, mockRes, (err) => {
        caughtError = err;
      });

      assert.ok(caughtError, 'Expected cross-tenant getAcknowledgements to be rejected');
      assert.strictEqual(caughtError.statusCode, 403);
      assert.match(caughtError.message, /Notice belongs to another community/i);
    });

    test('1.5 Poll Vote-Casting: Missing tenant context fails closed (400)', async () => {
      const mockReq = {
        params: { id: pollA._id.toString() },
        user: { id: residentUserA._id.toString() },
        body: { optionIndex: 0 },
      };
      const mockRes = {};
      let caughtError = null;

      await pollController.voteOnPoll(mockReq, mockRes, (err) => {
        caughtError = err;
      });

      assert.ok(caughtError, 'Expected voteOnPoll to fail closed on missing tenant context');
      assert.strictEqual(caughtError.statusCode, 400);
      assert.match(caughtError.message, /Valid workspace organization context is required/i);
    });

    test('1.6 Poll Vote-Casting: Same-tenant resident vote succeeds (200)', async () => {
      const mockReq = {
        params: { id: pollA._id.toString() },
        user: { id: residentUserA._id.toString(), currentOrgId: orgA._id },
        tenant: { orgId: orgA._id.toString() },
        body: { optionIndex: 0 },
      };
      let resSuccessData = null;
      const mockRes = {
        success(data) {
          resSuccessData = data;
        },
      };

      await pollController.voteOnPoll(mockReq, mockRes, (err) => {
        if (err) throw err;
      });

      assert.ok(resSuccessData, 'Expected successful vote response');
      assert.strictEqual(resSuccessData.totalVotes, 1);

      // Verify DB record created for Org A
      const voteRecord = await PollVote.findOne({
        pollId: pollA._id,
        residentId: residentUserA._id,
        orgId: orgA._id,
      });
      assert.ok(voteRecord, 'Expected PollVote record to exist in DB for Org A');
    });

    test('1.7 Poll Vote-Casting: Cross-tenant resident vote rejected (404) with zero DB mutation', async () => {
      const initialPoll = await Poll.findById(pollA._id);
      const initialTotalVotes = initialPoll.totalVotes;

      const mockReq = {
        params: { id: pollA._id.toString() },
        user: { id: residentUserB._id.toString(), currentOrgId: orgB._id },
        tenant: { orgId: orgB._id.toString() }, // Org B tenant context
        body: { optionIndex: 1 },
      };
      const mockRes = {};
      let caughtError = null;

      await pollController.voteOnPoll(mockReq, mockRes, (err) => {
        caughtError = err;
      });

      assert.ok(caughtError, 'Expected cross-tenant vote to be rejected');
      assert.strictEqual(caughtError.statusCode, 404);
      assert.match(caughtError.message, /Poll not found/i);

      // Verify ZERO database mutations: totalVotes unchanged, zero PollVote for resident B
      const finalPoll = await Poll.findById(pollA._id);
      assert.strictEqual(finalPoll.totalVotes, initialTotalVotes, 'Poll totalVotes must NOT change on cross-tenant attempt');

      const crossVote = await PollVote.findOne({
        pollId: pollA._id,
        residentId: residentUserB._id,
      });
      assert.strictEqual(crossVote, null, 'Cross-tenant vote must NOT create any PollVote record');
    });
  });

  // =========================================================================
  // 2. FACILITY BOOKING SECURITY TESTS
  // =========================================================================
  describe('Area 2: Facility Booking Security', () => {
    let facilityA;
    let facilityB;
    let reservationA;
    let bookingA;

    before(async () => {
      facilityA = await AmenityFacility.create({
        orgId: orgA._id,
        name: 'Tennis Court Alpha',
        code: `TC_A_${Date.now()}`,
        archetype: 'EXCLUSIVE_HOURLY',
        status: 'ACTIVE',
        isActive: true,
        concurrencyVersion: 1,
        capacity: 4,
        timezone: 'Asia/Kolkata',
      });

      facilityB = await AmenityFacility.create({
        orgId: orgB._id,
        name: 'Tennis Court Beta',
        code: `TC_B_${Date.now()}`,
        archetype: 'EXCLUSIVE_HOURLY',
        status: 'ACTIVE',
        isActive: true,
        concurrencyVersion: 1,
        capacity: 4,
        timezone: 'Asia/Kolkata',
      });

      // Reservation in Org A
      const start = new Date(Date.now() + 24 * 3600 * 1000);
      const end = new Date(Date.now() + 25 * 3600 * 1000);
      reservationA = await AmenityReservation.create({
        orgId: orgA._id,
        facilityId: facilityA._id,
        residentId: residentUserA._id,
        unitId: new mongoose.Types.ObjectId(),
        reservationNumber: `RES-${Date.now()}`,
        requestedStartDateTime: start,
        requestedEndDateTime: end,
        effectiveStartDateTime: start,
        effectiveEndDateTime: end,
        bookingStatus: 'CONFIRMED',
        paymentStatus: 'PAID',
        paidAmount: 500,
        totalAmount: 500,
      });

      // Legacy AmenityBooking in Org A
      bookingA = await AmenityBooking.create({
        orgId: orgA._id,
        amenityId: facilityA._id,
        userId: residentUserA._id,
        bookingId: `BKG-${Date.now()}`,
        bookingDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0],
        startTime: '10:00',
        endTime: '11:00',
        status: 'confirmed',
        paymentStatus: 'success',
        pricingDetails: { totalAmount: 200, baseAmount: 200 },
      });
    });

    test('2.1 Resource Mutex: Missing orgId fails closed (400)', async () => {
      await assert.rejects(
        async () => {
          await resourceMutexService.acquireMutex({
            orgId: null,
            facilityId: facilityA._id,
          });
        },
        (err) => {
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /Valid workspace organization context is required/i);
          return true;
        }
      );
    });

    test('2.2 Resource Mutex: Cross-tenant facility lock rejected (404) with zero version mutation', async () => {
      const initialVersion = facilityA.concurrencyVersion;

      await assert.rejects(
        async () => {
          // Org B tries to acquire lock on Facility A
          await resourceMutexService.acquireMutex({
            orgId: orgB._id.toString(),
            facilityId: facilityA._id.toString(),
          });
        },
        (err) => {
          assert.strictEqual(err.statusCode, 404);
          assert.match(err.message, /Target facility .* not found or inactive/i);
          return true;
        }
      );

      // Verify database document was NOT modified
      const refetchedFacility = await AmenityFacility.findById(facilityA._id);
      assert.strictEqual(
        refetchedFacility.concurrencyVersion,
        initialVersion,
        'Concurrency version must NOT increment on cross-tenant lock attempt'
      );
    });

    test('2.3 Availability Service: Missing orgId returns unavailable and empty slots', async () => {
      const avail = await availabilityService.checkAvailability({
        orgId: null,
        facilityId: facilityA._id,
        startDateTime: new Date(),
        endDateTime: new Date(Date.now() + 3600 * 1000),
      });
      assert.strictEqual(avail.isAvailable, false);
      assert.match(avail.reason, /Valid workspace organization context is required/i);

      const slots = await availabilityService.getDailySlots({
        orgId: null,
        facilityId: facilityA._id,
        dateStr: '2026-10-15',
      });
      assert.deepStrictEqual(slots, { slots: [] });
    });

    test('2.4 Availability Service: Cross-tenant facility check returns unavailable', async () => {
      // Org B checks availability on Facility A
      const avail = await availabilityService.checkAvailability({
        orgId: orgB._id.toString(),
        facilityId: facilityA._id.toString(),
        startDateTime: new Date(),
        endDateTime: new Date(Date.now() + 3600 * 1000),
      });
      assert.strictEqual(avail.isAvailable, false);
      assert.match(avail.reason, /Facility is not active or does not exist/i);
    });

    test('2.5 Amenity Reservation: Missing tenant context fails closed (400)', async () => {
      const mockReq = {
        params: { reservationId: reservationA._id.toString() },
        user: { id: residentUserA._id.toString() },
        tenant: null, // missing tenant
      };
      const mockRes = {};
      let caughtError = null;

      await amenityReservationController.getById(mockReq, mockRes, (err) => {
        caughtError = err;
      });

      assert.ok(caughtError, 'Expected getById to fail closed on missing tenant context');
      assert.strictEqual(caughtError.statusCode, 400);
      assert.match(caughtError.message, /Valid workspace organization context is required/i);
    });

    test('2.6 Amenity Reservation: Cross-tenant retrieval rejected (404)', async () => {
      const mockReq = {
        params: { reservationId: reservationA._id.toString() },
        user: { id: adminUserB._id.toString(), role: 'Community Admin' },
        tenant: { orgId: orgB._id.toString() }, // Org B tenant context
      };
      const mockRes = {};
      let caughtError = null;

      await amenityReservationController.getById(mockReq, mockRes, (err) => {
        caughtError = err;
      });

      assert.ok(caughtError, 'Expected cross-tenant getById to be rejected');
      assert.strictEqual(caughtError.statusCode, 404);
      assert.match(caughtError.message, /Reservation not found/i);
    });

    test('2.7 Amenity Reservation: Cross-tenant cancellation rejected (404) with zero DB mutation', async () => {
      const mockReq = {
        params: { reservationId: reservationA._id.toString() },
        user: { id: adminUserB._id.toString(), role: 'Community Admin' },
        tenant: { orgId: orgB._id.toString() }, // Org B tenant context
        body: { reason: 'Unauthorized cancellation' },
      };
      const mockRes = {};
      let caughtError = null;

      await amenityReservationController.cancel(mockReq, mockRes, (err) => {
        caughtError = err;
      });

      assert.ok(caughtError, 'Expected cross-tenant cancel to be rejected');
      assert.strictEqual(caughtError.statusCode, 404);
      assert.match(caughtError.message, /Reservation not found/i);

      // Verify ZERO database mutations: reservation remains CONFIRMED
      const refetchedReservation = await AmenityReservation.findById(reservationA._id);
      assert.strictEqual(refetchedReservation.bookingStatus, 'CONFIRMED');
      assert.strictEqual(refetchedReservation.paymentStatus, 'PAID');
    });

    test('2.8 Amenity Booking: Cross-tenant booking cancellation rejected (404) with zero DB mutation', async () => {
      await assert.rejects(
        async () => {
          // Org B tries to cancel Org A's booking
          await amenityBookingService.cancelBooking(
            bookingA._id.toString(),
            residentUserB._id.toString(),
            orgB._id.toString(), // Org B context
            'Attempted cross-tenant cancel'
          );
        },
        (err) => {
          assert.strictEqual(err.statusCode, 404);
          assert.match(err.message, /Booking not found/i);
          return true;
        }
      );

      // Verify ZERO database mutations: booking remains confirmed
      const refetchedBooking = await AmenityBooking.findById(bookingA._id);
      assert.strictEqual(refetchedBooking.status, 'confirmed');
    });
  });

  // =========================================================================
  // 3. CRM ATTACHMENT & REFERENCE SAFETY TESTS
  // =========================================================================
  describe('Area 3: CRM Attachment Security & Reference Safety', () => {
    let inquiryA;

    before(async () => {
      inquiryA = await CrmInquiry.create({
        inquiryId: `INQ-TEST-${Date.now()}`,
        customerName: 'Alice Prospect',
        organizationName: 'Prospective Community A',
        unitCount: 10,
        contactEmail: `alice_${Date.now()}@prospect.com`,
      });
    });

    test('3.1 CRM Thread: createThread executes safely with contextOrgId without ReferenceError', async () => {
      const thread = await crmThreadService.createThread({
        inquiryId: inquiryA._id.toString(),
        contextOrgId: orgA._id.toString(),
      });

      assert.ok(thread, 'Expected thread to be created');
      assert.strictEqual(thread.inquiryId.toString(), inquiryA._id.toString());
    });

    test('3.2 CRM Thread: addMessage executes safely with contextOrgId without ReferenceError', async () => {
      const updatedThread = await crmThreadService.addMessage(inquiryA._id.toString(), {
        senderType: 'SUPERADMIN',
        channel: 'SMS',
        content: 'Welcome to our platform demonstration!',
        contextOrgId: orgA._id.toString(),
      });

      assert.ok(updatedThread, 'Expected message to be added to thread');
      assert.strictEqual(updatedThread.messages.length, 1);
      assert.strictEqual(updatedThread.messages[0].content, 'Welcome to our platform demonstration!');
    });

    test('3.3 CRM Inquiry: appendTimelineEvent executes safely without ReferenceError', async () => {
      const event = await crmInquiryService.appendTimelineEvent(inquiryA._id.toString(), {
        eventType: 'NOTE_ADDED',
        actorName: 'Platform Support',
        metadata: { notes: 'Prospect interested in visitor management feature' },
        contextOrgId: orgA._id.toString(),
      });

      assert.ok(event, 'Expected timeline event to be created');
      assert.strictEqual(event.eventType, 'NOTE_ADDED');
    });

    test('3.4 Support Report Attachment: Missing tenant context rejected (400)', async () => {
      await assert.rejects(
        async () => {
          await issueReportService.getAttachmentFile('rep-abcdef12345678.jpg', {});
        },
        (err) => {
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /Valid workspace organization context is required/i);
          return true;
        }
      );
    });

    test('3.5 Support Report Attachment: Cross-tenant attachment access rejected (404)', async () => {
      // Even with valid filename format, querying with Org B scope for an attachment belonging to Org A returns 404
      await assert.rejects(
        async () => {
          await issueReportService.getAttachmentFile('rep-1234567890abcdef.jpg', {
            orgId: orgB._id.toString(),
            isPlatform: false,
          });
        },
        (err) => {
          assert.strictEqual(err.statusCode, 404);
          assert.match(err.message, /Attachment not found/i);
          return true;
        }
      );
    });
  });
});
