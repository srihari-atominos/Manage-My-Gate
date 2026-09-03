import mongoose from 'mongoose';
import Workspace from './src/features/workspace/workspace.model.js';
import Organization from './src/features/organization/organization.model.js';

async function test() {
  await mongoose.connect('mongodb://localhost:27017/mmg-test');
  
  const org = await Organization.create({ name: 'Test Org', organizationType: 'Residential' });
  const ws = await Workspace.create({ workspaceName: 'Test WS', organizationId: org._id, createdBy: new mongoose.Types.ObjectId() });
  
  console.log('WS Created:', ws.workspaceName, ws.name);
  
  try {
    const updated = await Workspace.findByIdAndUpdate(ws._id, { workspaceName: 'New WS Name' }, { new: true, runValidators: true });
    console.log('WS Updated:', updated.workspaceName, updated.name);
  } catch (e) {
    console.error('Update Error:', e);
  }
  
  await mongoose.disconnect();
}
test();
