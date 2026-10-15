import test from 'node:test';
import assert from 'node:assert/strict';
import workspaceService from '../src/features/workspace/workspace.service.js';
import workspaceRepository from '../src/features/workspace/workspace.repository.js';
import Organization from '../src/features/organization/organization.model.js';

const ORG_A = '507f1f77bcf86cd799439011';
const ORG_B = '507f1f77bcf86cd799439022';
const WS_ID = '607f1f77bcf86cd799439033';

const makeWorkspace = (organizationId) => ({
  _id: WS_ID,
  organizationId,
  workspaceName: 'Green Valley',
  name: 'Green Valley',
  organizationName: 'Green Valley',
  modules: [],
  settings: { legacy: true },
  _doc: {},
  async save() {},
});

const stub = (obj, name, impl) => {
  const original = obj[name];
  obj[name] = impl;
  return () => {
    obj[name] = original;
  };
};

// getWorkspaceById enriches the result with the organization's login policy; keep it off the database.
const stubOrganizationLookup = () =>
  stub(Organization, 'findById', () => {
    const chain = {
      select: () => chain,
      lean: () => chain,
      session: async () => ({ authenticationMethod: 'EXISTING_SYSTEM', countryCode: 'IN', name: 'Green Valley' }),
    };
    return chain;
  });

test('a community admin cannot read another community\'s workspace', async () => {
  const restore = stub(workspaceRepository, 'findById', async () => makeWorkspace(ORG_B));
  try {
    await assert.rejects(() => workspaceService.getWorkspaceById(WS_ID, ORG_A, false), /Forbidden/);
  } finally {
    restore();
  }
});

test('a non-platform caller with no community context is denied, not allowed through', async () => {
  const restore = stub(workspaceRepository, 'findById', async () => makeWorkspace(ORG_B));
  try {
    await assert.rejects(() => workspaceService.getWorkspaceById(WS_ID, null, false), /Forbidden/);
  } finally {
    restore();
  }
});

test('listing workspaces without a community context returns nothing for non-platform callers', async () => {
  let queried = false;
  const restore = stub(workspaceRepository, 'find', async () => {
    queried = true;
    return [makeWorkspace(ORG_A), makeWorkspace(ORG_B)];
  });
  try {
    assert.deepEqual(await workspaceService.getWorkspaces(null, false), []);
    assert.equal(queried, false);
  } finally {
    restore();
  }
});

test('listing workspaces for a community is scoped to that community', async () => {
  let seenQuery = null;
  const restore = stub(workspaceRepository, 'find', async (query) => {
    seenQuery = query;
    return [];
  });
  try {
    await workspaceService.getWorkspaces(ORG_A, false);
    assert.deepEqual(seenQuery, { organizationId: ORG_A });
    await workspaceService.getWorkspaces(ORG_A, true);
    assert.deepEqual(seenQuery, {});
  } finally {
    restore();
  }
});

test('update ignores fields a manager must not set (organization, creator, modules, logs)', async () => {
  let written = null;
  const restores = [
    stubOrganizationLookup(),
    stub(workspaceRepository, 'findById', async () => makeWorkspace(ORG_A)),
    stub(workspaceRepository, 'findOne', async () => null),
    stub(workspaceRepository, 'update', async (id, payload) => {
      written = payload;
      return makeWorkspace(ORG_A);
    }),
    stub(workspaceRepository, 'addActivityLog', async () => {}),
  ];
  try {
    await workspaceService.updateWorkspace(
      WS_ID,
      {
        description: 'New description',
        contactEmail: 'office@example.com',
        organizationId: ORG_B,
        createdBy: 'attacker',
        modules: [{ moduleKey: 'x' }],
        activityLogs: [],
        isDeleted: true,
      },
      ORG_A,
      false,
      'actor-1'
    );
    assert.deepEqual(Object.keys(written).sort(), ['contactEmail', 'description', 'updatedBy']);
    assert.equal(written.description, 'New description');
  } finally {
    restores.forEach((r) => r());
  }
});

test('an empty workspace name is never written', async () => {
  let written = null;
  const restores = [
    stubOrganizationLookup(),
    stub(workspaceRepository, 'findById', async () => makeWorkspace(ORG_A)),
    stub(workspaceRepository, 'findOne', async () => null),
    stub(workspaceRepository, 'update', async (id, payload) => {
      written = payload;
      return makeWorkspace(ORG_A);
    }),
    stub(workspaceRepository, 'addActivityLog', async () => {}),
  ];
  try {
    await workspaceService.updateWorkspace(WS_ID, { workspaceName: '   ', description: 'x' }, ORG_A, false, 'actor-1');
    assert.equal('workspaceName' in written, false);
  } finally {
    restores.forEach((r) => r());
  }
});

test('update through the "current" alias writes using the real document id', async () => {
  let writtenId = null;
  const restores = [
    stubOrganizationLookup(),
    stub(workspaceRepository, 'findOne', async () => makeWorkspace(ORG_A)),
    stub(workspaceRepository, 'update', async (id) => {
      writtenId = id;
      return makeWorkspace(ORG_A);
    }),
    stub(workspaceRepository, 'addActivityLog', async () => {}),
  ];
  try {
    await workspaceService.updateWorkspace('current', { description: 'x' }, ORG_A, false, 'actor-1');
    assert.equal(writtenId, WS_ID);
  } finally {
    restores.forEach((r) => r());
  }
});

test('settings update writes general details like the web admin and merges extras without replacing them', async () => {
  const updates = [];
  let countryWrite = null;
  const restores = [
    stubOrganizationLookup(),
    stub(Organization, 'updateOne', async (filter, change) => {
      countryWrite = { filter, change };
    }),
    stub(workspaceRepository, 'findById', async () => makeWorkspace(ORG_A)),
    stub(workspaceRepository, 'findOne', async () => null),
    stub(workspaceRepository, 'update', async (id, payload) => {
      updates.push(payload);
      return makeWorkspace(ORG_A);
    }),
    stub(workspaceRepository, 'addActivityLog', async () => {}),
  ];
  try {
    const view = await workspaceService.updateSettings(
      WS_ID,
      ORG_A,
      false,
      { workspaceName: 'Green Valley Estates', countryCode: 'ae', theme: 'dark', $bad: 1, 'a.b': 2 },
      'actor-1'
    );
    const general = updates.find((u) => 'workspaceName' in u);
    assert.equal(general.workspaceName, 'Green Valley Estates');
    const extras = updates.find((u) => u.$set);
    assert.deepEqual(extras.$set, { 'settings.theme': 'dark' });
    assert.equal(countryWrite.change.$set.countryCode, 'AE');
    assert.equal(typeof view.workspaceName, 'string');
    assert.equal(view.countryCode, 'IN');
  } finally {
    restores.forEach((r) => r());
  }
});

test('settings update rejects an invalid country code', async () => {
  const restores = [
    stubOrganizationLookup(),
    stub(workspaceRepository, 'findById', async () => makeWorkspace(ORG_A)),
  ];
  try {
    await assert.rejects(() => workspaceService.updateSettings(WS_ID, ORG_A, false, { countryCode: 'India' }, 'a'), /two-letter/);
  } finally {
    restores.forEach((r) => r());
  }
});
