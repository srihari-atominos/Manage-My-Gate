const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({ name: String });
const TestModel = mongoose.model('Test', testSchema);

async function test() {
  await mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate');
  
  const mockSession = {
    _isMockSession: true,
    startTransaction: () => {},
    commitTransaction: async () => {},
    abortTransaction: async () => {},
    endSession: async () => {}
  };
  
  try {
    await TestModel.aggregate([{ $match: {} }]).session(mockSession);
    console.log('Success with aggregate and mock session!');
  } catch (err) {
    console.error('Error with aggregate and mock session:', err.message);
  }
  
  process.exit(0);
}

test();
