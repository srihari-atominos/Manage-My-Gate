import test from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import AuditLog from '../src/features/auditLog/auditLog.model.js';
import { AuditLogRepository } from '../src/features/auditLog/auditLog.repository.js';

test('Tenant Isolation Integrity Checks', async (t) => {
  await t.test('AuditLogRepository should enforce orgId filter (Tenant boundary check)', async () => {
    const repo = new AuditLogRepository();
    const fakeOrgId = new mongoose.Types.ObjectId().toString();
    
    // We mock the aggregate function to inspect the pipeline it generates
    const originalAggregate = AuditLog.aggregate;
    let capturedPipeline = null;
    
    AuditLog.aggregate = function(pipeline) {
      capturedPipeline = pipeline;
      return Promise.resolve([{ metadata: [{ total: 0 }], data: [] }]);
    };
    
    try {
      await repo.findAllPaginated(fakeOrgId, 1, 10);
      
      // The very first stage of the pipeline MUST be a match on targetId (orgId)
      assert.ok(capturedPipeline, 'Pipeline should be created');
      assert.ok(capturedPipeline.length > 0, 'Pipeline should not be empty');
      
      const firstStage = capturedPipeline[0];
      assert.ok(firstStage.$match, 'First stage must be a $match');
      assert.ok(firstStage.$match.targetId, 'Match stage must filter by targetId (orgId)');
      assert.strictEqual(
        firstStage.$match.targetId.toString(), 
        fakeOrgId, 
        'Match stage must filter by the requested orgId exactly'
      );
    } finally {
      AuditLog.aggregate = originalAggregate;
    }
  });
});
