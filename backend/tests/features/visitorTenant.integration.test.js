import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { connectDb, closeDb, clearDb } from './db.setup.js';

import VisitorLogService from '../../src/features/visitorLog/visitorLog.service.js';
import VisitorLogRepository from '../../src/features/visitorLog/visitorLog.repository.js';
import VisitorLog from '../../src/features/visitorLog/visitorLog.model.js';
import VisitorPassService from '../../src/features/visitorPass/visitorPass.service.js';
import VisitorPassRepository from '../../src/features/visitorPass/visitorPass.repository.js';
import VisitorPass from '../../src/features/visitorPass/visitorPass.model.js';
import Organization from '../../src/features/organization/organization.model.js';
import User from '../../src/features/user/user.model.js';
import { HttpError } from '../../src/utils/httpError.utils.js';

jest.setTimeout(60000);

beforeAll(async () => {
  await connectDb();
});

afterAll(async () => {
  await closeDb();
});

describe('Visitor Management Tenant Isolation (Phase 3F)', () => {
  let orgA, orgB;
  let adminA, adminB, gateA;
  let passA, logA;

  beforeEach(async () => {
    await clearDb();

    orgA = await Organization.create({ name: 'Org A', code: 'ORGA', email: 'a@org.com', organizationType: 'Residential' });
    orgB = await Organization.create({ name: 'Org B', code: 'ORGB', email: 'b@org.com', organizationType: 'Residential' });

    adminA = { _id: new mongoose.Types.ObjectId(), role: 'Admin' };
    adminB = { _id: new mongoose.Types.ObjectId(), role: 'Admin' };
    gateA = { _id: new mongoose.Types.ObjectId(), role: 'Guard' };

    passA = await VisitorPass.create({
      orgId: orgA._id, createdById: adminA._id,
      visitorName: 'Visitor A',
      visitorPhone: '1234567890',
      passType: 'GUEST',
      status: 'ACTIVE',
      usageLimit: { currentUses: 0, maxUses: 1 },
      validity: { startDate: new Date(Date.now() - 10000), endDate: new Date(Date.now() + 86400000) }
    });

    logA = await VisitorLog.create({
      orgId: orgA._id, createdById: adminA._id,
      passId: passA._id,
      visitorName: 'Visitor A',
      visitorPhone: '1234567890',
      passType: 'GUEST',
      logStatus: 'INSIDE', entryType: 'WALK_IN', guardId: gateA._id,
      checkInTime: new Date()
    });
  });

  describe('F-01: Visitor Log Checkout', () => {
    it('1. Organization A can check out its own visitor log', async () => {
      const context = { orgId: orgA._id, createdById: adminA._id, gateName: 'Gate 1' };
      const actor = { _id: gateA._id, role: 'Guard' };

      const checkedOutLog = await VisitorLogService.checkout(logA._id, actor, context);
      expect(checkedOutLog.logStatus).toBe('COMPLETED');
      expect(checkedOutLog.checkOutTime).toBeDefined();

      const dbLog = await VisitorLog.findById(logA._id);
      expect(dbLog.logStatus).toBe('COMPLETED');
    });

    it('2. Organization B cannot check out Organization A\\\'s visitor log', async () => {
      const context = { orgId: orgB._id, gateName: 'Gate 2' };
      const actor = { _id: adminB._id, role: 'Admin' };

      await expect(
        VisitorLogService.checkout(logA._id, actor, context)
      ).rejects.toThrow(HttpError);

      const dbLog = await VisitorLog.findById(logA._id);
      expect(dbLog.logStatus).toBe('INSIDE'); // Remains unchanged
    });

    it('3. Missing tenant context on checkout is rejected', async () => {
      const context = { gateName: 'Gate 1' };
      const actor = { _id: gateA._id, role: 'Guard' };

      await expect(
        VisitorLogService.checkout(logA._id, actor, context)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('F-02: Visitor Pass Mutations', () => {
    it('4. Organization A can perform an authorized status update on its own pass', async () => {
      const actor = { _id: adminA._id, role: 'Admin' };
      const updatedPass = await VisitorPassService.updatePassStatus(
        passA._id,
        'REVOKED',
        orgA._id,
        null,
        { actorId: actor._id, reason: 'Testing' }
      );

      expect(updatedPass.status).toBe('REVOKED');
      const dbPass = await VisitorPass.findById(passA._id);
      expect(dbPass.status).toBe('REVOKED');
    });

    it('5. Organization B cannot update Organization A\\\'s pass', async () => {
      const actor = { _id: adminB._id, role: 'Admin' };
      
      await expect(
        VisitorPassService.updatePassStatus(
          passA._id,
          'REVOKED',
          orgB._id,
          null,
          { actorId: actor._id, reason: 'Malicious' }
        )
      ).rejects.toThrow(/not found/i);

      const dbPass = await VisitorPass.findById(passA._id);
      expect(dbPass.status).toBe('ACTIVE'); // Remains unchanged
    });

    it('6. Organization B cannot consume or admit Organization A\\\'s pass', async () => {
      const actor = { _id: adminB._id, role: 'Admin' };
      
      await expect(
        VisitorPassService.usePass(
          passA._id,
          orgB._id,
          null
        )
      ).rejects.toThrow(HttpError);

      const dbPass = await VisitorPass.findById(passA._id);
      expect(dbPass.usageLimit.currentUses).toBe(0); // Uses not consumed
    });
  });
});
