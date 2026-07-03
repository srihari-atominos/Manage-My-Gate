const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({ name: String });
const TestModel = mongoose.model('Test', testSchema);

async function test() {
  await mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate');
  
  const realSession = await mongoose.startSession();
  
  // Try with dummy transaction methods to simulate our bypass
  realSession.startTransaction = () => {};
  realSession.commitTransaction = async () => {};
  realSession.abortTransaction = async () => {};
  
  try {
    const doc = new TestModel({ name: 'test3' });
    await doc.save({ session: realSession });
    console.log('Success with doc.save and mocked session!');
  } catch (err) {
    console.error('Error with doc.save and mocked session:', err.message);
  }
  
  process.exit(0);
}

test();
