const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({ name: String });
const TestModel = mongoose.model('Test', testSchema);

async function test() {
  await mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate');
  
  const dummySession = {
    startTransaction: () => {},
    commitTransaction: async () => {},
    abortTransaction: async () => {},
    endSession: async () => {}
  };
  
  try {
    await TestModel.create([{ name: 'test' }], { session: dummySession });
    console.log('Success with dummy session!');
  } catch (err) {
    console.error('Error with dummy session:', err.message);
  }
  
  // What if we use a REAL session?
  const realSession = await mongoose.startSession();
  try {
    await TestModel.create([{ name: 'test2' }], { session: realSession });
    console.log('Success with real session!');
  } catch (err) {
    console.error('Error with real session:', err.message);
  }
  
  process.exit(0);
}

test();
