import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AI_OPERATION_REGISTRY,
  getAuthorizedOperations,
  getEffectivePermissions,
  isOperationAuthorized,
} from '../src/features/aiAssistant/aiAssistant.registry.js';
import { runAssistantEvaluation } from '../src/features/aiAssistant/evaluation/aiAssistant.evaluator.js';
import { filterAuthorizedToolDeclarations } from '../src/features/aiAssistant/aiAssistant.service.js';

const tenant = { orgId: 'registry-community' };
const resident = {
  id: 'registry-resident',
  role: 'Resident',
  orgId: tenant.orgId,
  permissions: ['amenities:view', 'billing:my_invoices', 'visitor:resident'],
};
const admin = { id: 'registry-admin', role: 'Community Admin', orgId: tenant.orgId, permissions: ['*'] };

test('registry normalizes trusted legacy permissions without exposing administrative amenity actions', () => {
  assert.ok(getEffectivePermissions(resident, tenant).includes('amenities:my_booking'));
  assert.equal(isOperationAuthorized('prepare_amenity_booking', resident, tenant), true);
  assert.equal(isOperationAuthorized('prepare_amenity_creation', resident, tenant), false);
});

test('Gemini declarations include only operations authorized for the active tenant', () => {
  const tools = filterAuthorizedToolDeclarations(resident, tenant).map((tool) => tool.name);
  assert.ok(tools.includes('prepare_amenity_booking'));
  assert.ok(!tools.includes('prepare_amenity_creation'));
  assert.ok(!tools.includes('submit_ai_feedback'));
  assert.ok(getAuthorizedOperations(admin, tenant).some((operation) => operation.toolName === 'prepare_amenity_creation'));
});

test('curated evaluation covers every enabled operation and does not enable feedback collection', () => {
  assert.equal(AI_OPERATION_REGISTRY.submit_ai_feedback.enabled, false);
  const result = runAssistantEvaluation();
  assert.equal(result.passed, true, JSON.stringify(result.failures));
  assert.equal(result.coveredOperations, result.enabledOperations);
});
