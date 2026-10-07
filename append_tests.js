const fs = require('fs');
const content = 
  await t.test('BlacklistController - addToBlacklist explicitly drops req.body.orgId', async () => {
    const blacklistController = (await import('../src/features/blacklist/blacklist.controller.js')).default;
    let passedOrgId = null;
    const req = {
      body: { orgId: 'HACKED_ORG_B', visitorId: 'vis123', reason: 'Spam' },
      tenant: { orgId: 'LEGIT_ORG_A', isPlatform: false },
      user: { id: 'user1' }
    };
    
    const originalAddToBlacklist = (await import('../src/features/blacklist/blacklist.service.js')).default.addToBlacklist;
    (await import('../src/features/blacklist/blacklist.service.js')).default.addToBlacklist = async (visitorId, orgId, reason, adminId) => {
      passedOrgId = orgId;
      return {};
    };
    
    const res = { success: () => {} };
    const next = () => {};
    
    try {
      await blacklistController.addToBlacklist(req, res, next);
      import('node:assert').then(assert => assert.strictEqual(passedOrgId, 'LEGIT_ORG_A', 'Must ignore req.body.orgId and use req.tenant.orgId'));
    } finally {
      (await import('../src/features/blacklist/blacklist.service.js')).default.addToBlacklist = originalAddToBlacklist;
    }
  });

  await t.test('ReconciliationController - processReconciliation drops req.body.orgId', async () => {
    const reconController = (await import('../src/features/ledger/reconciliation/reconciliation.controller.js')).default;
    let passedOrgId = null;
    const req = {
      body: { orgId: 'HACKED_ORG_B', ledgerId: 'led123' },
      tenant: { orgId: 'LEGIT_ORG_A', isPlatform: false },
      user: { id: 'user1' }
    };
    
    const originalProcess = (await import('../src/features/ledger/reconciliation/reconciliation.service.js')).default.processReconciliation;
    (await import('../src/features/ledger/reconciliation/reconciliation.service.js')).default.processReconciliation = async (orgId, actorId, payload) => {
      passedOrgId = orgId;
      return {};
    };
    
    const res = { success: () => {} };
    const next = () => {};
    
    try {
      await reconController.processReconciliation(req, res, next);
      import('node:assert').then(assert => assert.strictEqual(passedOrgId, 'LEGIT_ORG_A', 'Must ignore req.body.orgId and use req.tenant.orgId'));
    } finally {
      (await import('../src/features/ledger/reconciliation/reconciliation.service.js')).default.processReconciliation = originalProcess;
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
    const workspaceCtrl = new (await import('../src/features/workspace/workspace.controller.js')).WorkspaceController();
    try {
      await workspaceCtrl.toggleModule(req, res, next);
      import('node:assert').then(assert => assert.strictEqual(passedOrgId, 'LEGIT_ORG_A', 'Must strictly use req.tenant.orgId for module updates'));
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
    const workspaceCtrl = new (await import('../src/features/workspace/workspace.controller.js')).WorkspaceController();
    try {
      await workspaceCtrl.deleteModule(req, res, next);
      import('node:assert').then(assert => assert.strictEqual(passedOrgId, 'LEGIT_ORG_A', 'Must strictly use req.tenant.orgId for module deletes'));
    } finally {
      (await import('../src/features/workspace/workspace.service.js')).default.deleteModule = originalDelete;
    }
  });
});
;
let file = fs.readFileSync('backend/tests/phase1-bola.test.mjs', 'utf8');
file = file.replace('});', content);
fs.writeFileSync('backend/tests/phase1-bola.test.mjs', file);
console.log('Appended missing tests');
