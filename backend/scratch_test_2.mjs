import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Workspace = (await import('./src/features/workspace/workspace.model.js')).default;
  const workspaces = await Workspace.find({ organizationId: '6a6efd60f62f21f2b26eb9a0' }).lean();
  if (workspaces.length > 0) {
    console.log(JSON.stringify(workspaces[0].modules, null, 2));
  } else {
    console.log('No workspace found for this org');
  }
  process.exit(0);
}
run();
