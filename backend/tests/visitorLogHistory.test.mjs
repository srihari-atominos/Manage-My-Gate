import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import visitorLogRepository from '../src/features/visitorLog/visitorLog.repository.js';

test('visitorLogRepository matchStage handles string IDs correctly', async () => {
  const dummyOrgId = new mongoose.Types.ObjectId().toString();
  const dummyResidentId = new mongoose.Types.ObjectId().toString();

  try {
    await mongoose.connect('mongodb://admin:password@127.0.0.1:27019/manage_my_gate_dev?authSource=admin&directConnection=true');
    const result = await visitorLogRepository.findHistoryLogsByOrg(dummyOrgId, 0, 10, {
      residentId: dummyResidentId
    });

    assert.equal(typeof result.totalRecords, 'number');
    assert.equal(Array.isArray(result.data), true);
  } finally {
    await mongoose.disconnect();
  }
});
