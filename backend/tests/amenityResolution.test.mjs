import test from 'node:test';
import assert from 'node:assert/strict';

process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017/test';
process.env.JWT_SECRET ||= 'x'.repeat(40);

const bookingModule = await import('../src/features/amenityBooking/amenityBooking.services.js');
const bookingService = bookingModule.default || bookingModule.amenityBookingService || new bookingModule.AmenityBookingService();
const { UNPAID_EXPIRY_REASON } = bookingModule;
const bookingRepo = (await import('../src/features/amenityBooking/amenityBooking.repository.js')).default;
const AmenityBooking = (await import('../src/features/amenityBooking/amenityBooking.model.js')).default;
const amenityService = (await import('../src/features/amenity/amenity.services.js')).default;
const walletService = (await import('../src/features/wallet/wallet.service.js')).default;
const { amenityBookingEventEmitter } = await import('../src/features/amenityBooking/amenityBooking.events.js');

const v2 = (await import('../src/features/amenityManagement/reservations/amenityReservation.service.js')).default;
const reservationRepo = (await import('../src/features/amenityManagement/reservations/amenityReservation.repository.js')).default;
const facilityRepo = (await import('../src/features/amenityManagement/facilities/amenityFacility.repository.js')).default;
const pricingService = (await import('../src/features/amenityManagement/domain/pricing/pricing.service.js')).default;
const quotaService = (await import('../src/features/amenityManagement/quotas/amenityQuotaAllocation.service.js')).default;
const settingsService = (await import('../src/features/amenityManagement/settings/amenitySettings.service.js')).default;

const ORG = '507f1f77bcf86cd799439011';
const USER = '507f1f77bcf86cd7994390a1';
const OTHER = '507f1f77bcf86cd7994390b2';
const HOUR = 3600 * 1000;

function stub(target, impls) {
  const orig = {};
  for (const [k, v] of Object.entries(impls)) {
    orig[k] = target[k];
    target[k] = v;
  }
  return () => Object.assign(target, orig);
}

/** "YYYY-MM-DD" and "HH:mm" (Asia/Kolkata) that are `hours` from now. */
async function istSlot(hoursFromNow, lengthHours = 1) {
  const moment = (await import('moment-timezone')).default;
  const start = moment().tz('Asia/Kolkata').add(hoursFromNow, 'hours');
  const end = start.clone().add(lengthHours, 'hours');
  return { date: start.format('YYYY-MM-DD'), startTime: start.format('HH:mm'), endTime: end.format('HH:mm') };
}

// ===================================================================== legacy booking: cancellation
async function runCancel({ booking, amenity, isAdmin = false, userId = USER }) {
  const credits = [];
  let saved = null;
  const restore = [
    stub(bookingRepo, {
      findById: async () => booking,
      updateStatus: async (id, orgId, status, data) => ((saved = data), { ...booking, ...data }),
    }),
    stub(amenityService, { getAmenityById: async () => amenity }),
    stub(walletService, { creditWallet: async (args) => credits.push(args) }),
    stub(amenityBookingEventEmitter, { emit: () => {} }),
  ];
  try {
    const result = await bookingService.cancelBooking('b1', userId, ORG, 'plans changed', isAdmin);
    return { result, credits, saved };
  } finally {
    restore.forEach((r) => r());
  }
}

const paidBooking = (slot, extra = {}) => ({
  _id: '507f1f77bcf86cd799439abc',
  orgId: ORG,
  userId: USER,
  amenityId: 'a1',
  status: 'confirmed',
  paymentStatus: 'success',
  paymentMethod: 'WALLET',
  bookingDate: slot.date,
  startTime: slot.startTime,
  endTime: slot.endTime,
  pricingDetails: { totalAmount: 1100, securityDeposit: 100 },
  ...extra,
});

test('legacy cancel: a resident cannot cancel after the slot started (no full refund for no-shows)', async () => {
  const slot = await istSlot(-1, 2); // started an hour ago
  await assert.rejects(
    runCancel({ booking: paidBooking(slot), amenity: { bookingRules: {} } }),
    (e) => e.statusCode === 400 && /already started/.test(e.message)
  );
  // an admin may still cancel it
  const { credits } = await runCancel({ booking: paidBooking(slot), amenity: { bookingRules: {} }, isAdmin: true, userId: OTHER });
  assert.equal(credits.length, 1);
});

test('legacy cancel: the security deposit is refunded in full, the percentage applies to the rest', async () => {
  const slot = await istSlot(3); // inside the 24h window => 50% rule
  const amenity = {
    bookingRules: {
      isCancellationEnabled: true,
      cancellationRefundRules: [
        { cancelBeforeHours: 24, refundPercentage: 100 },
        { cancelBeforeHours: 0, refundPercentage: 50 },
      ],
    },
  };
  const { credits, saved } = await runCancel({ booking: paidBooking(slot), amenity });
  assert.equal(saved.refundPercentage, 50);
  assert.equal(credits[0].amount, 600, '50% of 1000 + the 100 deposit');
  assert.equal(saved.paymentStatus, 'partial_refund');
});

test('legacy cancel: a full-refund window returns everything, deposit included', async () => {
  const slot = await istSlot(72);
  const amenity = {
    bookingRules: { isCancellationEnabled: true, cancellationRefundRules: [{ cancelBeforeHours: 24, refundPercentage: 100 }] },
  };
  const { credits, saved } = await runCancel({ booking: paidBooking(slot), amenity });
  assert.equal(credits[0].amount, 1100);
  assert.equal(saved.paymentStatus, 'refunded');
});

// ===================================================================== legacy booking: unpaid online + late payment
test('unpaid online bookings are released after the cutoff', async () => {
  let seen = null;
  const restore = stub(bookingRepo, { expireUnpaidOnline: async (cutoff, now, reason) => ((seen = { cutoff, now, reason }), 3) });
  try {
    const now = new Date('2026-03-10T10:00:00Z');
    const released = await bookingService.expireUnpaidOnlineBookings(now, 30);
    assert.equal(released, 3);
    assert.equal(seen.cutoff.toISOString(), '2026-03-10T09:30:00.000Z');
    assert.equal(seen.reason, UNPAID_EXPIRY_REASON);
  } finally {
    restore();
  }
});

async function runSettle(conflictsWith) {
  const slot = await istSlot(48);
  const saved = [];
  const booking = {
    _id: 'late1',
    orgId: ORG,
    userId: USER,
    amenityId: 'a1',
    status: 'cancelled',
    cancellationReason: UNPAID_EXPIRY_REASON,
    paymentStatus: 'failed',
    bookingDate: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    pricingDetails: { totalAmount: 500 },
    save: async function () {
      saved.push({ ...this });
    },
  };
  const credits = [];
  const restore = [
    stub(AmenityBooking, { findById: () => ({ session: async () => booking }) }),
    stub(bookingRepo, { findConflicts: async () => conflictsWith }),
    stub(walletService, { creditWallet: async (a) => credits.push(a) }),
    stub(bookingService, { generateAccessQRCode: async () => ({ qrCodeUrl: 'qr', bookingIdStr: 'BKG-1', passToken: 't', passTokenHash: 'h' }) }),
  ];
  try {
    const result = await bookingService.settleBookingPayment('late1', { paymentMethod: 'UPI', gatewayTransactionId: 'pay_1' }, null);
    return { result, credits, saved };
  } finally {
    restore.forEach((r) => r());
  }
}

test('late payment for a released booking: slot still free => booking is confirmed again', async () => {
  const { result, credits } = await runSettle([]);
  assert.equal(result.status, 'confirmed');
  assert.equal(result.paymentStatus, 'success');
  assert.equal(credits.length, 0);
});

test('late payment for a released booking whose slot was taken => money goes back to the wallet, no double booking', async () => {
  const { result, credits } = await runSettle([{ _id: 'someone-else' }]);
  assert.equal(result.status, 'cancelled');
  assert.equal(result.paymentStatus, 'refunded');
  assert.equal(credits[0].amount, 500);
});

// ===================================================================== v2: resident reschedule
const baseReservation = (over = {}) => ({
  _id: 'r1',
  orgId: ORG,
  facilityId: 'f1',
  unitId: 'u1',
  residentId: USER,
  bookingStatus: 'CONFIRMED',
  accessStatus: 'PASS_GENERATED',
  completionStatus: 'PENDING',
  headcount: 1,
  quantity: 1,
  totalAmount: 200,
  pricingSnapshot: { totalAmount: 200 },
  requestedStartDateTime: new Date(Date.now() + 72 * HOUR),
  requestedEndDateTime: new Date(Date.now() + 73 * HOUR),
  policySnapshot: { cancellation: { isAllowed: true, refundCutoffHours: 24, refundPercentage: 100 } },
  approvalHistory: [],
  ...over,
});

test('v2 reschedule rule: allowed only while a free cancellation would be, and not endlessly', () => {
  assert.equal(v2.rescheduleBlockReason(baseReservation()), null);
  assert.match(v2.rescheduleBlockReason(baseReservation({ bookingStatus: 'CANCELLED' })), /active booking/);
  assert.match(v2.rescheduleBlockReason(baseReservation({ accessStatus: 'CHECKED_IN' })), /already been used/);
  assert.match(v2.rescheduleBlockReason(baseReservation({ requestedStartDateTime: new Date(Date.now() - HOUR) })), /already started/);
  assert.match(
    v2.rescheduleBlockReason(baseReservation({ requestedStartDateTime: new Date(Date.now() + 5 * HOUR), requestedEndDateTime: new Date(Date.now() + 6 * HOUR) })),
    /at least 24 hour/
  );
  assert.match(
    v2.rescheduleBlockReason(baseReservation({ policySnapshot: { cancellation: { isAllowed: false } } })),
    /does not allow/
  );
  assert.match(
    v2.rescheduleBlockReason(baseReservation({ approvalHistory: [{ action: 'RESCHEDULED' }, { action: 'RESCHEDULED' }] })),
    /already moved/
  );
  // management is not limited by the resident rules, but never moves a started booking
  assert.equal(
    v2.rescheduleBlockReason(baseReservation({ approvalHistory: [{ action: 'RESCHEDULED' }, { action: 'RESCHEDULED' }, { action: 'RESCHEDULED' }] }), { isManagement: true }),
    null
  );
});

test('v2 cancellation preview tells the app whether the booking can be moved', () => {
  const preview = v2.cancellationPreview(baseReservation({ paymentStatus: 'PAID', paidAmount: 200 }));
  assert.deepEqual(preview.reschedule, { allowed: true, blockReason: null });
});

async function runReschedule(reservation, { quote = 200, newStart, newEnd }) {
  const calls = [];
  const restore = [
    stub(reservationRepo, { findById: async () => reservation }),
    stub(facilityRepo, { findById: async () => ({ _id: 'f1', archetype: 'EXCLUSIVE_HOURLY' }) }),
    stub(pricingService, { calculateForFacility: () => ({ totalAmount: quote }) }),
    stub(settingsService, { getSettings: async () => ({}), quotaLimitFor: () => 600 }),
    stub(quotaService, {
      refundQuota: async (a) => calls.push(['refund', a.date]),
      reserveQuota: async (a) => calls.push(['reserve', a.date]),
      promoteQuota: async (a) => calls.push(['promote', a.date]),
    }),
    stub(v2, {
      _executeRescheduleReservation: async (p) => (calls.push(['move', p]), { ...reservation, moved: true }),
    }),
  ];
  try {
    const result = await v2._executeResidentReschedule(
      { reservationId: 'r1', orgId: ORG, actorId: USER, newStartDateTime: newStart, newEndDateTime: newEnd },
      {}
    );
    return { result, calls };
  } finally {
    restore.forEach((r) => r());
  }
}

test('v2 resident reschedule: same length and same price moves the booking and its quota', async () => {
  const r = baseReservation();
  const newStart = new Date(Date.now() + 96 * HOUR);
  const newEnd = new Date(newStart.getTime() + HOUR);
  const { result, calls } = await runReschedule(r, { newStart, newEnd });
  assert.equal(result.moved, true);
  assert.deepEqual(calls.map((c) => c[0]), ['refund', 'reserve', 'promote', 'move']);
  assert.equal(calls[0][1].getTime(), r.requestedStartDateTime.getTime(), 'old window freed');
  assert.equal(calls[1][1].getTime(), newStart.getTime(), 'new window reserved');
  assert.equal(calls[3][1].reason, 'Rescheduled by resident');
});

test('v2 resident reschedule: a different length or a different price is refused', async () => {
  const r = baseReservation();
  const newStart = new Date(Date.now() + 96 * HOUR);
  await assert.rejects(
    runReschedule(r, { newStart, newEnd: new Date(newStart.getTime() + 2 * HOUR) }),
    (e) => e.statusCode === 400 && /same length/.test(e.message)
  );
  await assert.rejects(
    runReschedule(r, { quote: 350, newStart, newEnd: new Date(newStart.getTime() + HOUR) }),
    (e) => e.statusCode === 409 && /price/.test(e.message)
  );
  await assert.rejects(
    runReschedule(r, { newStart: r.requestedStartDateTime, newEnd: r.requestedEndDateTime }),
    (e) => e.statusCode === 400 && /already have/.test(e.message)
  );
});

test('v2 resident reschedule: another community\'s booking is invisible and a blocked one is refused', async () => {
  const foreign = baseReservation({ orgId: '507f1f77bcf86cd7994399ff' });
  const newStart = new Date(Date.now() + 96 * HOUR);
  const newEnd = new Date(newStart.getTime() + HOUR);
  await assert.rejects(runReschedule(foreign, { newStart, newEnd }), (e) => e.statusCode === 404);
  await assert.rejects(
    runReschedule(baseReservation({ bookingStatus: 'CANCELLED' }), { newStart, newEnd }),
    (e) => e.statusCode === 400
  );
});

test('legacy cancel: a failing wallet refund is recorded as refund_pending instead of crashing', async () => {
  const slot = await istSlot(72);
  const saved = [];
  const restore = [
    stub(bookingRepo, {
      findById: async () => paidBooking(slot),
      updateStatus: async (id, orgId, status, data) => (saved.push(data), { ...data }),
    }),
    stub(amenityService, { getAmenityById: async () => ({ bookingRules: {} }) }),
    stub(walletService, { creditWallet: async () => { throw new Error('ledger down'); } }),
    stub(amenityBookingEventEmitter, { emit: () => {} }),
  ];
  try {
    await bookingService.cancelBooking('b1', USER, ORG, 'x', false);
    assert.equal(saved[0].paymentStatus, 'refund_pending');
    assert.equal(saved[0].status, 'cancelled');
  } finally {
    restore.forEach((r) => r());
  }
});
