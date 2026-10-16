import test from 'node:test';
import assert from 'node:assert';
import { InvoiceController } from '../src/features/invoice/invoice.controller.js';
import { WorkspaceController } from '../src/features/workspace/workspace.controller.js';
import visitorLogController from '../src/features/visitorLog/visitorLog.controller.js';

test('Phase 1 - Controller BOLA/IDOR Security Enforcement', async (t) => {
  const invoiceCtrl = new InvoiceController();
  const workspaceCtrl = new WorkspaceController();
  
  await t.test('InvoiceController - getMyDues explicitly drops req.query.communityId if not Platform Admin', async () => {
    let passedCommunityId = null;
    
    // Mock req, res, next
    const req = {
      query: { communityId: 'HACKED_ORG_B' },
      tenant: { orgId: 'LEGIT_ORG_A', isPlatform: false },
      user: { id: 'user1' }
    };
    
    // We expect it to drop HACKED_ORG_B and use LEGIT_ORG_A instead
    // Since we don't want to actually run the DB logic, we just hijack the service temporarily
    const originalGetUserDues = (await import('../src/features/invoice/invoice.services.js')).default.getUserDuesOverview;
    (await import('../src/features/invoice/invoice.services.js')).default.getUserDuesOverview = async (user, communityId) => {
      passedCommunityId = communityId;
      return {};
    };
    
    const res = { success: () => {} };
    const next = () => {};
    
    try {
      await invoiceCtrl.getMyDues(req, res, next);
      assert.strictEqual(passedCommunityId, 'LEGIT_ORG_A', 'Must ignore req.query.communityId and use req.tenant.orgId');
    } finally {
      (await import('../src/features/invoice/invoice.services.js')).default.getUserDuesOverview = originalGetUserDues;
    }
  });

  await t.test('WorkspaceController - create uses req.tenant.orgId for normal users', async () => {
    let passedOrgId = null;
    const req = {
      body: { organizationId: 'HACKED_ORG_B' },
      tenant: { orgId: 'LEGIT_ORG_A', isPlatform: false },
      user: { id: 'user1' }
    };
    
    const originalCreate = (await import('../src/features/workspace/workspace.service.js')).default.createWorkspace;
    (await import('../src/features/workspace/workspace.service.js')).default.createWorkspace = async (payload, actorId) => {
      passedOrgId = payload.organizationId;
      return {};
    };
    
    const res = { success: () => {} };
    const next = () => {};
    
    try {
      await workspaceCtrl.create(req, res, next);
      assert.strictEqual(passedOrgId, 'LEGIT_ORG_A', 'Must ignore req.body.organizationId and use req.tenant.orgId');
    } finally {
      (await import('../src/features/workspace/workspace.service.js')).default.createWorkspace = originalCreate;
    }
  });

  await t.test('WorkspaceController - create respects req.body.organizationId for Platform Admins', async () => {
    let passedOrgId = null;
    const req = {
      body: { organizationId: 'TARGET_ORG_B' },
      tenant: { orgId: 'LEGIT_ORG_A', isPlatform: true }, // PLATFORM ADMIN!
      user: { id: 'user1', isPlatform: true }
    };
    
    const originalCreate = (await import('../src/features/workspace/workspace.service.js')).default.createWorkspace;
    (await import('../src/features/workspace/workspace.service.js')).default.createWorkspace = async (payload, actorId) => {
      passedOrgId = payload.organizationId;
      return {};
    };
    
    const res = { success: () => {} };
    const next = () => {};
    
    try {
      await workspaceCtrl.create(req, res, next);
      assert.strictEqual(passedOrgId, 'TARGET_ORG_B', 'Must use req.body.organizationId for Platform Admins');
    } finally {
      (await import('../src/features/workspace/workspace.service.js')).default.createWorkspace = originalCreate;
    }
  });
  
  await t.test('VisitorLogController - getInside rejects/overrides req.params.orgId', async () => {
    let passedOrgId = null;
    let passedError = null;
    const req = {
      params: { orgId: 'HACKED_ORG_B' },
      tenant: { orgId: 'LEGIT_ORG_A', isPlatform: false },
      user: { id: 'user1' }
    };
    
    const originalGetInside = (await import('../src/features/visitorLog/visitorLog.service.js')).default.getActiveLogsInside;
    (await import('../src/features/visitorLog/visitorLog.service.js')).default.getActiveLogsInside = async (orgId, user) => {
      passedOrgId = orgId;
      return {};
    };
    
    const res = { success: () => {} };
    const next = (err) => { passedError = err; };
    
    try {
      await visitorLogController.getInside(req, res, next);
      assert.ok(passedError, 'Must reject mismatched req.params.orgId with an error');
      assert.strictEqual(passedError.statusCode, 403, 'Must return 403 Forbidden for mismatched orgId');
      assert.strictEqual(passedOrgId, null, 'Must not call service with tampered orgId');
    } finally {
      (await import('../src/features/visitorLog/visitorLog.service.js')).default.getActiveLogsInside = originalGetInside;
    }
  });

  await t.test('BlacklistController - create (CREATE) explicitly drops req.body.orgId', async () => {
    const blacklistController = (await import('../src/features/blacklist/blacklist.controller.js')).default;
    let passedOrgId = null;
    const req = {
      body: { orgId: 'HACKED_ORG_B', name: 'Hacker', reason: 'Spam' },
      tenant: { orgId: 'LEGIT_ORG_A', isPlatform: false },
      user: { id: 'user1', role: 'manager' }
    };
    
    const originalCreate = (await import('../src/features/blacklist/blacklist.service.js')).default.createBlacklistEntry;
    (await import('../src/features/blacklist/blacklist.service.js')).default.createBlacklistEntry = async (payload) => {
      passedOrgId = payload.orgId;
      return {};
    };
    
    const res = { success: () => {} };
    const next = (err) => { if (err) throw err; };
    
    try {
      await blacklistController.create(req, res, next);
      assert.strictEqual(passedOrgId, 'LEGIT_ORG_A', 'Must ignore req.body.orgId and use req.tenant.orgId');
    } finally {
      (await import('../src/features/blacklist/blacklist.service.js')).default.createBlacklistEntry = originalCreate;
    }
  });

  await t.test('ReconciliationController - runReconciliation (CREATE) drops req.body.orgId', async () => {
    const reconController = (await import('../src/features/ledger/reconciliation/reconciliation.controller.js')).default;
    let passedOrgId = null;
    const req = {
      body: { orgId: 'HACKED_ORG_B', mode: 'manual' },
      tenant: { orgId: 'LEGIT_ORG_A', isPlatform: false },
      user: { id: 'user1' }
    };
    
    const originalProcess = (await import('../src/features/ledger/reconciliation/historicalReconciliation.service.js')).default.reconcile;
    (await import('../src/features/ledger/reconciliation/historicalReconciliation.service.js')).default.reconcile = async (payload) => {
      passedOrgId = payload.orgId;
      return {};
    };
    
    const res = { status: () => ({ json: () => {} }) };
    const next = () => {};
    
    try {
      await reconController.runReconciliation(req, res, next);
      assert.strictEqual(passedOrgId, 'LEGIT_ORG_A', 'Must ignore req.body.orgId and use req.tenant.orgId');
    } finally {
      (await import('../src/features/ledger/reconciliation/historicalReconciliation.service.js')).default.reconcile = originalProcess;
    }
  });

  await t.test('WorkspaceController - toggleModule (UPDATE) enforces req.tenant.orgId', async () => {
    let passedOrgId = null;
    const req = {
      params: { workspaceId: 'ws123', moduleId: 'mod123' },
      body: { enabled: false },
      tenant: { orgId: 'LEGIT_ORG_A', isPlatform: false },
      user: { id: 'user1' }
    };
    
    const originalToggle = (await import('../src/features/workspace/workspace.service.js')).default.toggleModule;
    (await import('../src/features/workspace/workspace.service.js')).default.toggleModule = async (wId, oId, isP, mId, en, aId) => {
      passedOrgId = oId;
      return {};
    };
    
    const res = { success: () => {} };
    const next = () => {};
    try {
      await workspaceCtrl.toggleModule(req, res, next);
      assert.strictEqual(passedOrgId, 'LEGIT_ORG_A', 'Must strictly use req.tenant.orgId for module updates');
    } finally {
      (await import('../src/features/workspace/workspace.service.js')).default.toggleModule = originalToggle;
    }
  });

  await t.test('WorkspaceController - deleteModule (DELETE) enforces req.tenant.orgId', async () => {
    let passedOrgId = null;
    const req = {
      params: { workspaceId: 'ws123', moduleId: 'mod123' },
      tenant: { orgId: 'LEGIT_ORG_A', isPlatform: false },
      user: { id: 'user1' }
    };
    
    const originalDelete = (await import('../src/features/workspace/workspace.service.js')).default.deleteModule;
    (await import('../src/features/workspace/workspace.service.js')).default.deleteModule = async (wId, oId, isP, mId, aId) => {
      passedOrgId = oId;
      return {};
    };
    
    const res = { success: () => {} };
    const next = () => {};
    try {
      await workspaceCtrl.deleteModule(req, res, next);
      assert.strictEqual(passedOrgId, 'LEGIT_ORG_A', 'Must strictly use req.tenant.orgId for module deletes');
    } finally {
      (await import('../src/features/workspace/workspace.service.js')).default.deleteModule = originalDelete;
    }
  });
});
