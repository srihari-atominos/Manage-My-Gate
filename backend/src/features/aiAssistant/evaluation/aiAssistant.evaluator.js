import dataset from './nahom-ai-v1.json' with { type: 'json' };
import { AI_OPERATION_REGISTRY, isOperationAuthorized } from '../aiAssistant.registry.js';
import { analyzeConversationTurn, detectDirectIntent } from '../aiAssistant.conversation.js';

const tenant = { orgId: 'evaluation-community' };
const users = {
  resident: { id: 'evaluation-resident', role: 'Resident', orgId: tenant.orgId, permissions: ['billing:my_invoices', 'amenities:my_booking', 'amenities:discover', 'visitor:resident', 'complaints:raise_ticket'] },
  admin: { id: 'evaluation-admin', role: 'Community Admin', orgId: tenant.orgId, permissions: ['*'] },
};

export function runAssistantEvaluation() {
  const failures = [];
  const covered = new Set(dataset.operationCoverage);
  const enabled = Object.entries(AI_OPERATION_REGISTRY).filter(([, value]) => value.enabled).map(([name]) => name);
  for (const toolName of enabled) {
    if (!covered.has(toolName)) failures.push({ category: 'coverage', toolName, message: 'Operation has no curated dataset coverage.' });
  }

  for (const item of dataset.evaluation) {
    const user = users[item.role];
    const state = analyzeConversationTurn(item.input, null, [], new Date('2026-10-28T10:00:00+05:30'), { user, tenant });
    const actualIntent = state.activeIntent || detectDirectIntent(item.input);
    if (actualIntent !== item.expectedIntent) failures.push({ category: 'intent', id: item.id, expected: item.expectedIntent, actual: actualIntent });
    if (!AI_OPERATION_REGISTRY[item.expectedTool]) failures.push({ category: 'tool', id: item.id, expected: item.expectedTool, actual: null });
    if (item.expectedAuthorized !== undefined) {
      const actualAuthorized = isOperationAuthorized(item.expectedTool, user, tenant);
      if (actualAuthorized !== item.expectedAuthorized) failures.push({ category: 'permission', id: item.id, expected: item.expectedAuthorized, actual: actualAuthorized });
    }
    if (item.expectedMissing && !item.expectedMissing.every((field) => state.missingFields?.includes(field))) {
      failures.push({ category: 'required_fields', id: item.id, expected: item.expectedMissing, actual: state.missingFields || [] });
    }
  }

  return {
    version: dataset.version,
    evaluatedAt: new Date().toISOString(),
    totalCases: dataset.evaluation.length,
    enabledOperations: enabled.length,
    coveredOperations: enabled.filter((toolName) => covered.has(toolName)).length,
    passed: failures.length === 0,
    failureCount: failures.length,
    failures,
  };
}
