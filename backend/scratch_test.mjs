import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Workspace = (await import('./src/features/workspace/workspace.model.js')).default;
  const workspaces = await Workspace.find({}).lean();
  if (workspaces.length > 0) {
    console.log(JSON.stringify(workspaces[0].modules, null, 2));
  } else {
    console.log('No workspaces found');
  }
  process.exit(0);
}
run();
