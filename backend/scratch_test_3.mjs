import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Workspace = (await import('./src/features/workspace/workspace.model.js')).default;
  const workspaces = await Workspace.find({}).lean();
  let anyDisabled = false;
  workspaces.forEach(ws => {
    const b = ws.modules.find(m => m.moduleKey === 'billing');
    if (b && b.enabled === false) {
      console.log('Found disabled billing module in workspace', ws._id);
      anyDisabled = true;
    }
  });
  if (!anyDisabled) console.log('No disabled billing modules found');
  process.exit(0);
}
run();
