import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('./.env') });

const Schema = new mongoose.Schema({ name: String });
const TestModel = mongoose.model('Test2', Schema);

async function run() {
  // Pass a URI WITHOUT retryWrites=false
  await mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate', { retryWrites: false });
  console.log('Connected');
  console.log('Options retryWrites:', mongoose.connection.getClient().options.retryWrites);

  const originalStartSession = mongoose.startSession.bind(mongoose);
  
  mongoose.startSession = async function(options) {
    const session = await originalStartSession(options);
    session.startTransaction = () => {};
    session.commitTransaction = async () => {};
    session.abortTransaction = async () => {};
    return session;
  };

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await TestModel.create([{ name: 'test' }], { session });
    console.log('Create success');
    await session.commitTransaction();
  } catch (e) {
    console.error('Error during create:', e.message);
  } finally {
    session.endSession();
    process.exit(0);
  }
}

run();
