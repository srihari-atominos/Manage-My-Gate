import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

import config from '../src/config/config.js';
import Complaint from '../src/features/complaint/complaint.model.js';
import Technician from '../src/features/technician/technician.model.js';
import User from '../src/features/user/user.model.js';
import complaintService from '../src/features/complaint/complaint.service.js';
import complaintRepository from '../src/features/complaint/complaint.repository.js';
import HttpError from '../src/utils/httpError.utils.js';

import { connectToDb } from '../src/config/db/mongodbConnectToDb.config.js';

describe('Complaints & Maintenance Lifecycle Integration Suite', () => {
  let isConnected = false;

  const orgId1 = new mongoose.Types.ObjectId();
  const otherOrgId = new mongoose.Types.ObjectId();

  let residentUser;
  let adminUser;
  let employeeUser;
  let unauthorizedUser;
  let technicianRecord;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await connectToDb(2, 500);
      isConnected = true;
    }

    // Clean prior test complaints for these test orgs
    await Complaint.deleteMany({ orgId: { $in: [orgId1, otherOrgId] } });
    await Technician.deleteMany({ orgId: { $in: [orgId1, otherOrgId] } });

    // Seed test users
    residentUser = await User.create({
      username: `resident_${Date.now()}`,
      email: `resident_${Date.now()}@example.com`,
      firstName: 'Alice',
      lastName: 'Resident',
      role: 'Resident',
      orgId: orgId1
    });

    adminUser = await User.create({
      username: `admin_${Date.now()}`,
      email: `admin_${Date.now()}@example.com`,
      firstName: 'Bob',
      lastName: 'Admin',
      role: 'Admin',
      orgId: orgId1
    });

    employeeUser = await User.create({
      username: `employee_${Date.now()}`,
      email: `employee_${Date.now()}@example.com`,
      firstName: 'Charlie',
      lastName: 'Staff',
      role: 'Staff',
      orgId: orgId1
    });

    unauthorizedUser = await User.create({
      username: `unauth_${Date.now()}`,
      email: `unauth_${Date.now()}@example.com`,
      firstName: 'Eve',
      lastName: 'Intruder',
      role: 'Resident',
      orgId: orgId1
    });

    // Create technician record for employeeUser
    technicianRecord = await Technician.create({
      orgId: orgId1,
      userId: employeeUser._id,
      name: 'Charlie Staff',
      email: employeeUser.email,
      phone: '9876543210',
      department: 'Plumbing',
      type: 'In-House Staff',
      status: 'Active'
    });
  });

  after(async () => {
    await Complaint.deleteMany({ orgId: { $in: [orgId1, otherOrgId] } });
    await Technician.deleteMany({ orgId: { $in: [orgId1, otherOrgId] } });
    await User.deleteMany({ _id: { $in: [residentUser._id, adminUser._id, employeeUser._id, unauthorizedUser._id] } });

    if (isConnected) {
      await mongoose.disconnect();
    }
  });

  it('Stage 1: Resident creates complaint -> Status is Open & Waiting For Assignment', async () => {
    const ticketData = {
      title: 'Water Leakage in Kitchen Sink',
      description: 'Pipe under the sink is leaking water continuously.',
      category: 'Plumbing',
      priority: 'High',
      location: { flat: '101', tower: 'A' },
      ignoreDuplicateWarning: true
    };

    const complaint = await complaintService.createComplaint(
      orgId1,
      residentUser._id,
      'Alice Resident',
      ticketData
    );

    assert.ok(complaint);
    assert.equal(complaint.status, 'Open');
    assert.equal(complaint.workflowStatus, 'Waiting For Assignment');
    assert.equal(String(complaint.residentId), String(residentUser._id));
    assert.ok(complaint.complaintNumber);
  });

  it('Stage 2: Strict Early Close Rejection -> Resident CANNOT mark Done while ticket is Open', async () => {
    const complaint = await Complaint.findOne({ orgId: orgId1, status: 'Open' });
    assert.ok(complaint);

    // Attempt confirmCompletion (Done CTA)
    await assert.rejects(
      () => complaintService.confirmCompletion(
        complaint._id,
        orgId1,
        residentUser._id,
        'Alice Resident',
        'Resident'
      ),
      (err) => {
        assert.ok(err instanceof HttpError);
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /The ticket can only be marked as Done after the assigned employee has completed the work/i);
        return true;
      }
    );

    // Attempt direct updateStatus to Closed
    await assert.rejects(
      () => complaintService.updateStatus(
        complaint._id,
        orgId1,
        'Closed',
        residentUser._id,
        'Resident',
        'Alice Resident',
        'Trying to close early'
      ),
      (err) => {
        assert.ok(err instanceof HttpError);
        assert.equal(err.statusCode, 400);
        return true;
      }
    );
  });

  it('Stage 3: Admin assigns Employee/Technician -> Status transitions to Assigned', async () => {
    const complaint = await Complaint.findOne({ orgId: orgId1, status: 'Open' });
    assert.ok(complaint);

    const assignmentResult = await complaintService.assignTechnician(
      complaint._id,
      orgId1,
      technicianRecord._id,
      null, // technicianIds
      'technician', // assignmentType
      'Charlie Staff',
      adminUser._id,
      'Bob Admin',
      null, // vendor
      null, // team
      'Inspect kitchen sink piping immediately',
      '2026-09-30',
      '10:00 AM'
    );

    const updated = assignmentResult.complaint;
    assert.ok(updated);
    assert.equal(updated.status, 'Assigned');
    assert.equal(String(updated.assignedTechnicianId), String(employeeUser._id));
    assert.equal(updated.assignedTechnicianName, 'Charlie Staff');

    // Resident still cannot mark Done on Assigned ticket
    await assert.rejects(
      () => complaintService.confirmCompletion(
        updated._id,
        orgId1,
        residentUser._id,
        'Alice Resident',
        'Resident'
      ),
      (err) => err instanceof HttpError && err.statusCode === 400
    );
  });

  it('Stage 4: Employee Acceptance & RBAC -> Only Assignee can accept, moves to Accepted (Idempotent)', async () => {
    const complaint = await Complaint.findOne({ orgId: orgId1, status: 'Assigned' });
    assert.ok(complaint);

    // Unauthorized user attempt
    await assert.rejects(
      () => complaintService.acceptAssignment(
        complaint._id,
        orgId1,
        unauthorizedUser._id,
        'Eve Intruder',
        'Resident'
      ),
      (err) => err instanceof HttpError && err.statusCode === 403
    );

    // Correct assignee accepts
    const accepted = await complaintService.acceptAssignment(
      complaint._id,
      orgId1,
      employeeUser._id,
      'Charlie Staff',
      'Staff'
    );

    assert.ok(accepted);
    assert.equal(accepted.status, 'Accepted');

    // Idempotent acceptance: second accept by same assignee safely returns complaint without duplicate history
    const timelineCountBefore = accepted.timeline.length;
    const reaccepted = await complaintService.acceptAssignment(
      complaint._id,
      orgId1,
      employeeUser._id,
      'Charlie Staff',
      'Staff'
    );
    assert.equal(reaccepted.status, 'Accepted');
    assert.equal(reaccepted.timeline.length, timelineCountBefore);

    // Resident still cannot mark Done on Accepted ticket
    await assert.rejects(
      () => complaintService.confirmCompletion(
        accepted._id,
        orgId1,
        residentUser._id,
        'Alice Resident',
        'Resident'
      ),
      (err) => err instanceof HttpError && err.statusCode === 400
    );
  });

  it('Stage 5: Work Execution -> Assignee starts work -> Status is In Progress', async () => {
    const complaint = await Complaint.findOne({ orgId: orgId1, status: 'Accepted' });
    assert.ok(complaint);

    // Unauthorized user attempt
    await assert.rejects(
      () => complaintService.startWork(
        complaint._id,
        orgId1,
        unauthorizedUser._id,
        'Eve Intruder',
        'Resident'
      ),
      (err) => err instanceof HttpError && err.statusCode === 403
    );

    // Assigned employee starts work
    const started = await complaintService.startWork(
      complaint._id,
      orgId1,
      employeeUser._id,
      'Charlie Staff',
      'Staff'
    );

    assert.ok(started);
    assert.equal(started.status, 'In Progress');
    assert.equal(started.workflowStatus, 'Work In Progress');

    // Idempotent start work: calling again safely returns ticket
    const restarted = await complaintService.startWork(
      complaint._id,
      orgId1,
      employeeUser._id,
      'Charlie Staff',
      'Staff'
    );
    assert.equal(restarted.status, 'In Progress');

    // Resident still cannot mark Done while In Progress
    await assert.rejects(
      () => complaintService.confirmCompletion(
        started._id,
        orgId1,
        residentUser._id,
        'Alice Resident',
        'Resident'
      ),
      (err) => err instanceof HttpError && err.statusCode === 400
    );
  });

  it('Stage 6: Assignee Completes Work -> Status is Completed & Waiting For Resident Confirmation', async () => {
    const complaint = await Complaint.findOne({ orgId: orgId1, status: 'In Progress' });
    assert.ok(complaint);

    // Unauthorized user attempt
    await assert.rejects(
      () => complaintService.markWorkCompleted(
        complaint._id,
        orgId1,
        unauthorizedUser._id,
        'Eve Intruder',
        'Resident',
        'Hacking completion'
      ),
      (err) => err instanceof HttpError && err.statusCode === 403
    );

    // Assigned employee marks completed
    const completed = await complaintService.markWorkCompleted(
      complaint._id,
      orgId1,
      employeeUser._id,
      'Charlie Staff',
      'Staff',
      'Replaced rubber washer and sealed pipe joint.'
    );

    assert.ok(completed);
    assert.equal(completed.status, 'Completed');
    assert.equal(completed.workflowStatus, 'Waiting For Resident Confirmation');
    assert.ok(completed.completionDate);
    assert.ok(completed.resolvedAt);

    // Idempotent completion call
    const reCompleted = await complaintService.markWorkCompleted(
      complaint._id,
      orgId1,
      employeeUser._id,
      'Charlie Staff',
      'Staff',
      'Replaced rubber washer again'
    );
    assert.equal(reCompleted.status, 'Completed');
  });

  it('Stage 7: Resident confirms Done -> Status is Closed & Idempotency Protected', async () => {
    const complaint = await Complaint.findOne({ orgId: orgId1, status: 'Completed' });
    assert.ok(complaint);

    // Unauthorized user cannot confirm
    await assert.rejects(
      () => complaintService.confirmCompletion(
        complaint._id,
        orgId1,
        unauthorizedUser._id,
        'Eve Intruder',
        'Resident'
      ),
      (err) => err instanceof HttpError && err.statusCode === 403
    );

    // Resident clicks "Done" / confirms completion with rating
    const closed = await complaintService.confirmCompletion(
      complaint._id,
      orgId1,
      residentUser._id,
      'Alice Resident',
      'Resident',
      {},
      {
        overallRating: 5,
        technicianRating: 5,
        cleanlinessRating: 5,
        remarks: 'Excellent and swift repair work!'
      }
    );

    assert.ok(closed);
    assert.equal(closed.status, 'Closed');
    assert.equal(closed.workflowStatus, 'Closed');
    assert.ok(closed.closedAt);
    assert.equal(closed.feedback?.overallRating, 5);

    // Idempotent duplicate Done click: clicking Done again returns closed ticket cleanly without throwing
    const timelineLenBefore = closed.timeline.length;
    const reClosed = await complaintService.confirmCompletion(
      complaint._id,
      orgId1,
      residentUser._id,
      'Alice Resident',
      'Resident'
    );
    assert.equal(reClosed.status, 'Closed');
    assert.equal(reClosed.timeline.length, timelineLenBefore);
  });

  it('Stage 8: Multi-Tenant Isolation & Analytics Division-by-Zero Protection', async () => {
    // Ticket from orgId1 must not be accessible in otherOrgId
    const complaint = await Complaint.findOne({ orgId: orgId1 });
    assert.ok(complaint);

    await assert.rejects(
      () => complaintService.getComplaintById(complaint._id, otherOrgId),
      (err) => err instanceof HttpError && err.statusCode === 404
    );

    // Analytics test on empty/non-empty orgs
    const analyticsOrg1 = await complaintRepository.getDashboardAnalytics(orgId1);
    assert.ok(analyticsOrg1.kpis);
    assert.equal(Number.isFinite(analyticsOrg1.kpis.averageResolutionHours), true);
    assert.equal(Number.isFinite(analyticsOrg1.kpis.averageResponseHours), true);
    assert.equal(Number.isFinite(analyticsOrg1.kpis.residentSatisfactionPercentage), true);
    assert.equal(isNaN(analyticsOrg1.kpis.averageResolutionHours), false);
    assert.equal(analyticsOrg1.kpis.averageResolutionHours >= 0, true);

    const analyticsEmptyOrg = await complaintRepository.getDashboardAnalytics(otherOrgId);
    assert.ok(analyticsEmptyOrg.kpis);
    assert.equal(analyticsEmptyOrg.kpis.total, 0);
    assert.equal(analyticsEmptyOrg.kpis.averageResolutionHours, 0);
    assert.equal(analyticsEmptyOrg.kpis.averageResponseHours, 0);
    assert.equal(analyticsEmptyOrg.kpis.residentSatisfactionPercentage, 0);
    assert.equal(isNaN(analyticsEmptyOrg.kpis.residentSatisfactionPercentage), false);
  });
});
