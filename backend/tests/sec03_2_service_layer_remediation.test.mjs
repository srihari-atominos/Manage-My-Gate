import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');

test('SEC-03.2 Service Layer Architecture & Transaction Safety Suite', async (t) => {
  let replSet;
  let replUri;

  t.before(async () => {
    // Start in-memory replica set for true MongoDB multi-document transactions
    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    replUri = replSet.getUri();
    await mongoose.connect(replUri);
  });

  t.after(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (replSet) {
      await replSet.stop();
    }
  });

  // =========================================================================
  // Scope 1: Financial Reconciliation Decoupling & Static Architecture
  // =========================================================================
  await t.test('1.1 Zero Foreign Model Imports in Financial Reconciliation Services', () => {
    const reconciliationDir = path.join(backendRoot, 'src/features/ledger/reconciliation');
    const files = [
      'historicalInventory.service.js',
      'historicalMatcher.service.js',
      'historicalReconciliation.service.js',
      'reconciliationReport.service.js',
    ];

    const foreignModelRegex = /from\s+['"][^'"]*(organization|invoice|amenityBooking|wallet|payment)\.model\.js['"]/i;

    for (const file of files) {
      const filePath = path.join(reconciliationDir, file);
      assert.ok(fs.existsSync(filePath), `File exists: ${file}`);
      const content = fs.readFileSync(filePath, 'utf8');
      const match = content.match(foreignModelRegex);
      assert.strictEqual(
        match,
        null,
        `File ${file} must NOT import foreign models directly: found ${match?.[0]}`
      );
    }
  });

  await t.test('1.2 Financial Reconciliation Requires Valid Tenant Context', async () => {
    const { default: historicalReconciliationService } = await import(
      '../src/features/ledger/reconciliation/historicalReconciliation.service.js'
    );

    // Missing orgId must throw 400
    await assert.rejects(
      async () => {
        await historicalReconciliationService.reconcile({ orgId: null });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /Organization context is required/i);
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await historicalReconciliationService.getExceptions({ orgId: null });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /Organization context is required/i);
        return true;
      }
    );
  });

  // =========================================================================
  // Scope 2: Amenity Dashboard Repository Boundaries & Fail-Closed Scoping
  // =========================================================================
  await t.test('2.1 Zero Direct Model Imports in Amenity Dashboard Service', () => {
    const dashboardFile = path.join(backendRoot, 'src/features/amenityDashboard/amenityDashboard.service.js');
    assert.ok(fs.existsSync(dashboardFile), 'amenityDashboard.service.js must exist');
    const content = fs.readFileSync(dashboardFile, 'utf8');

    const modelImportRegex = /from\s+['"][^'"]*\.model\.js['"]/i;
    assert.strictEqual(
      content.match(modelImportRegex),
      null,
      'amenityDashboard.service.js must NOT import any database models directly'
    );

    assert.ok(
      !content.includes('mongoose.models.OrgMembership'),
      'Must not dynamically import OrgMembership model'
    );
    assert.ok(
      !content.includes('mongoose.models.User'),
      'Must not dynamically import User model'
    );
  });

  await t.test('2.2 Amenity Dashboard Service Methods Strictly Enforce orgId Context', async () => {
    const { default: amenityDashboardService } = await import(
      '../src/features/amenityDashboard/amenityDashboard.service.js'
    );

    const methods = [
      () => amenityDashboardService.getKpis(null),
      () => amenityDashboardService.getRevenue(null),
      () => amenityDashboardService.getOccupancy(null),
      () => amenityDashboardService.getTrends(null),
      () => amenityDashboardService.getRecentActivity(null),
      () => amenityDashboardService.getLedger(null),
      () => amenityDashboardService.getCalendarEvents(null, '2026-10-01', '2026-10-31'),
      () => amenityDashboardService.getCalendarIndicators(null, 2026, 10),
    ];

    for (const fn of methods) {
      await assert.rejects(
        fn,
        (err) => {
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /Organization context is required/i);
          return true;
        },
        'Method must fail closed with 400 when orgId is omitted'
      );
    }
  });

  await t.test('2.3 Domain Repositories & Services Correctly Handle Dashboard Queries', async () => {
    const { default: amenityFacilityService } = await import(
      '../src/features/amenityManagement/facilities/amenityFacility.service.js'
    );
    const { default: amenityMaintenanceBlockService } = await import(
      '../src/features/amenityManagement/maintenance/amenityMaintenanceBlock.service.js'
    );
    const { default: amenityReservationService } = await import(
      '../src/features/amenityManagement/reservations/amenityReservation.service.js'
    );

    const testOrgId = new mongoose.Types.ObjectId();

    // 1. Facility Stats
    const stats = await amenityFacilityService.getFacilityStats(testOrgId);
    assert.deepStrictEqual(stats, { total: 0, active: 0 });

    // 2. Active Maintenance IDs
    const maintIds = await amenityMaintenanceBlockService.getActiveMaintenanceFacilityIds(testOrgId, new Date());
    assert.ok(Array.isArray(maintIds));
    assert.strictEqual(maintIds.length, 0);

    // 3. Reservation KPIs
    const kpis = await amenityReservationService.getDashboardKpis(testOrgId, {
      todayStart: new Date(),
      todayEnd: new Date(),
      monthStart: new Date(),
      now: new Date(),
    });
    assert.strictEqual(kpis.todayBookings, 0);
    assert.strictEqual(kpis.monthlyRevenue, 0);
    assert.deepStrictEqual(kpis.recent, []);

    // 4. Reservation Ledger
    const ledger = await amenityReservationService.getReservationLedger(testOrgId, {
      match: { orgId: testOrgId },
      page: 1,
      limit: 10,
      todayStart: new Date(),
    });
    assert.strictEqual(ledger.total, 0);
    assert.strictEqual(ledger.paid, 0);
    assert.deepStrictEqual(ledger.rows, []);
  });

  // =========================================================================
  // Scope 3: True MongoDB Transaction Atomicity & Rollback Verification
  // =========================================================================
  await t.test('3.1 Multi-Document Atomic Rollback on Mid-Flight Failure', async () => {
    // Define test schema to test genuine transactional atomicity
    const testSchema = new mongoose.Schema({
      orgId: mongoose.Schema.Types.ObjectId,
      val: String,
    });
    const TestModel = mongoose.model('Sec032TxTest', testSchema);

    const orgIdA = new mongoose.Types.ObjectId();
    const session = await mongoose.startSession();
    session.startTransaction();

    let threw = false;
    try {
      // Step 1: Write first document
      await TestModel.create([{ orgId: orgIdA, val: 'DOC_1' }], { session });

      // Verify it is visible inside the session
      const inSession = await TestModel.find({ orgId: orgIdA }).session(session);
      assert.strictEqual(inSession.length, 1);

      // Verify it is NOT yet visible outside the session (Isolation)
      const outsideSession = await TestModel.find({ orgId: orgIdA });
      assert.strictEqual(outsideSession.length, 0, 'Uncommitted write must not be visible outside session');

      // Step 2: Simulate unexpected failure / exception
      throw new Error('SIMULATED_TRANSACTION_FAILURE');
    } catch (err) {
      threw = true;
      await session.abortTransaction();
    } finally {
      await session.endSession();
    }

    assert.ok(threw, 'Should have encountered simulated failure');

    // Step 3: Verify complete rollback — zero documents persisted!
    const afterAbort = await TestModel.find({ orgId: orgIdA });
    assert.strictEqual(afterAbort.length, 0, 'All writes must be completely rolled back on abort');
  });

  await t.test('3.2 Post-Commit Event Emission Protection: Events Suppressed on Rollback', async () => {
    const { default: visitorPassService } = await import(
      '../src/features/visitorPass/visitorPass.service.js'
    );
    const { default: visitorPassEvents } = await import(
      '../src/features/visitorPass/visitorPass.events.js'
    );

    const orgId = new mongoose.Types.ObjectId();
    let eventReceived = false;

    const listener = () => {
      eventReceived = true;
    };
    visitorPassEvents.on('pass_created', listener);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const passData = {
        orgId,
        passType: 'GUEST',
        createdById: new mongoose.Types.ObjectId(),
        hostId: new mongoose.Types.ObjectId(),
        type: 'Guest',
        visitorDetails: { name: 'Rollback Visitor' },
        validity: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
          timeWindowStart: '09:00',
          timeWindowEnd: '18:00',
        },
      };

      // Create pass inside active uncommitted transaction
      await visitorPassService.createPass(passData, session);

      // Verify pass_created event has NOT been emitted during active transaction!
      assert.strictEqual(
        eventReceived,
        false,
        'pass_created event must NOT emit while transaction is uncommitted'
      );

      // Simulate failure and abort
      await session.abortTransaction();
    } finally {
      await session.endSession();
      visitorPassEvents.removeListener('pass_created', listener);
    }

    // Verify even after abort, the event was never emitted
    assert.strictEqual(eventReceived, false, 'pass_created event must remain suppressed on rollback');
  });

  // =========================================================================
  // Scope 4: Production Fail-Closed Transaction Behavior
  // =========================================================================
  await t.test('4.1 Fail-Closed Transaction Policy in Production Environment', async () => {
    const prevEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';

      const { default: walletService } = await import(
        '../src/features/wallet/wallet.service.js'
      );

      // Mock startSession to simulate a failure to initialize a transaction
      const origStartSession = mongoose.startSession;
      mongoose.startSession = async () => ({
        startTransaction: () => {
          throw new Error('Standalone topology cannot start transactions');
        },
        endSession: async () => {},
        inTransaction: () => false,
      });

      try {
        await assert.rejects(
          async () => {
            await walletService.payInvoiceWithWallet(
              new mongoose.Types.ObjectId(),
              new mongoose.Types.ObjectId(),
              new mongoose.Types.ObjectId()
            );
          },
          (err) => {
            assert.strictEqual(err.statusCode, 500);
            assert.match(err.message, /Database transaction failed to initialize in production environment/i);
            return true;
          },
          'Must fail closed in production when transaction cannot start'
        );
      } finally {
        mongoose.startSession = origStartSession;
      }
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });
});
