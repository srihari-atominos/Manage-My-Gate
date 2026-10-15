import test from 'node:test';
import assert from 'node:assert/strict';

process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017/test';
process.env.JWT_SECRET ||= 'x'.repeat(40);

const complaintService = (await import('../src/features/complaint/complaint.service.js')).default;
const complaintRepository = (await import('../src/features/complaint/complaint.repository.js')).default;
const { complaintEvents } = await import('../src/features/complaint/complaint.events.js');
const complaintSettingsService = (await import('../src/features/complaintSettings/complaintSettings.service.js')).default;
const auditLogService = (await import('../src/features/auditLog/auditLog.services.js')).default;

const ORG = '507f1f77bcf86cd799439011';
const RESIDENT = '507f1f77bcf86cd7994390a1';
const STAFF = '507f1f77bcf86cd7994390b2';
const OTHER = '507f1f77bcf86cd7994390c3';
const DAY = 24 * 3600 * 1000;

function stub(target, impls) {
  const orig = {};
  for (const [k, v] of Object.entries(impls)) {
    orig[k] = target[k];
    target[k] = v;
  }
  return () => Object.assign(target, orig);
}

/** Runs fn with a fake complaint store; returns what was written and which events fired. */
async function withComplaint(complaint, fn, { settings = {} } = {}) {
  const writes = [];
  const events = [];
  const restore = [
    stub(complaintRepository, {
      findById: async () => ({ ...complaint }),
      update: async (id, orgId, data, session, extra) => {
        writes.push({ data, extra });
        return { ...complaint, ...(data.$set || {}), ...Object.fromEntries(Object.entries(data).filter(([k]) => !k.startsWith('$'))) };
      },
    }),
    stub(complaintSettingsService, { getSettings: async () => settings }),
    stub(auditLogService, { logAction: async () => {} }),
    stub(complaintEvents, { emit: (name, payload) => events.push({ name, ...payload }) }),
  ];
  try {
    return await fn({ writes, events });
  } finally {
    restore.forEach((r) => r());
  }
}

const base = {
  _id: 'c1',
  orgId: ORG,
  complaintNumber: 'CMP-1',
  residentId: RESIDENT,
  assignedTechnicianId: STAFF,
  status: 'In Progress',
  reopenCount: 0,
};

const done = { ...base, status: 'Completed', completionDate: new Date(), closedAt: null };

// ---------------- work steps: only the assignee ----------------
test('only the assigned employee can pause, resume, annotate or complete', async () => {
  await withComplaint(base, async () => {
    await assert.rejects(complaintService.pauseWork('c1', ORG, OTHER, 'Rita', 'Resident', 'x'), (e) => e.statusCode === 403);
    await assert.rejects(complaintService.addWorkNotes('c1', ORG, OTHER, 'Rita', 'Resident', 'hello'), (e) => e.statusCode === 403);
    await assert.rejects(complaintService.uploadWorkAttachments('c1', ORG, OTHER, 'Rita', 'Resident', ['/a.jpg']), (e) => e.statusCode === 403);
    await assert.rejects(complaintService.markWorkCompleted('c1', ORG, OTHER, 'Rita', 'Resident', 'done'), (e) => e.statusCode === 403);
  });
});

test('pause needs a reason, only works while in progress, and is recorded in statusHistory (SLA hold)', async () => {
  await withComplaint(base, async ({ writes }) => {
    await assert.rejects(complaintService.pauseWork('c1', ORG, STAFF, 'S', 'Staff', '  '), (e) => e.statusCode === 400);
    await complaintService.pauseWork('c1', ORG, STAFF, 'S', 'Staff', 'Waiting for spare part');
    assert.equal(writes[0].data.status, 'On Hold');
    assert.equal(writes[0].data.$push.statusHistory.status, 'On Hold');
  });
  await withComplaint({ ...base, status: 'Assigned' }, async () => {
    await assert.rejects(complaintService.pauseWork('c1', ORG, STAFF, 'S', 'Staff', 'x'), (e) => e.statusCode === 400);
  });
  await withComplaint({ ...base, status: 'In Progress' }, async ({ writes }) => {
    await complaintService.resumeWork('c1', ORG, STAFF, 'S', 'Staff');
    assert.equal(writes.length, 0, 'resuming work that is already running is a no-op');
  });
  await withComplaint({ ...base, status: 'Assigned' }, async () => {
    await assert.rejects(complaintService.resumeWork('c1', ORG, STAFF, 'S', 'Staff'), (e) => e.statusCode === 400);
  });
});

// ---------------- staff marks completed ----------------
test('marking completed needs a started job and proof (a note or a photo)', async () => {
  await withComplaint({ ...base, status: 'Assigned' }, async () => {
    await assert.rejects(complaintService.markWorkCompleted('c1', ORG, STAFF, 'S', 'Staff', 'done'), (e) => e.statusCode === 400 && /Accept/.test(e.message));
  });
  await withComplaint({ ...base, status: 'On Hold' }, async () => {
    await assert.rejects(complaintService.markWorkCompleted('c1', ORG, STAFF, 'S', 'Staff', 'done'), (e) => e.statusCode === 400 && /Resume/.test(e.message));
  });
  await withComplaint(base, async () => {
    await assert.rejects(complaintService.markWorkCompleted('c1', ORG, STAFF, 'S', 'Staff', '   ', []), (e) => e.statusCode === 400 && /note or a photo/.test(e.message));
  });
});

test('completing sets Completed + waiting-for-resident and notifies once', async () => {
  await withComplaint(base, async ({ writes, events }) => {
    await complaintService.markWorkCompleted('c1', ORG, STAFF, 'S', 'Staff', 'Replaced the tap', ['/uploads/complaints/a.jpg']);
    const { $set, $push } = writes[0].data;
    assert.equal($set.status, 'Completed');
    assert.equal($set.workflowStatus, 'Waiting For Resident Confirmation');
    assert.equal($set.confirmationReminderSentAt, null);
    assert.deepEqual($push.timeline.attachments, ['/uploads/complaints/a.jpg']);
    assert.equal(events.filter((e) => e.action === 'Work Completed').length, 1);
  });
  await withComplaint(done, async ({ writes }) => {
    await complaintService.markWorkCompleted('c1', ORG, STAFF, 'S', 'Staff', 'again');
    assert.equal(writes.length, 0, 'second tap must not write again');
  });
});

// ---------------- resident confirms ----------------
test('resident can only confirm finished work', async () => {
  for (const status of ['Open', 'Assigned', 'In Progress', 'Cancelled', 'Rejected', 'Escalated', 'Reopened']) {
    await withComplaint({ ...base, status }, async () => {
      await assert.rejects(
        complaintService.confirmCompletion('c1', ORG, RESIDENT, 'Rita', 'Resident'),
        (e) => e.statusCode === 400,
        `${status} must not be confirmable`
      );
    });
  }
  await withComplaint(done, async () => {
    await assert.rejects(complaintService.confirmCompletion('c1', ORG, OTHER, 'Eve', 'Resident'), (e) => e.statusCode === 403);
  });
});

test('confirming closes the ticket, stores clean feedback and notifies', async () => {
  await withComplaint(done, async ({ writes, events }) => {
    await complaintService.confirmCompletion('c1', ORG, RESIDENT, 'Rita', 'Resident', {}, { overallRating: 9, technicianRating: '4', remarks: '  great  ' });
    const data = writes[0].data;
    assert.equal(data.status, 'Closed');
    assert.equal(data.feedback.overallRating, undefined, 'out-of-range rating dropped');
    assert.equal(data.feedback.technicianRating, 4);
    assert.equal(data.feedback.remarks, 'great');
    assert.deepEqual(events.map((e) => e.action), ['Resident Confirmed', 'Complaint Closed']);
  });
});

// ---------------- resident says "not fixed" ----------------
test('reopen: owner only, reason required, only after work is done', async () => {
  await withComplaint(done, async ({ writes, events }) => {
    await assert.rejects(complaintService.reopenComplaint('c1', ORG, OTHER, 'Eve', 'Resident', 'still leaking'), (e) => e.statusCode === 403);
    await assert.rejects(complaintService.reopenComplaint('c1', ORG, RESIDENT, 'Rita', 'Resident', 'no'), (e) => e.statusCode === 400);

    await complaintService.reopenComplaint('c1', ORG, RESIDENT, 'Rita', 'Resident', 'Still leaking under the sink');
    const { $set, $inc, $push } = writes[0].data;
    assert.equal($set.status, 'Reopened');
    assert.equal($set.resolvedAt, null);
    assert.equal($inc.reopenCount, 1);
    assert.match($push.timeline.remarks, /Still leaking/);
    assert.equal(events[0].action, 'Complaint Reopened');
  });
  await withComplaint({ ...base, status: 'In Progress' }, async () => {
    await assert.rejects(complaintService.reopenComplaint('c1', ORG, RESIDENT, 'Rita', 'Resident', 'not done yet really'), (e) => e.statusCode === 400);
  });
});

test('reopen respects the admin-configured limit and closed-ticket window', async () => {
  await withComplaint({ ...done, reopenCount: 2 }, async () => {
    await assert.rejects(complaintService.reopenComplaint('c1', ORG, RESIDENT, 'Rita', 'Resident', 'still broken'), (e) => e.statusCode === 400 && /reopened 2/.test(e.message));
    // an admin may override the limit
    await complaintService.reopenComplaint('c1', ORG, OTHER, 'Admin', 'Community Admin', 'admin override reason');
  }, { settings: { workflow: { reopenLimit: 2, autoCloseDays: 7 } } });

  const oldClosed = { ...base, status: 'Closed', closedAt: new Date(Date.now() - 10 * DAY) };
  await withComplaint(oldClosed, async () => {
    await assert.rejects(complaintService.reopenComplaint('c1', ORG, RESIDENT, 'Rita', 'Resident', 'broke again'), (e) => e.statusCode === 400 && /raise a new complaint/.test(e.message));
  }, { settings: { workflow: { reopenLimit: 2, autoCloseDays: 7 } } });

  const freshClosed = { ...base, status: 'Closed', closedAt: new Date(Date.now() - 1 * DAY) };
  await withComplaint(freshClosed, async ({ writes }) => {
    await complaintService.reopenComplaint('c1', ORG, RESIDENT, 'Rita', 'Resident', 'broke again today');
    assert.equal(writes[0].data.$set.status, 'Reopened');
  }, { settings: { workflow: { reopenLimit: 2, autoCloseDays: 7 } } });
});

test('after a reopen the same employee can start and complete again', async () => {
  const reopened = { ...base, status: 'Reopened' };
  await withComplaint(reopened, async ({ writes }) => {
    await complaintService.startWork('c1', ORG, STAFF, 'S', 'Staff');
    assert.equal(writes[0].status, undefined);
    assert.equal(writes[0].data.status, 'In Progress');
    await complaintService.markWorkCompleted('c1', ORG, STAFF, 'S', 'Staff', 'Fixed properly this time');
    assert.equal(writes[1].data.$set.status, 'Completed');
  });
});

// ---------------- cancel ----------------
test('resident can cancel only before assignment', async () => {
  await withComplaint({ ...base, status: 'Open', assignedTechnicianId: null }, async ({ writes }) => {
    await assert.rejects(complaintService.cancelComplaint('c1', ORG, OTHER, 'Eve', 'Resident'), (e) => e.statusCode === 403);
    await complaintService.cancelComplaint('c1', ORG, RESIDENT, 'Rita', 'Resident', 'Fixed it myself');
    assert.equal(writes[0].data.status, 'Cancelled');
  });
  await withComplaint({ ...base, status: 'Assigned' }, async () => {
    await assert.rejects(complaintService.cancelComplaint('c1', ORG, RESIDENT, 'Rita', 'Resident'), (e) => e.statusCode === 400);
  });
});

// ---------------- feedback ----------------
test('only the resident can rate; rating finished work closes it; one rating per closed ticket', async () => {
  await withComplaint(done, async ({ writes }) => {
    await assert.rejects(complaintService.addFeedback('c1', ORG, OTHER, 'Eve', 'Resident', 5, 'x'), (e) => e.statusCode === 403);
    await assert.rejects(complaintService.addFeedback('c1', ORG, RESIDENT, 'Rita', 'Resident', 0, 'x'), (e) => e.statusCode === 400);
    await complaintService.addFeedback('c1', ORG, RESIDENT, 'Rita', 'Resident', 5, 'perfect');
    assert.equal(writes[0].data.status, 'Closed');
    assert.equal(writes[0].data.feedback.overallRating, 5);
  });
  await withComplaint({ ...base, status: 'Closed', feedback: { overallRating: 4 } }, async () => {
    await assert.rejects(complaintService.addFeedback('c1', ORG, RESIDENT, 'Rita', 'Resident', 5, 'again'), (e) => e.statusCode === 400);
  });
  await withComplaint({ ...base, status: 'In Progress' }, async () => {
    await assert.rejects(complaintService.addFeedback('c1', ORG, RESIDENT, 'Rita', 'Resident', 5, 'early'), (e) => e.statusCode === 400);
  });
});

// ---------------- status endpoint guards ----------------
test('the generic status endpoint cannot revive closed tickets and routes reopen through its rules', async () => {
  await withComplaint({ ...base, status: 'Closed', closedAt: new Date() }, async () => {
    await assert.rejects(complaintService.updateStatus('c1', ORG, 'In Progress', OTHER, 'Admin', 'A', 'x'), (e) => e.statusCode === 400);
  });
  await withComplaint(done, async ({ writes }) => {
    await complaintService.updateStatus('c1', ORG, 'Reopened', RESIDENT, 'Resident', 'Rita', 'still not fixed properly');
    assert.equal(writes[0].data.$set.status, 'Reopened');
  });
});

// ---------------- escalation ----------------
test('escalation never touches finished work and keeps the real status of started work', async () => {
  await withComplaint(done, async ({ writes }) => {
    await complaintService.escalateComplaint('c1', ORG);
    assert.equal(writes.length, 0);
  });
  await withComplaint({ ...base, status: 'In Progress', escalationLevel: 0 }, async ({ writes }) => {
    await complaintService.escalateComplaint('c1', ORG);
    assert.equal(writes[0].data.escalationLevel, 1);
    assert.equal('status' in writes[0].data, false, 'In Progress must stay In Progress');
  });
  await withComplaint({ ...base, status: 'Open', escalationLevel: 0 }, async ({ writes }) => {
    await complaintService.escalateComplaint('c1', ORG);
    assert.equal(writes[0].data.status, 'Escalated');
  });
});

// ---------------- reminder + auto-close job ----------------
test('job: reminds after 24h once, auto-closes after the configured days, and can be switched off', async () => {
  const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000);
  const waiting = [
    { _id: 'w1', orgId: ORG, complaintNumber: 'A', status: 'Completed', completionDate: hoursAgo(30), confirmationReminderSentAt: null },
    { _id: 'w2', orgId: ORG, complaintNumber: 'B', status: 'Completed', completionDate: hoursAgo(30), confirmationReminderSentAt: hoursAgo(5) },
    { _id: 'w3', orgId: ORG, complaintNumber: 'C', status: 'Completed', completionDate: hoursAgo(24 * 8), confirmationReminderSentAt: hoursAgo(100) },
    { _id: 'w4', orgId: ORG, complaintNumber: 'D', status: 'Completed', completionDate: hoursAgo(2), confirmationReminderSentAt: null },
  ];
  const run = async (settings) => {
    const writes = [];
    const events = [];
    const restore = [
      stub(complaintRepository, {
        findAwaitingConfirmation: async () => waiting,
        update: async (id, orgId, data, s, extra) => {
          writes.push({ id, data, extra });
          return { _id: id, orgId, complaintNumber: id };
        },
      }),
      stub(complaintSettingsService, { getSettings: async () => settings }),
      stub(complaintEvents, { emit: (name, payload) => events.push(payload.action) }),
    ];
    try {
      const result = await complaintService.processAwaitingConfirmations();
      return { result, writes, events };
    } finally {
      restore.forEach((r) => r());
    }
  };

  const on = await run({ workflow: { autoCloseDays: 7 } });
  assert.deepEqual(on.result, { checked: 4, reminded: 1, autoClosed: 1 });
  assert.deepEqual(on.writes.map((w) => w.id), ['w1', 'w3']);
  assert.ok(on.writes.every((w) => w.extra.status), 'writes must be conditional on the status');
  assert.deepEqual(on.events.sort(), ['Complaint Auto-Closed', 'Confirmation Reminder']);

  const off = await run({ workflow: { autoCloseDays: 0 } });
  assert.equal(off.result.autoClosed, 0, 'autoCloseDays 0 disables auto-close');
});
