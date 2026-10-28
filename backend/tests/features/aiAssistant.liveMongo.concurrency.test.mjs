import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectDb, closeDb, clearDb } from './db.setup.js';

import {
  createPendingActionProposal,
  acquireExecutionLease,
  getPendingActionById,
  resetActionStoreForTesting,
} from '../../src/features/aiAssistant/aiAssistant.actions.js';

import {
  executeAssistantTool,
  setTestServices,
  resetTestServices,
} from '../../src/features/aiAssistant/aiAssistant.tools.js';

import visitorPassService from '../../src/features/visitorPass/visitorPass.service.js';
import visitorPassEvents from '../../src/features/visitorPass/visitorPass.events.js';
import VisitorPass from '../../src/features/visitorPass/visitorPass.model.js';
import AIAssistantAction from '../../src/features/aiAssistant/aiAssistantAction.model.js';

import personalExpenseService from '../../src/features/personalExpense/personalExpense.service.js';
import PersonalExpenseTransaction from '../../src/features/personalExpense/personalExpenseTransaction.model.js';

import complaintService from '../../src/features/complaint/complaint.service.js';
import { complaintEvents } from '../../src/features/complaint/complaint.events.js';
import Complaint from '../../src/features/complaint/complaint.model.js';

import * as pollServices from '../../src/features/poll/poll.services.js';
import * as pollRepo from '../../src/features/poll/poll.repository.js';
import Poll from '../../src/features/poll/poll.model.js';
import PollVote from '../../src/features/poll/pollVote.model.js';

import AmenityBooking from '../../src/features/amenityBooking/amenityBooking.model.js';
import Amenity from '../../src/features/amenity/amenity.model.js';
import amenityBookingServiceInstance from '../../src/features/amenityBooking/amenityBooking.services.js';
import { amenityBookingEventEmitter, AMENITY_BOOKING_CANCELLED } from '../../src/features/amenityBooking/amenityBooking.events.js';

const orgId = new mongoose.Types.ObjectId().toString();
const userId = new mongoose.Types.ObjectId().toString();

const userContext = {
  id: userId,
  _id: userId,
  name: 'Real DB Resident',
  role: 'Resident',
  orgId,
  organizationId: orgId,
  villaId: new mongoose.Types.ObjectId().toString(),
};

const tenantContext = {
  orgId,
  permissions: ['visitor:resident', 'amenity:book', 'complaints:resident', 'polls:vote'],
};

before(async () => {
  await connectDb();
  // Ensure all Mongoose models have synchronized indexes on the live replica set
  await AIAssistantAction.syncIndexes();
  await VisitorPass.syncIndexes();
  await PersonalExpenseTransaction.syncIndexes();
  await Complaint.syncIndexes();
  await Poll.syncIndexes();
  await PollVote.syncIndexes();
  await AmenityBooking.syncIndexes();
  await Amenity.syncIndexes();
});

beforeEach(async () => {
  await clearDb();
  resetActionStoreForTesting();
  resetTestServices();
});

after(async () => {
  await closeDb();
});

// Helper for synchronization barrier promises
function createBarrier() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test('Priority 3 Live Mongo: Visitor Pass - Stale Worker A is rejected by DB unique index after Worker B commits', async () => {
  let emittedEventsCount = 0;
  const listener = () => { emittedEventsCount++; };
  visitorPassEvents.on('pass_created', listener);

  try {
    const proposal = await createPendingActionProposal({
      actionType: 'CREATE_VISITOR_PASS',
      userId: userContext.id,
      orgId: userContext.orgId,
      params: {
        visitorName: 'Live DB Guest',
        passType: 'GUEST',
        startDate: new Date('2026-11-01T00:00:00.000Z'),
        endDate: new Date('2026-11-01T23:59:59.999Z'),
        dateStr: '2026-11-01',
        timeWindowStart: '09:00',
        timeWindowEnd: '18:00',
      },
      summary: 'Pass for Live DB Guest',
    });

    const barrierAPaused = createBarrier();
    const barrierAResume = createBarrier();

    const originalCreatePass = visitorPassService.createPass.bind(visitorPassService);
    let workerACalled = false;

    // Intercept visitorPassService to simulate Worker A pausing right before write
    const wrappedVisitorPassService = {
      ...visitorPassService,
      getPassByClientReference: visitorPassService.getPassByClientReference.bind(visitorPassService),
      createPass: async (passData, session) => {
        if (!workerACalled) {
          workerACalled = true;
          barrierAPaused.resolve();
          await barrierAResume.promise;
        }
        return await originalCreatePass(passData, session);
      },
    };

    setTestServices({ visitorPassService: wrappedVisitorPassService });

    // Step 1: Worker A begins execution asynchronously
    const workerAPromise = executeAssistantTool(
      userContext,
      tenantContext,
      'confirm_pending_action',
      { actionId: proposal.actionId, confirmationToken: proposal.confirmationToken }
    );

    // Step 2: Await Worker A hitting the barrier (post-lease acquisition, pre-domain write)
    await barrierAPaused.promise;

    // Step 3: Worker A's lease expires in MongoDB (> 60s ago)
    await AIAssistantAction.updateOne(
      { actionId: proposal.actionId },
      { $set: { lockedAt: new Date(Date.now() - 65000) } }
    );

    const memDoc = getPendingActionById(proposal.actionId);
    if (memDoc) memDoc.lockedAt = Date.now() - 65000;

    // Step 4: Worker B acquires the lease and completes the mutation
    const workerBResult = await executeAssistantTool(
      userContext,
      tenantContext,
      'confirm_pending_action',
      { actionId: proposal.actionId, confirmationToken: proposal.confirmationToken }
    );

    assert.equal(workerBResult.success, true, 'Worker B must successfully complete mutation');
    assert.equal(workerBResult.executed, true);
    assert.equal(emittedEventsCount, 1, 'Worker B must emit exactly 1 pass_created event');

    // Step 5: Resume Worker A
    barrierAResume.resolve();
    const workerAResult = await workerAPromise;

    // Step 6: Verify Worker A was fenced and did NOT duplicate pass or side effects
    assert.equal(emittedEventsCount, 1, 'Side effect count must remain strictly 1');

    // Verify database collection state directly via Mongoose
    const allPasses = await VisitorPass.find({ clientReference: proposal.actionId });
    assert.equal(allPasses.length, 1, 'Live MongoDB must contain exactly 1 VisitorPass document');
    assert.equal(allPasses[0].visitorDetails.name, 'Live DB Guest');

    // Verify AIAssistantAction status in MongoDB
    const actionInDb = await AIAssistantAction.findOne({ actionId: proposal.actionId });
    assert.equal(actionInDb.status, 'EXECUTED');
  } finally {
    visitorPassEvents.removeListener('pass_created', listener);
  }
});

test('Priority 3 Live Mongo: Personal Expense - Deterministic reference unique index prevents duplicate ledger write', async () => {
  const proposal = await createPendingActionProposal({
    actionType: 'CREATE_PERSONAL_EXPENSE',
    userId: userContext.id,
    orgId: userContext.orgId,
    params: {
      amount: '550.00',
      categoryId: 'groceries',
      categoryName: 'Groceries',
      transactionDate: '2026-11-01',
      paymentMethod: 'UPI',
      merchantOrSource: 'Live DB Supermarket',
    },
    summary: 'Expense of 550 for Groceries',
  });

  const barrierAPaused = createBarrier();
  const barrierAResume = createBarrier();

  const originalCreateTx = personalExpenseService.createTransaction.bind(personalExpenseService);
  let workerACalled = false;

  const wrappedExpenseService = {
    ...personalExpenseService,
    getTransactionByReference: personalExpenseService.getTransactionByReference.bind(personalExpenseService),
    createTransaction: async (user, data) => {
      if (!workerACalled) {
        workerACalled = true;
        barrierAPaused.resolve();
        await barrierAResume.promise;
      }
      return await originalCreateTx(user, data);
    },
  };

  setTestServices({ personalExpenseService: wrappedExpenseService });

  // Worker A starts
  const workerAPromise = executeAssistantTool(
    userContext,
    tenantContext,
    'confirm_pending_action',
    { actionId: proposal.actionId, confirmationToken: proposal.confirmationToken }
  );

  await barrierAPaused.promise;

  // Expire Worker A lease
  await AIAssistantAction.updateOne(
    { actionId: proposal.actionId },
    { $set: { lockedAt: new Date(Date.now() - 65000) } }
  );
  const memDoc = getPendingActionById(proposal.actionId);
  if (memDoc) memDoc.lockedAt = Date.now() - 65000;

  // Worker B runs
  const workerBResult = await executeAssistantTool(
    userContext,
    tenantContext,
    'confirm_pending_action',
    { actionId: proposal.actionId, confirmationToken: proposal.confirmationToken }
  );
  assert.equal(workerBResult.success, true);

  // Resume Worker A
  barrierAResume.resolve();
  await workerAPromise;

  // Verify only 1 document in live Mongo
  const txs = await PersonalExpenseTransaction.find({ reference: proposal.actionId });
  assert.equal(txs.length, 1, 'Live MongoDB must contain exactly 1 transaction for reference');
  assert.equal(txs[0].amountMinor, 55000);
});

test('Priority 3 Live Mongo: Complaint - Unique index on aiAnalysisMetadata.aiStatus fences stalled worker', async () => {
  let emittedEventsCount = 0;
  const listener = () => { emittedEventsCount++; };
  complaintEvents.on('complaint.created', listener);

  try {
    const proposal = await createPendingActionProposal({
      actionType: 'CREATE_COMPLAINT',
      userId: userContext.id,
      orgId: userContext.orgId,
      params: {
        title: 'Live DB Elevator Malfunction',
        description: 'Elevator in block B stopped working',
        category: 'Elevator',
        priority: 'High',
      },
      summary: 'Complaint for Elevator Malfunction',
    });

    const barrierAPaused = createBarrier();
    const barrierAResume = createBarrier();

    const originalCreateComplaint = complaintService.createComplaint.bind(complaintService);
    let workerACalled = false;

    const wrappedComplaintService = {
      ...complaintService,
      getComplaintByAiStatus: complaintService.getComplaintByAiStatus.bind(complaintService),
      createComplaint: async (orgId, residentId, name, data, meta) => {
        if (!workerACalled) {
          workerACalled = true;
          barrierAPaused.resolve();
          await barrierAResume.promise;
        }
        return await originalCreateComplaint(orgId, residentId, name, data, meta);
      },
    };

    setTestServices({ complaintService: wrappedComplaintService });

    const workerAPromise = executeAssistantTool(
      userContext,
      tenantContext,
      'confirm_pending_action',
      { actionId: proposal.actionId, confirmationToken: proposal.confirmationToken }
    );

    await barrierAPaused.promise;

    await AIAssistantAction.updateOne(
      { actionId: proposal.actionId },
      { $set: { lockedAt: new Date(Date.now() - 65000) } }
    );
    const memDoc = getPendingActionById(proposal.actionId);
    if (memDoc) memDoc.lockedAt = Date.now() - 65000;

    const workerBResult = await executeAssistantTool(
      userContext,
      tenantContext,
      'confirm_pending_action',
      { actionId: proposal.actionId, confirmationToken: proposal.confirmationToken }
    );
    assert.equal(workerBResult.success, true);
    assert.equal(emittedEventsCount, 1, 'Only Worker B must emit complaint_created event');

    barrierAResume.resolve();
    await workerAPromise;

    assert.equal(emittedEventsCount, 1, 'Total event emissions must remain 1');

    const complaintsInDb = await Complaint.find({ 'aiAnalysisMetadata.aiStatus': proposal.actionId });
    assert.equal(complaintsInDb.length, 1, 'Live MongoDB must contain exactly 1 Complaint document');
  } finally {
    // complaintEvents uses broker without removeListener
  }
});

test('Priority 3 Live Mongo: Poll Vote - Idempotent voting prevents accidental unvoting on duplicate or stalled worker execution', async () => {
  // Create an active poll in MongoDB
  const poll = await Poll.create({
    orgId: new mongoose.Types.ObjectId(orgId),
    createdBy: new mongoose.Types.ObjectId(userId),
    question: 'Where should we build the community garden?',
    title: 'Community Garden Initiative',
    description: 'Vote on garden location',
    choiceType: 'SINGLE_CHOICE',
    votingMode: 'ONE_PER_USER',
    status: 'Active',
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    options: [
      { text: 'North Wing Lawn', votesCount: 0 },
      { text: 'Clubhouse Rooftop', votesCount: 0 },
    ],
    targetAudience: { type: 'ALL' },
    totalVotes: 0,
  });

  const proposal = await createPendingActionProposal({
    actionType: 'CAST_POLL_VOTE',
    userId: userContext.id,
    orgId: userContext.orgId,
    params: {
      pollId: poll._id.toString(),
      pollTitle: 'Community Garden Initiative',
      selectedOptionIndex: 0,
      chosenOptionTexts: ['North Wing Lawn'],
    },
    summary: 'Vote for North Wing Lawn',
  });

  // Worker B completes the vote first
  const workerBResult = await executeAssistantTool(
    userContext,
    tenantContext,
    'confirm_pending_action',
    { actionId: proposal.actionId, confirmationToken: proposal.confirmationToken }
  );
  assert.equal(workerBResult.success, true);

  // Check Poll and PollVote in MongoDB
  let pollInDb = await Poll.findById(poll._id);
  assert.equal(pollInDb.totalVotes, 1, 'Poll must have exactly 1 vote');
  assert.equal(pollInDb.options[0].votesCount, 1);

  let votes = await PollVote.find({ pollId: poll._id, residentId: userContext.id });
  assert.equal(votes.length, 1, 'PollVote must exist in DB');

  // Now Worker A attempts execution with the exact same ballot
  // Because of our hasResidentVoted check in tools.js, Worker A must NOT unvote or decrement the count!
  const workerAResult = await executeAssistantTool(
    userContext,
    tenantContext,
    'confirm_pending_action',
    { actionId: proposal.actionId, confirmationToken: proposal.confirmationToken }
  );

  // Re-verify Poll and PollVote in MongoDB
  pollInDb = await Poll.findById(poll._id);
  assert.equal(pollInDb.totalVotes, 1, 'Poll vote count must NOT be decremented/unvoted');
  assert.equal(pollInDb.options[0].votesCount, 1);

  votes = await PollVote.find({ pollId: poll._id, residentId: userContext.id });
  assert.equal(votes.length, 1, 'User ballot must still be recorded in MongoDB');
});

test('Priority 1 Concurrency: Poll Voting - Worker A and Worker B both pass hasResidentVoted=false race; preserves single vote and normal unvote flow', async () => {
  const poll = await Poll.create({
    orgId: new mongoose.Types.ObjectId(orgId),
    createdBy: new mongoose.Types.ObjectId(userId),
    question: 'Should we add a rooftop solar installation?',
    title: 'Solar Energy Project',
    choiceType: 'SINGLE_CHOICE',
    votingMode: 'ONE_PER_USER',
    status: 'Active',
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    options: [
      { text: 'Yes, full solar', votesCount: 0 },
      { text: 'No, too expensive', votesCount: 0 },
    ],
    targetAudience: { type: 'ALL' },
    totalVotes: 0,
  });

  // Step 1: Simulate race where Worker A and Worker B both checked checkIfUserVoted() and received false
  const votedBeforeA = await pollServices.checkIfUserVoted(poll._id.toString(), orgId, userId);
  const votedBeforeB = await pollServices.checkIfUserVoted(poll._id.toString(), orgId, userId);
  assert.equal(votedBeforeA, false);
  assert.equal(votedBeforeB, false);

  // Step 2: Worker A records vote with allowUnvote: false
  const resA = await pollServices.voteOnPoll(poll._id.toString(), orgId, userId, {
    selectedOptionIndex: 0,
    allowUnvote: false,
  });
  assert.equal(resA.hasVoted, true);
  assert.equal(resA.action, undefined); // first vote

  let pollAfterA = await Poll.findById(poll._id);
  assert.equal(pollAfterA.totalVotes, 1);
  assert.equal(pollAfterA.options[0].votesCount, 1);

  // Step 3: Worker B resumes and executes the same ballot with allowUnvote: false
  const resB = await pollServices.voteOnPoll(poll._id.toString(), orgId, userId, {
    selectedOptionIndex: 0,
    allowUnvote: false,
  });
  assert.equal(resB.hasVoted, true);
  assert.equal(resB.action, 'already_voted', 'Worker B must return already_voted without unvoting');

  // Verify DB state: totalVotes must remain 1, option count must remain 1
  let pollAfterB = await Poll.findById(poll._id);
  assert.equal(pollAfterB.totalVotes, 1, 'Total votes must remain strictly 1');
  assert.equal(pollAfterB.options[0].votesCount, 1);

  // Step 4: Independent vote change: Resident changes vote to Option 1
  const resChange = await pollServices.voteOnPoll(poll._id.toString(), orgId, userId, {
    selectedOptionIndex: 1,
    allowUnvote: false,
  });
  assert.equal(resChange.hasVoted, true);
  let pollAfterChange = await Poll.findById(poll._id);
  assert.equal(pollAfterChange.totalVotes, 1, 'Total votes remains 1 after vote change');
  assert.equal(pollAfterChange.options[0].votesCount, 0, 'Old option decremented');
  assert.equal(pollAfterChange.options[1].votesCount, 1, 'New option incremented');

  // Step 5: A different resident votes on the same poll
  const resident2Id = new mongoose.Types.ObjectId().toString();
  const resOther = await pollServices.voteOnPoll(poll._id.toString(), orgId, resident2Id, {
    selectedOptionIndex: 1,
    allowUnvote: false,
  });
  assert.equal(resOther.hasVoted, true);
  let pollWithTwoResidents = await Poll.findById(poll._id);
  assert.equal(pollWithTwoResidents.totalVotes, 2, 'Total votes increments to 2 for second resident');
  assert.equal(pollWithTwoResidents.options[1].votesCount, 2);

  // Step 6: Normal application unvote: Resident intentionally unvotes via regular UI (allowUnvote: true)
  const resUnvote = await pollServices.voteOnPoll(poll._id.toString(), orgId, resident2Id, {
    selectedOptionIndex: 1,
    allowUnvote: true,
  });
  assert.equal(resUnvote.hasVoted, false, 'Normal UI toggle unvotes the resident');
  let pollAfterUnvote = await Poll.findById(poll._id);
  assert.equal(pollAfterUnvote.totalVotes, 1, 'Total votes decrements to 1 after normal unvote');
  assert.equal(pollAfterUnvote.options[1].votesCount, 1);
});

test('Priority 2 Concurrency: Amenity Booking Cancellation - Only one state transition and event emitted', async () => {
  let emittedCancelCount = 0;
  const cancelListener = () => { emittedCancelCount++; };
  amenityBookingEventEmitter.on(AMENITY_BOOKING_CANCELLED, cancelListener);

  try {
    const amenity = await Amenity.create({
      orgId: new mongoose.Types.ObjectId(orgId),
      name: 'Olympic Swimming Pool',
      type: 'Sports',
      capacity: 10,
      pricing: { pricingType: 'fixed', baseRate: 0 },
      bookingRules: {
        openTime: '06:00',
        closeTime: '22:00',
        isCancellationEnabled: true,
        cancellationRefundRules: [{ cancelBeforeHours: 1, refundPercentage: 100 }],
      },
    });

    const booking = await AmenityBooking.create({
      orgId: new mongoose.Types.ObjectId(orgId),
      amenityId: amenity._id,
      userId: new mongoose.Types.ObjectId(userId),
      bookingId: `BKG-TEST-${Date.now()}`,
      bookingDate: '2026-11-05',
      startTime: '10:00',
      endTime: '11:00',
      status: 'confirmed',
      paymentStatus: 'success',
      paymentMethod: 'WALLET',
      totalPrice: 0,
    });

    // Worker 1 and Worker 2 concurrently cancel the same booking
    const [res1, res2] = await Promise.allSettled([
      amenityBookingServiceInstance.cancelBooking(booking._id.toString(), userId, orgId, 'Plans changed'),
      amenityBookingServiceInstance.cancelBooking(booking._id.toString(), userId, orgId, 'Duplicate cancel attempt'),
    ]);

    // At least one must succeed; if second succeeds idempotently, it returned the already cancelled booking
    const successfulResults = [res1, res2].filter((r) => r.status === 'fulfilled');
    assert.ok(successfulResults.length >= 1);

    // Event must be emitted exactly once
    assert.equal(emittedCancelCount, 1, 'AMENITY_BOOKING_CANCELLED must be emitted strictly once');

    // Final database state check
    const finalBooking = await AmenityBooking.findById(booking._id);
    assert.equal(finalBooking.status, 'cancelled');
  } finally {
    amenityBookingEventEmitter.removeListener(AMENITY_BOOKING_CANCELLED, cancelListener);
  }
});

test('Priority 3 Concurrency: Visitor Pass Revocation - Single state transition and ownership authorization', async () => {
  let emittedRevokedCount = 0;
  const revokeListener = () => { emittedRevokedCount++; };
  visitorPassEvents.on('pass_revoked', revokeListener);

  try {
    const pass = await VisitorPass.create({
      orgId: new mongoose.Types.ObjectId(orgId),
      createdById: new mongoose.Types.ObjectId(userId),
      passType: 'GUEST',
      visitorDetails: { name: 'Concurrent Guest' },
      status: 'PENDING',
      validity: {
        startDate: new Date('2026-11-02'),
        endDate: new Date('2026-11-02T23:59:59.999Z'),
      },
    });

    // Test Unauthorized resident cannot revoke pass
    const unauthorizedResidentId = new mongoose.Types.ObjectId().toString();
    await assert.rejects(
      visitorPassService.revokePass(pass._id.toString(), orgId, null, {
        actorId: unauthorizedResidentId,
        role: 'Resident',
      }),
      (err) => err.statusCode === 403 && /belongs to another resident/.test(err.message),
      'Unauthorized resident must be rejected with 403'
    );

    // Concurrent revocation by authorized resident (Worker 1 & Worker 2)
    const [res1, res2] = await Promise.allSettled([
      visitorPassService.revokePass(pass._id.toString(), orgId, null, { actorId: userId, role: 'Resident' }),
      visitorPassService.revokePass(pass._id.toString(), orgId, null, { actorId: userId, role: 'Resident' }),
    ]);

    // Verify exactly one pass_revoked event was emitted
    assert.equal(emittedRevokedCount, 1, 'pass_revoked must be emitted strictly once');

    const finalPass = await VisitorPass.findById(pass._id);
    assert.equal(finalPass.status, 'REVOKED');
  } finally {
    visitorPassEvents.removeListener('pass_revoked', revokeListener);
  }
});

test('Priority 3 Concurrency: Complaint Cancellation - Single state transition and ownership authorization', async () => {
  const complaint = await Complaint.create({
    orgId: new mongoose.Types.ObjectId(orgId),
    residentId: new mongoose.Types.ObjectId(userId),
    complaintNumber: `CMP-${Date.now()}`,
    title: 'Water pressure low',
    description: 'Pressure low on 3rd floor',
    category: 'Plumbing',
    status: 'Open',
    priority: 'Medium',
    location: { flat: 'Unit 301' },
  });

  // Test Unauthorized resident cannot cancel complaint
  const unauthorizedResidentId = new mongoose.Types.ObjectId().toString();
  await assert.rejects(
    complaintService.cancelComplaint(
      complaint._id.toString(),
      orgId,
      unauthorizedResidentId,
      'Other Resident',
      'Resident',
      'Unauthorized cancel'
    ),
    (err) => err.statusCode === 403 && /Only the resident who logged this ticket/.test(err.message)
  );

  // Authorized concurrent cancellation
  const [res1, res2] = await Promise.allSettled([
    complaintService.cancelComplaint(complaint._id.toString(), orgId, userId, 'Real Resident', 'Resident', 'Issue resolved'),
    complaintService.cancelComplaint(complaint._id.toString(), orgId, userId, 'Real Resident', 'Resident', 'Duplicate cancel call'),
  ]);

  const fulfilled = [res1, res2].filter((r) => r.status === 'fulfilled');
  assert.ok(fulfilled.length >= 1);

  const finalComplaint = await Complaint.findById(complaint._id);
  assert.equal(finalComplaint.status, 'Cancelled');
  // Check timeline entries: must have exactly 1 Cancelled timeline entry
  const cancelledTimelines = (finalComplaint.timeline || []).filter((t) => t.status === 'Cancelled');
  assert.equal(cancelledTimelines.length, 1, 'Must contain exactly 1 Cancelled timeline event');
});
